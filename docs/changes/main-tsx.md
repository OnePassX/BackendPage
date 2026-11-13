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
| 19 | 内容弹窗「文件地址」标签写错 | 实为存储位置（`c_file_status`），留待第二批与表单联动一起改 |
| 20 | `major`（是否为主内容设备）不可编辑 | 当前是 disabled 文本输入 |
| 1–3、6 | 设备命令 Drawer、节点快捷添加、右键菜单、文件上传接线 | 第二批 |
| 7、9、10 | 侧栏添加类型、内容表单联动、显示状态快捷切换 | 第三批 |
| 8、13、14 | e_link 入口、搜索、字典接后端 | 单独评估 |
