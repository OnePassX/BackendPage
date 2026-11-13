# GLOSSARY.md

本文件定义 **BackendPage** 的领域语言与架构语言。命名 module、写 ADR、做代码评审、
以及后续的架构评审，都优先使用这里的词；如果需要的概念不在这里，先补进本文件再使用。

> 项目背景：智能中控系统 CenterControl V4 的 **后台管理前端**。
> React 19 + Vite + @xyflow/react + shadcn，对接 Django REST Framework 后端（`192.168.4.43:8004`）。
> 同仓库的「前端大屏」端消费同一批数据，路由块在 `src/routers/index.tsx` 中已被注释。

---

## 一、领域术语（Domain）

### 展陈结构

| 术语 | 代码名 | 含义 | 状态 |
|---|---|---|---|
| 展厅 | `pavilion` | 展陈的顶层空间单元；字段 `p_name / p_summary / p_re / show / sort` | 确认 |
| 展区 | `machine` | 展厅内的区域，通过 `m_p` 挂在展厅下 | 确认 |
| 展项 | `exhibit` | 展区内的展示项，通过 `e_m` 挂在展区下；`e_ip` 为设备地址，`e_base` 为基础按钮集 | 确认 |
| 内容 | `content` | 展项下的内容文件（视频/图片/PPT/网页…），通过 `e_id` 挂在展项下 | 确认 |
| 内容文件状态 | `c_file_status` | 内容文件的发布/处理状态字典项 | 确认 |
| 内容文件类型 | `c_file_type` | 内容文件的格式字典项（决定图标，见 `src/assets/index.js`） | 确认 |
| 设备 | `device` | 物理播放/控制设备；`area = 1` 挂展项、`area = 2` 挂展厅，通过 `link` 指向宿主 id | 确认 |
| 指令码 | `code` | 设备可执行命令；字段 `name / format / protocal / ip / port / code / delay / sort` | 确认 |
| 控制项 | `control` | 由指令码 + 参数组成的可下发控制；树形，带 `content_code` / `device_code` 两类指令引用 | 确认 |
| 展厅拓扑 | exhibition flow | `src/app/main.tsx` 的主图：展厅 → 展区 → 展项 → 设备 → 内容，连线即 `link` 外键 | 确认 |

### 控制图（本项目最重要的两个 JSON 概念）

| 术语 | 代码名 | 含义 | 状态 |
|---|---|---|---|
| 内容控制图 | `c_control` | 挂在**内容**上的控制图，序列化为 JSON 写入 `PUT /api/content/editJson` | 确认 |
| 展项快捷控制图 | `e_link` | 挂在**展项**上的控制图，序列化为 JSON 写入 `PUT /api/exhibition/control` | 确认 |
| 控制图节点 | `ControlItem` | 控制图里一个持久化节点：`label / show / sort / children / content_code / device_code` | 确认 |
| 控制图边 | — | 图的边不单独存储，由节点树的 `children` 隐含 | 推定 |
| 启动/默认/显示状态 | `c_startup / c_default / c_open` | 内容在设备上的开机启动、默认内容、是否显示 | 确认 |

> 注意：`c_control` 与 `e_link` 是**两种不兼容的磁盘形状**（前者嵌套 `children`，后者曾被扁平化，
> 见 `ExhibitionLinkFlow.tsx:181-210`）。按 ADR-0002，**暂不统一**。

### 其它域

| 术语 | 代码名 | 含义 |
|---|---|---|
| 软件模式 | `smodel` | 软件侧的运行模式配置；含模式绑定 `smodelbind` |
| 硬件模式 | `hmodel` | 硬件侧模式配置（页面未挂路由） |
| 进程模式 | `process` | 进程级模式配置（页面未挂路由） |
| 预览 / 点位 | `preview` / `point` | 前端大屏的预览布局与坐标点位；页面目前是脚手架 |
| 字典 | `dict` | 通用字典类型与字典数据（`dict` / `dict/data`） |
| 图标 | `icon` | 上传的图标资源，按分组管理 |
| 菜单 | `menu` | RBAC 菜单树；`type` 区分目录/菜单/按钮，`permission` 为权限串（当前前端未使用） |
| 角色 | `role` | 角色及其菜单授权（`rolemenu`） |
| 用户 | `user` | 后台用户，含 `status`（1 启用 / 2 禁用，与其它域不一致） |
| 首页配置 | `ehdata` / `ehactive` / `welcome` | 前端大屏首页的配置、当前激活项、欢迎页文案；**不属于** `/server/main` 页面 |
| 登录会话 | session | 见架构语言的 `session module`；当前由 `localStorage` 的 5 个 key 承担 |

### 状态值的既有写法（写新代码时不要扩散）

