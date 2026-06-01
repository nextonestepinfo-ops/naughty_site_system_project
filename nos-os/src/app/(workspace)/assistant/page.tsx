"use client";

import Image from "next/image";
import { BrainCircuit, Mic, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { LoadingPanel } from "@/components/domain/loading";
import { PageHeader } from "@/components/domain/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { apiFetch, useScopedQuery } from "@/lib/hooks/use-api";
import type { AiSummary, SecretaryReply } from "@/lib/types";

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

export default function AssistantPage() {
  const recommendations = useScopedQuery<AiSummary[]>(["ai-recommendations"], "/api/ai/recommendations");
  const [question, setQuestion] = useState("");
  const [listening, setListening] = useState(false);
  const [answer, setAnswer] = useState("今日やるべきことは、期限・優先度・顧客返信待ち・遅延リスクのスコア順に並びます。");

  if (recommendations.isLoading || !recommendations.data) return <LoadingPanel label="AI提案を読み込み中" />;

  async function ask(text = question) {
    if (!text.trim()) return;
    const data = await apiFetch<SecretaryReply>("/api/ai/secretary", {
      method: "POST",
      body: JSON.stringify({
        message: text,
        context: recommendations.data?.map((item) => `${item.title}: ${item.summary}`).join("\n"),
      }),
    });
    setAnswer(data.reply);
    setQuestion("");
  }

  function startVoice() {
    const SpeechRecognition = (window as Window & { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAnswer("このブラウザでは音声認識が使えません。Chromeかスマホのキーボード音声入力で試してください。");
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
      <PageHeader title="AI Assistant" description="Nos秘書に、今日やること、次にやること、売上、予定を聞けます。Phase2でOpenAI APIとWhisperに接続します。" />

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
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.summary}</p>
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
              <div className="grid grid-cols-[120px_1fr] gap-3 p-4">
                <div className="relative h-36 overflow-hidden rounded-panel bg-blue-50">
                  <Image src="/assistant/nos-secretary-bot.png" alt="Nos OS AI secretary bot" fill className="object-cover object-center" sizes="120px" />
                </div>
                <div>
                  <p className="font-bold">Nos秘書</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{answer}</p>
                </div>
              </div>
              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例: 次に何をやる？" onKeyDown={(event) => event.key === "Enter" && void ask()} />
                  <Button aria-label="送信" title="送信" size="icon" onClick={() => void ask()}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button aria-label="音声入力" title="音声入力" size="icon" variant={listening ? "danger" : "secondary"} onClick={startVoice}>
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  {["今日やること", "次に何？", "売上は？", "予定を出して"].map((sample) => (
                    <button key={sample} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-white/10" onClick={() => void ask(sample)}>
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
