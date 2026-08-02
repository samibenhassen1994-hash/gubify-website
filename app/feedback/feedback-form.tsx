"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type FeedbackType = "bug" | "feature";
type TurnstileApi = { render(container: HTMLElement, options: Record<string, unknown>): string; reset(widgetId?: string): void };
declare global { interface Window { turnstile?: TurnstileApi } }

const beneficiaries = ["Friends", "Couples", "Families", "Roommates", "Teams", "Communities", "Everyone"];

function detectTechnicalData() {
  const ua = navigator.userAgent;
  const browserMatch = ua.match(/(Edg|Chrome|Firefox|Version)\/(\d+)/);
  const browserNames: Record<string, string> = { Edg: "Edge", Chrome: "Chrome", Firefox: "Firefox", Version: "Safari" };
  const operatingSystem = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : null;
  const query = new URLSearchParams(window.location.search);
  return {
    appVersion: query.get("appVersion"), appPlatform: query.get("platform"),
    deviceModel: query.get("deviceModel"), language: query.get("language") || navigator.language,
    origin: query.get("origin") === "app" ? "app" : "web",
    operatingSystem, browser: browserMatch ? browserNames[browserMatch[1]] : null,
    browserVersion: browserMatch?.[2] ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewportWidth: window.innerWidth, viewportHeight: window.innerHeight,
    pageUrl: window.location.href, sourcePage: document.referrer || null,
    siteBuildIdentifier: process.env.NEXT_PUBLIC_SITE_BUILD_ID ?? null,
  };
}

