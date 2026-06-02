"use client";

import Image from "next/image";
import { Mic, Send, X } from "lucide-react";
import { useState } from "react";
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

export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("こんにちは。今日やること、次にやること、売上、予定の確認を手伝います。");

  async function answer(text: string) {
    const normalized = text.trim();
    if (!normalized) return;
    const data = await apiFetch<SecretaryReply>("/api/ai/secretary", {
      method: "POST",
      body: JSON.stringify({
        message: normalized,
        context: document.body.innerText.slice(0, 900),
        integrationSettings: buildSecretaryIntegrationPayload(),
      }),
    });
    setReply(data.reply);
    setMessage("");
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
        className="fixed bottom-20 right-4 z-40 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-soft transition hover:scale-105 dark:bg-slate-950 lg:bottom-6"
        onClick={() => setOpen(true)}
        aria-label="AI秘書を開く"
        title="AI秘書を開く"
      >
        <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="64px" />
      </button>

      {open ? (
        <div className="fixed inset-x-3 bottom-24 z-50 rounded-panel border border-border bg-card p-4 shadow-soft dark:bg-slate-950 sm:left-auto sm:right-4 sm:w-96 lg:bottom-24">
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-panel bg-blue-50">
              <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="56px" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">Nos秘書</p>
                <button className="ml-auto rounded-panel p-1 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setOpen(false)} aria-label="閉じる">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{reply}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="例: 次に何をやる？" onKeyDown={(event) => event.key === "Enter" && void answer(message)} />
            <Button size="icon" title="送信" aria-label="送信" onClick={() => void answer(message)}>
              <Send className="h-4 w-4" />
            </Button>
            <Button size="icon" variant={listening ? "danger" : "secondary"} title="音声入力" aria-label="音声入力" onClick={startVoice}>
              <Mic className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            {["今日やること", "次に何？", "売上は？", "予定を出して"].map((sample) => (
              <button key={sample} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10" onClick={() => void answer(sample)}>
                {sample}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
