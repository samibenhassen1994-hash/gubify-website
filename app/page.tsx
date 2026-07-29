"use client";

import { useEffect, useState } from "react";

const launchDate = new Date("2026-09-15T18:00:00+02:00");
const initialCountdown = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  complete: false,
};

function getCountdown() {
  const remaining = Math.max(0, launchDate.getTime() - Date.now());

  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
    complete: remaining === 0,
  };
}

const actions = {
  task: {
    icon: "✓",
    label: "Task",
    color: "blue",
    title: "Buy the decorations",
    detail: "Assigned to Aisha",
  },
  event: {
    icon: "□",
    label: "Event",
    color: "coral",
    title: "Luca's birthday",
    detail: "Saturday · 8:30 PM",
  },
  proposal: {
    icon: "◌",
    label: "Proposal",
    color: "violet",
    title: "Choose the venue",
    detail: "3 options · Vote now",
  },
  budget: {
    icon: "€",
    label: "Shared Budget",
    color: "mint",
    title: "Birthday budget",
    detail: "€120 goal created",
  },
  goal: {
    icon: "◎",
    label: "Group Goal",
    color: "yellow",
    title: "Birthday plan",
    detail: "Group Goal created",
  },
} as const;

type ActionKey = keyof typeof actions;

const actionCards: Array<{
  key: ActionKey;
  symbol: string;
  title: string;
  text: string;
}> = [
  {
    key: "task",
    symbol: "📋",
    title: "Tasks",
    text: "Turn a promise into an assigned task with a clear deadline.",
  },
  {
    key: "event",
    symbol: "📅",
    title: "Events",
    text: "Move a date from the conversation straight into the group calendar.",
  },
  {
    key: "proposal",
    symbol: "🗳️",
    title: "Proposals",
    text: "Convert an idea into a vote and let the whole group decide.",
  },
  {
    key: "budget",
    symbol: "💶",
    title: "Shared Budgets",
    text: "Create a shared budget without losing the context of the chat.",
  },
  {
    key: "goal",
    symbol: "🎯",
    title: "Group Goals",
    text: "Give the group one visible goal and track progress together.",
  },
];

