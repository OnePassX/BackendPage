# main.tsx 功能补齐记录

本文件记录 `src/app/main.tsx`（展厅拓扑画布）的功能补齐过程。编号沿用
2026-11-13 的缺口清单，每完成一项就在对应小节记录改动、验证与遗留问题。

## 总览

| 编号 | 缺口 | 批次 | 状态 | 完成日期 |
|---|---|---|---|---|
| 4 | 内容弹窗 3 个开关不生效 | 第一批 | ✅ 已完成 | 2026-11-13 |
| 5 | 内容「排序」写进设备表单 | 第一批 | ✅ 已完成 | 2026-11-13 |
| 15 | 内容控制编辑取错字段（`eid` → `e_id`） | 第一批 | ✅ 已完成 | 2026-11-13 |
| 16 | 连线成功提示错位 | 第一批 | ✅ 已完成 | 2026-11-13 |
| 17 | 断开连线判空恒真 / 用错字段 | 第一批 | ✅ 已完成 | 2026-11-13 |
| 18 | 死代码：`getControlList` 导入、`handleContentControlSave` | 第一批 | ✅ 已完成 | 2026-11-13 |
| 2 | 节点上的快捷添加按钮是假按钮 | 第二批 | ✅ 已完成 | 2026-11-13 |
| 6 | 文件上传未接线（`FileUpload` 零输出） | 第二批 | ✅ 已完成 | 2026-11-13 |
| 9 | 内容弹窗缺联动与字段（对齐 `content.tsx`） | 第三批（部分） | ✅ 已完成 | 2026-11-13 |
| 19 | 内容弹窗「文件地址」标签写错 | 第三批（部分） | ✅ 已完成 | 2026-11-13 |
| 21 | 展项节点缺「编辑快捷控制」入口（e_link） | 第四批 | ✅ 已完成 | 2026-11-13 |
| 22 | 内容节点缺「文件下发」入口 | 第四批 | ✅ 已完成 | 2026-11-13 |
| 1 | 设备命令编辑完全没实现 | 第五批 | ✅ 已完成 | 2026-11-13 |
| 3 | 右键菜单 8 个条目全无 handler | 第六批 | ✅ 已完成 | 2026-11-13 |
| 7 | 侧栏只能添加展厅 | 第七批 | ✅ 已完成 | 2026-11-13 |
| 11 | 设备在线探测未接入 | 第七批 | ✅ 已完成 | 2026-11-13 |
| 13 | 画布没有搜索/过滤 | 第七批 | ✅ 已完成 | 2026-11-13 |
| 23 | 设备弹窗缺「设备探活」开关 | 第八批 | ✅ 已完成 | 2026-11-13 |
| 24 | 两个控制流程 Drawer 关闭时整树刷新，观感差 | 第九批 | ✅ 已完成 | 2026-11-13 |

后续批次（1/2/3/6、7/9/10、8/13/14）在开工时追加到本文件。

## 约定

- 每项记录包含：**现象 → 原因 → 改动 → 验证**。
- 验证方式固定为：`tsc -p tsconfig.app.json --noEmit`（错误数不增加）、
  `npm run lint`（不新增告警）、以及能在后端/浏览器复现的手工路径。
- 编号与缺口清单一一对应，便于回溯到评审报告。

---

# 第一批（2026-11-13）

## 4. 内容弹窗 3 个开关不生效

- **状态**：✅ 已完成
- **位置**：内容编辑弹窗（`c_default` / `c_startup` / `c_iframe_show`）

**现象**
弹窗里「当前打开状态」「默认启动状态」「控制地址是否显示」三个开关可以拨动，
但保存后重新打开又回到原值，后端数据从未改变。

**原因**
三个 `<Switch>` 都只写了 `defaultChecked`（非受控），没有 `onCheckedChange`，
拨动只改变浏览器内部的 DOM 状态，`contentFormData` 从未更新，提交时发出去的仍是初始值。

**改动**
改为受控开关，并把布尔值映射回后端的 1/2 编码（后端 `DEFAULT_STATUS` /
`STARTUP_STATUS` / `IFRAME_SHOW_STATUS` 均为 1=是、2=否）：

```diff
- <Switch id="c_default" size="default" defaultChecked={contentFormData.c_default === 1?true:false}/>
+ <Switch id="c_default" size="default"
+     checked={contentFormData.c_default === 1}
+     onCheckedChange={(checked) => setContentFormData({ ...contentFormData, c_default: checked ? 1 : 2 })}/>
```

`c_startup`、`c_iframe_show` 同样处理。

**验证**
- `tsc`：错误数不变（8）。
- 手工：编辑任一内容 → 拨动三个开关 → 保存 → 重新打开，开关状态与保存前一致。

## 5. 内容「排序」写进设备表单

- **状态**：✅ 已完成
- **位置**：内容编辑弹窗底部「排序」

**现象**
在内容弹窗里改排序，内容本身的顺序不变；反而设备编辑弹窗里的排序值被改掉了。

**原因**
该输入框复制自设备弹窗，`value`/`onChange` 都还指向 `devForm`：

```tsx
<Input id="sort" type="number" value={devForm.sort}
    onChange={(e) => setDevForm({ ...devForm, sort: Number(e.target.value) })}/>
```

**改动**
改为绑定内容表单：

```diff
- value={devForm.sort} onChange={(e) => setDevForm({ ...devForm, sort: Number(e.target.value) })}
+ value={contentFormData.sort} onChange={(e) => setContentFormData({ ...contentFormData, sort: Number(e.target.value) })}
```

**验证**
- `tsc`：错误数不变（8）。
- 手工：内容弹窗改排序 → 保存 → 重新打开为新的值；再打开设备弹窗，排序未被改动。

## 15. 内容控制编辑取错字段

- **状态**：✅ 已完成
- **位置**：`handleContentControlEdit`

