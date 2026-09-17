const $ = id => document.getElementById(id);
let config, records = [];
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
async function api(path, input) { const res = await fetch(path, input === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || '请求失败'); return data; }
function showError(error) { $('error').textContent = error.message; $('error').hidden = false; }
function currentScenario() { return config.scenarios.find(s => s.id === $('scenario').value); }
function showScenario() { const s = currentScenario(); $('conversation-question').textContent = s.question; $('message').value = s.messages.at(-1).content; $('reply-result').replaceChildren(); }
function setMode() {
  const live = $('mode').value === 'live';
  $('mode-note').textContent = live ? '当前输入和必要上下文将发送到你配置的模型服务。只生成草稿，不发布。' : '离线样例使用固定题目、编辑评议和示例回复，不会调用模型。';
  $('message').readOnly = !live; $('failure-label').hidden = live;
  $('message-note').textContent = live ? '可编辑这一条用户输入；情境自带的前文会一起发送。不要输入私人资料。' : '离线模式展示预设对话；真实模型模式可编辑用户输入。';
  $('question-result').replaceChildren(el('div', '选择类别后预览。', 'empty'));
  showScenario();
}
async function refresh() {
  ({ runs: records } = await api('/api/runs'));
  $('runs').replaceChildren();
  if (!records.length) $('runs').textContent = '还没有预览记录。';
  for (const r of records) {
    const label = r.result.mode === 'offline' ? '离线样例' : '真实模型';
    const text = r.kind === 'questions' ? r.result.selected?.text || '本次跳过' : r.result.text || (r.result.action === 'stop' ? '停止回应' : '本轮不回复');
    $('runs').append(el('div', `${new Date(r.createdAt).toLocaleTimeString()} · ${label} · ${text}`, 'run'));
  }
  const latest = await api('/api/config');
  $('usage').textContent = `模型调用 ${latest.usage.calls} / ${latest.usage.limit} · 金额以服务商账单为准`;
}
async function action(button, work) {
  $('error').hidden = true;
  $('generate').disabled = $('reply').disabled = true;
  const text = button.textContent; button.textContent = '预览中…';
  let failure;
  try { await work(); } catch (error) { failure = error; showError(error); }
  try { await refresh(); } catch (error) { if (!failure) showError(error); }
  finally { button.textContent = text; $('generate').disabled = $('reply').disabled = false; }
}
$('generate').addEventListener('click', () => action($('generate'), async () => {
  const record = await api('/api/questions', { mode: $('mode').value, category: $('category').value, scenario: $('mode').value === 'offline' ? $('failure').value : 'normal' });
  const result = record.result, target = $('question-result'); target.replaceChildren();
  const selected = el('div', undefined, 'selected'); selected.append(el('span', result.status === 'selected' ? '本次选中 · 仅供预览' : '本次跳过', 'small-tag'), el('p', result.selected?.text || '没有合格问题，也是一种结果。')); target.append(selected, el('p', result.notice, 'hint'));
  for (const round of result.rounds) {
    target.append(el('h3', `第 ${round.round} 轮 · ${round.candidates.length} 个候选`));
    for (const c of round.candidates) {
      const card = el('div', undefined, 'candidate'); const row = el('div', undefined, 'row');
      row.append(el('span', c.accepted ? '通过' : '淘汰', 'verdict'+(c.accepted ? '' : ' rejected')), el('p', c.text));
      card.append(row, el('p', c.reason, 'reason')); target.append(card);
    }
  }
}));
$('reply').addEventListener('click', () => action($('reply'), async () => {
  const s = currentScenario(), mode = $('mode').value;
  const input = mode === 'offline' ? { mode, scenarioId: s.id } : { mode, question: s.question, messages: [...s.messages.slice(0,-1), { role: 'user', content: $('message').value }] };
  const { result } = await api('/api/reply', input);
  const names = { ask:'追问', explain:'解释', perspective:'补充视角', end:'自然结束', boundary:'说明边界', stop:'停止回应' };
  const card = el('div', undefined, 'reply-card'); card.append(el('span', names[result.action], 'small-tag'), el('p', result.text || (result.action === 'stop' ? '用户已要求停止，不回复。' : '本轮无需补充，不回复；没有将用户设为退出。')), el('p', result.reason, 'hint'), el('p', result.notice || '退出请求优先处理。', 'hint')); $('reply-result').replaceChildren(card);
}));
$('scenario').addEventListener('change', showScenario); $('mode').addEventListener('change', setMode);
$('export').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ notice:'本地预览记录；可能包含手动输入，请勿直接公开。', records }, null, 2)], { type:'application/json' })); const a = el('a'); a.href=url; a.download='tiwen-preview.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
(async () => { try { config = await api('/api/config'); const option = $('mode').options[1]; option.disabled = !config.liveReady; option.textContent = config.liveReady ? '真实模型 · '+config.model : '真实模型 · 尚未配置'; for (const s of config.scenarios) { const opt = el('option', s.title); opt.value=s.id; $('scenario').append(opt); } showScenario(); await refresh(); } catch (error) { showError(error); $('generate').disabled=$('reply').disabled=true; } })();
