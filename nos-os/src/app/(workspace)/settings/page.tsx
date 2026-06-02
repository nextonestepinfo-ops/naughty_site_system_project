"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { roleLabels } from "@/lib/data/labels";
import {
  buildSecretaryIntegrationPayload,
  clearClientIntegrationSettings,
  clientIntegrationDefaults,
  getClientIntegrationSettings,
  maskSecret,
  saveClientIntegrationSettings,
  type ClientIntegrationSettings,
} from "@/lib/integrations/client-settings";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { SecretaryReply } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const session = useAppStore((state) => state.session);
  const { resolvedTheme, setTheme } = useTheme();
  const [integrationSettings, setIntegrationSettings] = useState<ClientIntegrationSettings>(clientIntegrationDefaults);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("未保存");
  const [testStatus, setTestStatus] = useState("");
  const [supabaseTestStatus, setSupabaseTestStatus] = useState("");

  const openAiReady = Boolean(integrationSettings.openaiApiKey.trim());
  const supabaseReady = Boolean(integrationSettings.supabaseUrl.trim() && integrationSettings.supabaseAnonKey.trim());
  const localOnly = integrationSettings.aiProvider === "local";

  useEffect(() => {
    const settings = getClientIntegrationSettings();
    setIntegrationSettings(settings);
    setSettingsStatus(settings.openaiApiKey ? `保存済み: ${maskSecret(settings.openaiApiKey)}` : "未保存");
  }, []);

  function updateIntegrationSettings(patch: Partial<ClientIntegrationSettings>) {
    setIntegrationSettings((current) => ({ ...current, ...patch }));
  }

  function saveSettings() {
    saveClientIntegrationSettings(integrationSettings);
    setSettingsStatus(integrationSettings.openaiApiKey ? `保存済み: ${maskSecret(integrationSettings.openaiApiKey)}` : "保存済み: APIキー未設定");
    setTestStatus("");
    setSupabaseTestStatus("");
  }

  function clearSettings() {
    clearClientIntegrationSettings();
    setIntegrationSettings(clientIntegrationDefaults);
    setSettingsStatus("削除済み");
    setTestStatus("");
    setSupabaseTestStatus("");
  }

  async function testOpenAI() {
    saveClientIntegrationSettings(integrationSettings);
    setSettingsStatus(integrationSettings.openaiApiKey ? `保存済み: ${maskSecret(integrationSettings.openaiApiKey)}` : "保存済み: APIキー未設定");
    setTestStatus("接続テスト中...");
    const data = await apiFetch<SecretaryReply>("/api/ai/secretary", {
      method: "POST",
      body: JSON.stringify({
        message: "接続テストです。Nos OSで使えるか短く返して。",
        context: "Admin settings connection test.",
        integrationSettings: buildSecretaryIntegrationPayload(integrationSettings),
      }),
    });
    setTestStatus(data.configured ? `接続OK: ${data.source}` : "ローカル回答です。APIキー未設定、または接続に失敗しています。");
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
      setSupabaseTestStatus("接続NG: URLまたはキーを確認してください。");
    }
  }

  return (
    <>
      <PageHeader title="設定" description="まずAI秘書を使える状態にします。細かい連携はあとから足せます。" />

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <StatusTile
          icon={Bot}
          title="AI秘書"
          status={localOnly ? "ローカル" : openAiReady ? "接続準備OK" : "キー未設定"}
          body={localOnly ? "外部APIを使わず動きます。" : openAiReady ? "保存して接続テストできます。" : "OpenAIキーだけ入れれば始められます。"}
          tone={openAiReady && !localOnly ? "green" : "amber"}
        />
        <StatusTile
          icon={Database}
          title="データ連携"
          status={supabaseReady ? "Supabase準備OK" : "未接続"}
          body={supabaseReady ? "公開URLとpublic keyが入っています。" : "今はローカルデモデータで動いています。"}
          tone={supabaseReady ? "green" : "slate"}
        />
        <StatusTile
          icon={Palette}
          title="表示"
          status={resolvedTheme === "dark" ? "ダーク" : "ライト"}
          body="文字と入力欄のコントラストを強めています。"
          tone="blue"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              まずここだけ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {session?.role === "admin" ? (
              <>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">AIの動かし方</p>
                  <div className="grid grid-cols-2 gap-2 rounded-panel bg-slate-100 p-1 dark:bg-white/10">
                    <button
                      type="button"
                      className={cn(
                        "h-11 rounded-panel text-sm font-semibold transition",
                        integrationSettings.aiProvider === "openai" ? "bg-white text-accent shadow-sm dark:bg-slate-950" : "text-slate-500 dark:text-slate-300",
                      )}
                      onClick={() => updateIntegrationSettings({ aiProvider: "openai" })}
                    >
                      OpenAI
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "h-11 rounded-panel text-sm font-semibold transition",
                        integrationSettings.aiProvider === "local" ? "bg-white text-accent shadow-sm dark:bg-slate-950" : "text-slate-500 dark:text-slate-300",
                      )}
                      onClick={() => updateIntegrationSettings({ aiProvider: "local" })}
                    >
                      ローカル
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">OpenAI APIキー</label>
                  <div className="grid grid-cols-[1fr_44px] gap-2">
                    <Input
                      value={integrationSettings.openaiApiKey}
                      onChange={(event) => updateIntegrationSettings({ openaiApiKey: event.target.value })}
                      placeholder="sk-..."
                      type={showOpenAiKey ? "text" : "password"}
                      autoComplete="off"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label={showOpenAiKey ? "APIキーを隠す" : "APIキーを表示"}
                      title={showOpenAiKey ? "APIキーを隠す" : "APIキーを表示"}
                      onClick={() => setShowOpenAiKey((value) => !value)}
                    >
                      {showOpenAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">このPCのブラウザだけに保存します。GitHubには上がりません。</p>
                </div>

                <details className="rounded-panel border border-border bg-slate-50 p-3 dark:bg-white/5">
                  <summary className="cursor-pointer text-sm font-semibold">詳細設定</summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">モデル</span>
                      <Input value={integrationSettings.openaiModel} onChange={(event) => updateIntegrationSettings({ openaiModel: event.target.value })} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="font-medium">最大出力</span>
                      <Input
                        value={String(integrationSettings.openaiMaxOutputTokens)}
                        onChange={(event) => updateIntegrationSettings({ openaiMaxOutputTokens: Number(event.target.value) || 520 })}
                        inputMode="numeric"
                        type="number"
                      />
                    </label>
                  </div>
                </details>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveSettings}>
                    保存
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void testOpenAI()}>
                    接続テスト
                  </Button>
                  <Button type="button" variant="ghost" onClick={clearSettings}>
                    <Trash2 className="h-4 w-4" />
                    削除
                  </Button>
                </div>

                <div className={cn("rounded-panel px-3 py-2 text-sm", openAiReady ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200")}>
                  {settingsStatus}
                  {testStatus ? <span className="block pt-1">{testStatus}</span> : null}
                </div>
              </>
            ) : (
              <p className="rounded-panel bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">APIキーの入力は管理者のみ使えます。</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardContent className="flex gap-3 p-4">
              <BrandMark className="h-14 w-14 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent">{nosBrand.companyName}</p>
                <h2 className="mt-1 text-xl font-bold">{nosBrand.appName}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">日々のタスク、案件、勤怠、AI秘書をひとつにまとめた社内業務OSです。</p>
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
              <GuideStep done={openAiReady || localOnly} label="AI秘書を使える状態にする" />
              <GuideStep done={supabaseReady} label="Supabaseを接続する" />
              <GuideStep done={false} label="Google連携を本番用に入れる" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                表示
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                {resolvedTheme === "dark" ? "ライトにする" : "ダークにする"}
              </Button>
              <Badge tone="blue">{resolvedTheme === "dark" ? "ダークモード" : "ライトモード"}</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Supabase
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
            </div>
            {supabaseTestStatus ? (
              <div className={cn("rounded-panel px-3 py-2 text-sm", supabaseTestStatus.startsWith("接続OK") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200")}>
                {supabaseTestStatus}
              </div>
            ) : null}
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">service role keyは強い秘密鍵なので、この画面には保存しません。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="氏名" value={session?.name ?? "-"} />
            <Info label="メール" value={session?.email ?? "-"} />
            <Info label="権限" value={session ? roleLabels[session.role] : "-"} />
            <Info label="ログイン方式" value={session?.authProvider ?? "-"} />
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
            <Integration icon={Database} label="Supabase" status={supabaseReady ? "準備OK" : "未接続"} />
            <Integration icon={Bot} label="OpenAI" status={openAiReady ? "保存済み" : localOnly ? "ローカル" : "未設定"} />
            <Integration icon={FileText} label="Google Sheets" status="準備済み" />
            <Integration icon={Smartphone} label="PWA Push" status="ローカル" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>設計ドキュメント</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {["api.md", "ai-provider-setup.md", "supabase-setup.md", "screens.md"].map((file) => (
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

function Integration({ icon: Icon, label, status }: { icon: LucideIcon; label: string; status: string }) {
  const positive = status === "準備OK" || status === "保存済み" || status === "準備済み";
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="font-medium">{label}</span>
      </div>
      <Badge className="mt-3" tone={positive ? "green" : status === "未接続" || status === "未設定" ? "amber" : "slate"}>
        {status}
      </Badge>
    </div>
  );
}
