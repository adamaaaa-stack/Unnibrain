"use client";

import { useState } from "react";

export function SubscribeButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpgrade() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/paypal/subscribe", {
        method: "POST"
      });
      const data = (await response.json()) as { approvalUrl?: string; error?: string };

      if (!response.ok || !data.approvalUrl) {
        throw new Error(data.error ?? "Unable to start PayPal checkout.");
      }

      window.location.href = data.approvalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onUpgrade}
        disabled={pending}
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Redirecting..." : "Upgrade to Pro with PayPal"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
