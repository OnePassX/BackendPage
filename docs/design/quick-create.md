# 快捷创建组件（quick-create）完善方案

- **状态**：✅ 已确认（2026-11-18），开发中
- **涉及页面**：`src/app/quick-create.tsx`（路由 `/server/quickcreate`）
- **新增目录**：`src/components/quick-create/forms/`
- **日期**：2026-11-18

## 已确认的决策

| 决策点 | 结论 |
|---|---|
| P0 范围 | **一次全做**（展区/展项/内容/设备/命令/软件模式/硬件模式 + 模式切换） |
| 展馆层级 | **快捷页显示并可增改展馆**（中列改为 展馆 → 展区 → 展项 三级） |
| 删除 | **P0 不做**（删除仍在后台管理页） |
| 内容表单 | **完整表单**（含文件上传、类型/存储/开关/排序等全部字段） |

---

## 0. 一句话结论

在现有「控制台」上补齐 8 个创建/编辑入口，**全部复用管理端已有 API**；
P0 阶段**不需要新增后端接口**；改动只落在 `quick-create.tsx` + 新增表单组件，
**不修改**任何现有管理页、画布组件和 API 函数签名。

---

## 1. 现状盘点

### 1.1 已有能力

| 区域 | 能力 | 状态 |
|---|---|---|
| 顶部 | 时间/日期/星期（每分钟刷新）、全屏、刷新页面 | ✅ |
| 顶部 | 欢迎词编辑（Sheet + `/main/api/get_welcome_txt`） | ✅ |
| 顶部 | 整馆指令（`HardwareControlPage` 覆盖层） | ✅ |
| 左列 | 硬件模式列表（含「编辑模式」徽标） | ⚠️ 只能看，不能切换/编辑 |
| 左列 | 软件模式列表（含「编辑模式」徽标） | ⚠️ 只能看，不能切换/编辑 |
| 中列 | 展区/展项列表、展开折叠、选择展项 | ✅ |
| 右列 | 内容列表 + 内容控制（`SoftwareControlPage`） | ✅ |
| 右列 | 设备列表 + 设备控制（`HardwareControlPage2`） | ✅ |
| 右列 | 展项讲解词编辑/保存 | ✅ |
| 主题色 | `/main/api/eh_message` 返回整馆色系 | ✅ |

### 1.2 已加按钮但 handler 为空（本次要补齐）

| 位置 | 按钮 | 应有行为 | 依赖 |
|---|---|---|---|
| 硬件模式列 | 添加硬件模式 | 新增 `hmodel` | `addHmodel` |
| 硬件模式卡片 | 编辑模式 | 编辑 `hmodel` | `getHmodelList` + `updateHmodel` |
| 软件模式列 | 添加软件模式 | 新增 `smodel` | `addSmodel` |
| 软件模式卡片 | 编辑模式 | 编辑 `smodel` | `getSmodelList` + `updateSmodel` |
| 展区行 | 添加展区 | 新增 `machine`（挂到展馆） | `addMachine` |
| 展区行 | 编辑展区 | 编辑 `machine` | `getMachineList` + `updateMachine` |
| 展区行 | 添加展项 | 新增 `exhibit`（挂到展区） | `addExhibit` |
| 内容列表 | 添加内容 | 新增 `content`（挂到展项） | `addContent` + 上传 |
| 设备列表 | 添加设备 | 新增 `device`（挂到展项/展区） | `addDevice` |
| 设备控制 | 添加命令 | 新增 `code`（挂到设备） | `addCode` |

### 1.3 数据结构缺口（必须先解决）

`getExhibitList()` 把 `/main/api/getList` 返回的三层树**拍平成了「展区列表」**：

```
getList → [{ pavilion, data: [{ machine, data: [{ exhibit }] }] }]
当前    → exhibitList = [machine...]（展项在 machine.data 里）
```

**问题**：展馆（pavilion）id 丢失 → 「添加展区」不知道挂哪个展馆；「编辑展区」拿不到 `m_p`。

**方案**：页面内保留完整树 `tree`，由它派生展区列表（纯前端改动，不动后端）。

---

## 2. 目标与边界

### 2.1 目标

把快捷页从「只能控制」升级为「**控制 + 快捷创建/编辑**」：
在触摸屏/大屏上直接增改展区、展项、内容、设备、设备命令、软件/硬件模式，不必跳回管理后台。

### 2.2 不影响其他组件的 5 条硬约束

