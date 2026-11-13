"use client"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoaderIcon, RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login as loginApi } from "@/api/auth";
import { TOKEN_KEY } from "@/api/apiClient";
import { mediaUrl } from "@/api/apiClient";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      // const csrftoken = getCookie('csrftoken');
      const params: Record<string, string> = { username: username.trim(), password };
      console.log(params);
      const res = await loginApi(params);
      const data = res.data || res;
      console.log("loginApi res:", data);
      // Extract token and user info
      const token = data.token || data.access_token;
      const user = data.user || data;
      const displayName = user?.username || user?.nickname || user?.name || username;

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      localStorage.setItem("backend_username", displayName);
      localStorage.setItem("backend_rolename", user.role.name);
      localStorage.setItem("backend_roleid", user.role.id);

      toast.success("登录成功");
      navigate("/server/dashboard", { replace: true });
    } catch (err) {
      console.log(err);
      const msg = err instanceof Error ? err.message : "登录失败";
      setError(msg);
      toast.error(msg);

    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">智能中控系统</h1>
          <p className="text-sm text-balance text-muted-foreground">
            后台管理登录
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="username">用户名</FieldLabel>
          <Input
            id="username"
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
            autoFocus
          />
        </Field>

        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">密码</FieldLabel>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="请输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </Field>
        <Field>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <LoaderIcon className="mr-2 size-4 animate-spin" />}
            {loading ? "登录中..." : "登 录"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
