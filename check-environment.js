"use strict";
const {spawnSync}=require('node:child_process');
if(Number(process.versions.node.split('.')[0])<18){console.error('Node.js 18+ is required.');process.exit(1);}
const r=spawnSync('java',['--list-modules'],{encoding:'utf8',timeout:10000,windowsHide:true});
if(r.error||r.status!==0||!/^jdk\.compiler@(1[7-9]|[2-9][0-9])([.\r\n]|$)/m.test(r.stdout||'')){console.error('JDK 17+ with jdk.compiler is required. Check java --version and PATH.');process.exit(1);}
console.log('Environment OK: Node.js '+process.versions.node+' and JDK 17+.');