export default function Home() {
  const [selectedAction, setSelectedAction] = useState<ActionKey>("goal");
  const [menuOpen, setMenuOpen] = useState(true);
  const [countdown, setCountdown] = useState(initialCountdown);
  const result = actions[selectedAction];

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setCountdown(getCountdown()), 0);
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const chooseAction = (key: ActionKey) => {
    setSelectedAction(key);
    setMenuOpen(false);
    window.setTimeout(() => setMenuOpen(true), 520);
  };

  const previewAction = (key: ActionKey) => {
    chooseAction(key);
    document.getElementById("hero-demo")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <main>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className="launch-bar" aria-label="Gubify launch countdown">
        <div className="launch-message">
          <span className="launch-live-dot" aria-hidden="true" />
          <span>{countdown.complete ? "Gubify is live" : "Launching 15 September 2026"}</span>
        </div>
        {!countdown.complete && (
          <div className="countdown" role="timer" aria-live="off">
            {([
              [countdown.days, "Days"],
              [countdown.hours, "Hours"],
              [countdown.minutes, "Min"],
              [countdown.seconds, "Sec"],
            ] as const).map(([value, label]) => (
              <span className="countdown-unit" key={label}>
                <strong>{String(value).padStart(2, "0")}</strong>
                <small>{label}</small>
              </span>
            ))}
          </div>
        )}
        <div className="play-badge" aria-label="Coming soon on Google Play">
          <span className="play-symbol" aria-hidden="true" />
          <span><small>Coming soon on</small><strong>Google Play</strong></span>
          <em>Stay tuned</em>
        </div>
      </aside>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Gubify home">
          <span className="brand-mark" aria-hidden="true">
            G
          </span>
          <span>Gubify</span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#communities">Communities</a>
          <a href="/support">Support us</a>
          <a href="#about">About</a>
        </nav>

        <a className="header-cta" href="#coming-soon">
          Get the app
        </a>
      </header>

      <nav className="mobile-quick-links" aria-label="Quick page links">
        <a href="#how-it-works">
          <span className="quick-link-icon" aria-hidden="true">→</span>
          How Gubify works
        </a>
        <a href="#about">
          <span className="quick-link-icon" aria-hidden="true">i</span>
          Why Gubify?
        </a>
      </nav>

      <a className="mobile-support-fab" href="/support" aria-label="Open the Gubify support page">
        <span aria-hidden="true">♥</span>
        <strong>Support</strong>
      </a>

      <section className="hero" id="top">
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
        <div className="hero-squiggle" aria-hidden="true">
          ∿
        </div>

        <div className="hero-copy" id="main-content">
          <span className="eyebrow">Your group chat, upgraded</span>
          <h1>
            Turn every message into <span>action.</span>
          </h1>
          <p>
            From everyday conversations to tasks, events, polls and shared
            goals — without leaving the chat.
          </p>
          <div className="hero-buttons">
            <a className="primary-button" href="#how-it-works">
              See how it works <span aria-hidden="true">→</span>
            </a>
            <a className="support-link" href="/support">
              Support the project <span aria-hidden="true">→</span>
            </a>
          </div>
          <a
            className="pre-register-sticker"
            href="/pre-register"
            aria-label="Pre-register for the Gubify launch"
          >
            <strong>Pre-register</strong>
            <span>Get launch access</span>
          </a>
        </div>

        <div className="hero-demo" id="hero-demo" aria-label="Interactive Gubify chat demonstration">
          <div className="phone-shell">
            <div className="chat-header">
              <span className="back-arrow" aria-hidden="true">‹</span>
              <div className="avatar-stack" aria-hidden="true">
                <span className="avatar avatar-maya">M</span>
                <span className="avatar avatar-josh">J</span>
                <span className="avatar avatar-aisha">A</span>
              </div>
              <div>
                <strong>Weekend Crew 🎉</strong>
                <span>8 members</span>
              </div>
              <button className="more-button" aria-label="More conversation options">•••</button>
            </div>

            <div className="chat-body">
              <span className="today-label">Today</span>

              <div className="message-row message-row-selected">
                <span className="message-avatar avatar-maya" aria-hidden="true">M</span>
                <div>
                  <span className="sender-name">Maya</span>
                  <button
                    className="message-bubble selected-message"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-expanded={menuOpen}
                    aria-controls="convert-menu"
                  >
                    Let&apos;s plan Luca&apos;s birthday together!
                    <span className="hold-hint" aria-hidden="true">
                      <b>☝</b> Hold to convert
                    </span>
                    <span className="message-time">10:30 AM</span>
                  </button>
                </div>
              </div>

              <div className="message-row">
                <span className="message-avatar avatar-josh" aria-hidden="true">J</span>
                <div>
                  <span className="sender-name">Josh</span>
                  <div className="message-bubble">
                    Yes! Let&apos;s make it unforgettable 🎈
                    <span className="message-time">10:31 AM</span>
                  </div>
                </div>
              </div>

              <div className="message-row lower-message">
                <span className="message-avatar avatar-aisha" aria-hidden="true">A</span>
                <div>
                  <span className="sender-name">Aisha</span>
                  <div className="message-bubble">
                    I can help with decorations! ✨
                    <span className="message-time">10:32 AM</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="message-input" aria-hidden="true">
              <span>＋</span>
              <span>Message...</span>
              <b>➤</b>
            </div>
          </div>

          <div
            className={`convert-menu ${menuOpen ? "is-open" : ""}`}
            id="convert-menu"
            aria-label="Convert message to"
          >
            <strong>Convert to</strong>
            {(Object.keys(actions) as ActionKey[]).map((key) => {
              const action = actions[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={selectedAction === key ? "is-selected" : ""}
                  onClick={() => chooseAction(key)}
                >
                  <span className={`action-icon ${action.color}`} aria-hidden="true">
                    {action.icon}
                  </span>
                  {action.label}
                </button>
              );
            })}
          </div>

          <div className={`result-card result-${result.color}`} aria-live="polite">
            <span className={`result-icon ${result.color}`} aria-hidden="true">
              {result.icon}
            </span>
            <span className="result-kicker">Created from chat</span>
            <strong>{result.title}</strong>
            <span>{result.detail}</span>
          </div>

          <div className="connector-line" aria-hidden="true" />
        </div>
      </section>

      <section className="how-section section" id="how-it-works">
        <div className="section-heading">
          <span className="eyebrow">One simple gesture</span>
          <h2>A conversation becomes a plan.</h2>
          <p>
            The context stays in the chat while the important part becomes
            something the whole group can act on.
          </p>
        </div>

        <div className="steps-grid">
          <article>
            <span className="step-number">01</span>
            <div className="step-visual step-message">Weekend in Tropea?</div>
            <h3>Start with a message</h3>
            <p>Talk naturally, just like in any group chat.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <div className="step-visual step-hold">Press &amp; convert</div>
            <h3>Choose an action</h3>
            <p>Turn the message into the action your group needs.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <div className="step-visual step-done">✓ Event created</div>
            <h3>Keep everyone moving</h3>
            <p>The action stays connected, visible and easy to follow.</p>
          </article>
        </div>

        <div className="mobile-story-carousel" aria-label="How Gubify converts a message into action">
          <article className="story-card">
            <div className="story-visual story-chat" aria-hidden="true">
              <div className="story-chat-header">
                <span className="story-group-avatar">G</span>
                <span><strong>Apartment Crew</strong><small>4 members</small></span>
              </div>
              <div className="story-message story-message-left">
                <b>Maya</b>
                <span>We&apos;re out of coffee and cleaning products.</span>
              </div>
              <div className="story-message story-message-right">
                <span>I&apos;ll stop by the supermarket after work.</span>
              </div>
              <div className="story-message story-message-selected">
                <b>Maya</b>
                <span>Josh, can you buy them today?</span>
                <i className="story-hold-ring" />
                <i className="story-finger">☝</i>
              </div>
            </div>
            <span className="story-label">Hold the request</span>
            <h3>A real need appears in chat</h3>
            <p>The group talks naturally. Hold the request that should become actionable.</p>
          </article>

          <article className="story-card">
            <div className="story-visual story-convert" aria-hidden="true">
              <div className="conversion-message">Josh, can you buy them today?</div>
              <div className="swipe-guide"><span>Swipe up</span><b>↑</b></div>
              <div className="conversion-sheet">
                <strong>Convert to</strong>
                <span className="selected-conversion"><i className="conversion-icon blue">✓</i> Task</span>
                <span><i className="conversion-icon coral">▣</i> Event</span>
                <span><i className="conversion-icon violet">◌</i> Proposal</span>
                <span><i className="conversion-icon mint">€</i> Shared Budget</span>
                <span><i className="conversion-icon yellow">◎</i> Group Goal</span>
              </div>
            </div>
            <span className="story-label">Choose Task</span>
            <h3>Convert the request</h3>
            <p>Open the action menu and turn the message into a task in one gesture.</p>
          </article>

          <article className="story-card">
            <div className="story-visual story-actions" aria-hidden="true">
              <span className="actions-kicker">Created from chat</span>
              <div className="assigned-task-card">
                <span className="assigned-task-icon">✓</span>
                <span className="assigned-task-type">New task</span>
                <strong>Buy coffee and cleaning products</strong>
                <div className="task-assignee"><i>J</i><span><small>Assigned to</small><b>Josh</b></span></div>
                <div className="task-deadline"><span>Today</span><strong>Before 7:00 PM</strong></div>
                <div className="task-source">↳ Created from Maya&apos;s message</div>
              </div>
              <div className="actions-connected"><span>M</span><span>J</span><span>A</span><b>The group is notified</b></div>
            </div>
            <span className="story-label">Assigned to Josh</span>
            <h3>The request becomes clear</h3>
            <p>Josh receives the task, the deadline stays visible and everyone knows the plan.</p>
          </article>
        </div>

        <div className="carousel-hint" aria-hidden="true">
          <span>Swipe to see how it works</span>
          <b>→</b>
        </div>
      </section>

      <section className="features-section section" id="features">
        <div className="section-heading left-heading">
          <span className="eyebrow">More than messages</span>
          <h2>Everything a group decides, connected.</h2>
        </div>

        <div className="features-grid">
          {actionCards.map((card) => {
            const action = actions[card.key];
            return (
              <article className="feature-card" data-action={card.key} key={card.key}>
                <span className={`feature-icon ${action.color}`} aria-hidden="true">
                  <span className="feature-symbol-desktop">{action.icon}</span>
                  <span className="feature-symbol-mobile">{card.symbol}</span>
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <button type="button" onClick={() => previewAction(card.key)}>
                  Preview in the chat <span aria-hidden="true">↗</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="community-section section" id="communities">
        <div className="community-intro">
          <div className="community-copy">
            <span className="eyebrow">Communities</span>
            <h2>Find your people. Build something together.</h2>
            <p>
              Private Gubs help the people you already know organize everyday
              life. Communities let you connect with new people around a shared
              interest, place, project or purpose.
            </p>
          </div>

          <div className="community-preview" aria-label="Preview of the Calabria Creators public community">
            <span className="community-preview-glow" aria-hidden="true" />
            <div className="community-preview-top">
              <span className="community-logo" aria-hidden="true">CC</span>
              <span className="community-public-badge">Public Community</span>
            </div>
            <h3>Calabria Creators</h3>
            <div className="community-members">
              <span className="community-avatar community-avatar-one" aria-hidden="true">A</span>
              <span className="community-avatar community-avatar-two" aria-hidden="true">M</span>
              <span className="community-avatar community-avatar-three" aria-hidden="true">L</span>
              <strong>1,248 members</strong>
            </div>
            <p>
              A place for creators, developers and people building new ideas in
              Calabria.
            </p>
            <div className="community-topics" aria-label="Community topics">
              <span>Startups</span>
              <span>Design</span>
              <span>Technology</span>
              <span>Local events</span>
            </div>
            <button className="community-join-button" type="button" disabled>
              Join Community
            </button>
            <small>Community experiences are coming to Gubify over time.</small>
          </div>
        </div>

        <div className="community-comparison" aria-label="Private Gubs and Communities compared">
          <article className="community-type-card community-private-card">
            <div className="community-card-heading">
              <span className="community-type-icon" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="community-card-label">People you know</span>
            </div>
            <h3>Private Gubs</h3>
            <p>
              Invite-only spaces for friends, couples, families, roommates and
              teams.
            </p>
            <ul>
              <li>People you already know</li>
              <li>Private and invite-only</li>
              <li>Organize everyday life together</li>
              <li>Tasks, events, proposals and shared budgets</li>
            </ul>
          </article>

          <article className="community-type-card community-public-card">
            <div className="community-card-heading">
              <span className="community-type-icon" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="community-card-label">People to discover</span>
            </div>
            <h3>Communities</h3>
            <p>
              Public spaces where people meet, talk and participate around
              something they care about.
            </p>
            <ul>
              <li>Discoverable by new members</li>
              <li>Built around shared interests</li>
              <li>Public community conversations</li>
              <li>New community features coming over time</li>
            </ul>
          </article>
        </div>

        <p className="community-together-note">
          <strong>One app, two ways to belong.</strong>
          Gubify will bring private groups and public communities together in
          the same experience.
        </p>
      </section>

      <section className="about-section section" id="about">
        <div className="about-card">
          <div>
            <span className="eyebrow light-eyebrow">Why Gubify</span>
            <h2>
              <span className="about-desktop-copy">Less “who was supposed to do it?”</span>
              <span className="about-mobile-copy">Your group&apos;s ideas deserve to become real.</span>
            </h2>
          </div>
          <p className="about-desktop-copy">
            Group chats are where plans begin, but decisions quickly disappear
            between messages. Gubify keeps the spontaneity of chatting and adds
            the structure needed to make things happen.
          </p>
          <p className="about-mobile-copy">
            Great moments begin with a message. Gubify gives every idea a
            place, every person a role and every group the momentum to make it
            happen. Less confusion, more participation and more memories built
            together.
          </p>
          <div className="group-types" aria-label="Gubify is made for">
            <span>Friends</span>
            <span>Couples</span>
            <span>Families</span>
            <span>Roommates</span>
            <span>Teams</span>
          </div>
        </div>
      </section>

      <section className="crowdfunding-section section" id="crowdfunding">
        <div className="crowdfunding-copy">
          <span className="eyebrow light-eyebrow">An independent project</span>
          <h2>Help launch an app built to make every group work better.</h2>
          <p>
            I&apos;m building Gubify independently, alongside my everyday work,
            because I believe group chats can become genuinely useful. Your
            contribution helps cover servers, essential development software,
            testing and the costs of publishing the app on the stores.
          </p>
          <a className="support-status" href="https://gofund.me/8faaabb1c" target="_blank" rel="noreferrer">
            GoFundMe campaign is live ↗
          </a>
          <a className="support-page-link" href="/support">
            See how your support helps →
          </a>
        </div>
        <div className="crowdfunding-card" aria-label="Gubify crowdfunding status">
          <span className="crowdfunding-heart" aria-hidden="true">♥</span>
          <span>Support the launch</span>
          <strong>Help turn one person&apos;s passion into an app useful for everyone.</strong>
          <p>
            Every contribution keeps development moving and brings Gubify
            closer to friends, couples, families, roommates and teams.
          </p>
          <a className="crowdfunding-note" href="https://gofund.me/8faaabb1c" target="_blank" rel="noreferrer">
            Support Gubify on GoFundMe <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="coming-section section" id="coming-soon">
        <span className="eyebrow">Coming soon</span>
        <h2>Your next plan starts in Gubify.</h2>
        <p>One group. One chat. Every action in the right place.</p>
        <a className="primary-button" href="#hero-demo">
          Try the interactive preview <span aria-hidden="true">↑</span>
        </a>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span>Gubify</span>
        </a>
        <p>Turn every message into action.</p>
        <span>© 2026 Gubify. All rights reserved.</span>
      </footer>
    </main>
  );
}
