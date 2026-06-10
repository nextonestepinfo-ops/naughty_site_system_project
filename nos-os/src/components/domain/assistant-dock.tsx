"use client";

import { Bot, Loader2, Mic, Send, Settings, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AssistantMessage } from "@/components/domain/assistant-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { apiFetch } from "@/lib/hooks/use-api";
import type { SecretaryReply } from "@/lib/types";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

const samplePrompts = ["今日やること", "次に何をやる？", "タスクを整理", "明日の準備"];

export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("こんにちは。今日やること、次にやること、タスク整理を一緒に確認します。");
  const [source, setSource] = useState<SecretaryReply["source"]>("local");

  async function answer(text: string) {
    const normalized = text.trim();
    if (!normalized || loading) return;

    setLoading(true);
    try {
      const data = await apiFetch<SecretaryReply>("/api/ai/secretary", {
        method: "POST",
        body: JSON.stringify({
          message: normalized,
          context: document.body.innerText.slice(0, 900),
        }),
      });
      setReply(data.reply);
      setSource(data.source);
      setMessage("");
    } catch {
      setReply("通信に失敗しました。少し時間を置いて、もう一度試してください。");
      setSource("local");
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setReply("このブラウザでは音声入力が使えません。スマホのキーボード音声入力かChromeで試してください。");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setMessage(text);
      void answer(text);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <>
      <button
        className="fixed bottom-6 right-5 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white shadow-[0_18px_34px_rgba(99,102,241,0.3)] ring-[3px] ring-white transition hover:scale-105 lg:flex"
        onClick={() => setOpen(true)}
        aria-label="AI秘書を開く"
        title="AI秘書を開く"
      >
        <Bot className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed bottom-24 right-5 z-50 hidden max-h-[76vh] w-[420px] flex-col overflow-hidden rounded-panel border border-white/80 bg-white shadow-command lg:flex">
          <div className="flex shrink-0 items-center gap-3 border-b border-border/70 px-4 py-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">AI秘書</p>
              <p className="text-xs text-slate-500">{source === "openai" ? "OpenAIで応答" : "ローカル応答"}</p>
            </div>
            <Link href="/settings" className="ml-auto grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-slate-100" title="設定">
              <Settings className="h-4 w-4" />
            </Link>
            <button className="grid h-9 w-9 place-items-center rounded-control text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="閉じる">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-3">
            {loading ? (
              <div className="flex items-center gap-2 rounded-panel bg-white px-3 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                整理しています...
              </div>
            ) : (
              <AssistantMessage text={reply} />
            )}
          </div>

          <div className="shrink-0 border-t border-border/70 bg-white p-3">
            <div className="grid grid-cols-[1fr_44px_44px] gap-2">
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="例: 次に何をやる？"
                onKeyDown={(event) => event.key === "Enter" && void answer(message)}
              />
              <Button size="icon" title="送信" aria-label="送信" disabled={loading || !message.trim()} onClick={() => void answer(message)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant={listening ? "danger" : "ghost"} title="音声入力" aria-label="音声入力" onClick={startVoice}>
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {samplePrompts.map((sample) => (
                <button
                  key={sample}
                  className="h-8 shrink-0 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                  onClick={() => void answer(sample)}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
