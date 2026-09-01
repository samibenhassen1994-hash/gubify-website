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
        <section aria-labelledby="support-options-title">
          <div className="support-center-heading"><span>01</span><div><h2 id="support-options-title">How can we help?</h2><p>Choose the fastest route for your question, report or request.</p></div></div>
          <div className="support-option-grid">
            <a href="#faq"><strong>FAQ</strong><span>Answers about launch, beta and privacy</span></a>
            <Link href="/feedback?type=bug"><strong>Report a Bug</strong><span>Tell us about a technical problem</span></Link>
            <Link href="/feedback?type=feature"><strong>Suggest a Feature</strong><span>Share an idea for Gubify</span></Link>
            <a href="#contact-title"><strong>Contact Us</strong><span>Find the right email address</span></a>
            <Link href="/privacy"><strong>Privacy Policy</strong><span>How Gubify handles information</span></Link>
            <Link href="/terms"><strong>Terms of Service</strong><span>Rules for using this website</span></Link>
            <a href="#delete-pre-registration"><strong>Delete data or account</strong><span>Delete a pre-registration or request account deletion</span></a>
          </div>
        </section>
        <section aria-labelledby="contact-title">
          <div className="support-center-heading">
            <span>02</span>
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
            <span>03</span>
            <div>
              <h2 id="deletion-title">Delete your pre-registration or request account deletion</h2>
              <p>
                Choose the option that matches what you want to remove from Gubify.
              </p>
            </div>
          </div>
          <div className="deletion-grid">
            <div>
              <h3>Delete your pre-registration</h3>
              <p>
                If you only joined the Gubify pre-registration list, you can ask us
                to remove that record without affecting any separate app account.
              </p>
              <ul>
                <li>Use the same email address used for pre-registration</li>
                <li>Include your first name if you provided one</li>
                <li>Clearly ask us to delete your pre-registration</li>
              </ul>
              <a
                className="legal-primary-link"
                href="mailto:privacy@gubify.com?subject=Pre-registration%20deletion%20request"
              >
                Delete pre-registration
              </a>
            </div>
            <div>
              <h3>Delete your Gubify account</h3>
              <p>
                If you have a Gubify app account, use the account-deletion request
                page when you cannot complete deletion directly from the app or need
                help with the process.
              </p>
              <ul>
                <li>Submit the email we can use to contact you</li>
                <li>Provide your Gubify display name if available</li>
                <li>We verify ownership before deleting account data</li>
              </ul>
              <Link className="legal-primary-link" href="/delete-account">
                Request account deletion
              </Link>
            </div>
          </div>
          <div className="deletion-note">
            <h3>Verification and timing</h3>
            <p>
              To protect users, Gubify may need to verify that a deletion request
              comes from the person connected to the relevant account or email.
            </p>
            <p>
              Requests will be handled without undue delay and, where the GDPR
              applies, a response will normally be provided within one month. This
              period may be extended where permitted by law, for example in
              particularly complex cases.
            </p>
            <p>
              Once a request has been verified, the relevant data will be deleted
              unless limited retention is required by applicable law, security,
              fraud-prevention or dispute-related needs.
            </p>
          </div>
        </section>

        <section aria-labelledby="withdraw-title">
          <div className="support-center-heading">
            <span>04</span>
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
            <span>05</span>
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
            <span>06</span>
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
        <section id="faq" aria-labelledby="faq-title">
          <div className="support-center-heading"><span>07</span><div><h2 id="faq-title">Frequently asked questions</h2><p>Clear answers without unconfirmed launch promises.</p></div></div>
          <div className="support-faq">
            <details><summary>When will Gubify be available?</summary><p>A confirmed public release date has not been announced. Pre-registered users will receive the relevant launch notification.</p></details>
            <details><summary>How does pre-registration work?</summary><p>You provide an email, device preference and consent. Gubify uses them to manage pre-registration and send the launch notification.</p></details>
            <details><summary>How can I report a bug?</summary><p>Use the <Link href="/feedback?type=bug">bug report form</Link> and include clear steps when possible.</p></details>
            <details><summary>How can I suggest a feature?</summary><p>Use the <Link href="/feedback?type=feature">feature suggestion form</Link> and explain the problem your idea would solve.</p></details>
            <details><summary>How do I delete my pre-registration?</summary><p>Follow the <a href="#delete-pre-registration">deletion options</a> on this page.</p></details>
            <details><summary>How do I request deletion of my Gubify account?</summary><p>Use the <Link href="/delete-account">account deletion request page</Link> or delete the account directly from the app when you still have access.</p></details>
            <details><summary>Which devices will support Gubify?</summary><p>Platform availability will be confirmed as development and beta testing progress. The pre-registration survey helps prioritise platforms.</p></details>
            <details><summary>Will my feedback be public?</summary><p>No public feedback directory is provided. Reports are used internally to review issues and product ideas.</p></details>
            <details><summary>How can I contact Gubify?</summary><p>Use the contact addresses above, choosing the one that best matches your request.</p></details>
          </div>
        </section>
      </div>
      <LegalFooter />
    </main>
  );
}
