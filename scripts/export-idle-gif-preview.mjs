#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'apps/web/public');
let url='',dest='';
for (let i=0;i<process.argv.length;i++){if(process.argv[i]==='--url')url=process.argv[++i]; if(process.argv[i]==='--dest')dest=process.argv[++i];}
if(!url||!dest){console.error('Usage: node scripts/export-idle-gif-preview.mjs --url <u> --dest <rel>');process.exit(1);} 
const out=path.join(publicRoot,dest.replace(/^\//,'')); fs.mkdirSync(path.dirname(out),{recursive:true});
const res=await fetch(url); if(!res.ok) process.exit(1); fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
