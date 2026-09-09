import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import sharp from 'sharp';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { CloudImageProvider, normalizeBaseUrl, ProviderError, downloadResult } from '../server/provider.ts';

test('Gemini sends native inline reference and receives image parts',async()=>{
 const image=await sharp({create:{width:32,height:32,channels:4,background:'#ffddff'}}).png().toBuffer();
 let received:any,receivedUrl='',receivedKey='';
 const fixture=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;received=JSON.parse(body);receivedUrl=req.url!;receivedKey=String(req.headers['x-goog-api-key']);res.setHeader('content-type','application/json');res.end(JSON.stringify({candidates:[{content:{parts:[{text:'done'},{inlineData:{mimeType:'image/png',data:image.toString('base64')}}]}}]}));});
 await new Promise<void>(r=>fixture.listen(0,'127.0.0.1',r));
 try{
  const result=await new CloudImageProvider().generate({settings:{provider:'gemini',baseUrl:`http://127.0.0.1:${(fixture.address() as {port:number}).port}/v1beta`,model:'gemini-3.1-flash-image',apiKey:'test-key',size:'2K',concurrency:1},prompt:'A cute original reaction',reference:image,signal:new AbortController().signal});
  assert.deepEqual(result,image);assert.equal(receivedUrl,'/v1beta/models/gemini-3.1-flash-image:generateContent');assert.equal(receivedKey,'test-key');assert.equal(received.contents[0].parts[1].inlineData.data,image.toString('base64'));assert.deepEqual(received.generationConfig.responseModalities,['TEXT','IMAGE']);assert.equal(received.generationConfig.imageConfig.imageSize,'2K');
 }finally{fixture.closeAllConnections();await new Promise<void>(r=>fixture.close(()=>r()));}
});

test('rejected image edit is a single failed call, without text fallback or secret echo',async()=>{
 let calls=0;const fixture=createServer(async(req,res)=>{calls++;for await(const _ of req){}res.statusCode=400;res.end(JSON.stringify({error:'provider reflected secret-test-token'}));});await new Promise<void>(r=>fixture.listen(0,'127.0.0.1',r));
 try{
  await assert.rejects(new CloudImageProvider().generate({settings:{provider:'openai',baseUrl:`http://127.0.0.1:${(fixture.address() as {port:number}).port}/v1`,model:'unsupported-edit',apiKey:'secret-test-token',size:'1024x1024',concurrency:1},prompt:'test',reference:Buffer.from('fixture'),signal:new AbortController().signal}),error=>error instanceof ProviderError&&!error.uncertain&&!error.message.includes('secret-test-token'));
  assert.equal(calls,1);
 }finally{fixture.closeAllConnections();await new Promise<void>(r=>fixture.close(()=>r()));}
});

test('provider URLs disallow embedded secrets, remote plaintext and query strings',()=>{
 assert.equal(normalizeBaseUrl('https://api.openai.com/v1/'),'https://api.openai.com/v1');
 assert.equal(normalizeBaseUrl('http://127.0.0.1:8888/v1'),'http://127.0.0.1:8888/v1');
 for(const invalid of ['http://example.org','https://user:password@example.org','https://example.org?key=secret','file:///etc/passwd'])assert.throws(()=>normalizeBaseUrl(invalid));
});

test('Gemini derives landscape aspect ratio from configured dimensions',async()=>{
 let config:any;const fixture=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;config=JSON.parse(body).generationConfig.imageConfig;res.setHeader('content-type','application/json');res.end(JSON.stringify({candidates:[{content:{parts:[{inlineData:{data:Buffer.from('test-result').toString('base64')}}]}}]}));});await new Promise<void>(r=>fixture.listen(0,'127.0.0.1',r));
 try{await new CloudImageProvider().generate({settings:{provider:'gemini',baseUrl:`http://127.0.0.1:${(fixture.address() as {port:number}).port}/v1beta`,model:'fixture',apiKey:'test',size:'1536x1024',concurrency:1},prompt:'wide reference sheet',signal:new AbortController().signal});assert.equal(config.aspectRatio,'3:2');}finally{fixture.closeAllConnections();await new Promise<void>(r=>fixture.close(()=>r()));}
});

test('result download pins vetted DNS address and sends no provider credentials',async()=>{
 let resolutions=0,options:any,hostname='';const resultBytes=Buffer.from('image-fixture');
 const result=await downloadResult('https://images.example.test/path/image.png?signed=example',new AbortController().signal,{
  resolve:async()=>{resolutions++;return [{address:'93.184.216.34',family:4}];},
  request:((url:any,settings:any,callback:any)=>{options=settings;hostname=url.hostname;const request=new EventEmitter() as any;request.end=()=>{const stream=Readable.from([resultBytes]) as any;stream.statusCode=200;stream.headers={};callback(stream);};return request;}) as any,
 });
 assert.equal(resolutions,1);assert.equal(hostname,'images.example.test');assert.equal(options.servername,'images.example.test');assert.equal(options.headers.Authorization,undefined);assert.equal(options.headers['x-goog-api-key'],undefined);assert.equal(options.agent,false);
 const pinned=await new Promise<any>((resolve,reject)=>options.lookup('images.example.test',{all:true},(error:any,addresses:any)=>error?reject(error):resolve(addresses)));
 assert.deepEqual(pinned,[{address:'93.184.216.34',family:4}]);assert.equal(resolutions,1);assert.deepEqual(result,resultBytes);
});

test('result download refuses private DNS and redirect responses',async()=>{
 let requests=0;const never=(()=>{requests++;throw new Error('should not request');}) as any;
 await assert.rejects(downloadResult('https://images.example.test/image.png',new AbortController().signal,{resolve:async()=>[{address:'127.0.0.1',family:4}],request:never}),/私有网络/);assert.equal(requests,0);
 const redirect=((_url:any,_settings:any,callback:any)=>{const request=new EventEmitter() as any;request.end=()=>{const stream=Readable.from([]) as any;stream.statusCode=302;stream.headers={location:'https://127.0.0.1/private'};callback(stream);};return request;}) as any;
 await assert.rejects(downloadResult('https://images.example.test/image.png',new AbortController().signal,{resolve:async()=>[{address:'93.184.216.34',family:4}],request:redirect}),/下载图片失败/);
});
