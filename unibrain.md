You are a world-class founding engineer, product architect, UX designer, and startup CTO.

You are helping me build a production-quality SaaS web app called **UniBrain**.

I do not want vague advice.
I do not want pseudo-startup fluff.
I do not want shallow code.
I want you to act like a brutally competent senior engineer building a real product that could launch and get paying users.

You must think deeply before coding.
You must favor maintainability, correctness, and clean architecture.
You must not overengineer with unnecessary complexity.
You must not invent fake libraries or make up APIs.
You must not skip validation, security, rate limiting, edge cases, or clean UX.
You must not dump everything into one giant file.
You must not silently change requirements.

Your job is to design and build the MVP of UniBrain in a way that is realistic for a solo founder using modern tooling.

==================================================
PRODUCT NAME
==================================================

UniBrain

==================================================
PRODUCT SUMMARY
==================================================

UniBrain is a web app that turns study notes into a complete study package instantly.

A student uploads anything:
- typed notes
- pasted notes
- a PDF
- a photo of notebook pages

The AI reads the material and generates a full study package automatically.

Unlike Quizlet, the user does not manually create flashcards.

UniBrain generates:
- summary
- study guide
- terms / glossary
- flashcards
- adaptive learn mode
- write mode
- match mode
- quiz mode
- practice questions
- study tips

UniBrain also has two standout features:

1. Brain Dump
The student studies a topic, closes their notes, and speaks everything they remember.
The AI compares the spoken answer to the uploaded notes and returns:
- what they covered well
- what they partially covered
- what they missed completely
- a score
- actionable revision feedback

2. Speech Rubric
The student practices an oral presentation out loud.
The AI evaluates:
- content coverage
- clarity
- structure
- confidence
- pacing
- filler words
- improvement suggestions

There is also an AI Tutor on every course page that knows that course’s content and can help with explanations, quizzes, mnemonics, and likely test topics.

==================================================
BUSINESS MODEL
==================================================

Free plan:
- 3 course generations per month
- access to all study modes for generated courses

Pro plan:
- $6.99/month
- unlimited course generations
- Brain Dump
- Speech Rubric
- AI Tutor

Payments handled with PayPal subscriptions.

==================================================
WHY THIS PRODUCT EXISTS
==================================================

Quizlet makes users manually create cards.
UniBrain turns raw notes into a full study system instantly.

The product is not “flashcards with AI.”
The product is:
“Upload anything and instantly get a complete study package, then test whether you actually know it.”

==================================================
CORE DIFFERENTIATORS
==================================================

1. Instant Course Generation
Upload notes and get a full study package in about 30 seconds.

2. Brain Dump
The strongest feature.
Active recall by speech, compared directly against source notes.

3. Speech Rubric
Practice oral presentations and get scored feedback.

==================================================
10 STUDY MODES
==================================================

Once a course is generated, the student can access these modes:

1. Summary
Read-only overview of all key concepts.

2. Guide
Structured notes broken into sections with key points.

3. Terms
Searchable glossary, tap to flip and see definition + example.

4. Flashcards
Classic flip cards, swipe left/right, shuffle.

5. Learn
Adaptive flashcards focused on weak cards, removes mastered cards.

6. Write
Shows the front of a card, student types the answer from memory.

7. Match
Timed matching game pairing fronts with backs.

8. Quiz
Multiple choice questions, explanation after each answer, final score.

9. Practice
Open-ended questions, hints, sample answers, self-grade.

10. Tips
AI-generated study tips tailored to the exact course content.

==================================================
AI TUTOR
==================================================

Every course page has a floating tutor chat button.

The tutor is not generic.
It has access to the specific generated course content and the uploaded note material.

Students can ask it to:
- explain concepts
- simplify difficult ideas
- create mnemonics
- quiz them
- predict likely test questions
- compare related ideas
- give study advice specific to that course

==================================================
TARGET USERS
==================================================

Primary target:
- high school students
- university students
- anyone studying from notes

Secondary target:
- students preparing oral presentations
- students wanting active recall and faster revision

==================================================
TECH STACK
==================================================

Use exactly this stack unless there is a very strong reason not to.

Frontend:
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui where helpful
- React Server Components where appropriate
- client components only where needed

Backend:
- Next.js server actions and route handlers where appropriate
- Supabase for database, auth, storage
- Supabase Postgres
- Supabase Row Level Security

