# quick-create 远程桌面（noVNC）实现方案

- **状态**：✅ P0 已实现（2026-11-24），含 IP token 插件方案（无 token 文件），待现场重启 websockify 联调；第一版只读画面
- **涉及页面**：`src/app/quick-create.tsx`（路由 `/server/quickcreate`）右侧「远程画面」Tab
- **参考**：<https://github.com/novnc/noVNC> · <https://github.com/novnc/websockify>
- **相关文档**：`docs/design/quick-create.md`

---

## 0. 一句话结论

在**控制服务器（192.168.4.43）**上部署一个 `websockify`（WebSocket ↔ TCP 适配器），
用自定义插件 `vnc_target_plugin.IpPortTokenPlugin` 把 token 直接解析成目标地址；
前端用 `@novnc/novnc` 的 `RFB` 对象连接
`ws://…:6080/websockify?token=<设备IP>%3A5900`，把画面渲染进「远程画面」Tab。

- **无需任何 token 映射文件 / 后端接口**：token 就是「设备 IP:5900」，设备在数据库里改 IP 后前端自动生效。
- 该方案假定**局域网可信**（能访问 6080 的客户端可让 websockify 连接内网任意 VNC 主机）；
  插件已限制为 IPv4 单播 + 端口 5900–5909，如需白名单可改用 TokenFile / JSONTokenApi（见 §7.1）。
- 后续（P2）可把密码改为后端下发、增加 `vnc_enabled` 开关；`vnc_port/vnc_enabled` 字段仍可选。
- **不引入** Django Channels：后端是纯 WSGI（`serverControl/wsgi.py`，`runserver` 8004），当前没有 ASGI 部署条件。

---

## 1. 需求与边界

### 1.1 目标

在快捷控制页右侧新增「远程画面」Tab：
选中当前展项（或整馆）的**电脑主机 / 一体机**，在浏览器内实时查看并操作它的 Windows 桌面，
用于现场调试、内容异常排查、远程重启等。

### 1.2 本期范围

| 范围 | 内容 |
|---|---|
| 设备来源 | 当前展项设备（`/main/api/getDevice`）+ 整馆设备（`/main/api/getGlobalDevice`，过滤 `id=0` 的总控合成项） |
| 设备类型 | 仅 `电脑主机(dtype=3)`、`一体机(dtype=4)`（与设备探活规则 `PROBE_ENABLED_DTYPES=[3,4]` 一致） |
| 画面能力 | **第一版（P0）只看画面**（`viewOnly=true`）：连接/断开/重连、缩放（适应窗口 / 1:1）、全屏、状态与错误提示；鼠标键盘、Ctrl+Alt+Del、剪贴板、画质、截图留到 P1 |
| 鉴权 | 页面本身在 `/server` 下，已要求登录（`BackendLayout`）；远程画面沿用该登录态；Tab 只在「显示编辑」下可见 |
| **不做** | 文件传输、声音、多画面墙、公网访问、后端存储 VNC 密码（第一版密码前端固定） |

### 1.3 前提条件（现场已确认，2026-11-24）

1. 展项机已安装 **RealVNC Server**，RFB 端口 **5900**（`5800` 是 Java Viewer 端口，不使用）。
   - 安全类型需为 **VNC Password**（`VncAuth`）：noVNC 不支持 RealVNC 的账号型认证（RA2）；
   - 密码统一为 **一个空格字符**（`" "`），第一版前端固定该值，后续改由后端接口下发。
2. 控制服务器（Windows）可常驻 Python 服务（bat 启动），websockify 端口 **6080 无限制**。
3. 生产用 **nginx + http**：先用 `npm run dev` 跑通，`npm run build` 后把产物放 nginx。

---

## 2. 现状盘点

### 2.1 前端

| 位置 | 现状 |
|---|---|
| `src/app/quick-create.tsx:969-1194` | 右侧 Tabs；`TabsTrigger value="vnc"` 已存在（`:978`，文案「远程画面」），`TabsContent value="vnc"` 为空壳（`:1159-1161`） |
| 可见性 | vnc 触发器和「内容命令 / 快捷控制」一起包在 `showEditActions && <>` 里 → **只在「显示编辑」模式下可见**（已确认保持该可见性） |
| 设备数据 | `get_Device(exhibitId)`（`src/api/quick.js:260` → `/main/api/getDevice`）在 `quick-create.tsx:430-446` 写入 `deviceList`；返回 `{id, deviceName, deviceTypeId, deviceType, iconSvg, iconColor, deviceIp, isOnline, probeEnabled, code[]}` |
| 整馆设备 | `get_Global_Device()`（`quick.js:274`）返回 `area=2` 设备 + 若干 `id=0` 的「总控」合成项（后端 `mainControl/views.py:675`），需过滤 |
| 列表组件 | `SelectableList` 是 `quick-create.tsx:124` 内的**局部函数**（单选/描述/图标/`bg-current` 选中态），VncPanel 可直接复用同款样式或抽成共享组件 |
| 依赖 | 已新增运行时依赖 `@novnc/novnc@1.7.0`（纯 ESM，包根即 `core/rfb.js`） |

### 2.2 后端

| 项 | 现状 |
|---|---|
| Web 框架 | Django + DRF，**WSGI**（`serverControl/wsgi.py`），无 `channels`/`asgi.py`/daphne |
| 启动方式 | `一键启动.bat`：`celery worker` + `python manage.py runserver --noreload`（8004）+ `init_probe_task` + `celery beat` |
| Python | 3.14.6，`uv` 管理（venv 内无 `pip`），已装 `redis`，**未装 numpy** |
| 设备模型 | `M_Device`：`num/name/dtype/ip/conpare/area/link/other/major/sort/probe_enabled` —— **没有任何 VNC 字段** |
| 设备接口 | `deviceControl/urls.py`：`device/list|edit|add|update|delete`、`device/probe`；`/main/api/getDevice` 供控制页用 |
| 定时任务 | 已有 `celery.shared_task` + `init_probe_task`（设备探活）模式可复用；C 方案**不需要** token 文件刷新任务 |