**现象**
从内容节点菜单打开「内容控制」抽屉时，控制流程拿不到所属展项的 IP
（`defaultIp` 为空），命令里需要 IP 的地方只能手填。

**原因**
节点数据里父展项 id 的字段名是 `e_id`（`ExhibitionFlow.tsx` 的 `makeContentNode`
写入 `e_id: c.e_id`），代码却读成了 `node.eid`，`find` 永远找不到，`e?.e_ip` 恒为
`undefined`。另外 `FlowNodeData` 没有声明 `e_id`，通过索引签名取到的是 `unknown`。

**改动**
```diff
- const e = exhibits.find((x) => x.id === node.eid);
+ // 内容节点的父展项 id 存在 e_id（ExhibitionFlow 的 makeContentNode 写入），
+ // 不是 eid；取不到时退回节点自带的 ip，避免控制流程丢失设备地址
+ const e = exhibits.find((x) => x.id === Number(node.e_id));
```

同时删掉了该函数里的 `console.log(node)`。

**验证**
- `tsc`：错误数不变（8）。
- 手工：内容节点菜单 →「内容控制」→ 抽屉内的命令表单能带出该展项 IP。

## 16. 连线成功提示错位

- **状态**：✅ 已完成
- **位置**：`handleLinkNodes`

**现象**
画布上把「展厅」连到「展区」时，提示「展项已关联到展馆」；把「展区」连到「展项」时，
提示「展品已关联到展项」。提示与实际操作不符，排查时容易误判。

**原因**
提示文案是从别的层级复制过来的，没有跟着业务层级改名。术语对照见 `GLOSSARY.md`：
展厅 `pavilion` / 展区 `machine` / 展项 `exhibit`。

**改动**
```diff
- toast.success("展项已关联到展馆");   // 展厅 → 展区
+ toast.success("展区已关联到展厅");

- toast.success("展品已关联到展项");   // 展区 → 展项
+ toast.success("展项已关联到展区");
```

设备分支原有文案（「设备已关联到展厅」「设备已关联到展项」）正确，未改动。

**验证**
- 手工：分别做四条连线，提示与层级一致。

## 17. 断开连线判空恒真 / 用错字段

- **状态**：✅ 已完成
- **位置**：`handleDeleteLink`

**现象**
1. 断开一个本来就没有关联的节点，也会发一次把 `m_p/e_m/link` 置空的请求。
2. 设备分支判断用的是 `target.e_m`（展项的字段），与设备无关。

**原因**
四处判空写成了 `target?.m_p || target.m_p !== null`：

- 前半段是「有值」，后半段 `!== null` 对 `undefined` 也为真；
- 两者相或，只要节点对象存在就恒为真，等于没判断。

**改动**
四支统一改成 `!= null`（同时排除 `null` 与 `undefined`），设备分支改用 `target.link`：

```diff
- if(target?.m_p || target.m_p !== null){
+ if (target.m_p != null) {
...
- if(target?.link || target.e_m !== null){     // 设备分支
+ if (target.link != null) {
```

顺带删除了该函数里的 `console.log(source,target)`。

**验证**
- `tsc`：错误数不变（8）。
- 手工：断开已关联的连线 → 生效并提示；对未关联节点拖动断开 → 不产生请求（无提示）。

## 18. 死代码清理

- **状态**：✅ 已完成
- **位置**：导入区、`handleContentControlSave`、内容控制 Drawer 底部

**现象**
- `getControlList`、`updateContentControl` 导入后没有任何调用；
- `handleContentControlSave` 从未被调用，Drawer 底部的「提交」按钮整行被注释；
- 该函数存在会让人误以为内容控制的保存由外层负责。

**原因**
内容控制的保存已经由 `ContentControlFlow` 内部负责（`ContentControlFlow.tsx:510`
的 `handleSave` → Sidebar 的「保存控制流程」按钮，`ContentControlSidebar.tsx:644`）。
外层 Drawer 只需要提供关闭。

**改动**
1. 导入去掉 `updateContentControl`、`getControlList`；
2. 删除 `handleContentControlSave` 整个函数；
3. Drawer 底部改为只保留「关闭」，并注明保存由内部按钮负责：

```diff
- {/* <Button className="flex-1" onClick={handleContentControlSave}>提交</Button> */}
+ {/* 保存动作由 ContentControlFlow 内部的「保存控制流程」按钮负责，这里只提供关闭 */}
```

**验证**
- `tsc`：错误数不变（8）。
- `lint`：138 → 136 warnings（死代码减少两条告警）。
- 手工：内容控制抽屉内「保存控制流程」仍可正常保存。

---

# 第二批（2026-11-13）

## 2. 节点上的快捷添加按钮是假按钮

- **状态**：✅ 已完成
- **位置**：`src/components/ExhibitionFlow/PavilionNode.tsx`、`ExhibitNode.tsx`

**现象**
节点底部有两个圆形「+」按钮（展区 / 内容 / 设备）。展厅节点的「展区」「设备」按钮正常，
但展项节点的「内容」按钮点下去只弹 `window.alert("Handle button has been clicked!")`。

**原因**
两个文件顶部都留着一个模板函数：

```tsx
const onClick = () => { window.alert(`Handle button has been clicked!`); };
```

- `PavilionNode.tsx`：两个按钮已经改成 `actions.onAddChild(data, 'machine' | 'device')`，
  这个 `onClick` **从未被引用**，是纯死代码。
- `ExhibitNode.tsx`：设备按钮已正确接线，但「内容」按钮仍在用这个 `onClick`。

**改动**
1. `PavilionNode.tsx`：删除未使用的 `onClick`，并去掉随之无用的 `PlusIcon` 导入。
2. `ExhibitNode.tsx`：删除 `onClick`，把「内容」按钮接到既有的子节点动作上
   （与同文件「设备」按钮、与 `PavilionNode` 的写法保持一致）：

