import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ErrorCode, ListResourcesRequestSchema, ListToolsRequestSchema, McpError, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { loadSpecs, parseTool, render, selectScenario } from "./spec.js";

const here=dirname(fileURLToPath(import.meta.url)), project=resolve(here,".."), specRoot=resolve(project,"../careem-mcp-sandbox/spec");
export const toolsDir=join(specRoot,"tools"), runDir=join(project,".run"), overridesFile=join(runDir,"overrides.json");
const Ajv: any=(AjvModule as any).default??AjvModule, addFormats: any=(addFormatsModule as any).default??addFormatsModule;
const initial=loadSpecs(toolsDir), ajv=new Ajv({allErrors:true,useDefaults:true,strict:false}); addFormats(ajv);
const validators=new Map([...initial].map(([n,s])=>[n,ajv.compile(s.tool.inputSchema)]));
const widgetMeta={ui:{resourceUri:"ui://careem-mcp-app",csp:{connectDomains:["https://careem-mcp-app.pages.dev"],resourceDomains:["https://careem-mcp-app.pages.dev","https://careem.s3.eu-west-1.amazonaws.com","https://d1a3f4spazzrp4.cloudfront.net","https://careem-catalog-media.media.careem.com","https://partner-mot-prod.media.careem.com"],frameDomains:[],baseUriDomains:[]}},prefersBorder:false,domain:"https://careem-mcp-app.pages.dev",annotations:{ttlMs:60000,destructiveHint:false,openWorldHint:false,readOnlyHint:true}};
const html=`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="color-scheme" content="light dark">\n<title>Careem MCP App</title>\n<link rel="stylesheet" href="https://careem-mcp-app.pages.dev/assets/index.css">\n</head>\n<body>\n<div id="root"></div>\n<script type="module" src="https://careem-mcp-app.pages.dev/assets/index.js"></script>\n</body>\n</html>`;
function overrides():Record<string,string>{try{return JSON.parse(readFileSync(overridesFile,"utf8"))}catch{return {}}}
export function createServer(){
 const server=new Server({name:"careem-mcp-service",version:"v1.0.0"},{capabilities:{tools:{listChanged:true},resources:{listChanged:true},logging:{}}});
 server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:[...initial.values()].map(s=>s.tool).sort((a,b)=>a.name.localeCompare(b.name))}));
 server.setRequestHandler(ListResourcesRequestSchema,async()=>({resources:[{uri:"ui://careem-mcp-app",name:"ui://careem-mcp-app",description:"Careem Widget",mimeType:"text/html;profile=mcp-app",_meta:widgetMeta}]}));
 server.setRequestHandler(ReadResourceRequestSchema,async req=>{if(req.params.uri!=="ui://careem-mcp-app")throw new McpError(ErrorCode.InvalidParams,`unknown resource "${req.params.uri}"`);return{contents:[{uri:req.params.uri,mimeType:"text/html;profile=mcp-app",text:html,_meta:widgetMeta}]}});
 server.setRequestHandler(CallToolRequestSchema,async req=>{
  const name=req.params.name, base=initial.get(name); if(!base)throw new McpError(ErrorCode.InvalidParams,`unknown tool "${name}"`);
  const args=structuredClone(req.params.arguments??{}), validate=validators.get(name)!;
  if(!validate(args))return{isError:true,content:[{type:"text",text:`validating "arguments": ${ajv.errorsText(validate.errors)}`}]};
  try{const current=parseTool(base.file), forced=overrides()[name], scenario=selectScenario(current,args,forced), value=render(scenario.template,args);console.error(`${name} scenario=${scenario.name}${forced?" forced":""} args=${JSON.stringify(args)}`);return{isError:scenario.isError,content:[{type:"text",text:JSON.stringify(value)}],...(value&&typeof value==="object"&&!Array.isArray(value)?{structuredContent:value}:{})};}
  catch(e){console.error(`${name} internal error`,e);return{isError:true,content:[{type:"text",text:"internal server error"}]};}
 }); return server;
}
async function stdio(){await createServer().connect(new StdioServerTransport())}
async function http(){
 const app=express();app.use(express.json({limit:"2mb"})); const sessions=new Map<string,{transport:StreamableHTTPServerTransport,server:Server}>();
 app.use((_q,r,n)=>{r.set({"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"*","Access-Control-Allow-Headers":"*"});n()});app.options("/mcp",(_q,r)=>{r.sendStatus(200)});
 app.all("/mcp",async(req,res)=>{let sid=req.headers["mcp-session-id"] as string|undefined, entry=sid?sessions.get(sid):undefined;if(!entry){const server=createServer();let transport!:StreamableHTTPServerTransport;transport=new StreamableHTTPServerTransport({sessionIdGenerator:()=>randomUUID(),onsessioninitialized:(id:string)=>{sessions.set(id,{transport,server})}});transport.onclose=()=>{if(transport.sessionId)sessions.delete(transport.sessionId)};await server.connect(transport);entry={transport,server}}await entry.transport.handleRequest(req,res,req.body)});
 app.get("/health",(_q,r)=>r.json({status:"ok",tools:initial.size}));app.get("/",(_q,r)=>r.type("html").send('<link rel="icon" href="/favicon.ico">'));app.get(/^\/favicon\./,(q,r)=>r.redirect(301,`https://www.careem.com${q.path}`));
 const port=+(process.env.PORT??8787);app.listen(port,"127.0.0.1",()=>console.error(`careem-mcp-service listening on http://127.0.0.1:${port}/mcp (${initial.size} tools)`));
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes("--stdio"))stdio().catch(e=>{console.error(e);process.exit(1)});else http().catch(e=>{console.error(e);process.exit(1)});
}