### 2.3 环境与网络

| 项 | 值 |
|---|---|
| 后端 | `http://192.168.4.43:8004`，`CORS_ORIGIN_ALLOW_ALL=True` |
| 前端 dev | Vite `3200`，代理 `/api`、`/media` → `192.168.4.43:8004`（`vite.config.ts`），**未配置 ws 代理** |
| 前端生产 | 推测 `192.168.4.43:3201`（`CSRF_TRUSTED_ORIGINS` / `CORS_ALLOWED_ORIGINS` 白名单指向它），托管方式未确认 |
| 控制页接口 | `/main/api/*` 不校验 session（整馆控制口），`/api/*` 走登录态 |

---

## 3. 技术选型

浏览器不能直接说 VNC 的 TCP 协议，noVNC 用 WebSocket 承载 RFB 字节流，因此中间必须有一个
**WebSocket → TCP 桥**。四种做法对比：

| 方案 | 说明 | 结论 |
|---|---|---|
| **A. 控制服务器集中 websockify** | 一个进程监听 6080，`IpPortTokenPlugin` 按 token（=设备 IP:5900）路由到不同展项机 | ✅ **推荐**：部署/防火墙/日志只在一处；浏览器只连控制服务器；展项机不需要额外软件 |
| B. 每台展项机自跑 websockify | 展项机本地起 websockify，前端直连 `ws://展项机IP:6080` | ⚠️ 零控制服务器改动，但每台要装 Python/服务、页面要直连多个 IP、升级困难 |
| C. Django Channels 桥接 | 在 Django 内实现 WS→TCP | ❌ 需改 ASGI 部署，改动面大，和现有 `runserver` + celery 体系冲突 |
| D. 复用 python-socketio 自研桥 | 用已有 socketio 转发二进制帧 | ❌ 等于重写 websockify（背压/分片/断线处理），风险高，不推荐 |

> 2026-11-24 现场确认局域网可信后，token 路由由「TokenFile 映射文件」改为「自定义插件解析 IP:端口」，
> 不再需要维护 `vnc_tokens.cfg`；历史排障过程见 §14，本次改动见 §15。

**noVNC 版本**：npm `@novnc/novnc@1.7.0`（MPL-2.0，无运行时依赖，包内只有 ESM）。
注意它与旧教程的差异：

- 1.7 **没有 `lib/` 目录**，包根 `exports` 就是 `./core/rfb.js` → 必须 `import RFB from '@novnc/novnc'`；
  旧示例里的 `@novnc/novnc/lib/rfb` 在 1.7 会直接报错。
- 包**不带 TypeScript 类型**，需要本地补一份 `src/types/novnc.d.ts`（本仓库 `noImplicitAny:false`，不补也能跑，但推荐补）。
- 建议**动态导入**（`await import('@novnc/novnc')`），避免把 ~400KB 的客户端打进首屏包。

**websockify**：PyPI `websockify==0.13.0`（唯一官方 Python 实现）。

> 安装提示：`requires_dist = numpy, requests, jwcrypto, redis`，其中 numpy 只是性能优化。
> 后端 venv 是 Python 3.14.6 且没有 numpy，安装时如果 numpy 无 cp314 wheel，
> 可退化为 `uv pip install websockify --no-deps`（基础代理只需要标准库），
> 或用 `uv venv .venv-vnc --python 3.13` 单独建一个 3.13 环境跑 websockify。

---

## 4. 总体架构

```
┌────────────────────────── 浏览器（控制台 / 运维电脑） ──────────────────────────┐
│  /server/quickcreate 页面                                                       │
│  VncPanel ──► useVncSession ──► noVNC RFB (canvas)                              │
└──────────────────────────────────┬─────────────────────────────────────────────┘
                                   │ ws://192.168.4.43:6080/websockify?token=<ip>%3A5900
                                   ▼
┌─────────────────── 控制服务器 192.168.4.43（Windows，Python 3.14 venv） ────────┐
│  websockify 0.13.0（常驻服务，端口 6080）                                        │
│    └─ vnc_target_plugin.IpPortTokenPlugin（token = ip:port，校验 IPv4/端口）      │
│  Django 8004（runserver）── 设备与权限（不参与画面转发、不生成 token 文件）         │
└──────────────────────────────────┬─────────────────────────────────────────────┘
                                   │ TCP 5900（RFB 明文，局域网）
                                   ▼
┌──────────────────────── 展项机（Windows，电脑主机/一体机） ─────────────────────┐
│  VNC Server（RealVNC，Authentication=VNC Password）                            │
└────────────────────────────────────────────────────────────────────────────────┘
```

职责边界（沿用 ADR-0001 的思路：领域侧拥有数据形状，传输侧保持无知）：

| 角色 | 职责 | 不负责 |
|---|---|---|
| `VncPanel`（展示层） | 设备选择、画面容器、工具栏、状态、密码弹窗 | 不懂 VNC 协议细节 |
| `useVncSession`（适配层） | `RFB` 生命周期、事件 → UI 状态机、重连、清理 | 不关心设备从哪来 |
| `websockify`（传输适配器） | WS ↔ TCP 字节流转发、token → 目标地址解析 | 不解析 RFB，不校验 VNC 密码 |
| Django（领域/配置侧） | 设备 IP/类型、登录态校验 | 不参与画面传输，不维护 token 映射 |

---

## 5. 前端设计

### 5.1 新增/改动文件（已实现）