```diff
- <Button onClick={onClick} …>
+ <Button onClick={() => actions.onAddChild(data, "content")} …>
```

该动作经 `FlowActions.onAddChild` → `main.tsx` 的 `handleAddChild` 分发到
`node.kind === "exhibit" && type === "content"` → `openContentAdd(node)`，
即打开内容新增弹窗（e_id 自动填当前展项）。

同时去掉 `ExhibitNode` 里无用的 `FileIcon` 导入。

**验证**
- `tsc`：错误数 8 → 7（顺带消掉了 `onAddNode` 的联合类型不匹配，见下方「附带改动」）。
- 手工：展项节点点「内容」→ 弹出新增内容弹窗，且「所属展项」已带上。

## 6. 文件上传未接线（`FileUpload` 零输出）

- **状态**：✅ 已完成
- **位置**：`src/components/upload-file.tsx`、`src/app/main.tsx` 内容弹窗

**现象**
内容弹窗里的上传区域可以选文件、也会提示"上传成功"，但保存后内容仍然没有文件：
`c_file_name` / `c_file_addr` 从未被写入表单。另外这个组件本身也上传不了——
它用裸 `XMLHttpRequest` 打 `http://127.0.0.1:8000/api/upload/`（不是后端地址），
请求头写成 `X‑CSRFToken`（U+2011 非断行连字符，浏览器会直接抛错），且不带会话凭据。

**原因**
1. `FileUpload` 的接口只有 `{ accept, maxSize }`，**没有任何输出**，父组件拿不到上传结果；
2. 组件自己实现了一套上传协议，绕过了 transport，与 `content.tsx` 里的正确实现重复；
3. 组件内的 class 名也混入了 U+2011（`space‑y‑1`、`text-muted‑foreground`、`flex‑1`），样式不生效。

**改动**
1. **重写 `upload-file.tsx`**，改为受控输出、走 transport：

| 项 | 改动前 | 改动后 |
|---|---|---|
| 上传实现 | 裸 XHR + 硬编码 `127.0.0.1:8000` | `apiUploadContent`（经 apiClient，自动带 cookie / CSRF / 错误归一） |
| 输出 | 无 | `onUploaded({name, url})`、`onClear()`、`onUploadingChange(bool)` |
| 回显 | 无 | `value` / `fileName` 两个受控 prop，编辑时显示已有文件 |
| 取消 | 无 | `AbortController`，换文件/卸载时中断，并用请求身份判断避免旧请求覆盖新请求状态 |
| 进度 | 有（但请求发不出去） | 复用 transport 的 `onUploadProgress` |
| class 名 | 含 U+2011 | 修正为正常连字符 |

   后端 `/upload/uploadContent` 返回 `{ code, msg, url, name }`（无 `data` 包装），
   组件按 `res.name` / `res.url` 回填，与 `content.tsx` 的读法一致。

2. **在 `main.tsx` 内容弹窗接线**：

```diff
- <FileUpload accept=".jpg,.png,.jpeg,.pdf,.mp4,.zip,.pptx" maxSize={5 * 1024 * 1024 * 1024}/>
+ <FileUpload
+     accept=".jpg,.png,.jpeg,.pdf,.mp4,.zip,.pptx"
+     maxSize={5 * 1024 * 1024 * 1024}
+     value={contentFormData.c_file_addr}
+     fileName={contentFormData.c_file_name}
+     onUploaded={({ name, url }) => setContentFormData((prev) => ({ ...prev, c_file_name: name, c_file_addr: url }))}
+     onClear={() => setContentFormData((prev) => ({ ...prev, c_file_name: "", c_file_addr: "" }))}
+ />
```

**验证**
- `tsc`：无新增错误。
- 手工：内容弹窗选文件 → 进度条走完 → 显示文件名与地址 → 保存 → 重新打开仍显示该文件。
- 手工：编辑已有内容时上传区域显示原文件名/地址；点「清空文件」后保存，文件字段被清空。

**附带改动（工作区里已有的未提交修改，一并提交）**
- `main.tsx`：`handleAddNode` 的参数联合类型补上 `"device"`，消掉既有的 `TS2322`。
- `ExhibitionFlow.tsx`：删除一处多余空行。

---

# 第三批（部分）：内容表单对齐 exhibition/content.tsx（2026-11-13）

## 9 + 19. 内容弹窗的字段与规则按 `content.tsx` 重做

- **状态**：✅ 已完成
- **位置**：`src/app/main.tsx` 内容编辑/新增弹窗；`src/components/ExhibitionFlow/ExhibitionFlow.tsx` 的 `contents` 属性类型

**现象**
`main.tsx` 的内容弹窗与 `exhibition/content.tsx` 的内容弹窗是两套不同的表单：

| 项 | `main.tsx`（改前） | `content.tsx`（基准） |
|---|---|---|
| 存储位置标签 | 写成「文件地址」，且没有联动 | 「存储位置」，切换时联动 `c_status` |
| 文件类型 | 无联动 | 服务器存储时禁用「网页地址」 |
| 上传区域 | 一直显示 | 仅「服务器存储 + 可上传类型」显示 |
| 文件地址/文件名称 | 无（只有上传） | 非服务器存储时手填 |
| 程序名 `c_open` | 无 | 「程序文件 + 服务器存储」时显示 |
| 控制 JSON / 控制页面 | 无 | 「程序文件」时显示 |
| 当前打开状态 / 开机启动 | 可编辑的 Switch | 只读 Select（由设备端回写） |
| 控制地址显示 / 排序 | Switch + 排序 | Select + 排序 |
| 备注 | 单行 Input | 多行 Textarea |
| 保存按钮 | 始终可用 | 上传中禁用并显示「上传中…」 |

**原因**
两个页面各自维护了一份内容表单，`main.tsx` 这份是早期草稿，字段和联动规则都没跟上。

**改动**

