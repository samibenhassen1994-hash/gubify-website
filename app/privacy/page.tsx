import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Gubify",
  description:
    "Learn how Gubify processes personal data when you use the Gubify app, website, pre-registration and feedback services.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Gubify",
    description:
      "Learn how Gubify processes personal data when you use the Gubify app, website, pre-registration and feedback services.",
    url: "https://gubify.com/privacy",
    siteName: "Gubify",
    type: "website",
  },
};

const contents = [
  ["scope", "Scope and introduction"],
  ["controller", "Data controller"],
  ["app-data", "Data processed in the Gubify app"],
  ["content-visibility", "Who can see app content"],
  ["website-data", "Website and pre-registration data"],
  ["feedback", "Feedback and diagnostic data"],
  ["technical-data", "Technical and security data"],
  ["purposes", "Purposes of processing"],
  ["legal-basis", "Legal bases"],
  ["providers", "Service providers and recipients"],
  ["transfers", "International data transfers"],
  ["security", "Data security"],
  ["retention", "Data retention"],
  ["deletion", "Deletion and account requests"],
  ["rights", "Your privacy rights"],
  ["marketing", "Marketing and advertising"],
  ["automated", "Automated decision-making"],
  ["children", "Children"],
  ["changes", "Changes to this policy"],
  ["contacts", "Contact us"],
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
          <Link href="/terms">Terms of Service</Link>
        </nav>
      </header>

      <section className="legal-hero" id="privacy-main">
        <span className="eyebrow">Privacy at Gubify</span>
        <h1>Privacy Policy</h1>
        <p>
          This policy explains what personal data Gubify processes when you use
          the Gubify app, website, pre-registration and feedback services, why
          those data are used, who may receive them and what choices you have.
        </p>
        <div className="legal-meta">
          <span><strong>Last updated</strong> August 7, 2026</span>
          <span><strong>Policy version</strong> 2026-08-07.2</span>
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
          <section id="scope">
            <h2>1. Scope and introduction</h2>
            <p>
              Gubify is a collaboration and community app designed to help people
              communicate, organise activities and coordinate shared information
              inside private Gubs and Communities. This Privacy Policy applies to
              the Gubify mobile application, gubify.com and the related
              pre-registration, support and feedback services operated by Gubify.
            </p>
            <p>
              Gubify is operated from Italy. The EU General Data Protection
              Regulation (GDPR) and applicable Italian data-protection law therefore
              provide the principal framework for the processing described in this
              policy. Where the law of another country also applies to particular
              users or processing and grants mandatory additional or different
              protections, Gubify will respect those protections to the extent
              required by applicable law.
            </p>
            <p>
              Personal data are processed according to applicable data-protection
              law and the principles of lawfulness, fairness, transparency, data
              minimisation, accuracy, storage limitation, integrity and
              confidentiality.
            </p>
          </section>

          <section id="controller">
            <h2>2. Data controller</h2>
            <address>
              <strong>Sami Ben Hassen</strong><br />
              Palmi (RC), Italy<br />
              <MailLink address="privacy@gubify.com" />
            </address>
            <p>
              Gubify is currently managed as a personal initiative and not as a
              company. The person identified above is the data controller for the
              processing described in this policy, except where a service provider
              acts as an independent controller under its own terms and applicable law.
            </p>
          </section>

          <section id="app-data">
            <h2>3. Data processed in the Gubify app</h2>
            <p>
              The exact data processed depend on the features you use. The current
              version of the Gubify app may process the following categories.
            </p>

            <h3>3.1 Account and profile data</h3>
            <ul>
              <li>a Firebase Authentication user identifier;</li>
              <li>your chosen display name;</li>
              <li>account creation and update timestamps;</li>
              <li>profile information you choose to provide when a related feature is available.</li>
            </ul>
            <p>
              At the date of this policy, the app initially authenticates users
              through Firebase anonymous authentication. Gubify does not currently
              require a phone number or password to create this initial app identity.
            </p>

            <h3>3.2 Gub and Community information</h3>
            <ul>
              <li>Gub and Community names, identifiers, descriptions and settings;</li>
              <li>membership, role and ownership information;</li>
              <li>join requests, invitation information and membership actions;</li>
              <li>Community type, language, access mode and member count;</li>
              <li>creation, update and other service timestamps.</li>
            </ul>

            <h3>3.3 Content and activity you create</h3>
            <p>Depending on the features you use, Gubify may store:</p>
            <ul>
              <li>chat messages and message-related metadata;</li>
              <li>Board posts;</li>
              <li>tasks, assignments, status changes and completion information;</li>
              <li>calendar entries and organised events;</li>
              <li>proposals, votes and proposal status;</li>
              <li>Shared Budget information and member contribution information;</li>
              <li>in-app notifications and read/unread state;</li>
              <li>activity necessary to display your profile and participation inside a Gub.</li>
            </ul>
            <p>
              Please do not include unnecessary sensitive personal data in messages,
              posts, tasks, events, proposals, budget descriptions or other free-text
              fields. Content you choose to submit is processed so that the relevant
              Gub or Community feature can work.
            </p>
          </section>

          <section id="content-visibility">
            <h2>4. Who can see app content</h2>
            <p>
              Gubify is a shared service. Some information you provide is therefore
              intentionally visible to other users as part of the feature you choose
              to use.
            </p>
            <ul>
              <li>
                Content inside a private Gub is intended to be available only to
                users who are authorised members of that Gub, subject to their role
                and the permissions of the relevant feature.
              </li>
              <li>
                Public Community information, such as its name, description, type,
                language, access mode and member count, may be discoverable by other
                Gubify users through Community discovery features.
              </li>
              <li>
                Community chat content is intended for Community members according
                to the access rules applied by Gubify.
              </li>
              <li>
                Your display name and participation information may be shown to
                users who share a relevant Gub or Community with you.
              </li>
            </ul>
            <p>
              Users should only share content with a Gub or Community when they are
              comfortable making that content available to the relevant members.
            </p>
          </section>

          <section id="website-data">
            <h2>5. Website and pre-registration data</h2>
            <p>When you pre-register for Gubify, the website may collect:</p>
            <ul>
              <li>email address;</li>
              <li>first name, when voluntarily provided;</li>
              <li>device or platform interest;</li>
              <li>privacy consent, consent timestamp and accepted policy version;</li>
              <li>date and time of registration;</li>
              <li>UTM campaign parameters and landing page;</li>
              <li>security information necessary to protect the form from abuse.</li>
            </ul>
            <p>
              Your first name is optional. The other information identified as
              required by the pre-registration form is necessary to complete that
              pre-registration.
            </p>
          </section>

          <section id="feedback">
            <h2>6. Feedback and diagnostic data</h2>
            <p>
              When you submit a bug report or feature suggestion, Gubify processes
              the information you provide in that submission. Depending on the
              report, this can include a title, description, reproduction steps,
              expected behaviour, usefulness information and an optional contact email.
            </p>
            <p>
              The feedback system may also process limited technical context useful
              for diagnosis, such as app version, platform, operating system, device
              model when available, browser name and version, language, timezone,
              viewport size, page URL, source page, report origin and site build identifier.
            </p>
            <p>
              A contact email supplied with feedback is used only where needed to
              clarify or follow up on that submission. Sending feedback does not
              automatically subscribe you to marketing or pre-registration.
            </p>
          </section>

          <section id="technical-data">
            <h2>7. Technical and security data</h2>
            <p>
              Gubify and its infrastructure providers may process limited technical
              information needed to deliver, secure and maintain the service. This
              may include network, request, device, browser, authentication, security
              and anti-abuse information generated when the service is used.
            </p>
            <p>
              The website uses Cloudflare Turnstile to protect forms from automated
              abuse. Cloudflare may process technical information concerning the
              browser, device, network and interaction with the security check.
            </p>
            <p>
              At the date of this policy, the Gubify app does not use third-party
              advertising SDKs or behavioural advertising trackers.
            </p>
          </section>

          <section id="purposes">
            <h2>8. Purposes of processing</h2>
            <p>Gubify processes personal data where necessary to:</p>
            <ul>
              <li>create and maintain your app identity and profile;</li>
              <li>provide private Gubs, Communities and their membership systems;</li>
              <li>deliver chat, tasks, events, proposals, Shared Budget, Board and notification features;</li>
              <li>display content to the users with whom it is intentionally shared;</li>
              <li>process invitations, join requests, ownership and membership actions;</li>
              <li>maintain read state and other feature state necessary for the app to work;</li>
              <li>record pre-registration and send communications directly connected to beta access or launch;</li>
              <li>receive, investigate and respond to feedback, support and bug reports;</li>
              <li>protect users and the service from spam, fraud, misuse, unauthorised access and other abuse;</li>
              <li>maintain, debug and improve reliability and security;</li>
              <li>respond to privacy requests and comply with applicable legal obligations.</li>
            </ul>
            <p>
              Gubify does not sell personal data and does not disclose personal data
              to third parties for their independent behavioural advertising purposes.
            </p>
          </section>

          <section id="legal-basis">
            <h2>9. Legal bases</h2>
            <p>
              Where the General Data Protection Regulation (GDPR) applies, Gubify
              relies on one or more of the following legal bases, depending on the
              processing activity. Other privacy laws may use different legal
              concepts or requirements; where such laws apply, Gubify will process
              personal data on the basis required by those laws.
            </p>
            <ul>
              <li>
                <strong>performance of a contract or steps requested by you</strong>,
                where processing is necessary to provide app features or a service
                you choose to use;
              </li>
              <li>
                <strong>consent</strong>, where Gubify specifically asks for it,
                including the current pre-registration launch communication;
              </li>
              <li>
                <strong>legitimate interests</strong>, including service security,
                fraud and abuse prevention, troubleshooting, support and responsible
                product improvement, where those interests are not overridden by
                your rights and freedoms;
              </li>
              <li><strong>legal obligations</strong>, where processing is required by law.</li>
            </ul>
            <p>
              Where processing is based on consent, you may withdraw that consent
              at any time. Withdrawal does not affect processing that was lawful
              before consent was withdrawn.
            </p>
          </section>

          <section id="providers">
            <h2>10. Service providers and recipients</h2>
            <p>
              Gubify uses carefully selected infrastructure providers to operate the
              service. They may process personal data only to the extent necessary
              to provide their services, subject to their applicable terms and data
              protection obligations.
            </p>
            <ul>
              <li>
                <strong>Google Firebase</strong> — Firebase Authentication is used
                for app authentication and Cloud Firestore is used to store and
                synchronise app data.
              </li>
              <li>
                <strong>Cloudflare</strong> — used for website hosting and delivery,
                Cloudflare Workers, Cloudflare D1, Cloudflare Turnstile, security
                and abuse prevention.
              </li>
            </ul>
            <p>
              Personal data may also be disclosed where reasonably necessary to
              comply with law, enforce legal rights, protect users or the service,
              or respond to a valid request from a competent authority.
            </p>
          </section>

          <section id="transfers">
            <h2>11. International data transfers</h2>
            <p>
              Gubify is available internationally and some service providers operate
              distributed infrastructure outside the European Economic Area (EEA).
              In particular, Firebase Authentication may process data in the United
              States, while other Firebase and Cloudflare services may use global
              infrastructure. As a result, personal data may be processed in
              countries other than the country where you live.
            </p>
            <p>
              Where personal data are transferred from the EEA or from another
              jurisdiction that restricts international transfers, Gubify and its
              service providers must use a transfer mechanism or safeguard required
              by applicable law. Depending on the circumstances, this may include an
              adequacy decision, standard contractual clauses or another legally
              recognised safeguard.
            </p>
            <p>
              Laws in the destination country may differ from those in your country.
              This does not remove any transfer protections that applicable law
              requires Gubify to provide.
            </p>
          </section>

          <section id="security">
            <h2>12. Data security</h2>
            <p>
              Gubify uses technical and organisational measures designed to reduce
              the risk of unauthorised access, alteration, loss or disclosure. The
              current app uses Firebase Authentication together with Firestore
              Security Rules intended to restrict access according to authentication,
              membership and role.
            </p>
            <p>
              Infrastructure providers also apply their own security controls. No
              internet-connected service can guarantee absolute security, and users
              should avoid submitting information that is not necessary for the
              feature they are using.
            </p>
          </section>

          <section id="retention">
            <h2>13. Data retention</h2>
            <p>Different categories of data are retained for different periods:</p>
            <ul>
              <li>
                <strong>App account, profile and feature data</strong> are retained
                for as long as needed to provide the relevant service or feature,
                until they are deleted through an available deletion function or a
                valid deletion request, unless a longer period is required for legal,
                security or dispute-related reasons.
              </li>
              <li>
                <strong>Content shared with other users</strong> may remain available
                to the relevant Gub or Community until it, the relevant container or
                the associated account is deleted in accordance with the available
                product controls and applicable law.
              </li>
              <li>
                <strong>Pre-registration data</strong> are retained until launch and,
                after launch, ordinarily for no longer than 12 months, unless consent
                is withdrawn or deletion is requested earlier, or longer retention is
                required by law.
              </li>
              <li>
                <strong>Feedback reports and related diagnostic data</strong> are
                ordinarily retained for no longer than 24 months, unless longer
                retention is reasonably necessary for security, legal or dispute-related reasons.
              </li>
            </ul>
            <p>
              When data are no longer needed for a legitimate purpose, Gubify will
              delete or anonymise them where reasonably possible and legally appropriate.
            </p>
          </section>

          <section className="legal-callout" id="deletion">
            <h2>14. Deletion and account requests</h2>
            <p>
              You may request deletion of personal data associated with you by
              contacting <MailLink address="privacy@gubify.com" />. Gubify may need
              to verify that the request relates to you before acting on it.
            </p>
            <p>
              Pre-registration deletion is also available through the Gubify Support
              Center. Account-deletion controls will be made available for app
              accounts when account-based beta access is enabled.
            </p>
            <Link href="/support">Open the Gubify Support Center</Link>
          </section>

          <section id="rights">
            <h2>15. Your privacy rights</h2>
            <p>
              Your privacy rights depend on the law that applies to you and the
              circumstances of the processing. Under the GDPR, these may include the
              right to request:
            </p>
            <ul>
              <li>access to personal data concerning you;</li>
              <li>rectification of inaccurate or incomplete data;</li>
              <li>erasure of personal data;</li>
              <li>restriction of processing;</li>
              <li>data portability, where applicable;</li>
              <li>objection to processing based on legitimate interests;</li>
              <li>withdrawal of consent where processing relies on consent.</li>
            </ul>
            <p>
              If a privacy law outside the EEA applies to you and gives you additional
              mandatory rights — for example rights concerning access, correction,
              deletion, appeals or choices about certain uses or disclosures of
              personal data — those rights remain available to you to the extent
              required by that law. Gubify does not ask you to waive mandatory privacy
              rights through this policy or the Terms of Service.
            </p>
            <p>
              You may also have the right to lodge a complaint with the competent
              privacy or data-protection authority in your country. In Italy, the
              competent supervisory authority is the Garante per la protezione dei
              dati personali.
            </p>
            <p>
              To exercise a privacy right, contact <MailLink address="privacy@gubify.com" />.
              Gubify may need to verify your identity before completing a request and
              will respond within the period required by the law that applies.
            </p>
          </section>

          <section id="marketing">
            <h2>16. Marketing and advertising</h2>
            <p>
              Pre-registration is used for communications directly connected to
              Gubify beta access or launch as described when you register. It does
              not automatically authorise unrelated marketing communications.
            </p>
            <p>
              At the date of this policy, Gubify does not sell personal data and the
              app does not use third-party behavioural advertising SDKs. If Gubify
              introduces optional marketing or materially different advertising
              practices in the future, this policy and any required choices will be updated first.
            </p>
          </section>

          <section id="automated">
            <h2>17. Automated decision-making</h2>
            <p>
              Gubify does not currently use personal data to make decisions based
              solely on automated processing that produce legal effects or similarly
              significant effects concerning users.
            </p>
          </section>

          <section id="children">
            <h2>18. Children</h2>
            <p>
              Gubify is not intended for children under <strong>16 years old</strong>.
              A person must be at least 16 to create or use a Gubify account. If a
              user is 16 or older but is still below the age of legal majority in
              their country, use of Gubify is permitted only where applicable law
              allows it and with any parental or guardian authorisation that may be
              required.
            </p>
            <p>
              Gubify does not intentionally seek to collect personal data from
              children under 16. If Gubify learns that an account belongs to a person
              under 16, it may restrict or delete the account and associated personal
              data as appropriate, subject to legal retention obligations and the
              rights of affected persons.
            </p>
            <p>
              If you believe personal data relating to a child under 16 have been
              processed through Gubify, contact <MailLink address="privacy@gubify.com" />.
            </p>
          </section>

          <section id="changes">
            <h2>19. Changes to this policy</h2>
            <p>
              Gubify may update this Privacy Policy as the app, website or legal
              requirements change. The current version will be published on this
              page with an updated date and version number. Where a change materially
              affects users, Gubify will provide additional notice where required.
            </p>
          </section>

          <section id="contacts">
            <h2>20. Contact us</h2>
            <dl className="legal-contacts">
              <div><dt>Privacy</dt><dd><MailLink address="privacy@gubify.com" /></dd></div>
              <div><dt>Support</dt><dd><MailLink address="support@gubify.com" /></dd></div>
              <div><dt>Legal</dt><dd><MailLink address="legal@gubify.com" /></dd></div>
              <div><dt>General information</dt><dd><MailLink address="hello@gubify.com" /></dd></div>
              <div><dt>Beta</dt><dd><MailLink address="beta@gubify.com" /></dd></div>
            </dl>
          </section>

          <div className="legal-version">
            <p><strong>Last updated:</strong> August 7, 2026</p>
            <p><strong>Privacy policy version:</strong> 2026-08-07.2</p>
          </div>
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}