| 文件 | 类型 | 说明 |
|---|---|---|
| `package.json` | 改 | 新增 `@novnc/novnc@^1.7.0` |
| `src/components/quick-create/vnc/VncPanel.tsx` | 新增 | Tab 根组件：左设备列表（当前展项 / 整馆分组）+ 右画面区（工具栏 / 画布 / 未连接遮罩） |
| `src/components/quick-create/vnc/useVncSession.ts` | 新增 | RFB 生命周期 + 状态机 + 8s 握手超时 + session id 隔离迟到事件 + 卸载 cleanup |
| `src/types/novnc.d.ts` | 新增 | `declare module '@novnc/novnc'`（RFB 最小类型：构造器/属性/事件/方法） |
| `src/app/quick-create.tsx` | 改 | `:1159` 空壳换成 `<VncPanel devices={deviceList} exhibitName={…} />` |
| `vite.config.ts` | 改 | dev 增加 `/websockify` ws 代理 → `http://192.168.4.43:6080`，见 §7.2 |
| `docs/deploy/websockify/*` | 新增 | 控制服务器启动 bat、token 示例、nginx 反代示例 |

> 设备列表没有复用 `quick-create.tsx:124` 的局部 `SelectableList`（VncPanel 需要「分组 + 在线圆点 + IP」的独立布局），
> 后续如抽公共组件可再统一。

### 5.2 组件结构（已实现）

```
VncPanel
├─ 左列（w-64）：设备选择
│   ├─ 分组：当前展项 · <展项名> / 整馆设备
│   ├─ 每项：在线圆点 + 设备名 + 「类型 · IP」
│   └─ 过滤：id != 0、deviceTypeId ∈ {3,4}、deviceIp 非空；整馆设备与当前展项按 id 去重
└─ 右列：画面区
    ├─ 顶部工具栏：设备名 / IP / 状态徽标 / [连接|断开] [1:1|适应窗口] [全屏]
    ├─ 画面容器 ref（flex-1 min-h-0，深色底 #11181C，绝对定位铺满）
    └─ 未连接遮罩：状态文案 + 错误原因 + 「连接画面 / 重新连接」
```

### 5.3 状态机（已实现）

```
idle ──连接──► connecting ──connect 事件──► connected
                    │
                    ├─ credentialsrequired ──► need-password（第一版密码固定，实际不会走到）
                    ├─ securityfailure ─────► error（认证失败，不自动重连）
                    └─ disconnect(clean=false) ─► error（断线提示）
connected ──用户断开 / 切设备 / 切 Tab / 卸载──► disconnected
connecting ──8s 未收到 connect──► error（超时提示，主动断开）
```

| 事件 | UI 反馈 |
|---|---|
| `connect` | 状态「已连接」，显示 `desktopname` |
| `securityfailure` | 「安全验证失败（status=…）」——RealVNC 认证类型不是 VNC Password 时会走到这里 |
| `disconnect.clean=false` | 「连接已断开：请确认设备在线、RealVNC 已启动」 |
| 超时（8s 未 `connect`） | 「连接超时：确认设备已开机、RealVNC 监听 5900、websockify 已启动」，并主动 `teardown()` |
| WS 不可达（websockify 未启动 / token 非法） | 走超时分支（noVNC 不单独抛 WS 错误），提示同上 |

### 5.4 hook 实现要点（已完成）

实际文件：`src/components/quick-create/vnc/useVncSession.ts`

- `useVncSession({ viewOnly = true })`：refs 持有 `containerRef / rfbRef / sessionRef / timeoutRef`，
  state 只暴露 `status / error / desktopName`；
- `connect(wsUrl, password)`：先 `teardown()` → 动态 `await import("@novnc/novnc")` →
  `new RFB(target, wsUrl, { shared: true, credentials: { password } })`（密码固定，不弹框）→
  设置 `viewOnly / scaleViewport / resizeSession / background / qualityLevel / compressionLevel`；
- **session id 隔离**：每次 teardown 自增，旧实例迟到事件直接忽略，避免超时提示被通用断线提示覆盖；
- `disconnect()` 主动断开并置 `disconnected`；`setScaleViewport(bool)` 只改属性不重连；
- 卸载 cleanup 调 `teardown()`；切 Tab 时 `TabsContent` 卸载即断线（符合预期）。

### 5.5 工具栏能力（第一版已实现）

| 按钮 | 状态 | 实现 |
|---|---|---|
| 连接 / 断开 | ✅ | `connect(wsUrl)` / `disconnect()` |
| 适应窗口 / 1:1 | ✅ | `rfb.scaleViewport = true/false`（不重连） |
| 全屏 | ✅ | `panelRef.requestFullscreen()` + `fullscreenchange` 监听 |
| 重新连接 | ✅ | 遮罩层按钮重放 `connect` |
| 只读 | 固定开启 | `rfb.viewOnly = true`（第一版只看画面） |
| Ctrl+Alt+Del / 剪贴板 / 画质 / 截图 / 自动重连 | ⏳ P1 | 开放操作能力时再加 |

### 5.6 画面容器注意事项

- 容器必须有**确定高度**（flex 父级 + `min-h-0`），noVNC 会把 `<canvas>` 追加进去；
  父级 `overflow-hidden`，否则缩放后出现滚动条。
- 切 Tab 时 `TabsContent` 会被卸载 → `useVncSession` 的 cleanup 会断开连接；
  如希望切回来保持连接，可给 `Tabs` 传 `forceMount` + `hidden`（会增加后台资源占用，**默认不保持**）。
- 深色底色可避免首次渲染白闪：`rfb.background = "#11181C"`。

---

## 6. 数据流与接口

### 6.1 设备列表组装（阶段一，纯前端）

```ts
type VncDevice = {
  id: number;
  name: string;
  ip: string;
  typeId: number;
  typeName: string;
  online?: boolean;
  iconSvg?: string;
  color?: string;
};

const isVncDevice = (d: any) =>
  d.id !== 0 && [3, 4].includes(Number(d.deviceTypeId)) && !!d.deviceIp;

const vncDevices: VncDevice[] = [
  ...deviceList,            // get_Device(currentExhibit) —— 当前展项
  ...globalDevices,         // get_Global_Device() —— 整馆
]
  .filter(isVncDevice)
  .map(d => ({ id: d.id, name: d.deviceName, ip: d.deviceIp, typeId: d.deviceTypeId,
               typeName: d.deviceType, online: d.isOnline, iconSvg: d.iconSvg, color: d.iconColor }));
```

