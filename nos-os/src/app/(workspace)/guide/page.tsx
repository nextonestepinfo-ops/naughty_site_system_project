import {
  ArrowRight,
  BellRing,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Home,
  KeyRound,
  MessageSquareText,
  Mic,
  MousePointerClick,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickLinks = [
  { href: "/tasks", label: "タスク", icon: ClipboardList },
  { href: "/projects", label: "案件", icon: BriefcaseBusiness },
  { href: "/attendance", label: "勤怠", icon: CalendarClock },
  { href: "/assistant", label: "AI秘書", icon: Bot },
  { href: "/notifications", label: "通知", icon: BellRing },
  { href: "/settings", label: "設定", icon: Settings },
];

const dailyFlow = [
  { title: "今日やることを見る", body: "ホームで優先タスク、遅れそうな作業、今日の予定を確認します。" },
  { title: "AIにタスク整理を頼む", body: "タスク画面のAI整理で、追加、削除、分解、期限変更を相談します。反映前に内容を確認できます。" },
  { title: "大タスクと小タスクをつなぐ", body: "小タスク作成時は大タスクを選びます。何の案件、どの大タスクの作業かが一覧でも見えます。" },
  { title: "タスクを更新する", body: "タスク画面で担当、期限、状態、見積時間、コメントを更新します。完了したら必ず状態を変えます。" },
  { title: "期限アラートを見る", body: "通知画面で本日期限、明日期限、期限超過のタスクを確認し、対象タスクを直接開きます。" },
  { title: "案件を確認する", body: "案件画面で顧客、担当、金額、進行状態を確認します。金額が変わったらその場で直します。" },
  { title: "勤怠を打刻する", body: "出勤、休憩、外出、会議、退勤を勤怠画面から記録します。" },
];

const adminFlow = [
  "浦田・大崎は管理者として全案件、全タスク、社員一覧、顧客情報を確認できます。",
  "社員が何の案件、どの大タスクを進めているかをタスク一覧で確認できます。",
  "社員の役割を変える時は社員画面で権限を変更します。",
  "本番状態はテスト画面と /api/health で確認します。",
  "フィードバックは画面名、操作、期待した動きの3点で集めます。",
];

const mobileFlow = [
  { icon: Home, title: "ホーム画面に追加", body: "スマホの共有メニューからホーム画面へ追加すると、アプリのように開けます。" },
  { icon: Mic, title: "声で下書き", body: "タスク画面のAI整理で音声入力を使い、追加、削除、分解の案を作れます。" },
  { icon: Bot, title: "iOS化の前提", body: "将来は同じタスクAPIをiOSアプリ、Shortcuts、Siri連携から呼べるようにします。今はWebで業務の型を固めます。" },
  { icon: CalendarClock, title: "予定へ入れる", body: "タスク画面の予定ボタン、またはホームのICSリンクからカレンダーへ取り込めます。双方向同期は次工程です。" },
  { icon: BellRing, title: "通知を確認", body: "画面内では本日、明日、期限超過のタスク通知を自動表示します。VAPID設定後はバックグラウンドPushも使えます。" },
];

export default function GuidePage() {
  return (
    <>
      <PageHeader
        title="使い方"
        description="社員テスト版で最初に確認する流れです。ログイン、タスク、案件、勤怠、AI秘書をここから一通り触れます。"
        actions={
          <Link href="/test">
            <Button variant="secondary">
              <CheckCircle2 className="h-4 w-4" />
              テスト状態
            </Button>
          </Link>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-6">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-panel border border-border bg-card p-4 transition hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10">
            <item.icon className="h-5 w-5 text-accent" />
            <p className="mt-3 font-semibold">{item.label}</p>
            <ArrowRight className="mt-2 h-4 w-4 text-slate-400" />
          </Link>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              ログイン
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <GuideLine icon={UserRound} title="社員を選ぶ" body="ログイン画面のプルダウンから自分の名前を選びます。メールアドレス入力は不要です。" />
            <GuideLine icon={KeyRound} title="初期パスワード" body="初回は 0000 で入ります。初回ログイン時に自分のパスワードへ変更します。" />
            <GuideLine icon={Settings} title="あとから変更" body="ログイン後は設定画面からいつでもパスワードを変更できます。" />
            <div className="rounded-panel bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-500/15 dark:text-blue-100">
              初期パスワードはテスト開始用です。社員に配った後は、各自が最初に変更してください。
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              毎日の流れ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyFlow.map((item, index) => (
              <div key={item.title} className="flex gap-3 rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-panel bg-primary text-xs font-bold text-white dark:bg-white dark:text-slate-950">{index + 1}</div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{item.body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              管理者
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {adminFlow.map((item) => (
              <div key={item} className="flex gap-2 rounded-panel bg-slate-50 px-3 py-2 text-sm leading-6 dark:bg-white/5">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-success" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              スマホ設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mobileFlow.map((item) => (
              <GuideLine key={item.title} icon={item.icon} title={item.title} body={item.body} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4" />
              フィードバック
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeedbackRow label="画面" body="どの画面か。例: タスク、案件、勤怠、AI秘書。" />
            <FeedbackRow label="操作" body="何をしたか。例: タスク作成、状態変更、打刻。" />
            <FeedbackRow label="期待" body="どう動いてほしかったか。1文でOKです。" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>まだ未対応</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusItem label="Googleログイン" />
            <StatusItem label="Google Sheets同期" />
            <StatusItem label="Gmail解析" />
            <StatusItem label="Googleカレンダー双方向同期" />
            <StatusItem label="Googleカレンダー自動同期" />
            <StatusItem label="Siri / App Shortcuts連携" />
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">社員βでは、まずタスク、案件、勤怠、目標ツリー、AI秘書の使い勝手を確認します。</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function GuideLine({ icon: Icon, title, body }: { icon: typeof UserRound; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-panel border border-border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{body}</p>
      </div>
    </div>
  );
}

function FeedbackRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
      <Badge tone="blue">{label}</Badge>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{body}</p>
    </div>
  );
}

function StatusItem({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-panel bg-slate-50 px-3 py-2 text-sm dark:bg-white/5">
      <span className="font-medium">{label}</span>
      <Badge tone="slate">次工程</Badge>
    </div>
  );
}
