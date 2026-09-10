"use client";

import { useReducer, useState } from "react";
import styles from "./home.module.css";
import {
  createInitialPhoneState,
  phoneReducer,
  type PhoneMode,
  type PrivateAction,
} from "./interactive-phone-state";

type InteractivePhoneProps = {
  initialMode?: PhoneMode;
  compact?: boolean;
  ariaLabel?: string;
};

const privateActions: Array<{ key: PrivateAction; label: string; icon: string }> = [
  { key: "task", label: "Task", icon: "✓" },
  { key: "event", label: "Event", icon: "▣" },
  { key: "proposal", label: "Proposal", icon: "◉" },
  { key: "budget", label: "Shared Budget", icon: "€" },
];

const communityResults = [
  { name: "Gaming Together", members: "2.8K", tag: "Gaming", emoji: "🎮" },
  { name: "Flutter Makers", members: "1.4K", tag: "Tech", emoji: "💻" },
  { name: "Travel Buddies", members: "3.1K", tag: "Travel", emoji: "✈️" },
];

const answers = [
  { id: "answer-1", name: "Maya", text: "Start with the official Flutter codelabs, then build one tiny app." },
  { id: "answer-2", name: "Aisha", text: "Learn widgets and state first. Rebuild a screen you already use every day." },
  { id: "answer-3", name: "Josh", text: "Pick a small project and learn each concept only when you need it." },
];

function createStateForMode(mode: PhoneMode) {
  const initial = createInitialPhoneState();
  return mode === "community"
    ? phoneReducer(initial, { type: "switchMode", mode: "community" })
    : initial;
}

