-- UniBrain Phase 1 core schema
-- Postgres + Supabase RLS-first design

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plan_tier') then
    create type public.plan_tier as enum ('free', 'pro');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum ('inactive', 'active', 'past_due', 'cancelled', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'billing_provider') then
    create type public.billing_provider as enum ('paypal');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_source_type') then
    create type public.course_source_type as enum ('pasted_text', 'pdf', 'image', 'text_file', 'mixed');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_status') then
    create type public.course_status as enum ('draft', 'queued', 'processing', 'ready', 'failed', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'course_source_kind') then
    create type public.course_source_kind as enum ('raw_text', 'pdf_page', 'image_ocr', 'text_file');
  end if;

  if not exists (select 1 from pg_type where typname = 'flashcard_difficulty') then
    create type public.flashcard_difficulty as enum ('easy', 'medium', 'hard');
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_job_status') then
    create type public.generation_job_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'generation_job_type') then
    create type public.generation_job_type as enum (
      'full_course',
      'summary',
      'guide',
      'terms',
      'flashcards',
      'quiz',
      'practice',
      'tips',
      'brain_dump_eval',
      'speech_rubric_eval',
      'tutor_response'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'tutor_message_role') then
    create type public.tutor_message_role as enum ('user', 'assistant', 'system');
  end if;
end$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.billing_provider not null default 'paypal',
  provider_customer_id text,
  provider_subscription_id text,
  plan public.plan_tier not null default 'free',
  status public.subscription_status not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_key date not null,
  course_generations_used integer not null default 0 check (course_generations_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  source_type public.course_source_type not null,
  source_file_url text,
  source_raw_text text,
  source_image_count integer check (source_image_count is null or source_image_count >= 0),
  source_text_hash text,
  status public.course_status not null default 'draft',
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_sources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  source_kind public.course_source_kind not null,
  source_name text,
  extracted_text text not null check (char_length(trim(extracted_text)) > 0),
  sequence_index integer not null check (sequence_index >= 0),
  created_at timestamptz not null default now(),
  unique (course_id, sequence_index, source_kind)
);

create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  summary text not null,
  sequence_index integer not null check (sequence_index >= 0),
  created_at timestamptz not null default now(),
  unique (course_id, sequence_index)
);

