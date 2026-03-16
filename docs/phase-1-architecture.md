# UniBrain Phase 1 Architecture

## 1) Precise product restatement
UniBrain is a mobile-first SaaS study platform where a student uploads notes (pasted text, PDF, images, plain text) and receives a generated study package: summary, guide, terms, flashcards, learn, write, match, quiz, practice, and tips. Pro adds Brain Dump, Speech Rubric, and course-grounded AI Tutor. The core promise is fast value: first useful course in about 30 seconds, with strict grounding in user-provided content.

## 2) Hidden architecture decisions (made explicit)
1. The source of truth for user identity is Supabase `auth.users`; app profile data is mirrored in `profiles`.
2. Entitlements are server-authoritative and computed from subscription state plus monthly usage counters, never from client flags alone.
3. Generation jobs are durable DB records and the pipeline is resumable/idempotent via `input_hash`.
4. AI output must pass strict Zod validation before persisting; invalid payloads fail job stages.
5. Course sub-resources are normalized (sections/terms/cards/questions) for performant mode-specific queries.
6. Brain Dump and Speech Rubric are transcript-first for MVP; no fake acoustic claims beyond available signals.
7. Tutor responses are retrieval-grounded from course data and recent source excerpts, not open-domain chat.
8. RLS is mandatory on every user-owned table and every course-derived table.

## 3) Pragmatic implementation approach
1. Build database and RLS first to lock ownership and access patterns.
2. Add auth and shell early to unblock realistic end-to-end testing.
3. Ingest and normalize source text before AI generation.
4. Run one generation pipeline that writes all study assets in a single job with stage-level status.
5. Build course hub and study modes from persisted data only.
6. Add pro-only voice and tutor features after entitlement and generation are stable.
7. Add analytics/rate limits and launch hardening last.

## 4) System overview
- Frontend: Next.js 14 App Router, TypeScript, Tailwind, selective client components.
- Backend: Route handlers + server actions, Supabase Postgres/Auth/Storage.
- AI: OpenAI GPT models through server-only adapters with schema-enforced output.
- Billing: PayPal subscription + webhook synchronization into `subscriptions`.
- Deployment: Vercel for app, Supabase managed backend.

## 5) Frontend architecture
- Route groups: `(marketing)`, `(auth)`, `(app)`.
- Course-centric UX: dashboard -> course hub -> study modes.
- Shared UI in `src/components`, feature logic in `src/features`.
- Server components for read-heavy pages; client components for interactive study modes and voice capture.

## 6) Backend architecture
- Route handlers for uploads, generation, tutor, voice evaluation, billing webhooks.
- Thin handlers call typed service modules in `src/lib`.
- DB access through Supabase server client wrappers in `src/lib/supabase`.
- Input validation at boundaries using Zod in `src/schemas/api`.

## 7) AI orchestration design
- Pipeline stages:
  1. gather normalized course text
  2. chunk if needed
  3. generate each artifact with structured schema
  4. validate + persist
  5. mark job complete or failed with structured errors
- Caching and idempotency via `generation_jobs.input_hash`.
- Prompt templates stored in `src/lib/ai/prompts`.

## 8) Auth, storage, and subscription design
- Auth: Supabase email/password (and optional magic link in Phase 2).
- Storage: source files in Supabase Storage; extracted text persisted in `course_sources`.
- Subscriptions: PayPal webhooks map provider IDs to internal subscription state.
- Entitlements are centralized in `src/lib/billing/entitlements.ts`.

## 9) Data model overview
- Core entities: `profiles`, `subscriptions`, `usage_counters`, `courses`, `generation_jobs`.
- Course artifacts: `course_sources`, `course_sections`, `course_guides`, `course_summaries`, `course_terms`, `flashcards`, `quiz_questions`, `practice_questions`, `study_tips`.
- Activity/progress: `quiz_attempts`, `write_attempts`, `match_attempts`, `learn_progress`.
- Pro features: `brain_dump_sessions`, `speech_rubric_sessions`, `tutor_messages`.

## 10) Rate limiting and abuse prevention strategy
- Endpoint-level limiter for expensive routes: uploads, generation, tutor, voice evaluations.
- Size/type guardrails on uploads and transcript lengths.
- Free-plan usage cap enforced server-side with transaction-safe usage update.
- Optional duplicate-content suppression via normalized hash.

## 11) Course generation lifecycle
1. user creates course + uploads/pastes content
2. source persisted
3. text extracted/cleaned
4. generation job queued
5. pipeline writes artifacts
6. course status transitions to `ready` or `failed`

## 12) Voice feature lifecycle
- Browser speech capture (Web Speech API where available).
- Fallback to manual transcript paste.
- Server evaluates transcript against course content with strict schema.
- Result persisted and surfaced with transparent confidence boundaries.

## 13) Tutor lifecycle
- User opens tutor on a course page.
- Server fetches course-grounded context.
- Message + response persisted.
- Rate limit and entitlement checked before each response.

## 14) Analytics plan (MVP)
- Event taxonomy: sign_up, first_course_started, first_course_generated, paywall_viewed, subscription_started, flashcards_started, quiz_completed, brain_dump_completed, speech_rubric_completed, tutor_opened.
- Track on server for critical events; client events for product UX.

## 15) Testing strategy (Phase 1 scope)
- SQL migration lint/check in Supabase tooling.
- Unit tests for schema validators and entitlement helpers.
- Integration tests begin in Phase 2 after auth/shell exist.

## 16) Deployment and cost-control notes
- Keep OpenAI calls server-side and batched by pipeline stage.
- Cap generated item counts to avoid runaway token usage.
- Prefer incremental regeneration (single artifact) over full reruns when possible.
- Vercel env vars and Supabase secrets must be explicitly versioned in `.env.example`.
