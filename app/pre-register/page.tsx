import type { Metadata } from "next";
import Link from "next/link";
import FeatureGallery from "./feature-gallery";
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
          <span className="eyebrow">Gubify early access</span>
          <p className="pre-register-display-label">PRE-REGISTER · BETA GOAL</p>
          <h1>Turn group conversations into real action.</h1>
          <p className="pre-register-description">
            Organize what matters, find communities built around your interests,
            and grow by helping others — all in one connected group experience.
          </p>
          <div className="pre-register-hero-actions">
            <a className="pre-register-primary-cta" href="#pre-register-form">
              Join the beta goal <span aria-hidden="true">↓</span>
            </a>
            <span>Launch notification only. No spam.</span>
          </div>

          <section className="pre-register-showcase" aria-labelledby="showcase-title">
            <div className="pre-register-showcase-heading">
              <span>One app, more useful groups</span>
              <h2 id="showcase-title">See what you can do with Gubify</h2>
              <p>From everyday messages to shared interests and trusted answers, Gubify helps groups move forward together.</p>
            </div>
            <FeatureGallery />
            <div className="pre-register-value-strip" aria-label="Gubify key benefits">
              <article>
                <span aria-hidden="true">01</span>
                <h3>Make chats actionable</h3>
                <p>Turn the right message into a clear next step.</p>
              </article>
              <article>
                <span aria-hidden="true">02</span>
                <h3>Find your people</h3>
                <p>Join communities shaped around what you love.</p>
              </article>
              <article>
                <span aria-hidden="true">03</span>
                <h3>Grow by contributing</h3>
                <p>Help others, share useful answers and level up.</p>
              </article>
            </div>
          </section>
        </div>

        <PreRegisterForm />
      </section>
      <LegalFooter />
    </main>
  );
}