1. **字段与顺序完全对齐 `content.tsx`**（共 14 项）：
   `c_name` → `c_file_status`（存储位置，联动 `c_status`）→ `c_file_type`（文件类型）→
   上传文件 → 文件地址 → 文件名称 → 程序名 `c_open` → 当前打开状态 `c_default`（只读）→
   开机启动 `c_startup`（只读）→ 控制 JSON `c_control` → 控制页面 `c_iframe` →
   Iframe 显示状态 `c_iframe_show` → 排序 `sort` → 展区备注 `note`。

2. **联动规则**（在组件内集中成两个变量，避免条件散落）：

```tsx
const isServerStorage  = contentFormData.c_file_status === 1;
const isUploadableType = [1, 2, 3, 4, 6].includes(contentFormData.c_file_type);
```

| 规则 | 实现 |
|---|---|
| 存储位置=服务器(1) → `c_status=1`；否则 `c_status=2` | `c_file_status` 的 `onValueChange` 内联动 |
| 服务器存储时禁用「网页地址(5)」 | `SelectItem disabled={isServerStorage && item.value === '5'}` |
| 上传区仅服务器存储 + 可上传类型可见 | `className={isServerStorage && isUploadableType ? '' : 'hidden'}` |
| 文件地址 / 文件名称仅非服务器存储可见 | `className={isServerStorage ? 'hidden' : ''}` |
| 程序名仅「程序文件 + 服务器存储」可见 | `className={c_file_type === 1 && isServerStorage ? '' : 'hidden'}` |
| 控制 JSON / 控制页面仅「程序文件」可见 | `className={c_file_type === 1 ? '' : 'hidden'}` |
| 编辑时不可改存储位置与文件类型 | `disabled={Boolean(contentEditing)}` |
| 上传中禁用保存/取消 | 新增 `contentUploading`，接 `FileUpload` 的 `onUploadingChange` |

3. **默认值对齐 `content.tsx` 的 `defaultForm`**：
   `c_open: ""`、`c_control: ""`、`c_default: 2`、`c_startup: 2`、`c_iframe_show: 2`、`sort: 1`
   （改前是 `c_open: 1`、`c_control: {}`、三个状态均为 1、`sort: 0`）。

4. **类型对齐后端模型**：
   - `ContentItem` / `ContentFormData` 的 `c_open` 由 `number` 改为 `string`（后端是 CharField）；
   - `c_control` 由 `object` 改为 `string`（后端是 TextField，前端按 JSON 文本编辑）；
   - `ContentFormData.e_id` 允许 `null`（新增时先为空）；
   - 同步修正 `ExhibitionFlow.tsx` 的 `contents` 属性类型，否则 `ContentItem[]` 传不进去（TS2322）。

5. **删除与基准不一致的字段**：`绑定控制 ID`（`c_link`）输入框。`c_link` 仍保留在表单数据里，
   编辑时原值会随保存回传，不会丢。

6. **移除不再使用的 `Switch` 导入**（状态类字段统一改为 Select）。

**验证**
- `tsc`：7 个错误（与改动前一致，均为既有问题）。
- `npm run lint`：133 → 131 warnings，0 errors。
- 手工（待你在浏览器确认）：
  1. 新增内容 → 存储位置选「展项客户端存储」→ 上传区消失，出现「文件地址」「文件名称」；
  2. 存储位置选回「中控服务器存储」→ 上传区出现，文件类型里的「网页地址」变灰；
  3. 文件类型选「程序文件」→ 出现「控制JSON」「控制页面」；选「视频文件」→ 两者消失；
  4. 文件类型选「程序文件」且服务器存储 → 出现「程序名（带后缀）」；
  5. 编辑已有内容 → 存储位置/文件类型不可改，其余字段带出原值；
  6. 上传过程中「保存」按钮变「上传中…」且不可点。

**后端限制已解除（2026-11-13 确认）**
「存储位置」的 3 个选项（1 中控服务器 / 2 展项客户端 / 3 其他）原本会被
`C_InfoOpSerializer` 的 `max_value=2` 拒绝，该限制已由项目负责人在后端修改，
前端无需再调整。注意：仓库内的 `../ServerControl_V4` 本地副本仍显示 `max_value=2`
（mtime 2026-11-12），实际以部署机为准。

---

# 第四批：节点菜单新增入口（2026-11-13）

## 21. 展项节点：编辑快捷控制（e_link）

- **状态**：✅ 已完成
- **位置**：`ExhibitNode.tsx` 下拉菜单、`ExhibitionFlow` 的 `FlowActions`、`main.tsx` 的 Drawer

**现象**
画布上的展项节点只有「编辑展项 / 删除展项」，没有编辑快捷控制流程（`e_link`）的入口。
该能力只存在于 `pme.tsx` 的树表页面（`pme.tsx:465` 的「快捷命令管理」Drawer）。

**原因**
`ExhibitionFlow` 的节点动作集合里没有这一项：`FlowActions` 只有
`onAddChild / onEdit / onDelete / onContentControlEdit / onDeviceControlEdit`。
另外展项节点数据里没有携带 `e_link`，即使加了入口也读不到控制流程。

**改动**

1. `types.ts`：`FlowActions` 增加 `onExhibitControlEdit(node)`。
2. `ExhibitionFlow.tsx`：
   - props 增加 `onExhibitControlEdit`，并加入 `actions` 的 `useMemo`；
   - `exhibits` 属性类型补 `e_link: string`；
   - `makeExhibitNode` 的 `data` 补 `e_link`（后端 `E_InfoSerializer` 已返回该字段）。
3. `ExhibitNode.tsx`：下拉菜单在「编辑展项」之后新增：

```tsx
<DropdownMenuItem onClick={() => actions.onExhibitControlEdit(data)}>
    <SlidersHorizontal className="mr-2 size-4" />
    编辑快捷控制
</DropdownMenuItem>
```

