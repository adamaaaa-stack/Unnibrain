export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PlanTier = "free" | "pro";
export type SubscriptionStatus = "inactive" | "active" | "past_due" | "cancelled" | "expired";
export type BillingProvider = "paypal";
export type CourseSourceType = "pasted_text" | "pdf" | "image" | "text_file" | "mixed";
export type CourseStatus = "draft" | "queued" | "processing" | "ready" | "failed" | "archived";
export type CourseSourceKind = "raw_text" | "pdf_page" | "image_ocr" | "text_file";
export type FlashcardDifficulty = "easy" | "medium" | "hard";
export type GenerationJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type GenerationJobType =
  | "full_course"
  | "summary"
  | "guide"
  | "terms"
  | "flashcards"
  | "quiz"
  | "practice"
  | "tips"
  | "brain_dump_eval"
  | "speech_rubric_eval"
  | "tutor_response";
export type TutorMessageRole = "user" | "assistant" | "system";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          provider: BillingProvider;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          plan: PlanTier;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider?: BillingProvider;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          plan?: PlanTier;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          plan?: PlanTier;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
      };
      usage_counters: {
        Row: {
          id: string;
          user_id: string;
          month_key: string;
          course_generations_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month_key: string;
          course_generations_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          course_generations_used?: number;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: CourseSourceType;
          source_file_url: string | null;
          source_raw_text: string | null;
          source_image_count: number | null;
          source_text_hash: string | null;
          status: CourseStatus;
          generation_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_type: CourseSourceType;
          source_file_url?: string | null;
          source_raw_text?: string | null;
          source_image_count?: number | null;
          source_text_hash?: string | null;
          status?: CourseStatus;
          generation_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          source_file_url?: string | null;
          source_raw_text?: string | null;
          source_image_count?: number | null;
          source_text_hash?: string | null;
          status?: CourseStatus;
          generation_error?: string | null;
          updated_at?: string;
        };
      };
      course_sources: {
        Row: {
          id: string;
          course_id: string;
          source_kind: CourseSourceKind;
          source_name: string | null;
          extracted_text: string;
          sequence_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          source_kind: CourseSourceKind;
          source_name?: string | null;
          extracted_text: string;
          sequence_index: number;
          created_at?: string;
        };
        Update: {
          source_name?: string | null;
          extracted_text?: string;
          sequence_index?: number;
        };
      };
      course_sections: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          summary: string;
          sequence_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          summary: string;
          sequence_index: number;
          created_at?: string;
        };
        Update: {
          title?: string;
          summary?: string;
          sequence_index?: number;
        };
      };
      course_terms: {
        Row: {
          id: string;
          course_id: string;
          term: string;
          definition: string;
          example: string;
          section_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          term: string;
          definition: string;
          example: string;
          section_id?: string | null;
          created_at?: string;
        };
        Update: {
          term?: string;
          definition?: string;
          example?: string;
          section_id?: string | null;
        };
      };
      flashcards: {
        Row: {
          id: string;
          course_id: string;
          front: string;
          back: string;
          hint: string | null;
          difficulty: FlashcardDifficulty | null;
          section_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          front: string;
          back: string;
          hint?: string | null;
          difficulty?: FlashcardDifficulty | null;
          section_id?: string | null;
          created_at?: string;
        };
        Update: {
          front?: string;
          back?: string;
          hint?: string | null;
          difficulty?: FlashcardDifficulty | null;
          section_id?: string | null;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          course_id: string;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: "A" | "B" | "C" | "D";
          explanation: string;
          section_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          question: string;
          option_a: string;
          option_b: string;
          option_c: string;
          option_d: string;
          correct_option: "A" | "B" | "C" | "D";
          explanation: string;
          section_id?: string | null;
          created_at?: string;
        };
        Update: {
          question?: string;
          option_a?: string;
          option_b?: string;
          option_c?: string;
          option_d?: string;
          correct_option?: "A" | "B" | "C" | "D";
          explanation?: string;
          section_id?: string | null;
        };
      };
      practice_questions: {
        Row: {
          id: string;
          course_id: string;
          question: string;
          hint: string;
          sample_answer: string;
          section_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          question: string;
          hint: string;
          sample_answer: string;
          section_id?: string | null;
          created_at?: string;
        };
        Update: {
          question?: string;
          hint?: string;
          sample_answer?: string;
          section_id?: string | null;
        };
      };
      study_tips: {
        Row: {
          id: string;
          course_id: string;
          tip: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          tip: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          tip?: string;
          reason?: string | null;
        };
      };
      course_guides: {
        Row: {
          id: string;
          course_id: string;
          content_json: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          content_json: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content_json?: Json;
          updated_at?: string;
        };
      };
      course_summaries: {
        Row: {
          id: string;
          course_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      brain_dump_sessions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          transcript: string;
          score: number;
          covered_json: Json;
          partial_json: Json;
          missed_json: Json;
          feedback: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          transcript: string;
          score: number;
          covered_json?: Json;
          partial_json?: Json;
          missed_json?: Json;
          feedback: string;
          created_at?: string;
        };
        Update: {
          transcript?: string;
          score?: number;
          covered_json?: Json;
          partial_json?: Json;
          missed_json?: Json;
          feedback?: string;
        };
      };
      speech_rubric_sessions: {
        Row: {
          id: string;
          user_id: string;
          course_id: string | null;
          title: string | null;
          transcript: string;
          content_score: number;
          clarity_score: number;
          structure_score: number;
          confidence_score: number;
          pacing_score: number | null;
          filler_word_count: number;
          filler_words_json: Json;
          feedback: string;
          suggestions: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id?: string | null;
          title?: string | null;
          transcript: string;
          content_score: number;
          clarity_score: number;
          structure_score: number;
          confidence_score: number;
          pacing_score?: number | null;
          filler_word_count?: number;
          filler_words_json?: Json;
          feedback: string;
          suggestions: string;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          transcript?: string;
          content_score?: number;
          clarity_score?: number;
          structure_score?: number;
          confidence_score?: number;
          pacing_score?: number | null;
          filler_word_count?: number;
          filler_words_json?: Json;
          feedback?: string;
          suggestions?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          score: number;
          total_questions: number;
          answers_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          score: number;
          total_questions: number;
          answers_json?: Json;
          created_at?: string;
        };
        Update: {
          score?: number;
          total_questions?: number;
          answers_json?: Json;
        };
      };
      write_attempts: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          flashcard_id: string;
          prompt: string;
          answer: string;
          correct_answer: string;
          self_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          flashcard_id: string;
          prompt: string;
          answer: string;
          correct_answer: string;
          self_score?: number | null;
          created_at?: string;
        };
        Update: {
          answer?: string;
          self_score?: number | null;
        };
      };
      learn_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          flashcard_id: string;
          mastery_level: number;
          last_reviewed_at: string | null;
          correct_streak: number;
          incorrect_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          flashcard_id: string;
          mastery_level?: number;
          last_reviewed_at?: string | null;
          correct_streak?: number;
          incorrect_count?: number;
          updated_at?: string;
        };
        Update: {
          mastery_level?: number;
          last_reviewed_at?: string | null;
          correct_streak?: number;
          incorrect_count?: number;
          updated_at?: string;
        };
      };
      match_attempts: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          time_seconds: number;
          mistakes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          time_seconds: number;
          mistakes?: number;
          created_at?: string;
        };
        Update: {
          time_seconds?: number;
          mistakes?: number;
        };
      };
      tutor_messages: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          role: TutorMessageRole;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          role: TutorMessageRole;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
      };
      generation_jobs: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          status: GenerationJobStatus;
          job_type: GenerationJobType;
          input_hash: string | null;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          metadata_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          status?: GenerationJobStatus;
          job_type?: GenerationJobType;
          input_hash?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          metadata_json?: Json;
          created_at?: string;
        };
        Update: {
          status?: GenerationJobStatus;
          input_hash?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          metadata_json?: Json;
        };
      };
    };
    Enums: {
      plan_tier: PlanTier;
      subscription_status: SubscriptionStatus;
      billing_provider: BillingProvider;
      course_source_type: CourseSourceType;
      course_status: CourseStatus;
      course_source_kind: CourseSourceKind;
      flashcard_difficulty: FlashcardDifficulty;
      generation_job_status: GenerationJobStatus;
      generation_job_type: GenerationJobType;
      tutor_message_role: TutorMessageRole;
    };
  };
}

export type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
