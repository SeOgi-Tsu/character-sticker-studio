import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import type { IncomingMessage } from 'node:http';
import type { ProviderSettings, RunningHubSettings, RunningHubNode } from '../src/shared/types.ts';

export class ProviderError extends Error {
  constructor(message:string, readonly uncertain=false) { super(message); }
}
export interface GenerationInput { settings:ProviderSettings; prompt:string; reference?:Buffer; secondaryReference?:Buffer; signal:AbortSignal; remoteTaskId?:string; onRemoteTaskId?:(id:string)=>void|Promise<void>; }
export interface ImageProvider { generate(input:GenerationInput):Promise<Buffer>; }
export const providerDocs = {
 openai:'https://developers.openai.com/api/reference/resources/images',
 gemini:'https://ai.google.dev/gemini-api/docs/image-generation',
 runninghub:'https://www.runninghub.ai/runninghub-api-doc-en/',
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

/** IDs remain strings: RunningHub resource/task IDs exceed JavaScript integer precision. */
function runningHubId(value:unknown,label:string) {
 if(typeof value!=='string'||!/^\d{1,40}$/.test(value))throw new ProviderError(`${label}需要填写十进制数字字符串。`);
 return value;
}
export function validateRunningHubSettings(value:unknown):RunningHubSettings {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProviderError('请填写 RunningHub 应用或工作流配置。');
 const r=value as RunningHubSettings;
 if(!['app','workflow'].includes(r.kind))throw new ProviderError('RunningHub 类型应为应用或工作流。');
 const resourceId=runningHubId(r.resourceId,'RunningHub 应用/工作流 ID');
 const used=new Set<string>();
 const node=(value:unknown,extra=false):RunningHubNode=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ProviderError('RunningHub 节点映射格式无效。');
  const n=value as RunningHubNode,nodeId=runningHubId(n.nodeId,'节点 ID');
  if(typeof n.fieldName!=='string'||!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/.test(n.fieldName))throw new ProviderError('节点字段名需要 1–100 位字母、数字、点、下划线或短横线。');
  const pair=`${nodeId}:${n.fieldName}`;if(used.has(pair))throw new ProviderError('节点 ID 与字段名组合不能重复。');used.add(pair);
  if(extra&&(typeof n.fieldValue!=='string'||n.fieldValue.length>12000))throw new ProviderError('额外节点值需要填写文字，最多 12000 字。');
  return {nodeId,fieldName:n.fieldName,...(extra?{fieldValue:n.fieldValue}:{})};
 };
 const promptNode=node(r.promptNode),referenceNode=r.referenceNode===undefined?undefined:node(r.referenceNode),styleReferenceNode=r.styleReferenceNode===undefined?undefined:node(r.styleReferenceNode);
 if(!Array.isArray(r.extraNodes)||r.extraNodes.length>32)throw new ProviderError('额外节点最多 32 个。');
 const extraNodes=r.extraNodes.map(n=>node(n,true));
 if(!Number.isInteger(r.outputIndex)||r.outputIndex<0||r.outputIndex>15)throw new ProviderError('输出索引范围为 0–15。');
 return {kind:r.kind,resourceId,promptNode,...(referenceNode?{referenceNode}:{}),...(styleReferenceNode?{styleReferenceNode}:{}),extraNodes,outputIndex:r.outputIndex};
}
interface RunningHubDependencies {
 pollIntervalMs?:number; timeoutMs?:number;
 download?:(url:string,signal:AbortSignal)=>Promise<Buffer>;
}
// Only known input/auth/resource rejections are definite. A new/unknown code,
// internal error, or already-running/queued response may follow acceptance.
const runningHubSubmissionRejections=new Set(['301','332','380','416','433','801','802','803','806','809','810','811','812','901','1001','1002','1007','1008','1009','1014','1101','1501','1505']);
async function waitForPoll(milliseconds:number,signal:AbortSignal) {
 signal.throwIfAborted();
 await new Promise<void>((resolve,reject)=>{
  const abort=()=>{clearTimeout(timer);reject(signal.reason);};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},milliseconds);
  signal.addEventListener('abort',abort,{once:true});
 });
}

