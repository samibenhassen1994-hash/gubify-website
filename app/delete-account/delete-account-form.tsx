"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function DeleteAccountForm() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [requestId, setRequestId] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey || !container.current) return;

    const render = () => {
      if (!window.turnstile || !container.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "light",
        size: "flexible",
        callback: (token: string) => {
          setTurnstileToken(token);
          setErrors((current) => ({ ...current, turnstile: "" }));
        },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () =>
          setErrors((current) => ({
            ...current,
            turnstile: "Security verification failed.",
          })),
      });
    };

    if (window.turnstile) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = render;
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [siteKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") ?? "").trim();
    const confirmation = values.get("confirmation") === "on";
    const nextErrors: Record<string, string> = {};

    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      nextErrors.email = "Enter the email associated with your Gubify account.";
    }
    if (!confirmation) {
      nextErrors.confirmation =
        "Confirm that you want to request permanent account deletion.";
    }
    if (!turnstileToken) {
      nextErrors.turnstile = "Complete the security check.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus("submitting");
    try {
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          email,
          displayName: values.get("displayName"),
          notes: values.get("notes"),
          confirmation,
          website: values.get("website"),
          turnstileToken,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        field?: string;
        error?: string;
        requestId?: string;
      };

      if (!response.ok || !result.ok) {
        setErrors({
          [result.field ?? "form"]:
            result.error ?? "Something went wrong. Please try again.",
        });
        setStatus("idle");
        window.turnstile?.reset(widgetId.current);
        setTurnstileToken("");
        return;
      }

      form.reset();
      setRequestId(result.requestId ?? "");
      setStatus("success");
      window.turnstile?.reset(widgetId.current);
      setTurnstileToken("");
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
      setStatus("idle");
    }
  }

  return (
    <div className="feedback-shell">
      <section className="feedback-form-card" aria-labelledby="delete-form-title">
        {status === "success" ? (
          <div className="feedback-success" role="status" aria-live="polite">
            <span aria-hidden="true">✓</span>
            <h2>Deletion request received</h2>
            <p>
              Gubify will verify that the request belongs to you before deleting
              the account and eligible personal data. We may contact you at the
              email address you provided.
            </p>
            {requestId && <p>Request reference: {requestId}</p>}
          </div>
        ) : (
          <>
            <span className="feedback-kicker">Account and privacy</span>
            <h2 id="delete-form-title">Request account deletion</h2>
            <p>
              If you can still sign in to Gubify, the fastest option is Account →
              Delete account in the app. Use this form if you cannot access the app
              or need help completing the deletion.
            </p>

            <form onSubmit={submit} noValidate>
              <label className="feedback-field">
                <span>Account email</span>
                <em>Use the email associated with your Gubify sign-in method.</em>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <b>{errors.email}</b>}
              </label>

              <label className="feedback-field">
                <span>
                  Display name <small>Optional</small>
                </span>
                <input name="displayName" type="text" maxLength={80} />
              </label>

              <label className="feedback-field">
                <span>
                  Notes <small>Optional</small>
                </span>
                <em>
                  For example, tell us if you lost access to the app. Do not send
                  passwords or authentication codes.
                </em>
                <textarea name="notes" maxLength={2000} />
              </label>

              <label className="feedback-field">
                <span>Deletion confirmation</span>
                <span>
                  <input name="confirmation" type="checkbox" required /> I am
                  requesting permanent deletion of my Gubify account and eligible
                  personal data.
                </span>
                {errors.confirmation && <b>{errors.confirmation}</b>}
              </label>

              <div className="feedback-honeypot" aria-hidden="true">
                <label htmlFor="delete-account-website">Website</label>
                <input
                  id="delete-account-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="turnstile-field">
                {siteKey ? (
                  <div ref={container} />
                ) : (
                  <p>Security verification is not configured for this environment.</p>
                )}
                {errors.turnstile && (
                  <small className="feedback-error">{errors.turnstile}</small>
                )}
              </div>

              <div className="feedback-form-status" aria-live="assertive">
                {errors.form}
              </div>

              <button
                className="feedback-submit"
                type="submit"
                disabled={status === "submitting" || !siteKey}
              >
                {status === "submitting"
                  ? "Sending…"
                  : "Submit deletion request"}
              </button>

              <p className="feedback-privacy">
                Submitting this form does not instantly delete an account. Gubify
                verifies ownership before acting on the request. See the{" "}
                <Link href="/privacy">Privacy Policy</Link> for information about
                deletion and limited retention obligations.
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