> 注意 `get_Global_Device()` 会追加 `id=0` 的「电脑主机总控 / 一体机总控」合成项，必须过滤。

### 6.2 WebSocket 地址（已实现）

```ts
// 优先级：环境变量 > 同源推导（dev 走 Vite 代理，生产走 nginx 反代）
const VNC_WS_BASE =
  import.meta.env.VITE_VNC_WS_BASE ??
  `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;

const wsUrl = (deviceId: number) =>
  `${VNC_WS_BASE.replace(/\/$/, "")}/websockify?token=${encodeURIComponent(deviceId)}`;
```

| 环境 | `VITE_VNC_WS_BASE` | 实际连接地址 |
|---|---|---|
| dev（`vite` 3200） | 不填 | `ws://localhost:3200/websockify?token=…` → Vite 代理 → `192.168.4.43:6080` |
| 生产（nginx，http） | 不填 | `ws://<页面host>/websockify?token=…` → nginx 反代 → `127.0.0.1:6080` |
| 临时直连调试 | `ws://192.168.4.43:6080` | 绕过代理直连 websockify |

> 阶段二后端下发 `ws_base` / `token` 后，把 `VNC_WS_BASE` 换成接口返回值即可。

### 6.3 阶段二接口（后端提供连接信息，避免前端硬编码）

`GET /api/device/vnc/info?device_id=<id>`（session 鉴权）

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "device_id": 12,
    "enabled": true,
    "host": "192.168.4.51",
    "port": 5900,
    "ws_base": "ws://192.168.4.43:6080",
    "token": "12",
    "password": "******"
  }
}
```

- 前端拿到 `ws_base + token` 后拼 URL；`password` 为空则不传 `credentials`。
- 密码是否下发取决于现场策略（见 §12），至少保证接口要求登录态。

---

## 7. 部署与配置

### 7.1 websockify 服务（控制服务器）

```bat
:: 安装（uv 环境，venv 里没有 pip）
uv pip install websockify==0.13.0

:: 启动（后台常驻，建议用 NSSM 注册成 Windows 服务，或写进 一键启动.bat）
:: 需先把 vnc_target_plugin.py 放到本目录（CWD），插件按模块名加载
python -m websockify ^
  --token-plugin=vnc_target_plugin.IpPortTokenPlugin ^
  --log-file=logs\websockify.log ^
  0.0.0.0:6080
```

token 即目标地址，前端连接串形如：

```
ws://192.168.4.43:6080/websockify?token=192.168.4.51%3A5900
```

- 插件 `vnc_target_plugin.IpPortTokenPlugin` 接受 `<IPv4>` 或 `<IPv4>:<port>`，省略端口时用 5900；
  只允许 5900–5909 端口、拒绝 `0.0.0.0`/组播等地址，解析失败直接拒绝连接。
- 因为 token 直接携带内网地址，**6080 只应在可信局域网暴露**；需要白名单时改回 TokenFile /
  JSONTokenApi（见 §3 与 §15 的回滚说明）。
- Windows 上 `-D` 守护参数不可用 → 用 **NSSM**、计划任务或 `一键启动.bat` 里 `start "" python -m websockify …`。
- 防火墙放行 TCP 6080；不要映射到公网。
- 日志保留 `logs/websockify.log`，方便排查 token 非法/目标不可达。
- 本仓库已提供：`docs/deploy/websockify/start-websockify.bat`、`vnc_target_plugin.py`、`nginx-websockify.conf.example`，
  复制到控制服务器 `websockify\` 目录（与 bat 同目录）即可；`vnc_tokens.cfg` 不再需要。

### 7.2 Vite dev 代理（已实现）

`vite.config.ts` 已加入该代理：

```ts
// vite.config.ts → server.proxy
'/websockify': {
  target: 'http://192.168.4.43:6080',
  ws: true,
  changeOrigin: true,
},
```

配置后 dev 环境前端用同源 `ws://localhost:3200/websockify?token=…`，无需处理端口/跨域；
生产如果同样由 nginx 反代，前端代码可以完全不感知部署地址。

### 7.3 生产反向代理（若页面由 nginx 托管）

```nginx
location /websockify {
    proxy_pass http://127.0.0.1:6080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

> 现场已确认为 **http**（§12 #3），无需 wss，直接反代明文 6080 即可。
> 若将来启用 https，页面必须用 `wss://`：nginx 终止 TLS 后反代到明文 6080 是最省事的方式；
> 直接让 websockify 跑 `--cert/--key` 也可以，但自签证书需要先让浏览器信任。

### 7.4 阶段二：后端改动清单

> C 方案下 **不需要** token 文件生成命令/定时任务：websockify 的 token 就是设备 IP 本身。

| 改动 | 内容 |
|---|---|
| 模型 | `M_Device` 增加 `vnc_enabled = BooleanField(default=False)`、`vnc_port = IntegerField(default=5900, null=True)`、（可选）`vnc_password = CharField(max_length=64, blank=True)` |
| 迁移 | `python manage.py makemigrations deviceControl && migrate` |
| 序列化器 | `DeviceQuerySerializer` 增加上述字段；新增/更新序列化器允许写入（`vnc_password` 可 write-only） |
| 管理页 | `src/app/device/index.tsx`、`src/app/main.tsx` 设备表单增加「启用远程桌面 / VNC 端口」两项（与 `probe_enabled` 并排） |
| 接口 | `GET /api/device/vnc/info`（见 §6.3），校验 `request.session['user_id']` |
| 安全 | `vnc_password` 如入库，建议用 `cryptography.fernet` + `SECRET_KEY` 派生密钥加密；接口仅登录用户可读 |

---

## 8. 安全与网络