AI:
- Gemini 1.5 Flash for generation tasks
- use server-side integration only
- never expose API keys in client code

Payments:
- PayPal subscriptions

Deployment:
- Vercel

Voice:
- Web Speech API in browser where appropriate
- if browser speech APIs are unreliable, design with graceful fallback
- store transcripts and evaluation results in Supabase

==================================================
NON-NEGOTIABLE PRODUCT PRINCIPLES
==================================================

1. Mobile-first
The app must feel good on phone first.
Many students will use it on mobile.

2. Fast first wow moment
The user should get value from the first course quickly.

3. Clean design
The app should look polished, modern, minimal, and premium enough to justify payment.

4. Simple onboarding
Users should get into their first course fast.

5. Strong course page UX
The course page should feel like a “study hub.”

6. Good empty states
No dead blank pages.

7. Good loading states
Especially during generation.

8. Free/pro gating must be robust
Client and server enforcement.

9. Cost-aware AI usage
We must minimize unnecessary token usage and avoid wasteful repeated generation.

10. Structured AI outputs
All generation should target strict schemas.

==================================================
YOUR TASK
==================================================

You must design and build the MVP in a realistic, production-minded way.

I want you to do this in phases.

Before writing code, you must:
1. restate the product clearly
2. identify hidden architecture decisions
3. propose the cleanest pragmatic implementation approach
4. define folder structure
5. define database schema
6. define API/server action patterns
7. define AI generation schemas
8. define plan limits and entitlement logic
9. define generation pipeline
10. define implementation order

Then you must generate the code in a phased manner.

Do not try to build everything in one chaotic burst.
Build in a staged, structured way.

==================================================
PHASE 0 — ARCHITECTURE PLAN
==================================================

First produce a full architecture plan with:

- system overview
- frontend architecture
- backend architecture
- AI orchestration design
- auth design
- storage design
- subscription design
- data model overview
- rate limiting and abuse prevention
- course generation lifecycle
- voice feature lifecycle
- tutor lifecycle
- analytics plan
- testing strategy
- deployment notes
- cost control strategy

Then provide the full folder structure.

The folder structure should include:
- app routes
- feature modules
- reusable components
- lib utilities
- server-side AI logic
- Supabase client/server utilities
- schemas
- hooks
- types
- styles
- config
- payments
- voice features
- study modes
- course generation pipeline

Favor a modular codebase.

==================================================
PHASE 1 — DATABASE DESIGN
==================================================

Design the full Supabase schema.

Required entities include at minimum:

profiles
- id
- email
- full_name optional
- avatar_url optional
- created_at
- updated_at

subscriptions
- id
- user_id
- provider
- provider_customer_id
- provider_subscription_id
- plan
- status
- current_period_start
- current_period_end
- cancel_at_period_end
- created_at
- updated_at

usage_counters
- id
- user_id
- month_key
- course_generations_used
- created_at
- updated_at

courses
- id
- user_id
- title
- source_type
- source_file_url optional
- source_raw_text optional
- source_image_count optional
- status
- generation_error optional
- created_at
- updated_at

course_sources
- id
- course_id
- source_kind
- source_name optional
- extracted_text
- sequence_index
- created_at

course_sections
- id
- course_id
- title
- summary
- sequence_index
- created_at

course_terms
- id
- course_id
- term
- definition
- example
- section_id optional
- created_at

flashcards
- id
- course_id
- front
- back
- hint optional
- difficulty optional
- section_id optional
- created_at

quiz_questions
- id
- course_id
- question
- option_a
- option_b
- option_c
- option_d
- correct_option
- explanation
- section_id optional
- created_at

practice_questions
- id
- course_id
- question
- hint
- sample_answer
- section_id optional
- created_at

study_tips
- id
- course_id
- tip
- reason optional
- created_at

course_guides
- id
- course_id
- content_json or structured content
- created_at
- updated_at

course_summaries
- id
- course_id
- content
- created_at

brain_dump_sessions
- id
- user_id
- course_id
- transcript
- score
- covered_json
- partial_json
- missed_json
- feedback
- created_at

speech_rubric_sessions
- id
- user_id
- course_id optional
- title optional
- transcript
- content_score
- clarity_score
- structure_score
- confidence_score
- pacing_score optional
- filler_word_count
- filler_words_json
- feedback
- suggestions
- created_at

