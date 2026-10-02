import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.resolve('drizzle-kit'));
const {build}=require('esbuild');
mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['tests/inventory.ts'],outfile:'.sites-runtime/inventory-tests.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-database',setup(b){b.onResolve({filter:/^@\/db\/raw$/},()=>({path:'db',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export function database(){return globalThis.testDatabase;}',loader:'js'}));}}]});
await import('../.sites-runtime/inventory-tests.mjs?'+Date.now());
