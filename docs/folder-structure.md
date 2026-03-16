# UniBrain Folder Structure (Phase 1 Baseline)

```text
unibranni/
  app/
    (marketing)/
    (auth)/
      sign-in/
      sign-up/
    (app)/
      dashboard/
      courses/
        new/
        [courseId]/
    api/
      health/
      courses/
        create/
      generation/
        run/
      webhooks/
        paypal/
  docs/
    phase-1-architecture.md
    folder-structure.md
  src/
    components/
      layout/
      ui/
      course/
      study/
      tutor/
      voice/
      billing/
      paywall/
    features/
      auth/
      billing/
      courses/
      course-create/
      generation/
      study-modes/
      brain-dump/
      speech-rubric/
      tutor/
      dashboard/
      analytics/
    hooks/
    lib/
      ai/
        pipeline/
        prompts/
        schemas/
      analytics/
      auth/
      billing/
      config/
      db/
      ingestion/
      payments/
      rate-limit/
      storage/
      supabase/
      usage/
      utils/
      voice/
    schemas/
      ai/
      api/
      domain/
    styles/
    types/
  supabase/
    migrations/
      20260316160000_phase1_core_schema.sql
  tests/
    unit/
    integration/
  unibrain.md
```

## Conventions
- Route logic should remain thin; business logic belongs in `src/features` and `src/lib`.
- Shared contracts are in `src/schemas` (Zod) and `src/types` (TypeScript).
- Anything requiring secrets (OpenAI, PayPal, privileged DB operations) stays server-only under `src/lib`.
- RLS-sensitive tables and policies live in `supabase/migrations`.
