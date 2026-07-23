import type { Metadata } from "next";
import Link from "next/link";

const goFundMeUrl = "https://gofund.me/8faaabb1c";

export const metadata: Metadata = {
  title: "Support Gubify — Help an independent app reach launch",
  description:
    "See how voluntary contributions help cover Gubify's infrastructure, development, publishing, testing and maintenance costs.",
  alternates: {
    canonical: "/support",
  },
};

const expenses = [
  {
    icon: "☁",
    title: "Servers & cloud services",
    text: "Secure infrastructure is needed to keep chats, group actions and notifications available as Gubify grows.",
    className: "cloud",
  },
  {
    icon: "⌘",
    title: "Development tools",
    text: "Essential software and services help one independent developer build, monitor and improve the app.",
    className: "tools",
  },
  {
    icon: "▷",
    title: "Store publishing",
    text: "Contributions help cover the fees and preparation required to publish Gubify on Google Play and the App Store.",
    className: "stores",
  },
  {
    icon: "✓",
    title: "Testing & maintenance",
    text: "Different devices, bug fixes, security work and future updates all matter after the first release.",
    className: "testing",
  },
] as const;

function GoFundMeButton({ label }: { label: string }) {
  return (
    <a className="donate-button" href={goFundMeUrl} target="_blank" rel="noreferrer">
      <span className="donate-heart" aria-hidden="true">♥</span>
      {label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

export default function SupportPage() {
  return (
    <main className="support-page">
      <a className="skip-link" href="#support-main">Skip to content</a>

      <header className="support-header">
        <Link className="brand" href="/" aria-label="Back to Gubify home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <Link className="back-home" href="/">← Back to the website</Link>
      </header>

      <section className="support-hero" id="support-main">
        <div className="support-hero-copy">
          <span className="support-kicker"><i aria-hidden="true">♥</i> Built independently, supported together</span>
          <h1>Help turn Gubify into an app that makes everyday life easier.</h1>
          <p>
            Hi! I&apos;m an independent developer building Gubify in my free time,
            alongside my everyday work. I believe the conversations families,
            friends, roommates, couples and teams already have can become clear,
            useful actions — without losing the simplicity of a group chat.
          </p>
          <div className="support-hero-actions">
            <GoFundMeButton label="Support Gubify on GoFundMe" />
            <a className="see-transparency" href="#transparency">See our transparency promise ↓</a>
          </div>
          <span className="voluntary-note">Every contribution is voluntary. Every amount helps, no matter the size.</span>
        </div>

        <div className="support-hero-visual" aria-label="A Gubify chat request becoming an assigned task">
          <span className="visual-caption">From conversation to action</span>
          <div className="support-chat-card">
            <div className="support-chat-head"><i>G</i><span><strong>Apartment Crew</strong><small>4 members</small></span></div>
            <div className="support-mini-message"><b>Maya</b><span>We&apos;re out of coffee. Josh, can you buy it today?</span></div>
            <div className="support-hold-tag">Hold to convert <b>☝</b></div>
          </div>
          <span className="visual-arrow" aria-hidden="true">↓</span>
          <div className="support-task-card">
            <span className="task-check">✓</span>
            <span className="task-badge">Task created</span>
            <strong>Buy coffee</strong>
            <p>Assigned to <b>Josh</b> · Today</p>
          </div>
          <div className="support-visual-orb support-visual-orb-one" aria-hidden="true" />
          <div className="support-visual-orb support-visual-orb-two" aria-hidden="true" />
        </div>
      </section>

      <section className="support-story support-section">
        <div className="support-section-heading">
          <span>Why this project matters</span>
          <h2>Group chats are full of good intentions. Gubify helps make them real.</h2>
          <p>
            Plans get buried, responsibilities stay unclear and simple decisions
            become long conversations. Gubify connects each important message to
            the action it needs: a task, event, proposal, shared budget or group goal.
          </p>
        </div>

        <div className="support-process-grid">
          <article>
            <div className="process-illustration process-talk" aria-hidden="true">
              <span>Can someone buy the groceries?</span>
              <span>Josh can do it after work.</span>
              <i>1</i>
            </div>
            <span className="process-label">A natural conversation</span>
            <h3>The group talks as usual</h3>
            <p>No complicated setup. The useful idea begins inside the chat.</p>
          </article>
          <article>
            <div className="process-illustration process-convert" aria-hidden="true">
              <small>Convert message to</small>
              <span className="active">✓ Task</span>
              <span>▣ Event</span>
              <span>◌ Proposal</span>
              <i>2</i>
            </div>
            <span className="process-label">One intentional gesture</span>
            <h3>The message becomes useful</h3>
            <p>Hold the message, choose the right action and keep its context.</p>
          </article>
          <article>
            <div className="process-illustration process-result" aria-hidden="true">
              <small>New task</small>
              <strong>Buy the groceries</strong>
              <span><i>J</i> Assigned to Josh</span>
              <b>Today · Before 7 PM</b>
              <em>3</em>
            </div>
            <span className="process-label">A shared, visible result</span>
            <h3>Everyone knows what happens next</h3>
            <p>A person, deadline and result are clear to the entire group.</p>
          </article>
        </div>
      </section>

      <section className="support-bridge support-section">
        <div>
          <span className="support-kicker light"><i aria-hidden="true">♥</i> Your help moves the project forward</span>
          <h2>One developer can build the idea. A community can help it reach everyone.</h2>
        </div>
        <div>
          <p>
            Your support gives me more room to focus on the work that users will
            feel: reliability, thoughtful design, real-device testing and a launch
            that is prepared to last beyond day one.
          </p>
          <GoFundMeButton label="Contribute on GoFundMe" />
        </div>
      </section>

      <section className="expenses-section support-section" id="expenses">
        <div className="support-section-heading">
          <span>Where support helps</span>
          <h2>Real contributions for real development costs.</h2>
          <p>
            Funds are intended to support the practical costs of developing,
            launching and maintaining Gubify. The categories below explain the
            current priorities clearly.
          </p>
        </div>
        <div className="expenses-grid">
          {expenses.map((expense) => (
            <article key={expense.title}>
              <span className={`expense-icon ${expense.className}`} aria-hidden="true">{expense.icon}</span>
              <h3>{expense.title}</h3>
              <p>{expense.text}</p>
            </article>
          ))}
        </div>
        <div className="funding-flow" aria-label="How a contribution supports development">
          <span><i>1</i><strong>You contribute</strong><small>Securely through GoFundMe</small></span>
          <b aria-hidden="true">→</b>
          <span><i>2</i><strong>Essential costs are covered</strong><small>Tools, infrastructure and publishing</small></span>
          <b aria-hidden="true">→</b>
          <span><i>3</i><strong>Gubify moves closer to launch</strong><small>With testing, maintenance and improvements</small></span>
        </div>
        <div className="expenses-cta">
          <p>Want to help cover the next step?</p>
          <GoFundMeButton label="Visit the Gubify campaign" />
        </div>
      </section>

      <section className="founder-note support-section">
        <div className="founder-symbol" aria-hidden="true"><span>G</span><i>Independent project</i></div>
        <div>
          <span className="support-kicker">A personal note</span>
          <h2>I&apos;m building Gubify because I believe useful technology can begin with one person&apos;s passion.</h2>
          <p>
            There is no large company or development team behind this project.
            I&apos;m one person investing time, care and personal resources to build
            something that can help thousands of groups organize everyday life.
            If that mission resonates with you, your support means a lot.
          </p>
          <p className="signature">Thank you for believing in the journey. <strong>— The developer of Gubify</strong></p>
        </div>
      </section>

      <section className="transparency-section support-section" id="transparency">
        <div className="transparency-intro">
          <span className="transparency-shield" aria-hidden="true">✓</span>
          <span className="support-kicker light">Clear from the beginning</span>
          <h2>Our transparency promise</h2>
          <p>I want every supporter to understand what a contribution means before choosing to give.</p>
        </div>
        <div className="transparency-points">
          <article><strong>Voluntary support</strong><p>A contribution is a voluntary donation to support the development of Gubify.</p></article>
          <article><strong>Not an investment</strong><p>Contributing does not provide equity, ownership, financial returns or decision-making rights.</p></article>
          <article><strong>Not a purchase or pre-order</strong><p>A contribution does not purchase the app, guarantee access, or promise a specific reward.</p></article>
          <article><strong>Development can evolve</strong><p>Features, priorities, costs and launch timing may change as testing and development progress.</p></article>
          <article><strong>Purpose of funds</strong><p>Funds are intended for infrastructure, tools, store publication, testing, maintenance and related project costs.</p></article>
          <article><strong>Platform and fees</strong><p>Contributions are processed by GoFundMe. Its applicable transaction fees are deducted before funds are received.</p></article>
          <article><strong>Tax information</strong><p>This is a personal fundraiser. Contributions are not guaranteed to be tax-deductible and GoFundMe does not issue a tax receipt.</p></article>
        </div>
        <p className="transparency-fine-print">
          This page explains the project&apos;s current intentions and does not make
          a financial return, product-delivery or tax-deductibility promise. Please
          review the campaign details, the <a href="https://www.gofundme.com/c/terms" target="_blank" rel="noreferrer">GoFundMe Terms</a> and its <a href="https://support.gofundme.com/hc/en-gb/articles/360039267752-Tax-information-for-donors" target="_blank" rel="noreferrer">tax information for donors</a> before contributing. For personal tax questions, consult a qualified professional in your country.
        </p>
      </section>

      <section className="support-final support-section">
        <span aria-hidden="true">♥</span>
        <h2>Help bring a more useful kind of group chat to life.</h2>
        <p>Share the campaign or contribute any amount. Both actions help an independent project move forward.</p>
        <GoFundMeButton label="Support Gubify now" />
        <a className="campaign-link" href={goFundMeUrl} target="_blank" rel="noreferrer">gofund.me/8faaabb1c ↗</a>
      </section>

      <footer className="support-footer">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </Link>
        <p>Independent development. Clear support. A useful app for groups.</p>
        <Link href="/">Return to Gubify.com</Link>
      </footer>
    </main>
  );
}
