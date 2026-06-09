"use client";

import Image from "next/image";
import { AlertTriangle, KeyRound, LogIn, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { BrandLockup, nosBrand } from "@/components/domain/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { roleLabels } from "@/lib/data/labels";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { LoginAccount, User } from "@/lib/types";

export function LoginClient({ initialAccounts }: { initialAccounts: LoginAccount[] }) {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);
  const [accounts] = useState(initialAccounts);
  const [employeeId, setEmployeeId] = useState(initialAccounts[0]?.employeeId ?? "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.employeeId === employeeId) ?? accounts[0],
    [accounts, employeeId],
  );

  async function login() {
    if (!employeeId) {
      setError("社員を選択してください。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await apiFetch<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ employeeId, password, provider: "email" }),
      });
      if (user.mustChangePassword) {
        setPendingUser(user);
        return;
      }
      setSession(user);
      router.replace("/");
    } catch {
      setError("パスワードを確認してください。初期パスワードは0000です。");
    } finally {
      setLoading(false);
    }
  }

  async function setInitialPassword() {
    if (!pendingUser) return;
    if (newPassword.length < 4) {
      setError("新しいパスワードは4文字以上で設定してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("確認用パスワードが一致していません。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await apiFetch<User>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          userId: pendingUser.id,
          currentPassword: password,
          newPassword,
        }),
      });
      setSession(user);
      router.replace("/");
    } catch {
      setError("パスワードを設定できませんでした。もう一度確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingUser) {
      void setInitialPassword();
      return;
    }
    void login();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center gap-8 lg:grid lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <BrandLockup className="max-w-xl" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
            <Sparkles className="h-4 w-4" />
            {nosBrand.companyName} internal OS
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-normal sm:text-5xl">{nosBrand.appName}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
            社員を選んでログインします。初回だけ初期パスワード0000を入力し、自分のパスワードに変更してください。
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["選ぶだけ", "メールアドレス入力なしで社員を選択"],
              ["初回設定", "初期パスワード0000から変更"],
              ["社内β", "タスク、案件、勤怠を実データで確認"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-panel border border-border bg-card p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <Card>
          <CardContent className="p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-panel bg-blue-50">
                <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="64px" />
              </div>
              <div>
                <p className="text-lg font-bold">ログイン</p>
                <p className="text-sm text-slate-500">社員テスト版</p>
              </div>
            </div>

            {selectedAccount ? (
              <div className="mb-4 rounded-panel border border-border bg-slate-50 p-3 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-panel bg-blue-600 text-sm font-bold text-white">
                    {selectedAccount.avatarUrl || selectedAccount.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{selectedAccount.name}</p>
                    <p className="truncate text-xs text-slate-500">{selectedAccount.department} / {selectedAccount.position}</p>
                  </div>
                  <Badge tone={selectedAccount.role === "admin" ? "blue" : "green"}>{roleLabels[selectedAccount.role]}</Badge>
                </div>
              </div>
            ) : null}

            {!accounts.length ? (
              <div className="mb-4 rounded-panel border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  社員一覧を読み込めません
                </div>
                <p className="mt-1">Supabaseの本番テーブルまたは社員データの準備が不足しています。管理者は使い方またはテスト画面で状態を確認してください。</p>
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-3">
              <Select
                aria-label="社員"
                disabled={Boolean(pendingUser) || loading || !accounts.length}
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value);
                  setPassword("");
                  setPendingUser(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
              >
                {accounts.map((account) => (
                  <option key={account.employeeId} value={account.employeeId}>
                    {account.name} / {roleLabels[account.role]}
                  </option>
                ))}
              </Select>

              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="パスワード"
                type="password"
                autoComplete="current-password"
                disabled={Boolean(pendingUser)}
              />

              {pendingUser ? (
                <div className="space-y-3 rounded-panel border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/15">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-100">
                    <KeyRound className="h-4 w-4" />
                    初回パスワード設定
                  </div>
                  <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="新しいパスワード" type="password" autoComplete="new-password" />
                  <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="新しいパスワードをもう一度" type="password" autoComplete="new-password" />
                </div>
              ) : null}

              {error ? <p className="rounded-panel bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}

              <Button
                className="w-full"
                disabled={loading || !accounts.length}
                type="submit"
                onClick={(event) => {
                  event.preventDefault();
                  if (pendingUser) {
                    void setInitialPassword();
                    return;
                  }
                  void login();
                }}
              >
                {pendingUser ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {pendingUser ? "パスワードを設定して入る" : "ログイン"}
              </Button>
            </form>

            {pendingUser ? (
              <Button className="mt-3 w-full" variant="ghost" disabled={loading} onClick={() => setPendingUser(null)}>
                社員選択に戻る
              </Button>
            ) : null}

            <div className="mt-5 rounded-panel bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4" />
                初期パスワード: 0000
              </div>
              <p className="mt-1 leading-6">初回ログイン後は、設定画面からいつでもパスワードを変更できます。</p>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <UserRound className="h-4 w-4" />
              社員一覧はサーバーから読み込み、パスワードは表示しません。
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
