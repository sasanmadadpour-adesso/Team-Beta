export const aerzen={latitude:52.04961,longitude:9.26382,label:'31855 Aerzen'};
export const pvPlants=[{name:'PV-Anlage 1',capacityKwp:8},{name:'PV-Anlage 2',capacityKwp:12}];
export const performanceFactor=.8;

const condition=code=>code===0?['Sonnig','☀']:code<=2?['Leicht bewölkt','◒']:code===3?['Bewölkt','☁']:code<=48?['Nebel','≋']:code<=67?['Regen','///']:code<=77?['Schnee','✳']:code<=82?['Regenschauer','☂']:['Gewitter','ϟ'];
const round=value=>Number(Number(value||0).toFixed(1));

export function transformWeather(data,location){
 const daily=data?.daily;if(!daily?.time?.length)throw Object.assign(Error('WEATHER_DATA'),{status:502});
 const days=daily.time.map((date,index)=>{
  const irradiation=round(Number(daily.shortwave_radiation_sum?.[index]||0)/3.6),[weather,icon]=condition(Number(daily.weather_code?.[index]||0));
  const plants=pvPlants.map(plant=>({...plant,generationKwh:round(plant.capacityKwp*irradiation*performanceFactor)}));
  return {date,temperature:round(daily.temperature_2m_max?.[index]),condition:weather,icon,irradiation,windMax:round(daily.wind_speed_10m_max?.[index]),plants,generationKwh:round(plants.reduce((sum,plant)=>sum+plant.generationKwh,0))};
 });
 return {location,days,totalKwh:round(days.reduce((sum,day)=>sum+day.generationKwh,0)),plants:pvPlants,performanceFactor,source:'Open-Meteo',updatedAt:new Date().toISOString(),notice:'Wetterbasierte Schätzung, keine garantierte Erzeugung. Die Anlagenleistungen 8 und 12 kWp sind Demo-Annahmen.'};
}

export async function getWeather(latitude,longitude,fetcher=fetch,label='Aktueller Standort'){
 const lat=Number(latitude),lon=Number(longitude);if(!Number.isFinite(lat)||lat< -90||lat>90||!Number.isFinite(lon)||lon< -180||lon>180)throw Object.assign(Error('LOCATION'),{status:400});
 const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),hourly:'temperature_2m,wind_speed_10m,wind_direction_10m,shortwave_radiation,cloud_cover',daily:'temperature_2m_max,weather_code,wind_speed_10m_max,shortwave_radiation_sum',timezone:'Europe/Berlin',forecast_days:'7'});
 const response=await fetcher(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Object.assign(Error('WEATHER_API'),{status:502});
 return transformWeather(await response.json(),label);
}
