"use client";

import Link from "next/link";
import { AlertTriangle, BookOpenCheck, ChevronDown, CircleHelp, Delete, Fingerprint, KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BrandMark, nosBrand } from "@/components/domain/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { apiFetch } from "@/lib/hooks/use-api";
import { useAppStore } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import type { Employee, LoginAccount, User } from "@/lib/types";

const avatarStyles = [
  "from-[#0B1226] to-[#243353]",
  "from-[#16203B] to-[#46587E]",
  "from-[#E08F12] to-[#F0A93C]",
  "from-[#6366F1] to-[#8B5CF6]",
];

const lastEmployeeStorageKey = "nos-os-last-employee-id";
const deviceUnlockStorageKey = "nos-os-device-unlock-v1";

type DeviceUnlockRecord = {
  employeeId: string;
  userId: string;
  name: string;
  credentialId: string;
  createdAt: string;
};

function getLoginStorage() {
  if (typeof window === "undefined" || !("localStorage" in window)) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function LoginClient({ initialAccounts }: { initialAccounts: LoginAccount[] }) {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);
  const [accounts] = useState(initialAccounts);
  const [employeeId, setEmployeeId] = useState(initialAccounts[0]?.employeeId ?? "");
  const [password, setPassword] = useState("");
  const [verifiedPassword, setVerifiedPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceUnlockSupported, setDeviceUnlockSupported] = useState(false);
  const [deviceUnlock, setDeviceUnlock] = useState<DeviceUnlockRecord | null>(null);
  const [deviceUnlockBusy, setDeviceUnlockBusy] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.employeeId === employeeId) ?? accounts[0],
    [accounts, employeeId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storage = getLoginStorage();
    const lastEmployeeId = storage?.getItem(lastEmployeeStorageKey);
    if (lastEmployeeId && accounts.some((account) => account.employeeId === lastEmployeeId)) {
      setEmployeeId(lastEmployeeId);
    }
    setDeviceUnlockSupported(Boolean(storage && window.PublicKeyCredential && navigator.credentials));
  }, [accounts]);

  useEffect(() => {
    if (typeof window === "undefined" || !employeeId) return;
    const storage = getLoginStorage();
    storage?.setItem(lastEmployeeStorageKey, employeeId);
    setDeviceUnlock(readDeviceUnlock(employeeId));
  }, [employeeId]);

  async function finishLogin(user: User) {
    if (rememberDevice && deviceUnlockSupported && !readDeviceUnlock(user.employeeId)) {
      void registerDeviceUnlock(user, selectedAccount).catch(() => undefined);
    }
    setSession(user);
    router.replace("/");
  }

  async function login(passcode = password) {
    if (!employeeId) {
      setError("社員を選択してください。");
      return;
    }
    if (!passcode) {
      setError("パスコードを入力してください。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await apiFetch<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ employeeId, password: passcode, provider: "email" }),
      });
      if (user.mustChangePassword) {
        setVerifiedPassword(passcode);
        setPassword(passcode);
        setPendingUser(user);
        return;
      }
      await finishLogin(user);
    } catch {
      setError("パスコードを確認してください。初回は 0000 です。");
    } finally {
      setLoading(false);
    }
  }

  async function setInitialPassword() {
    if (!pendingUser) return;
    if (newPassword.length < 4) {
      setError("新しいパスワードは4文字以上で設定してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("確認用パスワードが一致していません。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await apiFetch<User>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          userId: pendingUser.id,
          currentPassword: verifiedPassword || password,
          newPassword,
        }),
      });
      await finishLogin(user);
    } catch {
      setError("パスワードを設定できませんでした。もう一度確認してください。");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingUser) {
      void setInitialPassword();
      return;
    }
    void login();
  }

  function pressKey(value: string) {
    if (pendingUser || loading) return;
    setError("");
    setPassword((current) => {
      const next = (current + value).slice(0, 8);
      if (next.length === 4) {
        window.setTimeout(() => {
          void login(next);
        }, 120);
      }
      return next;
    });
  }

  async function unlockWithDevice() {
    if (!deviceUnlock || !deviceUnlockSupported) return;
    setDeviceUnlockBusy(true);
    setError("");
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge(),
          allowCredentials: [{ id: base64UrlToBuffer(deviceUnlock.credentialId), type: "public-key" }],
          userVerification: "preferred",
          timeout: 60000,
        },
      });
      if (!credential) throw new Error("No credential");
      const data = await apiFetch<{ user: User; employee: Employee }>(`/api/me?userId=${deviceUnlock.userId}`);
      setSession(data.user);
      router.replace("/");
    } catch {
      setError("端末認証で解除できませんでした。数字で解除してください。");
    } finally {
      setDeviceUnlockBusy(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F6FA] px-3 py-4 text-[#0B1226] dark:bg-[#01040D] dark:text-white sm:px-4 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col justify-center gap-5 lg:min-h-[calc(100vh-4rem)]">
        <header className="flex items-center gap-3">
            <BrandMark className="h-14 w-14 shrink-0" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">NOS OS V2</p>
              <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-5xl">{nosBrand.appName}</h1>
            </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center lg:gap-10">
        <section className="order-2 lg:order-1">
          <p className="max-w-xl text-lg font-bold leading-8 text-slate-800 dark:text-slate-100">チームの今日を、ひとつの画面に。</p>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">前回の社員を自動で選びます。開いたら数字を入れるだけで解除できます。</p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
            {accounts.map((account, index) => (
              <MemberButton
                key={account.employeeId}
                account={account}
                active={account.employeeId === employeeId}
                gradient={avatarStyles[index % avatarStyles.length]}
                onClick={() => {
                  setEmployeeId(account.employeeId);
                  setPassword("");
                  setVerifiedPassword("");
                  setPendingUser(null);
                  setError("");
                }}
              />
            ))}
          </div>
        </section>

        <Card className="order-1 border-white bg-white text-[#0B1226] shadow-command dark:border-[#26324D] dark:bg-[#071022] dark:text-slate-50 lg:order-2">
          <CardContent className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-extrabold">ロック解除</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700 dark:bg-[#F7C878] dark:text-[#2A1702]">
                <Sparkles className="h-4 w-4" />
                すぐ使う
              </span>
            </div>

            {!accounts.length ? (
              <div className="mb-4 rounded-panel border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  社員一覧を読み込めません
                </div>
                <p className="mt-1">Supabaseの本番テーブルまたは社員データの準備が不足しています。テスト画面で状態を確認してください。</p>
              </div>
            ) : null}

            {selectedAccount ? (
              <div className="mb-5 rounded-panel border border-slate-200 bg-slate-50 p-3 dark:border-[#26324D] dark:bg-[#0B1428]">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0B1226] text-sm font-extrabold text-white">
                    {selectedAccount.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{selectedAccount.name}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {!pendingUser && deviceUnlock && deviceUnlockSupported ? (
              <Button className="mb-3 h-12 w-full text-base" disabled={deviceUnlockBusy || loading} type="button" onClick={unlockWithDevice}>
                <Fingerprint className="h-4 w-4" />
                {deviceUnlockBusy ? "確認中" : "この端末で解除"}
              </Button>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              <div className={cn("flex justify-center gap-3 rounded-panel border border-slate-200 bg-slate-50 p-4 dark:border-[#26324D] dark:bg-[#0B1428]", error && "animate-pulse ring-2 ring-red-200 dark:ring-red-400/40")}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <span key={index} className={cn("h-4 w-4 rounded-full border-2", password.length > index ? "border-[#0B1226] bg-[#0B1226] dark:border-[#F7C878] dark:bg-[#F7C878]" : "border-slate-300 bg-white dark:border-slate-300 dark:bg-slate-50")} />
                ))}
              </div>

              {!pendingUser ? (
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((value) => (
                    <button key={value} type="button" className="spring h-14 rounded-full bg-slate-100 text-xl font-extrabold text-[#0B1226] hover:bg-slate-200 dark:bg-[#17213A] dark:text-slate-50 dark:ring-1 dark:ring-white/10 dark:hover:bg-[#22304F]" onClick={() => pressKey(value)}>
                      {value}
                    </button>
                  ))}
                  <button type="button" className="spring h-14 rounded-full bg-slate-100 font-bold text-[#0B1226] hover:bg-slate-200 dark:bg-[#17213A] dark:text-slate-50 dark:ring-1 dark:ring-white/10 dark:hover:bg-[#22304F]" onClick={() => setPassword("")}>
                    全消し
                  </button>
                  <button type="button" className="spring h-14 rounded-full bg-slate-100 text-xl font-extrabold text-[#0B1226] hover:bg-slate-200 dark:bg-[#17213A] dark:text-slate-50 dark:ring-1 dark:ring-white/10 dark:hover:bg-[#22304F]" onClick={() => pressKey("0")}>
                    0
                  </button>
                  <button type="button" className="spring grid h-14 place-items-center rounded-full bg-slate-100 text-[#0B1226] hover:bg-slate-200 dark:bg-[#17213A] dark:text-slate-50 dark:ring-1 dark:ring-white/10 dark:hover:bg-[#22304F]" onClick={() => setPassword((current) => current.slice(0, -1))}>
                    <Delete className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-panel border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-300/25 dark:bg-indigo-400/15">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-800 dark:text-indigo-100">
                    <KeyRound className="h-4 w-4" />
                    初回パスワード設定
                  </div>
                  <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="新しいパスワード" type="password" autoComplete="new-password" />
                  <Input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="新しいパスワードをもう一度" type="password" autoComplete="new-password" />
                </div>
              )}

              {error ? <p className="rounded-panel bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:bg-red-500/15 dark:text-red-100 dark:ring-1 dark:ring-red-400/25">{error}</p> : null}

              {!pendingUser ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-panel border px-3 py-3 text-left text-sm font-bold transition",
                    rememberDevice ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-300/30 dark:bg-indigo-400/15 dark:text-indigo-100" : "border-border bg-slate-50 text-slate-500 dark:border-[#26324D] dark:bg-[#0B1428] dark:text-slate-300",
                  )}
                  onClick={() => setRememberDevice((current) => !current)}
                >
                  <span className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4" />
                    端末解除を使う（任意）
                  </span>
                  <span>{deviceUnlockSupported ? (rememberDevice ? "ON" : "OFF") : "未対応"}</span>
                </button>
              ) : null}

              <Button className="h-12 w-full text-base" disabled={loading || !accounts.length} type="submit" variant="secondary">
                {pendingUser ? <KeyRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {pendingUser ? "パスワードを設定して入る" : loading ? "解除中" : "解除する"}
              </Button>
            </form>

            {pendingUser ? (
              <Button className="mt-3 w-full" variant="ghost" disabled={loading} onClick={() => setPendingUser(null)}>
                社員選択に戻る
              </Button>
            ) : null}

            <details className="group mt-4 rounded-panel border border-border bg-slate-50 text-sm text-slate-600 dark:border-[#26324D] dark:bg-[#0B1428] dark:text-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 font-extrabold text-[#0B1226] dark:text-slate-50 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <CircleHelp className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  初めて使う方はこちら
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border px-3 pb-3 pt-3 leading-6">
                <div className="flex gap-2">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <p>初回だけ <span className="font-extrabold text-[#0B1226] dark:text-white">0000</span> を入れます。その後、自分のパスワードを設定します。</p>
                </div>
                <div className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                  <p>対応端末では、次回から端末認証で解除できます。未対応の場合は数字だけで解除できます。</p>
                </div>
                <Link href="/guide" className="inline-flex min-h-10 items-center gap-2 rounded-panel bg-white px-3 py-2 font-extrabold text-indigo-700 ring-1 ring-border dark:bg-[#101A36] dark:text-indigo-100 dark:ring-indigo-300/20">
                  <BookOpenCheck className="h-4 w-4" />
                  使い方を確認する
                </Link>
              </div>
            </details>
          </CardContent>
        </Card>
        </div>
      </div>
    </main>
  );
}

