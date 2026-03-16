import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1)
});

const serverEnvSchema = publicEnvSchema.extend({
  PAYMENTS_ENABLED: z.enum(["true", "false"]).default("false"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  OPENAI_MODEL_FALLBACKS: z.string().optional(),
  OPENAI_OCR_MODEL: z.string().min(1).optional(),
  OPENAI_API_BASE: z.string().url().default("https://api.openai.com/v1"),
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_WEBHOOK_ID: z.string().min(1).optional(),
  PAYPAL_PLAN_ID_PRO: z.string().min(1).optional(),
  PAYPAL_API_BASE: z.string().url().default("https://api-m.sandbox.paypal.com"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional()
});

const publicDefaults = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key-placeholder"
};

const rawPublicEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key-placeholder"
};

const parsedPublicEnv = publicEnvSchema.safeParse(rawPublicEnv);
export const publicEnv = parsedPublicEnv.success ? parsedPublicEnv.data : publicDefaults;

const rawServerEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "public-anon-key-placeholder",
  PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_MODEL_FALLBACKS: process.env.OPENAI_MODEL_FALLBACKS,
  OPENAI_OCR_MODEL: process.env.OPENAI_OCR_MODEL,
  OPENAI_API_BASE: process.env.OPENAI_API_BASE,
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
  PAYPAL_PLAN_ID_PRO: process.env.PAYPAL_PLAN_ID_PRO,
  PAYPAL_API_BASE: process.env.PAYPAL_API_BASE,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
};

const parsedServerEnv = serverEnvSchema.safeParse(rawServerEnv);
export const serverEnv = parsedServerEnv.success
  ? parsedServerEnv.data
  : {
      ...publicEnv,
      PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED === "true" ? "true" : "false",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      OPENAI_MODEL_FALLBACKS: process.env.OPENAI_MODEL_FALLBACKS,
      OPENAI_OCR_MODEL: process.env.OPENAI_OCR_MODEL,
      OPENAI_API_BASE: "https://api.openai.com/v1",
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID,
      PAYPAL_PLAN_ID_PRO: process.env.PAYPAL_PLAN_ID_PRO,
      PAYPAL_API_BASE: "https://api-m.sandbox.paypal.com",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
    };
