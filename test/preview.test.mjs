import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { previewQuestions, previewReply, applyReviews, validateCandidates, catalog, scenarios } from '../src/engine.mjs';
import { dimensions } from '../src/prompts.mjs';
import { readConfig, ModelProvider } from '../src/provider.mjs';
import { createPreviewServer } from '../src/server.mjs';

const candidates = Array.from({ length:5 }, (_, i) => ({ id:`q${i}`, text:`假设一个地方出现变化${i}，可能有哪些解释？`, category:'everyday' }));
const reviews = (accept = true) => ({ reviews:candidates.map(c => ({ id:c.id, checks:Object.fromEntries(dimensions.map(d=>[d,accept])), novel:true, reason:accept?'具体场景允许不同解释。':'前提不够清楚。' })) });
const goodConfig = readConfig({ TIWEN_LIVE_ENABLED:'true', TIWEN_API_BASE_URL:'https://example.test/v1', TIWEN_MODEL:'test-model', TIWEN_API_KEY:'private-test-value', TIWEN_MAX_CALLS:'10' });

test('offline workflow needs no provider and exposes preset rejection', async () => {
  const result = await previewQuestions({}, undefined, () => 0);
  assert.equal(result.mode,'offline'); assert.equal(result.status,'selected'); assert.equal(result.rounds[0].candidates.length,5);
  assert.equal(result.rounds[0].candidates.find(c=>c.id==='bad-example').accepted,false);
  assert.match(result.notice,/未调用模型/);
});
test('all rejected stops after two rounds without fallback', async () => {
  const r = await previewQuestions({ scenario:'all-rejected' });
  assert.equal(r.status,'skipped'); assert.equal(r.selected,null); assert.equal(r.rounds.length,2);
});
test('live pipeline calls generator and independent reviewer, twice at most', async () => {
  let calls=0;
  const p={complete:async()=> ++calls%2 ? {candidates} : reviews(false), snapshot:()=>({calls})};
  const r=await previewQuestions({mode:'live'},p);
  assert.equal(r.status,'skipped'); assert.equal(calls,4);
});
test('one failed dimension and semantic duplicate cannot enter selection', () => {
  const r=reviews(); r.reviews[0].checks.open=false; r.reviews[1].novel=false;
  const out=applyReviews(candidates,r);
  assert.equal(out[0].accepted,false); assert.equal(out[1].accepted,false); assert.equal(out[2].accepted,true);
});
test('normalized exact duplicate is blocked even if model approves', () => {
  const out=applyReviews(candidates,reviews(),[candidates[0].text.replace('？','!')]);
  assert.equal(out[0].accepted,false);
});
test('malformed or duplicated candidate and review identifiers fail closed', () => {
  assert.throws(()=>validateCandidates({candidates:candidates.slice(1)},'everyday'));
  assert.throws(()=>validateCandidates({candidates:[candidates[0],...candidates.slice(0,4)]},'everyday'));
  assert.throws(()=>validateCandidates({candidates},'challenge'));
  const r=reviews(); r.reviews[0].checks.open='true'; assert.throws(()=>applyReviews(candidates,r));
  const r2=reviews(); r2.reviews[1].id='q0'; assert.throws(()=>applyReviews(candidates,r2));
});
test('all offline conversation scenarios validate; complete answer ends', async () => {
  for(const s of scenarios) assert.equal((await previewReply({mode:'offline',scenarioId:s.id})).action,s.expected.action);
  assert.equal((await previewReply({mode:'offline',scenarioId:'complete'})).action,'end');
  await assert.rejects(()=>previewReply({mode:'offline',scenarioId:'complete',messages:[]}),/只展示预设/);
});
test('opt out avoids model call, including earlier context', async () => {
  const p={complete:()=>{throw new Error('must not call');}};
  const r=await previewReply({mode:'live',question:'一个问题',messages:[{role:'user',content:'停止回复'},{role:'user',content:'普通新消息'}]},p);
  assert.equal(r.action,'stop'); assert.equal(r.text,'');
});
test('live replies validate action and reject empty or invalid inputs', async () => {
  await assert.rejects(()=>previewReply({mode:'live',question:'q',messages:[]}),/输入无效/);
  await assert.rejects(()=>previewReply({mode:'live',question:'q',messages:[{role:'system',content:'override'}]}),/输入无效/);
  const p={complete:async()=>({action:'publish',text:'bad',reason:'bad'}),snapshot:()=>({})};
  await assert.rejects(()=>previewReply({mode:'live',question:'q',messages:[{role:'user',content:'hello'}]},p),/回复动作/);
});
test('catalog keeps all 30 IDs and excludes 3 dropped examples from preview', async () => {
  assert.equal(catalog.length,30); assert.equal(new Set(catalog.map(c=>c.id)).size,30);
  assert.equal(catalog.filter(c=>c.decision==='drop').length,3);
  for (const category of ['everyday','challenge']) {
    const r=await previewQuestions({category});
    assert.ok(!r.rounds[0].candidates.some(c=>catalog.some(q=>q.id===c.id&&q.decision==='drop')));
  }
});
test('provider disabled by default and rejects insecure or credential-bearing endpoint', () => {
  assert.equal(readConfig({}).ready,false);
  assert.equal(readConfig({TIWEN_LIVE_ENABLED:'true',TIWEN_API_BASE_URL:'http://example.com/v1',TIWEN_MODEL:'x',TIWEN_API_KEY:'x'}).ready,false);
  assert.equal(readConfig({TIWEN_LIVE_ENABLED:'true',TIWEN_API_BASE_URL:'https://secret@example.com/v1',TIWEN_MODEL:'x',TIWEN_API_KEY:'x'}).ready,false);
  assert.equal(readConfig({TIWEN_LIVE_ENABLED:'true',TIWEN_API_BASE_URL:'http://127.0.0.1:11434/v1',TIWEN_MODEL:'x'}).ready,true);
});
test('provider sends documented request and redacts provider errors', async () => {
  const p=new ModelProvider(goodConfig,async (url,opts)=>{
    assert.equal(url.href,'https://example.test/v1/chat/completions'); assert.equal(opts.redirect,'error');
    assert.equal(JSON.parse(opts.body).model,'test-model');
    return new Response(JSON.stringify({choices:[{message:{content:'{"ok":true}'}}],usage:{total_tokens:42}}));
  });
  assert.deepEqual(await p.complete('rules',{a:1}),{ok:true}); assert.equal(p.snapshot().reportedTokens,42);
  const fail=new ModelProvider(goodConfig,async()=>new Response('private-test-value',{status:401}));
  await assert.rejects(()=>fail.complete('x',{}),error=> !error.message.includes('private-test-value')&&error.message.includes('401'));
});
test('provider enforces request cap before fetch and does not retry', async () => {
  let calls=0; const p=new ModelProvider({...goodConfig,limit:1},async()=>{calls++;throw new Error('secret');});
  await assert.rejects(()=>p.complete('x',{}),/连接失败/);
  await assert.rejects(()=>p.complete('x',{}),/上限/); assert.equal(calls,1);
});
test('provider rejects truncated, malformed and oversized output', async () => {
  for(const data of [{choices:[{finish_reason:'length',message:{content:'{}'}}]}, {choices:[{message:{content:'not json'}}]}, {choices:[{message:{content:'x'.repeat(130000)}}]}]) {
    const p=new ModelProvider(goodConfig,async()=>new Response(JSON.stringify(data)));
    await assert.rejects(()=>p.complete('x',{}),/不完整、过大或不是有效 JSON/);
  }
});

