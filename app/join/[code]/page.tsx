import type { Metadata } from "next";
import Link from "next/link";
import LegalFooter from "../../legal-footer";
import { parseInviteCode } from "../../../lib/invite-code";
import JoinActions from "./join-actions";

export const metadata: Metadata = {
  title: "Private Gub invitation | Gubify",
  description: "Open a private Gub invitation in the Gubify app or get notified when Gubify is available.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = parseInviteCode(rawCode);

  return (
    <main className="join-page">
      <a className="skip-link" href="#join-main">Skip to content</a>
      <header className="legal-header join-header">
        <Link className="brand" href="/" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <Link href="/support">Need help?</Link>
      </header>

      <section className="join-shell" id="join-main">
        <div className="join-orb join-orb-one" aria-hidden="true" />
        <div className="join-orb join-orb-two" aria-hidden="true" />
        {code ? (
          <article className="join-card">
            <span className="join-icon" aria-hidden="true">G</span>
            <span className="eyebrow">Private invitation</span>
            <h1>You’ve been invited to join a private Gub</h1>
            <p>
              Open Gubify and enter the invitation code below. You will always
              review and confirm joining inside the app.
            </p>
            <JoinActions code={code} />
            <aside className="join-privacy-note">
              <strong>Your invitation stays private</strong>
              <span>This page does not display or verify details about the Gub.</span>
            </aside>
          </article>
        ) : (
          <article className="join-card join-invalid-card">
            <span className="join-icon join-invalid-icon" aria-hidden="true">!</span>
            <span className="eyebrow">Invitation unavailable</span>
            <h1>This invitation link can’t be used</h1>
            <p>
              Check the link you received or ask the person who shared it with
              you. No invitation details are available on this website.
            </p>
            <Link className="join-primary-action" href="/">Return to Gubify</Link>
          </article>
        )}
      </section>
      <LegalFooter />
    </main>
  );
}
