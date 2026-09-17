import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { catalog, scenarios, qualityCases } from '../src/engine.mjs';
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