quiz_attempts
- id
- user_id
- course_id
- score
- total_questions
- answers_json
- created_at

write_attempts
- id
- user_id
- course_id
- flashcard_id
- prompt
- answer
- correct_answer
- self_score optional
- created_at

learn_progress
- id
- user_id
- course_id
- flashcard_id
- mastery_level
- last_reviewed_at
- correct_streak
- incorrect_count
- updated_at

match_attempts
- id
- user_id
- course_id
- time_seconds
- mistakes
- created_at

tutor_messages
- id
- user_id
- course_id
- role
- content
- created_at

generation_jobs
- id
- user_id
- course_id
- status
- job_type
- input_hash optional
- started_at
- completed_at
- error_message optional
- metadata_json optional

You may improve this schema if needed.

For the database phase:
- provide SQL migrations
- provide indexes
- provide enums where useful
- provide foreign keys and constraints
- provide RLS policies
- provide Supabase-friendly design
- provide TypeScript types
- provide Zod validators for key payloads

Every user must only access their own data.

==================================================
PHASE 2 — AUTH, APP SHELL, AND BILLING FOUNDATION
==================================================

Build:
- Supabase auth
- sign up
- sign in
- magic link if easy
- protected routes
- user profile fetching
- settings page
- billing page
- paywall modal/system
- entitlement checks

Free users:
- 3 course generations per month
- all study modes for generated courses
- no Brain Dump
- no Speech Rubric
- no AI Tutor

Pro users:
- unlimited course generations
- Brain Dump
- Speech Rubric
- AI Tutor

Entitlement enforcement must happen:
- in UI
- in server logic
- in generation endpoints
- in tutor endpoints
- in voice evaluation endpoints

Add a visible usage meter for free users.

Integrate PayPal subscriptions realistically.
Use a clean abstraction so billing logic is not scattered.

Build a professional app shell with:
- top nav
- dashboard
- course list
- create course flow
- settings
- billing
- clean responsive layout

==================================================
PHASE 3 — COURSE CREATION AND INGESTION
==================================================

Build the course creation flow.

Users must be able to:
- paste notes
- upload PDF
- upload image(s) of handwritten notes
- maybe upload plain text files

Implement:
- upload UI
- drag and drop
- progress states
- validation
- file type checks
- size limits
- mobile-friendly input

For images and PDFs:
- extract text appropriately
- if OCR is needed, design the architecture sensibly
- do not assume fake capabilities
- if Gemini is used to interpret extracted content, do it server-side

The course creation flow should feel magical but still realistic.

After upload:
- create a generation job
- persist the raw source
- extract usable text
- normalize and clean text
- create the course generation pipeline

Need good handling for:
- tiny note uploads
- garbage inputs
- duplicate uploads
- too little content
- too much content
- malformed files
- unsupported files

==================================================
PHASE 4 — COURSE GENERATION PIPELINE
==================================================

This is the heart of the product.

Build a robust AI generation pipeline that takes source material and generates:

- summary
- guide
- terms
- flashcards
- quiz questions
- practice questions
- study tips

You must define exact schemas for Gemini outputs.

Use strict structured outputs.

For example:
- summary schema
- guide sections schema
- terms array schema
- flashcards array schema
- quiz question schema
- practice question schema
- study tips schema

The pipeline should:
- chunk content if needed
- avoid unnecessary repeated generation
- cache generated outputs per course
- handle long notes safely
- fail gracefully
- log structured errors
- update job status in DB

The generated content must be:
- educationally useful
- grounded in the uploaded material
- concise enough for study
- not generic nonsense
- not repetitive
- not overly verbose

The generated guide should be structured by sections.

The generated terms should include:
- term
- definition
- example

Flashcards should include:
- front
- back
- optional hint
- difficulty

Quiz questions should include:
- question
- 4 options
- correct answer
- explanation
- topic/section if helpful

Practice questions should include:
- question
- hint
- sample answer

Study tips must be specific to the uploaded content, not generic advice.

==================================================
PHASE 5 — COURSE PAGE / STUDY HUB
==================================================

Build a beautiful course page.

It should feel like the center of the product.

Required sections:
- course header
- last studied info
- progress indicators
- study mode grid or tabs
- floating tutor button
- actions menu

Each course page must support:
- Summary
- Guide
- Terms
- Flashcards
- Learn
- Write
- Match
- Quiz
- Practice
- Tips

