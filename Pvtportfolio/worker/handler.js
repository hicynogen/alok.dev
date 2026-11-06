// Cloudflare Workers adapter for the existing Node portfolio.
// The build embeds the explicit public-file allowlist into one ESM artifact.
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options':'nosniff', 'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':'max-age=31536000'
};
const json = (status, body, extra={}) => new Response(JSON.stringify(body), {status,headers:{...securityHeaders,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
const failure = (status,message) => Object.assign(new Error(message),{status});
async function readJson(request) {
  if (Number(request.headers.get('content-length')) > 16384) throw failure(413,'Message is too large.');
  if (!request.body) throw failure(400,'Please send valid JSON.');
  const reader = request.body.getReader(); const chunks = []; let length=0;
  try {
    while (true) { const {done,value} = await reader.read(); if (done) break; length+=value.byteLength; if(length>16384){await reader.cancel();throw failure(413,'Message is too large.');} chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw failure(400,'Please send valid JSON.'); }
}
export function validateMessage(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure(400,'Invalid message.');
  if (typeof data.website === 'string' && data.website.trim()) throw failure(400,'Message could not be accepted.');
  if (['name','email','message'].some(key=>typeof data[key]!=='string')) throw failure(400,'Name, email, and message are required.');
  const name=data.name.trim(),email=data.email.trim(),message=data.message.trim();
  if(name.length<2||name.length>80)throw failure(400,'Name must be 2–80 characters.');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw failure(400,'Enter a valid email address.');
  if(message.length<10||message.length>4000)throw failure(400,'Message must be 10–4000 characters.');
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(name+email+message))throw failure(400,'Unsupported characters in message.');
  return {name,email,message};
}
export async function pruneInbox(env) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Date.now())
  ]);
}
export function createWorker(assets={}) {
  const decoded = new Map();
  return {
    async fetch(request,env,ctx) {
      try {
        const url=new URL(request.url),path=url.pathname;
        if(path==='/api/health'&&request.method==='GET') {
          if(!env.DB)return json(503,{ok:false,service:'alok.dev'});
          await env.DB.prepare('SELECT 1 AS ok').first();
          return json(200,{ok:true,service:'alok.dev'});
        }
        if(path==='/api/contact') {
          if(request.method!=='POST')return json(405,{error:'Use POST to send a message.'},{Allow:'POST'});
          if(request.headers.get('sec-fetch-site')==='cross-site'||(request.headers.get('origin')&&request.headers.get('origin')!==url.origin))return json(403,{error:'Send messages from this website.'});
          if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json(415,{error:'Use application/json.'});
          if(!env.DB)return json(503,{error:'The inbox is temporarily unavailable. Please contact me on LinkedIn.'});
          const {name,email,message}=validateMessage(await readJson(request));
          const now=Date.now(),window=Math.floor(now/900000),expires=(window+1)*900000;
          // Cloudflare supplies this header; no client-supplied forwarding chain is trusted.
          const identity=(request.headers.get('CF-Connecting-IP')||'unknown')+':'+window;
          const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
          const client='c:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
          const global='g:'+window,id=crypto.randomUUID();
          // D1 batches run transactionally; the conditional insert makes rate checks atomic.
          const results=await env.DB.batch([
            env.DB.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(client,expires),
            env.DB.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(global,expires),
            env.DB.prepare('INSERT INTO messages (id,name,email,message) SELECT ?,?,?,? WHERE (SELECT count FROM rate_limits WHERE key=?) <= 5 AND (SELECT count FROM rate_limits WHERE key=?) <= 100').bind(id,name,email,message,client,global)
          ]);
          if(results[2].meta.changes!==1)return json(429,{error:'Too many attempts. Please try again in 15 minutes.'},{'Retry-After':String(Math.ceil((expires-now)/1000))});
          ctx.waitUntil(pruneInbox(env).catch(()=>console.error('Inbox maintenance failed')));
          return json(201,{ok:true,id});
        }
        if(!['GET','HEAD'].includes(request.method))return json(405,{error:'Method not allowed.'},{Allow:'GET, HEAD'});
        const asset=assets[path];
        if(!Object.hasOwn(assets,path)||!asset)return json(404,{error:'Not found.'});
        if(!decoded.has(path)) decoded.set(path,Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)));
        const bytes=decoded.get(path);
        return new Response(request.method==='HEAD'?null:bytes,{headers:{...securityHeaders,'Content-Type':asset.type,'Content-Length':String(bytes.byteLength),'Cache-Control':'no-cache'}});
      } catch(error) {
        if(!error.status)console.error('Request failed:', 'internal error');
        return json(error.status||500,{error:error.status?error.message:'Could not save your message. Please try again later.'});
      }
    },
    async scheduled(controller,env,ctx){ctx.waitUntil(pruneInbox(env));}
  };
}
