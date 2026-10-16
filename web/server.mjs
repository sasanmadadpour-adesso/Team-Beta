import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {validate,payload,earliestStart} from './validation.mjs';
import {createClient} from './lumenaza.mjs';
import {validateBank} from './bank.mjs';
import {markThreadRead,parseSocial,upsertMessage} from './src/social.mjs';

// Also load .env when the server is started directly with `node server.mjs`.
// Explicit environment variables always take precedence over the local file.
try{
 const env=readFileSync(new URL('./.env',import.meta.url),'utf8');
 for(const line of env.split(/\r?\n/)){
  const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(!match||match[1] in process.env)continue;
  let value=match[2];
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  process.env[match[1]]=value;
 }
}catch{}

const port=Number(process.env.PORT||3000),ready=Boolean(process.env.LUMENAZA_CLIENT_ID&&process.env.LUMENAZA_CLIENT_SECRET);
const geoapifyKey=process.env.GEOAPIFY_API_KEY||'';
const client=ready?createClient({clientId:process.env.LUMENAZA_CLIENT_ID,clientSecret:process.env.LUMENAZA_CLIENT_SECRET}):null;
const files={'/':['public/index.html','text/html; charset=utf-8'],'/app.css':['public/app.css','text/css'],'/style.css':['public/style.css','text/css'],'/app.js':['public/app.js','text/javascript'],'/energy.svg':['public/energy.svg','image/svg+xml'],'/manifest.webmanifest':['public/manifest.webmanifest','application/manifest+json'],'/sw.js':['public/sw.js','text/javascript'],'/app-icon.svg':['public/app-icon.svg','image/svg+xml'],'/chat-background/chat-background.gif':['public/chat-background/chat-background.gif','image/gif']};
const attempts=new Map(),sessions=new Map(),loginAttempts=new Map();
const dataDir=fileURLToPath(new URL('./runtime/',import.meta.url)),messageFile=`${dataDir}messages.json`,deletionFile=`${dataDir}deletion-requests.json`,registrationFile=`${dataDir}registrations.json`,operatorFile=`${dataDir}operators.json`;
let messages={communities:{}},deletions=[],registrations=[],operators=[],saveQueue=Promise.resolve();
try{messages=JSON.parse(await readFile(messageFile,'utf8'))}catch{await mkdir(dataDir,{recursive:true})}
try{deletions=JSON.parse(await readFile(deletionFile,'utf8'))}catch{}
try{registrations=JSON.parse(await readFile(registrationFile,'utf8'))}catch{}
try{operators=JSON.parse(await readFile(operatorFile,'utf8'))}catch{}

