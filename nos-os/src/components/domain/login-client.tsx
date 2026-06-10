"use client";

import Link from "next/link";
import { AlertTriangle, BookOpenCheck, ChevronDown, CircleHelp, Delete, KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { BrandMark, nosBrand } from "@/components/domain/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { roleLabels } from "@/lib/data/labels";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { LoginAccount, User } from "@/lib/types";

const avatarStyles = [
  "from-[#0B1226] to-[#243353]",
  "from-[#16203B] to-[#46587E]",
  "from-[#E08F12] to-[#F0A93C]",
  "from-[#6366F1] to-[#8B5CF6]",
];

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
    if (!password) {
      setError("パスコードを入力してください。");
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
      setError("パスコードを確認してください。初回は 0000 です。");
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

  function pressKey(value: string) {
    if (pendingUser || loading) return;
    setError("");
    setPassword((current) => (current + value).slice(0, 8));
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0B1226] px-3 py-4 text-white sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col justify-center gap-5 lg:min-h-[calc(100vh-4rem)] lg:grid lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-10">
        <section>
          <div className="flex items-center gap-3">
            <BrandMark className="h-14 w-14 shrink-0" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">NOS OS V2</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-5xl">{nosBrand.appName}</h1>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-lg font-bold leading-8 text-slate-100">チームの今日を、ひとつの画面に。</p>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">社員を選んでパスコードで入ります。初回は 0000 を入力し、自分のパスワードに変更します。</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {accounts.map((account, index) => (
              <button
                key={account.employeeId}
                className={cn(
                  "rounded-panel border p-3 text-left transition",
                  account.employeeId === employeeId ? "border-[#E08F12] bg-white text-[#0B1226]" : "border-white/10 bg-white/7 text-white hover:bg-white/10",
                )}
                onClick={() => {
                  setEmployeeId(account.employeeId);
                  setPassword("");
                  setPendingUser(null);
                  setError("");
                }}
                type="button"
              >
                <div className={cn("grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white", avatarStyles[index % avatarStyles.length])}>
                  {account.name.slice(0, 1)}
                </div>
                <p className="mt-3 truncate font-extrabold">{account.name}</p>
                <p className={cn("mt-1 truncate text-xs", account.employeeId === employeeId ? "text-slate-500" : "text-slate-300")}>{account.position}</p>
                <Badge className="mt-2" tone={account.role === "admin" ? "blue" : "green"}>{roleLabels[account.role]}</Badge>
              </button>
            ))}
          </div>
        </section>

        <Card className="border-white/80 bg-white text-[#0B1226] shadow-command">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="ios-kicker">LOGIN</p>
                <p className="mt-1 text-2xl font-extrabold">パスコード</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                <Sparkles className="h-4 w-4" />
                社員β
              </span>
            </div>

            {!accounts.length ? (
              <div className="mb-4 rounded-panel border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  社員一覧を読み込めません
                </div>
                <p className="mt-1">Supabaseの本番テーブルまたは社員データの準備が不足しています。テスト画面で状態を確認してください。</p>
              </div>
            ) : null}

            {selectedAccount ? (
              <div className="mb-5 rounded-panel bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0B1226] text-sm font-extrabold text-white">
                    {selectedAccount.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{selectedAccount.name}</p>
                    <p className="truncate text-xs text-slate-500">{selectedAccount.department} / {selectedAccount.position}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              <div className={cn("flex justify-center gap-3 rounded-panel bg-slate-50 p-4", error && "animate-pulse ring-2 ring-red-200")}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <span key={index} className={cn("h-4 w-4 rounded-full border-2", password.length > index ? "border-[#0B1226] bg-[#0B1226]" : "border-slate-300 bg-white")} />
                ))}
              </div>

              {!pendingUser ? (
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((value) => (
                    <button key={value} type="button" className="spring h-14 rounded-full bg-slate-100 text-xl font-extrabold hover:bg-slate-200" onClick={() => pressKey(value)}>
                      {value}
                    </button>
                  ))}
                  <button type="button" className="spring h-14 rounded-full bg-slate-100 font-bold hover:bg-slate-200" onClick={() => setPassword("")}>
                    Clear
                  </button>
                  <button type="button" className="spring h-14 rounded-full bg-slate-100 text-xl font-extrabold hover:bg-slate-200" onClick={() => pressKey("0")}>
                    0
                  </button>
                  <button type="button" className="spring grid h-14 place-items-center rounded-full bg-slate-100 hover:bg-slate-200" onClick={() => setPassword((current) => current.slice(0, -1))}>
                    <Delete className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-panel border border-indigo-100 bg-indigo-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-800">
                    <KeyRound className="h-4 w-4" />
                    初回パスワード設定
                  </div>
                  <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="新しいパスワード" type="password" autoComplete="new-password" />
                  <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="新しいパスワードをもう一度" type="password" autoComplete="new-password" />
                </div>
              )}

              {error ? <p className="rounded-panel bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}

              <Button className="h-12 w-full text-base" disabled={loading || !accounts.length} type="submit" variant="secondary">
                {pendingUser ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {pendingUser ? "パスワードを設定して入る" : "ログイン"}
              </Button>
            </form>

            {pendingUser ? (
              <Button className="mt-3 w-full" variant="ghost" disabled={loading} onClick={() => setPendingUser(null)}>
                社員選択に戻る
              </Button>
            ) : null}

            <details className="group mt-4 rounded-panel border border-border bg-slate-50 text-sm text-slate-600">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 font-extrabold text-[#0B1226] [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4 text-indigo-600" />
                  初めて使う方はこちら
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border px-3 pb-3 pt-3 leading-6">
                <div className="flex gap-2">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <p>初回だけ <span className="font-extrabold text-[#0B1226]">0000</span> を入れます。その後、自分のパスワードを設定します。</p>
                </div>
                <div className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <p>社員一覧はサーバーから読み込みます。パスワードは画面に表示しません。</p>
                </div>
                <Link href="/guide" className="inline-flex min-h-10 items-center gap-2 rounded-panel bg-white px-3 py-2 font-extrabold text-indigo-700 ring-1 ring-border">
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
