import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { catalog, scenarios, qualityCases } from '../src/engine.mjs';
import { renderCalibration } from './render-calibration.mjs';
const root=new URL('../',import.meta.url);
async function walk(url) { const out=[]; for(const d of await readdir(url,{withFileTypes:true})) { if(['.git','node_modules'].includes(d.name)) continue; const p=new URL(d.name+(d.isDirectory()?'/':''),url); if(d.isDirectory()) out.push(...await walk(p)); else if(d.name.endsWith('.md')) out.push(p); } return out; }
for(const file of await walk(root)) {
  const text=await readFile(file,'utf8');
  for(const [,link] of text.matchAll(/\]\(([^)]+)\)/g)) if(!/^(https?:|#)/.test(link)) await readFile(resolve(dirname(file.pathname),decodeURIComponent(link.split('#')[0])));
}
assert.equal(catalog.length,30); assert.equal(new Set(catalog.map(c=>c.id)).size,30);
for(const type of ['everyday','challenge']) assert.equal(catalog.filter(c=>c.category===type).length,15);
for (const c of catalog.filter(c=>c.category==='challenge'&&c.decision!=='drop')) assert.match(c.text,/^(假设|如果)/,c.id+' needs a standalone hypothetical premise');
assert.equal(scenarios.length,10); assert.equal(qualityCases.length,12);
assert.equal(new Set([...scenarios,...qualityCases].map(c=>c.id)).size,22);
const original=await readFile(new URL('docs/QUESTIONS.md',root),'utf8');
const calibration=await readFile(new URL('docs/CALIBRATION.md',root),'utf8');
for(const c of catalog) { assert.ok(original.includes(c.original),c.id+' original drift'); assert.ok(calibration.includes(c.reason),c.id+' reason drift'); if(c.decision!=='drop') assert.ok(calibration.includes(c.text),c.id+' text drift'); }
console.log('PASS: Markdown relative links; 30 original IDs; 15+15 categories; calibration consistency; 12 quality cases and 10 dialogues.');

const html=await readFile(new URL('public/index.html',root),'utf8');
for (const [closing] of html.matchAll(/<\/[^>]*>/g)) assert.match(closing,/^<\/[A-Za-z][\w:-]*\s*>$/,'HTML closing tags must not contain attributes');

assert.equal(calibration,renderCalibration(catalog),'Regenerate docs/CALIBRATION.md from JSON');
for (const c of catalog) {
  assert.ok(['none','copyedit','task-redesign'].includes(c.editKind),c.id+' edit kind');
  for (const key of ['originalFocus','focus','editNote']) assert.ok(typeof c[key]==='string'&&c[key].trim(),c.id+' '+key);
  assert.equal(c.reviewStatus,'editorial-draft',c.id+' needs editorial review');
  if(c.editKind==='none') assert.equal(c.text,c.original,c.id+' changed text cannot be none');
  assert.ok(c.history.length>0,c.id+' missing earlier draft');
  for(const h of c.history) for(const key of ['revision','text','focus','decision','reason','reviewStatus']) assert.ok(typeof h[key]==='string'&&h[key].trim(),c.id+' history '+key);
}

const {PROMPT_VERSION,REPLY_EXAMPLE_IDS,replyExamples}=await import('../src/prompts.mjs');
const voice=await readFile(new URL('docs/VOICE.md',root),'utf8');
assert.ok(voice.includes('`'+PROMPT_VERSION+'`'),'VOICE prompt version drift');
assert.equal(new Set(REPLY_EXAMPLE_IDS).size,4);
assert.equal(replyExamples.length,4);
for(const e of replyExamples) {
  const source=scenarios.find(s=>s.id===e.id);
  assert.ok(source,'missing example source');
  assert.deepEqual(e.response,source.expected,'runtime example drift');
  assert.equal(source.reviewStatus,'editorial-draft');
}

const holdout=JSON.parse(await readFile(new URL('content/holdout.json',root),'utf8'));
assert.equal(holdout.promptVersion,PROMPT_VERSION);
assert.equal(holdout.status,'unrun-editorial-draft');
assert.equal(holdout.questions.length,10);assert.equal(holdout.dialogues.length,5);
const all=[...catalog,...scenarios,...qualityCases,...holdout.questions,...holdout.dialogues];
assert.equal(new Set(all.map(c=>c.id)).size,all.length,'duplicate content ID');
const {replying}=await import('../src/prompts.mjs');
for(const c of holdout.questions) {
  assert.ok(['accept','reject','discuss'].includes(c.expected));
  assert.ok(!replying.includes(c.text),'holdout question in runtime prompt');
  assert.ok(!qualityCases.some(q=>q.text===c.text),'development input in holdout');
}
for(const d of holdout.dialogues) {
  assert.ok(d.expectedActions.length>0&&d.expectedActions.every(a=>['explain','perspective','ask','end','boundary','stop'].includes(a)));
  assert.ok(!replying.includes(d.question),'holdout dialogue in runtime prompt');
  assert.ok(!scenarios.some(s=>s.question===d.question),'development dialogue in holdout');
}
