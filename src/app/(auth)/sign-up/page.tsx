"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthError,
  Divider,
  Field,
  GoogleButton,
  SubmitButton,
  inputClass,
} from "@/components/auth/auth-ui";
import { AuthApiError, googleLoginUrl, signUp } from "@/lib/api/auth";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(data: FormData) {
    setError(null);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirm_password") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      await signUp({ name, email, password });
      const destination = nextPath?.startsWith("/") ? nextPath : "/creatives";
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl shadow-black/40">
      <h1 className="text-xl font-bold text-foreground">Create your account</h1>
      <p className="mb-6 mt-1 text-xs text-muted">
        Sign up with your name, email and a password.
      </p>

      <div className="flex flex-col gap-3">
        <GoogleButton
          href={googleLoginUrl(nextPath ?? undefined)}
          label="Continue with Google"
        />
        <Divider />
      </div>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
      >
        <AuthError message={error} />
        <Field label="Name">
          <input
            name="name"
            type="text"
            required
            maxLength={255}
            autoComplete="name"
            placeholder="Jane Doe"
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={inputClass}
          />
        </Field>
        <Field label="Password">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={inputClass}
          />
        </Field>
        <Field label="Confirm Password">
          <input
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Repeat your password"
            className={inputClass}
          />
        </Field>
        <SubmitButton
          pending={pending}
          label="Sign Up"
          pendingLabel="Creating account…"
        />
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
