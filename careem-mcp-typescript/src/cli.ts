import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadSpecs, parseTool } from "./spec.js";
import { overridesFile, runDir, toolsDir } from "./server.js";
const root=join(dirname(fileURLToPath(import.meta.url)),".."), pidFile=join(runDir,"server.pid"), logFile=join(runDir,"server.log");
function pid(){try{return +readFileSync(pidFile,"utf8")}catch{return 0}} function alive(n:number){if(!Number.isInteger(n)||n<=0)return false;try{process.kill(n,0);return true}catch{return false}}
function data():Record<string,string>{try{return JSON.parse(readFileSync(overridesFile,"utf8"))}catch{return {}}} function save(v:unknown){mkdirSync(runDir,{recursive:true});writeFileSync(overridesFile,JSON.stringify(v,null,2)+"\n")}
const [cmd,...a]=process.argv.slice(2), specs=loadSpecs(toolsDir);
switch(cmd){
 case"start":{const old=pid();if(alive(old)){console.log(`already running (pid ${old})`);break}mkdirSync(runDir,{recursive:true});const fd=openSync(logFile,"a");const c=spawn(process.execPath,[join(root,"dist/server.js")],{detached:true,stdio:["ignore",fd,fd],windowsHide:true});c.unref();closeSync(fd);writeFileSync(pidFile,String(c.pid));console.log(`started (pid ${c.pid}) http://127.0.0.1:8787/mcp`);break}
 case"stop":{const p=pid();if(!alive(p)){console.log("not running");break}process.kill(p);rmSync(pidFile,{force:true});console.log("stopped");break}
 case"status":{const p=pid();console.log(alive(p)?`running (pid ${p}) http://127.0.0.1:8787/mcp`:"not running");break}
 case"logs":console.log(existsSync(logFile)?readFileSync(logFile,"utf8"):"no logs");break;
 case"reset":save({});console.log("all scenario overrides cleared");break;
 case"scenarios":{const selected=a[0]?[specs.get(a[0])]:[...specs.values()];if(selected.some(x=>!x))throw new Error(`unknown tool ${a[0]}`);for(const s of selected)console.log(`${s!.tool.name}: ${s!.scenarios.map(x=>x.name).join(", ")}`);break}
 case"scenario":{const [tool,name]=a,s=specs.get(tool);if(!s)throw new Error(`unknown tool ${tool}`);const v=data();if(!name){delete v[tool];save(v);console.log(`cleared ${tool}`);break}const current=parseTool(s.file);if(!current.scenarios.some(x=>x.name.toLowerCase()===name.toLowerCase()))throw new Error(`unknown scenario ${name} for ${tool}`);v[tool]=name;save(v);console.log(`${tool} forced to ${name}`);break}
 default:console.log("Usage: careem-mcp <start|stop|status|logs|scenarios [tool]|scenario <tool> [name]|reset>");process.exitCode=cmd?1:0;
}
