import { z } from 'zod';
export const facilitySchema = z.object({id:z.string().min(1).max(80),kind:z.literal('facility'),name:z.string().trim().min(1).max(120),operator:z.string().max(100),city:z.string().max(80),type:z.enum(['Rafineri','Terminal','Petrokimya']),lat:z.number().min(-85).max(85),lng:z.number().min(-180).max(180),version:z.number().int().min(0)});
export const tankSchema = z.object({id:z.string().min(1).max(80),kind:z.literal('tank'),facilityId:z.string().min(1).max(80),name:z.string().trim().min(1).max(80),lat:z.number().min(-85).max(85),lng:z.number().min(-180).max(180),diameter:z.number().positive().max(1000).nullable(),height:z.number().positive().max(1000).nullable(),product:z.string().max(100),roof:z.enum(['Bilinmiyor','Sabit çatı','Dış yüzer çatı','İç yüzer çatı','Alüminyum kubbe']),supply:z.enum(['Bilinmiyor','Var','Yok']),equipment:z.string().max(500),installed:z.string().max(20),notes:z.string().max(5000),documentUrl:z.union([z.literal(''),z.string().url().refine(v=>v.startsWith('https://'))]),version:z.number().int().min(0)});
export const recordSchema = z.discriminatedUnion('kind',[facilitySchema,tankSchema]);
export type Facility=z.infer<typeof facilitySchema>;
export type Tank=z.infer<typeof tankSchema>;
export type AtlasRecord=Facility|Tank;
export const facilities:Facility[]=[
{id:'petkim',kind:'facility',name:'Petkim Petrokimya Tesisi',operator:'SOCAR',city:'Aliağa, İzmir',type:'Petrokimya',lat:38.78731,lng:26.93638,version:0},
// STAD starts at the published terminal pier reference; its position remains editable.
{id:'stad',kind:'facility',name:'STAD Akaryakıt Depolama',operator:'SOCAR',city:'Aliağa, İzmir',type:'Terminal',lat:38.7725,lng:26.928333,version:0},
{id:'tupras-izmir',kind:'facility',name:'Tüpraş İzmir Rafinerisi',operator:'Tüpraş',city:'Aliağa, İzmir',type:'Rafineri',lat:38.81423,lng:26.94143,version:0},
{id:'star',kind:'facility',name:'STAR Rafineri',operator:'SOCAR',city:'Aliağa, İzmir',type:'Rafineri',lat:38.79643,lng:26.92591,version:0},
{id:'tupras-izmit',kind:'facility',name:'Tüpraş İzmit Rafinerisi',operator:'Tüpraş',city:'Körfez, Kocaeli',type:'Rafineri',lat:40.750,lng:29.76667,version:0},
{id:'tupras-kirikkale',kind:'facility',name:'Tüpraş Kırıkkale Rafinerisi',operator:'Tüpraş',city:'Hacılar, Kırıkkale',type:'Rafineri',lat:39.74582,lng:33.46105,version:0},
{id:'tupras-batman',kind:'facility',name:'Tüpraş Batman Rafinerisi',operator:'Tüpraş',city:'Batman',type:'Rafineri',lat:37.879,lng:41.13698,version:0}
];
export function blankTank(facilityId:string,lat:number,lng:number):Tank{return {id:crypto.randomUUID(),kind:'tank',facilityId,name:'',lat,lng,diameter:null,height:null,product:'',roof:'Bilinmiyor',supply:'Bilinmiyor',equipment:'',installed:'',notes:'',documentUrl:'',version:0};}
