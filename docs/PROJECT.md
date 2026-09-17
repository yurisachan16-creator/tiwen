# 项目管理

GitHub Issue 是任务状态的唯一来源；本文只规定工作方式和里程碑边界，不复制实时任务状态。

## 里程碑与任务

| 里程碑 | 交付边界 | 任务 |
| --- | --- | --- |
| M0 · 项目定义 | PRD、SOP、候选题与贡献规范 | [#1](https://github.com/yurisachan16-creator/tiwen/issues/1) |
| M1 · 问答预览 | 编辑校准、评测、表达规范、技术方案与本地预览 | [校准 #2](https://github.com/yurisachan16-creator/tiwen/issues/2)、[评测 #3](https://github.com/yurisachan16-creator/tiwen/issues/3)、[表达 #4](https://github.com/yurisachan16-creator/tiwen/issues/4)、[方案 #5](https://github.com/yurisachan16-creator/tiwen/issues/5)、[实现 #6](https://github.com/yurisachan16-creator/tiwen/issues/6) |
| M2 · 每日发布 | 官方 API 发布、运行状态、预算及真实发帖证明 | [模型与盲评 #9](https://github.com/yurisachan16-creator/tiwen/issues/9)、[发布 #7](https://github.com/yurisachan16-creator/tiwen/issues/7) |
| M3 · 自动互动 | 平台批准、上下文回复、退出与真实互动证明 | [#8](https://github.com/yurisachan16-creator/tiwen/issues/8) |

[查看里程碑](https://github.com/yurisachan16-creator/tiwen/milestones) · [查看任务](https://github.com/yurisachan16-creator/tiwen/issues)

## 状态与责任

每个任务只有一个 `status:` 标签：`todo` 待办、`doing` 进行中、`review` 待验收、`blocked` 阻塞、`done` 已完成。Issue 关闭且有证据才算完成。维护者负责验收，实际实现者通过 PR 作者与提交记录追踪。

任务必须写清范围、依赖、交付物和可观察的验收标准。开始工作前检查依赖；独立准备可以进行，但依赖未验收时不得声称整个功能完成。出现外部阻塞时写明缺失条件、解除方式和不受影响的工作。

同一时段只设一个主要推进目标。当前交付与后续运营分开；M2、M3 不因 M1 程序能启动就提前关闭。

## 从任务到交付

1. 将任务置为进行中，在独立功能分支实现，并保留未知项。
2. PR 链接对应 Issue，提供验证命令、实际输出、示例及未验证边界。
3. 通过项目检查后改为待验收。人工品味校准、模型真实效果、CI、浏览器检查分别记录，不能互相替代。
4. 验收标准全部满足后再关闭任务；未满足的项保留开放或拆成具体后续任务。未经验收不使用自动关闭关键字。
5. 只有当前范围的任务完成，才能关闭相应里程碑。合并 PR 与上线也是两个独立状态。

每完成一项独立修改，检查后立即提交 Git，再开始下一项。提交说明写清改了什么；不要把互不相关的修改攒成一次大提交。

交付时说清改了什么、检查了什么、还有什么没做，并附上对应链接。按实际情况写，不必套固定的汇报格式。
