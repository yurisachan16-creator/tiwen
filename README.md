# 提问 / Tiwen

每天一个好问题，让人愿意停下来想一想。

**项目状态：M1 本地技术预览，待验收。** 可以运行离线选题与对话样例，也提供可选的真实模型接口。尚无 X Bot 服务、排程或外发能力；编辑口径与真实模型效果仍待验证。示例对话不是实际运营记录。

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
| [项目管理](docs/PROJECT.md) | 里程碑、Issue、状态与验收流程 |
| [30题校准草案](docs/CALIBRATION.md) | 保留、改写、淘汰及理由，尚待维护者评议 |
| [表达规范](docs/VOICE.md) / [质量评测](docs/EVALUATION.md) | 对话风格、正反例与证据边界 |
| [最小技术方案](docs/ARCHITECTURE.md) | 本地接口、模型配置、数据与失败处理 |

## 本地预览

需要 Node.js 22.12 或更新版本。无第三方运行依赖，先体验离线样例：

```sh
git clone https://github.com/yurisachan16-creator/tiwen.git
cd tiwen
npm ci --ignore-scripts
npm start
```

打开终端显示的 `http://127.0.0.1:4317`。可以查看候选题与评议理由、全部不合格时的跳过行为，以及10种预设对话。固定评议和回复明确标为离线样例，不会假装理解自由输入。`Ctrl+C` 停止服务。

运行检查：`npm run check`。查看评测基线：`npm run evaluate`。均不调用模型。

若需要真实模型，将 `.env.example` 复制为本机 `.env`，配置服务基础地址（通常以 `/v1` 结尾）、模型和密钥，设置调用上限，并明确启用。重启后在页面切换为真实模型。远端输入会发送给你配置的服务，请先设置服务商费用上限，不要输入私人资料。密钥不进入浏览器。

当前兼容性验证使用模拟接口；未声称真实服务已通过。详见 [架构与限制](docs/ARCHITECTURE.md)。

## 后续开发顺序

1. **选题与回复预览**：本地生成候选和模拟回复，支持质量评议，不连接发布能力。
2. **定时发帖**：通过 X 官方 API 发布每日问题，验证去重、预算限制与发送结果核对。
3. **获批后的自动互动**：满足平台要求后，接入主动提问、回复、退出和暂停能力。

每个阶段分别验收。本地预览不等于线上账号或自动运营，M2 与 M3 尚未实现。

## 运行条件与边界

未来运行实例需要 X 开发者接入、模型服务和持续运行的环境。开源代码采用 MIT 许可证；第三方服务可能收费，具体费用以服务商控制台为准。

截至 2026-09-17 核实的 [X 自动化规则](https://help.x.com/en/rules-and-policies/x-automation) 要求 AI 自动回复机器人事先获得 X 明确的书面批准。获批前自动回复保持关闭，可以生成草稿。详细流程见 [SOP](docs/SOP.md)。

项目旨在为观察、解释、判断和创造提供练习机会，不宣称提高智力，也不把互动量当作思考质量的证明。

## English

**Tiwen** is a planned open-source thinking companion on X: one thoughtful question a day, followed by context-aware conversation. It alternates everyday observation with cross-disciplinary challenges. The goal is to invite people to notice, explain, reconsider, and create.

**M1 local technical preview, awaiting acceptance:** run `npm start` with Node.js 22.12+ to explore clearly labeled offline question and conversation examples. An optional Chat Completions-compatible adapter is included; live-provider quality and editorial preferences still need validation. There is no X publishing or scheduling implementation. AI-powered automated replies will remain disabled until the operator meets X's approval requirements.

## 参与与许可

欢迎通过 [Issues](https://github.com/yurisachan16-creator/tiwen/issues) 提议题目、指出预设立场，或讨论更好的互动方式。请先阅读 [贡献指南](CONTRIBUTING.md)。代码与本仓库原创文档采用 [MIT License](LICENSE)。
