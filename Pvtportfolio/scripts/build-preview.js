import { mkdir, copyFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { publicFiles } from './public-files.js';
import './prepare-assets.js';
await rm('static-preview',{recursive:true,force:true});
for(const file of new Set([...publicFiles.values()].map(([file])=>file))){await mkdir(dirname('static-preview/'+file),{recursive:true});await copyFile(file,'static-preview/'+file);}
console.log('Static frontend exported to static-preview/. Use npm start or the Sites deployment for contact submissions.');
