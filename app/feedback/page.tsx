import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";
import FeedbackForm from "./feedback-form";

export const metadata: Metadata = {
  title: "Gubify Feedback | Report a Bug or Suggest a Feature",
  description: "Report a problem or suggest a feature to help improve the Gubify beta.",
  alternates: { canonical: "/feedback" },
};

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const initialType = params.type === "feature" ? "feature" : "bug";
  return <main className="feedback-page"><a className="skip-link" href="#feedback-main">Skip to content</a>
    <header className="legal-header"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">G</span><span>Gubify</span></Link><nav><Link href="/support">Support Center</Link><Link href="/privacy">Privacy</Link></nav></header>
    <section className="feedback-hero" id="feedback-main"><span className="eyebrow">Gubify beta feedback</span><h1>Help us improve Gubify</h1><p>Found a problem or have an idea? Your feedback helps us build a better Gubify beta.</p></section>
    <FeedbackForm initialType={initialType} /><LegalFooter /></main>;
}