| 概念 | 现存写法 | 出处 |
|---|---|---|
| 启用/禁用 | `1 / 2` | `src/app/system/user.tsx:71`、`src/app/exhibition/machine.tsx:42` |
| 启用/禁用 | `1 / 0` | `src/app/system/role.tsx:220`、`src/app/dict/index.tsx:113` |
| 显示/隐藏 | `boolean` | `ContentControlSidebar`、内容页开关 |
| `show` 的语义 | 多数页面 = 启用/禁用；`pme.tsx` = 显示/隐藏 | `src/app/exhibition/pme.tsx:131` |

---

## 二、架构语言（Architecture）

### 基本词汇（与 `/codebase-design` 对齐）

- **module**：一个有 interface 与 implementation 的单元。在本项目里可以是一个文件、一个目录或一个 hook 文件。
- **interface**：module 对外暴露的那层——包含类型。**interface 就是测试面**。
- **implementation**：被 interface 挡住的内部实现。
- **depth**：interface 相对 implementation 的窄度。interface 越窄、implementation 越厚，module 越 **deep**；
  两者一样宽就是 **shallow**（本项目的 `src/api/*.js` 是典型：interface = implementation = 一行 URL）。
- **seam**：两个 module 相接、可以替换实现的位置。**一个 adapter 只是假想 seam，两个 adapter 才是真实 seam。**
- **adapter**：在 seam 上做形状转换的实现。
- **leverage**：一处改动能覆盖的调用点数量。
- **locality**：同一件事的知识集中在一处。
- **deletion test**：假设删掉这个 module——复杂度是**集中**到了别处（说明它有价值），还是只是**搬走**了（说明它浅）？

### 本项目的 module 命名（已决）

| 名称 | 是什么 | 拥有 | **不拥有** | 依据 |
|---|---|---|---|---|
| **transport** | 数据访问 module（评审候选 01） | 后端地址策略、`{code,data,msg}` 信封、错误分类与拒绝语义、列表分页形状、token 注入 | 任何业务 JSON 列的形状；画布节点语义 | ADR-0001 |
| **flow canvas** | 节点图画布 module（评审候选 02） | 节点/连线的编辑、布局策略、拖入、选中、序列化**机制**、保存时序 | 某个具体 JSON 列的字段名；后端端点知识 | ADR-0001 |
| **document adapter** | 域侧的文档适配层（放在页面旁，不在上面两个 module 内） | 「JSON 列 ↔ 节点图」的**字段映射**、读写端点、节点外观 | 传输策略、画布交互 | ADR-0001 |
| **session module** | 身份与会话 module（`src/api/session.ts`，已实现） | 当前用户信息、登录、登出、会话失效处理 | 会话凭据本身（HttpOnly cookie 由浏览器管理）、后端 URL、页面渲染 | ADR-0003 |
| **media module** | 上传 module（候选 04，未开工） | 上传协议、鉴权、进度、取消 | 具体上传 UI | 候选 04 |

> 认证术语：本项目**不使用 token 认证**。会话凭据是 Django 下发的 HttpOnly `sessionid` cookie，
> 前端不保存、不读取、也不该感知它；登录接口返回的 `token` 字段是 CSRF token，不是认证凭据。
> 详见 ADR-0003。

### 其它架构术语

- **envelope（信封）**：后端统一返回 `{ code, data, msg }`，`code === 0` 为成功。
  transport 负责拆到只剩业务数据；页面不得再判断 `code`。
- **auth failure（鉴权失败）**：transport 的**一等拒绝类型**，不是重定向副作用。
  谁负责跳登录页（session module / 路由守卫）由订阅方决定。
- **fake pagination（假分页）**：`page:1, limit:1000` 全量拉取后在浏览器内切页。
  本项目 17 处；`DataTable` 的「共 N 条」是已加载条数，不是服务端总数。
- **document round-trip（文档往返）**：`serialize(parse(json)) == json`（按 ADR-0002 的口径）。
  这是 `flow canvas` 与 `document adapter` 的第一条测试。
- **dead seam（死 seam）**：存在但零引用的代码/目录，如 `ContentControlFlow - 备份/`、`SmodelFlow`、
  `xyflow/NodeTypes`、`xyflow/DevTools`。它们不承载复杂度，只增加探索成本。

### 不用这些词

指 module 时不用 *component / service / unit*；指 interface 时不用 *API / signature*；
指 seam 时不用 *boundary*；指 module 时不用 *layer / wrapper*。

---

## 三、待定术语（下一步讨论后再落定）

- **字段映射的形态**：域侧用「声明式字段表」还是「域侧适配函数」传给 canvas？Step 2 决定，ADR-0001 只固定了归属。
- **控制图 `show` 的语义**：显示/隐藏 还是 启用/禁用？统一前不要新增第三种写法。
- **`e_base`**：`"1_2_3_4_5_6"` 形式的展项基础按钮集，编码规则尚未文档化。
- **内容控制图与展项快捷控制图是否最终合并**：见 ADR-0002，需要后端 + 前端大屏协同后才能讨论。