| 风险 | 说明 | 处置 |
|---|---|---|
| VNC 明文/弱口令 | VNC 经典认证是 DES 挑战，局域网内可嗅探 | 仅内网；VNC 密码长度 ≥8 且定期更换；后续 wss + 短时 token |
| token 可枚举 | C 方案 token = `设备IP:5900`，能访问 6080 的客户端可代理内网任意 VNC 主机 | 6080 只对控制网段开放（本方案已确认局域网可信）；需要更严时换回 TokenFile/JSONTokenApi（见 §15 回滚） |
| 密码出现在前端 | 阶段一由用户输入或固定常量；阶段二后端下发 | 不写入代码仓库；接口要求登录态 |
| 越权操作 | 远程画面在 `showEditActions` 模式下才出现 | 保持该可见性；阶段三可加后端权限校验（VNC 接口 + websockify token 签名） |
| 页面 https + ws 混合内容 | 浏览器会拦截 | 页面 https 时必须 `wss`（§7.3） |
| websockify 单点 | 进程挂了所有远程画面不可用 | NSSM 自动重启 + 日志；不影响展厅本地控制 |

---

## 9. 风险与已知坑

1. **noVNC 1.7 没有 `lib/`**：网上 React 封装大多写 `@novnc/novnc/lib/rfb`，在 1.7 会报模块不存在，
   必须用包根导入；也不要照抄需要 `lib` 的第三方组件（如 `react-vnc` 的旧版本）。
2. **动态导入与 Vite**：`@novnc/novnc` 是纯 ESM，Vite 可直接处理；首次进入 Tab 会有一次 chunk 加载（≈几百 KB），
   建议 `optimizeDeps.include: ['@novnc/novnc']` 避免 dev 首次进入时闪一下。
3. **容器尺寸**：flex 布局下不写 `min-h-0` 时 canvas 会把父级撑开；`scaleViewport` 依赖容器尺寸。
4. **Tab 卸载即断线**：Radix Tabs 默认卸载非激活内容；如需保持连接加 `forceMount`（代价是后台持续解码）。
5. **密码错误 vs 网络错误**：`securityfailure` → 密码/协商问题；`disconnect.clean=false` + WS error → 网络/服务问题，提示要分开。
6. **设备离线**：TCP 连接会等到 `--idle-timeout`/系统超时（数秒到数十秒），前端必须有 8s 握手超时兜底。
7. **VNC 服务端差异**：UltraVNC 默认限制并发连接数；RealVNC 新版可能要求账号密码（`credentials` 需 `username`）；
8. **分辨率/DPI**：4K 展项机在 1080p 控制台窗口下缩放后文字模糊，必要时提示用户全屏查看。
9. **numpy 安装**：websockify 的 numpy 依赖可能没有 cp314 wheel；按 §3 的退化方案处理。
10. **Windows 服务托管**：`-D` 不可用，必须 NSSM/计划任务；`runserver` 与 websockify 是两个进程，重启脚本要一起拉起。

---

## 10. 分期计划

| 阶段 | 内容 | 预估 | 验收 |
|---|---|---|---|
| **P0 最小可用** ✅ 前端已完成 | 装依赖；`useVncSession` + `VncPanel`（设备列表/连接/断开/全屏/缩放）；Vite ws 代理；控制服务器装 websockify + `IpPortTokenPlugin`；用一台已装 VNC 的测试机联调 | 0.5–1 天 | 能在浏览器看到测试机桌面（第一版只读） |
| **P1 体验完善** | 开放鼠标键盘（`viewOnly=false`）、自动重连、Ctrl+Alt+Del / 剪贴板 / 画质 / 截图、Tab 生命周期（`forceMount`）等 | 1–2 天 | 切设备/断网/密码错误/切 Tab 均有明确反馈，无内存泄漏 |
| **P2 后端与部署** | 模型字段 + 迁移、设备表单字段、`/api/device/vnc/info`（密码下发）、NSSM 服务、nginx 反代 | 1–2 天 | 新装 VNC 的设备在管理页勾选后即可连接，无需手工改任何映射文件 |
| **P3 可选** | 短时 JWT token、审计日志、多设备画面墙、截图存档 | 按需 | — |

> 原 P1 中的「整馆设备合并、在线状态、状态机/重连/错误分类、Vite ws 代理、`VITE_VNC_WS_BASE`」已在 P0 一并完成。

---

## 11. 验收清单

**已完成静态验证**

- [x] `tsc` 无新增错误（基线的 6 个既有 TS6133 不变）、`npm run lint` 0 error（155 warnings，与基线一致）
- [x] 第一版只读：`rfb.viewOnly = true`，不注册鼠标键盘下发
- [x] `@novnc/novnc@1.7.0` 安装成功，`import RFB from "@novnc/novnc"` 类型声明齐全
- [x] Vite `/websockify` ws 代理配置完成（`target: http://192.168.4.43:6080`）

**待现场联调**

- [ ] `npm run dev` 后「显示编辑」→「远程画面」可见，设备列表只出现电脑主机/一体机（有 IP 的）
- [ ] 选中设备点「连接」能在 2s 内出画面（局域网）；第一版只看画面、鼠标键盘不生效
- [ ] 密码固定为 `12345678`（`VITE_VNC_PASSWORD` 可覆盖），无需输入；若 RealVNC 认证类型不符则提示明确错误
- [ ] VNC 未启动 / 设备离线 / websockify 未启动三种情况，错误提示不混淆
- [ ] 全屏进入/退出正常；适应窗口与 1:1 切换正常
- [ ] 切换设备、切换 Tab、离开页面时连接被正确释放（后台任务管理器无残留 WS）
- [ ] 阶段二：管理页勾选/取消「启用远程桌面」后前端自动可连/不可连（不再依赖任何映射文件）

---

## 12. 已确认参数（2026-11-24）

