# 修改入口

- 改工程文档先看 [CONTRIBUTING.md](CONTRIBUTING.md)，保留规则、实现状态和验收条件。
- 改问题、回复或提示词先看 [docs/VOICE.md](docs/VOICE.md)。不全局套用通用去 AI 味规范，不增加评议后的润色调用。
- 题库以 `content/questions.json` 为来源，保留 `original`、`originalFocus` 和已有 `history`；修改前追加上一稿。区分措辞润色与题目重构，同步任务说明。
- 改题库后运行 `node scripts/render-calibration.mjs`，提交同步生成的 `docs/CALIBRATION.md`。
- 改入选回复样例时更新提示词版本和文档。独立评测输入不进入提示词；参考评测结果改提示词后，按 [docs/EVALUATION.md](docs/EVALUATION.md) 更换保留集。
- 每完成一项独立修改，检查后单独提交，再开始下一项。只提交本次改动，不改写他人的工作。
- 文档或内容修改运行 `node scripts/check-docs.mjs`；程序修改运行 `npm run check`。页面行为变化还需实际操作检查。
- 不把结构测试、离线样例或程序可启动称为模型效果或上线验收。真实模型接入、X 发布和自动互动按各自任务单独验收。