4. `main.tsx`：
   - 新增 `selectedExhibitControl` / `exhibitControlDrawerOpen` 状态；
   - `handleExhibitControlEdit` 把节点映射成 `ExhibitionLinkFlow` 需要的
     `{ id, label, ip, link }`（`ip ← e_ip`，`link ← e_link`）；
   - 新增 Drawer（结构对齐 `pme.tsx:465-497`）：标题显示展项名 +「快捷命令管理」，
     内容为 `<ExhibitionLinkFlow controlData={selectedExhibitControl} />`，
     关闭时刷新画布数据（控制流程保存后节点/边需要重建）。

**验证**
- `tsc`：7 个错误（与改动前一致）。
- 手工（待浏览器确认）：
  1. 展项节点「⋮」→「编辑快捷控制」→ 右侧 Drawer 打开，标题是展项名；
  2. 在 Drawer 里增删节点/连线并点「保存控制流程」→ 关闭后提示保存成功；
  3. 重新打开，控制流程仍在（已写入 `e_link`）。

## 22. 内容节点：文件下发

- **状态**：✅ 已完成
- **位置**：`ContentNode.tsx` 下拉菜单、`FlowActions`、`main.tsx`

**现象**
画布上的内容节点没有「文件下发」入口。同样的动作在 `content.tsx` 的列表里存在
（`handleSend` → `updateContentDownload({ id })`）。

**原因**
`FlowActions` 没有对应动作，节点菜单只有编辑/删除/编辑软件控制命令三项。

**改动**

1. `types.ts`：`FlowActions` 增加 `onContentDownload(node)`。
2. `ExhibitionFlow.tsx`：props 增加 `onContentDownload` 并加入 `actions`。
3. `ContentNode.tsx`：下拉菜单在「编辑内容」之后新增：

```tsx
<DropdownMenuItem onClick={() => actions.onContentDownload(data)}>
    <Send className="mr-2 size-4" />
    文件下发
</DropdownMenuItem>
```

4. `main.tsx`：`handleContentDownload` 调用 `updateContentDownload({ id })`
   （与 `content.tsx` 的 `handleSend` 同一接口 `PUT /api/content/download`），
   成功提示「指令已发送」，失败走统一错误提示。

**验证**
- `tsc`：7 个错误（与改动前一致）。
- 手工（待浏览器确认）：
  1. 内容节点「⋮」→「文件下发」→ 提示「指令已发送」；
  2. 后端日志/设备端能收到下发指令；
  3. 失败时（例如内容未上传文件）弹出后端返回的错误信息。

---

# 第五批：设备命令 Drawer（2026-11-13）

## 1. 设备命令编辑

- **状态**：✅ 已完成
- **位置**：`src/components/device-command-drawer.tsx`（新增）、`main.tsx`

**现象**
设备节点下拉菜单里的「设备命令」点了没反应：`handleDeviceControlEdit` 是空函数，
`main.tsx` 里只有一行「设备 命令管理 Drawer」注释占位。

**原因**
Drawer 与命令表格都没实现，`FlowActions.onDeviceControlEdit` 只连到了一个空回调。

**改动**

1. 新增 `src/components/device-command-drawer.tsx`，数据来源与展示结构参照
   `src/app/device/code.tsx`：

| 项 | 实现 |
|---|---|
| 数据过滤 | `getCodeList({ device: <设备id>, page: 1, limit: 1000 })`，后端 `CodeViewSet.list` 支持 `device` 参数 |
| 表格 | 复用 `DataTable`：ID / 命令名称 / 命令原文 / 端口号 / 类型 / 格式 / 控制协议 / 创建时间 / 操作 |
| 新增/编辑 | Dialog，字段与 `code.tsx` 一致：命令名称、类型、格式、通信协议、端口、控制命令、备注；设备固定为当前节点 |
| 删除 | 复用 `DeleteDialog`（替代 `code.tsx` 里的原生 `confirm()`） |
| 下拉选项 | `CodeTypeItems` / `CodeFormatItems` / `CodeProtocalItems` 与 `code.tsx` 保持一致 |

2. `main.tsx`：新增 `selectedDevice` / `deviceCommandDrawerOpen` 状态，
   `handleDeviceControlEdit` 把节点映射成 `{ id, name, ip }` 并打开 Drawer。

**验证**
- `tsc`：7 → 6 个错误（`handleDeviceControlEdit` 不再有空参数，该 TS6133 消失）。
- 手工（待浏览器确认）：
  1. 设备节点「⋮」→「设备命令」→ 右侧 Drawer 打开，标题是设备名、副标题是设备 IP；
  2. 表格只显示该设备的命令；
  3. 新增/编辑/删除命令后列表即时刷新；
  4. 关闭再打开仍是同一设备的命令。

---

# 第六批：右键菜单（2026-11-13）

## 3. 右键菜单 8 个条目全无 handler

- **状态**：✅ 已完成
- **位置**：`src/components/ExhibitionFlow/ContextMenu.tsx`、`ExhibitionFlow.tsx`

**现象**
右键画布会弹出菜单，但 8 个条目（添加展厅/展区/展项/设备/内容、刷新所有节点、
视口重置、锁定节点）都没有 `onClick`，点了没有任何反应。

**原因**
`ContextMenu.tsx` 只是静态渲染 `CommandItem`，没有接收任何回调；
`ExhibitionFlow` 的 `onNodeContextMenu` 也只做了 `preventDefault()`。

**设计取舍（本次采用的方案）**

原菜单把「添加展厅/展区/展项/设备/内容」平铺在一起，但这些动作的**前置条件不同**：
展区必须有展厅、展项必须有展区、内容必须有展项。空白画布上没有父节点，
所以从画布右键「添加展项」在语义上不成立。因此按上下文拆成两套菜单：

