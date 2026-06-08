# AI Provider Setup For Nos OS

Nos OS uses the AI secretary through the server route `/api/ai/secretary`.
Employees do not need individual API keys.

## Recommended Production Setup

Set these environment variables in the deployment host, such as Vercel:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5.5
OPENAI_MAX_OUTPUT_TOKENS=520
OPENAI_REASONING_EFFORT=low
OPENAI_TEXT_VERBOSITY=low
```

Optional:

```bash
OPENAI_ORGANIZATION_ID=
OPENAI_PROJECT_ID=
```

Keep all OpenAI values server-side. Do not expose them with `NEXT_PUBLIC_`.
Do not paste API keys into chat, GitHub, screenshots, or employee browsers.

## How It Works

1. The employee asks the AI secretary from the app.
2. The browser sends only the message and app context to `/api/ai/secretary`.
3. The server reads `OPENAI_API_KEY` from the host environment.
4. If OpenAI is configured and the request succeeds, the response is marked `OpenAI`.
5. If the key is missing or the API fails, Nos OS falls back to local replies.

This lets one company-owned host key serve all users without distributing secrets.

## Provider Switching

| Value | Behavior |
| --- | --- |
| `AI_PROVIDER=openai` | Calls OpenAI Responses API, then local fallback |
| `AI_PROVIDER=anthropic` | Calls Claude Messages API, then local fallback |
| `AI_PROVIDER=auto` | Uses OpenAI when present, then Claude, then local |
| `AI_PROVIDER=local` | Never calls an external API |

## In-App Check

Open `/settings` as an admin.

- `AI秘書` shows whether the host has `OPENAI_API_KEY`.
- `AI接続テスト` sends a short server-side test request.
- The API key itself is never shown or stored in the browser.

Open `/test` to see the same readiness status in a simple checklist.

## Where The Code Lives

- Provider selector: `src/lib/integrations/secretary.ts`
- OpenAI adapter: `src/lib/integrations/openai.ts`
- Claude adapter: `src/lib/integrations/claude.ts`
- Local fallback: `src/lib/integrations/secretary-local.ts`
- API route: `src/app/api/ai/secretary/route.ts`
- Floating secretary UI: `src/components/domain/assistant-dock.tsx`
- Assistant page: `src/app/(workspace)/assistant/page.tsx`

## Local Test

Create `nos-os/.env.local` using `.env.example`, then run:

```bash
npm run dev -- --port 3100
```

Open:

```text
http://localhost:3100/assistant
```

Try:

- `今日やること`
- `次に何？`
- `売上は？`
- `予定を出して`

If the key is missing or the API fails, Nos OS keeps working with local fallback
replies.
