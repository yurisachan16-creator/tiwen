# 提问 / Tiwen

每天一个好问题，让人愿意停下来想一想。

**项目状态：规划中。** 当前仓库包含 PRD、运营 SOP、候选问题与贡献规范，尚无可运行的 Bot 程序，也未启用 X 账号自动运营。下文描述的是目标行为，示例对话不是实际运营记录。

Tiwen 是一个计划运行在 X 上的开源思考伙伴。它每天发布一个问题，围绕用户的回答和主动提问，提供解释、例子、不同视角或有针对性的追问。用户通过关注、评论和 @ 参与，不需要额外注册账户。

## 一段可能发生的对话

**提问：** 一座公园只能做一项改造：你会先观察什么，再决定把钱花在哪里？

**用户：** 我会数一下哪些设施使用的人最多。

**提问：** 这能看出已有使用者的偏好。不过，有些人可能因为缺少某种设施而根本没来。你会怎样把这些人的需要也纳入观察？

如果用户已经解释得清楚，Tiwen 也可以补充一个有用的细节，或结束对话；不会为了延长互动而不停反问。

## 产品方向

- **AI 全自动选题**：生成候选、检查质量与事实前提、去重后发布；没有合格题目时可以跳过。
- **两类内容均衡**：日常观察与跨领域挑战按成功发布次序交替，在各类中随机选题。
- **有边界的互动**：围绕思考与每日话题回应主动互动，不扩展为通用任务助理。
- **把质量公开讨论**：题目要有具体切入点和多条探索路径，避免二元设问、预设立场、空泛哲理及机械追问。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [产品需求 PRD](docs/PRD.md) | 用户、产品行为、选题标准、成功指标与验收场景 |
| [运营 SOP](docs/SOP.md) | 上线准备、每日发布、互动、异常、复盘和恢复 |
| [候选问题与改写](docs/QUESTIONS.md) | 30 个候选问题，以及差题分析与改写示例 |
| [贡献指南](CONTRIBUTING.md) | 如何提出问题、评议题目和改进产品文档 |

## 后续开发顺序

1. **选题与回复预览**：本地生成候选和模拟回复，支持质量评议，不连接发布能力。
2. **定时发帖**：通过 X 官方 API 发布每日问题，验证去重、预算限制与发送结果核对。
3. **获批后的自动互动**：满足平台要求后，接入主动提问、回复、退出和暂停能力。

每个阶段分别验收。当前没有安装或启动命令，没有线上账号可供体验，也不接受将文档完成等同于 Bot 上线。

## 运行条件与边界

未来运行实例需要 X 开发者接入、模型服务和持续运行的环境。开源代码采用 MIT 许可证；第三方服务可能收费，具体费用以服务商控制台为准。

截至 2026-09-17 核实的 [X 自动化规则](https://help.x.com/en/rules-and-policies/x-automation) 要求 AI 自动回复机器人事先获得 X 明确的书面批准。获批前自动回复保持关闭，可以生成草稿。详细流程见 [SOP](docs/SOP.md)。

项目旨在为观察、解释、判断和创造提供练习机会，不宣称提高智力，也不把互动量当作思考质量的证明。

## English

**Tiwen** is a planned open-source thinking companion on X: one thoughtful question a day, followed by context-aware conversation. It alternates everyday observation with cross-disciplinary challenges. The goal is to invite people to notice, explain, reconsider, and create.

**Planning stage:** this repository currently contains product requirements, operating procedures, and candidate questions. There is no runnable bot or live service yet. AI-powered automated replies will remain disabled until the operator meets X's approval requirements.

## 参与与许可

欢迎通过 [Issues](https://github.com/yurisachan16-creator/tiwen/issues) 提议题目、指出预设立场，或讨论更好的互动方式。请先阅读 [贡献指南](CONTRIBUTING.md)。代码与本仓库原创文档采用 [MIT License](LICENSE)。
