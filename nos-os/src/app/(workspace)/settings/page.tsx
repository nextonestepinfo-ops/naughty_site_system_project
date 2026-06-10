"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  KeyRound,
  Moon,
  Palette,
  PlugZap,
  ShieldCheck,
  Smartphone,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark, nosBrand } from "@/components/domain/brand";
import { PageHeader } from "@/components/domain/page-header";
import { ThemeModeControl } from "@/components/domain/theme-mode-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { roleLabels } from "@/lib/data/labels";
import {
  clearClientIntegrationSettings,
  clientIntegrationDefaults,
  getClientIntegrationSettings,
  maskSecret,
  saveClientIntegrationSettings,
  type ClientIntegrationSettings,
} from "@/lib/integrations/client-settings";
import type { DeploymentReadiness } from "@/lib/integrations/deployment-readiness";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { SecretaryReply, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);
  const { resolvedTheme, theme } = useTheme();
  const [integrationSettings, setIntegrationSettings] = useState<ClientIntegrationSettings>(clientIntegrationDefaults);
  const [readiness, setReadiness] = useState<DeploymentReadiness | null>(null);
  const [readinessStatus, setReadinessStatus] = useState("確認中...");
  const [settingsStatus, setSettingsStatus] = useState("未保存");
  const [testStatus, setTestStatus] = useState("");
  const [supabaseTestStatus, setSupabaseTestStatus] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");

  const openAiReady = Boolean(readiness?.openaiConfigured);
  const supabaseReady = Boolean(readiness?.supabasePublicConfigured);
  const themeStatus =
    theme === "system"
      ? `端末に合わせる（${resolvedTheme === "dark" ? "ダーク" : "ライト"}）`
      : resolvedTheme === "dark"
        ? "ダーク"
        : "ライト";

  useEffect(() => {
    const settings = getClientIntegrationSettings();
    setIntegrationSettings(settings);
    setSettingsStatus(settings.supabaseAnonKey ? `保存済み: ${maskSecret(settings.supabaseAnonKey)}` : "未保存");
    void refreshReadiness();
  }, []);

  async function refreshReadiness() {
    setReadinessStatus("確認中...");
    try {
      const data = await apiFetch<DeploymentReadiness>("/api/health");
      setReadiness(data);
      setReadinessStatus("確認済み");
    } catch {
      setReadiness(null);
      setReadinessStatus("確認できませんでした");
    }
  }

  function updateIntegrationSettings(patch: Partial<ClientIntegrationSettings>) {
    setIntegrationSettings((current) => ({ ...current, ...patch }));
  }

  function saveSettings() {
    saveClientIntegrationSettings(integrationSettings);
    setSettingsStatus(integrationSettings.supabaseAnonKey ? `保存済み: ${maskSecret(integrationSettings.supabaseAnonKey)}` : "保存済み: 公開キー未設定");
    setSupabaseTestStatus("");
  }

  function clearSettings() {
    clearClientIntegrationSettings();
    setIntegrationSettings(clientIntegrationDefaults);
    setSettingsStatus("削除済み");
    setSupabaseTestStatus("");
  }

  async function testOpenAI() {
    setTestStatus("接続テスト中...");
    try {
      const data = await apiFetch<SecretaryReply>("/api/ai/secretary", {
        method: "POST",
        body: JSON.stringify({
          message: "接続テストです。Nos OSで使えるか短く返してください。",
          context: "Admin settings connection test.",
        }),
      });
      setTestStatus(data.source === "openai" && data.configured ? "接続OK: OpenAIで返答しました。" : "ローカル返答です。ホスト側のOPENAI_API_KEYを確認してください。");
    } catch {
      setTestStatus("接続NG: APIルートまたはホスト設定を確認してください。");
    } finally {
      void refreshReadiness();
    }
  }

  async function testSupabase() {
    const supabaseUrl = integrationSettings.supabaseUrl.trim().replace(/\/$/, "");
    const supabaseAnonKey = integrationSettings.supabaseAnonKey.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      setSupabaseTestStatus("Supabase URL と public key を入れてください。");
      return;
    }

    saveClientIntegrationSettings(integrationSettings);
    setSupabaseTestStatus("Supabase接続テスト中...");

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      if (response.ok) {
        setSupabaseTestStatus("接続OK: usersテーブルまで確認できました。");
        return;
      }

      setSupabaseTestStatus(`接続NG: ${response.status} ${response.statusText || ""}`.trim());
    } catch {
      setSupabaseTestStatus("接続NG: URLまたは公開キーを確認してください。");
    }
  }

  async function changeOwnPassword() {
    if (!session) return;
    if (newPassword.length < 4) {
      setPasswordStatus("新しいパスワードは4文字以上で設定してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("確認用パスワードが一致していません。");
      return;
    }

    setPasswordStatus("変更中...");
    try {
      const user = await apiFetch<User>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          userId: session.id,
          currentPassword,
          newPassword,
        }),
      });
      setSession(user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("パスワードを変更しました。");
    } catch {
      setPasswordStatus("変更できませんでした。現在のパスワードを確認してください。");
    }
  }

  return (
    <>
      <PageHeader title="設定" description="APIキーはホスト側で管理します。社員のブラウザには保存しません。" />

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <StatusTile
          icon={Bot}
          title="AI秘書"
          status={openAiReady ? "接続準備OK" : "サーバー未設定"}
          body={openAiReady ? "全員が会社共通のOpenAI設定で使えます。" : "Vercelなどのホスト側にOPENAI_API_KEYを入れてください。"}
          tone={openAiReady ? "green" : "amber"}
        />
        <StatusTile
          icon={Database}
          title="データ連携"
          status={supabaseReady ? "Supabase準備OK" : "未接続"}
          body={supabaseReady ? "公開URLとpublic keyはホスト側で確認できています。" : "今はローカル/デモデータ中心で動きます。"}
          tone={supabaseReady ? "green" : "slate"}
        />
        <StatusTile
          icon={Palette}
          title="表示"
          status={themeStatus}
          body="ライト、ダーク、端末に合わせるを選べます。ダーク時も文字の読みやすさを優先します。"
          tone="blue"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              AIキー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-panel border border-border bg-slate-50 p-4 dark:bg-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={openAiReady ? "green" : "amber"}>{openAiReady ? "ホスト設定済み" : "ホスト未設定"}</Badge>
                <span className="text-sm text-slate-500 dark:text-slate-300">{readinessStatus}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                OpenAI APIキーはこの画面では入力しません。Vercelの環境変数に `OPENAI_API_KEY` を入れると、社員全員が同じ会社用キーでAI秘書を使えます。
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ReadinessLine label="OpenAI" ok={openAiReady} />
              <ReadinessLine label="Supabase public" ok={Boolean(readiness?.supabasePublicConfigured)} />
              <ReadinessLine label="Supabase service" ok={Boolean(readiness?.supabaseServiceConfigured)} />
              <ReadinessLine label="Google OAuth" ok={Boolean(readiness?.googleOAuthConfigured)} />
              <ReadinessLine label="Google Sheets" ok={Boolean(readiness?.googleSheetsConfigured)} />
              <ReadinessLine label="データモード" ok={readiness?.dataMode === "supabase"} value={readiness?.dataMode ?? "-"} />
            </div>

            {readiness?.blockers.length ? (
              <div className="space-y-2 rounded-panel bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-100">
                {readiness.blockers.map((blocker) => (
                  <p key={blocker}>{blocker}</p>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void refreshReadiness()}>
                状態を更新
              </Button>
              <Button type="button" variant="secondary" onClick={() => void testOpenAI()}>
                AI接続テスト
              </Button>
            </div>

            {testStatus ? (
              <div className={cn("rounded-panel px-3 py-2 text-sm", testStatus.startsWith("接続OK") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200")}>
                {testStatus}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="flex gap-3 p-4">
              <BrandMark className="h-14 w-14 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">{nosBrand.companyName}</p>
                <h2 className="mt-1 text-xl font-bold">{nosBrand.appName}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">日々のタスク、案件、売上、AI秘書をひとつにまとめた社内業務OSです。</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlugZap className="h-4 w-4" />
                次にやる設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <GuideStep done={openAiReady} label="VercelにOPENAI_API_KEYを入れる" />
              <GuideStep done={supabaseReady} label="Supabaseを接続する" />
              <GuideStep done={Boolean(readiness?.googleOAuthConfigured)} label="Googleログインを本番用にする" />
              <Link href="/test" className="block rounded-panel bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                テストステータスを見る
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                表示
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ThemeModeControl />
              <div className="rounded-panel bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-200">
                現在: {themeStatus}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Supabase公開設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={integrationSettings.supabaseUrl} onChange={(event) => updateIntegrationSettings({ supabaseUrl: event.target.value })} placeholder="https://xxxxx.supabase.co" />
            <Input value={integrationSettings.supabaseAnonKey} onChange={(event) => updateIntegrationSettings({ supabaseAnonKey: event.target.value })} placeholder="anon / publishable public key" type="password" autoComplete="off" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={saveSettings}>
                保存
              </Button>
              <Button type="button" variant="secondary" onClick={() => void testSupabase()}>
                Supabase接続テスト
              </Button>
              <Button type="button" variant="ghost" onClick={clearSettings}>
                <Trash2 className="h-4 w-4" />
                削除
              </Button>
            </div>
            <div className="rounded-panel bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">{settingsStatus}</div>
            {supabaseTestStatus ? (
              <div className={cn("rounded-panel px-3 py-2 text-sm", supabaseTestStatus.startsWith("接続OK") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200")}>
                {supabaseTestStatus}
              </div>
            ) : null}
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">service role keyは強い秘密情報なので、この画面には保存しません。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Info label="氏名" value={session?.name ?? "-"} />
            <Info label="社員ID" value={session?.employeeId ?? "-"} />
            <Info label="権限" value={session ? roleLabels[session.role] : "-"} />
            <Info label="ログイン方式" value={session?.authProvider ?? "-"} />
            <div className="rounded-panel border border-border p-3">
              <p className="font-semibold">パスワード変更</p>
              <div className="mt-3 space-y-2">
                <Input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="現在のパスワード" type="password" autoComplete="current-password" />
                <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="新しいパスワード" type="password" autoComplete="new-password" />
                <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="新しいパスワードをもう一度" type="password" autoComplete="new-password" />
                <Button type="button" variant="secondary" onClick={() => void changeOwnPassword()}>
                  パスワードを変更
                </Button>
                {passwordStatus ? <p className="rounded-panel bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{passwordStatus}</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              連携状態
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Integration icon={Database} label="Supabase" ok={supabaseReady} positiveText="準備OK" negativeText="未接続" />
            <Integration icon={Bot} label="OpenAI" ok={openAiReady} positiveText="ホスト設定済み" negativeText="未設定" />
            <Integration icon={FileText} label="Google Sheets" ok={Boolean(readiness?.googleSheetsConfigured)} positiveText="準備OK" negativeText="未設定" />
            <Integration icon={Smartphone} label="PWA Push" ok={Boolean(readiness?.pwaPushConfigured)} positiveText="準備OK" negativeText="画面内通知のみ" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>設計ドキュメント</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {["api.md", "ai-provider-setup.md", "supabase-setup.md", "employee-test-deployment.md", "pwa-push-setup.md", "ios-voice-integration-roadmap.md"].map((file) => (
              <Link key={file} href="#" className="rounded-panel bg-slate-50 px-3 py-2 text-accent dark:bg-white/5">
                docs/{file}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StatusTile({
  icon: Icon,
  title,
  status,
  body,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  status: string;
  body: string;
  tone: "slate" | "blue" | "green" | "amber";
}) {
  const toneClass = {
    slate: "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
    blue: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-100",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100",
  }[tone];

  return (
    <div className={cn("rounded-panel border p-4", toneClass)}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-3 text-lg font-bold">{status}</p>
      <p className="mt-1 text-sm leading-6 opacity-80">{body}</p>
    </div>
  );
}

function ReadinessLine({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-panel bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
      <span className="font-medium">{label}</span>
      <Badge tone={ok ? "green" : "amber"}>{value ?? (ok ? "OK" : "未設定")}</Badge>
    </div>
  );
}

function GuideStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-panel bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
      {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-amber-500" />}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-panel bg-slate-50 px-3 py-2 dark:bg-white/5">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Integration({
  icon: Icon,
  label,
  ok,
  positiveText,
  negativeText,
}: {
  icon: LucideIcon;
  label: string;
  ok: boolean;
  positiveText: string;
  negativeText: string;
}) {
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="font-medium">{label}</span>
      </div>
      <Badge className="mt-3" tone={ok ? "green" : "amber"}>
        {ok ? positiveText : negativeText}
      </Badge>
    </div>
  );
}
