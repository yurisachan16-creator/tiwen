import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function renderCalibration(catalog) {
  const labels = { keep:'保留', rewrite:'改写', drop:'暂时淘汰' };
  const kinds = { none:'未改动', copyedit:'措辞润色', 'task-redesign':'题目重构' };
  const escape = value => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const count = key => catalog.filter(c => c.decision === key).length;
  return `# 30题编辑校准草案

本文件由 \`content/questions.json\` 生成。运行 \`node scripts/render-calibration.mjs\` 更新；原题见 [候选问题](QUESTIONS.md)。

当前均为待审定草案。保留 ${count('keep')} 题，改写 ${count('rewrite')} 题，暂时淘汰 ${count('drop')} 题；“保留”允许补充假设措辞，淘汰项不进入预览池。

修订类型比较原题与当前题干。措辞润色须保留前提、约束和思考动作；题目重构须重新评议当前 focus。上一稿保存在 JSON 的 history 中，不覆盖原文或历史判断。详见 [表达规范](VOICE.md) 和 [评测规范](EVALUATION.md)。

| 题号 | 建议 | 修订类型 | 原任务 → 当前任务 | 改动说明 | 理由 | 当前题干 |
| --- | --- | --- | --- | --- | --- | --- |
${catalog.map(c => '| '+[c.id,labels[c.decision],kinds[c.editKind],`${c.originalFocus} → ${c.focus}`,c.editNote,c.reason,c.text].map(escape).join(' | ')+' |').join('\n')}
`;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog=JSON.parse(await readFile(new URL('../content/questions.json',import.meta.url),'utf8'));
  await writeFile(new URL('../docs/CALIBRATION.md',import.meta.url),renderCalibration(catalog));
}