| # | 问题 | 结论 |
|---|---|---|
| 1 | 展项电脑 VNC 现状 | **RealVNC Server**，RFB 端口 `5900`（`5800` Java Viewer 不用）；密码现场统一为 `12345678`（早期曾用单空格，VncAuth 最多 8 字节） |
| 2 | 控制服务器常驻服务 | 可以，Windows **bat 启动**；`6080` 无端口限制 |
| 3 | 生产托管 | **nginx**，可加 ws 反代；**http**（不需要 wss）；先用 `npm run dev` 跑通，再 `npm run build` 放 nginx |
| 4 | 可见性/权限 | 第一版保持「**显示编辑**」模式下可见；开放给普通用户是后续迭代 |
| 5 | 能力范围 | 第一版**只看画面**（`viewOnly = true`）：不做鼠标键盘、Ctrl+Alt+Del、剪贴板、文件传输 |
| 6 | VNC 密码 | 第一版**前端固定**（现场已统一为 `12345678`）；后续由后端接口下发（见 §6.3 / §7.4） |

### 对实现的影响

- `useVncSession.connect()` 构造 RFB 时固定传 `credentials: { password: VNC_PASSWORD }`（常量默认 `12345678`，可用 `VITE_VNC_PASSWORD` 覆盖）；
- `rfb.viewOnly = true`，工具栏只保留：连接/断开、适应窗口 / 1:1、全屏、重连、状态；
- WebSocket 走**同源路径**：dev 由 Vite `/websockify` ws 代理转 `ws://192.168.4.43:6080`，生产由 nginx `location /websockify` 反代到 websockify，前端拼接 `ws://<页面host>/websockify?token=<设备IP>%3A5900`；
- 不需要 wss/TLS（http 环境）；
- 客户端已增加「优先标准 VNC Password」补丁（见 §14.6）：RealVNC 会把 RA2ne(6) 排在 VNC Password(2) 前面，未打补丁时 noVNC 会选中 6 并挂起。

### 仍待现场确认（不阻塞开发）

1. RealVNC Server 的安全类型当前是否就是 VNC Password（若为 RealVNC 账号认证需改配置）；
2. nginx 与 websockify 是否同一台控制服务器（若是，反代 `127.0.0.1:6080` 即可）。

---

## 13. P0 实现记录（2026-11-24）

### 13.1 落地文件

| 文件 | 说明 |
|---|---|
| `src/components/quick-create/vnc/VncPanel.tsx` | 「远程画面」Tab 根组件：左设备列表 + 右画面区（工具栏/画布/未连接遮罩） |
| `src/components/quick-create/vnc/useVncSession.ts` | RFB 生命周期 hook：状态机、8s 握手超时、session 隔离、卸载释放 |
| `src/types/novnc.d.ts` | `@novnc/novnc` 的本地类型声明（默认导出 RFB） |
| `src/app/quick-create.tsx` | vnc `TabsContent` 挂载 `<VncPanel devices={deviceList} exhibitName={…} />` |
| `vite.config.ts` | dev `/websockify` ws 代理 → `http://192.168.4.43:6080` |
| `package.json` | 新增 `@novnc/novnc@^1.7.0` |
| `docs/deploy/websockify/start-websockify.bat` | 控制服务器启动脚本（IP token 插件模式） |
| `docs/deploy/websockify/vnc_target_plugin.py` | 自定义 websockify token 插件：`token = <IPv4>[:port]`（§15） |
| `docs/deploy/websockify/nginx-websockify.conf.example` | 生产 nginx 反代示例 |

### 13.2 约定

- **只读**：`viewOnly = true`，第一版不注册任何键鼠/剪贴板/文件传输；
- **密码**：常量 `VNC_PASSWORD = import.meta.env.VITE_VNC_PASSWORD ?? "12345678"`（现场统一密码，**不 trim**；早期曾用单空格，VncAuth 最多 8 字节，现统一 8 位）；
- **认证类型**：`preferVncPasswordAuth()` 把 noVNC 客户端对 RA2ne(6) 的支持关掉，优先协商类型 2（见 §14.6）；
- **地址**：同源 `${VNC_WS_BASE}/websockify?token=<设备IP>%3A5900`（`encodeURIComponent`），`VNC_WS_BASE = import.meta.env.VITE_VNC_WS_BASE ?? (${https?'wss':'ws'}://${location.host})`；端口可用 `VITE_VNC_PORT` 覆盖（默认 5900）；
- **设备过滤**：`id !== 0`（排除总控合成项）、`deviceTypeId ∈ {3,4}`、`deviceIp` 非空；当前展项设备与整馆设备按 id 去重；
- **断开时机**：切设备、切 Tab、离开页面、点「断开」都会 `teardown()`，不会残留 WebSocket。

### 13.3 静态验证

- `tsc -p tsconfig.app.json --noEmit`：6 个既有 TS6133 错误，**无新增**；
- `npm run lint`：**0 error**，155 warnings（与基线 `86154de` 一致）。

### 13.4 现场联调步骤

