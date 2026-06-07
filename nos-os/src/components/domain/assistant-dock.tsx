"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Mic, Send, Settings, X } from "lucide-react";
import { useState } from "react";
import { AssistantMessage } from "@/components/domain/assistant-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { buildSecretaryIntegrationPayload } from "@/lib/integrations/client-settings";
import { apiFetch } from "@/lib/hooks/use-api";
import type { SecretaryReply } from "@/lib/types";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

const samplePrompts = ["今日やること", "次に何？", "売上は？", "予定を出して"];

export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("こんにちは。今日やること、次にやること、売上、予定の確認を手伝います。");
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
          integrationSettings: buildSecretaryIntegrationPayload(),
        }),
      });
      setReply(data.reply);
      setSource(data.source);
      setMessage("");
    } catch {
      setReply("通信に失敗しました。少し時間を置いてもう一度試してください。");
      setSource("local");
    } finally {
      setLoading(false);
    }
  }

  function startVoice() {
    const SpeechRecognition = (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setReply("このブラウザでは音声認識が使えません。スマホのキーボード音声入力か、Chromeで試してください。");
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
        className="fixed bottom-24 right-3 z-40 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-soft transition hover:scale-105 dark:bg-slate-950 sm:h-16 sm:w-16 lg:bottom-6 lg:right-4"
        onClick={() => setOpen(true)}
        aria-label="AI秘書を開く"
        title="AI秘書を開く"
      >
        <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="64px" />
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-28 z-50 flex max-h-[76vh] flex-col overflow-hidden rounded-panel border border-border bg-white shadow-soft dark:bg-slate-950 sm:left-auto sm:right-4 sm:w-[420px] lg:bottom-24">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-panel bg-blue-50">
              <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="48px" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Nos秘書</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{source === "openai" ? "OpenAI接続" : "ローカル回答"}</p>
            </div>
            <Link href="/settings" className="ml-auto grid h-9 w-9 place-items-center rounded-panel text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" title="API設定">
              <Settings className="h-4 w-4" />
            </Link>
            <button className="grid h-9 w-9 place-items-center rounded-panel text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setOpen(false)} aria-label="閉じる">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="flex items-center gap-2 rounded-panel bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:bg-white/10 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                整理しています...
              </div>
            ) : (
              <AssistantMessage text={reply} />
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-white p-3 dark:bg-slate-950">
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
              <Button size="icon" variant={listening ? "danger" : "secondary"} title="音声入力" aria-label="音声入力" onClick={startVoice}>
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {samplePrompts.map((sample) => (
                <button
                  key={sample}
                  className="h-8 shrink-0 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
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