| 上下文 | 菜单项 | 说明 |
|---|---|---|
| **空白画布** | 添加展厅 | 唯一不依赖父节点的添加动作 |
| | 刷新节点 | 重新拉取 `fetchTree` |
| | 适应视图 | `fitView()`（原「视口重置」） |
| **节点** | 编辑节点 / 删除节点 | 通用 |
| | 添加子节点 | 按类型给：展厅→展区/设备；展区→展项；展项→内容/设备 |
| | 节点操作 | 展项→编辑快捷控制；内容→编辑软件控制命令、文件下发；设备→设备命令 |

**移出菜单的功能及理由**

| 原条目 | 处理 | 理由 |
|---|---|---|
| 添加展区 / 展项 / 设备 / 内容（画布级） | 移除 | 缺父节点上下文，改到「节点 → 添加子节点」，与节点上的「+」按钮同义 |
| 锁定节点 | 移除 | 没有数据模型与后端字段，只能是纯前端临时状态，刷新即丢失；若确实需要应作为独立功能（含持久化）设计 |
| 视口重置 | 改名「适应视图」 | 原按钮语义模糊；实现为 `fitView()` |

**改动**

1. `ContextMenu.tsx`：改为接收 `groups: { heading, items: { label, icon?, onSelect, destructive? }[] }`，
   只负责定位、搜索过滤、点击后关闭；同时修掉把 `false` 直接塞进 `style` 的问题。
2. `ExhibitionFlow.tsx`：
   - 抽出 `openContextMenu(event, node?)`，空白画布与节点共用同一套边缘定位逻辑；
   - `onNodeContextMenu` 接 xyflow 的 `(event, node)` 签名，把节点数据带进菜单；
   - `buildContextGroups` 按上下文组装菜单；
   - 新增 `onRefresh` 属性，供「刷新节点」使用（`main.tsx` 传 `fetchTree`）。
3. `main.tsx`：`<ExhibitionFlow onRefresh={fetchTree} />`。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- `npm run lint`：131 → 116 warnings（右键菜单里 9 个未使用的 UI 导入被删除）。
- 手工（待浏览器确认）：
  1. 空白画布右键 → 只有「添加展厅 / 刷新节点 / 适应视图」三项，且都能用；
  2. 节点右键 → 「编辑节点 / 删除节点」+ 该类型的「添加子节点」+ 专属操作；
  3. 点击菜单项后菜单关闭，动作生效；
  4. 菜单可用输入框过滤（如输入「设备」只剩设备相关项）。

---

# 第七批：侧栏添加类型、设备探活、画布搜索（2026-11-13）

## 7. 侧栏只能添加展厅

- **状态**：✅ 已完成
- **位置**：`src/components/ExhibitionFlow/Sidebar.tsx`、`main.tsx`

**现象**
侧栏「节点管理」只有「添加展厅」一个入口，展区/展项只能从父节点的「+」按钮添加。

**原因**
`Sidebar.ITEMS` 只配了 pavilion；`main.tsx` 的 `handleAddNode` 里 machine/exhibit 两个分支
被注释掉了（`// else if (kind === "machine") openMacAdd({ id: 0, ... })`）。

**设计**
后端 `M_InfoOpSerializer.m_p` 与 `E_InfoOpSerializer.e_m` 都是 `required=False`，
因此可以**先创建、后关联**：从侧栏创建的展区/展项不带父节点，进入侧栏
「未连接展区 / 未连接展项」分组，拖到画布上的父节点即可建立关联（该拖拽逻辑已存在）。

**改动**
1. `Sidebar.tsx`：`ITEMS` 增加「添加展区」「添加展项」，并在 `desc` 里说明"不绑定父节点"。
2. `main.tsx`：
   - `handleAddNode` 补上 machine / exhibit 分支，调用 `openMacAdd(null)` / `openExhAdd(null)`；
   - `openMacAdd` / `openExhAdd` 的参数改为 `FlowNodeData | null`，父节点为空时 `m_p/e_m` 置 `null`；
   - `handleMacSave` / `handleExhSave` 在 `m_p/e_m` 为 `null` 时**从请求体中省略该字段**
     （后端是 `IntegerField(required=False)`，不接受 `null`，省略才表示不绑定）；
   - 弹窗里的「所属展厅 ID / 展区 ID」在未绑定时显示占位文案「未绑定（可在画布拖拽关联）」。

顺带修正了两个复制粘贴留下的提示文案：展区保存提示原为「展项更新/添加成功」、
展项保存提示原为「展品更新/添加成功」。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- 手工（待浏览器确认）：
  1. 侧栏点「添加展区」→ 弹窗中「所属展厅 ID」为空 → 保存成功 → 侧栏「未连接展区」出现该条；
  2. 把它拖到某个展厅节点上 → 关联成功、从"未连接"分组消失；
  3. 「添加展项」同理。

## 11. 设备在线探测（probe）

- **状态**：✅ 已完成
- **位置**：`src/api/device.js`、`FlowActions`、`DeviceNode.tsx`、右键菜单、`main.tsx`

**现象**
后端有 `POST /device/probe`，前端从未调用；`device/index.tsx` 只是把 `probe_enabled`
当普通字段展示。

**原因**
`src/api/device.js` 没有对应导出，节点菜单也没有入口。

**改动**
1. `api/device.js`：新增 `probeDevice = (params) => apiPost('/api/device/probe', params)`。
2. `types.ts`：`FlowActions` 增加 `onDeviceProbe(node)`；`ExhibitionFlow` props/actions 同步。
3. 入口两处：
   - `DeviceNode.tsx` 下拉菜单「设备探活」（`Wifi` 图标）；
   - 节点右键菜单「设备探活」。
4. `main.tsx`：`handleDeviceProbe` 调 `probeDevice({ device_id: node.id })`，
   成功用后端返回的 `msg`（如「探活已下发」）提示，并 `fetchTree()` 刷新状态。