1. 控制服务器（192.168.4.43）安装 websockify：`uv pip install websockify==0.13.0`（若 numpy 无 cp314 wheel，参考 §3 退化方案）；
2. 把 `docs/deploy/websockify/start-websockify.bat`、`vnc_target_plugin.py`、`nginx-websockify.conf.example` 复制到控制服务器 `websockify\` 目录（bat 与插件必须同目录）；旧的 `vnc_tokens.cfg` 不再需要（可删除）；
3. 双击 `start-websockify.bat`，确认日志显示监听 `0.0.0.0:6080`（可用 `netstat -ano | findstr 6080` 检查）；
4. 前端 `npm run dev` → 登录 → `/server/quickcreate` → 打开「显示编辑」→「远程画面」→ 选设备 →「连接」；
5. 若黑屏/超时：先查 websockify 日志（token 是否命中、目标 5900 是否可达），再查展项机 RealVNC 是否运行、防火墙是否放行；
6. 打包上线：`npm run build` → nginx 指向 dist → 按 §7.3 增加 `location /websockify` 反代（http 即可）。

---

## 14. 联调问题记录（2026-11-24）

### 14.1 现象

现场（控制服务器 192.168.4.43 上 `uv run python -m websockify --token-plugin=TokenFile --token-source=websockify\vnc_tokens.cfg --log-file=websockify\logs\websockify.log 0.0.0.0:6080`）连接展项电脑时：

```
WARNING: no 'resource' module, daemonizing is disabled
```

浏览器控制台（quick-create → 远程画面 → 连接）：

```
noVNC requires a secure context (TLS). Expect crashes!
rfb.js:964 Failed when connecting: Connection closed (code: 1000, reason: Target closed)
```

### 14.2 取证与根因

现场 token 文件 `ServerControl_V4\websockify\vnc_tokens.cfg` 为 `280: 192.168.6.47:5900`，websockify 监听 `0.0.0.0:6080` 正常。逐层排查：

1. 从控制服务器直连 `192.168.6.47:5900`（裸 TCP）→ 收到 `RFB 005.000\n`，socket 保持打开 ⇒ 目标可达、RealVNC 在跑、端口正确；
2. 经 websockify 发起最小 RFB 握手 → 服务器（RealVNC）返回 4 个安全类型：**`[13, 133, 5, 129]`**；
3. noVNC 1.7 支持的客户端安全类型只有 `1/2/6/16/19/22/30/113/256`（`core/rfb.js` 的 `_isSupportedSecurityType`），**没有 2（VNC Password）**，也没有 13/133/5/129 ⇒ 握手在安全协商阶段失败；
4. 用无头 Chrome 真实加载 noVNC 复现，控制台输出与 [noVNC#1651](https://github.com/novnc/noVNC/issues/1651) 一致：
   `Failed when connecting: Unsupported security types (types: 13,133,5,129)`。

结论：**与 websockify / token 文件 / 网络无关，根因是展项机 RealVNC 当前的安全认证方式没有启用 VNC Password（类型 2）**，它提供的是 RealVNC 账号/专有认证（13/133/5/129），noVNC 无法协商。报错里的 `Target closed` 是 RealVNC 在该次协商断开 TCP 后 websockify 发出的关闭原因，和 `Unsupported security types` 是同一根因的两种表现。

### 14.3 修复（在展项电脑的 RealVNC Server 上操作）

参考 JumpServer 文档与 RealVNC 帮助：

1. 托盘 RealVNC Server 图标 → **Options → Security**；
2. **Encryption** 设为 `Prefer off`（或 `Always off`；noVNC 不支持 RealVNC 账号的加密通道）；
3. **Authentication** 设为 `VNC Password`（若该选项不可选，先改 Encryption）；
4. 点击 Save 保存，按提示设置 VNC 密码；
5. 重新在「远程画面」里点连接。

注意 VNC 密码长度限制：标准 VNC Password 最多 8 字节。现场已统一改为 8 位密码 `12345678`，并写入前端常量默认值（`VncPanel.tsx` 的 `VNC_PASSWORD`，也可用 `VITE_VNC_PASSWORD` 覆盖）。

### 14.4 另外两条日志的解释

- `noVNC requires a secure context (TLS). Expect crashes!`：页面以 `http://192.168.x.x:端口` 访问时 `window.isSecureContext === false`，noVNC 在 `core/rfb.js:100-102` 打的一条 **Log.Error 告警**，不是致命错误；VNC Password 认证走纯 JS 的 DES 实现，不依赖 WebCrypto，因此功能不受影响。要消除该告警需让页面走 https（可选，非本次范围）。
- `no 'resource' module, daemonizing is disabled`：Windows 无 Unix `resource` 模块，只影响 websockify 的 `--daemon/-D` 后台化；用 bat 前台常驻不受影响，可忽略。

### 14.5 验证方法

- websockify 加 `-v` 启动，连接时日志应出现 `connecting to: 192.168.6.47:5900`；
- 改完 RealVNC 认证方式后再连，浏览器控制台不应再出现 `Unsupported security types (types: 13,133,5,129)`；若此时出现 `securityfailure`，则说明 VNC 密码不匹配，核对 RealVNC 中设置的密码与前端 `VNC_PASSWORD`。

### 14.6 第二个根因：noVNC 先选中 RealVNC 的 RA2ne(6)，连接挂起

改完 RealVNC（Encryption=Prefer off、Authentication=VNC Password、密码 8 位）后，2026-11-24 12:5x 复测发现：RealVNC 返回的 security types 变成 **`[6, 130, 2, 13, 133, 5, 129]`** —— 标准 VNC Password(2) 已经出现，但 **RealVNC 专有的 RA2ne(6) 排在最前面**。

noVNC 1.7 的协商逻辑（`core/rfb.js:1565-1614`）：

```js
const types = this._sock.rQshiftBytes(this._sock.rQshift8());
const type = types.find(this._isSupportedSecurityType, this); // 按服务端顺序取第一个支持的
if (type === undefined) this._fail("Unsupported security types (types: " + types + ")");
```

客户端支持列表里恰好包含 6（`rfb.js:59-72`），于是 noVNC 选了 6；而 6 需要 RealVNC 账号凭据（用户名 / RealVNC 云账号），不会自动回退到 2，表现为：前端一直「连接中」、约 8s 后前端超时；或 websockify 侧目标连接先被服务端关闭，报 `code:1000 ... Target closed`（与第一轮现象同源）。

**取证**：用无头 Chrome 加载真实 noVNC 做三组对照（websockify 走 `ws://127.0.0.1:6080/websockify?token=280`）：

| 模式 | 客户端行为 | 结果 |
| --- | --- | --- |
| A 默认 | 只传 `{ password }` | 无 `connect`、无 `credentialsrequired`，挂起 |
| B 传账号 | `{ username: "", password }` | 仍不成功 |
| C 跳过类型 6 | 覆写 `_isSupportedSecurityType`，`type===6` 返回 false | ✅ `desktopname` = `LAPTOP-NRE2ARMT`，触发 `connect` |

