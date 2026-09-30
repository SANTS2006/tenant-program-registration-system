const fs=require('fs');
global.rd=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
global.rep=(s,a,b)=>{ if(!s.includes(a)) throw new Error('missing: '+a.slice(0,60)); return s.replace(a,()=>b); };
global.wr=(p,s)=>fs.writeFileSync(p,s);
