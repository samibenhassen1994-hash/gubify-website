# Gubify Interactive World Homepage — Design

## Goal
Rebuild only the Gubify homepage from a clean `main` base into an interactive, highly visual landing experience that is faithful to the current Flutter app while using the visual language of the approved purple Gubify poster artwork.

The homepage must explain clearly, at a glance and through interaction, what users can do in:

- Private Gubs
- Public Communities

The phone mockup is not decorative: it is the central interactive product demo.

## Scope
This redesign applies only to `/`.

Existing routes and systems stay functionally unchanged, including:

- `/communities`
- `/community/[slug]`
- support pages
- legal pages
- fundraising
- pre-registration
- Community API
- Firestore data access
- Cloudflare Worker caching
- sitemap behavior

No backend change is required for this homepage.

## Source of Truth for Product UI
The homepage phone demo must follow the current Flutter app as closely as practical.

The current app branch used as product reference is:

`feature/user-block-and-chat-reporting`

Private Gub capabilities reflected in the demo and explanatory visuals:

- private chat
- member list / member count
- invite flow / invite code concept
- Board
- Tasks
- Calendar
- Events
- Proposals & Voting
- Shared Budget
- message-to-task / message-to-action behavior where appropriate

Community capabilities reflected in the demo and explanatory visuals:

- Community discovery / Explorer
- public Community details
- Community membership
- join / request-access concept
- Community chat
- Ask section
- Ask details and replies
- Best Answer
- XP / leveling
- Community leaderboard
- Community members
- public web discoverability through existing website Community pages

Do not advertise removed or unimplemented functionality.

## Visual Identity
The approved poster artwork is the primary visual reference.

The homepage should use the same perceived palette and atmosphere:

- deep indigo / violet background
- luminous purple gradients
- lavender and near-white primary text
- transparent/glass purple bubbles
- glowing orbit lines
- stars and small sparkles
- soft violet clouds / nebula forms
- subtle pink and warm-yellow accent details

Reference palette:

- `#1D0D5E`
- `#341C91`
- `#512FBA`
- `#7B4CE7`
- `#B27DF9`
- `#E7C8F7`

Exact contrast values may be adjusted for accessibility while preserving the visual match.

## Avatar Art Direction
Do not generate avatars using CSS circles or primitive geometric bodies.

The avatar system uses real transparent character artwork. Initial approved transparent PNG assets supplied by the user:

- `avatar-fantasma.png`
- `avatar-bolla.png`
- `avatar-nano.png`

These characters may be scaled, rotated slightly, floated, animated and positioned in the environment, but their artwork itself should remain recognizable and undistorted.

The homepage should feel like a family of different Gubify creatures, not one fixed mascot.

Additional artwork may later be generated in the same visual language if needed, but the first implementation must already use the supplied real assets instead of CSS placeholders.

## Background World
The homepage background is a continuous Gubify world rather than a sequence of disconnected white cards.

Required motifs:

- deep purple star field
- scattered glowing stars
- soft purple cloud banks near section boundaries and lower edges
- large blurred nebula forms at the sides
- glass bubbles and orbit lines used selectively
- subtle depth and parallax on desktop

The world must stay readable. Decorative density should reduce behind long text and interaction controls.

## Information Architecture
The homepage should contain fewer, stronger sections than the rejected redesign.

Final order:

1. Interactive Hero / Gubify World
2. Private Gubs
3. Communities
4. Ask → Best Answer → XP / Level Up
5. Leaderboard & Recognition
6. Final CTA

The page must retain compatible anchor targets for the existing site header where practical.

## 1. Interactive Hero
Primary message:

`Build your world together.`

Supporting copy should explain both product modes in plain language:

`Create private spaces with the people you already know, or discover Communities built around what you love.`

### Hero Composition
Desktop:

- copy on one side
- large interactive phone on the other
- real transparent avatar artwork around the phone
- glass navigation bubbles around the central composition
- purple cloud masses and stars in the background

Mobile:

- heading
- supporting copy
- primary CTAs
- interactive phone
- compact bubble navigation
- avatars placed without obscuring controls

### Hero Bubble Navigation
Provide real clickable controls for:

- `Private Gubs`
- `Communities`
- `Ask & Best Answer`
- `Leaderboard`
- `Explore Communities`

The first four scroll to their corresponding homepage sections.

`Explore Communities` links to `/communities`.

### Hero Phone Mode Switch
The phone supports at minimum two primary modes:

