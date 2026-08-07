import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../legal-footer";

export const metadata: Metadata = {
  title: "Terms of Service | Gubify",
  description:
    "Terms governing use of the Gubify app, website, Gubs, Communities, beta, pre-registration and feedback services.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Gubify",
    description:
      "Terms governing use of the Gubify app, website, Gubs, Communities, beta, pre-registration and feedback services.",
    url: "https://gubify.com/terms",
    siteName: "Gubify",
    type: "website",
  },
};

const contents = [
  ["agreement", "Agreement and scope"],
  ["provider", "Service provider"],
  ["eligibility", "Eligibility and accounts"],
  ["service", "The Gubify service"],
  ["content", "Your content"],
  ["acceptable-use", "Acceptable use"],
  ["communities", "Gubs and Communities"],
  ["moderation", "Moderation and enforcement"],
  ["budget", "Shared Budget"],
  ["coordination", "Tasks, proposals and events"],
  ["beta", "Beta and pre-release services"],
  ["feedback", "Feedback"],
  ["intellectual-property", "Gubify intellectual property"],
  ["third-parties", "Third-party services"],
  ["availability", "Availability and changes"],
  ["suspension", "Suspension and termination"],
  ["disclaimers", "Disclaimers"],
  ["liability", "Limitation of liability"],
  ["indemnity", "Your responsibility"],
  ["privacy", "Privacy"],
  ["changes", "Changes to these Terms"],
  ["law", "Governing law and disputes"],
  ["general", "General terms"],
  ["contact", "Contact"],
] as const;

function MailLink({ address }: { address: string }) {
  return <a href={`mailto:${address}`}>{address}</a>;
}