create table if not exists public.course_terms (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  term text not null,
  definition text not null,
  example text not null,
  section_id uuid references public.course_sections(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  front text not null,
  back text not null,
  hint text,
  difficulty public.flashcard_difficulty,
  section_id uuid references public.course_sections(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text not null,
  section_id uuid references public.course_sections(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  question text not null,
  hint text not null,
  sample_answer text not null,
  section_id uuid references public.course_sections(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.study_tips (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  tip text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_guides (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses(id) on delete cascade,
  content_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_summaries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.brain_dump_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  transcript text not null,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  covered_json jsonb not null default '[]'::jsonb,
  partial_json jsonb not null default '[]'::jsonb,
  missed_json jsonb not null default '[]'::jsonb,
  feedback text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.speech_rubric_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text,
  transcript text not null,
  content_score numeric(5,2) not null check (content_score >= 0 and content_score <= 100),
  clarity_score numeric(5,2) not null check (clarity_score >= 0 and clarity_score <= 100),
  structure_score numeric(5,2) not null check (structure_score >= 0 and structure_score <= 100),
  confidence_score numeric(5,2) not null check (confidence_score >= 0 and confidence_score <= 100),
  pacing_score numeric(5,2) check (pacing_score is null or (pacing_score >= 0 and pacing_score <= 100)),
  filler_word_count integer not null default 0 check (filler_word_count >= 0),
  filler_words_json jsonb not null default '{}'::jsonb,
  feedback text not null,
  suggestions text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  total_questions integer not null check (total_questions > 0),
  answers_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.write_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  prompt text not null,
  answer text not null,
  correct_answer text not null,
  self_score numeric(5,2) check (self_score is null or (self_score >= 0 and self_score <= 100)),
  created_at timestamptz not null default now()
);

create table if not exists public.learn_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  mastery_level smallint not null default 0 check (mastery_level >= 0 and mastery_level <= 5),
  last_reviewed_at timestamptz,
  correct_streak integer not null default 0 check (correct_streak >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, flashcard_id)
);

create table if not exists public.match_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  time_seconds integer not null check (time_seconds > 0),
  mistakes integer not null default 0 check (mistakes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  role public.tutor_message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.generation_job_status not null default 'queued',
  job_type public.generation_job_type not null default 'full_course',
  input_hash text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_course_owner(target_course_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = target_course_id
      and c.user_id = auth.uid()
  );
$$;

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

create index if not exists idx_usage_counters_user_month on public.usage_counters(user_id, month_key desc);

create index if not exists idx_courses_user_created on public.courses(user_id, created_at desc);
create index if not exists idx_courses_user_status on public.courses(user_id, status);
create index if not exists idx_courses_source_hash on public.courses(user_id, source_text_hash);

create index if not exists idx_course_sources_course_sequence on public.course_sources(course_id, sequence_index);
create index if not exists idx_course_sections_course_sequence on public.course_sections(course_id, sequence_index);
create index if not exists idx_course_terms_course_id on public.course_terms(course_id);
create index if not exists idx_course_terms_term_lower on public.course_terms(course_id, lower(term));
create index if not exists idx_flashcards_course_id on public.flashcards(course_id);
create index if not exists idx_flashcards_course_difficulty on public.flashcards(course_id, difficulty);
create index if not exists idx_quiz_questions_course_id on public.quiz_questions(course_id);
create index if not exists idx_practice_questions_course_id on public.practice_questions(course_id);
create index if not exists idx_study_tips_course_id on public.study_tips(course_id);
create index if not exists idx_course_guides_course_id on public.course_guides(course_id);
create index if not exists idx_course_summaries_course_id on public.course_summaries(course_id);

create index if not exists idx_brain_dump_user_course_created on public.brain_dump_sessions(user_id, course_id, created_at desc);
create index if not exists idx_speech_rubric_user_course_created on public.speech_rubric_sessions(user_id, course_id, created_at desc);
create index if not exists idx_quiz_attempts_user_course_created on public.quiz_attempts(user_id, course_id, created_at desc);
create index if not exists idx_write_attempts_user_course_created on public.write_attempts(user_id, course_id, created_at desc);
create index if not exists idx_learn_progress_user_course on public.learn_progress(user_id, course_id);
create index if not exists idx_learn_progress_mastery on public.learn_progress(user_id, course_id, mastery_level);
create index if not exists idx_match_attempts_user_course_created on public.match_attempts(user_id, course_id, created_at desc);
create index if not exists idx_tutor_messages_user_course_created on public.tutor_messages(user_id, course_id, created_at desc);

create index if not exists idx_generation_jobs_user_status on public.generation_jobs(user_id, status, created_at desc);
create index if not exists idx_generation_jobs_course_status on public.generation_jobs(course_id, status, created_at desc);
create index if not exists idx_generation_jobs_input_hash on public.generation_jobs(course_id, input_hash);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_usage_counters_updated_at on public.usage_counters;
create trigger trg_usage_counters_updated_at
before update on public.usage_counters
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_course_guides_updated_at on public.course_guides;
create trigger trg_course_guides_updated_at
before update on public.course_guides
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_learn_progress_updated_at on public.learn_progress;
create trigger trg_learn_progress_updated_at
before update on public.learn_progress
for each row execute procedure public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.courses enable row level security;
alter table public.course_sources enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_terms enable row level security;
alter table public.flashcards enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.practice_questions enable row level security;
alter table public.study_tips enable row level security;
alter table public.course_guides enable row level security;
alter table public.course_summaries enable row level security;
alter table public.brain_dump_sessions enable row level security;
alter table public.speech_rubric_sessions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.write_attempts enable row level security;
alter table public.learn_progress enable row level security;
alter table public.match_attempts enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.generation_jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "usage_counters_select_own" on public.usage_counters;
create policy "usage_counters_select_own"
on public.usage_counters
for select
using (auth.uid() = user_id);

drop policy if exists "courses_rw_own" on public.courses;
create policy "courses_rw_own"
on public.courses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "course_sources_via_owner" on public.course_sources;
create policy "course_sources_via_owner"
on public.course_sources
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "course_sections_via_owner" on public.course_sections;
create policy "course_sections_via_owner"
on public.course_sections
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "course_terms_via_owner" on public.course_terms;
create policy "course_terms_via_owner"
on public.course_terms
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "flashcards_via_owner" on public.flashcards;
create policy "flashcards_via_owner"
on public.flashcards
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "quiz_questions_via_owner" on public.quiz_questions;
create policy "quiz_questions_via_owner"
on public.quiz_questions
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "practice_questions_via_owner" on public.practice_questions;
create policy "practice_questions_via_owner"
on public.practice_questions
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "study_tips_via_owner" on public.study_tips;
create policy "study_tips_via_owner"
on public.study_tips
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "course_guides_via_owner" on public.course_guides;
create policy "course_guides_via_owner"
on public.course_guides
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "course_summaries_via_owner" on public.course_summaries;
create policy "course_summaries_via_owner"
on public.course_summaries
for all
using (public.is_course_owner(course_id))
with check (public.is_course_owner(course_id));

drop policy if exists "brain_dump_rw_own" on public.brain_dump_sessions;
create policy "brain_dump_rw_own"
on public.brain_dump_sessions
for all
using (auth.uid() = user_id and public.is_course_owner(course_id))
with check (auth.uid() = user_id and public.is_course_owner(course_id));

drop policy if exists "speech_rubric_rw_own" on public.speech_rubric_sessions;
create policy "speech_rubric_rw_own"
on public.speech_rubric_sessions
for all
using (auth.uid() = user_id and (course_id is null or public.is_course_owner(course_id)))
with check (auth.uid() = user_id and (course_id is null or public.is_course_owner(course_id)));

drop policy if exists "quiz_attempts_rw_own" on public.quiz_attempts;
create policy "quiz_attempts_rw_own"
on public.quiz_attempts
for all
using (auth.uid() = user_id and public.is_course_owner(course_id))
with check (auth.uid() = user_id and public.is_course_owner(course_id));

drop policy if exists "write_attempts_rw_own" on public.write_attempts;
create policy "write_attempts_rw_own"
on public.write_attempts
for all
using (auth.uid() = user_id and public.is_course_owner(course_id))
with check (auth.uid() = user_id and public.is_course_owner(course_id));

drop policy if exists "learn_progress_rw_own" on public.learn_progress;
create policy "learn_progress_rw_own"
on public.learn_progress
for all
using (auth.uid() = user_id and public.is_course_owner(course_id))
with check (auth.uid() = user_id and public.is_course_owner(course_id));

drop policy if exists "match_attempts_rw_own" on public.match_attempts;
create policy "match_attempts_rw_own"
on public.match_attempts
for all
using (auth.uid() = user_id and public.is_course_owner(course_id))
with check (auth.uid() = user_id and public.is_course_owner(course_id));

drop policy if exists "tutor_messages_rw_own" on public.tutor_messages;
create policy "tutor_messages_rw_own"
on public.tutor_messages
for all
using (auth.uid() = user_id and public.is_course_owner(course_id))
with check (auth.uid() = user_id and public.is_course_owner(course_id));

drop policy if exists "generation_jobs_select_own" on public.generation_jobs;
create policy "generation_jobs_select_own"
on public.generation_jobs
for select
using (auth.uid() = user_id and public.is_course_owner(course_id));
