# Gubify Homepage Community Redesign — Design

## Goal
Redesign only the Gubify homepage so it reflects the current product: an equal 50/50 emphasis on Private Gubs and public Communities, with a playful community-first visual language based on the purple mini-avatar family shown in the approved campaign graphics.

## Scope
This design applies only to `/` for now. Existing pages such as `/communities`, `/community/[slug]`, support, pre-registration, fundraising, privacy, terms and guidelines remain functionally unchanged. The homepage must link prominently to `/communities`.

## Visual Direction
The current clean/corporate SaaS look is replaced on the homepage by a darker community-first style using deep navy, violet, lavender, soft glow, rounded surfaces, floating UI cards and playful motion. The recurring visual characters are not one mascot: they are a family of small purple avatars with varied silhouettes, expressions and roles. The site should feel social, warm and alive while remaining readable and performant.

The supplied promotional artwork is a visual reference, not a layout to reproduce literally. The website should borrow its atmosphere, color language, avatar family, floating cards and glow while using more whitespace and stronger information hierarchy.

## Product Story
Private Gubs and Communities must receive equal conceptual weight.

Private Gubs communicate: close groups, private chat, organization and action.
Communities communicate: discovery, shared interests, asking, helping, reputation and growth.

The homepage should make clear that these are two complementary ways to use one product.

## Homepage Structure

### 1. Hero — Find your people. Build your space.
Remove the existing launch countdown/timer completely.

The hero uses a dark violet/navy scene. The phone remains a major product element and shows a Private Gub. Around it, floating Community-oriented elements and several different purple mini-avatars introduce the broader social world.

Primary copy:
- Heading: `Find your people. Build your space.`
- Supporting idea: `Private Gubs for the people closest to you. Communities for everyone who shares what you love.`

Primary actions:
- `Explore Gubify`
- `Explore Communities` -> `/communities`
- Existing app/pre-registration CTA remains available without becoming the dominant visual.

The phone should demonstrate a real Private Gub flow, such as a chat message converting into a task or proposal.

### 2. Two Ways to Belong
A balanced two-world section explains the product split without looking like a corporate comparison table.

Private Gubs side:
- Chat
- Tasks
- Proposals
- Shared Budget

Communities side:
- Discover
- Ask
- Best Answer
- Level Up

Bridge copy: `Close with your people. Open to your passions.`

### 3. Private Gubs — Turn conversation into action
Show the phone prominently with a Private Gub conversation and floating action cards for:
- Chat -> Task
- Events
- Proposals & Voting
- Shared Budget

Remove all references to the retired `Group Goals` feature.

Purple avatars are clustered more closely here to communicate an intimate private group. Their poses can suggest assigning, voting, budgeting and planning.

### 4. Communities — Find your people
This section opens the composition visually and focuses on discovery.

Core concepts:
- Search Communities
- Discover shared interests
- Join open Communities or request access
- Participate in conversation
- Grow through useful contributions

Use a prominent `Explore Communities` CTA linking to `/communities`.

Community cards in the homepage may use illustrative/demo data and must not imply that placeholder communities are live database records.

A secondary visual can communicate web discoverability in plain language rather than technical SEO terminology, e.g. `Communities can be discovered beyond the app.`

### 5. Ask -> Best Answer -> XP -> Level Up
This section tells a visual story through floating cards and mini-avatars rather than another phone mockup.

Sequence:
1. A member asks a question.
2. Several members answer.
3. One answer receives `Best Answer`.
4. The contributor earns XP.
5. The level progress advances.

Main heading: `Ask. Help. Level up.`

The animation should be restrained: subtle floating cards, viewport entrance, Best Answer highlight and XP/progress animation. No constant heavy animation.

### 6. Leaderboard & Recognition
Continue the reputation loop with a podium and varied purple avatars.

Heading: `Stand out by helping others.`

Ranking should visually reference both Level and Best Answers. The tone is recognition for contribution rather than aggressive competition.

Demonstration ranking values are allowed but must be clearly decorative/product-demo content.

### 7. Final Discovery / CTA
Close the homepage by reuniting both product worlds.

Suggested message:
`Your people are out there.`
`Create a Gub. Join a Community. Start connecting.`

Primary actions should include `/communities` and the app/pre-registration path already used by the site.

## Responsive Design
The redesign must have distinct desktop and mobile compositions, not merely a desktop layout shrunk down.

Desktop:
- Wide editorial compositions.
- Phone and illustrations may sit beside text.
- Floating cards and avatar clusters can use layered positioning.

Mobile:
- Stack content intentionally in reading order.
- Hero order: headline, supporting copy, CTAs, phone, then surrounding visual elements.
- Avoid off-screen decorative elements and horizontal overflow.
- Floating cards collapse into contained layers or smaller grids where necessary.
- Controls and CTAs meet comfortable touch-target sizing.
- Typography scales fluidly and important copy remains readable without excessive wrapping.

The design must work across small phones, large phones, tablets and desktop widths.

## Technical Direction
The existing homepage file is too large and currently uses `"use client"` for the entire route. The redesign should split static sections from interactive islands so that the page can remain primarily server-rendered where possible.

Recommended structure:
- `app/page.tsx` — page composition only
- `app/home/home.module.css` — homepage-specific design tokens/layout rules
- `app/home/hero.tsx`
- `app/home/private-gubs-section.tsx`
- `app/home/communities-section.tsx`
- `app/home/ask-xp-section.tsx`
- `app/home/leaderboard-section.tsx`
- small client components only for interactions/animations that truly require browser state

Do not increase the already-large `app/globals.css` with the full redesign. Keep global styles/tokens there only when genuinely shared across the site; otherwise use homepage-scoped CSS modules.

## Existing Functionality to Preserve
- Existing global header behavior and accessibility unless visual adaptation is required for the new hero.
- Existing legal footer and site-wide legal routes.
- Existing `/communities` route and catalog behavior.
- Existing Community backend, Firestore usage, sitemap logic, catalog cache and Cloudflare Worker behavior.
- Existing pre-registration/app paths unless the current homepage uses an obsolete label that needs copy-only adjustment.

No backend or Firestore changes are part of this redesign.

## Accessibility and Performance
- Respect `prefers-reduced-motion` for decorative and viewport animations.
- Keep decorative avatars/images out of the accessibility tree where they add no semantic information.
- Preserve keyboard navigation and visible focus states.
- Avoid animation that shifts layout after load.
- Use responsive images/assets with explicit dimensions where practical.
- Do not make the homepage dependent on live Community API data for decorative demo visuals.

## Testing
Add or update homepage regression tests to verify:
- launch timer/countdown is absent;
- Private Gubs and Communities are both represented;
- `/communities` is linked from the homepage;
- `Group Goals` no longer appears;
- core section headings/copy render;
- existing header/footer/legal links remain present;
- no obvious responsive overflow classes or removed accessibility hooks regress in rendered markup.

Run the repository's existing lint/build/test flow after implementation.

## Non-goals
- Redesigning `/communities` or `/community/[slug]` in this pass.
- Changing Firestore schema, API behavior or Cloudflare cache behavior.
- Introducing account/auth changes.
- Using one fixed mascot character instead of the approved varied purple avatar family.