- `Private Gub`
- `Community`

A visible segmented control / tab treatment allows switching between them.

The initial state may be Private Gub.

## 2. Private Gubs Section
Primary heading:

`Your private space. More than a chat.`

The goal is immediate understanding of what Private Gubs do.

### Interactive Phone Flow
The Private Gub phone should visually mirror the Flutter app structure as closely as practical for a marketing demo.

The user can move through representative states such as:

- Gub dashboard
- chat
- action modules

The dashboard should visibly communicate:

- Tasks
- Calendar
- Proposals
- Events
- Shared Budget
- members
- Board

The chat demo should include at least one meaningful interaction. A user can select / hold / click a message and open a conversion action menu with real clickable options:

- Task
- Event
- Proposal
- Shared Budget

Selecting an option changes the demo state and shows a created action confirmation/card.

This is local demo state only; it does not write to Firestore.

### Private Gub Poster-Style Visual
Beside or behind the demo, show an explanatory visual composition in the same 3D/glowing style as the approved poster.

The image should visually communicate the concepts rather than repeat a feature list.

Required concepts:

- chat / conversation
- task / checklist
- calendar / event
- voting / proposal
- shared budget
- close group / members

Supporting copy should remain short and scannable:

`Chat together · Organize tasks · Plan events · Vote on proposals · Manage a shared budget`

## 3. Communities Section
Primary heading:

`Find people who love what you love.`

This section should feel more open and expansive than Private Gubs.

### Interactive Phone Flow
The Community phone mode should visually follow the app's Community experience.

Representative states:

- Explorer / discovery
- Community public/details view
- joined Community home/chat
- Ask

The user can interact with a simple discovery flow:

- choose or type an interest
- see sample Community results
- open a Community card
- enter the Community demo

Sample categories can include Gaming, Tech, Music, Fitness, Travel and Anime.

Demo content must be clearly illustrative and must not falsely claim that placeholder Communities are live database records.

### Explore Communities CTA
A prominent real link must lead to:

`/communities`

Use this CTA in both the Communities section and Hero bubble navigation.

### Community Poster-Style Visual
Show several supplied or same-style avatars connected to floating interest bubbles and Community bubbles.

The visual story should communicate:

`Discover → Join → Chat → Ask → Help → Grow`

Also communicate in plain language that public Communities can be discovered on the web, without requiring users to understand the term SEO.

## 4. Ask → Best Answer → XP / Level Up
Primary heading:

`Ask. Help. Level up.`

This section must be interactive rather than a static infographic.

### Interaction
Show a Community Ask screen or faithful simplified representation.

The user can:

1. view a question
2. view multiple replies
3. choose one reply as the demo `Best Answer`
4. see the selected reply highlighted
5. see an XP reward appear
6. see a level progress bar advance

No server persistence is required.

### Supporting Visual
Use the approved poster language: floating response windows, glow, avatar reactions, stars and XP reward elements.

Keep explanatory copy minimal:

`Great answers stand out.`

`Best Answers reward useful contributions with XP.`

`XP helps members level up inside their Community.`

## 5. Leaderboard & Recognition
Primary heading:

`Become one of the most valuable members.`

The section explains the connection:

`Helpful participation → Best Answers → XP → Level → Recognition`

### Visual
Use a poster-style podium with the real transparent Gubify avatars.

Display:

- 1st
- 2nd
- 3rd
- level
- Best Answer count

Use demo values and label them as illustrative where needed.

The tone is positive recognition for contribution, not aggressive competition.

## 6. Final CTA
Use a denser purple cloud bank, stars and multiple avatars to close the world visually.

Primary message:

`Your people are out there.`

Secondary message:

`Create your Private Gub or find a Community built around what you love.`

Primary actions:

- `Explore Communities` → `/communities`
- existing app / pre-registration path used by the current website

## Interactivity Principles
The rejected homepage failed because most visible elements looked interactive but were static.

This redesign follows these rules:

- anything styled as a button must do something
- bubble navigation must scroll or navigate
- phone tabs must change phone mode
- phone menu items must change demo state
- Community cards must open a demo state or real route where appropriate
- Ask replies used for Best Answer must be clickable
- XP / level feedback must react to the user action

Decorative stars, clouds and avatars do not need click behavior unless they are explicitly presented as controls.

## Client / Server Architecture
Keep the route mostly server-rendered, but use true client islands where interaction is central.

Suggested structure:

