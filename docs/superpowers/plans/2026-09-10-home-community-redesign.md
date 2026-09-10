# Gubify Homepage Community Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current corporate homepage with a responsive community-first homepage that gives Private Gubs and public Communities equal weight, removes the launch countdown, introduces the varied purple mini-avatar family, and preserves existing routes/backends.

**Architecture:** Make `app/page.tsx` a server-rendered composition file with static homepage sections and CSS-only motion. Put the redesign in `app/home/` with focused server components and one homepage-scoped CSS module, leaving the existing Community API, Firestore, Cloudflare Worker, legal pages and catalog untouched. Reuse the existing `SiteHeader` and `LegalFooter`; scope homepage-only header overrides through the home wrapper instead of changing site-wide behavior.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, TypeScript 5.9.3, CSS Modules, vinext/Vite 8, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-09-10-home-community-redesign-design.md`

## Global Constraints

- Redesign only `/`; do not redesign `/communities`, `/community/[slug]`, support, fundraising, pre-registration or legal pages.
- Private Gubs and Communities receive equal conceptual weight.
- Remove the launch countdown/timer completely.
- Keep a phone mockup that represents a Private Gub.
- Use a family of varied purple mini-avatars, not one fixed mascot.
- Link prominently to `/communities` from the homepage.
- Remove all homepage references to `Group Goals`.
- Do not change Firestore schema/API behavior, Community API behavior, sitemap behavior or Cloudflare cache behavior.
- Keep the redesign out of the already-large `app/globals.css` except for no homepage-specific additions.
- Use distinct desktop and mobile compositions; mobile must not be a scaled-down desktop canvas.
- Respect `prefers-reduced-motion` and retain accessible labels/focus behavior.

---

### Task 1: Add homepage redesign regression coverage

**Files:**
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: existing `loadWorker()`, `baseEnv`, and `executionContext` test helpers.
- Produces: rendered-HTML contract for the redesigned homepage.

- [ ] **Step 1: Add a failing rendered-homepage test**

Append a test with these assertions:

```js
test("home presents Private Gubs and Communities in the community-first redesign", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    baseEnv,
    executionContext,
  );
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Find your people\. Build your space\./i);
  assert.match(html, /Private Gubs for the people closest to you/i);
  assert.match(html, /Close with your people\. Open to your passions\./i);
  assert.match(html, /Turn conversation into action\./i);
  assert.match(html, /Ask\. Help\. Level up\./i);
  assert.match(html, /Stand out by helping others\./i);
  assert.match(html, /Your people are out there\./i);
  assert.match(html, /href=["']\/communities["']/i);
  assert.match(html, /href=["']\/pre-register["']/i);
  assert.doesNotMatch(html, /Launching 15 September 2026/i);
  assert.doesNotMatch(html, /launch countdown/i);
  assert.doesNotMatch(html, /Group Goals/i);
  assert.match(html, /aria-label=["']Private Gub app preview["']/i);
  assert.match(html, /aria-label=["']Community reputation preview["']/i);
});
```

- [ ] **Step 2: Run the targeted test to verify the old home fails the new contract**

Run:

```bash
npm test
```

Expected: the new homepage redesign test fails on the new copy and/or countdown-removal assertions while the pre-existing suite remains otherwise healthy.

- [ ] **Step 3: Commit the failing regression contract**

```bash
git add tests/rendered-html.test.mjs
git commit -m "test: define homepage community redesign contract"
```

---

### Task 2: Build reusable purple avatar and Private Gub phone visuals

**Files:**
- Create: `app/home/purple-avatar.tsx`
- Create: `app/home/gub-phone.tsx`
- Create: `app/home/home.module.css`

**Interfaces:**
- Produces: `PurpleAvatar({ variant, expression, className, label })` and `GubPhone({ compact })` reusable server components.
- Consumers: Hero, Private Gubs, Communities, Ask/XP and leaderboard sections.

- [ ] **Step 1: Create the varied avatar component**

Implement a server component whose variants are `round | drop | tall | arch | blob | sprout` and expressions are `happy | curious | proud | calm`. Decorative uses accept no label and emit `aria-hidden="true"`; meaningful uses accept `label` and emit `role="img"` plus `aria-label`.

Representative interface:

```tsx
import styles from "./home.module.css";

type AvatarVariant = "round" | "drop" | "tall" | "arch" | "blob" | "sprout";
type AvatarExpression = "happy" | "curious" | "proud" | "calm";

type PurpleAvatarProps = {
  variant?: AvatarVariant;
  expression?: AvatarExpression;
  className?: string;
  label?: string;
};

export default function PurpleAvatar({
  variant = "round",
  expression = "happy",
  className = "",
  label,
}: PurpleAvatarProps) {
  return (
    <span
      className={`${styles.avatar} ${styles[`avatar_${variant}`]} ${styles[`avatar_${expression}`]} ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <span className={styles.avatarEyes}><i /><i /></span>
      <span className={styles.avatarMouth} />
    </span>
  );
}
```

- [ ] **Step 2: Create the reusable Private Gub phone**

Render static product UI with `aria-label="Private Gub app preview"`, a `Weekend Crew` Private Gub, a conversation message, and a Task conversion card. Do not add client state.

Required visible copy:

```text
Weekend Crew
Private Gub · 8 members
Who can book the restaurant for Saturday?
Task created
Book the restaurant
Assigned to Aisha
```

- [ ] **Step 3: Add homepage visual primitives to the CSS module**

Define homepage-only tokens and styles for dark navy/violet gradients, glow orbs, avatar silhouettes, eyes/faces, phone shell, floating cards and focus-visible states. Use pseudo-elements for avatar limbs/accessories so no binary asset is required for the first implementation.

Add motion only with transform/opacity and include:

```css
@media (prefers-reduced-motion: reduce) {
  .float,
  .pulse,
  .drift {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 4: Type-check/build after the primitives exist**

Run:

```bash
npm run build
```

Expected: build succeeds and neither component requires `"use client"`.

- [ ] **Step 5: Commit visual primitives**

```bash
git add app/home/purple-avatar.tsx app/home/gub-phone.tsx app/home/home.module.css
git commit -m "feat: add Gubify homepage visual primitives"
```

---

### Task 3: Replace the old hero and timer with the new dual-world hero

**Files:**
- Create: `app/home/hero.tsx`
- Create: `app/home/two-ways-section.tsx`
- Modify: `app/page.tsx`
- Modify: `app/home/home.module.css`

**Interfaces:**
- Consumes: `PurpleAvatar`, `GubPhone`, existing `SiteHeader`, existing `LegalFooter`.
- Produces: server-rendered Hero and balanced Private Gub/Community bridge section.

- [ ] **Step 1: Create Hero**

Render:

```text
Find your people. Build your space.
Private Gubs for the people closest to you. Communities for everyone who shares what you love.
Explore Gubify
Explore Communities
Pre-register
```

`Explore Communities` must be a Next `Link` to `/communities`. `Explore Gubify` anchors to `#two-ways`. Place the Private Gub phone on the visual side and surround it with varied avatar shapes plus small decorative cards for `Ask`, `Best Answer`, `+XP`, and `Discover`.

- [ ] **Step 2: Create TwoWaysSection**

Use `id="two-ways"` and visible bridge copy `Close with your people. Open to your passions.`. Render balanced cards for:

```text
Private Gubs: Chat, Tasks, Proposals, Shared Budget
Communities: Discover, Ask, Best Answer, Level Up
```

- [ ] **Step 3: Replace the old client homepage composition**

Rewrite `app/page.tsx` as a server component. Remove the old `launchDate`, countdown state/effect, old actions map, and all `Group Goal` references. Keep `SiteHeader` and `LegalFooter` and wrap the homepage in the CSS-module root so homepage-specific header styling can be scoped.

Initial composition:

```tsx
export default function Home() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <Hero />
        <TwoWaysSection />
      </main>
      <LegalFooter />
    </div>
  );
}
```

- [ ] **Step 4: Add desktop/tablet/mobile hero layouts**

Desktop at `min-width: 1025px`: two-column editorial hero with layered phone/cards. Tablet around `768px–1024px`: reduce absolute layering and keep the phone centered beside/below copy. Mobile below `768px`: content order must be heading → supporting copy → CTAs → phone → decorative avatar/card cluster. Remove any decoration that would create horizontal overflow.

- [ ] **Step 5: Build to verify timer/client-home removal**

Run:

```bash
npm run build
```

Expected: build succeeds; `app/page.tsx` has no `"use client"`, `useEffect`, countdown code or Group Goals.

- [ ] **Step 6: Commit hero and dual-world foundation**

```bash
git add app/page.tsx app/home/hero.tsx app/home/two-ways-section.tsx app/home/home.module.css
git commit -m "feat: redesign Gubify homepage hero"
```

---

### Task 4: Add Private Gubs and Communities story sections

**Files:**
- Create: `app/home/private-gubs-section.tsx`
- Create: `app/home/communities-section.tsx`
- Modify: `app/page.tsx`
- Modify: `app/home/home.module.css`

**Interfaces:**
- Consumes: `PurpleAvatar`, `GubPhone`.
- Produces: detailed Private Gub story and Community discovery story with `/communities` CTA.

- [ ] **Step 1: Create PrivateGubsSection**

Render heading `Turn conversation into action.` and a larger Private Gub visual with floating cards for `Chat → Task`, `Events`, `Proposals & Voting`, and `Shared Budget`. Use close-cluster avatar placement to visually communicate a private group.

- [ ] **Step 2: Create CommunitiesSection**

Render heading `Find your people.` and discovery copy. Include a search-style visual (`What are you into?`), demo interest chips/cards such as Gaming, Tech, Music, Fitness, Travel and Anime, and the flow `Search → Discover → Join → Participate`.

Include a prominent:

```tsx
<Link href="/communities">Explore Communities</Link>
```

and a secondary message `Communities can be discovered beyond the app.` Demo community names must be presented as illustrative examples, not live-data claims.

- [ ] **Step 3: Add both sections to page composition**

Place Private Gubs first and Communities second so the page alternates intimate/private and open/discovery compositions while maintaining equal total visual weight.

- [ ] **Step 4: Add responsive section layouts**

Desktop: alternate text/visual sides. Mobile: single-column reading order with visual cards contained inside the section width; convert floating clusters to compact grids when needed.

- [ ] **Step 5: Build and run homepage regression suite**

Run:

```bash
npm test
```

Expected: redesign regression now passes all Private Gub/Community/copy/timer assertions added in Task 1, along with existing tests.

- [ ] **Step 6: Commit product-story sections**

```bash
git add app/page.tsx app/home/private-gubs-section.tsx app/home/communities-section.tsx app/home/home.module.css
git commit -m "feat: add Private Gub and Community homepage stories"
```

---

### Task 5: Add Ask/XP and leaderboard reputation loop

**Files:**
- Create: `app/home/ask-xp-section.tsx`
- Create: `app/home/leaderboard-section.tsx`
- Modify: `app/page.tsx`
- Modify: `app/home/home.module.css`

**Interfaces:**
- Consumes: `PurpleAvatar`.
- Produces: static, accessible reputation-loop visuals and leaderboard demo.

- [ ] **Step 1: Create AskXpSection**

Render heading `Ask. Help. Level up.` with one question card, three answer cards, one `Best Answer` badge, a `+XP` badge and a level-progress treatment. Use CSS animation classes only; no client state.

Required conceptual flow in visible copy:

```text
Ask
Best Answer
Earn XP
Level Up
Your contribution matters.
```

- [ ] **Step 2: Create LeaderboardSection**

Render heading `Stand out by helping others.` and `aria-label="Community reputation preview"`. Use three different avatar variants on a podium and demo rows that combine rank, level and Best Answers. Include a smaller `Level 7 → Level 8` progress example to show that progression is not only for the top three.

- [ ] **Step 3: Add restrained CSS-only motion**

Use low-amplitude transforms for cards/avatars and a progress fill animation. Disable all such animation under `prefers-reduced-motion`.

- [ ] **Step 4: Add the reputation sections to `app/page.tsx`**

Place Ask/XP immediately after Communities, followed by Leaderboard so the narrative reads: participate → useful answer → XP → level → recognition.

- [ ] **Step 5: Run build and tests**

Run:

```bash
npm run build
npm run test:app
```

Expected: both commands pass.

- [ ] **Step 6: Commit reputation loop**

```bash
git add app/page.tsx app/home/ask-xp-section.tsx app/home/leaderboard-section.tsx app/home/home.module.css
git commit -m "feat: show Community reputation loop on homepage"
```

---

### Task 6: Add final CTA, responsive polish and complete verification

**Files:**
- Create: `app/home/final-cta.tsx`
- Modify: `app/page.tsx`
- Modify: `app/home/home.module.css`
- Modify: `tests/rendered-html.test.mjs` only if an assertion must be corrected to match semantic final markup without weakening the contract.

**Interfaces:**
- Consumes: existing `/communities` and `/pre-register` routes.
- Produces: completed responsive homepage ready for local visual review.

- [ ] **Step 1: Create FinalCta**

Render:

```text
Your people are out there.
Create a Gub. Join a Community. Start connecting.
Explore Communities
Pre-register
```

with `/communities` and `/pre-register` links.

- [ ] **Step 2: Finish homepage composition**

Add `FinalCta` before `LegalFooter`. Confirm the final section order is Hero → Two Ways → Private Gubs → Communities → Ask/XP → Leaderboard → Final CTA.

- [ ] **Step 3: Audit responsive CSS at four layout bands**

Verify the module has explicit behavior for approximately:

```text
<= 560px   small phones
561-767px  large phones
768-1024px tablets
>= 1025px  desktop
```

Ensure no fixed-width visual exceeds its container, CTA rows wrap safely, phone width uses `min()`/`clamp()`, and decorative absolute elements are hidden/repositioned on narrow screens.

- [ ] **Step 4: Audit accessibility and motion**

Confirm the skip link targets `#main-content`, decorative avatars are `aria-hidden`, meaningful previews carry labels, links remain keyboard-focusable, and `prefers-reduced-motion` disables decorative motion.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm run lint
npm run build
npm run test:app
```

Expected: all commands exit 0.

- [ ] **Step 6: Inspect git diff for scope**

Run:

```bash
git diff main...HEAD -- app tests docs/superpowers
```

Expected: homepage/test/spec/plan changes only; no Community API, Firestore, Worker or unrelated page changes.

- [ ] **Step 7: Commit final polish**

```bash
git add app/page.tsx app/home tests/rendered-html.test.mjs
git commit -m "feat: complete responsive Gubify homepage redesign"
```

- [ ] **Step 8: Leave branch unmerged for local review**

Do not merge into `main`. Report branch name `home-community-redesign` and the exact local commands for review:

```bash
git fetch origin
git switch home-community-redesign
npm run dev
```

The user will visually review desktop and mobile locally before approving a merge.
