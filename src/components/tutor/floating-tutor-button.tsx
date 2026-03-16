import Link from "next/link";

import { PaywallModal } from "@/components/paywall/paywall-modal";

type FloatingTutorButtonProps = {
  courseId: string;
  plan: "free" | "pro";
};

export function FloatingTutorButton({ courseId, plan }: FloatingTutorButtonProps) {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      {plan === "pro" ? (
        <Link
          href={`/courses/${courseId}/tutor`}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
        >
          AI Tutor
        </Link>
      ) : (
        <PaywallModal featureName="AI Tutor" ctaLabel="AI Tutor" buttonClassName="rounded-full px-4 py-3 shadow-lg" />
      )}
    </div>
  );
}
