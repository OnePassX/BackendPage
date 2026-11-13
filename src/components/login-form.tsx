"use client"

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/api/session";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("请输入用户名和密码");
      return;
    }

    setLoading(true);
    try {
      // 登录成功后后端下发 sessionid（HttpOnly）与 csrftoken（可读）cookie，
      // 前端只缓存用户信息，不保存任何 token。
      await signIn(username.trim(), password);
      toast.success("登录成功");
      navigate("/server/dashboard", { replace: true });
    } catch (err) {
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
