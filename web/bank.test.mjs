import test from 'node:test';
import assert from 'node:assert/strict';
import {validIban,normalizeIban,validateBank} from './bank.mjs';
const bank={account_holder:'Test Person',bank_name:'Testbank',iban:'DE89370400440532013000',bic:'COBADEFFXXX',bank_confirmed:true,payment_method:'payout',sepa_interest:false};
test('IBAN checksum and German length',()=>{assert.equal(validIban('DE89 3704 0044 0532 0130 00'),true);assert.equal(validIban('DE89370400440532013001'),false);assert.equal(validIban('DE001'),false);assert.equal(normalizeIban('de89 3704'),'DE893704');});
test('Bank confirmation and optional BIC',()=>{assert.deepEqual(validateBank(bank),[]);assert.deepEqual(validateBank({...bank,bic:''}),[]);assert.ok(validateBank({...bank,bank_confirmed:false}).length);assert.ok(validateBank({...bank,bic:'x'}).length);});
test('SEPA intent required only for chosen SEPA option',()=>{assert.ok(validateBank({...bank,payment_method:'sepa_requested'}).length);assert.deepEqual(validateBank({...bank,payment_method:'sepa_requested',sepa_interest:true}),[]);});
