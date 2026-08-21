"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthError,
  Divider,
  Field,
  GoogleButton,
  OAUTH_ERROR_MESSAGES,
  SubmitButton,
  inputClass,
} from "@/components/auth/auth-ui";
import { AuthApiError, googleLoginUrl, signIn } from "@/lib/api/auth";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const oauthError = searchParams.get("error");

  const [error, setError] = useState<string | null>(
    oauthError
      ? (OAUTH_ERROR_MESSAGES[oauthError] ?? "Sign-in failed. Please try again.")
      : null,
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(data: FormData) {
    setError(null);
    setPending(true);
    try {
      await signIn({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
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
      <h1 className="text-xl font-bold text-foreground">Sign in</h1>
      <p className="mb-6 mt-1 text-xs text-muted">
        Welcome back. Enter your credentials to continue.
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
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>
        <SubmitButton
          pending={pending}
          label="Sign In"
          pendingLabel="Signing in…"
        />
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-accent hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