function MemberButton({
  account,
  active,
  gradient,
  onClick,
}: {
  account: LoginAccount;
  active: boolean;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "min-h-[86px] rounded-panel border p-3 text-left transition",
        active
          ? "border-[#E08F12] bg-white text-[#0B1226] shadow-soft dark:border-[#F0A93C] dark:bg-[#101A36] dark:text-white dark:ring-1 dark:ring-[#F0A93C]/25"
          : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-white/7 dark:text-slate-100 dark:hover:bg-white/10",
      )}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white", gradient)}>
          {account.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-extrabold">{account.name}</p>
        </div>
      </div>
    </button>
  );
}

function readDeviceUnlock(employeeId: string): DeviceUnlockRecord | null {
  const storage = getLoginStorage();
  const raw = storage?.getItem(deviceUnlockStorageKey);
  if (!raw) return null;
  try {
    const records = JSON.parse(raw) as DeviceUnlockRecord[];
    return records.find((record) => record.employeeId === employeeId) ?? null;
  } catch {
    return null;
  }
}

function writeDeviceUnlock(record: DeviceUnlockRecord) {
  const storage = getLoginStorage();
  if (!storage) return;
  const raw = storage.getItem(deviceUnlockStorageKey);
  let records: DeviceUnlockRecord[] = [];
  try {
    records = raw ? (JSON.parse(raw) as DeviceUnlockRecord[]) : [];
  } catch {
    records = [];
  }
  const next = [record, ...records.filter((item) => item.employeeId !== record.employeeId)];
  storage.setItem(deviceUnlockStorageKey, JSON.stringify(next.slice(0, 8)));
}

async function registerDeviceUnlock(user: User, account?: LoginAccount) {
  if (!window.PublicKeyCredential || !navigator.credentials || !account) return;
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: "Nos OS" },
      user: {
        id: new TextEncoder().encode(user.id),
        name: user.name,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { userVerification: "preferred" },
      timeout: 60000,
      attestation: "none",
    },
  });
  if (!credential) return;
  writeDeviceUnlock({
    employeeId: account.employeeId,
    userId: user.id,
    name: account.name,
    credentialId: bufferToBase64Url((credential as PublicKeyCredential).rawId),
    createdAt: new Date().toISOString(),
  });
}

function randomChallenge() {
  const buffer = new Uint8Array(32);
  window.crypto.getRandomValues(buffer);
  return buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBuffer(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
