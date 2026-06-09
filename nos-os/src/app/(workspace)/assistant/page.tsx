"use client";

import Image from "next/image";
import { BrainCircuit, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AssistantMessage } from "@/components/domain/assistant-message";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import type { AiSummary, Employee, Project, SecretaryReply, Task } from "@/lib/types";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

const samplePrompts = ["今日やる順番", "タスクを分解", "減らせる候補", "担当者別に確認"];

export default function AssistantPage() {
  const recommendations = useScopedQuery<AiSummary[]>(["ai-recommendations"], "/api/ai/recommendations");
  const tasks = useScopedQuery<Task[]>(["tasks"], "/api/tasks");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const [question, setQuestion] = useState("");
  const [loadedInitialPrompt, setLoadedInitialPrompt] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("今日やるべきことを、期限、優先度、顧客返信待ち、遅延リスクから整理します。");
  const [source, setSource] = useState<SecretaryReply["source"]>("local");

  const projectMap = useMemo(() => new Map((projects.data ?? []).map((project) => [project.id, project])), [projects.data]);
  const employeeMap = useMemo(() => new Map((employees.data ?? []).map((employee) => [employee.id, employee])), [employees.data]);
  const taskContext = useMemo(
    () =>
      (tasks.data ?? [])
        .slice(0, 25)
        .map((task) => {
          const project = projectMap.get(task.projectId);
          const assignee = employeeMap.get(task.primaryAssigneeId);
          return [
            `タスク:${task.title}`,
            `案件:${project?.name ?? "未設定"}`,
            task.sourceGoalTreeTitle ? `目標:${task.sourceGoalTreeTitle}` : null,
            task.sourceBranchTitle ? `大タスク:${task.sourceBranchTitle}` : null,
            `担当:${assignee?.name ?? "未設定"}`,
            `状態:${taskStatusLabels[task.status]}`,
            `優先度:${taskPriorityLabels[task.priority]}`,
            `期限:${task.dueDate}`,
            `AI優先度:${task.aiPriorityScore}`,
          ]
            .filter(Boolean)
            .join(" / ");
        })
        .join("\n"),
    [employeeMap, projectMap, tasks.data],
  );

  useEffect(() => {
    if (loadedInitialPrompt) return;
    const prompt = new URLSearchParams(window.location.search).get("prompt");
    if (prompt) setQuestion(prompt);
    setLoadedInitialPrompt(true);
  }, [loadedInitialPrompt]);

  async function ask(text = question) {
    const normalized = text.trim();
    if (!normalized || loading) return;

    setLoading(true);
    try {
      const data = await apiFetch<SecretaryReply>("/api/ai/secretary", {
        method: "POST",
        body: JSON.stringify({
          message: normalized,
          context: [
            "現在のAI提案:",
            recommendations.data?.map((item) => `${item.title}: ${item.summary}`).join("\n"),
            "現在のタスク一覧:",
            taskContext,
            "タスクの追加・削除・分解を提案するときは、案件、大タスク、小タスク、担当者、消してよい理由を短く示す。DB操作は提案だけにして、実行したとは言わない。",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      setAnswer(data.reply);
      setSource(data.source);
      setQuestion("");
    } catch {
      setAnswer("通信に失敗しました。少し時間を置いて、もう一度試してください。");
      setSource("local");
    } finally {
      setLoading(false);
    }
  }

  if (recommendations.isLoading || !recommendations.data) return <LoadingPanel label="AI提案を読み込み中" />;

  function startVoice() {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAnswer("このブラウザでは音声入力が使えません。Chromeかスマホのキーボード音声入力で試してください。");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setQuestion(text);
      void ask(text);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <>
      <PageHeader title="AI Assistant" description="Nos秘書に、今日やること、タスクの分解、減らせる候補、担当者別の状況を聞けます。" />

      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              今日やるべきこと
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.data.map((item) => (
              <div key={item.id} className="rounded-panel border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-300">{item.summary}</p>
                  </div>
                  <Badge tone={item.score > 85 ? "red" : "blue"}>{item.score}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid gap-3 p-4 sm:grid-cols-[120px_1fr]">
                <div className="relative h-32 overflow-hidden rounded-panel bg-blue-50 sm:h-36">
                  <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="120px" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">Nos秘書</p>
                    <Badge tone={source === "openai" ? "blue" : "slate"}>{source === "openai" ? "OpenAI" : "Local"}</Badge>
                  </div>
                  <div className="mt-3 max-h-96 overflow-y-auto rounded-panel border border-border bg-slate-50 p-3 dark:bg-white/5">
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        整理しています...
                      </div>
                    ) : (
                      <AssistantMessage text={answer} />
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-border p-4">
                <div className="grid grid-cols-[1fr_44px_44px] gap-2">
                  <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例: 次に何をやる？" onKeyDown={(event) => event.key === "Enter" && void ask()} />
                  <Button aria-label="送信" title="送信" size="icon" disabled={loading || !question.trim()} onClick={() => void ask()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  <Button aria-label="音声入力" title="音声入力" size="icon" variant={listening ? "danger" : "secondary"} onClick={startVoice}>
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {samplePrompts.map((sample) => (
                    <button key={sample} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10 dark:text-slate-200" onClick={() => void ask(sample)}>
                      {sample}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                スコア設計
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Score label="期限" value="40%" />
              <Score label="優先度" value="30%" />
              <Score label="顧客返信待ち" value="20%" />
              <Score label="遅延リスク" value="10%" />
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-panel bg-slate-50 px-3 py-2 dark:bg-white/5">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