1. **只新增组件**：表单组件放在 `src/components/quick-create/forms/`，不修改
   `pavilion.tsx` / `machine.tsx` / `exhibition.tsx` / `content.tsx` /
   `device/index.tsx` / `model/smodel.tsx` / `model/hmodel.tsx`。
2. **API 只调用不改造**：不修改 `src/api/*.js` 已有函数的名称/签名/返回值；
   如需包装，只在 `src/api/quick.js` 里新增。
3. **两套请求客户端隔离**（已经完成）：
   - 控制类 `/main/api/*` → `quickClient`（绝对地址、无会话）
   - 创建类 `/api/*` → `apiClient`（相对路径 + Vite 代理 + 会话 cookie）
4. **不做全局刷新**：创建成功后只刷新快捷页自身数据，不触发其它页面的 `fetchTree`。
5. **不改路由/布局**：`/server/quickcreate` 仍在 `BackendLayout`（需登录）下，
   因此可以安全使用管理端接口。

---

## 3. 功能范围

### P0（本次开发范围）

| # | 功能 | 说明 |
|---|---|---|
| 1 | 添加/编辑 **展区**（machine） | 展馆下拉（来自树）+ 名称/简介/备注/显示/排序 |
| 2 | 添加/编辑 **展项**（exhibit） | 所属展区固定为当前展区；名称/IP/简介/备注/显示/排序 |
| 3 | 添加/编辑 **内容**（content） | 所属展项固定为当前展项；含文件上传、类型/存储/开关等完整字段 |
| 4 | 添加/编辑 **设备**（device） | 区域/绑定固定为当前展项或展区；名称/IP/类型/厂家/探活/排序 |
| 5 | 添加/编辑 **设备命令**（code） | 所属设备固定为当前设备；命令/类型/格式/协议/端口/备注 |
| 6 | 添加/编辑 **软件模式**（smodel） | 名称/介绍/状态/图标/排序/备注 |
| 7 | 添加/编辑 **硬件模式**（hmodel） | 同上 |
| 8 | **切换当前模式** | 点模式卡片 → 二次确认 → `change_Global_Model` / `change_Global_HwModel` |

### P1（后续）

- 展馆（pavilion）增改（快捷页目前不显示展馆层级）
- 内容控制命令（`/control`）的快捷新增
- 删除能力（带二次确认）
- 展区/展项排序（上移/下移）

### P2（可选）

- 批量创建（粘贴多行）
- 从模板复制整套展厅结构
- 模式绑定（smodelbind/hmodelbind）快捷配置

### 明确不做

- 不重写控制逻辑（`SoftwareControlPage` / `HardwareControlPage` 保持原样）
- 不做权限/角色差异
- 不做离线缓存

---

## 4. 复用清单

### 4.1 API（全部已存在）

| 实体 | 读取 | 新增 | 编辑 |
|---|---|---|---|
| 展馆 | `getPavilionList` | `addPavilion` | `updatePavilion` |
| 展区 | `getMachineList` | `addMachine` | `updateMachine` |
| 展项 | `getExhibitList` / `getExhibitTree` | `addExhibit` | `updateExhibit` |
| 内容 | `getContentList({e_id})` | `addContent` | `updateContent` |
| 设备 | `getDeviceList({area,link})` | `addDevice` | `updateDevice` |
| 设备命令 | `getCodeList({device})` | `addCode` | `updateCode` |
| 内容命令 | `getControlList({e_id})` | `addControl` | `updateControl` |
| 软件模式 | `getSmodelList` | `addSmodel` | `updateSmodel` |
| 硬件模式 | `getHmodelList` | `addHmodel` | `updateHmodel` |
| 图标 | `getIconList` | — | — |
| 上传 | `apiUploadContent` | — | — |

> 编辑时统一用「列表接口 + 按 id 查找」预填表单（后端没有单条详情接口，也不需要）。

### 4.2 表单字段与校验（对齐现有管理页，避免两套规则）

