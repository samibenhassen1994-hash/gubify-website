"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Progress = {
  count: number;
  goal: number;
  remaining: number;
  percentage: number;
  goalReached: boolean;
};

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId?: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const deviceOptions = [
  ["android", "Android phone"],
  ["ios", "iPhone"],
  ["both", "Both Android and iPhone"],
  ["other", "Other"],
] as const;

const initialErrors: Record<string, string> = {};

export default function PreRegisterForm() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [progress, setProgress] = useState<Progress | null>(null);
  const [counterError, setCounterError] = useState("");
  const [errors, setErrors] = useState(initialErrors);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [successTitle, setSuccessTitle] = useState("You're on the list!");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | undefined>(undefined);

  const loadProgress = useCallback(async () => {
    try {
      const response = await fetch("/api/pre-register/count", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("Counter unavailable");
      const data = (await response.json()) as Progress;
      setProgress(data);
      setCounterError("");
    } catch {
      setCounterError("Registration counter temporarily unavailable.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProgress(), 0);
    return () => window.clearTimeout(timer);
  }, [loadProgress]);

  useEffect(() => {
    if (!siteKey || !turnstileContainer.current) return;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileContainer.current || turnstileWidgetId.current) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileContainer.current, {
        sitekey: siteKey,
        theme: "light",
        size: "flexible",
        callback: (token: string) => {
          setTurnstileToken(token);
          setErrors((current) => ({ ...current, turnstile: "" }));
        },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => {
          setTurnstileToken("");
          setErrors((current) => ({
            ...current,
            turnstile: "Security verification failed. Please try again.",
          }));
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [siteKey]);

  function resetTurnstile() {
    setTurnstileToken("");
    window.turnstile?.reset(turnstileWidgetId.current);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const deviceInterest = String(formData.get("deviceInterest") ?? "");
    const consentGiven = formData.get("consentGiven") === "on";
    const nextErrors: Record<string, string> = {};

    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || email.length > 254) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (firstName.length > 80 || /<[^>]*>/.test(firstName)) {
      nextErrors.firstName = "Enter a valid first name.";
    }
    if (!deviceOptions.some(([value]) => value === deviceInterest)) {
      nextErrors.deviceInterest = "Choose a device.";
    }
    if (!consentGiven) nextErrors.consentGiven = "Consent is required.";
    if (!turnstileToken) nextErrors.turnstile = "Complete the security check.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const query = new URLSearchParams(window.location.search);
    setStatus("submitting");

    try {
      const response = await fetch("/api/pre-register", {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          firstName,
          email,
          deviceInterest,
          consentGiven,
          website: String(formData.get("website") ?? ""),
          turnstileToken,
          utmSource: query.get("utm_source"),
          utmMedium: query.get("utm_medium"),
          utmCampaign: query.get("utm_campaign"),
          utmContent: query.get("utm_content"),
          utmTerm: query.get("utm_term"),
          landingPath: `${window.location.pathname}${window.location.search}`.slice(0, 300),
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        field?: string;
        error?: string;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        setErrors({
          [result.field ?? "form"]:
            result.error ?? "Something went wrong. Please try again.",
        });
        setStatus("idle");
        resetTurnstile();
        return;
      }

      setSuccessTitle(result.message ?? "You're on the list!");
      setStatus("success");
      await loadProgress();
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
      setStatus("idle");
      resetTurnstile();
    }
  }

  return (
    <div className="pre-register-action-column">
      <section className="beta-progress-card" aria-labelledby="beta-goal-title">
        <span className="pre-register-card-kicker">Public beta goal</span>
        <h2 id="beta-goal-title">
          {progress?.goalReached ? "The beta goal has been reached!" : "Help unlock the Gubify beta"}
        </h2>
        <p>
          {progress?.goalReached
            ? "Thanks to the community, Gubify is moving into beta."
            : "When we reach 10,000 pre-registrations, Gubify will move straight into beta."}
        </p>
        {progress ? (
          <div className="beta-progress-data">
            <strong>
              {progress.count.toLocaleString("en-US")}
              <small> of {progress.goal.toLocaleString("en-US")} pre-registrations</small>
            </strong>
            <div
              className="beta-progress-track"
              role="progressbar"
              aria-label="Pre-registration beta goal"
              aria-valuemin={0}
              aria-valuemax={progress.goal}
              aria-valuenow={Math.min(progress.count, progress.goal)}
            >
              <span style={{ width: `${progress.percentage}%` }} />
            </div>
            <div className="beta-progress-meta">
              <span>{progress.percentage}% of the beta goal reached</span>
              {!progress.goalReached && (
                <span>{progress.remaining.toLocaleString("en-US")} more people to unlock the beta</span>
              )}
            </div>
          </div>
        ) : (
          <p className="beta-counter-status" aria-live="polite">
            {counterError || "Loading the current pre-registration count…"}
          </p>
        )}
      </section>

      <section className="pre-register-form-card" aria-labelledby="form-title">
        {status === "success" ? (
          <div className="pre-register-success" role="status" aria-live="polite">
            <span aria-hidden="true">✓</span>
            <h2>{successTitle}</h2>
            <p>
              Your pre-registration has been received. We&apos;ll let you know
              when Gubify is ready.
            </p>
            <Link href="/">Back to Gubify</Link>
          </div>
        ) : (
          <>
            <span className="pre-register-card-kicker">Launch notification</span>
            <h2 id="form-title">Get your launch notification</h2>
            <p>
              Leave your email and we&apos;ll send you a notification when
              Gubify becomes available.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="pre-register-field">
                <label htmlFor="firstName">
                  First name <span>Optional</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  maxLength={80}
                  aria-invalid={Boolean(errors.firstName)}
                  aria-describedby={errors.firstName ? "first-name-error" : undefined}
                />
                {errors.firstName && <small id="first-name-error">{errors.firstName}</small>}
              </div>

              <div className="pre-register-field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && <small id="email-error">{errors.email}</small>}
              </div>

              <fieldset
                className="device-interest"
                aria-invalid={Boolean(errors.deviceInterest)}
                aria-describedby={errors.deviceInterest ? "device-error" : "device-help"}
              >
                <legend>Which device would you use Gubify on?</legend>
                <p id="device-help">This helps us understand which platform should receive the first beta.</p>
                <div className="device-options">
                  {deviceOptions.map(([value, label]) => (
                    <label key={value}>
                      <input type="radio" name="deviceInterest" value={value} required />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {errors.deviceInterest && <small id="device-error">{errors.deviceInterest}</small>}
              </fieldset>

              <div className="pre-register-honeypot" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <label className="pre-register-consent">
                <input
                  type="checkbox"
                  name="consentGiven"
                  required
                  aria-invalid={Boolean(errors.consentGiven)}
                  aria-describedby={errors.consentGiven ? "consent-error" : undefined}
                />
                <span>
                  I have read the <Link href="/privacy">Privacy Policy</Link> and
                  consent to the processing of my personal data for managing my
                  pre-registration and sending the Gubify launch notification.
                </span>
              </label>
              {errors.consentGiven && <small className="pre-register-error" id="consent-error">{errors.consentGiven}</small>}

              <div className="turnstile-field">
                {siteKey ? (
                  <div ref={turnstileContainer} />
                ) : (
                  <p>Security verification is not configured for this environment.</p>
                )}
                {errors.turnstile && <small className="pre-register-error">{errors.turnstile}</small>}
              </div>

              <div className="pre-register-form-status" aria-live="assertive">
                {errors.form}
              </div>

              <button type="submit" disabled={status === "submitting" || !siteKey}>
                {status === "submitting" ? "Sending…" : "Pre-register now"}
              </button>
              <p className="pre-register-fine-print">
                Launch notification only. No spam. You can ask us to remove
                your address at any time.
              </p>
              <p className="pre-register-privacy">
                See the <Link href="/privacy">Privacy Policy</Link> for details
                about data use, retention and your rights.
              </p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