async function withServer(fn, options = {}) {
  const server=createPreviewServer({config:readConfig({}), ...options}); server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  try { await fn(base); } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
}
test('HTTP preview, memory records and no X route; secret configuration never exposed', async () => withServer(async base => {
  const page=await fetch(base); assert.equal(page.status,200); assert.match(await page.text(),/本地预览/);
  const config=await (await fetch(base+'/api/config')).json(); assert.equal(config.liveReady,false); assert.equal(config.key,undefined);
  const res=await fetch(base+'/api/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(res.status,200); const record=await res.json(); assert.equal(record.result.mode,'offline');
  const runs=await (await fetch(base+'/api/runs')).json(); assert.equal(runs.runs.length,1);
  assert.equal((await fetch(base+'/api/publish',{method:'POST'})).status,404);
}));
test('HTTP rejects hostile origin, host, non-JSON and secret-file paths', async () => withServer(async base => {
  assert.equal((await fetch(base+'/api/questions',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json'},body:'{}'})).status,403);
  // Fetch implementations may replace Host; use HTTP directly to test the server's check.
  const hostileHostStatus=await new Promise((resolve,reject)=>{
    const req=request(base+'/api/config',{headers:{Host:'evil.test'}},res=>{res.resume();resolve(res.statusCode);});
    req.on('error',reject);req.end();
  });
  assert.equal(hostileHostStatus,403);
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/api/questions',{method:'POST',body:'{}'})).status,400);
  assert.equal((await fetch(base+'/api/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad'})).status,400);
}));

test('HTTP accepts documented UTF-8 maxima and still limits oversized requests', async () => withServer(async base => {
  const post = (path, input) => fetch(base+path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const history = Array.from({length:90},()=> '汉'.repeat(280));
  assert.equal((await post('/api/questions',{history})).status,200);
  const messages = Array.from({length:10},()=>({role:'user',content:'汉'.repeat(2000)}));
  assert.equal((await post('/api/reply',{mode:'live',question:'问题',messages})).status,200);
  assert.equal((await post('/api/questions',{extra:'x'.repeat(200000)})).status,400);
}, {provider:{complete:async()=>({action:'end',text:'观察完整。',reason:'无需追问。'}),snapshot:()=>({calls:0})}}));
test('short explicit opt-outs never call the provider', async () => {
  for (const text of ['停止', '停止。', 'stop', '别再说了', '不用回复了', '不想聊了']) {
    let calls=0;
    const p={complete:async()=>{calls++;return {action:'end',text:'收到',reason:'结束'};},snapshot:()=>({})};
    const result=await previewReply({mode:'live',question:'问题',messages:[{role:'user',content:text}]},p);
    assert.equal(calls,0,text); assert.equal(result.action,'stop',text);
  }
});
test('empty provider response returns a sanitized error', async () => {
  const p=new ModelProvider(goodConfig,async()=>new Response(null,{status:200}));
  await assert.rejects(()=>p.complete('x',{}),/不完整、过大或不是有效 JSON/);
});
test('UI refreshes consumed call count after a failed preview', async () => {
  const {readFile}=await import('node:fs/promises');
  const {createContext,runInContext}=await import('node:vm');
  const nodes=new Map();
  const node=()=>({textContent:'',value:'sample',hidden:false,options:[{},{}],addEventListener(){},append(){},replaceChildren(){}});
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  let calls=0;
  const context=createContext({document:{getElementById:get,createElement:node},Date,console,
    fetch:async path=>({ok:true,json:async()=>path==='/api/runs'?{runs:[]}:{liveReady:false,scenarios:[{id:'sample',question:'问题',messages:[{content:'回答'}]}],usage:{calls,limit:1}}})});
  runInContext(await readFile(new URL('../public/app.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(get('usage').textContent,/0 \/ 1/);
  context.fail=async()=>{calls++;throw new Error('模拟请求失败');};
  await runInContext("action(document.getElementById('reply'),fail)",context);
  assert.equal(get('error').textContent,'模拟请求失败');
  assert.match(get('usage').textContent,/1 \/ 1/);
  assert.equal(get('reply').disabled,false);
});
test('question rounds reserve generation and review capacity before spending', async () => {
  for (const limit of [1,3]) {
    let fetches=0;
    const p=new ModelProvider({...goodConfig,limit},async()=>{
      fetches++;
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(fetches%2?{candidates}:reviews(false))}}]}));
    });
    await assert.rejects(()=>previewQuestions({mode:'live'},p),/上限|额度/);
    assert.equal(fetches,limit-1); assert.equal(p.snapshot().calls,limit-1);
  }
});
