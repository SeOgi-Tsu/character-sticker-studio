import 'dotenv/config';
import { createApp } from './app.ts';

const host=process.env.STUDIO_HOST||process.env.HOST||'127.0.0.1';
const port=Number(process.env.STUDIO_PORT||process.env.PORT||4317);
const token=process.env.STUDIO_TOKEN||'';
if(!['127.0.0.1','localhost','::1'].includes(host)&&!token){console.error('公开监听需要设置 STUDIO_TOKEN。默认仅本机可访问。');process.exit(1);}
if(!Number.isInteger(port)||port<1||port>65535){console.error('STUDIO_PORT 无效。');process.exit(1);}
const csv=(value:string|undefined)=>value?.split(',').map(x=>x.trim()).filter(Boolean);
const runtime=createApp({token,allowedOrigins:csv(process.env.STUDIO_ALLOWED_ORIGINS),allowedHosts:csv(process.env.STUDIO_ALLOWED_HOSTS)});
const server=runtime.app.listen(port,host,()=>console.log(`角色表情工坊已启动：http://${host}:${port}`));
async function shutdown(){server.close();server.closeIdleConnections();await runtime.close();process.exit(0);}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
