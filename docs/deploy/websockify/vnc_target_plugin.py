"""websockify token 插件：token 即目标地址（<IPv4>[:port]），无需 token 映射文件。

用法（在 websockify 目录下启动，本文件需与 bat 同目录）：

    python -m websockify --token-plugin=vnc_target_plugin.IpPortTokenPlugin 0.0.0.0:6080

前端连接地址：

    ws://<页面host>/websockify?token=192.168.6.47%3A5900

约定：

- token 必须是 IPv4 地址，端口可省略（默认 5900）；
- 端口只允许 5900-5909（RealVNC 常用范围），避免 6080 被当成任意内网端口的代理；
- 该方案假定局域网可信：能访问 6080 的客户端可让 websockify 连接内网任意 VNC 主机。
  若以后需要白名单，可改用 TokenFile / JSONTokenApi 方案（见 docs/design/quick-create-vnc.md §7）。
"""

import ipaddress

from websockify.token_plugins import BasePlugin

DEFAULT_VNC_PORT = 5900
ALLOWED_PORTS = range(5900, 5910)


class IpPortTokenPlugin(BasePlugin):
    """token = "<IPv4>[:port]"，返回 websockify 需要的 [host, port]。"""

    def lookup(self, token):
        if not token:
            return None

        token = token.strip()
        host, sep, port_text = token.rpartition(":")
        if not sep:
            host, port_text = token, ""

        port = int(port_text) if port_text.isdigit() else DEFAULT_VNC_PORT
        if port not in ALLOWED_PORTS:
            return None

        try:
            ip = ipaddress.ip_address(host)
        except ValueError:
            return None

        # 只接受 IPv4 单播地址：IPv6、0.0.0.0、组播都拒绝
        if ip.version != 4 or ip.is_unspecified or ip.is_multicast:
            return None

        return [str(ip), port]
