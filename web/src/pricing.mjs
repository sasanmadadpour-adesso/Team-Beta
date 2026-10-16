export const priceCatalog={
 referenceFeed:{id:'reference-feed',label:'EEG-Einspeisevergütung – Vergleichswert',work:5,fixed:null,basis:'net',status:'demo',valid:'Demoannahme',retrieved:null,source:null},
 national:{id:'national-reference',label:'Bundesweiter Bezugspreis',work:30,fixed:null,basis:'gross',status:'demo',valid:'Demoannahme',retrieved:'2026-10-15',source:null},
 community:{id:'mk7-community',label:'Community-Tarif',work:26,fixed:0,basis:'gross',feedGross:8,marketingFee:0,feedNet:8,status:'demo',valid:'Demoannahme',retrieved:null,source:null},
 dortmund:{id:'dew21-standard',community:'Dortmund',provider:'DEW21',tariff:'Unser Strom.standard',work:36.399,fixed:13.90,basis:'gross',status:'verified',valid:'2026-04-01',retrieved:'2026-10-15',source:'https://www.dew21.de/fileadmin/Dokumente/Strom/Privatkunden/strom-grundversorgung-in-Dortmund-ab-01042026.pdf',components:{netWork:null,tax:null,note:'Für den Preisstand 01.04.2026 liegt in der eingebundenen Quelle keine vollständig summengleiche Komponentenaufschlüsselung vor.'}},
 aerzen:{id:'eon-aerzen',community:'Grupenhagen / Aerzen',provider:'E.ON Energie Deutschland GmbH',tariff:'Grundversorgung Strom',work:34.01,fixed:null,basis:'gross',status:'verified-provider-price-context',valid:'2026-07-01',retrieved:'2026-10-15',source:'https://occ.eon.de/pdf/1.0/api/download?filename=INS00_E767852.pdf&type=preiszusammensetzung',components:{netWork:28.58,tax:5.43,note:'Grundpreis ist netzgebiets- und messstellenabhängig und deshalb für Aerzen hier nicht als bestätigt angesetzt.'}},
 sourceProvider:'https://www.stwhw-netze.de/marktpartner/veroeffentlichungspflichten'
};

export const comparisonDefaults={
 'B-FRA-01':{regionalBuy:30,communityBuy:26,eegReference:5,communityFeed:8,unit:'ct/kWh',status:'Demoannahmen',priceDate:'nicht verifiziert',source:null},
 'B-CGN-01':{regionalBuy:30,communityBuy:26,eegReference:5,communityFeed:8,unit:'ct/kWh',status:'Demoannahmen',priceDate:'nicht verifiziert',source:null},
 'B-MUL-01':{regionalBuy:30,communityBuy:26,eegReference:5,communityFeed:8,unit:'ct/kWh',status:'Demoannahmen',priceDate:'nicht verifiziert',source:null},
 dortmund:{regionalBuy:30,communityBuy:26,eegReference:5,communityFeed:8,unit:'ct/kWh',status:'Demoannahmen',priceDate:'nicht verifiziert',source:null},
 grupenhagen:{regionalBuy:30,communityBuy:26,eegReference:5,communityFeed:8,unit:'ct/kWh',status:'Demoannahmen',priceDate:'nicht verifiziert',source:null}
};
export function comparisonFor(id){return {...(comparisonDefaults[id]||comparisonDefaults.dortmund)}}
export function validPrice(value){return Number.isFinite(Number(value))&&Number(value)>=0}
export function yearlyWork(kwh,ctPerKwh){return validPrice(kwh)&&validPrice(ctPerKwh)?Number(kwh)*Number(ctPerKwh)/100:null}
export function comparisonResults(consumption,feed,prices){const regional=yearlyWork(consumption,prices.regionalBuy),community=yearlyWork(consumption,prices.communityBuy),referenceFeed=yearlyWork(feed,prices.eegReference),communityFeed=yearlyWork(feed,prices.communityFeed);return{regional,community,buyDifference:regional===null||community===null?null:regional-community,referenceFeed,communityFeed,feedDifference:referenceFeed===null||communityFeed===null?null:communityFeed-referenceFeed}}

export function annualCost(kwh,price){if(!Number.isFinite(kwh)||kwh<0||!price||!Number.isFinite(price.work))return null;if(!Number.isFinite(price.fixed))return null;return kwh*price.work/100+12*price.fixed}
export function workOnlyCost(kwh,price){return Number.isFinite(kwh)&&kwh>=0&&Number.isFinite(price?.work)?kwh*price.work/100:null}
export function consumptionSaving(kwh,comparison,community=priceCatalog.community){const a=annualCost(kwh,comparison),b=annualCost(kwh,community);return a===null||b===null?null:a-b}
export function feedBenefit(kwh,reference=priceCatalog.referenceFeed,community=priceCatalog.community,extraFixed=0){if(!Number.isFinite(kwh)||kwh<0||!Number.isFinite(extraFixed)||!Number.isFinite(reference?.work)||!Number.isFinite(community?.feedNet))return null;return kwh*(community.feedNet-reference.work)/100-extraFixed}
export function workOnlySaving(kwh,comparison,community=priceCatalog.community){const a=workOnlyCost(kwh,comparison),b=workOnlyCost(kwh,community);return a===null||b===null?null:a-b}
export const money=n=>n==null?'offen':`${n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})} €`;
