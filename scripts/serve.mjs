import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('.');
const port=Number(process.env.PORT||4296);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.pdf':'application/pdf','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8','.json':'application/json','.xml':'application/xml'};
http.createServer((req,res)=>{
  let decoded;
  try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replaceAll('\\','/');}catch{res.writeHead(400).end();return;}
  const parts=decoded.split('/').filter(Boolean);
  const first=parts[0]?.toLowerCase();
  const hidden=parts.some(p=>p.startsWith('.'))||['scripts','qa','node_modules'].includes(first)||['package.json','package-lock.json'].includes(first);
  const file=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
  if(hidden||!file.startsWith(root+path.sep)||!['GET','HEAD'].includes(req.method)){res.writeHead(404).end('Not found');return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  const size=fs.statSync(file).size;
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Length':size};
  let start=0,end=size-1,status=200;
  if(req.headers.range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(match&&(match[1]||match[2])){
      start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
      end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
    }else start=size;
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
  }
  res.writeHead(status,headers);
  if(req.method==='HEAD'||!size)res.end();else fs.createReadStream(file,{start,end}).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
