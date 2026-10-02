import { database } from '@/db/raw';
import { recordSchema, facilities, normalizeRecord, recordErrors, tankKey, legacyNote, noteInputSchema, type AtlasRecord, type Tank, type Note } from '@/lib/atlas';
import { z } from 'zod';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// Writes rely on the existing owner-private Sites policy. Do not publish publicly without app authorization.
function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
async function inventory(){const db=database();const [rows,notes]=await Promise.all([db.prepare('SELECT payload, version, updated_at FROM atlas_records').all<{payload:string;version:number;updated_at:string}>(),db.prepare('SELECT id,tank_id AS tankId,text,note_date AS noteDate,created_at AS createdAt,author,source FROM atlas_notes ORDER BY created_at,id').all<Note>()]);const records=rows.results.map(r=>normalizeRecord({...JSON.parse(r.payload),version:r.version},r.updated_at));const legacy=records.filter((r):r is Tank=>r.kind==='tank').map(legacyNote).filter((n):n is Note=>!!n);return {records,notes:[...legacy,...notes.results]};}
export async function GET(){try{return json(await inventory());}catch(e){console.error('Atlas load failed',e);return json({error:'Records could not be loaded. Please try again.'},503);}}
const inputSchema=z.object({records:z.array(recordSchema).max(1000),notes:z.array(noteInputSchema).max(2000).default([]),source:z.enum(['manual','import']).default('manual')});
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Request rejected.'},403);
 try{
 const body=await req.text();if(body.length>4000000)return json({error:'Import is too large. Use at most 1,000 tanks and 2,000 notes per file.'},413);
 const raw=JSON.parse(body);const parsed=inputSchema.safeParse(raw.records?raw:{records:[raw],notes:[]});
 if(!parsed.success)return json({error:parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')},400);
 const input=parsed.data;const state=await inventory();const byId=new Map(state.records.map(r=>[r.id,r]));const all=new Map([...facilities,...state.records].map(r=>[r.id,r]));const next:AtlasRecord[]=[];const seen=new Set<string>();
 for(const value of input.records){
  if(seen.has(value.id))return json({error:'Duplicate record ID in this import.'},400);seen.add(value.id);
  const previous=byId.get(value.id);
  if((previous?.version??0)!==value.version||previous&&previous.kind!==value.kind)return json({error:'A record changed on another device. Refresh and preview the import again. No changes were saved.'},409);
  if(!previous&&value.version!==0)return json({error:'Record no longer exists. Refresh and try again.'},409);
  const errors=recordErrors(value);if(errors.length)return json({error:value.name+': '+errors.join(' ')},400);
  let record:AtlasRecord={...value,version:value.version+1};
  if(record.kind==='tank'){
   // Legacy fields are read-only; neither edits nor imports can rewrite old notes/dates.
   const old=previous?.kind==='tank'?previous:undefined;
   record={...record,supply:record.companyProducts.length?'Yes':record.supply,legacyInstalled:old?.legacyInstalled||'',legacyRoof:old?.legacyRoof||'',legacyNotes:old?.legacyNotes||'',legacyUpdatedAt:old?.legacyUpdatedAt||''};
  }
  next.push(record);all.set(record.id,record);
 }
 const keys=new Set<string>();
 for(const r of all.values())if(r.kind==='tank'){
  if(all.get(r.facilityId)?.kind!=='facility')return json({error:'Facility not found for '+r.name},400);
  const key=tankKey(r);if(keys.has(key))return json({error:'Tank names must be unique within each facility: '+r.name},409);keys.add(key);
 }
 const db=database(),stamp=new Date().toISOString();const statements=next.map(record=>{
  const previous=byId.get(record.id);const key=record.kind==='tank'?tankKey(record):null;
  if(!previous)return db.prepare('INSERT INTO atlas_records (id,kind,payload,version,updated_at,record_key) VALUES (?,?,?,?,?,?)').bind(record.id,record.kind,JSON.stringify(record),record.version,stamp,key);
  // NOT NULL failure rolls the entire D1 batch back on concurrent modifications.
  return db.prepare('INSERT INTO atlas_records (id,kind,payload,version,updated_at,record_key) VALUES (?,?,?,CASE WHEN EXISTS (SELECT 1 FROM atlas_records WHERE id=? AND version=? AND kind=?) THEN ? ELSE NULL END,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at,record_key=excluded.record_key').bind(record.id,record.kind,JSON.stringify(record),record.id,previous.version,record.kind,record.version,stamp,key);
 });
 let author=req.headers.get('oai-authenticated-user-email')||'Owner-private service';const encoded=req.headers.get('oai-authenticated-user-full-name');if(encoded&&req.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{author=decodeURIComponent(encoded);}catch{}}
 const existingNotes=new Map(state.notes.map(n=>[n.id,n]));const added:Note[]=[];
 for(const note of input.notes){
  if(all.get(note.tankId)?.kind!=='tank')return json({error:'Note refers to an unknown tank.'},400);
  const old=existingNotes.get(note.id);
  if(old){if(old.tankId!==note.tankId||old.text!==note.text||(note.noteDate??'')!==old.noteDate)return json({error:'Existing notes cannot be changed. Add a new correction note instead.'},409);continue;}
  const n:Note={...note,noteDate:input.source==='import'?(note.noteDate||''):new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),createdAt:stamp,author,source:input.source};
  existingNotes.set(n.id,n);added.push(n);
  statements.push(db.prepare('INSERT INTO atlas_notes (id,tank_id,text,note_date,created_at,author,source) VALUES (?,?,?,?,?,?,?)').bind(n.id,n.tankId,n.text,n.noteDate,n.createdAt,n.author,n.source));
 }
 if(statements.length)await db.batch(statements);
 return json({records:next,record:next[0],notes:added});
 }catch(e){if(e instanceof SyntaxError)return json({error:'Invalid request.'},400);console.error('Atlas save failed',e);if(/constraint|unique/i.test(String(e)))return json({error:'A record changed or a duplicate was found. Nothing was saved. Refresh and try again.'},409);return json({error:'Could not save. Your input has been preserved; try again.'},503);}
}
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'Request rejected.'},403);
 try{const {id,version}=await req.json() as {id?:unknown;version?:unknown};if(typeof id!=='string'||typeof version!=='number'||!Number.isInteger(version))return json({error:'Invalid record.'},400);const state=await inventory();if(state.notes.some(n=>n.tankId===id))return json({error:'A tank with note history cannot be deleted. Its history is permanent.'},409);const result=await database().prepare("DELETE FROM atlas_records WHERE id=? AND version=? AND kind='tank'").bind(id,version).run();return result.meta.changes===1?json({ok:true}):json({error:'Record changed. Refresh and try again.'},409);}catch(e){console.error('Atlas delete failed',e);return json({error:'Could not delete. A tank with notes must be retained.'},409);}
}
