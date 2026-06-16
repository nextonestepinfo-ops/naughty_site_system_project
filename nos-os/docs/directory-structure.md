# Nos OS Directory Structure

```text
nos-os/
  docs/
    architecture.md
    er-diagram.md
    db-tables.md
    screens.md
    navigation.md
    api.md
    directory-structure.md
    creation-log.csv
  public/
    manifest.webmanifest
    sw.js
  supabase/
    schema.sql
  src/
    app/
      (app)/
        page.tsx
        projects/
        tasks/
        customers/
        employees/
        attendance/
        assistant/
        notifications/
        settings/
      api/
        ai/
          secretary/
        calendar/
        daily-plan/
        users/
      login/
      layout.tsx
      globals.css
    components/
      app-shell.tsx
      dashboard/
      domain/
      ui/
    lib/
      auth/
      data/
      hooks/
      integrations/
        secretary.ts
        openai.ts
        claude.ts
        secretary-local.ts
      pwa/
      types.ts
```

## Implementation Rules

- Keep domain calculations in `src/lib/data` or `src/lib/domain`.
- Keep visual primitives small and reusable in `src/components/ui`.
- Keep route pages thin; pages compose data hooks and domain components.
- Keep external APIs behind `src/lib/integrations` adapters.
- Avoid putting Supabase-specific details directly into UI components.
