import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { generation, judgement, replying, dimensions, PROMPT_VERSION } from './prompts.mjs';

export const catalog = JSON.parse(await readFile(new URL('../content/questions.json', import.meta.url), 'utf8'));
export const scenarios = JSON.parse(await readFile(new URL('../content/dialogues.json', import.meta.url), 'utf8'));
export const qualityCases = JSON.parse(await readFile(new URL('../content/evaluation.json', import.meta.url), 'utf8'));
const categories = ['everyday', 'challenge'];
const actions = ['explain', 'perspective', 'ask', 'end', 'boundary', 'stop'];
const normalize = value => value.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu, '').toLowerCase();

export function validateCandidates(result, category) {
  if (!result || !Array.isArray(result.candidates) || result.candidates.length !== 5) throw new Error('候选必须恰好有5题。');
  const seen = new Set();
  return result.candidates.map(c => {
    if (!c || typeof c.id !== 'string' || !/^[A-Za-z0-9-]{1,20}$/.test(c.id) || seen.has(c.id) || typeof c.text !== 'string' || !c.text.trim() || c.text.length > 280 || c.category !== category) throw new Error('候选结构、编号、类别或长度不合格。');
    seen.add(c.id);
    return { id: c.id, text: c.text.trim(), category };
  });
}

export function applyReviews(candidates, result, history = []) {
  if (!result || !Array.isArray(result.reviews) || result.reviews.length !== candidates.length) throw new Error('评议必须与候选一一对应。');
  const reviews = new Map();
  for (const r of result.reviews) {
    if (!r || !candidates.some(c => c.id === r.id) || reviews.has(r.id) || !r.checks || dimensions.some(d => typeof r.checks[d] !== 'boolean') || typeof r.novel !== 'boolean' || typeof r.reason !== 'string' || !r.reason.trim() || r.reason.length > 1000) throw new Error('评议缺失、重复或结构不合格。');
    reviews.set(r.id, r);
  }
  const seen = new Set(history.map(normalize));
  return candidates.map(c => {
    const r = reviews.get(c.id);
    const duplicate = seen.has(normalize(c.text));
    seen.add(normalize(c.text));
    return { ...c, checks: Object.fromEntries(dimensions.map(d => [d, r.checks[d]])), novel: r.novel && !duplicate, reason: duplicate ? '与历史或同批候选文本重复。' : r.reason.trim(), accepted: !duplicate && r.novel && dimensions.every(d => r.checks[d]) };
  });
}

export function validHistory(history) {
  if (!Array.isArray(history) || history.length > 90 || history.some(x => typeof x !== 'string' || x.length > 280)) throw new Error('历史最多90条，每条不超过280字符。');
  return history;
}

export async function previewQuestions({ mode = 'offline', category = 'everyday', history = [], scenario = 'normal' } = {}, provider, choose = randomInt) {
  if (!categories.includes(category) || !['offline', 'live'].includes(mode) || !['normal', 'all-rejected'].includes(scenario)) throw new Error('预览模式或类别无效。');
  validHistory(history);
  const rounds = [];
  for (let round = 1; round <= 2; round++) {
    let candidates, review;
    if (mode === 'live') {
      const budget = provider.snapshot();
      if (budget.limit - budget.calls < 2) throw new Error('剩余调用额度不足以完成生成和评议；本轮未开始，请核对费用与调用上限。');
      candidates = validateCandidates(await provider.complete(generation, { category, history, round }), category);
      review = await provider.complete(judgement, { candidates, history });
    } else {
      // Fixed editorial examples are a demonstration, never a judgement of arbitrary input.
      const examples = catalog.filter(x => x.category === category && x.decision !== 'drop').slice((round - 1) * 4, round * 4);
      candidates = examples.map(x => ({ id: x.id, text: x.text, category }));
      const bad = qualityCases.find(x => x.id === 'binary');
      candidates.push({ id: 'bad-example', text: bad.text, category });
      review = { reviews: candidates.map(c => ({ id: c.id, checks: Object.fromEntries(dimensions.map(d => [d, scenario !== 'all-rejected' && (c.id !== 'bad-example' || d !== 'open')])), novel: true, reason: scenario === 'all-rejected' ? '预设失败场景：示范没有合格题目时跳过。' : c.id === 'bad-example' ? bad.reason : '预设编辑样例：'+examples.find(x => x.id === c.id).reason })) };
    }
    const evaluated = applyReviews(candidates, review, history);
    rounds.push({ round, candidates: evaluated });
    const accepted = evaluated.filter(c => c.accepted);
    if (accepted.length) return { mode, promptVersion: PROMPT_VERSION, category, status: 'selected', rounds, selected: accepted[choose(accepted.length)], notice: mode === 'offline' ? '离线固定样例；评议为编辑预设，未调用模型，不能证明真实选题质量。' : '真实模型预览；模型评议尚需人工复核，不代表事实查证或发布批准。', usage: mode === 'live' ? provider.snapshot() : null };
  }
  return { mode, promptVersion: PROMPT_VERSION, category, status: 'skipped', rounds, selected: null, notice: '两轮均无合格题目：本次跳过，不生成兜底问题。预览不会发布或推进线上类别。', usage: mode === 'live' ? provider.snapshot() : null };
}

export function shouldStop(text) {
  return /停止回复|别再回复|不要再回复|不用回复|别再说了|不想聊了|不想继续|\bstop\b/i.test(text) || /^(请)?(停止|停下|结束)(吧)?[。！!\s]*$/.test(text.trim());
}

export function validateReply(value) {
  if (!value || !actions.includes(value.action) || typeof value.text !== 'string' || value.text.length > 500 || typeof value.reason !== 'string' || !value.reason.trim() || value.reason.length > 1000 || (value.action === 'stop' && value.text !== '') || (value.action !== 'stop' && !value.text.trim())) throw new Error('回复动作或内容不合格。');
  return { action: value.action, text: value.text, reason: value.reason };
}

export async function previewReply(input, provider) {
  if (input.mode === 'offline') {
    const found = scenarios.find(s => s.id === input.scenarioId);
    if (!found || input.messages !== undefined) throw new Error('离线模式只展示预设对话，不能生成自由输入的回复。');
    return { mode: 'offline', promptVersion: PROMPT_VERSION, question: found.question, messages: found.messages, ...validateReply(found.expected), notice: '固定示例对话，未调用模型。切换真实模型后才能测试自由输入。' };
  }
  if (input.mode !== 'live' || typeof input.question !== 'string' || !input.question.trim() || input.question.length > 280 || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 10 || input.messages.some(m => !m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 2000) || input.messages.at(-1).role !== 'user') throw new Error('对话输入无效；最多10条，每条不超过2000字符，最后一条须为用户消息。');
  if (input.messages.some(m => m.role === 'user' && shouldStop(m.content))) return { mode: 'live', action: 'stop', text: '', reason: '当前预览对话包含退出请求，不调用模型。', promptVersion: PROMPT_VERSION };
  const reply = validateReply(await provider.complete(replying, { question: input.question, messages: input.messages }));
  return { mode: 'live', promptVersion: PROMPT_VERSION, ...reply, usage: provider.snapshot(), notice: '真实模型草稿；未发送到 X。' };
}
