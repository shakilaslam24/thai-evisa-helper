"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/login/actions";
import { IDLE_STATE } from "./action-state";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, IDLE_STATE);

  return (
    <form action={action} className="grid gap-5">
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="input"
          aria-invalid={state.status === "error" ? "true" : undefined}
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          aria-invalid={state.status === "error" ? "true" : undefined}
        />
      </div>

      {state.status === "error" && state.message ? (
        <p
          className="rounded-sm border border-[#b3261e]/30 bg-[#b3261e]/[0.06] px-4 py-3 text-[0.875rem] text-[#8c1d18]"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