export default function FeedbackForm({ initialType }: { initialType: FeedbackType }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [type, setType] = useState<FeedbackType>(initialType);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    const render = () => {
      if (!window.turnstile || !container.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey, theme: "light", size: "flexible",
        callback: (token: string) => { setTurnstileToken(token); setErrors((current) => ({ ...current, turnstile: "" })); },
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setErrors((current) => ({ ...current, turnstile: "Security verification failed." })),
      });
    };
    if (window.turnstile) return render();
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.defer = true; script.onload = render; document.head.appendChild(script);
    return () => { script.onload = null; };
  }, [siteKey]);

  const selectType = (next: FeedbackType) => {
    setType(next); setErrors({}); setStatus("idle");
    const url = new URL(window.location.href); url.searchParams.set("type", next); window.history.replaceState({}, "", url);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const nextErrors: Record<string, string> = {};
    const title = String(values.get("title") ?? "").trim();
    const description = String(values.get("description") ?? "").trim();
    const usefulness = String(values.get("usefulness") ?? "").trim();
    const contactEmail = String(values.get("contactEmail") ?? "").trim();
    if (!title || title.length > 120) nextErrors.title = "Enter a title of up to 120 characters.";
    if (!description || description.length > 4000) nextErrors.description = "Enter a description of up to 4,000 characters.";
    if (type === "feature" && !usefulness) nextErrors.usefulness = "Explain why this feature would be useful.";
    if (contactEmail && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(contactEmail)) nextErrors.contactEmail = "Enter a valid email address.";
    if (!turnstileToken) nextErrors.turnstile = "Complete the security check.";
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    setStatus("submitting");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ type, title, description, usefulness,
          stepsToReproduce: values.get("stepsToReproduce"), expectedBehavior: values.get("expectedBehavior"),
          beneficiary: values.get("beneficiary"), contactEmail, website: values.get("website"),
          turnstileToken, ...detectTechnicalData() }),
      });
      const result = await response.json() as { ok?: boolean; field?: string; error?: string };
      if (!response.ok || !result.ok) { setErrors({ [result.field ?? "form"]: result.error ?? "Something went wrong." }); setStatus("idle"); window.turnstile?.reset(widgetId.current); setTurnstileToken(""); return; }
      form.reset(); setStatus("success"); window.turnstile?.reset(widgetId.current); setTurnstileToken("");
    } catch { setErrors({ form: "Something went wrong. Please try again." }); setStatus("idle"); }
  }

  return <div className="feedback-shell">
    <div className="feedback-tabs" role="tablist" aria-label="Choose feedback type">
      {(["bug", "feature"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={type === item} tabIndex={type === item ? 0 : -1} onClick={() => selectType(item)} onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const next = item === "bug" ? "feature" : "bug";
          selectType(next);
          event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[role="tab"][aria-selected="${type !== item}"]`)?.focus();
        }
      }}>
        <strong>{item === "bug" ? "Report a Bug" : "Suggest a Feature"}</strong><span>{item === "bug" ? "Share a technical problem" : "Help shape what comes next"}</span>
      </button>)}
    </div>
    <section className="feedback-form-card" role="tabpanel" aria-labelledby="feedback-form-title">
      {status === "success" ? <div className="feedback-success" role="status" aria-live="polite"><span aria-hidden="true">✓</span><h2>{type === "bug" ? "Bug report received" : "Feature suggestion received"}</h2><p>{type === "bug" ? "Thank you. Your report will help us improve the Gubify beta." : "Thank you for helping shape the future of Gubify."}</p><button type="button" onClick={() => setStatus("idle")}>Send another submission</button></div> : <>
        <span className="feedback-kicker">{type === "bug" ? "Technical feedback" : "Product feedback"}</span>
        <h2 id="feedback-form-title">{type === "bug" ? "Report a Bug" : "Suggest a Feature"}</h2>
        <p>{type === "bug" ? "Tell us what went wrong so we can investigate it during the Gubify beta." : "Share an idea that could make Gubify more useful for groups and communities."}</p>
        <form onSubmit={submit} noValidate>
          <Field label={type === "bug" ? "Problem title" : "Feature title"} name="title" required maxLength={120} error={errors.title} />
          <TextField label={type === "bug" ? "What happened?" : "Describe your idea"} name="description" required maxLength={4000} error={errors.description} />
          {type === "bug" ? <><TextField label="Steps to reproduce" name="stepsToReproduce" hint="Tell us what you did before the problem appeared." maxLength={4000} /><TextField label="What did you expect to happen?" name="expectedBehavior" maxLength={4000} /></> : <><TextField label="Why would it be useful?" name="usefulness" required maxLength={4000} error={errors.usefulness} /><label className="feedback-field"><span>Who would benefit from it? <small>Optional</small></span><select name="beneficiary"><option value="">Choose an option</option>{beneficiaries.map((item) => <option key={item} value={item.toLowerCase()}>{item}</option>)}</select></label></>}
          <Field label="Contact email" name="contactEmail" type="email" maxLength={254} hint={type === "bug" ? "Leave your email only if you would like us to contact you about this report." : "Used only if we need clarification about your suggestion."} error={errors.contactEmail} />
          <div className="feedback-honeypot" aria-hidden="true"><label htmlFor="feedback-website">Website</label><input id="feedback-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <div className="turnstile-field">{siteKey ? <div ref={container} /> : <p>Security verification is not configured for this environment.</p>}{errors.turnstile && <small className="feedback-error">{errors.turnstile}</small>}</div>
          <div className="feedback-form-status" aria-live="assertive">{errors.form}</div>
          <button className="feedback-submit" type="submit" disabled={status === "submitting" || !siteKey}>{status === "submitting" ? "Sending…" : type === "bug" ? "Send bug report" : "Send feature suggestion"}</button>
          <p className="feedback-privacy">Information submitted through this form will be used to review the report or suggestion and improve Gubify. Your email will only be used to contact you about this submission. Read the <Link href="/privacy">Privacy Policy</Link>.</p>
        </form></>}
    </section>
  </div>;
}

function Field({ label, name, error, hint, required, type = "text", maxLength }: { label: string; name: string; error?: string; hint?: string; required?: boolean; type?: string; maxLength: number }) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <label className="feedback-field"><span>{label}{!required && <small>Optional</small>}</span>{hint && <em id={`${name}-hint`}>{hint}</em>}<input name={name} type={type} required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={describedBy} />{error && <b id={`${name}-error`}>{error}</b>}</label>;
}
function TextField({ label, name, error, hint, required, maxLength }: { label: string; name: string; error?: string; hint?: string; required?: boolean; maxLength: number }) {
  const describedBy = [hint ? `${name}-hint` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <label className="feedback-field"><span>{label}{!required && <small>Optional</small>}</span>{hint && <em id={`${name}-hint`}>{hint}</em>}<textarea name={name} required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={describedBy} />{error && <b id={`${name}-error`}>{error}</b>}</label>;
}