export default function TermsPage() {
  return (
    <main className="legal-page">
      <a className="skip-link" href="#terms-main">Skip to content</a>

      <header className="legal-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <nav aria-label="Terms page links">
          <Link href="/support">Support</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </nav>
      </header>

      <section className="legal-hero" id="terms-main">
        <span className="eyebrow">Using Gubify</span>
        <h1>Terms of Service</h1>
        <p>
          These Terms govern your use of the Gubify app, website and related
          services. They also set the rules for content, Gubs, Communities and
          participation in the Gubify beta.
        </p>
        <div className="legal-meta">
          <span><strong>Last updated</strong> August 7, 2026</span>
          <span><strong>Terms version</strong> 2026-08-07.2</span>
        </div>
      </section>

      <div className="legal-layout">
        <aside className="legal-toc">
          <strong>On this page</strong>
          <nav aria-label="Terms of Service contents">
            {contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        </aside>

        <article className="legal-content">
          <section id="agreement">
            <h2>1. Agreement and scope</h2>
            <p>
              These Terms of Service (the <strong>Terms</strong>) apply when you
              access or use the Gubify mobile application, gubify.com and related
              pre-registration, beta, support and feedback services (together, the
              <strong> Service</strong>).
            </p>
            <p>
              By creating or using a Gubify identity, accepting these Terms in the
              app, or otherwise using a part of the Service that requires acceptance,
              you agree to these Terms. If you do not agree, do not use that part of
              the Service.
            </p>
            <p>
              These Terms are separate from the <Link href="/privacy">Privacy Policy</Link>,
              which explains how Gubify processes personal data.
            </p>
          </section>

          <section id="provider">
            <h2>2. Service provider</h2>
            <address>
              <strong>Gubify — operated by Sami Ben Hassen</strong><br />
              Palmi (RC), Italy<br />
              <MailLink address="legal@gubify.com" />
            </address>
            <p>
              Gubify is currently operated as a personal initiative rather than as
              an incorporated company. References in these Terms to “Gubify”, “we”,
              “us” or “our” mean the operator identified above.
            </p>
          </section>

          <section id="eligibility">
            <h2>3. Eligibility and accounts</h2>
            <p>
              You must be at least <strong>16 years old</strong> to create or use a
              Gubify account. Gubify is not intended for children under 16. If you
              are under the age of legal majority in your country, you may use
              Gubify only where permitted by applicable law and with any parental
              or guardian authorisation that may be required.
            </p>
            <p>
              By creating or using a Gubify account, you represent that you meet
              these age and legal-capacity requirements. Gubify may restrict or
              terminate access where it reasonably determines that these
              requirements are not met.
            </p>
            <p>
              You are responsible for the activity performed through your Gubify
              identity and for keeping access to your device and any linked account
              secure. Do not impersonate another person, create an identity for an
              unlawful purpose or attempt to access another user&apos;s identity.
            </p>
            <p>
              During early versions of the app, Gubify may use anonymous Firebase
              authentication to create a technical user identity. Additional account
              or sign-in methods may be introduced later and may be subject to
              additional notices or security steps.
            </p>
          </section>

          <section id="service">
            <h2>4. The Gubify service</h2>
            <p>
              Gubify is designed to help groups and communities communicate,
              organise activities and coordinate shared information. Depending on
              the version available to you, features may include private Gubs,
              Communities, chat, Board posts, tasks, calendar and organised events,
              proposals, voting, Shared Budget, profiles, invitations and in-app
              notifications.
            </p>
            <p>
              Gubify is operated from Italy and may be made available to users in
              multiple countries. Availability of the Service in a country does not
              mean that every feature is lawful or appropriate in every jurisdiction.
              You are responsible for using the Service in accordance with mandatory
              laws that apply to you. Gubify may limit or modify features in a
              particular country where reasonably necessary for legal, safety or
              operational reasons.
            </p>
            <p>
              Features may be added, changed, limited or removed as Gubify evolves.
              Availability can differ between beta versions, devices, locations and
              accounts.
            </p>
          </section>

          <section id="content">
            <h2>5. Your content</h2>
            <p>
              You retain ownership of the text, information and other original
              material that you create and submit to Gubify (<strong>User Content</strong>).
              You are responsible for ensuring that you have the rights and permissions
              necessary to submit that content.
            </p>
            <p>
              To operate the Service, you grant Gubify a non-exclusive, worldwide,
              royalty-free licence to host, store, reproduce, transmit, format and
              display your User Content only as reasonably necessary to provide,
              secure, maintain and improve the features you choose to use. This
              licence includes making content available to the users with whom you
              intentionally share it, such as members of a Gub or Community.
            </p>
            <p>
              This licence ends when the relevant content is deleted from the Service,
              except to the extent that temporary backups, security records, legal
              obligations or content already lawfully shared with another user require
              limited continued processing.
            </p>
            <p>
              Do not submit confidential, sensitive or personal information about
              another person unless you are authorised to share it and doing so is
              appropriate for the feature you are using.
            </p>
          </section>

          <section id="acceptable-use">
            <h2>6. Acceptable use and prohibited content</h2>
            <p>
              Gubify contains user-generated content. You must use the Service in a
              lawful and respectful way. You may not use Gubify to create, upload,
              share, organise, promote or facilitate content or conduct that:
            </p>
            <ul>
              <li>is illegal or encourages, facilitates or instructs illegal activity;</li>
              <li>threatens, harasses, bullies, stalks or deliberately humiliates another person;</li>
              <li>promotes hatred, violence or discrimination against protected persons or groups;</li>
              <li>sexually exploits or endangers children, or includes child sexual abuse material;</li>
              <li>is pornographic or is primarily intended to facilitate sexual exploitation or sexual services;</li>
              <li>promotes suicide, self-harm or dangerous behaviour in a harmful manner;</li>
              <li>fraudulently impersonates another person or materially deceives users;</li>
              <li>violates another person&apos;s privacy, confidentiality, publicity or intellectual-property rights;</li>
              <li>contains malware, malicious code, phishing, credential theft or attempts to compromise accounts or devices;</li>
              <li>constitutes spam, automated abuse, manipulation of engagement or unwanted repetitive solicitation;</li>
              <li>attempts to bypass permissions, security rules, rate limits, membership controls or other safeguards;</li>
              <li>uses Gubify to sell, obtain or coordinate goods or services that are unlawful or prohibited by applicable platform rules.</li>
            </ul>
            <p>
              Context matters. Gubify may consider purpose, severity, risk, applicable
              law and platform requirements when assessing content or behaviour.
            </p>
          </section>

          <section id="communities">
            <h2>7. Gubs and Communities</h2>
            <p>
              A private Gub is intended for its authorised members. A Community may
              expose limited public information for discovery while reserving member
              content for users who have joined according to the Community&apos;s access
              settings.
            </p>
            <p>
              Owners and authorised roles may have additional controls over membership,
              access, content or the lifecycle of a Gub or Community. Users must not
              misrepresent their role, circumvent access requirements or attempt to
              gain membership without authorisation.
            </p>
            <p>
              If you create or manage a Gub or Community, you are responsible for
              using administrative controls responsibly and for complying with these
              Terms when inviting, approving, managing or removing participants.
            </p>
          </section>

          <section id="moderation">
            <h2>8. Moderation, reports and enforcement</h2>
            <p>
              Gubify may review reports, investigate suspected abuse and take
              proportionate action to protect users, the Service and third parties.
              Depending on the circumstances, actions may include limiting access,
              removing or restricting content, revoking invitations, suspending a
              user or Community, preserving relevant records, or permanently
              terminating access.
            </p>
            <p>
              Users may report suspected violations through the reporting or support
              mechanisms made available by Gubify. Serious safety, child-protection,
              security or legal concerns may be escalated where reasonably necessary
              or required by law.
            </p>
            <p>
              Gubify does not guarantee that every item of User Content is reviewed
              before it becomes visible. The absence of immediate action does not
              mean that content or conduct is permitted under these Terms.
            </p>
          </section>

          <section className="legal-callout" id="budget">
            <h2>9. Shared Budget is not a payment service</h2>
            <p>
              Shared Budget is an organisational feature for recording and coordinating
              information about a group&apos;s shared expenses, targets or contributions.
              Gubify does not hold, receive, transfer, settle or safeguard money on
              behalf of users and is not a bank, payment institution, electronic-money
              service, escrow service or financial adviser.
            </p>
            <p>
              Amounts, balances, contribution records and similar information shown
              in Gubify are informational records entered or generated from user
              activity. Users remain responsible for verifying amounts and arranging
              any real-world payment independently.
            </p>
          </section>

          <section id="coordination">
            <h2>10. Tasks, proposals, votes and events</h2>
            <p>
              Tasks, assignments, proposals, votes, calendar entries and organised
              events are coordination tools. Unless the users involved separately
              create a legally binding agreement under applicable law, an action in
              Gubify does not by itself create an employment relationship, agency,
              partnership, fiduciary duty, financial obligation or other legal contract.
            </p>
            <p>
              Users are responsible for checking practical details, permissions,
              costs, safety requirements and real-world arrangements connected with
              activities organised through Gubify.
            </p>
          </section>

          <section id="beta">
            <h2>11. Beta and pre-release services</h2>
            <p>
              Beta or pre-release versions are provided for testing and may contain
              bugs, incomplete features, temporary limitations or changes that would
              not normally appear in a final release. Features, eligibility and beta
              capacity may change without guaranteeing continued access.
            </p>
            <p>
              During testing, Gubify may need to migrate, reset or remove test data
              where reasonably necessary for development, security or reliability.
              Where a planned reset is material to users, Gubify will provide notice
              when reasonably practicable.
            </p>
            <p>
              Pre-registration records interest in Gubify. It is not a purchase,
              reservation, guaranteed beta place, guaranteed release date or promise
              that a particular feature will be launched.
            </p>
          </section>

          <section id="feedback">
            <h2>12. Feedback</h2>
            <p>
              You may send bug reports, suggestions and other feedback to Gubify.
              You retain ownership of original material you submit. You grant Gubify
              permission to review, analyse, reproduce internally and use that feedback
              to evaluate, develop, secure or improve the Service.
            </p>
            <p>
              Feedback does not create a right to compensation, attribution,
              exclusivity, implementation or an individual response.
            </p>
          </section>

          <section id="intellectual-property">
            <h2>13. Gubify intellectual property</h2>
            <p>
              Gubify and its licensors retain all rights in the Gubify name, logos,
              branding, software, interface, original artwork, website design and
              other materials supplied by Gubify, excluding User Content.
            </p>
            <p>
              Subject to these Terms, Gubify gives you a limited, personal,
              revocable, non-exclusive and non-transferable right to use the Service
              for its intended purpose. You may not copy, sell, sublicense, reverse
              engineer, scrape, exploit or create unauthorised derivative services
              from Gubify except where applicable law expressly permits it.
            </p>
          </section>

          <section id="third-parties">
            <h2>14. Third-party services</h2>
            <p>
              Gubify relies on third-party infrastructure and platform services,
              including services provided by Google Firebase and Cloudflare. Your
              device, app store, operating system or other third-party services may
              also apply their own terms and privacy rules.
            </p>
            <p>
              Gubify is not responsible for a third party&apos;s independent products,
              content or conduct. Nothing in these Terms limits any rights you have
              directly against a third party under applicable law.
            </p>
          </section>

          <section id="availability">
            <h2>15. Availability, maintenance and changes</h2>
            <p>
              Gubify aims to provide a useful and reliable service but does not
              guarantee uninterrupted, error-free or permanent availability. The
              Service may be unavailable because of maintenance, testing, security
              incidents, provider outages, network conditions or circumstances
              outside reasonable control.
            </p>
            <p>
              Gubify may modify, improve, replace or discontinue features where
              reasonably necessary. Where a material change significantly affects
              an established user feature, reasonable notice will be provided when
              appropriate and practicable.
            </p>
          </section>

          <section id="suspension">
            <h2>16. Suspension, termination and deletion</h2>
            <p>
              You may stop using Gubify at any time. Where deletion controls are
              available, you may use them to remove eligible content, Gubs or account
              data. You may also make a privacy or deletion request as described in
              the <Link href="/privacy">Privacy Policy</Link>.
            </p>
            <p>
              Gubify may restrict, suspend or terminate access where reasonably
              necessary because of a serious or repeated breach of these Terms,
              illegal activity, security risk, abuse, harm to other users, legal
              requirements or actions necessary to protect the Service.
            </p>
            <p>
              Where appropriate and legally required, Gubify will provide reasons or
              an opportunity to contact support. Immediate action may be taken where
              delay would create a material safety, security or legal risk.
            </p>
          </section>

          <section id="disclaimers">
            <h2>17. Disclaimers</h2>
            <p>
              Gubify is provided on an “as available” basis. To the extent permitted
              by applicable law, Gubify does not promise that every feature will be
              uninterrupted, free of defects, suitable for every purpose or preserved
              indefinitely.
            </p>
            <p>
              User Content is created by users, not by Gubify. Gubify does not endorse
              or guarantee the accuracy, legality, reliability or completeness of User
              Content, proposals, votes, task details, events, Community information
              or Shared Budget records.
            </p>
            <p>
              Nothing in these Terms excludes statutory guarantees, consumer rights
              or other protections that cannot lawfully be excluded or waived.
            </p>
          </section>

          <section id="liability">
            <h2>18. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Gubify is not liable
              for indirect, incidental or consequential losses that were not reasonably
              foreseeable when you agreed to these Terms, or for losses caused solely
              by another user, a third-party service, your device or circumstances
              outside Gubify&apos;s reasonable control.
            </p>
            <p>
              Nothing in these Terms limits or excludes liability for fraud, wilful
              misconduct, gross negligence, death or personal injury where caused by
              negligence, or any other liability that applicable law does not permit
              to be limited or excluded.
            </p>
          </section>

          <section id="indemnity">
            <h2>19. Your responsibility</h2>
            <p>
              You are responsible for your own User Content and conduct. If your use
              of Gubify unlawfully infringes another person&apos;s rights or causes a
              claim through your intentional or unlawful conduct, you remain responsible
              to the extent provided by applicable law.
            </p>
            <p>
              This section does not require consumers to waive rights or accept
              liability beyond what applicable law allows.
            </p>
          </section>

          <section id="privacy">
            <h2>20. Privacy</h2>
            <p>
              Gubify&apos;s <Link href="/privacy">Privacy Policy</Link> explains what
              personal data are processed, the purposes and legal bases for processing,
              service providers, retention, deletion and privacy rights. The Privacy
              Policy forms an important part of the information provided to you when
              using Gubify but is separate from these Terms.
            </p>
          </section>

          <section id="changes">
            <h2>21. Changes to these Terms</h2>
            <p>
              Gubify may update these Terms as the Service, legal requirements or
              safety needs change. The current version and effective update date will
              be published on this page.
            </p>
            <p>
              If a change materially affects existing users, Gubify will provide
              additional notice or request renewed acceptance where reasonably
              appropriate or required by law. Continued use after a non-material
              update takes effect means the updated Terms apply to subsequent use.
            </p>
          </section>

          <section id="law">
            <h2>22. Governing law and disputes</h2>
            <p>
              Gubify is operated from Italy. These Terms are governed by Italian law,
              to the extent that such a choice is permitted. This choice of law does
              not deprive you of any mandatory consumer, contract, digital-service or
              other protection that you are entitled to under laws that cannot be
              excluded by agreement, including mandatory protections that may apply
              in the country where you habitually reside.
            </p>
            <p>
              If you use Gubify as a consumer, any mandatory rules that give you the
              right to bring or defend proceedings before the courts of your country
              of residence remain unaffected. For disputes not governed by mandatory
              jurisdiction rules, the competent courts will be determined in
              accordance with applicable Italian and international private-law rules.
            </p>
            <p>
              Before starting formal proceedings, you are encouraged to contact
              <MailLink address="legal@gubify.com" /> so that the issue can be
              understood and, where possible, resolved informally. This does not
              restrict any right to contact a competent authority, regulator,
              alternative dispute-resolution body or court where applicable.
            </p>
          </section>

          <section id="general">
            <h2>23. General terms</h2>
            <p>
              If a provision of these Terms is found unenforceable, the remaining
              provisions continue to apply to the extent permitted by law. A failure
              to enforce a provision immediately does not waive the right to enforce
              it later.
            </p>
            <p>
              You may not transfer rights or obligations under these Terms in a way
              that would prejudice Gubify or other users without permission. Gubify
              may transfer operation of the Service and these Terms as part of a
              legitimate reorganisation, incorporation or transfer of the Gubify
              project, provided that users&apos; mandatory rights are preserved and any
              required notice is given.
            </p>
          </section>

          <section id="contact">
            <h2>24. Contact</h2>
            <dl className="legal-contacts">
              <div><dt>Legal</dt><dd><MailLink address="legal@gubify.com" /></dd></div>
              <div><dt>Support</dt><dd><MailLink address="support@gubify.com" /></dd></div>
              <div><dt>Privacy</dt><dd><MailLink address="privacy@gubify.com" /></dd></div>
              <div><dt>General information</dt><dd><MailLink address="hello@gubify.com" /></dd></div>
              <div><dt>Beta</dt><dd><MailLink address="beta@gubify.com" /></dd></div>
            </dl>
          </section>

          <div className="legal-version">
            <p><strong>Last updated:</strong> August 7, 2026</p>
            <p><strong>Terms version:</strong> 2026-08-07.2</p>
          </div>
        </article>
      </div>

      <LegalFooter />
    </main>
  );
}
