import { blankTank, tankSchema, noteInputSchema, recordErrors, tankKey, legacyNote, coverTypes, floatingTypes, storedProducts, type Facility, type Tank, type Note, type NoteInput } from './atlas';
export type WorkbookRows=Record<string,Record<string,string>[]>;
export type ImportPlan={records:Tank[];notes:NoteInput[];errors:string[];summary:{tank:string;facility:string;action:string}[]};
export const columns={
 Tanks:['Tank ID','Facility ID','Facility','Tank Name','Latitude','Longitude','Diameter (m)','Height (m)','Stored Product','Other Product','Fixed Roof / Cover Type','Floating Roof Type','Company Products Present','Document URL','Legacy Installation Date','Legacy Roof Description'],
 'Company Products':['Product ID','Tank ID','Facility ID','Facility','Tank Name','Product Name','Model / Description','Delivery Date','Project / PO Reference'],
 Notes:['Note ID','Tank ID','Facility ID','Facility','Tank Name','Note Date','Note','Recorded At','Author','Source']
};
export async function createWorkbook(facilities:Facility[],tanks:Tank[],notes:Note[],template=false){
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();book.creator='Tank Atlas';book.created=new Date();
 const fById=new Map(facilities.map(f=>[f.id,f]));
 const add=(name:string,headers:string[],rows:unknown[][])=>{const sheet=book.addWorksheet(name);sheet.addRow(headers);rows.forEach(row=>sheet.addRow(row));sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF123E4E'}};sheet.columns.forEach((col,i)=>{col.width=headers[i].includes('Note')||headers[i].includes('Description')?42:24;});sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,sheet.rowCount),column:headers.length}};return sheet;};
 const ref=(t:Tank)=>[t.id,t.facilityId,fById.get(t.facilityId)?.name||'',t.name];
 const ts=add('Tanks',columns.Tanks,template?[]:tanks.map(t=>[...ref(t),t.lat,t.lng,t.diameter,t.height,t.product,t.otherProduct,t.roof,t.floatingRoof,t.supply,t.documentUrl,t.legacyInstalled||'',t.legacyRoof||'']));
 const ps=add('Company Products',columns['Company Products'],template?[]:tanks.flatMap(t=>t.companyProducts.map(p=>[p.id,...ref(t),p.name,p.description,p.deliveryDate,p.reference])));
 const ns=add('Notes',columns.Notes,template?[]:notes.map(n=>{const t=tanks.find(t=>t.id===n.tankId);return [n.id,...(t?ref(t):[n.tankId,'','','']),n.noteDate,n.text,n.createdAt,n.author,n.source];}));
 const lists=book.addWorksheet('Lists');[coverTypes,floatingTypes,storedProducts,['Yes','No','Unknown'],facilities.map(f=>f.name)].forEach((values,col)=>values.forEach((v,i)=>lists.getCell(i+1,col+1).value=v));lists.state='hidden';
 for(let r=2;r<=1001;r++){for(const [col,list,length] of [[11,'A',coverTypes.length],[12,'B',floatingTypes.length],[9,'C',storedProducts.length],[13,'D',3],[3,'E',facilities.length]] as const){ts.getCell(r,col).dataValidation={type:'list',allowBlank:true,formulae:[`Lists!$${list}$1:$${list}$${length}`],showErrorMessage:true,error:'Select a value from the list.'};}}
 const guide=add('Instructions',['Topic','Instructions'],[
 ['Import','Use .xlsx files. Maximum 1,000 tank rows, 2,000 note rows and 5 MB. The application previews changes before saving.'],
 ['Facilities','Use an existing Facility ID or the exact Facility name below. Create new facilities in the app first.'],
 ['Matching','Tanks match by Tank ID, or Facility + Tank Name. Keep exported IDs unchanged.'],
 ['Existing tanks','Choose Update or Skip. Empty cells keep existing values. Use the app to intentionally clear a field.'],
 ['Coordinates','Both coordinates may be blank. Unlocated tanks remain in the inventory until you set their location.'],
 ['Products','One product per row. Keep Product ID for updates. Without an ID, a unique Product Name matches within the tank. Missing products are never removed by import.'],
 ['Dates','Use YYYY-MM-DD. Delivery Date belongs to each company product. Legacy installation dates are read-only.'],
 ['Notes','Notes are permanent. Keep Note ID on export/re-import. Existing notes cannot change. Without an ID, identical tank + date + text is deduplicated.'],
 ['History','Note Date is the historical date. Recorded At, Author and Source are assigned by the server; imported values cannot impersonate another user.'],
 ['Export','Export includes all facilities’ tanks, products and notes. Refreshes from the server before download.'],
 ['Roof consistency','External Floating Roof requires No Fixed Roof or Unknown.'],
 ['Stored product','Other requires Other Product.'],
 ...facilities.map(f=>[f.id,f.name])]);guide.getColumn(2).width=100;guide.eachRow(r=>r.alignment={wrapText:true,vertical:'top'});
 ps.getColumn(8).numFmt='yyyy-mm-dd';ns.getColumn(6).numFmt='yyyy-mm-dd';
 return book.xlsx.writeBuffer();
}
export async function readWorkbook(file:File):Promise<WorkbookRows>{
 if(!file.name.toLowerCase().endsWith('.xlsx'))throw Error('Please choose an .xlsx workbook.');if(file.size>5*1024*1024)throw Error('Maximum file size is 5 MB.');
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());const result:WorkbookRows={};
 for(const [name,expected] of Object.entries(columns)){const sheet=book.getWorksheet(name);if(!sheet)continue;if(sheet.rowCount>10001)throw Error(name+': too many rows.');const headers:string[]=[];sheet.getRow(1).eachCell((cell,i)=>{headers[i]=cell.text.trim();if(!expected.includes(headers[i]))throw Error(name+': unknown column '+headers[i]);});if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error(name+': duplicate headers.');
 const rows:Record<string,string>[]=[];sheet.eachRow((row,r)=>{if(r===1)return;const data:Record<string,string>={};row.eachCell((cell,c)=>{if(!headers[c]&&cell.value!==null)throw Error(name+': a column has no header.');if(cell.type===ExcelJS.ValueType.Formula||cell.type===ExcelJS.ValueType.Error)throw Error(name+' row '+r+': formulas and error cells are not accepted; paste values.');const v=cell.value;data[headers[c]]=v instanceof Date?v.toISOString().slice(0,10):headers[c]==='Note'?cell.text:cell.text.trim();});if(Object.values(data).some(Boolean))rows.push({...data,__row:String(r)});});result[name]=rows;}
 if(!Object.keys(result).length)throw Error('No Tanks, Company Products or Notes sheet found. Download the template first.');if((result.Tanks?.length||0)>1000||(result.Notes?.length||0)>2000)throw Error('Use at most 1,000 tanks and 2,000 notes per import.');return result;
}
const equal=(a:string,b:string)=>a.trim().toLowerCase()===b.trim().toLowerCase();
async function stableId(text:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return 'import-'+Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function planImport(rows:WorkbookRows,facilities:Facility[],existing:Tank[],notes:Note[],mode:'update'|'skip'):Promise<ImportPlan>{
 const plan:ImportPlan={records:[],notes:[],errors:[],summary:[]};const tanks=new Map(existing.map(t=>[t.id,structuredClone(t)]));const changed=new Set<string>(),seenTanks=new Set<string>(),seenProducts=new Set<string>();const initialIds=new Set(existing.map(t=>t.id));
 function resolveFacility(row:Record<string,string>){let f=row['Facility ID']?facilities.find(f=>f.id===row['Facility ID']):facilities.find(f=>equal(f.name,row.Facility||''));if(!f)throw Error('Unknown facility. Use an existing Facility ID or exact name.');if(row.Facility&&!equal(f.name,row.Facility))throw Error('Facility ID and name do not match.');return f;}
 function resolveTank(row:Record<string,string>,create=false){
  let t=row['Tank ID']?tanks.get(row['Tank ID']):undefined;let f:Facility|undefined;
  if(row['Facility ID']||row.Facility)f=resolveFacility(row);
  if(t){if(f&&f.id!==t.facilityId)throw Error('Tank ID belongs to another facility.');if(!create&&row['Tank Name']&&!equal(t.name,row['Tank Name']))throw Error('Tank ID and name do not match.');return t;}
  if(!f)throw Error('Facility is required.');if(!row['Tank Name'])throw Error('Tank Name is required.');
  t=[...tanks.values()].find(t=>tankKey(t)===tankKey({facilityId:f!.id,name:row['Tank Name']}));
  if(t&&row['Tank ID']&&row['Tank ID']!==t.id)throw Error('Tank ID conflicts with the existing tank.');
  if(!t&&create){t=blankTank(f.id);if(row['Tank ID'])t.id=row['Tank ID'];t.name=row['Tank Name'];tanks.set(t.id,t);}if(!t)throw Error('Tank not found. Add it to the Tanks sheet first.');return t;
 }
 for(const row of rows.Tanks||[]){try{const t=resolveTank(row,true);if(seenTanks.has(t.id))throw Error('Duplicate tank row.');seenTanks.add(t.id);if(mode==='skip'&&initialIds.has(t.id)){plan.summary.push({tank:t.name,facility:facilities.find(f=>f.id===t.facilityId)!.name,action:'Skip'});continue;}
  const fields:Record<string,keyof Tank>={'Tank Name':'name','Stored Product':'product','Other Product':'otherProduct','Fixed Roof / Cover Type':'roof','Floating Roof Type':'floatingRoof','Company Products Present':'supply','Document URL':'documentUrl'};
  for(const [column,key] of Object.entries(fields))if(row[column])(t as any)[key]=row[column];
  for(const [column,key] of Object.entries({'Latitude':'lat','Longitude':'lng','Diameter (m)':'diameter','Height (m)':'height'}))if(row[column]){const n=Number(row[column]);if(!Number.isFinite(n))throw Error(column+' must be numeric.');(t as any)[key]=n;}
  changed.add(t.id);
 }catch(e){plan.errors.push('Tanks row '+row.__row+': '+(e as Error).message);}}
 for(const row of rows['Company Products']||[]){try{const t=resolveTank(row);if(mode==='skip'&&initialIds.has(t.id))continue;const matches=t.companyProducts.filter(p=>equal(p.name,row['Product Name']||''));if(!row['Product ID']&&matches.length>1)throw Error('More than one product has this name. Use Product ID.');let p=row['Product ID']?t.companyProducts.find(p=>p.id===row['Product ID']):matches[0];if(!p){if(!row['Product Name'])throw Error('Product Name is required.');p={id:row['Product ID']||crypto.randomUUID(),name:row['Product Name'],description:'',deliveryDate:'',reference:''};t.companyProducts.push(p);}
 const key=t.id+'|'+p.id;if(seenProducts.has(key))throw Error('Duplicate product row.');seenProducts.add(key);
 for(const [col,key] of Object.entries({'Product Name':'name','Model / Description':'description','Delivery Date':'deliveryDate','Project / PO Reference':'reference'}))if(row[col])(p as any)[key]=row[col];t.supply='Yes';changed.add(t.id);
 }catch(e){plan.errors.push('Company Products row '+row.__row+': '+(e as Error).message);}}
 const noteMap=new Map(notes.map(n=>[n.id,n]));
 for(const row of rows.Notes||[]){try{const t=resolveTank(row);if(mode==='skip'&&initialIds.has(t.id))continue;if(!row.Note)throw Error('Note text is required.');const noteDate=row['Note Date']||'';const id=row['Note ID']||await stableId(t.id+'|'+noteDate+'|'+row.Note);const old=noteMap.get(id);if(old){if(old.tankId!==t.id||old.text!==row.Note||old.noteDate!==noteDate)throw Error('Existing notes cannot be changed. Add a new note with a new or empty Note ID.');continue;}const n=noteInputSchema.parse({id,tankId:t.id,text:row.Note,noteDate});plan.notes.push(n);noteMap.set(id,{...n,noteDate:n.noteDate||'',createdAt:'',author:'',source:'import'});
 }catch(e){plan.errors.push('Notes row '+row.__row+': '+(e as Error).message);}}
 const keys=new Set<string>();for(const t of tanks.values()){const key=tankKey(t);if(keys.has(key))plan.errors.push('Duplicate tank name in facility: '+t.name);keys.add(key);if(!changed.has(t.id))continue;const parsed=tankSchema.safeParse(t);if(!parsed.success)plan.errors.push(t.name+': '+parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).join('; '));else{const errors=recordErrors(t);plan.errors.push(...errors.map(e=>t.name+': '+e));}plan.records.push(t);plan.summary.push({tank:t.name,facility:facilities.find(f=>f.id===t.facilityId)?.name||'',action:initialIds.has(t.id)?'Update':'Create'});}
 if(plan.records.length>1000||plan.notes.length>2000)plan.errors.push('Use at most 1,000 tank changes and 2,000 notes per import.');return plan;
}
export async function downloadWorkbook(facilities:Facility[],tanks:Tank[],notes:Note[],template=false){const bytes=await createWorkbook(facilities,tanks,notes,template);const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=template?'tank-atlas-template.xlsx':'tank-atlas-'+new Date().toISOString().slice(0,10)+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
