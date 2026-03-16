"use client";

import { useFormState, useFormStatus } from "react-dom";

import { updateProfileAction } from "@/features/auth/profile-actions";

type Props = {
  fullName: string | null;
  avatarUrl: string | null;
  email: string;
};

const initialState = { ok: false, message: "" };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save profile"}
    </button>
  );
}

export function SettingsForm({ fullName, avatarUrl, email }: Props) {
  const [state, formAction] = useFormState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          value={email}
          readOnly
          disabled
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-500"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Full name
        <input
          name="fullName"
          defaultValue={fullName ?? ""}
          maxLength={120}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Avatar URL
        <input
          name="avatarUrl"
          type="url"
          defaultValue={avatarUrl ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[var(--brand)]"
        />
      </label>
      {state.message ? (
        <p className={`rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <SaveButton />
    </form>
  );
}
