/** Read-only endpoint audit. No authentication, SQL, queue actions or writes to services. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createConnection} from 'node:net';
import dotenv from 'dotenv';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../../NxClip');
const local=host=>['localhost','127.0.0.1','::1','postgres','redis'].includes(host);
function endpoint(value){if(local(value))return {hostname:value,local:true};try{const u=new URL(value);return {scheme:u.protocol,hostname:u.hostname,port:u.port||null,local:local(u.hostname),cloudRun:u.hostname.endsWith('.run.app')};}catch{const host=/(?:Host|Server)=([^;]+)/i.exec(value)?.[1];return host?{hostname:host,local:local(host),port:/(?:Port)=([^;]+)/i.exec(value)?.[1]??null}:{classification:'unparsed; not safe to use without review'};}}
const paths=['.env','infrastructure/docker/.env','apps/api-gateway/.env','apps/content-service/.env','apps/media-worker/.env','apps/media-worker/.env.example','apps/identity-service/.env'];
const envFiles=paths.map(path=>{
 if(!existsSync(resolve(root,path)))return {path,exists:false};
 const values=dotenv.parse(readFileSync(resolve(root,path)));
 return {path,exists:true,endpoints:Object.fromEntries(Object.entries(values).filter(([key])=>/URL$|_HOST$|^HOST$|^ConnectionStrings__/i.test(key)).map(([key,value])=>[key,endpoint(value)])),settings:Object.fromEntries(Object.entries(values).filter(([key])=>/^(PORT|NODE_ENV|STORAGE_PROVIDER|OUTBOX_DISPATCHER_ENABLED|REDIS_PORT|POSTGRES_PORT|QUEUE_PROVIDER|QUEUE_BACKEND|ALLOW_COPY_FALLBACK)$/.test(key))),credentialVariableNames:Object.keys(values).filter(key=>/PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|CREDENTIAL/i.test(key))};
});
const ports=[5000,5001,5002,5003,5004,5005,5006,5007,5432,6379,6380];
const listeners=await Promise.all(ports.map(port=>new Promise(resolve=>{const socket=createConnection({host:'127.0.0.1',port});let done=false;const finish=result=>{if(done)return;done=true;socket.destroy();resolve({host:'127.0.0.1',port,...result});};socket.setTimeout(1500);socket.once('connect',()=>finish({reachable:true}));socket.once('timeout',()=>finish({reachable:false,error:'TIMEOUT'}));socket.once('error',error=>finish({reachable:false,error:error.code}));})));
const processEndpoints=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(DB_URL|DATABASE_URL|REDIS_URL|REDIS_HOST|CONTENT_SERVICE_URL|MEDIA_WORKER_URL|IDENTITY_SERVICE_URL|AI_SERVICE_URL)$/.test(key)).map(([key,value])=>[key,endpoint(value)]));
const result={auditedAt:new Date().toISOString(),envFiles,processEndpoints,listeners,frontend:{configuredAppRejectsLoopback:true,fallback:'production Cloud Run — NOT permitted for writes',validationOrigin:'http://127.0.0.1:4320',apiGuard:'All /api requests return local 503; no outbound proxy'},startupHazards:['Content service DatabaseInitService invokes SQL migrations on startup.','Content service enables TypeORM synchronize outside production.'],writesAttempted:0,servicesStarted:[],migrationsRun:false,queuesUsed:false};
writeFileSync(resolve(here,'T3-LOCAL-ENVIRONMENT.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