| 实体 | 字段（默认值） |
|---|---|
| 展馆 | `p_name`、`p_summary`、`p_re`、`show:1`、`sort:0` |
| 展区 | `m_name`、`m_p`(必填，下拉)、`m_summary`、`m_re`、`show:1`、`sort:0` |
| 展项 | `e_name`、`e_m`(固定)、`e_ip`、`e_summary`、`e_re`、`e_base:"1_2_3_4_5_6"`、`show:1`、`sort:0` |
| 内容 | `e_id`(固定)、`c_name`、`c_file_status:1`、`c_file_type:1`、`c_file_name`、`c_file_addr`、`c_open:""`、`c_status:1`、`c_default:2`、`c_startup:2`、`c_control:""`、`c_iframe:""`、`c_iframe_show:2`、`c_link:""`、`note`、`sort:1` |
| 设备 | `num:"无"`、`name`、`dtype:1`、`ip`、`conpare`、`area`(固定)、`link`(固定)、`other`、`major:false`、`probe_enabled:false`、`sort:0` |
| 设备命令 | `device`(固定)、`code`、`name`、`ctype:10`、`cformat:2`、`protocal:4`、`cport:5566`、`note` |
| 内容命令 | `e_id`(固定)、`name`、`cformat:1`、`protocal:4`、`ip`、`port:10023`、`code`、`note`、`sort:0` |
| 软件/硬件模式 | `name`、`msg`、`status:1`、`icon:null`、`sort:0`、`note` |

**校验规则**（与管理页一致）：
- 名称必填；
- 展区必须选展馆；
- 设备 IP 必填、`probe_enabled` 仅当 `dtype ∈ [3,4]` 可启用；
- 内容：`c_file_status===1`（服务器存储）时禁用网页地址；`c_file_type` 为 1 时才有程序名/控制 JSON；
- 保存中禁用按钮，防重复提交。

### 4.3 可复用组件

- `@/components/upload-file`：内容文件上传（受控，已有）
- `@/components/delete-dialog`：P1 删除确认
- `@/components/ui/field`：`Field / FieldGroup / FieldLabel` 统一表单布局
- `@/components/ui/select`、`input`、`textarea`、`dialog`
- `@/components/quick-create/Modal`（`XJ_Modal`）：二次确认弹窗（已存在）

---

## 5. 实现设计

### 5.1 新增文件

```
src/components/quick-create/forms/
├── EntityDialog.tsx      # 通用弹窗外壳（标题/保存中/取消/保存）
├── form-options.ts       # 复用的下拉选项（设备类型/区域/命令类型/格式/协议）
├── PavilionForm.tsx      # P1
├── MachineForm.tsx
├── ExhibitForm.tsx
├── ContentForm.tsx
├── DeviceForm.tsx
├── CodeForm.tsx
├── SmodelForm.tsx
└── HmodelForm.tsx
```

`quick-create.tsx` 只负责：打开哪个弹窗、传当前上下文（展馆/展区/展项/设备 id）、
保存成功后刷新数据。

### 5.2 数据结构调整（仅页面内）

```ts
// 新增：保留完整树
const [tree, setTree] = useState([]);   // [{id,name,data:[{id,name,show,data:[exhibit]}]}]
// 派生：展区列表（原来直接拍平）
const exhibitList = useMemo(() => tree.flatMap(p => (p.data ?? []).filter(m => m.show == 1)), [tree]);
```

这样：
- 添加展区 → 展馆下拉来自 `tree`
- 编辑展区 → `m_p` 从树里反查
- 添加展项 → `e_m = currentHall`
- 不影响现有渲染逻辑（`exhibitList` 结构不变）

### 5.3 保存后刷新策略

| 操作 | 刷新调用 | 选中态处理 |
|---|---|---|
| 展区增/改 | `get_List()` → 更新 tree | 保持 `currentHall`，新展区自动展开 |
| 展项增/改 | `get_List()` | 新增后自动选中该展项并触发 `onExhibitChange` |
| 内容增/改 | `get_Content_List(e_id)` | 保持 `currentContent` |
| 设备增/改 | `get_Device(e_id)` | 保持 `currentDevice` |
| 命令增/改 | `get_Device_Code(device_id)` | 由 `HardwareControlPage2` 内部刷新；必要时通过 `key` 重挂载 |
| 模式增/改 | `get_Model_List()` / `get_HwModel_List()` + `get_Now_HwModel()` | 保持当前模式 |
| 切换模式 | `change_Global_Model` / `change_Global_HwModel` | 成功后刷新模式列表 |

### 5.4 交互细节

- 所有「添加/编辑」按钮打开 **Dialog**（与 `Modal.tsx` 风格一致），移动端/大屏都可用；
- 模式卡片：**点击卡片 = 切换模式**（二次确认），**「编辑模式」徽标 = 打开编辑弹窗**（徽标加 `stopPropagation`）；
- 「添加命令」在未选设备时禁用（已有逻辑保留）；
- 表单保存中禁用「保存/取消」；
- 保存成功 toast 提示（复用 sonner）。

