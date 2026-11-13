# ADR-0001：JSON 文档的形状归域侧，transport 与 flow canvas 保持 shape-agnostic

- **状态**：Accepted
- **日期**：2026-10-21
- **相关**：架构评审候选 01（transport）、候选 02（flow canvas）；`GLOSSARY.md`
- **决策者**：项目负责人（在 01+02 组合路线讨论中拍板）

## 背景

`BackendPage` 里有两种「JSON 列 ↔ 节点图」的编辑器需求：

- **内容控制图**：内容表的 `c_control` 列，序列化后写 `PUT /api/content/editJson`；
- **展项快捷控制图**：展项表的 `e_link` 列，序列化后写 `PUT /api/exhibition/control`。

同一个编辑器被复制成 4 份（`ContentControlFlow/`、`ExhibitionLinkFlow/`、`SmodelFlow/`、
`ContentControlFlow - 备份/`），每份各自实现 `parseControlItems → normalizeItem → buildNode →
buildControlTree` 与 45 行 `getLayoutedElements`，其中多数函数在副本之间逐字节相同
（`getLayoutedElements`：`备份:61-97 ≡ SmodelFlow:59-95 ≡ ExhibitionLinkFlow:60-96`）。

同时计划引入两个 module：

- **transport**（候选 01）：接管地址、`{code,data,msg}` 信封、错误分类、分页形状；
- **flow canvas**（候选 02）：接管节点图编辑、布局、拖入、选中、序列化机制、保存时序。

于是出现一个必须拍板的归属问题：**JSON 文档的「形状」（字段名、嵌套规则、磁盘契约）放在哪个 module 里？**

## 决策

**JSON 文档的形状归域侧，transport 与 flow canvas 都不碰。**

具体地：

1. **transport** 只按 id 读/写一个 JSON 列的**原始值**（字符串或对象均可），不解释其字段；它的 interface 中
   不出现 `c_control`、`e_link`、`children`、`content_code`、`device_code` 等业务字段名。
2. **flow canvas** 只接收「节点与连线」以及一个持久化意图，不内置任何字段名；遍历、布局、交互、
   序列化**机制**归它，字段到节点的**映射**不归它。
3. **document adapter** 放在域侧（页面旁，可由同一域的多个 host 共用），拥有字段映射与读写端点。
   内容控制图与展项快捷控制图各一个 adapter——**两个 adapter 才让这条 seam 是真实 seam**，
   而不是假想 seam。
4. 两个 module 之间因此只剩一条窄 seam：**按 id 搬运 JSON 原始值**。

## 被否决的替代方案

| 方案 | 否决理由 |
|---|---|
| **flow canvas 拥有 schema**（评审报告的原始建议） | `c_control` / `e_link` 是跨系统磁盘契约，被前端大屏与现场设备同时消费；把契约定义权收到前端一个 module 里，等于把「无法单方面修正的契约」放到最容易漂移的位置。页面/域才是最清楚字段的一方。 |
| **transport 拥有泛型 typed document** | transport 会获得「JSON 列」的半业务概念，同一份传输策略要为两种文档各长一个分支；且 transport 的测试将依赖业务样本。 |
| **页面逐页内联形状** | `c_control` 同时被 `main.tsx` 与 `content.tsx` 两个 host 使用，逐页内联会保留两份映射，等于把重复从「4 份机制」变成「2 份映射 + 4 份机制」。 |

## 后果

- **减少的是机制重复**（4 份 → 1 份 canvas），不是字段映射重复（2 个域各一份；同一域的多个 host 共用同一份 adapter）。
- 新增一种节点 kind 只需改 canvas 的注册表；**改字段只改域侧 adapter**，不触碰 canvas。
- canvas 的测试不需要真实业务 JSON；adapter 的 round-trip 测试需要真实样本（见 ADR-0002）。
- 代价：域侧 adapter 会有少量重复的「读列 → 解析 → 建节点」样板；接受，因为那正是契约该待的地方。
- **本文不固定 interface 签名**：字段映射以「声明式字段表」还是「域侧适配函数」传入 canvas，留到 Step 2 决定。
