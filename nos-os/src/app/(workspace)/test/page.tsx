"use client";

import { AlertTriangle, CheckCircle2, ClipboardCheck, Database, ExternalLink, KeyRound, Megaphone, Rocket, ServerCog } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/domain/page-header";
import { LoadingPanel } from "@/components/domain/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScopedQuery } from "@/lib/hooks/use-api";
import type { DeploymentReadiness } from "@/lib/integrations/deployment-readiness";

export default function TestReadinessPage() {
  const readiness = useScopedQuery<DeploymentReadiness>(["health"], "/api/health");

  if (readiness.isLoading || !readiness.data) return <LoadingPanel label="テスト版の状態を確認中" />;

  const data = readiness.data;

  return (
    <>
      <PageHeader
        title="テスト版"
        description="社員に早めに触ってもらうための状態確認と、フィードバック導線です。"
        actions={
          <>
            <Link href="/tasks">
              <Button variant="secondary">
                <ClipboardCheck className="h-4 w-4" />
                タスクを試す
              </Button>
            </Link>
            <Link href="/sales">
              <Button variant="ghost">
                <Megaphone className="h-4 w-4" />
                営業素材
              </Button>
            </Link>
            <a href={data.githubBranchUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost">
                <ExternalLink className="h-4 w-4" />
                GitHub
              </Button>
            </a>
          </>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReadinessTile label="テスト状態" value={data.employeePreviewReady ? "共有OK" : "確認中"} ok={data.employeePreviewReady} />
        <ReadinessTile label="データ保存" value={data.dataMode === "supabase" ? "Supabase" : "デモ"} ok={data.dataMode === "supabase"} />
        <ReadinessTile label="AI秘書" value={data.openaiConfigured ? "接続済み" : "未設定"} ok={data.openaiConfigured} />
        <ReadinessTile label="ビルド" value={data.buildLabel} ok />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              まず社員に試してもらうこと
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChecklistItem done label="ログインして、自分の権限で見える画面を確認する" />
            <ChecklistItem done label="タスク画面で、開始、確認へ、完了を押して流れを試す" />
            <ChecklistItem done label="ホームで、今やること、次にやること、遅れた時の影響を見る" />
            <ChecklistItem done label="営業素材で、Before/After、飲食店サンプル、スプレッドシート導線を試す" />
            <ChecklistItem done label="カレンダー出力で今日の予定をダウンロードする" />
            <ChecklistItem done={data.openaiConfigured} label="AI秘書に 今日やること / 次に何？ / 売上は？ と聞く" />
            <ChecklistItem done={data.dataMode === "supabase"} label="複数人で同じタスクデータが残るか確認する" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="h-4 w-4" />
              接続状態
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConnectionRow icon={KeyRound} label="OpenAI" ok={data.openaiConfigured} />
            <ConnectionRow icon={Database} label="Supabase public key" ok={data.supabasePublicConfigured} />
            <ConnectionRow icon={Database} label="Supabase service role" ok={data.supabaseServiceConfigured} />
            <ConnectionRow icon={Database} label="Supabase tables" ok={data.supabaseSchemaReady} />
            <ConnectionRow icon={ServerCog} label="Google OAuth" ok={data.googleOAuthConfigured} optional />
            <ConnectionRow icon={ServerCog} label="Google Sheets" ok={data.googleSheetsConfigured} optional />
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              まだ注意すること
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.blockers.length ? (
              data.blockers.map((blocker) => (
                <p key={blocker} className="rounded-panel bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100">
                  {blocker}
                </p>
              ))
            ) : (
              <p className="rounded-panel bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">社員テストに必要な主要接続はそろっています。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>フィードバックの返し方</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <FeedbackStep title="画面" body="どのページか。例: タスク、ホーム、AI。" />
            <FeedbackStep title="操作" body="何を押したか。例: 完了、予定出力。" />
            <FeedbackStep title="期待" body="どうなってほしかったかを一言で。" />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ReadinessTile({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-panel border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <Badge tone={ok ? "green" : "amber"}>{ok ? "OK" : "要確認"}</Badge>
      </div>
      <p className="mt-3 text-xl font-bold">{value}</p>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-panel bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
      {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
      <span className="leading-6">{label}</span>
    </div>
  );
}

function ConnectionRow({ icon: Icon, label, ok, optional = false }: { icon: typeof KeyRound; label: string; ok: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-panel border border-border px-3 py-2 text-sm">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="font-medium">{label}</span>
      <Badge className="ml-auto" tone={ok ? "green" : optional ? "slate" : "amber"}>
        {ok ? "接続済み" : optional ? "後で" : "未設定"}
      </Badge>
    </div>
  );
}

function FeedbackStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{body}</p>
    </div>
  );
}
