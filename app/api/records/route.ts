import { database } from '@/db/raw';
import { recordSchema, facilities } from '@/lib/atlas';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// This shared inventory is protected by the Sites owner-private access policy.
// Preserve that policy; public deployment requires explicit application authorization.
function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
export async function GET(){try{const {results}=await database().prepare('SELECT payload, version FROM atlas_records').all<{payload:string,version:number}>();return json({records:results.map(r=>({...JSON.parse(r.payload),version:r.version}))});}catch(e){console.error('Atlas load failed',e);return json({error:'Kayıtlar yüklenemedi. Lütfen tekrar deneyin.'},503);}}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'İstek reddedildi.'},403);
 try{
 const text=await req.text();if(text.length>20000)return json({error:'Kayıt çok büyük.'},413);
 const parsed=recordSchema.safeParse(JSON.parse(text));if(!parsed.success)return json({error:'Alanları kontrol edin. Ad, konum ve geçerli değerler gereklidir.'},400);
 const value=parsed.data;const db=database();
 if(value.kind==='tank'&&!facilities.some(f=>f.id===value.facilityId)){const parent=await db.prepare("SELECT id FROM atlas_records WHERE id=? AND kind='facility'").bind(value.facilityId).first();if(!parent)return json({error:'Tesis bulunamadı.'},400);}
 const next={...value,version:value.version+1};const stamp=new Date().toISOString();
 const result=value.version===0?await db.prepare('INSERT OR IGNORE INTO atlas_records (id,kind,payload,version,updated_at) VALUES (?,?,?,?,?)').bind(value.id,value.kind,JSON.stringify(next),next.version,stamp).run():await db.prepare('UPDATE atlas_records SET payload=?,version=?,updated_at=? WHERE id=? AND version=? AND kind=?').bind(JSON.stringify(next),next.version,stamp,value.id,value.version,value.kind).run();
 if(result.meta.changes!==1)return json({error:'Bu kayıt başka bir cihazda değişti. Formdaki bilgileri kopyalayın, kapatıp Yenile düğmesine basın ve yeniden düzenleyin.'},409);
 return json({record:next});
 }catch(e){if(e instanceof SyntaxError)return json({error:'Geçersiz kayıt.'},400);console.error('Atlas save failed',e);return json({error:'Kaydedilemedi. Girdiğiniz bilgiler korunuyor; tekrar deneyin.'},503);}
}
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'İstek reddedildi.'},403);
 try{const {id,version}=await req.json() as {id?:unknown,version?:unknown};if(typeof id!=='string'||typeof version!=='number'||!Number.isInteger(version))return json({error:'Geçersiz kayıt.'},400);const result=await database().prepare("DELETE FROM atlas_records WHERE id=? AND version=? AND kind='tank'").bind(id,version).run();return result.meta.changes===1?json({ok:true}):json({error:'Kayıt değişti. Yenileyip tekrar deneyin.'},409);}catch(e){console.error('Atlas delete failed',e);return json({error:'Silinemedi. Tekrar deneyin.'},503);}
}
