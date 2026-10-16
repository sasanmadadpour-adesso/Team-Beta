export function assistantReply(question,context={},history=[]){
 const text=String(question||'').trim().toLowerCase();
 const polite=/danke|merci|super|top|perfekt|gut/.test(text)&&!/wie|was|wieviel|wie viel/.test(text);
 if(!text)return {text:'Bitte stellen Sie eine Frage zur Energie-Community.'};
 if(/wetter|prognose|sonne|sonneneinstrahlung/.test(text)||(/morgen|woche|sieben tage|7 tage/.test(text)&&/(solar|pv|strom|produz|erzeug)/.test(text)))return {text:'Ich lade die aktuelle 7-Tage-Wetter- und PV-Prognose von Open-Meteo.',weather:true};
 if(/verbrauch|verbraucht/.test(text))return {text:context.ownConsumption==null?'Für diesen Account liegen keine individuellen Verbrauchswerte vor. Ich erfinde deshalb keinen Wert.':'Ihr im vorhandenen Tagesdatensatz erfasster Verbrauch beträgt '+context.ownConsumption.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kWh.'};
 if(/autark/.test(text))return {text:'Die Energieautarkie der Community beträgt im vorhandenen Tagesdatensatz '+context.autarky+' %. Das ist ein Messwert aus dem bereitgestellten Datensatz, keine Wetterprognose.'};
 if(/preis|tarif|kosten/.test(text))return {text:'Der aktuell in der App verwendete Community-Demopreis beträgt '+(context.communityPrice||0).toLocaleString('de-DE')+' ct/kWh. Weitere Preisdetails finden Sie unter „Preise“; Demoannahmen sind dort gekennzeichnet.'};
 if(/einspeis|erzeug/.test(text))return {text:'Die Community hat im vorhandenen Tagesdatensatz '+(context.generated||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kWh erzeugt und '+(context.exported||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kWh eingespeist.'};
 if(/wer bist du|was bist du|dein name|assistent|biene/.test(text))return {text:'Ich bin der adesso Energie-Assistent – die kleine Biene Ihrer Energie-Community. Ich helfe bei Fragen zu Autarkie, Verbrauch, Preisen und zur PV-Wetterprognose.'};
 if(/kannst du etwas|was kannst du|hilfe|was machst du/.test(text))return {text:'Gerne! Ich beantworte Fragen zu Ihrer Community, z. B.: „Wie hoch ist unsere Autarkie?“, „Was kostet der Strom?“ oder „Wie wird das Wetter?“. Außerdem kann ich die 7-Tage-PV-Prognose anzeigen.'};
 if(/ja|klar|gern|gerne|ok|okay|stimmt|aha|interessant|verstanden/.test(text))return {text:'Sehr gerne! Wenn ich noch etwas für Sie tun kann, stellen Sie mir einfach eine Frage zur Community, zum Verbrauch oder zum Wetter.'};
 if(polite)return {text:'Sehr gerne! Das freut mich. Falls Sie noch etwas wissen möchten, zur Community, zum Wetter oder zu Ihrer Energie, fragen Sie einfach.'};
 if(/womit|wobei|da kann ich nicht|das ist nicht|nein dank|später|nicht jetzt/.test(text))return {text:'Kein Problem. Ich bin jederzeit da – öffnen Sie mich einfach wieder, wenn Sie Fragen zu Ihrer Energie-Community oder zur PV-Prognose haben.'};
 if(/wie( geht| läuft)|alles gut|guten tag|guten morgen|guten abend/.test(text))return {text:'Bei mir summt alles bestens! Wie kann ich Ihnen helfen – Autarkie, Preise, Verbrauch oder die 7-Tage-PV-Prognose?'};
 return {text:'Das kann ich mit den vorhandenen Demo-Daten leider nicht beantworten. Ich helfe dafür zu Autarkie, Verbrauch, Preisen und zur PV-Wetterprognose. Möchten Sie zum Beispiel die aktuelle 7-Tage-Prognose für 31855 Aerzen sehen?'};
}
