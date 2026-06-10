"use client";

import { Bot, CheckCircle2, Loader2, Mic, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AssistantMessage } from "@/components/domain/assistant-message";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: SecretaryReply["source"];
};

const samplePrompts = ["段取りを作って", "タスクを整理して", "今日の振り返り", "明日の準備"];

export default function AssistantPage() {
  const recommendations = useScopedQuery<AiSummary[]>(["ai-recommendations"], "/api/ai/recommendations");
  const tasks = useScopedQuery<Task[]>(["tasks"], "/api/tasks");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const [question, setQuestion] = useState("");
  const [loadedInitialPrompt, setLoadedInitialPrompt] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "今日やること、タスク整理、段取り相談を手伝います。変更は必ず提案として出すので、確認してから反映してください。",
      source: "local",
    },
  ]);

  const projectMap = useMemo(() => new Map((projects.data ?? []).map((project) => [project.id, project])), [projects.data]);
  const employeeMap = useMemo(() => new Map((employees.data ?? []).map((employee) => [employee.id, employee])), [employees.data]);
  const taskContext = useMemo(
    () =>
      (tasks.data ?? [])
        .slice(0, 25)
        .map((task) => {
          const project = task.projectId ? projectMap.get(task.projectId) : null;
          const assignee = employeeMap.get(task.primaryAssigneeId);
          return [
            `タスク:${task.title}`,
            `案件:${project?.name ?? "未設定"}`,
            task.sourceBranchTitle ? `大タスク:${task.sourceBranchTitle}` : null,
            `担当:${assignee?.name ?? "未設定"}`,
            `状態:${taskStatusLabels[task.status]}`,
            `優先度:${taskPriorityLabels[task.priority]}`,
            `期限:${task.dueDate}`,
            `AIスコア:${task.aiPriorityScore}`,
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

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", text: normalized };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
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
            "タスクの追加、削除、整理は直接実行せず、必ず提案として返してください。減らす相談は削除ではなく保留提案を優先してください。",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: data.reply, source: data.source }]);
    } catch {
      setMessages((current) => [
        ...current,
        { id: `assistant-error-${Date.now()}`, role: "assistant", text: "通信に失敗しました。少し時間を置いてもう一度試してください。", source: "local" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((current) => [
        ...current,
        { id: `assistant-voice-${Date.now()}`, role: "assistant", text: "このブラウザでは音声入力が使えません。スマホのキーボード音声入力かChromeで試してください。", source: "local" },
      ]);
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

  if (recommendations.isLoading || !recommendations.data) return <LoadingPanel label="AI秘書を準備中" />;

  return (
    <>
      <PageHeader title="AI秘書" description="段取り、整理、振り返りを相談できます。実行は必ず人が確認してから反映します。" kicker="ASSISTANT" />

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="min-h-[calc(100vh-230px)] overflow-hidden">
          <CardContent className="flex min-h-[calc(100vh-230px)] flex-col p-0">
            <div className="flex items-center gap-3 border-b border-border/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#050816]">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-100">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-[#0B1226] dark:text-white">Nos OS AI Secretary</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-300">提案型。直接DB変更はしません。</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-[#030711]">
              {messages.map((message) => (
                <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[82%]" : "mr-auto max-w-[88%]"}>
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-[22px] bg-[#0B1226] px-4 py-3 text-white dark:bg-[#172347] dark:ring-1 dark:ring-white/10"
                        : "rounded-[22px] bg-white px-4 py-3 shadow-soft ring-1 ring-slate-100 dark:bg-[#101a36] dark:shadow-none dark:ring-white/10"
                    }
                  >
                    {message.role === "assistant" ? (
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-500" />
                        <Badge tone={message.source === "openai" ? "blue" : "slate"}>{message.source === "openai" ? "OpenAI" : "Local"}</Badge>
                      </div>
                    ) : null}
                    {message.role === "assistant" ? <AssistantMessage text={message.text} /> : <p className="text-sm leading-6">{message.text}</p>}
                  </div>
                </div>
              ))}
              {loading ? (
                <div className="mr-auto max-w-[88%] rounded-[22px] bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-soft ring-1 ring-slate-100 dark:bg-[#101a36] dark:text-slate-100 dark:shadow-none dark:ring-white/10">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    整理しています...
                  </span>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/70 bg-white p-3 dark:border-white/10 dark:bg-[#050816]">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {samplePrompts.map((sample) => (
                  <button key={sample} className="h-9 shrink-0 rounded-full bg-slate-100 px-3 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-100 dark:ring-1 dark:ring-white/10" onClick={() => void ask(sample)}>
                    {sample}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_48px_48px] gap-2">
                <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例: 今日のタスクを整理して" onKeyDown={(event) => event.key === "Enter" && void ask()} />
                <Button aria-label="送信" title="送信" size="icon" disabled={loading || !question.trim()} onClick={() => void ask()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                <Button aria-label="音声入力" title="音声入力" size="icon" variant={listening ? "danger" : "ghost"} onClick={startVoice}>
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="font-extrabold text-[#0B1226] dark:text-white">今日のおすすめ</p>
              <div className="mt-3 space-y-3">
                {recommendations.data.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-panel bg-slate-50 p-3 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-6">{item.title}</p>
                      <Badge tone={item.score > 85 ? "red" : "blue"}>{item.score}</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500 dark:text-slate-200">{item.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <p className="font-extrabold text-[#0B1226] dark:text-white">安全ルール</p>
              {["AIは直接変更しない", "整理・減らすは保留提案", "削除は明示時のみ", "反映は人が確認"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-panel bg-white p-2 ring-1 ring-border dark:bg-white/5 dark:ring-white/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}