- `app/page.tsx` — homepage composition
- `app/home-interactive/home.module.css` — homepage world styling
- `app/home-interactive/interactive-phone.tsx` — client component; phone state machine
- `app/home-interactive/hero.tsx`
- `app/home-interactive/private-gubs-section.tsx`
- `app/home-interactive/communities-section.tsx`
- `app/home-interactive/ask-best-answer-section.tsx`
- `app/home-interactive/leaderboard-section.tsx`
- `app/home-interactive/final-cta.tsx`
- `app/home-interactive/section-nav.tsx`
- `public/home/` — supplied avatar art and homepage visual assets

Do not put the full redesign into `app/globals.css`.

### Interactive Phone State Model
A bounded client-side state machine should represent demo state only.

Suggested primary mode:

`private | community`

Suggested Private Gub screens:

`dashboard | chat | actionResult`

Suggested Community screens:

`explorer | details | communityHome | ask`

Suggested Ask state:

`unselected | bestAnswerSelected`

No live Firestore writes or authentication are required for demo interactions.

## Image / Artwork Strategy
Use the real supplied transparent avatar PNGs as first-class visual assets.

For larger explanatory images, create dedicated website compositions rather than inserting the full vertical poster as-is.

Desired image treatments:

- wide landscape desktop scene
- portrait / near-square mobile adaptation
- same purple/indigo color language
- same glossy 3D avatar rendering
- glass bubbles
- stars
- cloud forms
- minimal text baked into the image

Important explanatory text must remain HTML for accessibility, localization potential and responsive layout.

## Responsive Design
This must be designed as two compositions, not one layout scaled down.

### Desktop
- broad hero composition
- phone and explanatory art can sit side by side
- more avatar depth and floating bubble navigation
- subtle pointer parallax may be used
- section visuals may alternate left/right

### Mobile
- linear reading order
- larger touch controls
- phone nearly full available width but never overflows
- navigation bubbles become a compact horizontal scroll or wrapped control group
- poster visuals stack below key copy
- remove or simplify peripheral decoration
- no horizontal page overflow

Target layout bands:

- small phones: `<= 560px`
- large phones: `561–767px`
- tablet: `768–1024px`
- desktop: `>= 1025px`

## Motion
Motion should add life without making the page chaotic.

Allowed:

- gentle avatar float
- slow star shimmer
- small cloud drift
- phone state transitions
- bubble hover / press response
- XP pop animation
- level progress animation
- subtle desktop parallax

Avoid:

- constant large movement
- layout-shifting animations
- unreadable moving text
- excessive simultaneous animation

Respect `prefers-reduced-motion`.

## Accessibility
- retain a working skip link
- preserve keyboard navigation
- controls use real buttons/links
- focus states are clearly visible
- decorative stars/clouds are hidden from assistive technology
- meaningful phone demo regions receive accessible labels
- supplied avatar images use empty alt text when decorative and useful alt text when meaningful
- interactive phone can be used without pointer hover

## Existing Header / Footer
Preserve the existing `SiteHeader` and `LegalFooter` behavior unless a homepage-only visual override is required.

Keep existing homepage anchor compatibility where practical so header links do not become dead controls.

## Timer
Remove the launch countdown/timer completely from the homepage.

Do not replace it with another countdown.

## Testing
Add rendered-homepage and interaction-focused tests that verify at minimum:

- launch countdown is absent
- Private Gub and Community modes are present
- `/communities` is linked prominently
- Private Gub capability labels are present
- Community capability labels are present
- `Group Goals` is absent
- section anchors exist
- interactive phone controls have accessible names
- Best Answer demo controls exist
- existing header/footer/legal navigation is preserved

Where practical, isolate the interactive phone state reducer/state transitions into pure functions so they can be tested without a browser.

Run existing repository lint/build/test flows before the branch is considered review-ready.

## Non-goals
- redesigning `/communities`
- redesigning `/community/[slug]`
- changing the Flutter app
- connecting the phone demo to real user data
- changing Firestore
- changing authentication
- changing Cloudflare caching
- replacing the supplied avatar art with CSS approximations

## Review Criterion
A successful first local review should make these five things immediately obvious without explanation:

1. This visually belongs to the same Gubify world as the approved poster.
2. Private Gubs and Communities are both major parts of the product.
3. The phone is actually interactive.
4. The Private Gub feature set is understandable.
5. The Community loop — discover, join, ask, help, earn XP, level up — is understandable.
