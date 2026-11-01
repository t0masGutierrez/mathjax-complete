import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findCommand} from '../src/context.ts';
import {discoverCommands, filterCommands, type MathRuntime} from '../src/catalog.ts';
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {SerializedMmlVisitor} from 'mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js';

for (const [name, text, query] of [
  ['inline', '$\\alp$', 'alp'], ['block', '$$\nx+\\fr\n$$','fr'],
  ['empty list', '$\\$', ''], ['unfinished math', '$$\n\\',''],
  ['after escaped dollar', '\\$ price $\\alp$', 'alp'],
  ['after code span', '`$no$` $\\alp$', 'alp'],
] as const) test(`finds commands: ${name}`, () => {
  const cursor = text.indexOf('\\', text.startsWith('\\$') ? 2 : text.startsWith('`') ? 6 : 0) + query.length + 1;
  assert.equal(findCommand(text,cursor)?.query,query);
});
for(const [name,text] of [
  ['plain text','text \\alp'], ['escaped dollar','\\$\\alp'],
  ['code span','`$\\alp`'], ['code fence','```tex\n$\\alp'],
  ['tilde fence','~~~\n$$\\alp'], ['line break command','$x \\\\'],
  ['closed math','$x$ \\alp'], ['math comment','$x % \\alp'],
  ['front matter','---\nvalue: $\\alp'], ['HTML comment','<!-- $\\alp'],
] as const) test(`does not suggest: ${name}`,()=>assert.equal(findCommand(text,text.length),null));
test('replaces a command suffix when editing',()=>assert.deepEqual(findCommand('$\\alpha$',4),{from:1,to:7,query:'al'}));
test('finds math after a closed code fence',()=>assert.equal(findCommand('```\n$bad\n```\n$\\alp',18)?.query,'alp'));

RegisterHTMLHandler(liteAdaptor());
const tex = new TeX({packages:AllPackages.filter(p=>!['autoload','require','configmacros','bussproofs'].includes(p))});
const doc=mathjax.document('',{InputJax:tex});
const visitor=new SerializedMmlVisitor();
const runtime={startup:{document:{inputJax:[tex]}},tex2mml:(source:string)=>visitor.visitTree(doc.convert(source))};
test('discovers commands from the actual MathJax maps and validates samples',()=>{
 const entries=discoverCommands(runtime as unknown as MathRuntime);
 assert.ok(entries.length>500,`got ${entries.length}`);
 for(const name of ['alpha','Gamma','sum','frac','sqrt','mathbb','sin','langle','ce','bra','set',',','{','big','Bigl','bigr','bigg','biggr','right','middle','limits','nolimits']) assert.ok(entries.some(e=>e.name===name),name);
 for(const name of ['documentclass','usepackage','newcommand','def','require','href','displaylimits','notACommand']) assert.ok(!entries.some(e=>e.name===name),name);
 for(const entry of entries) assert.doesNotMatch(runtime.tex2mml(entry.preview),/<merror|data-mjx-error/,entry.name);
 const frac=entries.find(e=>e.name==='frac')!;
 assert.equal(frac.insert,'\\frac{}{}'); assert.equal(frac.cursor,6);
 assert.equal(entries.find(e=>e.name==='alpha')?.insert,'\\alpha');
 assert.deepEqual(filterCommands(entries,'alp').map(e=>e.name),['alpha']);
 assert.equal(filterCommands(entries,'').length,entries.length);
});
test('fails closed when a MathJax version has no readable command map',()=>assert.deepEqual(discoverCommands({}),[]));

test('environment entries include required alignment inputs',()=>{
 const entries=discoverCommands(runtime as unknown as MathRuntime);
 assert.ok(entries.find(e=>e.name==='begin{subarray}')?.insert.startsWith('\\begin{subarray}{c}'));
 assert.ok(entries.find(e=>e.name==='begin{alignedat}')?.insert.startsWith('\\begin{alignedat}{2}'));
});

test('does not suggest inside code fences in quotes or lists',()=>{
 for(const text of ['> ```tex\n> $\\alp','- ```tex\n  $\\alp','> - ~~~\n>   $\\alp']) assert.equal(findCommand(text,text.length),null,text);
 const text='> ```\n> $bad\n> ```\n$\\alp';
 assert.equal(findCommand(text,text.length)?.query,'alp');
});

test('does not execute built-in names replaced by user definitions',()=>{
 const input=new TeX({packages:['base','ams','newcommand']});
 const document=mathjax.document('',{InputJax:input});
 const sources:string[]=[];
 const convert=(source:string)=>visitor.visitTree(document.convert(source));
 convert('\\renewcommand{\\alpha}{z}');
 const actual={startup:{document:{inputJax:[input]}},tex2mml:(source:string)=>{sources.push(source);return convert(source);}};
 const entries=discoverCommands(actual as unknown as MathRuntime);
 assert.ok(!entries.some(e=>e.name==='alpha'));
 assert.ok(!sources.some(source=>/\\alpha\b/.test(source)));
});