/** Native app/workflow adapter. Recovery never enters the upload/submission branch. */
async function generateRunningHub(input:GenerationInput,dependencies:RunningHubDependencies={}) {
 const {settings,reference,secondaryReference,prompt,signal}=input;
 const config=validateRunningHubSettings(settings.runninghub);
 if(!input.remoteTaskId&&reference&&!config.referenceNode)throw new ProviderError('生成角色母版或表情需要配置参考图节点，不能退化为纯文字生成。');
 let taskId=input.remoteTaskId?runningHubId(input.remoteTaskId,'远程任务 ID'):undefined;
 const controller=AbortSignal.any([signal,AbortSignal.timeout(dependencies.timeoutMs??30*60_000)]);
 let phase:'upload'|'submit'|'query'=taskId?'query':'upload';
 const request=async(path:string,body:BodyInit,multipart=false):Promise<any>=>{
  controller.throwIfAborted();
  const response=await fetch(settings.baseUrl+path,{method:'POST',headers:{Authorization:`Bearer ${settings.apiKey}`,...(multipart?{}:{'Content-Type':'application/json'})},body,signal:controller,redirect:'error'});
  if(!response.ok){await response.body?.cancel();throw new ProviderError(`RunningHub 返回 HTTP ${response.status}。${phase==='upload'?'参考图上传未完成，未提交生成任务。':phase==='query'?'已保留远程任务 ID，可恢复查询。':'请先核对平台任务记录。'}`,phase==='query'||(phase==='submit'&&(response.status>=500||[408,409].includes(response.status))));}
  let payload:any;try{payload=JSON.parse((await boundedBody(response,4*1024*1024)).toString());}catch{throw new ProviderError('RunningHub 响应无法解析，请核对平台任务记录。',phase!=='upload');}
  if(payload===null||typeof payload!=='object'||Array.isArray(payload))throw new ProviderError('RunningHub 响应格式无效。',phase!=='upload');
  if(payload.code!==undefined&&![0,200,'0','200'].includes(payload.code)){
   const uncertain=phase==='query'||(phase==='submit'&&!runningHubSubmissionRejections.has(String(payload.code)));
   throw new ProviderError(uncertain?'RunningHub 请求结果不明，请先核对平台任务记录；已有任务 ID 可恢复查询，勿直接重复提交。':'RunningHub 拒绝此请求，请检查权限、资源与节点配置。',uncertain);
  }
  return payload.data??payload;
 };
 try{
  if(!taskId){
   const nodes:RunningHubNode[]=[{...config.promptNode,fieldValue:prompt}];
   const uploadReference=async(bytes:Buffer,node:RunningHubNode,filename:string)=>{
    const form=new FormData();form.set('file',new Blob([new Uint8Array(bytes)],{type:'image/png'}),filename);
    const uploaded=await request('/openapi/v2/media/upload/binary',form,true);
    const fileName=uploaded.fileName??uploaded.filename;
    if(typeof fileName!=='string'||!fileName||fileName.length>2000)throw new ProviderError('RunningHub 上传未返回文件名，未提交生成任务。');
    nodes.push({...node,fieldValue:fileName});
   };
   if(reference)await uploadReference(reference,config.referenceNode!,'reference.png');
   // A single-reference workflow keeps the original outfit source; the UI
   // explains that the optional drawing-style image needs its own node.
   if(reference&&secondaryReference&&config.styleReferenceNode)await uploadReference(secondaryReference,config.styleReferenceNode,'style-reference.png');
   nodes.push(...config.extraNodes);
   phase='submit';
   const submitted=await request(config.kind==='app'?'/task/openapi/ai-app/run':'/task/openapi/create',JSON.stringify({apiKey:settings.apiKey,[config.kind==='app'?'webappId':'workflowId']:config.resourceId,nodeInfoList:nodes}));
   try{taskId=runningHubId(submitted.taskId,'远程任务 ID');}catch{throw new ProviderError('RunningHub 未返回有效任务 ID，提交结果不明；请先核对平台记录。',true);}
   // Persist before any poll so a process interruption cannot cause a second submission.
   await input.onRemoteTaskId?.(taskId);
  }
  phase='query';
  while(true){
   const result=await request('/openapi/v2/query',JSON.stringify({taskId}));
   if(result.taskId!==undefined&&result.taskId!==taskId)throw new ProviderError('RunningHub 查询返回的任务 ID 不匹配，已保留原任务 ID；请核对平台记录后恢复查询。',true);
   if(result.status==='SUCCESS'){
    const output=result.results?.[config.outputIndex];
    if(!output||typeof output.url!=='string')throw new ProviderError('RunningHub 已完成，但所选输出没有图片地址；请检查输出索引后在平台取回图片。',true);
    if(output.outputType&&!/^(png|jpe?g|webp|avif|gif|image(?:\/[\w.+-]+)?)$/i.test(output.outputType))throw new ProviderError('RunningHub 所选输出不是图片，请检查工作流和输出索引。',true);
    return await (dependencies.download??downloadResult)(output.url,controller);
   }
   if(['FAILED','CANCELLED','CANCELED'].includes(result.status))throw new ProviderError('RunningHub 报告任务失败或已取消。请查看平台详情；已保留任务 ID。');
   if(!['QUEUED','RUNNING','PENDING'].includes(result.status))throw new ProviderError('RunningHub 返回未知任务状态，已保留任务 ID，可恢复查询。',true);
   await waitForPoll(dependencies.pollIntervalMs??2500,controller);
  }
 }catch(error){
  if(error instanceof ProviderError)throw error;
  throw new ProviderError(signal.aborted?'已停止本地等待；RunningHub 远程任务可能仍在运行或计费。':taskId?'查询或图片下载中断，已保留远程任务 ID，可恢复查询。':phase==='upload'?'参考图上传中断，未提交生成任务。':'提交响应中断，结果不明；请核对 RunningHub 任务记录，勿直接重复提交。',phase!=='upload');
 }
}
/** Single upstream submission. Intentionally no retries or text-only fallback. */
export class CloudImageProvider implements ImageProvider {
 constructor(private readonly dependencies:{runningHub?:RunningHubDependencies}={}){}
 async generate(input:GenerationInput) {
  if(input.settings.provider==='runninghub')return generateRunningHub(input,this.dependencies.runningHub);
  const {settings,prompt,reference,secondaryReference,signal}=input;
  const controller=AbortSignal.any([signal,AbortSignal.timeout(240_000)]);
  let endpoint:string;let body:BodyInit;const headers:Record<string,string>={};
  if(settings.provider==='openai') {
   headers.Authorization=`Bearer ${settings.apiKey}`;
   endpoint=settings.baseUrl+(reference?'/images/edits':'/images/generations');
   if(reference){
    const form=new FormData();form.set('model',settings.model);form.set('prompt',prompt);form.set('n','1');form.set('size',settings.size);
    form.append(secondaryReference?'image[]':'image',new Blob([new Uint8Array(reference)],{type:'image/png'}),'reference.png');
    if(secondaryReference)form.append('image[]',new Blob([new Uint8Array(secondaryReference)],{type:'image/png'}),'style-reference.png');
    body=form;
   }
   else{headers['Content-Type']='application/json';body=JSON.stringify({model:settings.model,prompt,n:1,size:settings.size});}
  }else{
   headers['x-goog-api-key']=settings.apiKey!;headers['Content-Type']='application/json';
   endpoint=settings.baseUrl+`/models/${encodeURIComponent(settings.model)}:generateContent`;
   const parts:unknown[]=[{text:prompt}];if(reference){parts.push({inlineData:{mimeType:'image/png',data:reference.toString('base64')}});if(secondaryReference)parts.push({inlineData:{mimeType:'image/png',data:secondaryReference.toString('base64')}});}
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
