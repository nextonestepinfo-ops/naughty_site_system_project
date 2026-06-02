"use client";

import { Bot, Database, Eye, EyeOff, FileText, KeyRound, Moon, PlugZap, ShieldCheck, Smartphone, Trash2, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLockup, nosBrand } from "@/components/domain/brand";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
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

export default function SettingsPage() {
  const session = useAppStore((state) => state.session);
  const { resolvedTheme, setTheme } = useTheme();
  const [integrationSettings, setIntegrationSettings] = useState<ClientIntegrationSettings>(clientIntegrationDefaults);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState("未保存");
  const [testStatus, setTestStatus] = useState("");

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
  }

  function clearSettings() {
    clearClientIntegrationSettings();
    setIntegrationSettings(clientIntegrationDefaults);
    setSettingsStatus("削除済み");
    setTestStatus("");
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
    setTestStatus(data.configured ? `接続OK: ${data.source}` : "キー未設定、またはAPI接続に失敗したためローカル回答です。");
  }

  return (
    <>
      <PageHeader title="設定" description="Phase2以降のAPI接続に備えた状態確認と、ローカルデモ設定です。" />

      <section className="mb-5 grid gap-4 rounded-panel border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_1fr] md:items-center">
        <BrandLockup className="shadow-none" />
        <div>
          <p className="text-sm font-semibold text-accent">{nosBrand.companyName}</p>
          <h2 className="mt-2 text-2xl font-bold">{nosBrand.appName}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {nosBrand.serviceName} の社内業務OSとして、認証、社員、案件、タスク、勤怠、AI秘書をひとつの画面体験にまとめています。
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              管理者 API接続設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session?.role === "admin" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                    <label className="text-sm font-medium">AIプロバイダー</label>
                    <Select
                      value={integrationSettings.aiProvider}
                      onChange={(event) => updateIntegrationSettings({ aiProvider: event.target.value === "local" ? "local" : "openai" })}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="local">ローカル回答のみ</option>
                    </Select>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                    <label className="text-sm font-medium">OpenAI APIキー</label>
                    <div className="flex gap-2">
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
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                    <label className="text-sm font-medium">モデル</label>
                    <Input
                      value={integrationSettings.openaiModel}
                      onChange={(event) => updateIntegrationSettings({ openaiModel: event.target.value })}
                      placeholder="gpt-5.4-mini"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                    <label className="text-sm font-medium">最大出力</label>
                    <Input
                      value={String(integrationSettings.openaiMaxOutputTokens)}
                      onChange={(event) => updateIntegrationSettings({ openaiMaxOutputTokens: Number(event.target.value) || 520 })}
                      inputMode="numeric"
                      type="number"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                    <label className="text-sm font-medium">Supabase URL</label>
                    <Input
                      value={integrationSettings.supabaseUrl}
                      onChange={(event) => updateIntegrationSettings({ supabaseUrl: event.target.value })}
                      placeholder="https://xxxxx.supabase.co"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-center">
                    <label className="text-sm font-medium">Supabase anon key</label>
                    <Input
                      value={integrationSettings.supabaseAnonKey}
                      onChange={(event) => updateIntegrationSettings({ supabaseAnonKey: event.target.value })}
                      placeholder="public anon key"
                      type="password"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="rounded-panel bg-slate-50 p-4 text-sm leading-6 dark:bg-white/5">
                  <p className="font-semibold">保存状態</p>
                  <p className="mt-1 text-slate-500">{settingsStatus}</p>
                  <p className="mt-4 font-semibold">使い方</p>
                  <p className="mt-1 text-slate-500">
                    ここに入れたキーはこのPCのブラウザにだけ保存されます。GitHubには上がりません。保存後、AI秘書に聞くとOpenAIキーを使って回答します。
                  </p>
                  <p className="mt-3 text-slate-500">Supabaseのservice role keyは強い秘密鍵なので、アプリ画面には保存しません。本番化時はサーバー環境変数に入れます。</p>
                  <div className="mt-4 flex flex-wrap gap-2">
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
                  {testStatus ? <p className="mt-3 rounded-panel bg-card px-3 py-2 text-slate-600 dark:bg-slate-950 dark:text-slate-300">{testStatus}</p> : null}
                </div>
              </div>
            ) : (
              <p className="rounded-panel bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5">APIキーの入力は管理者のみ使えます。</p>
            )}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              表示
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="secondary" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              テーマ切替: {resolvedTheme === "dark" ? "ダーク" : "ライト"}
            </Button>
            <p className="text-sm text-slate-500">スマホ優先、PWA、ダークモード対応済みです。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlugZap className="h-4 w-4" />
              連携ステータス
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Integration icon={Database} label="Supabase" status="未接続" />
            <Integration icon={Bot} label="OpenAI" status="env接続" />
            <Integration icon={ShieldCheck} label="Google OAuth" status="未接続" />
            <Integration icon={FileText} label="Google Sheets" status="準備済み" />
            <Integration icon={Smartphone} label="PWA Push" status="ローカル" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>設計ドキュメント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              "architecture.md",
              "er-diagram.md",
              "db-tables.md",
              "screens.md",
              "navigation.md",
              "api.md",
              "ai-provider-setup.md",
              "supabase-setup.md",
              "directory-structure.md",
            ].map((file) => (
              <Link key={file} href="#" className="block rounded-panel bg-slate-50 px-3 py-2 text-accent dark:bg-white/5">
                docs/{file}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-panel bg-slate-50 px-3 py-2 dark:bg-white/5">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Integration({ icon: Icon, label, status }: { icon: LucideIcon; label: string; status: string }) {
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="font-medium">{label}</span>
      </div>
      <Badge className="mt-3" tone={status === "未接続" ? "amber" : "green"}>
        {status}
      </Badge>
    </div>
  );
}
