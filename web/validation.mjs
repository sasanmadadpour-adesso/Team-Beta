export const interfaces=['Ampere.cloud','be4energy','ecodata SmartDog','Energielenker','IntegraSun','Lumenaza Modbus',"Meteocontrol Blue’Log","Meteocontrol WEB’log",'Modocorrente','PlexLog','Quantec','SMA','Smartblue','Solandeo','SolarLog','SolarMax','Vestas'];
export function earliestStart(now=new Date()) {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit'}).formatToParts(now);const y=Number(parts.find(p=>p.type==='year').value),m=Number(parts.find(p=>p.type==='month').value);return new Date(Date.UTC(y,m+1,1)).toISOString().slice(0,10);}
export function validate(d,now=new Date()) {
 const errors=[];
  if(!d || typeof d!=='object')return ['Ungültige Angaben.'];
  const customerType=d.customer_type||'producer';
  if(!['producer','consumer'].includes(customerType))errors.push('Bitte wählen Sie Anlage oder Verbraucher.');
  if(d.join_community!==undefined&&typeof d.join_community!=='boolean')errors.push('Bitte entscheiden Sie, ob Sie einer Community beitreten möchten.');
  if(d.join_community===true&&(!d.communityId||typeof d.communityId!=='string'))errors.push('Bitte eine Community auswählen.');
 for(const k of ['first_name','last_name','email','deliv_address_street','deliv_address_house_number','deliv_address_city'])if(typeof d[k]!=='string'||!d[k].trim()||d[k].length>254)errors.push('Bitte alle Kontakt- und Adressfelder korrekt ausfüllen.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email||''))errors.push('Bitte eine gültige E-Mail-Adresse eingeben.');
 if(!/^\d{5}$/.test(d.deliv_address_zipcode||''))errors.push('Die Postleitzahl muss fünf Ziffern enthalten.');
 if(!['Frau','Herr','Eheleute','Divers'].includes(d.salutation))errors.push('Bitte eine Anrede wählen.');
   const producer=customerType!=='consumer';
  if(producer&&!['solar','wind','gas','water','battery'].includes(d.production_type))errors.push('Ungültige Anlagenart.');
  if(producer&&!['existing','planned'].includes(d.plant_state))errors.push('Bitte den Anlagenstatus wählen.');
  if(producer&&!['E01','E02','E03'].includes(d.subscription_reason))errors.push('Bitte den Registrierungsgrund wählen.');
 if(typeof d.is_business!=='boolean'||typeof d.is_reverse_charge!=='boolean')errors.push('Ungültige Kundeneinstellungen.');
 if(d.is_business===false&&d.is_reverse_charge===true)errors.push('Reverse Charge ist nur für Geschäftskunden auswählbar.');
  if(producer&&(!Number.isFinite(d.capacity_kw)||d.capacity_kw<=0||!Number.isSafeInteger(Math.round(d.capacity_kw*1000))))errors.push('Bitte eine gültige Anlagenleistung eingeben.');
  if(producer&&(!Number.isFinite(d.subsidy)||d.subsidy<0))errors.push('Bitte einen gültigen anzulegenden Wert eingeben.');
  if(producer&&!interfaces.includes(d.dv_interface))errors.push('Bitte eine DV-Schnittstelle wählen.');
  if((d.latitude!==''&&d.latitude!=null)|| (d.longitude!==''&&d.longitude!=null))for(const [key,max] of [['latitude',90],['longitude',180]])if(!Number.isFinite(d[key])||Math.abs(d[key])>max)errors.push('Bitte einen gültigen Kartenstandort wählen.');
  if(d.identifier!=null&&String(d.identifier).trim()&&String(d.identifier).length>100)errors.push('Die optionale Anlagenkennung ist zu lang.');
  if(d.identifier_type==='market_location_identifier'&&d.identifier&& !/^\d{11}$/.test(d.identifier))errors.push('Die MaLo-ID muss elf Ziffern enthalten.');
  if(producer&&(!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(d.preferred_delivery_start||'')||d.preferred_delivery_start<earliestStart(now)))errors.push('Der Start muss der erste Tag eines Monats sein, frühestens im übernächsten Monat.');
 if(d.consent!==true)errors.push('Bitte die Übertragung ausdrücklich bestätigen.');
 return [...new Set(errors)];
}
export function payload(d,id,product) {const out={};for(const k of ['first_name','last_name','email','salutation','is_business','is_reverse_charge','deliv_address_street','deliv_address_house_number','deliv_address_zipcode','deliv_address_city','subscription_reason','production_type','preferred_delivery_start'])out[k]=typeof d[k]==='string'?d[k].trim():d[k];out.plant_specifics={capacity:Math.round(d.capacity_kw*1000)};if(Number.isFinite(d.latitude)&&Number.isFinite(d.longitude)){out.plant_specifics.latitude=d.latitude;out.plant_specifics.longitude=d.longitude;}if(Array.isArray(d.plant_area)&&d.plant_area.length>=3)out.plant_specifics.area=d.plant_area.slice(0,50);if(d.identifier_type&&String(d.identifier||'').trim())out[d.identifier_type]=d.identifier.trim();out.saas_customer_id='web-'+id.replaceAll('-','').slice(0,28);out.saas_contract_id='onboarding-'+id;if(product)out.product_name=product;return out;}
