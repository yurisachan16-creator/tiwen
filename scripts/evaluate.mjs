import { readFile } from 'node:fs/promises';
import { PROMPT_VERSION, REPLY_EXAMPLE_IDS } from '../src/prompts.mjs';
import { qualityCases, scenarios, applyReviews, previewReply } from '../src/engine.mjs';
import { ModelProvider, readConfig } from '../src/provider.mjs';
import { judgement } from '../src/prompts.mjs';
try { process.loadEnvFile(); } catch (error) { if(error.code!=='ENOENT') throw error; }
const holdout=JSON.parse(await readFile(new URL('../content/holdout.json',import.meta.url),'utf8'));
const live=process.argv.includes('--live');
if (!live) {
  console.log(JSON.stringify({mode:'inspection-only',qualityCases:qualityCases.length,dialogueCases:scenarios.length,liveModelTested:false,notice:'仅列出人工评议基线，不执行真实模型，也不输出伪造的通过率。',qualityCases,scenarios,runtimeExampleIds:REPLY_EXAMPLE_IDS,holdout},null,2));
} else {
  const provider=new ModelProvider(readConfig());
  if(!provider.config.ready) throw new Error('请先配置 .env、调用上限和服务商费用上限。');
  // Run one selected case at a time: spend is deliberate and bounded.
  const id=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
  const q=qualityCases.find(c=>c.id===id)||holdout.questions.find(c=>c.id===id), s=scenarios.find(c=>c.id===id)||holdout.dialogues.find(c=>c.id===id);
  const set=id?.startsWith('holdout-')?'holdout':REPLY_EXAMPLE_IDS.includes(id)?'runtime-example':'development';
  if(set==='holdout'&&holdout.promptVersion!==PROMPT_VERSION) throw new Error('保留集绑定的提示词版本已变更，请先审定新的独立样本。');
  if (!id || (!q&&!s)) throw new Error('真实模型评议必须指定一个有效的 --case=编号；不会自动跑完整付费集合。');
  let result;
  if(q) {
    const candidates=[{id:q.id,text:q.text,category:q.category||'everyday'}];
    result=applyReviews(candidates,await provider.complete(judgement,{candidates,history:q.history||[]}),q.history||[]);
  } else { result=await previewReply({mode:'live',question:s.question,messages:s.messages},provider); }
  console.log(JSON.stringify({mode:'live',case:id,set,promptVersion:PROMPT_VERSION,purpose:q?'question-review':'conversation',expected:q?.expected||s.expectedActions||s.expected.action,result,usage:provider.snapshot(),notice:'单条结果，需人工评议；不能据此宣称整体质量通过。'},null,2));
}
