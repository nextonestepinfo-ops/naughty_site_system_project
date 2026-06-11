"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bot, CalendarPlus, CheckCircle2, FilePenLine, Loader2, Mic, PauseCircle, Plus, Save, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AssistantMessage } from "@/components/domain/assistant-message";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/data/labels";
import { displayTaskTitle } from "@/lib/data/task-flags";
import { apiFetch, useScopedPath, useScopedQuery } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import type { AiSummary, Employee, Project, SecretaryReply, SecretarySuggestion, Task, TaskPriority, TaskStatus } from "@/lib/types";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop?: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror?: ((event: { error?: string }) => void) | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: SecretaryReply["source"];
  suggestions?: SecretarySuggestion[];
};

const samplePrompts = ["段取りを作って", "タスクを整理して", "今日の振り返り", "明日の準備"];

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const recommendations = useScopedQuery<AiSummary[]>(["ai-recommendations"], "/api/ai/recommendations");
  const tasks = useScopedQuery<Task[]>(["tasks"], "/api/tasks");
  const projects = useScopedQuery<Project[]>(["projects"], "/api/projects");
  const employees = useScopedQuery<Employee[]>(["employees"], "/api/employees");
  const reportPath = useScopedPath("/api/reports");
  const calendarPath = useScopedPath("/api/calendar/ics");
  const [question, setQuestion] = useState("");
  const [loadedInitialPrompt, setLoadedInitialPrompt] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceSuggestions, setVoiceSuggestions] = useState<SecretarySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<string[]>([]);
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
  const openTasks = useMemo(() => (tasks.data ?? []).filter((task) => task.status !== "done"), [tasks.data]);
  const topPriorityTask = useMemo(() => [...openTasks].sort((a, b) => b.aiPriorityScore - a.aiPriorityScore)[0] ?? null, [openTasks]);
  const lowPriorityTask = useMemo(() => [...openTasks].sort((a, b) => a.aiPriorityScore - b.aiPriorityScore)[0] ?? null, [openTasks]);
  const completedTaskLines = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((task) => task.status === "done")
        .filter((task) => !session?.employeeId || [task.primaryAssigneeId, ...task.assigneeIds].includes(session.employeeId))
        .filter((task) => dateKey(task.updatedAt) === todayInputValue())
        .slice(0, 8)
        .map((task) => task.title),
    [session?.employeeId, tasks.data],
  );
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
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: data.reply, source: data.source, suggestions: data.suggestions ?? [] }]);
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
    setVoiceStatus("");
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
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setQuestion(text);
      setVoiceTranscript(text);
      const suggestions = buildVoiceSuggestions(text, openTasks, topPriorityTask);
      setVoiceSuggestions(suggestions);
      setVoiceStatus(
        text
          ? suggestions.length
            ? "聞き取りました。操作候補を確認して反映できます。"
            : "聞き取りました。内容を確認して送信できます。"
          : "音声を文字にできませんでした。",
      );
    };
    recognition.onerror = (event) => {
      setVoiceStatus(event.error ? `音声入力でエラーが出ました: ${event.error}` : "音声入力でエラーが出ました。");
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    setVoiceStatus("聞き取り中です。話し終わると確認欄に入ります。");
    recognition.start();
  }

  function submitVoicePrompt(mode: "plain" | "task" | "report" | "deadline" = "plain") {
    const base = voiceTranscript.trim() || question.trim();
    if (!base) return;
    const prompt = enhanceVoicePrompt(base, mode, topPriorityTask);
    setQuestion(prompt);
    setVoiceTranscript("");
    setVoiceStatus("");
    setVoiceSuggestions([]);
    void ask(prompt);
  }

  async function applySuggestion(suggestion: SecretarySuggestion) {
    if (appliedSuggestionIds.includes(suggestion.id) || applyingSuggestionId) return;
    setApplyingSuggestionId(suggestion.id);
    try {
      if (suggestion.type === "task_hold") {
        const target = targetTaskForSuggestion(suggestion, openTasks, topPriorityTask ?? lowPriorityTask);
        if (!target) throw new Error("保留にできるタスクがありません");
        await apiFetch<Task>(`/api/tasks/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify({ priority: "hold" }),
        });
      }

      if (suggestion.type === "task_update") {
        const target = targetTaskForSuggestion(suggestion, openTasks, topPriorityTask ?? lowPriorityTask);
        if (!target) throw new Error("更新できるタスクがありません");
        const patch = taskPatchFromSuggestion(suggestion);
        await apiFetch<Task>(`/api/tasks/${target.id}`, {
          method: "PATCH",
          body: JSON.stringify(Object.keys(patch).length ? patch : { status: "in_progress" }),
        });
      }

      if (suggestion.type === "task_create") {
        const assigneeId = session?.employeeId ?? employees.data?.[0]?.id;
        if (!assigneeId) throw new Error("担当者が見つかりません");
        const dueDate = stringPayload(suggestion.payload.dueDate) || todayInputValue();
        const priority = taskPriorityPayload(suggestion.payload.priority) ?? ("normal" satisfies TaskPriority);
        await apiFetch<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            title: stringPayload(suggestion.payload.title) || suggestion.title,
            description: suggestion.summary,
            projectId: stringPayload(suggestion.payload.projectId) || null,
            primaryAssigneeId: assigneeId,
            assigneeIds: [assigneeId],
            dueDate,
            priority,
            status: "todo",
            estimatedMinutes: numberPayload(suggestion.payload.estimatedMinutes) ?? 45,
            customerWaiting: false,
            delayRisk: 10,
          }),
        });
      }

      if (suggestion.type === "report_draft") {
        if (!session?.employeeId) throw new Error("ログイン情報が見つかりません");
        await apiFetch(reportPath, {
          method: "POST",
          body: JSON.stringify({
            employeeId: session.employeeId,
            period: "daily",
            reportDate: todayInputValue(),
            title: "今日の日報",
            body: "AI秘書が作った下書きです。必要に応じて追記してください。",
            completed: completedTaskLines,
            blockers: [],
            nextActions: topPriorityTask ? [topPriorityTask.title] : [],
          }),
        });
      }

      if (suggestion.type === "calendar_suggest") {
        window.location.href = calendarPath;
      }

      setAppliedSuggestionIds((current) => [...current, suggestion.id]);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-apply-error-${Date.now()}`,
          role: "assistant",
          text: error instanceof Error ? error.message : "提案の反映に失敗しました。",
          source: "local",
        },
      ]);
    } finally {
      setApplyingSuggestionId(null);
    }
  }

  if (recommendations.isLoading || !recommendations.data) return <LoadingPanel label="AI秘書を準備中" />;

  return (
    <>
      <PageHeader title="AI秘書" description="段取り、整理、振り返りを相談できます。実行は必ず人が確認してから反映します。" kicker="ASSISTANT" />

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="min-h-[calc(100svh-320px)] overflow-hidden sm:min-h-[calc(100vh-230px)]">
          <CardContent className="flex min-h-[calc(100svh-320px)] flex-col p-0 sm:min-h-[calc(100vh-230px)]">
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
                  {message.role === "assistant" && message.suggestions?.length ? (
                    <div className="mt-2 grid gap-2">
                      {message.suggestions.map((suggestion) => (
                        <SecretarySuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          applied={appliedSuggestionIds.includes(suggestion.id)}
                          applying={applyingSuggestionId === suggestion.id}
                          onApply={() => void applySuggestion(suggestion)}
                        />
                      ))}
                    </div>
                  ) : null}
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
              {(voiceStatus || voiceTranscript) ? (
                <div className="mb-3 rounded-[20px] border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-300/20 dark:bg-indigo-400/15">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-100">VOICE</p>
                    {listening ? <Badge tone="red">聞き取り中</Badge> : <Badge tone={voiceTranscript ? "green" : "slate"}>{voiceTranscript ? "確認待ち" : "待機"}</Badge>}
                  </div>
                  {voiceStatus ? <p className="mt-2 text-xs font-bold text-indigo-900 dark:text-indigo-100">{voiceStatus}</p> : null}
                  {voiceTranscript ? (
                    <>
                      <p className="mt-2 rounded-panel bg-white px-3 py-2 text-sm font-bold leading-6 text-[#0B1226] ring-1 ring-indigo-100 dark:bg-[#101a36] dark:text-white dark:ring-white/10">{voiceTranscript}</p>
                      {voiceSuggestions.length ? (
                        <div className="mt-2 grid gap-2">
                          {voiceSuggestions.map((suggestion) => (
                            <SecretarySuggestionCard
                              key={suggestion.id}
                              suggestion={suggestion}
                              applied={appliedSuggestionIds.includes(suggestion.id)}
                              applying={applyingSuggestionId === suggestion.id}
                              onApply={() => void applySuggestion(suggestion)}
                            />
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button size="sm" variant="secondary" onClick={() => submitVoicePrompt("plain")} disabled={loading}>送信</Button>
                        <Button size="sm" variant="ghost" onClick={startVoice} disabled={loading || listening}>もう一度</Button>
                        <Button size="sm" variant="ghost" onClick={() => submitVoicePrompt("task")} disabled={loading}>タスク相談</Button>
                        <Button size="sm" variant="ghost" onClick={() => submitVoicePrompt("deadline")} disabled={loading}>期限変更</Button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
                {samplePrompts.map((sample) => (
                  <button key={sample} className="h-11 min-w-0 rounded-full bg-slate-100 px-3 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-100 dark:ring-1 dark:ring-white/10 sm:shrink-0" onClick={() => void ask(sample)}>
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
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  ["今日のタスクを整理して", "整理"],
                  ["最優先タスクの期限変更を相談したい", "期限"],
                  ["今日の日報を作って", "日報"],
                ].map(([prompt, label]) => (
                  <button key={prompt} className="min-h-10 rounded-full bg-slate-100 px-2 text-xs font-extrabold text-slate-600 dark:bg-white/10 dark:text-slate-100" onClick={() => void ask(prompt)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] font-bold leading-5 text-slate-500 dark:text-slate-300">
                音声例: 「このタスクを明日にして」「完了にして」「新しいタスクを追加」
              </p>
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

function SecretarySuggestionCard({
  suggestion,
  applied,
  applying,
  onApply,
}: {
  suggestion: SecretarySuggestion;
  applied: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  const Icon = {
    task_create: Plus,
    task_update: Save,
    task_hold: PauseCircle,
    report_draft: FilePenLine,
    calendar_suggest: CalendarPlus,
  }[suggestion.type];
  const label = {
    task_create: "タスク追加",
    task_update: "タスク更新",
    task_hold: "保留提案",
    report_draft: "日報下書き",
    calendar_suggest: "予定確認",
  }[suggestion.type];
  const buttonLabel = suggestion.type === "calendar_suggest" ? "開く" : "反映する";
  const danger = suggestion.riskLevel === "danger";

  return (
    <div className="rounded-[20px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-3 shadow-soft dark:border-indigo-300/20 dark:from-indigo-400/15 dark:to-white/5 dark:shadow-none">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-600 text-white shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={danger ? "red" : suggestion.riskLevel === "watch" ? "amber" : "blue"}>{label}</Badge>
            {applied ? <Badge tone="green">反映済み</Badge> : null}
          </div>
          <p className="mt-2 font-extrabold leading-6 text-[#0B1226] dark:text-white">{suggestion.title}</p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-200">{suggestion.summary}</p>
        </div>
      </div>
      <Button className="mt-3 w-full" variant={danger ? "danger" : "ghost"} disabled={applied || applying} onClick={onApply}>
        {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : applied ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {applied ? "反映しました" : buttonLabel}
      </Button>
    </div>
  );
}

function stringPayload(value: SecretarySuggestion["payload"][string]) {
  return typeof value === "string" ? value : "";
}

function numberPayload(value: SecretarySuggestion["payload"][string]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function taskPriorityPayload(value: SecretarySuggestion["payload"][string]): TaskPriority | null {
  return typeof value === "string" && isTaskPriority(value) ? value : null;
}

function targetTaskForSuggestion(suggestion: SecretarySuggestion, tasks: Task[], fallback: Task | null) {
  const taskId = stringPayload(suggestion.payload.taskId);
  if (taskId) return tasks.find((task) => task.id === taskId) ?? fallback;
  const title = stringPayload(suggestion.payload.title);
  if (title) {
    const normalizedTitle = normalizeVoiceText(title);
    const matched = tasks.find((task) => normalizeVoiceText(displayTaskTitle(task)).includes(normalizedTitle) || normalizedTitle.includes(normalizeVoiceText(displayTaskTitle(task))));
    if (matched) return matched;
  }
  return fallback;
}

function taskPatchFromSuggestion(suggestion: SecretarySuggestion): Partial<Task> {
  const patch: Partial<Task> = {};
  const { payload } = suggestion;
  const dueDate = stringPayload(payload.dueDate);
  const title = stringPayload(payload.title);
  const description = stringPayload(payload.description);
  const projectId = stringPayload(payload.projectId);
  const assigneeId = stringPayload(payload.primaryAssigneeId);
  const estimatedMinutes = numberPayload(payload.estimatedMinutes);

  if (dueDate && isInputDate(dueDate)) patch.dueDate = dueDate;
  if (typeof payload.status === "string" && isTaskStatus(payload.status)) patch.status = payload.status;
  if (typeof payload.priority === "string" && isTaskPriority(payload.priority)) patch.priority = payload.priority;
  if (title) patch.title = title;
  if (description) patch.description = description;
  if (projectId || payload.projectId === null) patch.projectId = projectId || null;
  if (assigneeId) {
    patch.primaryAssigneeId = assigneeId;
    patch.assigneeIds = [assigneeId];
  }
  if (estimatedMinutes !== null) patch.estimatedMinutes = estimatedMinutes;

  return patch;
}

function buildVoiceSuggestions(text: string, tasks: Task[], topTask: Task | null): SecretarySuggestion[] {
  const normalized = text.trim();
  if (!normalized) return [];
  const suggestions: SecretarySuggestion[] = [];
  const target = findVoiceTargetTask(normalized, tasks, topTask);
  const dueDate = parseJapaneseDueDate(normalized);
  const title = target ? displayTaskTitle(target) : "最優先タスク";
  const basePayload = target ? { taskId: target.id, title } : { strategy: "top_priority", title };

  if (dueDate && /期限|締切|しめきり|変更|ずら|延ば|延期|今日|明日|明後日|来週|再来週|週明け|月曜|火曜|水曜|木曜|金曜|土曜|日曜/.test(normalized)) {
    suggestions.push({
      id: `voice-due-${Date.now()}`,
      type: "task_update",
      title: `${title} の期限を ${dateLabel(dueDate)} に変更`,
      summary: "音声から期限変更を読み取りました。反映するまでDBは変わりません。",
      payload: { ...basePayload, dueDate },
      riskLevel: "watch",
    });
  }

  if (/完了|終わっ|終わり|済み/.test(normalized)) {
    suggestions.push({
      id: `voice-done-${Date.now()}`,
      type: "task_update",
      title: `${title} を完了にする`,
      summary: "完了にすると日報の自動入力にも入りやすくなります。",
      payload: { ...basePayload, status: "done" },
      riskLevel: "watch",
    });
  } else if (/開始|着手|進行中|始め/.test(normalized)) {
    suggestions.push({
      id: `voice-start-${Date.now()}`,
      type: "task_update",
      title: `${title} を進行中にする`,
      summary: "今から取りかかるタスクとして状態を更新します。",
      payload: { ...basePayload, status: "in_progress" },
      riskLevel: "safe",
    });
  } else if (/確認待ち|確認に回|レビュー/.test(normalized)) {
    suggestions.push({
      id: `voice-review-${Date.now()}`,
      type: "task_update",
      title: `${title} を確認待ちにする`,
      summary: "作業完了後の確認フェーズとして状態を更新します。",
      payload: { ...basePayload, status: "review" },
      riskLevel: "safe",
    });
  }

  if (/保留|減ら|今日から外|今週から外|後回し/.test(normalized)) {
    suggestions.push({
      id: `voice-hold-${Date.now()}`,
      type: "task_hold",
      title: `${title} を保留にする`,
      summary: "削除ではなく保留にします。あとで戻せます。",
      payload: basePayload,
      riskLevel: "safe",
    });
  }

  if (/追加|作って|作成|タスク化/.test(normalized) && !/期限.*変更|完了|保留/.test(normalized)) {
    const taskTitle = extractTaskTitle(normalized);
    suggestions.push({
      id: `voice-create-${Date.now()}`,
      type: "task_create",
      title: "音声内容をタスク追加",
      summary: taskTitle,
      payload: { title: taskTitle, dueDate: dueDate ?? todayInputValue(), priority: /緊急|急ぎ/.test(normalized) ? "urgent" : "normal" },
      riskLevel: "watch",
    });
  }

  return suggestions.slice(0, 3);
}

function enhanceVoicePrompt(text: string, mode: "plain" | "task" | "report" | "deadline", topTask: Task | null) {
  const normalized = text.trim();
  if (mode === "report" || /日報|週報|振り返り/.test(normalized)) {
    return `音声入力です。日報や振り返りとして整理してください。内容: ${normalized}`;
  }
  if (mode === "deadline" || /期限|締切|しめきり|今日|明日|来週|延期|延ば/.test(normalized)) {
    return [
      "音声入力です。タスクの期限変更として、直接変更せず提案カードで返してください。",
      topTask ? `対象候補: ${topTask.title}` : null,
      `内容: ${normalized}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (mode === "task" || /タスク|整理|減ら|増や|追加|保留|完了/.test(normalized)) {
    return [
      "音声入力です。タスク操作の相談として、直接変更せず提案カードで返してください。",
      "減らす相談は削除ではなく保留提案を優先してください。",
      topTask ? `最優先候補: ${topTask.title}` : null,
      `内容: ${normalized}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return normalized;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetInput(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function parseJapaneseDueDate(text: string) {
  if (/再来週/.test(text)) return dateOffsetInput(14);
  if (/来週|一週間|1週間/.test(text)) return dateOffsetInput(7);
  if (/明後日|あさって/.test(text)) return dateOffsetInput(2);
  if (/明日|あした/.test(text)) return dateOffsetInput(1);
  if (/今日|本日/.test(text)) return todayInputValue();
  if (/週明け/.test(text)) return nextWeekdayInput(1);
  const weekday = [
    ["日", 0],
    ["月", 1],
    ["火", 2],
    ["水", 3],
    ["木", 4],
    ["金", 5],
    ["土", 6],
  ].find(([label]) => new RegExp(`${label}曜`).test(text));
  return weekday ? nextWeekdayInput(Number(weekday[1])) : null;
}

function nextWeekdayInput(targetDay: number) {
  const date = new Date();
  const currentDay = date.getDay();
  const diff = (targetDay - currentDay + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function dateLabel(value: string) {
  const diff = Math.round((new Date(value).setHours(0, 0, 0, 0) - new Date(todayInputValue()).getTime()) / 86400000);
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  if (diff === 2) return "明後日";
  if (diff === 7) return "来週";
  return value;
}

function findVoiceTargetTask(text: string, tasks: Task[], fallback: Task | null) {
  const normalized = normalizeVoiceText(text);
  const candidates = tasks
    .map((task) => ({ task, title: normalizeVoiceText(displayTaskTitle(task)) }))
    .filter(({ title }) => title.length >= 4 && (normalized.includes(title.slice(0, Math.min(12, title.length))) || title.includes(normalized.slice(0, Math.min(12, normalized.length)))))
    .sort((a, b) => b.title.length - a.title.length);
  return candidates[0]?.task ?? fallback;
}

function extractTaskTitle(text: string) {
  return (
    text
      .replace(/(を)?タスク(に)?(追加|作成|化).*$/g, "")
      .replace(/追加|作って|作成|タスク化/g, "")
      .trim()
      .slice(0, 48) || `音声タスク: ${text.slice(0, 32)}`
  );
}

function normalizeVoiceText(value: string) {
  return value.replace(/[【】\[\]\s　、。・「」]/g, "").toLowerCase();
}

function isInputDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isTaskStatus(value: string): value is TaskStatus {
  return value === "todo" || value === "in_progress" || value === "review" || value === "done";
}

function isTaskPriority(value: string): value is TaskPriority {
  return value === "urgent" || value === "high" || value === "normal" || value === "low" || value === "hold";
}
