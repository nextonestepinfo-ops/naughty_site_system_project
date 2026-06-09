"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, BookOpenCheck, ChevronDown, CircleHelp, KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { BrandLockup, BrandMark, nosBrand } from "@/components/domain/brand";
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
      setError("パスワードを確認してください。初めての方は下の案内を見てください。");
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
    <main className="min-h-screen bg-background px-3 py-4 sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-center gap-4 sm:gap-6 lg:min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-8">
        <section className="text-center lg:text-left">
          <BrandLockup className="hidden max-w-xl lg:block" />
          <BrandMark className="mx-auto h-14 w-14 lg:hidden" />
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-200 sm:text-sm lg:mt-5">
            <Sparkles className="h-4 w-4" />
            社員β
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-normal sm:text-4xl lg:mt-5 lg:text-5xl">{nosBrand.appName}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base lg:mx-0 lg:mt-4 lg:max-w-xl lg:leading-8">
            社員を選んで、今日やることへすぐ入ります。
          </p>
          <div className="mt-8 hidden gap-3 lg:grid lg:grid-cols-3">
            {[
              ["選ぶだけ", "メールアドレス入力なし"],
              ["毎日使う", "タスク、案件、勤怠を確認"],
              ["社内β", "使いながら改善"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-panel border border-border bg-card p-4">
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="shadow-soft">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3 sm:mb-5">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-panel bg-blue-50 sm:h-16 sm:w-16">
                <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="64px" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">ログイン</p>
                <p className="truncate text-sm text-slate-500">社員テスト版</p>
              </div>
            </div>

            {selectedAccount ? (
              <div className="mb-3 rounded-panel border border-border bg-slate-50 p-3 dark:bg-white/5 sm:mb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-blue-600 text-sm font-bold text-white sm:h-11 sm:w-11">
                    {selectedAccount.avatarUrl || selectedAccount.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{selectedAccount.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {selectedAccount.department} / {selectedAccount.position}
                    </p>
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

              <Button className="h-12 w-full text-base sm:h-11 sm:text-sm" disabled={loading || !accounts.length} type="submit">
                {pendingUser ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {pendingUser ? "パスワードを設定して入る" : "ログイン"}
              </Button>
            </form>

            {pendingUser ? (
              <Button className="mt-3 w-full" variant="ghost" disabled={loading} onClick={() => setPendingUser(null)}>
                社員選択に戻る
              </Button>
            ) : null}

            <details className="group mt-4 rounded-panel border border-border bg-slate-50 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4 text-blue-600" />
                  初めて使う方はこちら
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border px-3 pb-3 pt-3 leading-6">
                <div className="flex gap-2">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p>
                    初回だけパスワード欄に <span className="font-semibold text-foreground">0000</span> を入れます。その後、自分のパスワードを設定して入ります。
                  </p>
                </div>
                <div className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <p>社員一覧はサーバーから読み込みます。パスワードは画面に表示しません。</p>
                </div>
                <Link
                  href="/guide"
                  className="inline-flex min-h-10 items-center gap-2 rounded-panel bg-white px-3 py-2 font-semibold text-blue-700 ring-1 ring-border transition hover:bg-blue-50 dark:bg-white/10 dark:text-blue-100 dark:hover:bg-white/15"
                >
                  <BookOpenCheck className="h-4 w-4" />
                  使い方を確認する
                </Link>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