**注意**
后端要求设备 `probe_enabled=True`，否则返回 `code:-1`「设备不存在或不参与探活」；
该消息会经统一错误处理弹出，属于预期行为。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- 手工（待浏览器确认）：
  1. 设备节点 ⋮ →「设备探活」→ 提示「探活已下发」；
  2. 对未参与探活的设备 → 提示「设备不存在或不参与探活」；
  3. 右键菜单里同样可用。

## 13. 画布搜索 / 过滤

- **状态**：✅ 已完成
- **位置**：`src/components/ExhibitionFlow/ExhibitionFlow.tsx`

**现象**
节点一多就难以定位，画布没有任何搜索能力（`pme.tsx` 的树表有搜索，画布没有）。

**设计取舍**
搜索采用「高亮 + 定位」而不是「过滤隐藏」：
隐藏节点会让布局与连线断裂（dagre/手写布局是基于全量数据算的），
而透明度只影响观感，不会破坏图结构。

**改动**
1. 顶部居中的 `Panel` 增加搜索框（`Input` + 清空按钮 + 匹配数 + 「定位」按钮）。
2. 匹配规则：节点名称 / ID / IP / 展项 IP / 设备编号 / 简介，任一字段包含关键词即命中
   （大小写不敏感）。
3. 渲染时派生 `displayNodes` / `displayEdges`：命中节点保持不透明，其余 `opacity: 0.2`；
   与命中节点相连的边保持不透明，其余 `opacity: 0.1`。
4. 「定位」调用 `fitView({ nodes: 命中节点, duration: 400, padding: 0.6 })`。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- `npm run lint`：116 warnings（不变）。
- 手工（待浏览器确认）：
  1. 输入设备 IP 片段 → 对应节点高亮、其余变淡、右上显示匹配数；
  2. 点「定位」→ 视口缩放到命中节点；
  3. 清空输入 → 全部恢复；
  4. 搜索状态下拖拽节点、连线仍然正常。

---

# 第八批：设备弹窗加入「设备探活」开关（2026-11-13）

## 23. 设备编辑/新增缺少 probe_enabled 字段

- **状态**：✅ 已完成
- **位置**：`src/app/main.tsx` 设备编辑/新增弹窗

**现象**
画布的设备弹窗里没有「设备探活」开关，新建的设备一律使用后端默认值
（`probe_enabled = False`），无法在画布上开启探活；而 `device/index.tsx`
的设备弹窗里是有这个字段的。

**原因**
`main.tsx` 的 `devForm` 里没有 `probe_enabled`，弹窗也没有对应控件；
`DeviceItem` 类型同样缺这个字段。

**改动**（规则完全参照 `device/index.tsx`）

1. `DeviceItem` 增加 `probe_enabled: boolean`。
2. 新增常量：
   - `ProbeItems`：`{ 不启用: 0, 启用探活: 1 }`（与 `device/index.tsx` 的 `PropeItems` 一致）；
   - `PROBE_ENABLED_DTYPES = [3, 4]`：只有「电脑主机」「一体机」支持探活。
3. `devForm` 默认值、`openDevAdd`、`openDevEdit` 均带上 `probe_enabled`。
4. 弹窗把「设备厂家」与「设备探活」并排放进两列栅格，控件为 `Select`：

```tsx
<Select
    items={ProbeItems}
    value={devForm.probe_enabled ? "1" : "0"}
    onValueChange={(e) => setDevForm({ ...devForm, probe_enabled: e === "1" })}
    // 与 device/index.tsx 一致：只有电脑主机(3)/一体机(4) 支持探活
    disabled={!PROBE_ENABLED_DTYPES.includes(devForm.dtype)}
/>
```

标签右侧保留原文案提示：`*使用服务器30s一次设备活性探测`。

后端已确认支持：`DeviceOpSerializer.fields` 包含 `probe_enabled`。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- `npm run lint`：116 warnings（不变）。
- 手工（待浏览器确认）：
  1. 新增设备 → 类型选「电脑主机」→ 「设备探活」可选，选「启用探活」保存；
  2. 重新打开该设备 → 仍显示「启用探活」；
  3. 类型改成「继电器」等非 3/4 → 探活下拉变灰不可选；
  4. 保存后到「设备命令」Drawer 或设备列表页查看 `probe_enabled` 已写入。

---

# 第九批：控制流程 Drawer 关闭时不再整树刷新（2026-11-13）

## 24. 内容命令 Drawer / 展项快捷控制 Drawer 关闭后 fetchTree 的观感问题

- **状态**：✅ 已完成
- **位置**：`src/app/main.tsx`、`ContentControlFlow.tsx`、`ExhibitionLinkFlow.tsx`

**现象**
在「内容命令管理」或「展项快捷控制」Drawer 里编辑并保存，关闭 Drawer 时画布会
闪一下 loading，随后节点全部跳回自动布局的位置（用户手动拖过的位置丢失）。

**原因**
两个 Drawer 的 `onOpenChange` 关闭分支都调用了 `fetchTree()`：

```tsx
if (!open) { setDrawerOpen(false); setSelectedXxx(null); fetchTree(); }
```

而 `fetchTree()` 会：

1. `setTreeLoading(true)` → 画布先渲染 loading 态；
2. 重新拉 5 个列表并替换 `pavilions/machines/exhibits/devices/contents`；
3. 触发 `ExhibitionFlow` 的重建 effect（`setNodes(buildFlow(...))`），
   所有节点按自动布局重新生成 → 手动位置被重置。

但这两类保存改的是 `c_control` / `e_link`，**画布根本不渲染它们**，这次整树刷新完全是多余的。

**为什么不能简单地"不刷新"**
再次打开 Drawer 时，`selectedContent` / `selectedExhibitControl` 是从画布节点数据构造的，
而节点数据仍是保存前的旧 JSON → 会看到旧流程，再次保存就会覆盖掉刚存的内容。

