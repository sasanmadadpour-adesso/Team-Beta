export function assistantReply(question,context){
 const text=String(question||'').trim().toLowerCase();
 if(!text)return {text:'Bitte stellen Sie eine Frage zur Energie-Community.'};
 if(/wetter|prognose|sonne|sonneneinstrahlung/.test(text)||(/morgen|woche|sieben tage|7 tage/.test(text)&&/(solar|pv|strom|produz|erzeug)/.test(text)))return {text:'Ich lade die aktuelle 7-Tage-Wetter- und PV-Prognose von Open-Meteo.',weather:true};
 if(/verbrauch|verbraucht/.test(text))return {text:context.ownConsumption==null?'Für diesen Account liegen keine individuellen Verbrauchswerte vor. Ich erfinde deshalb keinen Wert.':`Ihr im vorhandenen Tagesdatensatz erfasster Verbrauch beträgt ${context.ownConsumption.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} kWh.`};
 if(/autark/.test(text))return {text:`Die Energieautarkie der Community beträgt im vorhandenen Tagesdatensatz ${context.autarky} %. Das ist ein Messwert aus dem bereitgestellten Datensatz, keine Wetterprognose.`};
 if(/preis|tarif|kosten/.test(text))return {text:`Der aktuell in der App verwendete Community-Demopreis beträgt ${context.communityPrice.toLocaleString('de-DE')} ct/kWh. Weitere Preisdetails finden Sie unter „Preise“; Demoannahmen sind dort gekennzeichnet.`};
 if(/einspeis|erzeug/.test(text))return {text:`Die Community hat im vorhandenen Tagesdatensatz ${context.generated.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} kWh erzeugt und ${context.exported.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} kWh eingespeist.`};
 if(/hallo|hi|hey|hilfe|kannst du/.test(text))return {text:'Hallo! Ich beantworte Fragen zur Energie-Community, etwa zu Autarkie, Verbrauch, Preisen sowie zur aktuellen Wetter- und PV-Prognose.'};
 return {text:'Dabei kann ich leider nicht helfen. Ich beantworte nur Fragen zu adesso und zur Energie-Community-App, zum Beispiel zu Autarkie, Verbrauch, Preisen oder der PV-Wetterprognose.'};
}
