import { qualityCases, scenarios, applyReviews, previewReply } from '../src/engine.mjs';
import { ModelProvider, readConfig } from '../src/provider.mjs';
import { judgement } from '../src/prompts.mjs';
try { process.loadEnvFile(); } catch (error) { if(error.code!=='ENOENT') throw error; }
const live=process.argv.includes('--live');
if (!live) {
  console.log(JSON.stringify({mode:'inspection-only',qualityCases:qualityCases.length,dialogueCases:scenarios.length,liveModelTested:false,notice:'仅列出人工评议基线，不执行真实模型，也不输出伪造的通过率。',qualityCases,scenarios},null,2));
} else {
  const provider=new ModelProvider(readConfig());
  if(!provider.config.ready) throw new Error('请先配置 .env、调用上限和服务商费用上限。');
  // Run one selected case at a time: spend is deliberate and bounded.
  const id=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
  const q=qualityCases.find(c=>c.id===id), s=scenarios.find(c=>c.id===id);
  if (!id || (!q&&!s)) throw new Error('真实模型评议必须指定一个有效的 --case=编号；不会自动跑完整付费集合。');
  let result;
  if(q) {
    const candidates=[{id:q.id,text:q.text,category:'everyday'}];
    result=applyReviews(candidates,await provider.complete(judgement,{candidates,history:q.history||[]}),q.history||[]);
  } else { result=await previewReply({mode:'live',question:s.question,messages:s.messages},provider); }
  console.log(JSON.stringify({mode:'live',case:id,purpose:q?'question-review':'conversation',expected:q?.expected||s.expected.action,result,usage:provider.snapshot(),notice:'单条结果，需人工评议；不能据此宣称整体质量通过。'},null,2));
}