export default function InteractivePhone({
  initialMode = "private",
  compact = false,
  ariaLabel = "Interactive Gubify app demo",
}: InteractivePhoneProps) {
  const [state, dispatch] = useReducer(phoneReducer, initialMode, createStateForMode);
  const [convertOpen, setConvertOpen] = useState(false);
  const [query, setQuery] = useState("");

  const switchMode = (mode: PhoneMode) => {
    setConvertOpen(false);
    dispatch({ type: "switchMode", mode });
  };

  return (
    <div className={`${styles.phoneDemo} ${compact ? styles.phoneCompact : ""}`} aria-label={ariaLabel}>
      <div className={styles.phoneFrame}>
        <div className={styles.phoneStatus} aria-hidden="true">
          <span>9:41</span><i /><span>●●●</span>
        </div>

        <div className={styles.phoneModeTabs} aria-label="Choose Gubify demo mode">
          <button
            type="button"
            aria-pressed={state.mode === "private"}
            className={state.mode === "private" ? styles.modeActive : ""}
            onClick={() => switchMode("private")}
          >
            Private Gub
          </button>
          <button
            type="button"
            aria-pressed={state.mode === "community"}
            className={state.mode === "community" ? styles.modeActive : ""}
            onClick={() => switchMode("community")}
          >
            Community
          </button>
        </div>

        <div className={styles.phoneViewport}>
          {state.mode === "private" ? (
            <PrivateDemo
              screen={state.privateScreen}
              action={state.privateAction}
              convertOpen={convertOpen}
              onToggleConvert={() => setConvertOpen((open) => !open)}
              onCloseConvert={() => setConvertOpen(false)}
              onScreen={(screen) => dispatch({ type: "privateScreen", screen })}
              onConvert={(action) => {
                setConvertOpen(false);
                dispatch({ type: "convertMessage", action });
              }}
            />
          ) : (
            <CommunityDemo
              screen={state.communityScreen}
              selectedCommunity={state.selectedCommunity}
              bestAnswerId={state.bestAnswerId}
              xp={state.xp}
              levelProgress={state.levelProgress}
              query={query}
              onQuery={setQuery}
              onScreen={(screen) => dispatch({ type: "communityScreen", screen })}
              onSelectCommunity={(community) => dispatch({ type: "selectCommunity", community })}
              onSelectBest={(answerId) => dispatch({ type: "selectBestAnswer", answerId })}
              onResetAsk={() => dispatch({ type: "resetAsk" })}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PrivateDemo({
  screen,
  action,
  convertOpen,
  onToggleConvert,
  onCloseConvert,
  onScreen,
  onConvert,
}: {
  screen: "dashboard" | "chat" | "actionResult";
  action: PrivateAction | null;
  convertOpen: boolean;
  onToggleConvert: () => void;
  onCloseConvert: () => void;
  onScreen: (screen: "dashboard" | "chat" | "actionResult") => void;
  onConvert: (action: PrivateAction) => void;
}) {
  if (screen === "chat") {
    return (
      <div className={styles.appScreen}>
        <PhoneHeader title="Weekend Crew" subtitle="Private Gub · 8 members" onBack={() => onScreen("dashboard")} />
        <div className={styles.chatArea}>
          <span className={styles.dayTag}>Today</span>
          <ChatMessage name="Maya" initial="M" text="We still need someone to book the restaurant for Saturday." time="10:30" />
          <ChatMessage name="Josh" initial="J" text="I can call after work if nobody has done it yet." time="10:31" />
          <button className={styles.convertMessage} type="button" aria-expanded={convertOpen} onClick={onToggleConvert}>
            <small>Aisha · 10:32</small>
            <strong>I can book it. Turn this into something we can track.</strong>
            <span>Tap this message</span>
          </button>
          {convertOpen && (
            <div className={styles.convertSheet} aria-label="Convert message to">
              <div className={styles.sheetTop}><strong>Convert to</strong><button type="button" onClick={onCloseConvert} aria-label="Close conversion menu">×</button></div>
              {privateActions.map((item) => (
                <button key={item.key} type="button" onClick={() => onConvert(item.key)}>
                  <span>{item.icon}</span><strong>{item.label}</strong><em>›</em>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={styles.composer}><span>＋</span><div>Message…</div><b>➤</b></div>
      </div>
    );
  }

  if (screen === "actionResult") {
    const result = {
      task: ["✓", "Task created", "Book the restaurant", "Assigned to Aisha"],
      event: ["▣", "Event created", "Saturday dinner", "Saturday · 20:30"],
      proposal: ["◉", "Proposal created", "Which restaurant?", "3 options · Vote now"],
      budget: ["€", "Shared Budget created", "Saturday dinner", "€180 target"],
    }[action ?? "task"];
    return (
      <div className={`${styles.appScreen} ${styles.resultScreen}`}>
        <PhoneHeader title="Weekend Crew" subtitle="Created from chat" onBack={() => onScreen("chat")} />
        <div className={styles.resultBurst} aria-live="polite">
          <span>{result[0]}</span><small>{result[1]}</small><h4>{result[2]}</h4><p>{result[3]}</p>
          <div className={styles.sourceMessage}>↳ From Aisha&apos;s message</div>
          <button type="button" onClick={() => onScreen("chat")}>Back to chat</button>
          <button type="button" className={styles.quietButton} onClick={() => onScreen("dashboard")}>Open Gub dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appScreen}>
      <PhoneHeader title="Weekend Crew" subtitle="Private Gub · 8 members" />
      <div className={styles.dashboardArea}>
        <div className={styles.memberStrip}><span>8 members</span><button type="button">Board 📣</button></div>
        <button className={styles.todayCard} type="button" onClick={() => onScreen("chat")}>
          <span>Today in the Gub</span><strong>2 active tasks · Vote pending</strong><small>Open the conversation →</small>
        </button>
        <div className={styles.moduleGrid}>
          <button type="button"><span>✓</span><strong>Tasks</strong><small>2 active</small></button>
          <button type="button"><span>▣</span><strong>Calendar</strong><small>Sat · 20:30</small></button>
          <button type="button"><span>◉</span><strong>Proposals</strong><small>1 vote</small></button>
          <button type="button"><span>★</span><strong>Events</strong><small>1 active</small></button>
        </div>
        <button className={styles.budgetCard} type="button"><span>€</span><div><small>Shared Budget</small><strong>Weekend dinner</strong><em>€180 / €300</em></div></button>
        <div className={styles.inviteCard}><span>Invite code</span><strong>K7M4-P9Q2</strong><button type="button">Invite</button></div>
        <button className={styles.openChatButton} type="button" onClick={() => onScreen("chat")}>Open private chat</button>
      </div>
    </div>
  );
}

function CommunityDemo({
  screen,
  selectedCommunity,
  bestAnswerId,
  xp,
  levelProgress,
  query,
  onQuery,
  onScreen,
  onSelectCommunity,
  onSelectBest,
  onResetAsk,
}: {
  screen: "explorer" | "details" | "communityHome" | "ask";
  selectedCommunity: string | null;
  bestAnswerId: string | null;
  xp: number;
  levelProgress: number;
  query: string;
  onQuery: (value: string) => void;
  onScreen: (screen: "explorer" | "details" | "communityHome" | "ask") => void;
  onSelectCommunity: (community: string) => void;
  onSelectBest: (answerId: string) => void;
  onResetAsk: () => void;
}) {
  if (screen === "details") {
    return (
      <div className={styles.appScreen}>
        <PhoneHeader title={selectedCommunity ?? "Travel Buddies"} subtitle="Public Community" onBack={() => onScreen("explorer")} />
        <div className={styles.communityDetails}>
          <div className={styles.communityCover}><span>✦</span><strong>{selectedCommunity ?? "Travel Buddies"}</strong></div>
          <div className={styles.communityMeta}><span>3.1K members</span><span>Open</span><span>English</span></div>
          <p>A place to share ideas, ask questions and help people who love the same topic.</p>
          <button type="button" onClick={() => onScreen("communityHome")}>Join Community</button>
          <small>Illustrative demo</small>
        </div>
      </div>
    );
  }

  if (screen === "communityHome") {
    return (
      <div className={styles.appScreen}>
        <PhoneHeader title={selectedCommunity ?? "Travel Buddies"} subtitle="Community · Joined" onBack={() => onScreen("explorer")} />
        <div className={styles.communityActions}>
          <button type="button">Community</button>
          <button type="button" onClick={() => onScreen("ask")}>Asks</button>
          <button type="button">My Asks</button>
          <button type="button" onClick={() => onScreen("ask")}>Create</button>
          <button type="button" onClick={() => document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" })}>Leaderboard</button>
        </div>
        <div className={styles.communityChat}>
          <span className={styles.dayTag}>Community chat</span>
          <ChatMessage name="Sofia" initial="S" text="Anyone been to Lisbon in October?" time="09:18" />
          <ChatMessage name="Leo" initial="L" text="Yes — great weather. I can share my itinerary." time="09:20" />
          <button type="button" className={styles.askShortcut} onClick={() => onScreen("ask")}>Open Ask section →</button>
        </div>
        <div className={styles.composer}><span>＋</span><div>Message Community…</div><b>➤</b></div>
      </div>
    );
  }

  if (screen === "ask") {
    return (
      <div className={styles.appScreen}>
        <PhoneHeader title="Ask" subtitle={selectedCommunity ?? "Flutter Makers"} onBack={() => onScreen("communityHome")} />
        <div className={styles.askArea}>
          <div className={styles.askQuestion}><span>QUESTION · ACTIVE</span><strong>What is the best way to start learning Flutter?</strong><small>Maya · Level 6</small></div>
          <div className={styles.answerList}>
            {answers.map((answer) => {
              const selected = bestAnswerId === answer.id;
              return (
                <div key={answer.id} className={`${styles.answerCard} ${selected ? styles.bestAnswer : ""}`}>
                  <div><strong>{answer.name}</strong>{selected && <span>★ Best Answer</span>}</div>
                  <p>{answer.text}</p>
                  {!bestAnswerId && <button type="button" onClick={() => onSelectBest(answer.id)}>Select best</button>}
                </div>
              );
            })}
          </div>
          <div className={styles.xpPanel} aria-live="polite">
            <div><span>Level 7</span><strong>{bestAnswerId ? "+140 XP" : `${xp} XP`}</strong></div>
            <div className={styles.xpTrack}><i style={{ width: `${levelProgress}%` }} /></div>
            {bestAnswerId ? <p>Best Answer selected. Helpful contribution rewarded.</p> : <p>Select the most helpful reply.</p>}
            {bestAnswerId && <button type="button" onClick={onResetAsk}>Try again</button>}
          </div>
        </div>
      </div>
    );
  }

  const filtered = communityResults.filter((item) => `${item.name} ${item.tag}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className={styles.appScreen}>
      <PhoneHeader title="Explore Communities" subtitle="Find your people" />
      <div className={styles.explorerArea}>
        <label className={styles.searchBox}><span>⌕</span><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search an interest" aria-label="Search demo Communities" /></label>
        <div className={styles.interestRow}>{["Gaming", "Tech", "Travel", "Music"].map((tag) => <button type="button" key={tag} onClick={() => onQuery(tag)}>{tag}</button>)}</div>
        <span className={styles.demoTag}>Illustrative results</span>
        <div className={styles.communityResultList}>
          {filtered.map((item) => (
            <button type="button" key={item.name} onClick={() => onSelectCommunity(item.name)}>
              <span>{item.emoji}</span><div><strong>{item.name}</strong><small>{item.tag} · {item.members} members</small></div><em>›</em>
            </button>
          ))}
          {filtered.length === 0 && <p className={styles.noResults}>Try Gaming, Tech or Travel.</p>}
        </div>
      </div>
    </div>
  );
}

function PhoneHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return (
    <div className={styles.phoneHeader}>
      {onBack ? <button type="button" onClick={onBack} aria-label="Go back">‹</button> : <span className={styles.headerMark}>G</span>}
      <div><strong>{title}</strong><small>{subtitle}</small></div>
      <button type="button" aria-label="More options">•••</button>
    </div>
  );
}

function ChatMessage({ name, initial, text, time }: { name: string; initial: string; text: string; time: string }) {
  return (
    <div className={styles.chatMessage}><span>{initial}</span><div><small>{name}</small><p>{text}</p><em>{time}</em></div></div>
  );
}