---

## 6. 后端接口需求

### 结论：P0 不需要新增接口

现有 `/api/pavilion|machine|exhibition|content|device|code|control|smodel|hmodel/*` 已覆盖全部 CRUD；
`/upload/uploadContent` 已支持文件上传；`/api/icon/list` 支持模式图标。

### 建议增强（可选，非阻塞）

| # | 需求 | 原因 | 优先级 |
|---|---|---|---|
| 1 | `/main/api/getList` 增加返回 `p_id`（展馆 id） | 前端目前拿不到展馆 id；不改也能用（前端改用 `/exhibition/tree`） | 低 |
| 2 | 批量创建接口（如 `POST /exhibition/batchAdd`） | P2 批量创建时减少请求数 | 低 |
| 3 | 单条详情接口（如 `GET /content/detail/<id>`） | 现在用列表接口按 id 查找，数据量大时略浪费 | 低 |

> 如果以后快捷页要在**未登录**的触摸屏上运行，则创建类接口需要后端提供免登录版本
> （当前页面在 `/server` 下，必须登录，所以暂不需要）。

---

## 7. 影响面与风险

| 项 | 影响 |
|---|---|
| 修改文件 | 仅 `src/app/quick-create.tsx` |
| 新增文件 | `src/components/quick-create/forms/*` |
| 管理页 | **零改动** |
| 画布/ExhibitionFlow | **零改动** |
| API 层 | 零签名改动（只新增调用） |
| 路由 | 零改动 |
| 全局 CSS | 零改动 |

**风险**

1. 与后台管理页同时编辑同一条数据 → 以最后一次保存为准（正常行为，不额外处理）。
2. `getList` 只返回 `show=1` 的展项 → 快捷页看不到隐藏展项；编辑入口需要 `show=0` 的数据时，
   改用管理接口 `getExhibitList` 兜底（P1 处理）。
3. 命令列表刷新依赖子组件内部状态 → 需要时通过 `key` 重挂载 `HardwareControlPage2`（不改其内部实现）。

---

## 8. 验收标准

- [ ] 10 个按钮全部可用（新增/编辑），表单字段与管理页一致
- [ ] 保存后列表即时刷新，选中项不丢
- [ ] 模式点击可切换（二次确认 + 成功提示）
- [ ] 管理页（展馆/展区/展项/内容/设备/命令/模式）功能无回归
- [ ] `tsc` 保持 6 个基线错误、`lint` 0 error
- [ ] 不影响 `main.tsx` 画布与其它页面

---

## 9. 分期与工作量

| 阶段 | 内容 | 估时 |
|---|---|---|
| P0-1 | 数据结构改造（树）+ 通用 `EntityDialog` + 下拉选项 | 0.5 天 |
| P0-2 | 展区、展项表单（含刷新与选中保持） | 0.5 天 |
| P0-3 | 内容表单（含文件上传） | 0.5–1 天 |
| P0-4 | 设备、设备命令表单 | 0.5–1 天 |
| P0-5 | 软件/硬件模式表单 + 模式切换 | 0.5 天 |
| P0-6 | 联调、回归、文档 | 0.5 天 |
| **合计** | | **约 3–4 天** |

---

## 10. 实施记录（2026-11-18）

### 已完成