This page must be clean on desktop and mobile.

You must design a great information hierarchy.

==================================================
PHASE 6 — IMPLEMENT EACH STUDY MODE
==================================================

Implement all 10 study modes.

1. Summary
- simple beautiful reading view

2. Guide
- structured sections
- collapsible if helpful
- easy to skim

3. Terms
- searchable glossary
- tap/click to reveal definition and example
- mobile friendly

4. Flashcards
- flip interaction
- next/prev
- shuffle
- progress indicator
- keyboard support if possible
- mobile swipe support if practical

5. Learn
- adaptive review
- focus on weaker cards
- basic mastery progression
- cards can move out once mastered
- do not overengineer spaced repetition, but create a sane mastery model

6. Write
- show prompt
- user types answer
- reveal correct answer
- optionally self-rate
- save attempts

7. Match
- timed matching game
- pair fronts with backs
- clean playful UI
- not childish
- good mobile interactions

8. Quiz
- multiple choice
- one question at a time
- explanation after answer
- final score screen
- save results

9. Practice
- open-ended questions
- reveal hint
- reveal sample answer
- self-grade flow

10. Tips
- cards/list of AI-generated study tips specific to that course

Each mode must be production-minded and polished.

==================================================
PHASE 7 — BRAIN DUMP
==================================================

This is the main differentiator.

Build Brain Dump carefully.

Flow:
1. User opens a course
2. Taps Brain Dump
3. Sees instructions:
   - review your notes
   - close them
   - explain everything you remember out loud
4. User records speech
5. Transcript is captured
6. Transcript is sent server-side for evaluation
7. AI compares transcript against the actual course content
8. Result is returned

Result must include:
- overall score
- what was covered
- what was partially covered
- what was missed
- feedback
- suggested next revision targets

Important:
- free users cannot use this mode
- pro users only

You must define:
- transcript capture flow
- browser speech support strategy
- fallback if speech recognition is unavailable
- structured evaluation schema
- grounding strategy so results are based on course content
- UI for results visualization

Do not fake speech analysis.
If browser transcription is used, say so in the architecture.
If transcript quality is uncertain, handle that gracefully.

Design the evaluation prompt to be genuinely useful for active recall.

==================================================
PHASE 8 — SPEECH RUBRIC
==================================================

Build Speech Rubric carefully.

Flow:
1. User enters a topic or uses a course
2. User records oral presentation
3. Transcript is captured
4. AI evaluates:
   - content
   - clarity
   - structure
   - confidence
   - pacing
   - filler words
5. Results screen shows rubric and suggestions

Output should include:
- content score
- clarity score
- structure score
- confidence score
- pacing score
- filler word count
- filler words breakdown
- positives
- areas to improve
- suggested changes

If certain audio qualities cannot be truly measured from available inputs, do not fake certainty.
Be honest and grounded.

You may infer some things from transcript features and timing signals, but avoid pretending to analyze acoustic features you do not have.

This is pro-only.

==================================================
PHASE 9 — AI TUTOR
==================================================

Build the floating AI Tutor.

Tutor rules:
- tied to one course
- grounded in that course’s content
- can explain concepts
- can create mnemonics
- can ask quiz questions
- can simplify ideas
- can compare related concepts
- can suggest likely test areas

Tutor must:
- be course-aware
- use retrieval from the generated course data and/or source data
- not drift into generic unsupported claims
- avoid hallucinating beyond the course unnecessarily

Build:
- tutor panel UI
- chat history
- server-side tutor endpoint
- message persistence
- entitlement gating
- rate limiting

This is pro-only.

==================================================
PHASE 10 — DASHBOARD, PROGRESS, AND RETENTION
==================================================

Build a useful dashboard.

Show:
- recent courses
- generations used
- study streak if sensible
- weak areas if available
- recent quiz performance
- recent brain dump sessions for pro
- recent speech rubric sessions for pro
- CTA to continue studying

This should help retention without becoming cluttered.

==================================================
PHASE 11 — ANALYTICS, LIMITS, AND ABUSE PREVENTION
==================================================

Implement:
- generation limits for free users
- monthly reset logic
- server-side enforcement
- rate limiting on expensive endpoints
- abuse prevention on upload endpoints
- AI request logging
- basic audit trails

