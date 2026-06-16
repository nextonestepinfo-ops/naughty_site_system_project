"use client";

import { ArrowUpRight, ClipboardList, ExternalLink, FileSpreadsheet, Megaphone, Palette, Rocket, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const showcaseBase = "/sales-showcase";
const sheetUrl = "https://docs.google.com/spreadsheets/d/1IjGTiIEuGUKaO2p46MW2mjnlDSCeCLdOVWDx_wb-1i0/edit";

const primaryActions = [
  { title: "サンプル", href: `${showcaseBase}/index.html`, icon: Sparkles, tone: "blue" as const },
  { title: "Before / After", href: `${showcaseBase}/before-after.html`, icon: Rocket, tone: "green" as const },
  { title: "メニュー", href: `${showcaseBase}/menu.html`, icon: Palette, tone: "amber" as const },
  { title: "ココナラ", href: `${showcaseBase}/coconala-checklist.html`, icon: ClipboardList, tone: "slate" as const },
];

const targets = [
  { label: "飲食", id: "restaurant" },
  { label: "美容", id: "beauty" },
  { label: "工務店", id: "builder" },
  { label: "医療", id: "clinic" },
  { label: "IT", id: "itsupport" },
];

const styles = [
  { label: "映画", id: "cinematic" },
  { label: "和", id: "japanese" },
  { label: "海外", id: "global" },
  { label: "ポップ", id: "kinetic" },
  { label: "ミニマル", id: "minimal" },
];

const flow = ["見せる", "選ぶ", "残す"];

export default function SalesMaterialsPage() {
  return (
    <>
      <PageHeader
        title="営業素材"
        description="見せる、選ぶ、残す。"
        actions={
          <>
            <a href={`${showcaseBase}/index.html`} target="_blank" rel="noreferrer">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" />
                開く
              </Button>
            </a>
            <a href={sheetUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" aria-label="リンク一覧">
                <FileSpreadsheet className="h-4 w-4" />
                一覧
              </Button>
            </a>
          </>
        }
      />

      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {primaryActions.map((item) => (
          <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="group flex min-h-28 flex-col justify-between rounded-panel border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-panel bg-slate-50 dark:bg-white/10">
                <item.icon className="h-5 w-5 text-accent" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-accent" />
            </div>
            <Badge tone={item.tone}>{item.title}</Badge>
          </a>
        ))}
      </section>

      <section className="mb-4 grid grid-cols-3 gap-2">
        {flow.map((item, index) => (
          <div key={item} className="grid min-h-20 place-items-center rounded-panel border border-border bg-card p-3 text-center shadow-soft">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-white dark:bg-white dark:text-slate-950">{index + 1}</span>
            <p className="mt-2 text-sm font-bold">{item}</p>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-accent" />
            業種
          </CardTitle>
          <a href={sheetUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-accent">
            一覧
          </a>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-5">
          {targets.map((target) => (
            <div key={target.id} className="rounded-panel border border-border p-3">
              <p className="mb-3 text-lg font-bold">{target.label}</p>
              <div className="grid gap-2">
                {styles.map((style) => (
                  <a
                    key={style.id}
                    href={`${showcaseBase}/samples/${target.id}/${style.id}/index.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center justify-between rounded-panel bg-slate-50 px-3 text-sm font-medium transition hover:bg-primary hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-slate-950"
                  >
                    {style.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <SmallNext title="営業先" />
        <SmallNext title="テンプレ" />
        <SmallNext title="実績" />
      </section>
    </>
  );
}

function SmallNext({ title }: { title: string }) {
  return (
    <div className="rounded-panel border border-dashed border-border bg-card p-4 text-center">
      <p className="text-sm text-slate-500">次</p>
      <p className="mt-1 text-lg font-bold">{title}</p>
    </div>
  );
}
