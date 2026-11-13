# ADR-0003：认证使用 Django Session cookie，前端不保存任何 token

- **状态**：Accepted
- **日期**：2026-11-13
- **相关**：`GLOSSARY.md`（session module）、架构评审候选 01（transport）、候选 06（会话）
- **决策者**：项目负责人（要求「token 的认证一并修改」）

## 背景

前端长期按「token 认证」实现：登录后把 `data.token` 存进 `localStorage.access_token`，
请求拦截器再把它放进 `token` 头，路由守卫只判断这个 key 是否存在。但核对后端
`serverControl` 后，实际模型是：

- `DEFAULT_AUTHENTICATION_CLASSES = (SessionAuthentication, BasicAuthentication)`
  （`serverControl/settings.py:152-155`），登录视图写的是 `request.session['user_id']`
  （`userControl/views.py:66`），**认证凭据是 HttpOnly 的 `sessionid` cookie**；
- 登录返回的 `token` 来自 `django.middleware.csrf.get_token(request)`
  （`userControl/views.py:68`），它是 **CSRF token**，不是认证凭据；
- 后端没有 logout 路由（`/user/logout` 实测 404），会话靠
  `SESSION_EXPIRE_AT_BROWSER_CLOSE = True` 与 `SESSION_COOKIE_AGE` 结束；
- 未登录/会话过期时，后端返回 **403** + `{"code":-1,"msg":"未登录或登录已过期"}`
  （`DrfCheckLogin` 抛 `PermissionDenied`，经 `utils/custom_exception.py` 统一封装），
  而不是 401；
- 后端用 `request.session['user_id']` 判定登录而非 `django.contrib.auth.login()`，
  因此 `request.user` 始终匿名，DRF 的 `SessionAuthentication` 提前返回，
  **CSRF 校验实际不会被触发**。

也就是说：前端存的「token」是一个 CSRF token，守卫检查的是「浏览器里有没有一串与认证无关的字符」。
这套机制在会话过期时不会报错，只会让页面变成空列表。

## 决策

**前端按 Session cookie 认证实现，不保存、不传递任何 token。**

1. `localStorage` 中不再有 `access_token`、`backend_username`、`backend_rolename`、`backend_roleid`
   四个 key；身份信息由 **session module**（`src/api/session.ts`）以单个
   `backend_session` 键缓存（仅用于展示与守卫，不代表会话有效）。
2. transport（`src/api/apiClient.js`）不再导出 `TOKEN_KEY`，不再注入 token 头；
   它只负责 cookie 凭据、`{code,data,msg}` 信封与失败归一。
3. 会话是否有效由**服务端**裁决：任何请求被判为会话失效（401，或 403 且后端 msg 含
   「未登录 / 登录已过期」）时，transport 通知 session module 清空缓存、提示并跳转登录。
4. 登出只能清理前端状态：后端没有 logout 路由，服务端 session 随浏览器关闭或过期失效。
   **若需要真正的服务端登出，必须在后端新增 logout 路由**，届时 session module 增加一次
   POST 调用即可，前端其余部分不变。
5. 仍按可读的 `csrftoken` cookie 发送 `X-CSRFToken` 头。当前后端不校验它，
   但成本为零，且一旦后端改为标准登录 + 强制 CSRF，前端无需再改。

## 被否决的替代方案

| 方案 | 否决理由 |
|---|---|
| 继续用 localStorage token | 后端从不校验该值；它只是 CSRF token 的副本，既不能证明身份，也不能在过期时给出信号。 |
| 改用 DRF TokenAuthentication | 需要后端新增 token 表、签发与注销接口，且与现有 `session['user_id']` 权限体系（`DrfCheckLogin` / `DrfPermission`）并存会形成两套身份来源。 |
| 前端轮询「是否登录」接口 | 后端没有 `/me` 之类的轻量接口；用 403 被动发现失效即可，代价是最多一次失败请求。 |

## 后果

- 会话过期从「静默空列表」变成「提示 + 跳登录页」，这是本次修改的主要收益。
- 刷新/新标签页不会闪回登录页（缓存仍在）；真正失效时第一次请求会触发登出。
- 缓存用 `localStorage` 而非 `sessionStorage`：后者在新标签页为空，会误判为未登录。
- 遗留项：**服务端登出缺失**。共享机器上退出登录后，Django session 仍存活到浏览器关闭。
  修复需要后端配合（见决策第 4 条）。
- 遗留项：`data.token`（CSRF token）已不再使用，后端可以安全地停止返回它。