结论：密码 `12345678` 正确，走标准 VNC Password(2) 就能连上；问题只在「协商顺序」。

**修复**（已实现）：`src/components/quick-create/vnc/useVncSession.ts` 增加 `preferVncPasswordAuth(RFBClass)`，在动态 import 之后、`new RFBClass(...)` 之前调用：

```ts
const original = proto._isSupportedSecurityType;
if (typeof original !== "function" || proto.__dshPrefersVncPassword) return;
proto._isSupportedSecurityType = function (type) {
    if (type === 6) return false; // 不选 RA2ne，让协商落到标准 VNC Password(2)
    return original.call(this, type);
};
proto.__dshPrefersVncPassword = true;
```

**局限**：该补丁等价于「本页只支持 VNC Password 认证」。若某台 RealVNC 只提供类型 6/13/133 等而不提供 2，现在会得到明确的 `Unsupported security types` 错误（而不是无声挂起）；届时需在该机开启 VNC Password，或单独实现对应用户名认证。

---

## 15. 2026-11-24 方案调整：改用 IP Token 插件（无 token 文件）

### 15.1 决策

用户确认「展厅是内部局域网，不存在安全性问题」，选择 **C 方案**（原方案里的备选）：
websockify 不再读取 `vnc_tokens.cfg`，改用一个自定义 token 插件，token 直接是目标地址
`<设备IP>:5900`。好处：

- 后端/运维**不需要生成、同步任何映射文件**；设备 IP 以数据库为准，前端直接从设备列表拿；
- 不再有「设备新增后 token 文件忘了刷新」的运维坑（原 P2 的 `vnc_tokens` 命令 + Celery 任务取消）；
- 不需要额外后端接口即可支持任意多台展项机。

代价：6080 端口一旦被访问，客户端可让 websockify 代理内网任意 VNC 主机，
因此**只对可信网段开放**；插件已做 IPv4/端口白名单限制。

### 15.2 实现

| 文件 | 改动 |
|---|---|
| `docs/deploy/websockify/vnc_target_plugin.py` | 新增 `IpPortTokenPlugin(BasePlugin)`：`lookup(token)` 解析 `<IPv4>[:port]`；默认端口 5900；允许端口 5900–5909；拒绝非 IPv4、`is_unspecified`、`is_multicast`、越界端口，返回 `[ip, port]` 或 `None` |
| `docs/deploy/websockify/start-websockify.bat` | 启动参数改为 `python -m websockify --token-plugin=vnc_target_plugin.IpPortTokenPlugin --log-file=logs\websockify.log 0.0.0.0:6080`；插件需与 bat 同目录 |
| `src/components/quick-create/vnc/VncPanel.tsx` | `handleConnect()` 用 `target = ${selectedDevice.ip}:${VNC_PORT}`（`VNC_PORT = Number(import.meta.env.VITE_VNC_PORT ?? 5900)`），wsUrl 为 `${VNC_WS_BASE}/websockify?token=${encodeURIComponent(target)}`；不再使用设备 ID 作为 token |
| 设计文档 | §0/§3/§4/§7/§8/§10/§11/§12/§13 同步为 IP token 方案；§14 为历史排障记录，保留原文 |
| 不再需要 | `vnc_tokens.cfg`、`vnc_tokens.cfg.example`、后端 `vnc_tokens` 管理命令与 Celery 刷新任务 |

### 15.3 验证记录（本机回环）

1. **插件逻辑单元测试**（后端 venv Python，直接调 `lookup`）：

   | token | 结果 |
   |---|---|
   | `192.168.6.47:5900` | `['192.168.6.47', 5900]` |
   | `192.168.6.47` | 默认端口 `5900` |
   | `192.168.6.47:5905` | 允许 |
   | `192.168.6.47:22` | 拒绝（端口不在白名单） |
   | `not-an-ip` / `0.0.0.0:5900` / 空 | 拒绝 |

2. **端到端**：`python -m websockify --token-plugin=vnc_target_plugin.IpPortTokenPlugin 127.0.0.1:6081`
   + Node WebSocket 客户端：
   - `?token=192.168.6.47%3A5900`、`?token=192.168.6.47:5900`、`?token=192.168.6.47` 三种写法都能收到
     目标 RealVNC 的第一帧 `RFB 005.000\n`；
   - `?token=127.0.0.1:22`、非法主机、无 token 均被拒绝（连接关闭/报错）。

### 15.4 现场部署步骤（替换旧 TokenFile 方式）

1. 把仓库 `docs/deploy/websockify/vnc_target_plugin.py` 与新的 `start-websockify.bat` 覆盖到
   `ServerControl_V4\websockify\`（bat 与插件同目录）；
2. 停掉旧 websockify 进程（`Ctrl+C` 或任务管理器结束 `python -m websockify`）；
3. 双击 `start-websockify.bat`，日志应显示 `Listen on 0.0.0.0:6080`；
   `netstat -ano | findstr 6080` 确认监听；
4. 前端 `npm run dev` 刷新页面 → 「显示编辑」→「远程画面」→ 选设备 →「连接」；
5. 生产环境需重新 `npm run build` 并部署到 nginx（3200 上的旧打包产物不带本次前端改动），
   nginx 反代配置不变（§7.3）。

> 旧 `vnc_tokens.cfg` 可以保留不动，也不会再被读取；建议删除避免误解。

### 15.5 安全边界与回滚

- **边界**：token 即内网地址，能连 6080 的客户端可访问 5900–5909 上的任意 VNC 服务；
  建议 6080 只放行控制网段/运维网段，绝不做公网映射。
- **加强**：若要白名单/短时 token，回滚到 TokenFile（由后端管理命令生成）或
  `JSONTokenApi`（websockify 内置插件，接一个小接口校验），前端只需把 token 换回设备 ID/签名串。
- **端口**：展项机 RealVNC 端口必须是 5900–5909（默认 5900）；改端口需同时改插件 `ALLOWED_PORTS`。

