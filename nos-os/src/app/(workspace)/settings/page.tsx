"use client";

import { Bot, Database, FileText, KeyRound, Moon, PlugZap, ShieldCheck, Smartphone } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roleLabels } from "@/lib/data/labels";
import { useAppStore } from "@/lib/store/app-store";

export default function SettingsPage() {
  const session = useAppStore((state) => state.session);
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <>
      <PageHeader title="設定" description="Phase2以降のAPI接続に備えた状態確認と、ローカルデモ設定です。" />

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              アカウント
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="名前" value={session?.name ?? "-"} />
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

function Integration({ icon: Icon, label, status }: { icon: typeof Database; label: string; status: string }) {
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <span className="font-medium">{label}</span>
      </div>
      <Badge className="mt-3" tone={status === "未接続" ? "amber" : "green"}>{status}</Badge>
    </div>
  );
}
