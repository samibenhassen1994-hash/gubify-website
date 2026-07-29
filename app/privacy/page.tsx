import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";

export const metadata: Metadata = {
  title: "Privacy Policy and Personal Data Processing Notice | Gubify",
  description:
    "Learn how Gubify processes personal data submitted through its website and pre-registration form.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy and Personal Data Processing Notice | Gubify",
    description:
      "Learn how Gubify processes personal data submitted through its website and pre-registration form.",
    url: "https://gubify.com/privacy",
    siteName: "Gubify",
    type: "website",
  },
};

const contents = [
  ["introduction", "Introduction"],
  ["controller", "Data controller"],
  ["data-collected", "Personal data collected"],
  ["purposes", "Purposes of processing"],
  ["legal-basis", "Legal basis"],
  ["security", "Processing methods and security"],
  ["retention", "Data retention"],
  ["providers", "Service providers and recipients"],
  ["turnstile", "Cloudflare Turnstile"],
  ["transfers", "International data transfers"],
  ["rights", "User rights"],
  ["deletion", "How to request deletion"],
  ["data-provision", "Nature of providing data"],
  ["marketing", "Marketing communications"],
  ["children", "Children"],
  ["changes", "Changes to the policy"],
  ["contacts", "Contacts"],
] as const;

function MailLink({ address }: { address: string }) {
  return <a href={`mailto:${address}`}>{address}</a>;
}

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <a className="skip-link" href="#privacy-main">Skip to content</a>
      <header className="legal-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <nav aria-label="Privacy page links">
          <Link href="/support">Support</Link>
          <Link className="legal-header-cta" href="/pre-register">Back to pre-registration</Link>
        </nav>
      </header>

      <section className="legal-hero" id="privacy-main">
        <span className="eyebrow">Privacy at Gubify</span>
        <h1>Privacy Policy and Personal Data Processing Notice</h1>
        <p>
          A clear explanation of what information Gubify collects through its
          website and pre-registration form, why it is used and what choices you have.
        </p>
        <div className="legal-meta">
          <span><strong>Last updated</strong> July 29, 2026</span>
          <span><strong>Policy version</strong> 2026-07-29</span>
        </div>
      </section>

      <div className="legal-layout">
        <aside className="legal-toc">
          <strong>On this page</strong>
          <nav aria-label="Privacy policy contents">
            {contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        </aside>

        <article className="legal-content">
          <section id="introduction">
            <h2>1. Introduction</h2>
            <p>
              Gubify is committed to protecting personal data. Information is
              processed according to the principles of lawfulness, fairness,
              transparency, data minimisation, accuracy, storage limitation,
              integrity and confidentiality.
            </p>
            <p>
              This notice applies to gubify.com and, in particular, to the
              Gubify pre-registration form.
            </p>
          </section>

          <section id="controller">
            <h2>2. Data controller</h2>
            <address>
              <strong>Sami Ben Hassen</strong><br />
              Palmi (RC), Italy<br />
              <MailLink address="privacy@gubify.com" />
            </address>
            <p>Gubify is currently managed as a personal initiative, not as a company.</p>
          </section>

          <section id="data-collected">
            <h2>3. Personal data collected</h2>
            <p>When you pre-register, Gubify may collect:</p>
            <ul>
              <li>email address;</li>
              <li>first name, when voluntarily provided;</li>
              <li>device preference;</li>
              <li>privacy consent, consent timestamp and accepted policy version;</li>
              <li>date and time of registration;</li>
              <li>UTM campaign parameters and landing page;</li>
              <li>security and technical information necessary to protect the form;</li>
              <li>data processed through Cloudflare Turnstile for anti-abuse purposes.</li>
            </ul>
            <p>Your first name is optional.</p>
          </section>

          <section id="purposes">
            <h2>4. Purposes of processing</h2>
            <p>Personal data may be processed to:</p>
            <ul>
              <li>record your pre-registration and send the launch notification;</li>
              <li>send information directly connected to the beta;</li>
              <li>manage possible early access;</li>
              <li>understand which platforms are most requested;</li>
              <li>protect the site from spam, bots, fraud and abuse;</li>
              <li>respond to data-subject requests;</li>
              <li>comply with applicable legal obligations.</li>
            </ul>
            <p>
              Personal data are not sold or disclosed to third parties for their
              independent advertising purposes. Technical providers may process
              data where necessary to provide the service. Data may also be
              disclosed where required by law.
            </p>
          </section>

          <section id="legal-basis">
            <h2>5. Legal basis</h2>
            <ul>
              <li>your consent for pre-registration and the launch notification;</li>
              <li>legitimate interests in security, fraud prevention and service protection;</li>
              <li>legal obligations, where applicable.</li>
            </ul>
          </section>

          <section id="security">
            <h2>6. Processing methods and security</h2>
            <p>
              Data are processed using electronic systems. Reasonable technical
              and organisational measures are used to reduce the risk of
              unauthorised access, loss, alteration or disclosure. No system can
              guarantee absolute security.
            </p>
          </section>

          <section id="retention">
            <h2>7. Data retention</h2>
            <p>
              Pre-registration data will be retained until the launch of Gubify
              and, after launch, for no longer than 12 months, unless the user
              withdraws consent or requests deletion earlier, or a longer
              retention period is required by law.
            </p>
            <p>When the relevant purpose ends, data will be deleted or anonymised.</p>
          </section>

          <section id="providers">
            <h2>8. Service providers and recipients</h2>
            <p>
              Gubify uses Cloudflare for hosting and delivery, Cloudflare Workers,
              Cloudflare D1, Cloudflare Turnstile, security and abuse prevention.
              Technical service providers may process personal data on behalf of
              the controller or according to the roles established by applicable
              data protection law.
            </p>
          </section>

          <section id="turnstile">
            <h2>9. Cloudflare Turnstile</h2>
            <p>
              Turnstile protects the pre-registration form from bots and abuse.
              Cloudflare may process technical information concerning the browser,
              device, network and interaction with the security check.
            </p>
          </section>

          <section id="transfers">
            <h2>10. International data transfers</h2>
            <p>
              Some providers may process data outside the European Economic Area.
              Where required, transfers must rely on an adequacy decision,
              standard contractual clauses or another mechanism provided by law.
            </p>
          </section>

          <section id="rights">
            <h2>11. User rights</h2>
            <p>Depending on applicable law, you may request:</p>
            <ul>
              <li>access, rectification or erasure;</li>
              <li>restriction of processing or objection;</li>
              <li>data portability, where applicable;</li>
              <li>withdrawal of consent;</li>
              <li>the right to complain to the competent supervisory authority.</li>
            </ul>
            <p>
              Withdrawal does not affect the lawfulness of processing carried out
              before it. To exercise your rights, email <MailLink address="privacy@gubify.com" />.
            </p>
          </section>

          <section className="legal-callout" id="deletion">
            <h2>12. How to request deletion</h2>
            <p>
              Follow the deletion instructions in the Gubify Support Center.
            </p>
            <Link href="/support#delete-pre-registration">Request pre-registration deletion</Link>
          </section>

          <section id="data-provision">
            <h2>13. Nature of providing data</h2>
            <p>
              Email, device preference, privacy consent and security verification
              are required to complete pre-registration. First name is optional.
              Refusing required data prevents pre-registration but does not prevent
              browsing the site.
            </p>
          </section>

          <section id="marketing">
            <h2>14. Marketing communications</h2>
            <p>
              Pre-registration does not automatically authorise generic
              promotional communications. Any further marketing would require
              separate, optional and revocable consent.
            </p>
          </section>

          <section id="children">
            <h2>15. Children</h2>
            <p>
              Gubify&apos;s pre-registration is not intentionally directed to
              children who cannot validly provide consent under the law
              applicable to them.
            </p>
          </section>

          <section id="changes">
            <h2>16. Changes to the policy</h2>
            <p>
              This policy may be updated. The current version will be published
              here with its new effective date and version number.
            </p>
          </section>

          <section id="contacts">
            <h2>17. Contacts</h2>
            <dl className="legal-contacts">
              <div><dt>Privacy</dt><dd><MailLink address="privacy@gubify.com" /></dd></div>
              <div><dt>Support</dt><dd><MailLink address="support@gubify.com" /></dd></div>
              <div><dt>Legal</dt><dd><MailLink address="legal@gubify.com" /></dd></div>
              <div><dt>General information</dt><dd><MailLink address="hello@gubify.com" /></dd></div>
              <div><dt>Beta</dt><dd><MailLink address="beta@gubify.com" /></dd></div>
            </dl>
          </section>

          <div className="legal-version">
            <p><strong>Last updated:</strong> July 29, 2026</p>
            <p><strong>Privacy policy version:</strong> 2026-07-29</p>
          </div>
        </article>
      </div>
      <LegalFooter />
    </main>
  );
}
