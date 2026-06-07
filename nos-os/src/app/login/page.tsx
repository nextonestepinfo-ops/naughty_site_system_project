"use client";

import Image from "next/image";
import { LogIn, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLockup, nosBrand } from "@/components/domain/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { roleLabels } from "@/lib/data/labels";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const demoAccounts: Array<{ role: Role; label: string; email: string; note: string }> = [
  { role: "admin", label: "うらた", email: "urata@nostechnology.jp", note: "管理者 / 代表" },
  { role: "employee", label: "社員", email: "akari@nostechnology.jp", note: "担当タスク中心" },
  { role: "sales", label: "営業", email: "mio@nostechnology.jp", note: "売上と顧客を確認" },
];

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("urata@nostechnology.jp");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requiresPassword = email === "urata@nostechnology.jp";

  async function login(provider: "google" | "email") {
    setLoading(true);
    setError("");
    try {
      const user = await apiFetch<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role, provider }),
      });
      setSession(user);
      router.replace("/");
    } catch {
      setError(requiresPassword ? "パスワードを確認してください。" : "ログインできませんでした。");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void login("email");
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
            朝開いた瞬間に、今日やること、次にやること、遅れた時のまずさ、売上と予定が見える社内業務OSです。
            {nosBrand.serviceName} のブランドを土台に、誰でも直感的に使える業務画面へ育てていきます。
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["今日が決まる", "優先度順に次の一手を表示"],
              ["声で入れられる", "音声メモからタスク化"],
              ["秘書に聞ける", "迷ったらAI秘書へ相談"],
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
                <p className="text-sm text-slate-500">Phase1 demo auth</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 rounded-panel bg-slate-100 p-1 dark:bg-white/10">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  className={cn(
                    "rounded-panel px-2 py-2 text-left text-sm font-medium transition",
                    email === account.email ? "bg-card shadow-sm" : "text-slate-500",
                  )}
                  onClick={() => {
                    setRole(account.role);
                    setEmail(account.email);
                    setPassword("");
                    setError("");
                  }}
                  type="button"
                >
                  <span className="block">{account.label}</span>
                  <span className="block text-[11px] font-normal">{account.note}</span>
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@nostechnology.jp" type="email" />
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={requiresPassword ? "パスワード" : "パスワード不要"}
                type="password"
              />
              {error ? <p className="rounded-panel bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-500/15 dark:text-red-100">{error}</p> : null}
              <Button className="w-full" disabled={loading} type="submit">
                <Mail className="h-4 w-4" />
                メールログイン
              </Button>
            </form>

            <Button className="mt-3 w-full" variant="secondary" disabled={loading} onClick={() => login("google")}>
              <LogIn className="h-4 w-4" />
              Googleログイン
            </Button>

            <div className="mt-5 rounded-panel bg-slate-50 p-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4" />
                権限デモ: {roleLabels[role]}
              </div>
              <p className="mt-1 leading-6">管理者は全体、社員・営業は担当範囲を中心に表示します。</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
