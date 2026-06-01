# Claude API Setup For Nos OS

Nos OS is ready to use Claude for the AI secretary without exposing the API key
to the browser.

## Where To Put The Key

Create `.env.local` in `nos-os/`:

```bash
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=your_selected_claude_model
```

Use the model ID from the Anthropic console or official docs. Model names can
change, so Nos OS does not hardcode one.

## Where The Code Lives

- Server adapter: `src/lib/integrations/claude.ts`
- API route: `src/app/api/ai/secretary/route.ts`
- Floating secretary UI: `src/components/domain/assistant-dock.tsx`
- Assistant page: `src/app/(workspace)/assistant/page.tsx`

## How It Works

1. UI sends a message to `/api/ai/secretary`.
2. The server route calls `askSecretaryWithClaude()`.
3. If `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` are set, the server calls the
   Anthropic Messages API.
4. If they are missing or the API fails, Nos OS falls back to local secretary
   replies so the app keeps working.

## Local Test

```bash
npm run dev -- --port 3100
```

Then open:

```text
http://localhost:3100/assistant
```

Try:

- `今日やること`
- `次に何？`
- `売上は？`
- `予定を出して`

## Security Notes

- Do not prefix the Claude key with `NEXT_PUBLIC_`.
- Do not call Claude directly from client components.
- Keep all Claude calls inside `src/app/api/*` or `src/lib/integrations/*`.
- The admin permission route now requires `actorRole: "admin"` in the request
  body for the local demo. In Supabase Phase2, replace this with server-side
  session/RLS checks.

