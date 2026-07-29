import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";

export const metadata: Metadata = {
  title: "Gubify Support Center | Privacy and pre-registration help",
  description:
    "Contact Gubify, request deletion of a pre-registration, withdraw consent or learn how to exercise privacy rights.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Gubify Support Center",
    description:
      "Contact Gubify and find help with pre-registration and privacy requests.",
    url: "https://gubify.com/support",
    siteName: "Gubify",
    type: "website",
  },
};

const contacts = [
  ["General information", "hello@gubify.com"],
  ["Technical support", "support@gubify.com"],
  ["Privacy requests", "privacy@gubify.com"],
  ["Beta program", "beta@gubify.com"],
  ["Legal requests", "legal@gubify.com"],
] as const;

export default function SupportPage() {
  return (
    <main className="legal-page support-center-page">
      <a className="skip-link" href="#support-main">Skip to content</a>
      <header className="legal-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <nav aria-label="Support page links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link className="legal-header-cta" href="/pre-register">Pre-register</Link>
        </nav>
      </header>

      <section className="legal-hero support-center-hero" id="support-main">
        <span className="eyebrow">Help and contact</span>
        <h1>Gubify Support Center</h1>
        <p>
          Find the right contact for Gubify and clear instructions for managing
          your pre-registration and privacy choices.
        </p>
      </section>

      <div className="support-center-content">
        <section aria-labelledby="contact-title">
          <div className="support-center-heading">
            <span>01</span>
            <div>
              <h2 id="contact-title">Contact Gubify</h2>
              <p>Choose the address that best matches your request.</p>
            </div>
          </div>
          <div className="support-contact-grid">
            {contacts.map(([label, address]) => (
              <a key={address} href={`mailto:${address}`}>
                <span>{label}</span>
                <strong>{address}</strong>
              </a>
            ))}
          </div>
        </section>

        <section className="deletion-section" id="delete-pre-registration" aria-labelledby="deletion-title">
          <div className="support-center-heading">
            <span>02</span>
            <div>
              <h2 id="deletion-title">Delete your pre-registration</h2>
              <p>
                To request the deletion of your Gubify pre-registration, send an
                email to <a href="mailto:privacy@gubify.com">privacy@gubify.com</a> from
                the same email address used for the pre-registration.
              </p>
            </div>
          </div>
          <div className="deletion-grid">
            <div>
              <h3>Include in your email</h3>
              <ul>
                <li>Subject: “Pre-registration deletion request”</li>
                <li>The email address used for registration</li>
                <li>First name, if provided</li>
                <li>A clear request to delete the pre-registration</li>
              </ul>
              <a
                className="legal-primary-link"
                href="mailto:privacy@gubify.com?subject=Pre-registration%20deletion%20request"
              >
                Start deletion request
              </a>
            </div>
            <div className="deletion-note">
              <h3>Verification and timing</h3>
              <p>
                To protect users, it may be necessary to verify that the request
                comes from the owner of the email address.
              </p>
              <p>
                Requests will be handled without undue delay and, where the GDPR
                applies, a response will normally be provided within one month.
                This period may be extended where permitted by law, for example
                in particularly complex cases.
              </p>
              <p>
                Once the request has been verified, the pre-registration data
                will be deleted unless retention is required by applicable law.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="withdraw-title">
          <div className="support-center-heading">
            <span>03</span>
            <div>
              <h2 id="withdraw-title">Withdraw consent</h2>
              <p>
                You can withdraw your consent by emailing{" "}
                <a href="mailto:privacy@gubify.com">privacy@gubify.com</a>.
                Withdrawal does not affect processing carried out before your request.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="rights-title">
          <div className="support-center-heading">
            <span>04</span>
            <div>
              <h2 id="rights-title">Other privacy rights</h2>
              <p>
                Read the <Link href="/privacy">Privacy Policy</Link> for details.
                The same privacy address may be used to request access,
                rectification, erasure, restriction, objection or portability,
                where applicable.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="after-title">
          <div className="support-center-heading">
            <span>05</span>
            <div>
              <h2 id="after-title">What happens after the request</h2>
              <p>A short, transparent process protects both your data and your request.</p>
            </div>
          </div>
          <ol className="request-steps">
            <li><span>1</span><strong>Request received</strong></li>
            <li><span>2</span><strong>Identity or email ownership verified if necessary</strong></li>
            <li><span>3</span><strong>Database record identified</strong></li>
            <li><span>4</span><strong>Deletion or other requested action performed</strong></li>
            <li><span>5</span><strong>Confirmation sent by email</strong></li>
          </ol>
        </section>
      </div>
      <LegalFooter />
    </main>
  );
}