| 功能 | 状态 | 说明 |
|---|---|---|
| 展馆 新增/编辑 | ✅ | 中列顶部「添加展馆」、展馆行铅笔按钮 |
| 展区 新增/编辑 | ✅ | 展馆行「展区」按钮、展区行铅笔按钮 |
| 展项 新增/编辑 | ✅ | 展区行「展项」按钮、展项行铅笔按钮 |
| 内容 新增/编辑 | ✅ | 内容列表头部「编辑内容 / 添加内容」，完整表单 + 文件上传 |
| 设备 新增/编辑 | ✅ | 设备列表头部「编辑设备 / 添加设备」 |
| 设备命令 新增 | ✅ | 设备控制头部「添加命令」；保存后通过 `key` 重挂载 `HardwareControlPage2` 刷新 |
| **软件命令 编辑** | ✅ | 内容控制里每个快捷控制按钮旁「编辑」→ `updateControl`，保存后刷新内容/控制列表 |
| **硬件命令 编辑** | ✅ | 设备控制里每条命令的「编辑」→ `updateCode`，保存后重挂载命令列表 |
| 软件/硬件模式 新增/编辑 | ✅ | 模式卡片「编辑模式」徽标、列表底部「添加模式」 |
| 中列展区/展项 | ✅ | **页面顶部**展厅切换条（点击卡片切换，当前项用主题色高亮），中列只展示当前展厅的展区/展项；切换展厅会清空右侧选中 |
| **添加/编辑统一显隐** | ✅ | 「欢迎词编辑」旁的「显示编辑 / 隐藏编辑」开关，统一控制 15 处添加/编辑入口（默认隐藏） |
| **内容控制按钮 添加/编辑** | ✅ | 内容控制（EXE 类型）1~5 级均可「添加按钮」；节点卡片高度 72px，**底部同行**放置「下级 / 编辑」按钮（五级只有「编辑」）；可编辑名称/显示/排序 + 内容指令/设备指令（写入 `c_control`）；指令的 `label`/`delay` 可编辑；保存后保留树的展开层级 |
| **展项快捷控制（e_link）** | ✅ | 右列新增「快捷控制」Tab：展示/下发 e_link 按钮，支持添加/编辑按钮与设备指令（写入 `e_link`） |
| **展项 e_base 字段** | ✅ | 展项新增/编辑弹窗补充「基础功能显示」（多选 Combobox，`_` 连接），规则与 `pme.tsx` 的 BaseBtnItems 一致，默认 `1_2_3_4_5_6` |
| **内容命令 Tab** | ✅ | 新增「内容命令」Tab：列出当前展项的内容控制命令（`/control`），支持新增/编辑（`addControl` / `updateControl`） |
| **软件命令编辑入口** | ✅ | 已按需求移除（内容控制按钮旁不再有编辑入口，改由「内容命令」Tab 管理） |
| 模式切换 | ⛔ 已移除 | 按需求删除（点击卡片不再切换模式） |

### 与规划的偏差

1. **表单文件合并**：原计划 8 个表单文件，实际合并为
   `forms/QuickForms.tsx`（8 个表单组件）+ `forms/EntityDialog.tsx` + `forms/options.ts`，
   减少重复的弹窗外壳代码。
2. **删除**：按确认不做。
3. **编辑入口位置**：内容/设备的编辑按钮从「列表头部」改到「列表项内」
   （`SelectableList` 增加 `onEdit` 回调）；软件命令编辑在内容控制按钮旁，
   硬件命令编辑在设备控制每条命令上。

### 关键实现细节

- **编辑前先拉管理端数据**：快捷接口（`/main/api/*`）返回的字段不全，
  直接用它预填表单会在保存时覆盖丢失字段。因此所有「编辑」按钮都走
  `loadAndEdit(kind, id, fetcher)`：先调管理端列表接口按 id 取完整行，再打开弹窗。
- **两套请求客户端**：控制类 `/main/api/*` 用 `quickClient`；创建类 `/api/*` 用 `apiClient`
  （会话 cookie + 相对路径）。
- **刷新策略**：展馆/展区/展项 → `get_List()`；内容 → `get_Content_List(eid)`；
  设备 → `get_Device(eid)`；命令 → `setCodeRefreshKey` 重挂载子组件；模式 → `get_Model_List` / `get_HwModel_List`。
- **不影响其他组件**：只改了 `quick-create.tsx` + 新增 `components/quick-create/forms/*`，
  管理页与画布零改动。

### 验证

- `tsc`：6 个错误（仓库基线，quick-create 相关 0 错误）
- `lint`：0 errors
- 所有 `@/api/*` 导入已逐项核对存在（JS 模块无类型声明，TS 不会报缺失）


## 11. 原待确认问题（已全部确认）

1. **展馆层级**：快捷页要不要显示/创建「展馆」（pavilion）？还是只到展区层级（展馆在后台管理）？
2. **删除**：P0 是否要带删除能力？还是只做新增/编辑？
3. **内容表单**：是否要完整支持文件上传 + 全部字段？还是先只做名称/类型/地址等基础字段？
4. **模式图标**：编辑模式时是否要支持选择图标（`getIconList`）？
5. **展项字段**：快捷页要不要 `mac`（MAC 地址）字段（管理页最近加的）？
6. **刷新策略**：新增展项后是否自动选中并加载其内容/设备？
7. **优先级**：P0 是一次性全做，还是先做「展区/展项/内容」三项，设备/命令/模式下一轮？
