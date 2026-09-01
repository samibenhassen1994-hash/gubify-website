import type { Metadata } from "next";
import Link from "next/link";

import LegalFooter from "../legal-footer";
import DeleteAccountForm from "./delete-account-form";

export const metadata: Metadata = {
  title: "Delete Your Gubify Account",
  description:
    "Request deletion of your Gubify account and eligible personal data.",
  alternates: { canonical: "/delete-account" },
  openGraph: {
    title: "Delete Your Gubify Account",
    description:
      "Request deletion of your Gubify account and eligible personal data.",
    url: "https://gubify.com/delete-account",
    siteName: "Gubify",
    type: "website",
  },
};

export default function DeleteAccountPage() {
  return (
    <main className="feedback-page">
      <a className="skip-link" href="#delete-account-main">
        Skip to content
      </a>

      <header className="legal-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span>Gubify</span>
        </Link>
        <nav aria-label="Account deletion page links">
          <Link href="/support">Support Center</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </header>

      <section className="feedback-hero" id="delete-account-main">
        <span className="eyebrow">Account deletion</span>
        <h1>Delete your Gubify account</h1>
        <p>
          You can delete your account directly in the Gubify app. If you no
          longer have access to the app, submit a deletion request here.
        </p>
      </section>

      <DeleteAccountForm />
      <LegalFooter />
    </main>
  );
}
