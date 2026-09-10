# Gubify Interactive World Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/` as an interactive, responsive Gubify world that visually matches the approved purple poster, uses the supplied transparent avatar art, and demonstrates Private Gubs and Communities faithfully to the current Flutter app.

**Architecture:** Keep `app/page.tsx` primarily server-rendered and move homepage behavior into focused client islands. The central `InteractivePhone` owns only local demo state (`private` / `community` plus representative screens and actions); all demo interactions are deterministic and never call Firestore. Homepage visuals live in `app/home-interactive/home.module.css`, while supplied transparent PNG artwork is committed under `public/home/avatars/` and reused in hero, feature scenes, leaderboard and CTA.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, TypeScript 5.9.3, CSS Modules, vinext/Vite 8, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-09-10-home-interactive-world-redesign-design.md`

## Global Constraints

- Redesign only `/`.
- Start from `main`; do not reuse the rejected `home-community-redesign` implementation.
- Preserve `/communities`, `/community/[slug]`, support, legal, fundraising, pre-registration, API, Firestore, sitemap and Worker behavior.
- The phone demo must stay faithful to the current Flutter app branch `feature/user-block-and-chat-reporting`.
- Private Gubs must clearly communicate chat, members/invites, Board, Tasks, Calendar, Events, Proposals & Voting and Shared Budget.
- Communities must clearly communicate Explorer/discovery, membership/join, chat, Ask, Best Answer, XP/leveling, leaderboard, members and public web discoverability.
- Do not advertise `Group Goals` or other removed/unimplemented functionality.
- Remove the launch countdown/timer completely.
- Use the supplied real transparent avatar PNGs; never replace them with CSS circles or primitive fake mascots.
- Main palette should stay visually anchored to `#1D0D5E`, `#341C91`, `#512FBA`, `#7B4CE7`, `#B27DF9`, `#E7C8F7`.
- Any element styled as a control must perform a real local interaction, scroll, or navigation.
- `Explore Communities` must link to `/communities`.
- Important explanatory text remains HTML, not baked into artwork.
- Responsive layouts must be intentionally composed for `<=560`, `561-767`, `768-1024`, and `>=1025` widths.
- Respect `prefers-reduced-motion`.

---

### Task 1: Lock the redesigned homepage contract with tests

