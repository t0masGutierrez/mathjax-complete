import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverCommands, type MathRuntime} from '../src/catalog.ts';
import {mathjax} from '@mathjax/src/js/mathjax.js';
import {TeX} from '@mathjax/src/js/input/tex.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/mathtools/MathtoolsConfiguration.js';
import '@mathjax/src/js/input/tex/textmacros/TextMacrosConfiguration.js';
import {liteAdaptor} from '@mathjax/src/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from '@mathjax/src/js/handlers/html.js';
import {SerializedMmlVisitor} from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js';

RegisterHTMLHandler(liteAdaptor());
const input=new TeX({packages:['base','ams','mathtools','textmacros']});
const document=mathjax.document('',{InputJax:input});
const visitor=new SerializedMmlVisitor();
const convert=(source:string)=>visitor.visitTree(document.convert(source));
const runtime={startup:{document:{inputJax:[input]}},tex2mml:convert};
const entries=discoverCommands(runtime as unknown as MathRuntime);
const entry=(name:string)=>{const found=entries.find(e=>e.name===name);assert.ok(found,`${name} remains available`);return found;};
const visibleText=(xml:string)=>[...xml.matchAll(/<(?:mi|mo|mn|mtext)\b[^>]*>([^<]*)<\//g)].map(m=>m[1]).join('');

test('equation references with unresolved labels are not offered',()=>{
 for(const name of ['ref','eqref','refeq']) assert.ok(!entries.some(e=>e.name===name),name);
 for(const value of entries) assert.doesNotMatch(convert(value.preview),/<mtext[^>]*>\?\?\?<\/mtext>/,value.name);
});
test('invisible and layout-only effects have an explanation',()=>{
 for(const name of ['phantom','hphantom','vphantom','strut','mathstrut','smash','mathclap','mathord','mathrel','mathbin']) {
  const value=entry(name);assert.ok(value.previewLabel?.length,`${name} needs an effect label`);
 }
 assert.equal(entry('phantom').insert,'\\phantom{}');
});
test('font samples contain capital letters that show script variants',()=>{
 for(const name of ['mathbfcal','mathcal','mathbfscr','mathscr','mathbf','mathrm','mathfrak','mathtt']) {
  const value=entry(name);assert.match(visibleText(convert(value.preview)),/[A-Z]/,name);
  assert.equal(value.insert,'\\'+name+'{}');
 }
});
test('font size declarations include visible sample content',()=>{
 for(const name of ['Tiny','tiny','scriptsize','SMALL','Small','footnotesize','small','normalsize','large','Large','LARGE','huge','Huge','HUGE']) {
  const value=entry(name);assert.match(visibleText(convert(value.preview)),/[A-Za-z0-9]/,name);
  assert.equal(value.insert,'\\'+name);
 }
});
test('math styles use a fraction so their effect can be seen',()=>{
 for(const name of ['displaystyle','textstyle','scriptstyle','scriptscriptstyle']) assert.match(convert(entry(name).preview),/<mfrac\b/,name);
});
test('spacing and position samples have surrounding visible content',()=>{
 for(const name of ['hspace','kern','mkern','mskip','raise','lower']) assert.match(visibleText(convert(entry(name).preview)),/a.*b/,name);
});
test('every sample has a visible result or an effect label',()=>{
 for(const value of entries){
  const xml=convert(value.preview);assert.doesNotMatch(xml,/<merror\b|data-mjx-error=/,value.name);
  const hasText=visibleText(xml.replace(/<mphantom\b[\s\S]*?<\/mphantom>/g,'' )).replace(/&#x(?:A0|200[BCDF]|206[0-4]);/gi,'').trim();
  assert.ok(hasText||value.previewLabel,`${value.name} needs a visible sample or label`);
 }
});
