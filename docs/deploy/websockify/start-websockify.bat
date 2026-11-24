@echo off
chcp 65001 >nul
setlocal

rem ============================================================
rem 控制服务器：noVNC 远程画面 WebSocket 适配器（websockify）
rem ------------------------------------------------------------
rem 作用：把浏览器发起的 ws://<页面host>/websockify?token=<设备IP>:5900
rem       直接转发到该设备 RealVNC 的 5900 端口（不再需要 vnc_tokens.cfg）。
rem
rem 前置：
rem   1) 已安装 Python 3.14，并在后端 venv 中执行过
rem      uv pip install websockify==0.13.0
rem   2) vnc_target_plugin.py 必须与本 bat 在同一目录
rem
rem 说明：token 由前端按「设备IP:5900」拼接，插件只放行 IPv4 与 5900-5909 端口。
rem ============================================================

cd /d %~dp0

if not exist logs mkdir logs

set "WEBSOCKIFY_ARGS=--token-plugin=vnc_target_plugin.IpPortTokenPlugin --log-file=logs\websockify.log 0.0.0.0:6080"

rem 优先使用后端项目自带的 venv（websockify 装在这里）；没有 venv 时退回 uv run。
if exist "..\.venv\Scripts\python.exe" (
  "..\.venv\Scripts\python.exe" -m websockify %WEBSOCKIFY_ARGS%
) else (
  uv run python -m websockify %WEBSOCKIFY_ARGS%
)

rem 进程退出时保留窗口，方便看报错
pause
