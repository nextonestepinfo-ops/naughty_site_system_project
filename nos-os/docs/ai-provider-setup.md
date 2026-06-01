# AI Provider Setup For Nos OS

Nos OS now uses OpenAI by default for the AI secretary. Claude remains available
as an optional fallback for comparison or future high-quality mode.

## Recommended Local `.env.local`

Create `nos-os/.env.local`:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_MAX_OUTPUT_TOKENS=520
```

Optional:

```bash
OPENAI_REASONING_EFFORT=low
OPENAI_ORGANIZATION_ID=
OPENAI_PROJECT_ID=
```

Use `gpt-5.4-mini` for the normal Nos secretary. Use `gpt-5.4-nano` if cost is
the top priority and the task is mostly classification, ranking, or extraction.

## Provider Switching

| Value | Behavior |
| --- | --- |
| `AI_PROVIDER=openai` | Calls OpenAI Responses API, then local fallback |
| `AI_PROVIDER=anthropic` | Calls Claude Messages API, then local fallback |
| `AI_PROVIDER=auto` | Uses OpenAI when present, then Claude, then local |
| `AI_PROVIDER=local` | Never calls an external API |

## Where The Code Lives

- Provider selector: `src/lib/integrations/secretary.ts`
- OpenAI adapter: `src/lib/integrations/openai.ts`
- Claude adapter: `src/lib/integrations/claude.ts`
- Local fallback: `src/lib/integrations/secretary-local.ts`
- API route: `src/app/api/ai/secretary/route.ts`
- Floating secretary UI: `src/components/domain/assistant-dock.tsx`
- Assistant page: `src/app/(workspace)/assistant/page.tsx`

## What The Owner Needs To Prepare

- OpenAI API key.
- Billing enabled on the OpenAI project.
- Optional OpenAI project ID if the account has multiple projects.
- Optional organization ID if the account uses legacy organization routing.

Do not paste API keys into chat. Put them in `.env.local` only.

## Local Test

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
- `終わらなかったらどのくらいまずい？`

If the key is missing or the API fails, Nos OS keeps working with local fallback
replies.