function send(res,status,data,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra});res.end(JSON.stringify(data))}
function cleanPath(url){const path=new URL(url,'http://localhost').pathname;return path.startsWith('/adesso/')?path.slice(7):path==='/adesso'?'/':path}
function validId(value){return typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,100}$/.test(value)}
async function body(req,max=20000){let value='';for await(const chunk of req){value+=chunk;if(Buffer.byteLength(value)>max)throw Object.assign(Error('SIZE'),{status:413})}try{return JSON.parse(value)}catch{throw Object.assign(Error('JSON'),{status:400})}}
function publicStore(communityId,userId){const store=parseSocial(JSON.stringify(messages.communities[communityId]||{threads:[]}));return {threads:store.threads.filter(thread=>thread.memberIds.includes(userId))}}
function queueSave(){saveQueue=saveQueue.then(async()=>{await mkdir(dataDir,{recursive:true});const tmp=`${messageFile}.tmp`;await writeFile(tmp,JSON.stringify(messages),'utf8');await rename(tmp,messageFile)});return saveQueue}
function queueDeletionSave(){saveQueue=saveQueue.then(async()=>{await mkdir(dataDir,{recursive:true});const tmp=`${deletionFile}.tmp`;await writeFile(tmp,JSON.stringify(deletions),'utf8');await rename(tmp,deletionFile)});return saveQueue}
function queueRegistrationSave(){saveQueue=saveQueue.then(async()=>{await mkdir(dataDir,{recursive:true});const tmp=`${registrationFile}.tmp`;await writeFile(tmp,JSON.stringify(registrations),'utf8');await rename(tmp,registrationFile)});return saveQueue}
function queueOperatorSave(){saveQueue=saveQueue.then(async()=>{await mkdir(dataDir,{recursive:true});const tmp=`${operatorFile}.tmp`;await writeFile(tmp,JSON.stringify(operators),'utf8');await rename(tmp,operatorFile)});return saveQueue}
function operatorMatches(postcode){const zip=String(postcode||'').replace(/\D/g,'').slice(0,5);return operators.filter(operator=>(operator.postcodes||[]).includes(zip)).map(({password,...publicOperator})=>publicOperator)}
function passwordOk(password){const encoded=process.env.ADMIN_PASSWORD_HASH||'',parts=encoded.split(':');if(parts.length!==2||typeof password!=='string')return false;const expected=Buffer.from(parts[1],'hex'),actual=scryptSync(password,parts[0],expected.length);return expected.length===actual.length&&timingSafeEqual(expected,actual)}
function reviewerPasswordOk(password){const encoded=process.env.REVIEWER_PASSWORD_HASH||'',parts=encoded.split(':');if(parts.length!==2||typeof password!=='string')return false;const expected=Buffer.from(parts[1],'hex'),actual=scryptSync(password,parts[0],expected.length);return expected.length===actual.length&&timingSafeEqual(expected,actual)}
function cookie(req,name){return (req.headers.cookie||'').split(';').map(x=>x.trim().split('=')).find(([key])=>key===name)?.[1]}
function admin(req){const token=cookie(req,'adesso_admin'),entry=sessions.get(token);if(!entry||entry<Date.now()){sessions.delete(token);return false}return true}
function summary(){const byCommunity=Object.entries(messages.communities).map(([id,store])=>({id,threads:store.threads?.length||0,messages:store.threads?.reduce((n,t)=>n+(t.messages?.length||0),0)||0}));return{communities:byCommunity.length,threads:byCommunity.reduce((n,x)=>n+x.threads,0),messages:byCommunity.reduce((n,x)=>n+x.messages,0),byCommunity}}
async function geoapify(path){if(!geoapifyKey)throw Object.assign(Error('GEOAPIFY_NOT_CONFIGURED'),{status:503});const response=await fetch(`https://api.geoapify.com/v1/${path}${path.includes('?')?'&':'?'}apiKey=${encodeURIComponent(geoapifyKey)}`,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Object.assign(Error('GEOAPIFY_ERROR'),{status:502});return response.json()}
async function registerProducer(registration,id){
 try{
  await client.register(payload(registration,id,process.env.LUMENAZA_PRODUCT_NAME));
  const result={mode:'sandbox',transmitted:true,message:'Lumenaza hat die Registrierung in der Testumgebung bestätigt. Es wurde kein produktiver Vertrag angelegt.',reference:'onboarding-'+id};
  attempts.set(id,{status:201,data:result});return {status:201,data:result};
 }catch(error){
  const uncertain=error.uncertain||['TimeoutError','TypeError','AbortError'].includes(error.name);
  const text=uncertain?'Der Übertragungsstatus ist unklar. Bitte die Registrierung bei Lumenaza prüfen, bevor Sie erneut senden.':error.message==='AUTH'?'Die Anmeldung bei Lumenaza ist fehlgeschlagen. Bitte die Test-Zugangsdaten prüfen.':error.message==='REJECTED'?'Lumenaza hat die Angaben abgelehnt. Bitte Pflichtfelder und die Tarifkonfiguration mit Lumenaza prüfen.':'Lumenaza konnte die Registrierung nicht bestätigen.';
  if(!uncertain)attempts.delete(id);else attempts.set(id,{status:409,data:{error:text}});
  return {status:502,data:{error:text}};
 }
}

const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 try{
  const path=cleanPath(req.url);
    if(req.method==='GET'&&path==='/api/status')return send(res,200,{mode:ready?'sandbox':'pending',earliestStart:earliestStart(),messaging:'server'});
    if(req.method==='GET'&&path==='/api/geocode'){const query=new URL(req.url,'http://localhost').searchParams,text=String(query.get('text')||'').trim();if(text.length<3||text.length>200)return send(res,400,{error:'Bitte einen gültigen Suchbegriff angeben.'});return send(res,200,await geoapify(`geocode/search?text=${encodeURIComponent(text)}&limit=5&geometry=original`));}
    if(req.method==='GET'&&path==='/api/nearby-operators'){const query=new URL(req.url,'http://localhost').searchParams,postcode=String(query.get('postcode')||'').replace(/\D/g,'').slice(0,5);if(postcode.length<2)return send(res,400,{error:'Postleitzahl fehlt.'});const found=registrations.filter(x=>String(x.data?.deliv_address_zipcode||'').startsWith(postcode)).map(x=>({reference:x.id,postcode:x.data.deliv_address_zipcode,city:x.data.deliv_address_city,productionType:x.data.production_type}));return send(res,200,{operators:found});}
    if(req.method==='GET'&&path==='/api/operator/lookup'){const postcode=new URL(req.url,'http://localhost').searchParams.get('postcode');const found=operatorMatches(postcode);return send(res,200,{count:found.length,operator:found.length===1?found[0]:null,operators:found});}
    if(req.method==='POST'&&path==='/api/operator/register'){const d=await body(req);const postcodes=[...new Set((Array.isArray(d.postcodes)?d.postcodes:String(d.postcodes||'').split(/[,\s]+/)).map(x=>String(x).replace(/\D/g,'')).filter(x=>/^\d{5}$/.test(x)))];if(!String(d.name||'').trim()||!String(d.email||'').includes('@')||postcodes.length===0||String(d.password||'').length<8)return send(res,400,{error:'Name, E-Mail, mindestens eine fünfstellige PLZ und ein Passwort mit 8 Zeichen sind erforderlich.'});if(operators.some(x=>x.email.toLowerCase()===String(d.email).toLowerCase()))return send(res,409,{error:'Für diese E-Mail-Adresse existiert bereits ein Betreiberkonto.'});const operator={id:`operator-${randomBytes(8).toString('hex')}`,name:String(d.name).trim().slice(0,120),email:String(d.email).trim().toLowerCase(),postcodes,password:String(d.password),createdAt:new Date().toISOString()};operators.push(operator);await queueOperatorSave();const {password,...account}=operator;return send(res,201,{account});}
    if(req.method==='POST'&&path==='/api/operator/login'){const d=await body(req),operator=operators.find(x=>x.email===String(d.email||'').trim().toLowerCase()&&x.password===String(d.password||''));if(!operator)return send(res,401,{error:'Betreiber-E-Mail oder Passwort ist falsch.'});const {password,...account}=operator;return send(res,200,{account});}
    if(req.method==='POST'&&path==='/api/community/register'){const d=await body(req);if(!validId(d.communityId)||!validId(d.registrationId)||typeof d.producer?.email!=='string')return send(res,400,{error:'Ungültige Community-Zuordnung.'});const matches=operatorMatches(d.postcode);if(matches.length!==1)return send(res,409,{error:matches.length?'Für diese PLZ sind mehrere Betreiber zuständig.':'Für diese PLZ wurde noch kein Betreiber registriert.',operators:matches});registrations.push({id:d.registrationId,createdAt:new Date().toISOString(),status:'community-assignment-pending',communityId:d.communityId,operatorId:matches[0].id,producer:{email:d.producer.email,name:String(d.producer.name||'').slice(0,200)}});await queueRegistrationSave();return send(res,201,{mode:'pending',transmitted:false,operator:matches[0],message:`Betreiber ${matches[0].name} wurde anhand der Anlagen-PLZ automatisch zugeordnet.`,reference:'community-'+d.registrationId});}
  if(req.method==='POST'&&path==='/api/reviewer/login'){const d=await body(req);if(String(d.username||'').toLowerCase()!==String(process.env.REVIEWER_USERNAME||'').toLowerCase()||!reviewerPasswordOk(d.password))return send(res,401,{error:'Benutzername oder Passwort ist falsch.'});return send(res,200,{account:{id:'B-FRA-01-reviewer',email:'reviewer@adesso-community.invalid',name:'Google Play Prüfkonto',role:'producer',community:'B-FRA-01',melo:null,reviewer:true}});}
  if(req.method==='POST'&&path==='/api/deletion-request'){const d=await body(req);const identifier=String(d.identifier||'').trim(),reason=String(d.reason||'').trim();if(!d.confirm||identifier.length<3||identifier.length>254||reason.length>1000)return send(res,400,{error:'Bitte Identifikation und Bestätigung korrekt angeben.'});const reference=`DEL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;deletions.push({reference,identifier,reason,requestedAt:new Date().toISOString(),status:'open'});await queueDeletionSave();return send(res,201,{reference});}
  if(req.method==='GET'&&path==='/api/messages'){const query=new URL(req.url,'http://localhost').searchParams,community=query.get('community'),user=query.get('user');if(!validId(community)||!validId(user))return send(res,400,{error:'Ungültige Community-Anfrage.'});return send(res,200,publicStore(community,user));}
  if(req.method==='POST'&&path==='/api/messages/send'){const d=await body(req);if(!validId(d.communityId)||!validId(d.from?.id)||!validId(d.to?.id)||typeof d.from?.name!=='string'||typeof d.to?.name!=='string'||typeof d.text!=='string'||!d.text.trim()||d.text.length>1000)return send(res,400,{error:'Ungültige Nachricht.'});const store=parseSocial(JSON.stringify(messages.communities[d.communityId]||{threads:[]}));messages.communities[d.communityId]=upsertMessage(store,d.communityId,{id:d.from.id,name:d.from.name.slice(0,100)},{id:d.to.id,name:d.to.name.slice(0,100)},d.text);await queueSave();return send(res,201,publicStore(d.communityId,d.from.id));}
  if(req.method==='POST'&&path==='/api/messages/read'){const d=await body(req);if(!validId(d.communityId)||!validId(d.threadId)||!validId(d.userId))return send(res,400,{error:'Ungültige Anfrage.'});const store=parseSocial(JSON.stringify(messages.communities[d.communityId]||{threads:[]}));messages.communities[d.communityId]=markThreadRead(store,d.threadId,d.userId);await queueSave();return send(res,200,publicStore(d.communityId,d.userId));}
  if(req.method==='POST'&&path==='/api/admin/login'){const ip=req.socket.remoteAddress||'unknown',record=loginAttempts.get(ip)||{count:0,until:0};if(record.until>Date.now())return send(res,429,{error:'Zu viele Versuche. Bitte später erneut versuchen.'});const d=await body(req);if(d.username!==process.env.ADMIN_USERNAME||!passwordOk(d.password)){record.count++;if(record.count>=5){record.count=0;record.until=Date.now()+15*60*1000}loginAttempts.set(ip,record);return send(res,401,{error:'Benutzername oder Passwort ist falsch.'})}loginAttempts.delete(ip);const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*60*60*1000);return send(res,200,summary(),{'Set-Cookie':`adesso_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/adesso; Max-Age=28800`});}
  if(req.method==='POST'&&path==='/api/admin/logout'){sessions.delete(cookie(req,'adesso_admin'));return send(res,200,{ok:true},{'Set-Cookie':'adesso_admin=; HttpOnly; Secure; SameSite=Strict; Path=/adesso; Max-Age=0'});}
  if(req.method==='GET'&&path==='/api/admin/summary'){if(!admin(req))return send(res,401,{error:'Nicht angemeldet.'});return send(res,200,summary());}
  if(req.method==='GET'&&(files[path]||path==='/loeschen')){const [file,type]=files[path]||files['/'];const content=await readFile(fileURLToPath(new URL(file,import.meta.url)));res.writeHead(200,{'Content-Type':type,'Cache-Control':path==='/'||path==='/loeschen'?'no-store':'public, max-age=300'});return res.end(content)}
  if(req.method!=='POST'||path!=='/api/register')return send(res,404,{error:'Nicht gefunden.'});
    const registration=await body(req);if(Array.isArray(registration.plants)&&registration.plants.length>0){registration.plants=registration.plants.slice(0,50);for(const plant of registration.plants){if(!['solar','wind','gas','water','battery'].includes(plant.production_type)||!Number.isFinite(Number(plant.capacity_kw))||Number(plant.capacity_kw)<=0)return send(res,400,{error:'Jede Anlage benötigt eine gültige Anlagenart und Leistung.'});if(plant.geometry&&!Array.isArray(plant.geometry.coordinates))return send(res,400,{error:'Ungültige Anlagengeometrie.'});}}const errors=[...validate(registration),...(registration.customer_type==='consumer'?[]:validateBank(registration||{}))];if(errors.length)return send(res,400,{error:errors.join(' ')});
  const id=req.headers['idempotency-key'];if(!/^[a-f0-9-]{36}$/.test(id||''))return send(res,400,{error:'Ungültige Anfragekennung.'});
   const postcode=registration.deliv_address_zipcode,matchedOperators=registration.join_community?operatorMatches(postcode):[];if(registration.join_community&&matchedOperators.length>1)return send(res,409,{error:'Für diese PLZ sind mehrere Betreiber zuständig. Bitte wenden Sie sich an den Adesso-Support.',operators:matchedOperators});registration.operatorId=matchedOperators.length===1?matchedOperators[0].id:null;
   if(!ready||registration.customer_type==='consumer'){registrations.push({id,createdAt:new Date().toISOString(),status:'adesso-pending',communityId:registration.join_community?registration.communityId:null,operatorId:registration.operatorId,data:{...registration,iban:undefined,bic:undefined,account_holder:undefined,bank_name:undefined}});await queueRegistrationSave();return send(res,201,{mode:'pending',transmitted:false,operator:matchedOperators[0]||null,message:registration.customer_type==='consumer'?'Ihre Verbraucheranmeldung wurde sicher im Adesso-System gespeichert.':'Ihre Registrierung wurde im Adesso-System gespeichert. Die externe Schnittstelle ist derzeit noch nicht verbunden.',reference:'onboarding-'+id});}
  if(attempts.has(id)){const prev=attempts.get(id);return send(res,prev.status,prev.data)}if(attempts.size>=1000)return send(res,503,{error:'Lokales Sitzungslimit erreicht.'});attempts.set(id,{status:409,data:{error:'Diese Registrierung wird bearbeitet oder muss geprüft werden. Bitte nicht erneut anlegen.'}});
  const outcome=await registerProducer(registration,id);return send(res,outcome.status,outcome.data);
 }catch(e){return send(res,e.status||500,{error:e.message==='SIZE'?'Anfrage zu groß.':e.message==='JSON'?'Ungültiges JSON.':'Die Anfrage konnte nicht verarbeitet werden.'})}
});
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Adesso App: http://${process.env.HOST||'127.0.0.1'}:${port}`));
