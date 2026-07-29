import type { Metadata } from "next";
import Link from "next/link";
import PreRegisterForm from "./pre-register-form";
import LegalFooter from "../legal-footer";

export const metadata: Metadata = {
  title: "Pre-register for Gubify | Get notified at launch",
  description:
    "Pre-register for Gubify and receive a notification when the group organization app becomes available.",
  alternates: {
    canonical: "https://gubify.com/pre-register",
  },
  openGraph: {
    title: "Pre-register for Gubify | Get notified at launch",
    description:
      "Pre-register for Gubify and receive a notification when the group organization app becomes available.",
    url: "https://gubify.com/pre-register",
    siteName: "Gubify",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PreRegisterPage() {
  return (
    <main className="pre-register-page">
      <a className="skip-link" href="#pre-register-main">Skip to content</a>
      <header className="pre-register-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <Link className="pre-register-back-link" href="/">Back to Gubify</Link>
      </header>

      <section className="pre-register-hero" id="pre-register-main">
        <div className="pre-register-intro">
          <span className="eyebrow">Pre-register for Gubify</span>
          <p className="pre-register-display-label">PRE-REGISTER</p>
          <h1>Be among the first to use Gubify.</h1>
          <p className="pre-register-description">
            Gubify turns group conversations into tasks, events, proposals,
            shared budgets and real plans. Pre-register now and we&apos;ll
            notify you when the app is ready.
          </p>
          <div className="pre-register-callout">
            <span className="pre-register-callout-mark" aria-hidden="true">G</span>
            <strong>One group. One chat. Everything your group needs to move forward.</strong>
          </div>
          <div className="pre-register-visual" aria-label="Gubify launch notification preview">
            <span className="pre-register-orbit pre-register-orbit-one" aria-hidden="true" />
            <span className="pre-register-orbit pre-register-orbit-two" aria-hidden="true" />
            <div className="launch-notification-card">
              <span className="launch-notification-icon" aria-hidden="true">G</span>
              <div>
                <small>Gubify launch notification</small>
                <strong>Your group&apos;s next chapter starts here.</strong>
              </div>
              <span className="launch-notification-dot" aria-hidden="true" />
            </div>
            <div className="launch-people" aria-hidden="true">
              <span>A</span><span>M</span><span>J</span><span>+</span>
            </div>
          </div>
        </div>

        <PreRegisterForm />
      </section>
      <LegalFooter />
    </main>
  );
}
