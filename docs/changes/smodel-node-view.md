# 软件模式「节点视图」实施记录

对应设计文档：`docs/design/smodel-node-view.md`
开始日期：2026-11-16

## 总览

| 项 | 状态 | 说明 |
|---|---|---|
| 节点视图画布（模式→展厅→展区→展项→绑定） | ✅ 已完成 | `src/components/smodel-node-view/index.tsx` |
| 5 类节点渲染 | ✅ 已完成 | `SmodelNode.tsx`（命令并入绑定节点） |
| 绑定编辑 Drawer（新增 / 改延时 / 删除） | ✅ 已完成 | `BindDrawer.tsx` |
| 搜索 + 只看未绑定 | ✅ 已完成 | 只改透明度，不增删节点 |
| 右键新增绑定 / 编辑绑定 | ✅ 已完成 | 展项、展厅节点右键新增；绑定节点点击或右键编辑 |
| 后端 `all=1` 参数 | ⏳ 待后端配合 | 前端已做兼容与回退，见下 |
| 移除旧 `SmodelFlow`（克隆自 ContentControlFlow） | ⏳ 未处理 | 已无引用，可后续随死代码清理一起删 |

## 1. 实现要点

### 1.1 数据加载

- 模式：`GET /smodel/list`
- 展项树：`GET /exhibition/tree`
- 绑定：优先 `GET /smodelbind/list?model_id=<id>&all=1`；
  后端未支持时回退为「按展厅 + 按展项」逐个请求（`Promise.all` 并行），
  并用模块级变量 `allModeSupported` 记住探测结果，避免每次多打一次请求。

### 1.2 图结构

```
模式 ─┬─ 展厅 ─┬─ 展区 ── 展项 ── 绑定(内容/设备)
      │        └─ 绑定（展厅级）
      └─ ...
```

- 布局：dagre，`rankdir: LR`
- 节点尺寸按类型区分（mode 176×64 / pavilion 176×60 / machine 160×52 / exhibit 176×76 / bind 208×88）
- 边：正常实线；**绑定未配置命令 → 红色虚线**
- 展项在当前模式下无绑定 → 节点虚线 + 降透明度 + 「该模式未绑定」

### 1.3 交互

| 操作 | 行为 |
|---|---|
| 点击绑定节点 | 打开 Drawer 编辑（改延时 / 删除） |
| 右键展项节点 | 「新增绑定」，自动带入模式、展厅、展项 |
| 右键展厅节点 | 「新增绑定」，自动带入模式、展厅（展厅级绑定） |
| 右键绑定节点 | 「编辑绑定」 |
| 搜索框 | 按 展项名 / 绑定对象名 / 命令名 过滤，命中节点保持不透明，其余降到 0.15 |
| 只看未绑定 | 隐藏（变淡）已绑定的展项与全部绑定节点，只留缺口 |
| 适应视图 / 刷新 | `fitView` / 重新拉取当前模式绑定 |

### 1.4 后端限制带来的取舍

`/smodelbind/update` 只接受 `{ id, delay }`，所以 Drawer 的「编辑」只允许改延时，
类型 / 绑定对象 / 命令为只读展示；要换绑定对象需删除后重新新增。
Drawer 里已写明这条提示。

## 2. 需要后端配合的改动（`all=1`）

位置：`serverControl/modelControl/views.py` → `SModelBindViewSet.list`

```python
def list(self, request):
    result = []
    model_id = request.GET.get('model_id')
    pavilion_id = request.GET.get('pavilion_id')
    exhibition_id = request.GET.get('exhibition_id', None)
    # 新增：按模式取全部绑定（节点视图用）
    fetch_all = request.GET.get('all')

    qs = Software_Model_Control.objects.filter(is_delete=False, model_id=model_id)
    if not fetch_all:
        qs = qs.filter(pavilion_id=pavilion_id, exhibition_id=exhibition_id)
    smodel_control = qs.all()
    # 以下循环与返回结构保持不变
```

改动约 4 行；加上之后前端首屏从「N 次请求」降为「1 次」，
`fetchBinds()` 会自动走 `all=1` 分支，无需再改前端。

## 3. 验证

- `tsc -p tsconfig.app.json --noEmit`：6 个错误（与改动前一致，均为既有问题）
- `npm run lint`：116 warnings（不变），0 errors
- 新增文件：
  - `src/components/smodel-node-view/index.tsx`
  - `src/components/smodel-node-view/SmodelNode.tsx`
  - `src/components/smodel-node-view/BindDrawer.tsx`
  - `src/components/smodel-node-view/types.ts`
- 修改文件：`src/app/model/smodel.tsx`（`NodeViewTab` 接入新组件）

**待浏览器确认**：
1. 打开「软件模式管理」→ 节点视图 → 默认选中「当前模式」，画布显示 模式→展厅→展区→展项；
2. 已配置绑定的展项下挂出绑定节点，未配置的展项显示「该模式未绑定」；
3. 绑定未配命令时，连线为红色虚线，节点内有「未配置命令」提示；
4. 点击绑定节点 → Drawer 显示只读的类型/对象/命令 + 可改延时；删除可用；
5. 右键展项 / 展厅 →「新增绑定」→ 选类型、对象、命令、延时 → 保存后图刷新；
6. 搜索展项名 → 命中节点高亮、其余变淡；「只看未绑定」只留缺口。

## 4. 2026-11-16 追加：按 `show` 字段显示/隐藏展项树节点

**需求**：节点视图里展厅 / 展区 / 展项按各自的 `show` 字段决定是否显示，
控制按钮放在搜索栏旁边。

**数据**：`GET /exhibition/tree` 三层都返回 `show`（1 显示 / 2 隐藏）。

**改动**：

1. `types.ts`：`TreePavilion` / `TreeMachine` / `TreeExhibit` 补 `show?: number`；
   `SmodelNodeData` 补 `hidden?: boolean`。
2. `index.tsx`：
   - 新增 `showHidden` 状态，默认 `false`；
   - `buildGraph(..., showHidden)`：`show !== 1` 的节点默认**整棵子树跳过**
     （父节点隐藏时子节点一并不显示）；打开开关后正常构建，但把节点标记为 `hidden`；
   - 搜索栏旁新增「显示隐藏节点」按钮（`Eye` / `EyeOff` 图标，开启时高亮）。
3. `SmodelNode.tsx`：`hidden` 节点显示为虚线边框 + 降透明度 + 头部「隐藏」徽标。

**规则细节**：

- `hidden` 取「自身 `show !== 1` **或** 任一祖先被隐藏」，所以父展厅隐藏时，
  子展项即使 `show=1` 也会标为隐藏，避免出现"看起来可见实则不可见"的误导；
- 隐藏节点下的绑定节点同样继承 `hidden`；
- 「只看未绑定」与「显示隐藏节点」可叠加：默认只在对当前可见集合生效。

**验证**：`tsc` 6 个错误（不变）、`lint` 116 warnings（不变）。

## 5. 已知遗留

- 后端 `all=1` 未加之前，首屏会按展项逐个请求（N 次并行）；展项很多时首次加载会慢一些。
- `src/components/SmodelFlow/` 仍保留但已无引用（它是 ContentControlFlow 的克隆），
  建议随下一轮死代码清理删除。
- 绑定「更换对象」需要删除重建，体验上不如直接编辑；如果后端支持全量 update 可再优化。
