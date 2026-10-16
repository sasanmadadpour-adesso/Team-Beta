import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantReply} from './src/assistant-demo.mjs';
import {transformWeather} from './weather.mjs';

test('Open-Meteo data uses two plants and transparent daily total',()=>{const data=transformWeather({daily:{time:['2026-10-16'],shortwave_radiation_sum:[14.76],weather_code:[0],temperature_2m_max:[16],wind_speed_10m_max:[20]}},'Aerzen'),day=data.days[0];assert.equal(day.plants.length,2);assert.equal(day.generationKwh,65.6);assert.equal(day.plants.reduce((sum,plant)=>sum+plant.generationKwh,0),day.generationKwh)});
test('assistant never invents missing personal consumption',()=>{const reply=assistantReply('Wie viel Strom habe ich heute verbraucht?',{ownConsumption:null,autarky:0,communityPrice:26,generated:0,exported:0});assert.match(reply.text,/keine individuellen Verbrauchswerte/i)});
test('weather question requests live forecast card',()=>{const reply=assistantReply('Wie wird das Wetter in den nächsten sieben Tagen?',{});assert.equal(reply.weather,true);assert.match(reply.text,/Open-Meteo/i)});