Track useful analytics events such as:
- sign_up
- first_course_started
- first_course_generated
- paywall_viewed
- subscription_started
- flashcards_started
- quiz_completed
- brain_dump_completed
- speech_rubric_completed
- tutor_opened

==================================================
PHASE 12 — POLISH, TESTING, AND LAUNCH READINESS
==================================================

Build:
- robust loading states
- skeletons
- nice empty states
- toasts
- error boundaries
- mobile polish
- basic accessibility
- clean typography
- clean spacing
- keyboard shortcuts where useful

Testing:
- define unit tests for core utilities
- integration tests for generation flows
- tests for entitlement checks
- tests for study mode persistence
- tests for DB access patterns

Also provide:
- environment variable checklist
- Vercel deployment notes
- Supabase setup instructions
- PayPal webhook notes
- Gemini key setup notes

==================================================
VISUAL / UX DIRECTION
==================================================

The product should feel:
- smart
- fast
- modern
- slightly premium
- student-friendly without being childish

Use:
- clean card layouts
- strong spacing
- excellent mobile responsiveness
- obvious CTAs
- pleasant microinteractions
- smooth transitions where useful
- a floating tutor button that feels polished

Avoid:
- clutter
- cheesy education tropes
- cartoonish visuals
- overusing gradients
- confusing nav

==================================================
CODING RULES
==================================================

You must follow these coding rules:

- Use TypeScript everywhere relevant.
- Use Zod for validation.
- Separate server and client concerns cleanly.
- Never call Gemini directly from the client.
- Never expose secrets.
- Keep files focused.
- Reuse utilities.
- Favor composable feature modules.
- Use descriptive naming.
- Add comments only where they help.
- Use async error handling properly.
- Return typed results.
- Handle null/empty/loading/error states well.
- Avoid giant god files.
- Avoid magical global state unless justified.
- Prefer simple maintainable state management.

==================================================
SUPABASE RULES
==================================================

- Use proper server-side Supabase clients where needed
- use auth-aware helpers
- create RLS policies
- make sure users only see their own data
- never bypass RLS casually
- structure queries for performance
- create indexes for likely access patterns

==================================================
AI RULES
==================================================

All AI outputs must target strict schemas.

You must explicitly define Zod schemas for:
- generated summary
- generated guide
- generated terms
- generated flashcards
- generated quiz questions
- generated practice questions
- generated study tips
- brain dump evaluation
- speech rubric evaluation
- tutor structured grounding if needed

Prompts must be designed to produce useful educational content.
Prompts must reduce hallucination.
Prompts must stay grounded in uploaded material.
Prompts must prefer concise, accurate, study-friendly outputs.

==================================================
PAYMENT RULES
==================================================

- Use PayPal for recurring Pro subscriptions
- implement subscription status sync
- handle webhook validation properly
- support statuses like active, cancelled, expired, past_due if applicable
- keep entitlement logic centralized
- show plan state clearly in billing UI

==================================================
WHAT I WANT YOU TO OUTPUT
==================================================

You must work in this order:

STEP 1
Provide the high-level architecture and implementation plan.

STEP 2
Provide the full folder structure.

STEP 3
Provide the database schema design, SQL migrations, RLS policies, and TypeScript/Zod schemas.

STEP 4
Build the auth, app shell, dashboard skeleton, and billing foundation.

STEP 5
Build course creation and ingestion.

STEP 6
Build course generation pipeline.

STEP 7
Build course page and all 10 study modes.

STEP 8
Build Brain Dump.

STEP 9
Build Speech Rubric.

STEP 10
Build AI Tutor.

STEP 11
Add analytics, rate limiting, polish, and launch-readiness notes.

For each step:
- state what files are being created or modified
- explain why
- provide real code
- keep code organized

==================================================
IMPORTANT FINAL INSTRUCTIONS
==================================================

Do not be lazy.
Do not skip the hard parts.
Do not reduce everything to placeholders.
Do not write vague “TODO” comments for core features.
Do not handwave the AI pipeline.
Do not handwave billing.
Do not handwave Supabase.
Do not handwave Brain Dump.

When uncertain:
- choose the most pragmatic implementation
- explain tradeoffs
- keep moving

At the end of each phase, include:
- what was built
- what still needs work
- highest-risk areas
- what to test next

Now begin with:
1. a precise restatement of UniBrain,
2. the best pragmatic architecture,
3. the full folder structure,
4. the full database design,
before writing application code.