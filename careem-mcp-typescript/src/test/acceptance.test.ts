import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import AjvModule from "ajv";
import addFormatsModule from "ajv-formats";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, overridesFile, runDir, toolsDir } from "../server.js";
import { loadSpecs, render } from "../spec.js";

const Ajv:any=(AjvModule as any).default??AjvModule, addFormats:any=(addFormatsModule as any).default??addFormatsModule;
const specs=loadSpecs(toolsDir);
async function connected(){const server=createServer(),client=new Client({name:"acceptance",version:"1"});const [ct,st]=InMemoryTransport.createLinkedPair();await server.connect(st);await client.connect(ct);return{server,client}}
function result(r:any){return r.structuredContent??JSON.parse(r.content[0].text)}

test("protocol identity, exact tools and resource",async()=>{const{server,client}=await connected();try{assert.deepEqual(client.getServerVersion(),{name:"careem-mcp-service",version:"v1.0.0"});const tools=await client.listTools();assert.equal(tools.tools.length,42);for(const t of tools.tools)assert.deepEqual(t,specs.get(t.name)!.tool);const resources=await client.listResources();assert.equal(resources.resources[0].uri,"ui://careem-mcp-app");}finally{await client.close();await server.close()}});
test("menu selection, validation, search, geocode, override, unknown tool",async()=>{mkdirSync(runDir,{recursive:true});writeFileSync(overridesFile,"{}\n");const{server,client}=await connected();try{
 let r:any=await client.callTool({name:"food_get_restaurant_menu",arguments:{restaurant_id:30104,latitude:25.0866,longitude:55.1474}});assert.equal(r.isError,false);assert.equal(result(r).restaurant.id,30104);assert.equal(result(r).restaurant.name.value,"Morning Syrniki Café");
 r=await client.callTool({name:"food_get_restaurant_menu",arguments:{restaurant_id:30101,latitude:25.0866,longitude:55.1474}});assert.equal(result(r).restaurant.name.value,"Shawarma Station");
 r=await client.callTool({name:"food_get_restaurant_menu",arguments:{restaurant_id:1,latitude:25.0866,longitude:55.1474}});assert.equal(result(r).error,"failed to get restaurant menu: unexpected response status 404");
 r=await client.callTool({name:"food_get_restaurant_menu",arguments:{restaurant_id:"x",latitude:25.0866,longitude:55.1474}});assert.equal(r.isError,true);assert.match(r.content[0].text,/^validating "arguments"/);
 r=await client.callTool({name:"food_get_restaurant_menu",arguments:{}});assert.equal(r.isError,true);
 r=await client.callTool({name:"food_merchant_search",arguments:{query:"sushi",latitude:25.0866,longitude:55.1474}});assert.equal(result(r).restaurants[0].id,30102);
 r=await client.callTool({name:"food_merchant_search",arguments:{query:"NOPE",latitude:25.0866,longitude:55.1474}});assert.deepEqual(result(r).restaurants,[]);
 r=await client.callTool({name:"food_merchant_search",arguments:{query:"sushi",longitude:55.1474}});assert.equal(r.isError,true);
 r=await client.callTool({name:"reverse_geocode",arguments:{latitude:25.0866,longitude:55.1474}});assert.equal(result(r).location.locationUuid,"LOC-50001");
 r=await client.callTool({name:"reverse_geocode",arguments:{latitude:91,longitude:55}});assert.ok(result(r).error);
 writeFileSync(overridesFile,JSON.stringify({food_get_restaurant_menu:"upstream-unavailable"}));r=await client.callTool({name:"food_get_restaurant_menu",arguments:{restaurant_id:30104,latitude:25.0866,longitude:55.1474}});assert.ok(result(r).error);writeFileSync(overridesFile,"{}");r=await client.callTool({name:"food_get_restaurant_menu",arguments:{restaurant_id:30104,latitude:25.0866,longitude:55.1474}});assert.equal(result(r).restaurant.id,30104);
 await assert.rejects(()=>client.callTool({name:"does_not_exist",arguments:{}}),/unknown tool/);
 }finally{writeFileSync(overridesFile,"{}\n");await client.close();await server.close()}});

function sample(schema:any):any{if(schema?.enum)return structuredClone(schema.enum[0]);let type=Array.isArray(schema?.type)?schema.type.find((x:string)=>x!=="null"):schema?.type;if(!type){if(schema?.properties)type="object";else return "sample"}if(type==="string")return "sample";if(type==="integer"||type==="number")return 1;if(type==="boolean")return false;if(type==="array")return[sample(schema.items??{})];if(type==="object")return Object.fromEntries(Object.entries(schema.properties??{}).map(([k,v])=>[k,sample(v)]));return null}
function overlay(base:any,match:any):any{if(Array.isArray(match))return match.map((v,i)=>typeof v==="object"&&!Array.isArray(v)?overlay(base?.[0]??{},v):pattern(v,base?.[i]));if(match&&typeof match==="object")return Object.fromEntries([...new Set([...Object.keys(base??{}),...Object.keys(match)])].map(k=>[k,Object.hasOwn(match,k)?overlay(base?.[k],match[k]):base[k]]));return pattern(match,base)}
function pattern(v:any,base:any){if(v==="*")return base??"sample";if(typeof v==="string"&&(v.startsWith("~")||v.startsWith("=")))return v.slice(1);return v}
test("all scenario templates validate and observable data has no forbidden markers",()=>{const ajv=new Ajv({strict:false,allErrors:true});addFormats(ajv);const forbidden=/mock|sandbox|sbx|fake|dummy|example\.com/i;for(const s of specs.values()){assert.doesNotMatch(JSON.stringify(s.tool),forbidden,`${s.tool.name} definition`);const validate=ajv.compile(s.tool.outputSchema);for(const scenario of s.scenarios){const args=overlay(sample(s.tool.inputSchema),scenario.match??{});const value=render(scenario.template,args);assert.doesNotMatch(JSON.stringify(value),forbidden,`${s.tool.name}/${scenario.name}`);if(!scenario.isError)assert.equal(validate(value),true,`${s.tool.name}/${scenario.name}: ${ajv.errorsText(validate.errors)}`)}}});