**Files:**
- Create: `tests/home-interactive-world.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: rendered-HTML requirements for copy, anchors, links and accessible demo controls; pure-state tests for phone demo transitions.

- [ ] **Step 1: Write the rendered-home failing test**

Test the built worker at `/` for all of the following:

```js
assert.match(html, /Build your world together\./i);
assert.match(html, /Your private space\. More than a chat\./i);
assert.match(html, /Find people who love what you love\./i);
assert.match(html, /Ask\. Help\. Level up\./i);
assert.match(html, /Become one of the most valuable members\./i);
assert.match(html, /href=["']\/communities["']/i);
assert.match(html, /id=["']private-gubs["']/i);
assert.match(html, /id=["']communities["']/i);
assert.match(html, /id=["']ask-best-answer["']/i);
assert.match(html, /id=["']leaderboard["']/i);
assert.doesNotMatch(html, /Launching 15 September 2026/i);
assert.doesNotMatch(html, /launch countdown/i);
assert.doesNotMatch(html, /Group Goals/i);
assert.match(html, /Private Gub/i);
assert.match(html, /Community/i);
assert.match(html, /Explore Communities/i);
```

- [ ] **Step 2: Add pure reducer/state tests for the phone**

Create exported pure helpers from `interactive-phone-state.ts` later and define the desired API now:

```ts
createInitialPhoneState()
phoneReducer(state, { type: "switchMode", mode: "community" })
phoneReducer(state, { type: "privateScreen", screen: "chat" })
phoneReducer(state, { type: "convertMessage", action: "task" })
phoneReducer(state, { type: "communityScreen", screen: "ask" })
phoneReducer(state, { type: "selectBestAnswer", answerId: "answer-2" })
```

Expected effects:
- initial mode is `private` / `dashboard`;
- switching to Community resets Community screen to `explorer`;
- converting a Private Gub message stores the selected action and moves to `actionResult`;
- selecting a Best Answer sets `bestAnswerId`, increases demo XP from `620` to `760`, and moves level progress from `62` to `76`.

- [ ] **Step 3: Add the new test file to `test:app`**

Append `tests/home-interactive-world.test.mjs` to the existing Node test command; do not remove any current test files.

- [ ] **Step 4: Run `npm test` and confirm RED**

Expected: the new home contract fails because the old countdown/copy and missing interactive state module are still present.

- [ ] **Step 5: Commit the failing contract**

```bash
git add tests/home-interactive-world.test.mjs package.json
git commit -m "test: define interactive homepage contract"
```

---

### Task 2: Commit the supplied transparent Gubify avatar artwork

**Files:**
- Create: `public/home/avatars/avatar-fantasma.png`
- Create: `public/home/avatars/avatar-bolla.png`
- Create: `public/home/avatars/avatar-nano.png`

**Interfaces:**
- Produces three production image URLs used by all homepage scenes.

- [ ] **Step 1: Commit the exact supplied RGBA PNGs without visual modification**

The source assets are the three user-provided transparent images. Preserve alpha, aspect ratio and artwork.

- [ ] **Step 2: Verify filenames and image dimensions**

Expected source dimensions: `1254 × 1254` each. Page CSS may render them smaller, but production files remain high-resolution.

- [ ] **Step 3: Commit artwork**

```bash
git add public/home/avatars
git commit -m "assets: add transparent Gubify avatars"
```

---

### Task 3: Implement the pure interactive phone state model

**Files:**
- Create: `app/home-interactive/interactive-phone-state.ts`
- Test: `tests/home-interactive-world.test.mjs`

**Interfaces:**
- Produces:

```ts
export type PhoneMode = "private" | "community";
export type PrivateScreen = "dashboard" | "chat" | "actionResult";
export type CommunityScreen = "explorer" | "details" | "communityHome" | "ask";
export type PrivateAction = "task" | "event" | "proposal" | "budget";
export type PhoneState = {
  mode: PhoneMode;
  privateScreen: PrivateScreen;
  communityScreen: CommunityScreen;
  privateAction: PrivateAction | null;
  selectedCommunity: string | null;
  bestAnswerId: string | null;
  xp: number;
  levelProgress: number;
};
export function createInitialPhoneState(): PhoneState;
export function phoneReducer(state: PhoneState, action: PhoneAction): PhoneState;
```

- [ ] **Step 1: Run reducer tests and confirm they fail because module/functions are absent**

- [ ] **Step 2: Implement only the deterministic state transitions required by the tests**

No browser APIs, backend calls or side effects in this file.

- [ ] **Step 3: Run the pure-state tests and confirm GREEN**

- [ ] **Step 4: Commit the state model**

```bash
git add app/home-interactive/interactive-phone-state.ts tests/home-interactive-world.test.mjs
git commit -m "feat: add interactive phone demo state"
```

---

### Task 4: Build the faithful interactive phone client component

**Files:**
- Create: `app/home-interactive/interactive-phone.tsx`
- Create: `app/home-interactive/home.module.css`

**Interfaces:**
- Consumes: `phoneReducer`, `createInitialPhoneState`.
- Produces: `InteractivePhone({ initialMode?, compact?, ariaLabel? })`.

- [ ] **Step 1: Implement the phone shell and mode switch**

Use a visible two-option segmented control: `Private Gub` and `Community`. Both are real `<button>` elements with selected state.

- [ ] **Step 2: Implement faithful Private Gub dashboard state**

Represent the current Flutter Gub screen rather than inventing a generic chat UI. Show:
- Gub name / member count;
- Board affordance;
- Today summary;
- Tasks, Proposals, Calendar, Events module grid;
- Shared Budget summary;
- bottom/open-chat action.

All module tiles are buttons. `Chat` opens the chat demo; module buttons may show a small local detail/result state where appropriate.

- [ ] **Step 3: Implement Private Gub chat conversion interaction**

Show a representative group chat. Clicking the highlighted message opens a conversion sheet with exactly:
- `Task`
- `Event`
- `Proposal`
- `Shared Budget`

Choosing one dispatches `convertMessage` and renders a confirmation/result card with a `Back to chat` button. Do not include Group Goals.

- [ ] **Step 4: Implement Community Explorer state**

Mirror the app concept with search/category controls and illustrative Community cards. Use obvious demo labeling. Clicking a card moves to `details`; `Join Community` moves to `communityHome` locally.

- [ ] **Step 5: Implement Community Home state**

Follow the real app's top actions: `Community`, `Asks`, `My Asks`, `Create`, `Leaderboard`, with a Community chat region below. Buttons change local state or scroll to the page leaderboard section as appropriate.

- [ ] **Step 6: Implement Community Ask state**

Show a question, multiple answers, `Select best` actions and a confirmation-style local interaction. When answer 2 is selected, highlight `Best Answer`, render `+140 XP`, and animate demo progress from 62% to 76% using state values.

- [ ] **Step 7: Accessibility behavior**

- Phone root has an explicit `aria-label`.
- Mode buttons use `aria-pressed`.
- Selected screens expose an `aria-live="polite"` feedback region for action result/XP.
- All icon-only controls receive names.
- No hover-only behavior is required to operate the phone.

- [ ] **Step 8: Run `npm run lint` and state tests**

Expected: lint and pure-state tests pass.

- [ ] **Step 9: Commit interactive phone**

```bash
git add app/home-interactive/interactive-phone.tsx app/home-interactive/home.module.css
git commit -m "feat: build faithful interactive Gubify phone"
```

---

### Task 5: Build the poster-world shell and hero navigation

**Files:**
- Create: `app/home-interactive/world-background.tsx`
- Create: `app/home-interactive/section-nav.tsx`
- Create: `app/home-interactive/hero.tsx`
- Modify: `app/home-interactive/home.module.css`

**Interfaces:**
- Consumes: real avatar image URLs and `InteractivePhone`.
- Produces: continuous purple Gubify world, Hero and clickable bubble navigation.

- [ ] **Step 1: Implement world background primitives**

Use layered CSS gradients and pseudo-elements for star field, nebula glow and cloud banks. Stars/clouds are decorative and `aria-hidden`. Do not use CSS-generated avatars.

- [ ] **Step 2: Implement hero avatar composition**

Use real `<img>` / `next/image` assets:
- `/home/avatars/avatar-fantasma.png`
- `/home/avatars/avatar-bolla.png`
- `/home/avatars/avatar-nano.png`

Use different sizes/depths/rotations and gentle float animation only. Preserve aspect ratio.

- [ ] **Step 3: Implement real hero bubble navigation**

Controls:
- `Private Gubs` -> `#private-gubs`
- `Communities` -> `#communities`
- `Ask & Best Answer` -> `#ask-best-answer`
- `Leaderboard` -> `#leaderboard`
- `Explore Communities` -> `/communities`

Make the first four anchors real links or buttons that scroll naturally; style them as translucent glass bubbles matching the poster.

- [ ] **Step 4: Implement Hero copy and phone**

Visible copy:

```text
Build your world together.
Create private spaces with the people you already know, or discover Communities built around what you love.
```

Show the full interactive phone, initial Private Gub state, plus `Explore Communities` and pre-registration/app CTA.

- [ ] **Step 5: Add desktop and mobile hero compositions**

Desktop: copy + phone, avatars and nav bubbles layered around phone.
Mobile: copy, CTA row, phone, compact nav bubbles; decorative avatars move behind/below controls and never block touch targets.

- [ ] **Step 6: Commit hero/world shell**

```bash
git add app/home-interactive/world-background.tsx app/home-interactive/section-nav.tsx app/home-interactive/hero.tsx app/home-interactive/home.module.css
git commit -m "feat: create Gubify poster world hero"
```

---

### Task 6: Build the Private Gubs explanatory scene

**Files:**
- Create: `app/home-interactive/private-gubs-section.tsx`
- Modify: `app/home-interactive/home.module.css`

**Interfaces:**
- Consumes: `InteractivePhone({ initialMode: "private" })`, avatar images.
- Produces: `#private-gubs` section.

- [ ] **Step 1: Render the approved Private Gubs message**

Heading: `Your private space. More than a chat.`

Short supporting line:

`Chat together · Organize tasks · Plan events · Vote on proposals · Manage a shared budget`

- [ ] **Step 2: Create poster-style feature scene using real artwork**

Build a visual composition with actual avatars, glass bubbles and concise icon labels for:
- Chat
- Tasks
- Calendar / Events
- Proposals / Voting
- Shared Budget
- Members

This scene is explanatory art; only elements styled as buttons are interactive.

- [ ] **Step 3: Embed a compact faithful Private Gub phone demo**

The section phone opens dashboard/chat and message conversion, independent from the Hero demo.

- [ ] **Step 4: Add responsive layout**

Desktop: text/scene/phone arranged as a wide editorial composition. Mobile: copy first, compact scene next, phone demo last or immediately after copy depending on available width; no overflow.

- [ ] **Step 5: Commit Private Gubs section**

```bash
git add app/home-interactive/private-gubs-section.tsx app/home-interactive/home.module.css
git commit -m "feat: explain Private Gubs with interactive demo"
```

---

### Task 7: Build the Communities discovery scene

**Files:**
- Create: `app/home-interactive/communities-section.tsx`
- Modify: `app/home-interactive/home.module.css`

**Interfaces:**
- Consumes: `InteractivePhone({ initialMode: "community" })`, avatar images.
- Produces: `#communities` section and real `/communities` CTA.

- [ ] **Step 1: Render approved Community message**

Heading: `Find people who love what you love.`

Visible path:

`Discover → Join → Chat → Ask → Help → Grow`

- [ ] **Step 2: Create open poster-style discovery scene**

Use real avatar art connected to glass interest bubbles (`Gaming`, `Tech`, `Music`, `Travel`, `Anime`, `Fitness`) and orbit lines. The composition should feel wider/more open than Private Gubs.

- [ ] **Step 3: Embed the Community phone demo**

Allow Explorer -> details -> Join -> Community Home -> Ask. Keep sample content visibly illustrative.

- [ ] **Step 4: Add real CTA and web discoverability message**

`Explore Communities` links to `/communities`.

Supporting copy: `Public Communities can also be discovered on the web.`

- [ ] **Step 5: Commit Communities section**

```bash
git add app/home-interactive/communities-section.tsx app/home-interactive/home.module.css
git commit -m "feat: add interactive Community discovery story"
```

---

### Task 8: Build Best Answer / XP and leaderboard scenes

**Files:**
- Create: `app/home-interactive/ask-best-answer-section.tsx`
- Create: `app/home-interactive/leaderboard-section.tsx`
- Modify: `app/home-interactive/home.module.css`

**Interfaces:**
- Produces: `#ask-best-answer` and `#leaderboard` sections.

- [ ] **Step 1: Build Ask section**

Heading: `Ask. Help. Level up.`

Include an interactive Community Ask phone state, response cards, real `Select best` buttons, XP feedback and progress animation. Supporting HTML copy:

```text
Great answers stand out.
Best Answers reward useful contributions with XP.
XP helps members level up inside their Community.
```

- [ ] **Step 2: Build leaderboard poster scene using real avatar images**

Heading: `Become one of the most valuable members.`

Show 1st/2nd/3rd podium with the three provided avatars, plus demo Level and Best Answer values. Label demo data as illustrative.

- [ ] **Step 3: Explain the reputation loop**

Visible line:

`Helpful participation → Best Answers → XP → Level → Recognition`

- [ ] **Step 4: Respect motion/accessibility**

XP pops, progress fills and podium entrance can animate, but disable them under `prefers-reduced-motion`.

- [ ] **Step 5: Commit reputation sections**

```bash
git add app/home-interactive/ask-best-answer-section.tsx app/home-interactive/leaderboard-section.tsx app/home-interactive/home.module.css
git commit -m "feat: add Best Answer XP and leaderboard stories"
```

---

### Task 9: Replace the old homepage and preserve site navigation compatibility

**Files:**
- Modify: `app/page.tsx`
- Create: `app/home-interactive/final-cta.tsx`
- Modify: `app/home-interactive/home.module.css`

**Interfaces:**
- Consumes: existing `SiteHeader`, `LegalFooter`, all new homepage sections.
- Produces: final `/` composition.

- [ ] **Step 1: Rewrite `app/page.tsx` as composition**

Remove the existing page-level `"use client"`, countdown state/effect, old `actions` map, old static feature sections and every `Group Goal` reference.

Compose:

```tsx
<SiteHeader />
<main id="main-content">
  <Hero />
  <PrivateGubsSection />
  <CommunitiesSection />
  <AskBestAnswerSection />
  <LeaderboardSection />
  <FinalCta />
</main>
<LegalFooter />
```

- [ ] **Step 2: Preserve header anchors**

Map existing header anchors so none become dead on the homepage:
- `#features` -> Private/Community overview area inside Hero/Private section
- `#how-it-works` -> Private Gubs interaction area
- `#about` -> Community/mission explanatory area
- `#coming-soon` -> final CTA/pre-registration area

- [ ] **Step 3: Implement final CTA**

Heading: `Your people are out there.`

Supporting copy: `Create your Private Gub or find a Community built around what you love.`

Actions:
- `/communities`
- `/pre-register`

Use dense cloud bank, stars and several real avatar images.

- [ ] **Step 4: Add homepage-only header/footer visual overrides**

Make the existing header readable over the purple world without globally restyling other routes. Preserve mobile menu behavior and focus states.

- [ ] **Step 5: Commit final composition**

```bash
git add app/page.tsx app/home-interactive/final-cta.tsx app/home-interactive/home.module.css
git commit -m "feat: replace homepage with interactive Gubify world"
```

---

### Task 10: Responsive, accessibility and verification pass

**Files:**
- Modify: `app/home-interactive/home.module.css`
- Modify: `tests/home-interactive-world.test.mjs` only if semantic markup requires a non-weaker assertion adjustment.

**Interfaces:**
- Produces: review-ready branch; no merge.

- [ ] **Step 1: Audit responsive bands**

Explicitly verify CSS behavior at:
- `<=560px`
- `561-767px`
- `768-1024px`
- `>=1025px`

Check phone width, nav bubble wrapping, avatar placements, cloud density, text wrapping and no page-level horizontal overflow.

- [ ] **Step 2: Audit interaction affordances**

Every styled control does something. Decorative glass bubbles are not styled like buttons. Touch targets are at least approximately 44px high where practical.

- [ ] **Step 3: Audit accessibility**

- skip link targets `#main-content`;
- all meaningful buttons/links have accessible names;
- decorative avatars use empty alt text;
- phone `aria-live` feedback does not spam updates;
- focus-visible states are prominent;
- reduced-motion disables floating/shimmer/progress animations.

- [ ] **Step 4: Run full verification**

```bash
npm run lint
npm run build
npm run test:app
```

Expected: all commands exit 0.

- [ ] **Step 5: Scope review**

```bash
git diff main...HEAD -- app public/home tests package.json docs/superpowers
```

Expected: homepage, new homepage assets/tests and planning docs only; no Worker/API/Firestore/unrelated page changes.

- [ ] **Step 6: Keep branch unmerged for user visual review**

Branch remains `home-interactive-world-redesign`. User will run it locally and review both desktop and mobile before any merge decision.
