import { z } from 'zod';
export const coverTypes = ['Aluminum Dome Roof','Fixed Roof without Columns','Fixed Roof with Columns','No Fixed Roof','Unknown'] as const;
export const floatingTypes = ['Internal Floating Roof','External Floating Roof','None','Unknown'] as const;
export const storedProducts = ['Crude Oil','Naphtha','Gasoline','Gas Oil','Light Straight-Run Naphtha (LSRN)','Reformate','Isomerate','Toluene','Xylene','Benzene','Sour Water','Slop Oil','Water','Diesel','Jet Fuel','Fuel Oil','Kerosene','Condensate','Other','Unknown'] as const;
export const supplyTypes = ['Yes','No','Unknown'] as const;
export const dateSchema=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v),'Use a valid YYYY-MM-DD date');
export const companyProductSchema=z.object({id:z.string().min(1).max(80),name:z.string().trim().min(1).max(120),description:z.string().max(500),deliveryDate:dateSchema,reference:z.string().max(150)});
export type CompanyProduct=z.infer<typeof companyProductSchema>;
export const facilitySchema=z.object({id:z.string().min(1).max(80),kind:z.literal('facility'),name:z.string().trim().min(1).max(120),operator:z.string().max(100),city:z.string().max(80),type:z.enum(['Refinery','Terminal','Petrochemical']),lat:z.number().min(-85).max(85),lng:z.number().min(-180).max(180),version:z.number().int().min(0)});
export const tankSchema=z.object({id:z.string().min(1).max(80),kind:z.literal('tank'),facilityId:z.string().min(1).max(80),name:z.string().trim().min(1).max(80),lat:z.number().min(-85).max(85).nullable(),lng:z.number().min(-180).max(180).nullable(),diameter:z.number().positive().max(1000).nullable(),height:z.number().positive().max(1000).nullable(),product:z.enum(storedProducts),otherProduct:z.string().trim().max(100),roof:z.enum(coverTypes),floatingRoof:z.enum(floatingTypes),supply:z.enum(supplyTypes),companyProducts:z.array(companyProductSchema).max(100),documentUrl:z.union([z.literal(''),z.string().url().refine(v=>v.startsWith('https://'))]),version:z.number().int().min(0),legacyInstalled:z.string().max(100).optional(),legacyRoof:z.string().max(100).optional(),legacyNotes:z.string().max(5000).optional(),legacyUpdatedAt:z.string().max(100).optional()});
export const recordSchema=z.discriminatedUnion('kind',[facilitySchema,tankSchema]);
export type Facility=z.infer<typeof facilitySchema>;
export type Tank=z.infer<typeof tankSchema>;
export type AtlasRecord=Facility|Tank;
export type Note={id:string;tankId:string;text:string;noteDate:string;createdAt:string;author:string;source:'manual'|'import'|'legacy'};
export const noteInputSchema=z.object({id:z.string().min(1).max(80),tankId:z.string().min(1).max(80),text:z.string().trim().min(1).max(5000),noteDate:dateSchema.optional()});
export type NoteInput=z.infer<typeof noteInputSchema>;
export function recordErrors(r:AtlasRecord):string[]{if(r.kind==='facility')return [];const errors:string[]=[];if((r.lat===null)!==(r.lng===null))errors.push('Enter both latitude and longitude, or leave both blank.');if(r.product==='Other'&&!r.otherProduct.trim())errors.push('Specify the stored product when Other is selected.');if(r.floatingRoof==='External Floating Roof'&&!['No Fixed Roof','Unknown'].includes(r.roof))errors.push('External Floating Roof requires No Fixed Roof (or Unknown).');if(new Set(r.companyProducts.map(p=>p.id)).size!==r.companyProducts.length)errors.push('Company product IDs must be unique within the tank.');return errors;}
export function tankKey(t:Pick<Tank,'facilityId'|'name'>){return t.facilityId+'|'+t.name.trim().toLowerCase();}
export function productLabel(t:Tank){return t.product==='Other'?t.otherProduct:t.product;}
export function equipmentLabel(t:Tank){return t.companyProducts.map(p=>p.name).join(', ');}
export function hasLocation(t:Tank):t is Tank & {lat:number;lng:number}{return t.lat!==null&&t.lng!==null;}
export function blankTank(facilityId:string,lat:number|null=null,lng:number|null=null):Tank{return {id:crypto.randomUUID(),kind:'tank',facilityId,name:'',lat,lng,diameter:null,height:null,product:'Unknown',otherProduct:'',roof:'Unknown',floatingRoof:'Unknown',supply:'Unknown',companyProducts:[],documentUrl:'',version:0};}
// Normalize previous records without assigning installation dates as delivery dates.
export function normalizeRecord(raw:any,updatedAt=''):AtlasRecord{
 if(raw.kind==='facility')return {...raw,type:({'Rafineri':'Refinery','Petrokimya':'Petrochemical'} as any)[raw.type]||raw.type,name:raw.name.replace(' Rafinerisi',' Refinery').replace('STAR Rafineri','STAR Refinery').replace('Petkim Petrokimya Tesisi','Petkim Petrochemical Complex').replace('STAD Akaryakıt Depolama','STAD Fuel Storage')};
 if(Array.isArray(raw.companyProducts))return {...raw,supply:raw.companyProducts.length?'Yes':raw.supply};
 const aliases:Record<string,string>={'lsrn':'Light Straight-Run Naphtha (LSRN)','reformat':'Reformate','isomerat':'Isomerate','toluen':'Toluene','gasoil':'Gas Oil','benzin':'Gasoline','nafta':'Naphtha','motorin':'Diesel','su':'Water'};
 const product=storedProducts.find(p=>p.toLowerCase()===String(raw.product).toLowerCase())||aliases[String(raw.product).toLowerCase()]||(raw.product?'Other':'Unknown');
 return {...blankTank(raw.facilityId,raw.lat??null,raw.lng??null),...raw,product,otherProduct:product==='Other'?raw.product:'',roof:raw.roof==='Alüminyum kubbe'?'Aluminum Dome Roof':raw.roof==='Dış yüzer çatı'?'No Fixed Roof':'Unknown',floatingRoof:raw.roof==='Dış yüzer çatı'?'External Floating Roof':raw.roof==='İç yüzer çatı'?'Internal Floating Roof':'Unknown',supply:raw.equipment?'Yes':({'Var':'Yes','Yok':'No'} as any)[raw.supply]||'Unknown',companyProducts:raw.equipment?[{id:'legacy-'+raw.id,name:raw.equipment.slice(0,120),description:raw.equipment,deliveryDate:'',reference:''}]:[],legacyInstalled:raw.installed||'',legacyRoof:raw.roof||'',legacyNotes:raw.notes||'',legacyUpdatedAt:updatedAt};
}
export function legacyNote(t:Tank):Note|null{return t.legacyNotes?{id:'legacy-note-'+t.id,tankId:t.id,text:t.legacyNotes,noteDate:'',createdAt:t.legacyUpdatedAt||'',author:'Legacy record',source:'legacy'}:null;}
export const facilities:Facility[]=[
{id:'petkim',kind:'facility',name:'Petkim Petrochemical Complex',operator:'SOCAR',city:'Aliağa, İzmir',type:'Petrochemical',lat:38.78731,lng:26.93638,version:0},
// STAD starts at the published terminal pier reference; its position remains editable.
{id:'stad',kind:'facility',name:'STAD Fuel Storage',operator:'SOCAR',city:'Aliağa, İzmir',type:'Terminal',lat:38.7725,lng:26.928333,version:0},
{id:'tupras-izmir',kind:'facility',name:'Tüpraş İzmir Refinery',operator:'Tüpraş',city:'Aliağa, İzmir',type:'Refinery',lat:38.81423,lng:26.94143,version:0},
{id:'star',kind:'facility',name:'STAR Refinery',operator:'SOCAR',city:'Aliağa, İzmir',type:'Refinery',lat:38.79643,lng:26.92591,version:0},
{id:'tupras-izmit',kind:'facility',name:'Tüpraş İzmit Refinery',operator:'Tüpraş',city:'Körfez, Kocaeli',type:'Refinery',lat:40.750,lng:29.76667,version:0},
{id:'tupras-kirikkale',kind:'facility',name:'Tüpraş Kırıkkale Refinery',operator:'Tüpraş',city:'Hacılar, Kırıkkale',type:'Refinery',lat:39.74582,lng:33.46105,version:0},
{id:'tupras-batman',kind:'facility',name:'Tüpraş Batman Refinery',operator:'Tüpraş',city:'Batman',type:'Refinery',lat:37.879,lng:41.13698,version:0}
];