**方案对比**

| 方案 | 结论 |
|---|---|
| 打开时调详情接口取最新 JSON | ❌ 后端 `/content/edit/<id>`、`/exhibition/edit/<id>` 是手写 dict，**不返回** `c_control` / `e_link` |
| 打开时拉列表再按 id 找 | ⚠️ 可行但每次打开多一次全量请求，且抽屉要等请求返回 |
| **保存后回传最新 JSON 并缓存**（采用） | ✅ 零额外请求、无 loading、画布不动，且不会读到旧数据 |
| 保留整树刷新但静默 + 重建时保留旧节点位置 | ⚠️ 更彻底（能一并解决其它 CRUD 的跳动），但涉及布局与新增节点的重叠风险，另行评估 |

**改动**

1. `ContentControlFlow.tsx`：新增可选属性 `onSaved?: (cControl: string) => void`，
   在保存成功后把序列化后的 `c_control` 回传（`pme.tsx` 等其它调用方不传，行为不变）。
2. `ExhibitionLinkFlow.tsx`：同样新增 `onSaved?: (eLink: string) => void`。
3. `main.tsx`：
   - 新增 `contentControlJsonRef` / `exhibitLinkJsonRef`（`Map<id, json>`）与
     `editingContentIdRef` / `editingExhibitIdRef`；
   - 两个 Drawer 的 `onSaved` 把最新 JSON 写入对应 Map；
   - 打开 Drawer 时优先取 Map 里的 JSON，取不到才用节点数据；
   - **关闭 Drawer 不再调用 `fetchTree()`**；
   - `fetchTree()` 成功后清空两个 Map（真正的服务端刷新后以服务端为准）。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- `npm run lint`：116 warnings（不变）。
- 手工（待浏览器确认）：
  1. 打开「内容命令管理」→ 改流程 → 保存 → 关闭：**不再闪 loading、节点位置不动**；
  2. 再次打开：看到的是刚保存的流程（不是旧数据）；
  3. 展项「编辑快捷控制」同样；
  4. 在画布上做一次新增/删除节点（会触发 `fetchTree`）后再打开 Drawer，仍是最新数据。

---

## 24.1 内容编辑弹窗的「控制JSON」仍是旧数据（第九批补丁）

- **状态**：✅ 已完成
- **位置**：`src/app/main.tsx` `openContentEdit` / `handleContentControlSaved`

**现象**
在「软件控制命令」Drawer 里保存后关闭（已不再刷新画布），随后打开内容的
「编辑内容」弹窗，里面的「控制JSON」字段显示的仍是保存前的旧 JSON。

**影响**
不只是显示问题：如果此时直接点保存，表单里的旧 `c_control` 会被提交，
**把刚在流程图里保存的新流程覆盖掉**。

**原因**
`openContentEdit` 从 `contents` 数组取数据，而该数组只在 `fetchTree` 时更新；
既然关闭 Drawer 不再刷新，`contents` 里仍是旧值。

**改动**

1. `openContentEdit`：优先取第九批引入的缓存 `contentControlJsonRef`，
   取不到才回退到 `contents`：

```tsx
const freshControl = contentControlJsonRef.current.get(c.id);
setContentFormData({ ..., c_control: freshControl ?? c.c_control, ... });
```

2. `handleContentControlSaved`：除了写缓存，若当前正在编辑的正是这条内容，
   顺带把 `contentFormData.c_control` 同步为最新 JSON（防御性处理，
   正常流程下弹窗与 Drawer 不会同时打开）。

**验证**
- `tsc`：6 个错误（与改动前一致）。
- `npm run lint`：116 warnings（不变）。
- 手工（待浏览器确认）：
  1. 内容节点 →「编辑软件控制命令」→ 改流程 → 保存 → 关闭；
  2. 内容节点 →「编辑内容」→「控制JSON」显示的是刚保存的内容；
  3. 直接点保存 → 流程图里的内容不会被覆盖；
  4. 打开控制 Drawer 也仍是最新流程。

---

# 第一批验证汇总

| 项目 | 改动前 | 改动后 |
|---|---|---|
| `tsc -p tsconfig.app.json --noEmit` | 8 个错误 | 8 个错误（均为既有问题，无新增） |
| `npm run lint` | 138 warnings | 136 warnings |
| 涉及文件 | — | `src/app/main.tsx` |

**待你在浏览器确认的手工路径**（沙箱内无法驱动浏览器）：

1. 内容弹窗：三个开关改完保存，重开保持（#4）。
2. 内容弹窗：改排序后保存，内容顺序变化，设备排序不受影响（#5）。
3. 内容节点 →「内容控制」：抽屉内能带出展项 IP（#15）。
4. 四条连线分别操作，提示与层级一致（#16）。
5. 断开已关联/未关联连线，行为符合预期（#17）。
6. 内容控制抽屉内「保存控制流程」仍可保存（#18）。

# 遗留（不在本批）

| 编号 | 缺口 | 说明 |
|---|---|---|
| 12 | 内容下载状态 / 测试 | 后端部分未完成，**暂缓**（项目负责人确认） |
| 20 | `major`（是否为主内容设备）不可编辑 | 当前是 disabled 文本输入，待办 |
| 10 | 显示状态快捷切换 | **不做**：后端 `show` 专用接口将由项目负责人删除 |
| 14 | 下拉选项接字典 / 设备类型 | **不做**：后端设备类型数据部分未完成 |

**已解决 / 待确认**

- ~~内容存储位置 `c_file_status` 后端限制 1~2~~：**已由项目负责人在后端修改**，
  前端三个选项可直接使用（见第三批说明）。
- 设备命令编辑（#1）在画布上仍是空入口：`handleDeviceControlEdit` 为空函数，
  且 `main.tsx` 里只有一行「设备 命令管理 Drawer」注释占位。待实现。

