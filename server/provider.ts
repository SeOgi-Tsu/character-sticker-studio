import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import type { IncomingMessage } from 'node:http';
import type { ProviderSettings } from '../src/shared/types.ts';

export class ProviderError extends Error {
  constructor(message:string, readonly uncertain=false) { super(message); }
}
export interface GenerationInput { settings:ProviderSettings; prompt:string; reference?:Buffer; signal:AbortSignal; }
export interface ImageProvider { generate(input:GenerationInput):Promise<Buffer>; }
export const providerDocs = {
 openai:'https://developers.openai.com/api/reference/resources/images',
 gemini:'https://ai.google.dev/gemini-api/docs/image-generation',
};

export function normalizeBaseUrl(value:string) {
 let url:URL;try{url=new URL(value);}catch{throw new Error('请输入有效的 API 地址。');}
 if(url.username||url.password||url.search||url.hash)throw new Error('API 地址不能包含账号、密码、查询参数或片段。');
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&local))throw new Error('云端 API 需要 HTTPS；本机接口可使用 HTTP。');
 return url.toString().replace(/\/+$/,'');
}
async function boundedBody(response:Response,limit:number) {
 if(Number(response.headers.get('content-length')||0)>limit)throw new ProviderError('服务商返回内容过大，任务状态需核对。',true);
 const reader=response.body?.getReader();if(!reader)throw new ProviderError('服务商返回了空响应，任务状态需核对。',true);
 let size=0;const chunks:Uint8Array[]=[];
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>limit)throw new ProviderError('服务商返回内容过大，任务状态需核对。',true);chunks.push(next.value);}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks);
}
function isPrivate(address: string) {
 const lower = address.toLowerCase();
 if (lower.includes(':')) return lower === '::' || lower === '::1' || /^(fc|fd|fe[89ab]|ff|::ffff:)/.test(lower);
 const [a, b] = lower.split('.').map(Number);
 return a === 0 || a === 10 || a === 127 || a >= 224 ||
  (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
  (a === 192 && (b === 168 || b === 0)) || (a === 172 && b >= 16 && b <= 31) ||
  (a === 198 && (b === 18 || b === 19));
}
interface DownloadDependencies {
 resolve: (hostname: string) => Promise<{ address: string; family: number }[]>;
 request: typeof httpsRequest;
}

/** Download signed result URLs without credentials, redirects or a second DNS resolution. */
export async function downloadResult(value: string, signal: AbortSignal, dependencies: DownloadDependencies = {
 resolve: hostname => lookup(hostname, { all: true }),
 request: httpsRequest,
}) {
 let url: URL;
 try { url = new URL(value); } catch { throw new ProviderError('服务商返回的图片地址无效。', true); }
 if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost') {
  throw new ProviderError('服务商返回了不安全的图片地址。', true);
 }
 const addresses = await dependencies.resolve(url.hostname);
 if (!addresses.length || addresses.some(result => isPrivate(result.address))) {
  throw new ProviderError('服务商图片地址指向私有网络，已拒绝读取。', true);
 }
 const pinned = addresses[0];
 const response = await new Promise<IncomingMessage>((resolve, reject) => {
  const request = dependencies.request(url, {
   method: 'GET',
   signal,
   agent: false,
   servername: url.hostname,
   headers: { Accept: 'image/*' },
   lookup: (_hostname, options, callback) => {
    if (options.all) callback(null, [pinned]);
    else callback(null, pinned.address, pinned.family);
   },
  }, resolve);
  request.once('error', reject);
  request.end();
 });
 if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
  response.destroy();
  throw new ProviderError('生成请求已完成，但下载图片失败。请先核对服务商记录再重试。', true);
 }
 const limit = 40 * 1024 * 1024;
 if (Number(response.headers['content-length'] || 0) > limit) {
  response.destroy();
  throw new ProviderError('服务商返回内容过大，任务状态需核对。', true);
 }
 const chunks: Buffer[] = [];
 let size = 0;
 for await (const chunk of response) {
  const bytes = Buffer.from(chunk);
  size += bytes.length;
  if (size > limit) {
   response.destroy();
   throw new ProviderError('服务商返回内容过大，任务状态需核对。', true);
  }
  chunks.push(bytes);
 }
 return Buffer.concat(chunks);
}
function decodeImage(value:unknown) {
 if(typeof value!=='string'||value.length>60*1024*1024||!/^[A-Za-z0-9+/\r\n]*={0,2}$/.test(value))throw new ProviderError('服务商未返回有效图片数据，请核对服务商记录。',true);
 const buffer=Buffer.from(value,'base64');if(!buffer.length)throw new ProviderError('服务商返回了空图片，请核对服务商记录。',true);return buffer;
}
/** Single upstream submission. Intentionally no retries or text-only fallback. */
export class CloudImageProvider implements ImageProvider {
 async generate({settings,prompt,reference,signal}:GenerationInput) {
  const controller=AbortSignal.any([signal,AbortSignal.timeout(240_000)]);
  let endpoint:string;let body:BodyInit;const headers:Record<string,string>={};
  if(settings.provider==='openai') {
   headers.Authorization=`Bearer ${settings.apiKey}`;
   endpoint=settings.baseUrl+(reference?'/images/edits':'/images/generations');
   if(reference){const form=new FormData();form.set('model',settings.model);form.set('prompt',prompt);form.set('n','1');form.set('size',settings.size);form.set('image',new Blob([new Uint8Array(reference)],{type:'image/png'}),'reference.png');body=form;}
   else{headers['Content-Type']='application/json';body=JSON.stringify({model:settings.model,prompt,n:1,size:settings.size});}
  }else{
   headers['x-goog-api-key']=settings.apiKey!;headers['Content-Type']='application/json';
   endpoint=settings.baseUrl+`/models/${encodeURIComponent(settings.model)}:generateContent`;
   const parts:unknown[]=[{text:prompt}];if(reference)parts.push({inlineData:{mimeType:'image/png',data:reference.toString('base64')}});
   const imageSize=['1K','2K','4K'].includes(settings.size)?settings.size:'1K';
   const dimensions=/^(\d+)x(\d+)$/.exec(settings.size);
   const gcd=(a:number,b:number):number=>b?gcd(b,a%b):a;
   const divisor=dimensions?gcd(Number(dimensions[1]),Number(dimensions[2])):1;
   const aspectRatio=dimensions?`${Number(dimensions[1])/divisor}:${Number(dimensions[2])/divisor}`:'1:1';
   body=JSON.stringify({contents:[{role:'user',parts}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio,imageSize}}});
  }
  try{
   const response=await fetch(endpoint,{method:'POST',headers,body,signal:controller,redirect:'error'});
   if(!response.ok){const ambiguous=response.status>=500;await response.body?.cancel();throw new ProviderError(`图片服务返回 HTTP ${response.status}。${ambiguous?'提交结果不明，请核对服务商记录后手动重试。':response.status===401||response.status===403?'请检查 API 密钥和模型权限。':response.status===429?'额度或频率受限，请稍后手动重试。':'请检查接口、模型和图片参数。'}`,ambiguous);}
   let data:any;try{data=JSON.parse((await boundedBody(response,64*1024*1024)).toString('utf8'));}catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('服务商返回内容无法解析，请核对服务商记录后手动重试。',true);}
   if(settings.provider==='openai'){const item=data.data?.[0];if(item?.b64_json)return decodeImage(item.b64_json);if(item?.url)return await downloadResult(item.url,controller);}
   else{for(const candidate of data.candidates||[])for(const part of candidate.content?.parts||[]){const inline=part.inlineData||part.inline_data;if(inline?.data)return decodeImage(inline.data);}}
   throw new ProviderError('服务商未返回图片。可能被内容过滤或模型不支持图片输出；请核对服务商记录。',true);
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError(signal.aborted?'已停止本地等待；服务商可能仍在生成或计费，请先核对。':'网络中断或响应超时，提交结果不明；请核对服务商记录后手动重试。',true);}
 }
}
