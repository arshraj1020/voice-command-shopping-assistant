# Voice Command Shopping Assistant

A voice-first shopping list manager. Speak naturally — *"add milk"*, *"two apples"*,
*"I need two bottles of water"*, *"find toothpaste under ₹500"* — and the application
interprets the intent, extracts the item, quantity and unit, categorises the product,
and updates the list. It also suggests what you are likely to need next.

Built as a technical assessment under an 8-hour budget, with a deliberately small
footprint: **two runtime dependencies** (`react`, `react-dom`), no backend, no
database, no API keys, and no paid services.

---

## Table of Contents

- [Live Demo](#live-demo)
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Voice / NLP Pipeline](#voice--nlp-pipeline)
- [Natural-Language Commands](#natural-language-commands)
- [Multilingual Support](#multilingual-support)
- [Shopping List Management](#shopping-list-management)
- [Product Search](#product-search)
- [Smart Suggestions](#smart-suggestions)
- [Mobile and Voice-First UX](#mobile-and-voice-first-ux)
- [Error Handling](#error-handling)
- [Setup](#setup)
- [Production Build](#production-build)
- [Testing](#testing)
- [Deployment](#deployment)
- [Browser Support](#browser-support)
- [Usage Reference](#usage-reference)
- [Known Limitations](#known-limitations)
- [Approach](#approach)

---

## Live Demo

> **Not yet deployed.** The repository is deployment-ready — see
> [Deployment](#deployment) for the one-command procedure. This section will
> carry the live URL once deployed; no URL is claimed until it exists.

Until then the application runs locally with `npm install && npm run dev`, which
serves it on `http://localhost:5173` — a secure context, so the microphone works.

---

## Overview

**The problem.** Shopping lists are usually managed by typing, which is
inconvenient in exactly the situations where lists are most often updated: while
cooking, while unpacking groceries, or while moving through a store with your
hands full.

**The solution.** Make voice the primary input, and reduce the manual effort of
list-keeping in three ways:

1. **Hands-free capture** — spoken commands are understood without rigid,
   memorised syntax.
2. **Automatic organisation** — items are categorised and quantified without the
   user specifying any structure.
3. **Anticipation** — the application suggests items rather than waiting to be
   told.

Voice is a transport layer, not a separate feature: a spoken command and the
identical typed command run the same code from the transcript onward, so they
cannot diverge, and the app stays fully usable without a microphone.

---

## Features

Everything listed here is implemented, and is either covered by the test suite or
directly visible in the UI.

### Voice input
- **Voice command recognition** — browser-native speech capture with a managed
  session that survives mid-sentence pauses.
- **Natural-language understanding** — many phrasings of the same intent, plus
  tolerance for politeness and hesitation ("please add milk", "um add milk").
- **Multilingual commands** — English and Hindi, including a non-Latin script and
  a different word order.

### Shopping list management
- **Add, remove and update items** by voice or text.
- **Quantity and unit extraction** — "add 2 bottles of water", "2 kg rice",
  "a dozen eggs", "two apples".
- **Automatic categorisation** into 11 store-aisle categories.
- **Merge on duplicate** — adding an item already on the list increases its
  quantity instead of creating a second row.
- **Persistence** — the list, the purchase history and the language choice
  survive a reload.

### Voice-activated search
- **Product search** by spoken query.
- **Brand filtering** — brands are derived from the catalog, not hardcoded.
- **Size filtering** — "500 ml" matches a product listed as 0.5 l.
- **Price filtering** — "under ₹500", "over ₹1000", "between ₹100 and ₹500".
- **Attribute filtering** — organic, sugar-free, whole-grain, low-fat,
  gluten-free.
- **Removable filter chips** that show exactly which constraints were heard.

### Smart suggestions
- **History-based recommendations** from what you actually add.
- **Seasonal recommendations** from a month-by-month produce table.
- **Sale recommendations** ranked by discount depth.
- **Product substitutes**, offered automatically for items on the list *and* on
  request ("alternative to milk").

### UI / UX
- **Minimalist interface** — the shopping list is the page; the command dock is
  pinned within thumb reach.
- **Real-time visual feedback** — live transcript, microphone state, and a chip
  row showing exactly how the command was parsed.
- **Mobile-first, voice-first layout.**
- **Loading and processing states** driven by a single microphone state machine.
- **Error handling** for unsupported browsers, denied microphones, unreadable
  commands, corrupted storage and unexpected render failures.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI framework | **React 18** | Component boundaries with clear state ownership |
| Build tool | **Vite 8** | Minimal configuration, fast feedback, small production build |
| Language | **TypeScript 5.6** (strict) | Type definitions double as data-model documentation |
| Speech recognition | **Web Speech API** | Browser-native, free, no API key — therefore no secrets in this repository — and language switching is built in |
| NLP | **Custom rule-based parser** | Small, deterministic, dependency-free; predictable and testable, with no external service cost |
| State | **`useReducer` + Context** | One reducer owns every transition, so list, history and suggestions update atomically |
| Persistence | **`localStorage`** | Meets the brief's persistence needs without a backend or accounts |
| Styling | **Plain CSS** with custom properties | No extra dependency or build step for an app this size |
| Tests | **`node:test`** run through `tsx` | Node's built-in runner; no test framework to install |
| Hosting | **Vercel** (static) | Free tier, automatic HTTPS — which the microphone requires |

Runtime dependencies: `react` and `react-dom`. Nothing else ships to the browser.
Production bundle: **≈203 KB JS (65 KB gzipped)** and **16 KB CSS (3.5 KB gzipped)**.

---

## Architecture

```
        UI Components (React)          components/ · hooks/
                 │
                 ▼
        Application State              state/  (reducer + context)
                 │
                 ▼
   Pure Business-Logic Functions       lib/    (parser · quantity · categorize ·
                 │                              search · suggestions · storage)
                 ▼
          Static Data                  data/   (lexicon · catalog · categories ·
                 │                              seasonal · substitutes)
                 ▼
      Local Persistence                localStorage
```

Dependencies point in one direction only: `data/` knows nothing about `lib/`,
`lib/` knows nothing about `state/`, and `state/` knows nothing about
`components/`.

Three deliberate decisions hold the design together:

- **Business logic lives in pure functions.** Nothing in `lib/` touches React,
  the DOM, the network or the clock — `generateSuggestions()` takes the month as
  a parameter, and `ADD_ITEM` takes `id` and `addedAt` in its payload. That is
  what lets the test suite run with no mocks at all.
- **Every state transition flows through one reducer.** Features that depend on
  one another (list, history, suggestions) update together rather than through
  competing effects. Because every add — spoken, typed, from a search result, or
  from a suggestion — reaches the same `ADD_ITEM`, purchase history can never
  miss one.
- **Voice and text share one execution path.** `parseCommand()` and
  `runCommand()` are the only route from an utterance to a state change.

### Why there is no backend

The brief asks for a working, hosted, zero-cost application within 8 hours. Every
capability it requires can be met client-side:

- Speech recognition is provided by the browser, not a server.
- Command interpretation is deterministic rule-based logic, so there is nothing
  to run remotely.
- The product catalog is sample data; there is no free real-time grocery API to
  call.
- The list belongs to one person on one device, so `localStorage` is sufficient —
  no accounts, no sync, and no personal data leaving the browser.

A server would add cost, latency, deployment complexity and an attack surface
without improving any assessed behaviour. The trade-off is explicit: no
cross-device sync, and no shared lists.

---

## Voice / NLP Pipeline

```
Voice input                 tap the mic (managed session, not press-and-hold)
      ↓
Speech recognition          Web Speech API, locale from the language selector,
      ↓                     3 ranked hypotheses per utterance
Transcript normalisation    repair the transcript, then lowercase, expand
      ↓                     contractions, strip punctuation, convert number
      ↓                     words and Devanagari digits, strip lead noise
Intent detection            ordered rules, most specific first:
      ↓                     help → clear → update → substitute → remove →
      ↓                     search → add → verbless add
Entity / quantity extraction  number + unit, article + unit, or a bare count;
      ↓                     then filler stripping, alias resolution and
      ↓                     canonicalisation of the item name
Command execution           runCommand() maps the parsed command to an action
      ↓
Shopping state              one reducer: list + purchase history
      ↓
UI feedback                 message, parsed-intent chips, updated list
```

### Session management

The browser's own end-of-speech detection ends a session on any hesitation, which
truncates commands. `useSpeechRecognition` owns the session lifecycle instead:

- `continuous: true` keeps the recogniser open across pauses.
- A 2-second silence timer decides when the user actually finished.
- A spontaneous `onend` reopens the recogniser transparently (up to 8 times),
  preserving everything captured so far — the user simply stays in "Listening…".
- The command is delivered exactly once, when the session really ends.
- Three independent safety nets bound it: a 15-second hard session cap, a
  1-second stop grace period, and the restart ceiling.

### Using the parser as a re-ranker

The recogniser returns up to three ranked hypotheses. Each is repaired
(`collapseRepeatedTail` removes the "add milk add milk" seam that restarts cause;
`trimTrailingFillers` removes the hallucinated trailing word in "add water bottle
with"), then the parser picks the first hypothesis that reads as a confident
command. The top acoustic guess is not always the most sensible one.

### Safety rule

The parser prefers a false negative over a destructive false positive. Anything
it cannot read confidently — nonsense, questions, multi-item commands, an item
name with a stray number in it — returns `unknown` or low confidence, and the
execution layer **refuses to modify the list**. Clearing the list is the only
irreversible command, and it is the only one that asks for confirmation first.

---

## Natural-Language Commands

Commands are interpreted by a rule-based parser written for this project. There
is no NLP library, no machine-learning model and no external API — the pipeline
is deterministic pure functions, which keeps it fast, offline, free and testable.

**Intents:** `add`, `remove`, `update`, `clear`, `search`, `substitute`, `help`,
`unknown`.

| Command | Result |
|---|---|
| `add milk` · `I need apples` · `I want to buy bananas` | adds one item |
| `put rice on my list` · `get me eggs` · `pick up toothpaste` | adds one item |
| `please add milk` · `can you add milk` · `um add milk` | adds one item |
| `two apples` · `2 kg rice` · `a dozen eggs` · `milk` | adds without a command verb |
| `add 2 bottles of water` · `buy 5 oranges` · `add 500 ml milk` | adds with quantity and unit |
| `remove milk` · `delete bread` · `take eggs off my list` | removes an item |
| `change apples to 5` · `set milk to 2` · `make apples 3` | changes a quantity |
| `find organic apples` · `find toothpaste under ₹500` | searches the catalog |
| `alternative to milk` · `substitute for bread` | offers alternatives |
| `clear my list` · `remove everything` | clears the list (asks first) |
| `help` · `what can I say` | lists the supported commands |

### Politeness and hesitation

Every intent pattern is anchored to the start of the utterance, so a single word
in front of the verb would otherwise make the command unreadable — and speech
transcripts routinely open with "um", "okay", "so" or "please". `stripLeadNoise()`
peels up to three such words (38 in English, 10 in Hindi) before intent
detection, and never empties the utterance: "please" on its own stays `unknown`.

### Commands without a verb

People say "two apples" as often as "add two apples", and recognition drops
leading verbs. When no intent pattern matches, the parser tries one last reading
as an add — but the gate is narrow. What remains must resolve to a name the
categoriser recognises **exactly**; merely containing a keyword is not enough:

| Accepted | Refused |
|---|---|
| `two apples` → add apple ×2 | `what about milk` → `unknown` |
| `2 kg rice` → add rice, 2 kg | `do you have milk` → `unknown` |
| `a dozen eggs` → add egg, 1 dozen | `what is the weather` → `unknown` |
| `milk` → add milk | `asdkjhasd` → `unknown` |

---

## Multilingual Support

Two languages: **English** (`en-US`) and **Hindi** (`hi-IN`). Selecting a language
switches both the speech-recognition locale and the parser's vocabulary; the
choice takes effect on the next recognition session and is remembered across
reloads.

Only the words differ — the parsing pipeline is shared. Each language contributes
its own intent markers, number words, unit words, fillers, lead noise and a
product alias table. English is verb-first (*"add milk"*); Hindi is verb-final
(*"दूध जोड़ो"*), so markers are matched as prefixes in one and suffixes in the
other. Everything after that is identical code. Because `\b` only understands
ASCII word characters, Devanagari markers use a script-agnostic boundary instead.

Product aliases resolve spoken names onto **canonical English names** —
`दूध` → `milk`, `सेब` → `apple`, `पानी` → `water` — so the list, categories,
history and catalog stay in one namespace whatever language a command was given
in. Devanagari digits (`०-९`) are normalised to ASCII, and Hindi number and unit
words are understood (`दो बोतल` → 2 bottles, `एक किलो` → 1 kg).

Working Hindi examples:

```
दूध जोड़ो                add milk
मुझे सेब चाहिए            add apple
दो बोतल पानी जोड़ो        add water ×2, unit bottle
एक किलो चावल जोड़ो        add rice, 1 kg
दूध हटाओ                 remove milk
दूध नहीं चाहिए            remove milk   (matched before "add", so this removes)
सेब को 5 कर दो            update apple to 5
मेरी सूची साफ करो         clear the list
टूथपेस्ट खोजो             search for toothpaste
दूध का विकल्प             alternatives to milk
```

**The real limitation:** the Hindi product vocabulary is the **46 aliases** in
`src/data/lexicon.ts`. A spoken Hindi word outside that table cannot be mapped
into the canonical namespace, so it is refused as low-confidence rather than
guessed at — safer than adding an uncategorisable item, but it does mean Hindi
item coverage is exactly those 46 nouns. UI labels remain in English: the
requirement is multilingual *commands*, not a localised interface.

---

## Shopping List Management

- **Add / remove / update** by voice or text, all through one reducer.
- **Automatic categorisation** into 11 aisle categories from a 185-keyword table.
  Matching runs most-specific-first — exact name, exact singular, whole-phrase
  containment, then per-word — which is what keeps "ice cream" in Frozen, "dish
  soap" in Household, and "almond milk" in Dairy rather than Snacks.
- **Merge on duplicate.** Adding an item already on the list increases its
  quantity rather than creating a second row.
- **A quantity of zero or less removes the item.**
- **Clearing the list does not erase purchase history** — what you usually buy is
  separate from what you are buying today.
- **Items are grouped by category** in store-aisle order, each row with a
  checkbox, a quantity stepper and a delete action.

---

## Product Search

Search reads a static catalog and **never modifies the shopping list**. Adding a
result goes through the same `addItem()` action a spoken "add" uses.

```
"find Colgate under ₹300"
        ↓  same parser, search intent
SearchFilters { query, brand, minPrice, maxPrice, size, attributes }
        ↓  searchProducts(catalog, filters)
results  →  removable filter chips + product cards
```

Filters are extracted most-specific-first, each stage consuming its own tokens:

1. **Price** — `under ₹500`, `below 500 rupees`, `less than Rs 500`,
   `under INR 500`, `over ₹1000`, `between ₹200 and ₹500`. Price is consumed
   *first*, so the "500" in "under ₹500" can never be mistaken for a size.
2. **Size** — `500 ml`, `1 l`, `250 g`, `1 kg`, normalised to a common base so
   `1 L` matches a product listed as `1000 ml`.
3. **Brand** — matched against the brands actually present in the catalog.
4. **Attributes** — organic, sugar-free, whole-grain, low-fat, gluten-free, each
   with spoken variants (`sugar free`, `wholegrain`).
5. **Query** — whatever meaningful words survive.

Results are ordered deterministically: in stock first, then cheapest, then
alphabetical. Every extracted filter becomes a removable chip, so it is obvious
which constraints were actually heard — and dropping one re-runs the search
immediately.

### Currency

**The demo catalog is priced in Indian Rupees (₹).** The parser understands a
price given with any currency symbol, including `$`, but reads it as a *number* —
the catalog has no exchange rate and no second currency. So
`find toothpaste under $5` is understood as "under 5", correctly returns nothing,
and the results panel says why: the header is labelled `Prices in ₹ · demo
catalog`, and the empty state explains the mismatch and suggests `under ₹500`.
This is a data limitation made visible, not a parsing failure.

The catalog holds **33 invented products** across 8 categories and 25 brands,
with sizes, prices, sale prices, stock flags and attribute tags. Prices are
plausible retail-style INR figures written for this assessment — not live pricing
and not real inventory.

---

## Smart Suggestions

Five generators feed one panel, each keeping its own reason so it is always clear
*why* something is recommended.

```
requested substitute → automatic substitute → history → sale → seasonal
                              ↓
                  deduplicate by name, cap at 6
```

| Source | Trigger | Example reason |
|---|---|---|
| **Requested substitute** | you asked: "alternative to milk" | *Instead of milk — dairy-free alternative* |
| **Automatic substitute** | an item on the list has a curated alternative | *Amul Butter is out of stock — dairy-free alternative* |
| **History** | added ≥ 2 times, not currently on the list | *You buy this often* |
| **Sale** | catalog `onSale`, in stock, not on the list | *On sale — ₹45 (was ₹60)* |
| **Seasonal** | in season for the current month | *In season now* |

**Recommendations are rule-based and local, not machine learning.** Ranking is
deliberately plain: history by frequency then recency, sales by deepest discount,
seasonal by the month table. No model, and no scoring heuristic that cannot be
read off the page. This is a considered trade-off — for a list of this size, a
deterministic rule the user can predict is more useful than a model that cannot
be explained, and it costs nothing to run.

**History is a real feedback loop.** Every add flows through the same `ADD_ITEM`,
which is where the count is incremented, so recommendations sharpen as the list
is used.

**Substitutes have two strengths.** If *every* catalog entry for an item is out
of stock, the card is prominent and names the unavailable product. If the item is
available, it is a softer alternative. Both offer **Replace**, which removes the
original and adds the substitute, carrying quantity and unit across. Asking out
loud ("alternative to milk") uses the same table and the same card — there is one
substitute implementation, not two.

### Disclosures

- **The purchase history is seeded demo data.** A brand-new browser has no
  history, which would leave this feature invisible on first visit. On first run
  only, a small synthetic history (milk, bread, eggs, bananas, rice, apples,
  toothpaste) is written so recommendations can be seen immediately. **It is not
  real user history.** The panel has a **Reset history** button that clears it
  permanently — the storage layer distinguishes "never stored" from "deliberately
  emptied", so the seed does not come back.
- **The catalog, its prices, its sale flags and its stock levels are simulated
  sample data.** `inStock` is a static field, not a live inventory feed.
- **Seasonality assumes the Northern Hemisphere.** The brief does not specify a
  region and there is no seasonal API; `src/data/seasonal.ts` is a small static
  month-to-produce table.

---

## Mobile and Voice-First UX

The layout is a phone layout scaled up, not a desktop layout squeezed down:

- `min-height: 100dvh`, so the mobile URL bar does not clip the page.
- `env(safe-area-inset-bottom)` padding on the command dock, for notched devices.
- A 16px base font size on the input, so iOS never zooms on focus.
- A 44px minimum touch target around every control — the 22px checkbox gets a
  44px label wrapper, and the `.hit-44` utility does the same elsewhere.
- The command dock is **fixed to the bottom**, so the microphone stays in thumb
  reach and never scrolls away. A voice-first app whose microphone disappears is
  not voice-first.
- `enterKeyHint="send"` on the command input.
- A 560px content column, centred on wider screens.
- `prefers-reduced-motion` respected.

**Voice-only flow:** tap the mic and speak; the transcript appears live. On a
confident command the list updates with a plain-language confirmation. On an
unreadable one the transcript is *staged in the text box* — focused, caret at the
end — so the last word can be corrected with one tap instead of repeating the
whole sentence. On a browser with no speech recognition the mic button is not
rendered at all and the text box does everything.

**Not tested on physical hardware.** This was developed and verified in a desktop
browser and at mobile viewport sizes. It has **not** been tested on a real phone,
so iOS Safari's handling of continuous recognition in particular is unverified —
see [Known Limitations](#known-limitations).

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Microphone permission denied | Status becomes `denied`, the button shows a muted-mic glyph, and the message names both the fix and the text fallback. Retryable. |
| No speech detected | Not treated as fatal — anything already captured is still delivered; only a genuinely empty session reports "No speech detected." |
| No microphone hardware | "No microphone was found. Check your device audio settings." |
| Browser without speech recognition | Feature-detected at startup. The mic button is not rendered (a permanently dead primary button is worse than none) and a banner explains that typing does everything voice does. |
| Unrecognised command | Never modifies the list. Shows what was heard verbatim, plus tappable example commands that run on click. |
| Low-confidence command | Refused, with a message naming the ambiguous item. |
| Unidentifiable non-Latin item | Its own message — "I couldn't identify that item" — rather than the generic one. |
| Item not on the list | Reported as information, not an error. |
| No search results | Empty state suggesting which filter to drop, plus the currency note when a price filter is active. |
| Speech service unreachable | The `network` error is mapped to a plain-language message. |
| Recogniser hangs | Bounded by a 15s session cap, a 1s stop grace period and a restart ceiling. |
| `localStorage` unavailable or full | Every read and write is guarded; the app continues in memory. |
| Corrupted stored data | Treated as hostile input: every field is validated and rebuilt, malformed entries are dropped, nothing throws. |
| Unexpected render error | An `ErrorBoundary` catches it and offers a reload instead of a blank page. |

**Loading states.** A six-state microphone machine (`idle`, `listening`,
`processing`, `unsupported`, `denied`, `error`) drives the button glyph, the
status line and the disabled state together, so they cannot disagree. The
`processing` state is held briefly so the transition is perceivable. Parsing,
search, suggestions and persistence are all synchronous local operations — there
is no network wait to cover, so those results appear immediately by design.

---

## Setup

**Requirements:** Node.js 18 or newer (see `.nvmrc`) and npm.

```bash
git clone https://github.com/arshraj1020/voice-command-shopping-assistant.git
cd voice-command-shopping-assistant
npm install
npm run dev
```

Then open `http://localhost:5173`.

`localhost` counts as a secure context, so the microphone works in development.
Serving the dev server over a plain `http://` LAN address will not — speech
recognition requires HTTPS or localhost.

No environment variables and no `.env` file are required. The Web Speech API
needs no key, so there are no secrets in this repository.

---

## Production Build

```bash
npm run build
```

This runs `tsc --noEmit` — a strict type-check of the whole project — and then
`vite build`. Output goes to `dist/`:

```
dist/index.html                 0.70 kB │ gzip:  0.40 kB
dist/assets/index-*.css        16.14 kB │ gzip:  3.50 kB
dist/assets/index-*.js        203.17 kB │ gzip: 65.16 kB
```

`dist/` is a self-contained static bundle that any static host can serve.
Preview it locally with `npm run preview`.

---

## Testing

```bash
npm test
```

**53 tests across 5 files**, using Node's built-in test runner (`node:test`) via
`tsx`. No test framework is installed — the only devDependency added for testing
is the TypeScript runner itself. The `lib/` layer is pure, so no mocks, no DOM
and no fake timers are needed.

| File | Covers |
|---|---|
| `tests/parser.test.ts` | Intent detection, phrasing variety, lead-noise stripping, verbless adds, quantity and unit extraction, substitute requests, Hindi commands, rejection of nonsense |
| `tests/categorize.test.ts` | Aisle assignment, plant milks, longest-keyword precedence, plurals and casing, the `isKnownItemName` gate |
| `tests/search.test.ts` | Filter extraction for price, size, brand and attributes; result correctness and ordering; catalog immutability |
| `tests/suggestions.test.ts` | History, seasonal, sale and substitute generators; requested substitutes; deduplication; determinism |
| `tests/shoppingList.test.ts` | Reducer transitions, merge-on-duplicate, canonical names, a full multi-command session, storage sanitisation |

What the tests do **not** cover: React component rendering and the Web Speech API
itself. Both need a browser environment, and adding one was out of scope for the
time budget — the speech hook is deliberately thin, with all interpretation
living in the tested pure layer.

---

## Deployment

The application is a static Vite SPA with no server-side component, so deployment
is one command. `vercel.json` and `.nvmrc` are committed; nothing else is needed.

```bash
npm i -g vercel
vercel --prod
```

Vercel auto-detects Vite, runs `npm run build`, publishes `dist/`, and provisions
HTTPS automatically — which matters here, because the Web Speech API only runs in
a secure context.

Any static host works equally well (Netlify, Firebase Hosting, GitHub Pages,
Cloudflare Pages): build with `npm run build` and serve `dist/`. The committed
rewrite rule sends unknown paths to `index.html`.

After deploying, put the URL in the [Live Demo](#live-demo) section above and in
the repository's **About → Website** field.

---

## Browser Support

Speech recognition depends entirely on the browser's Web Speech API, which is
**not** universally available. The application feature-detects it at startup and
degrades to the text command box — every feature works identically by typing.

| Browser | Voice input | Everything else |
|---|---|---|
| Chrome / Edge (desktop) | Supported | Supported |
| Chrome (Android) | Supported | Supported |
| Safari (macOS / iOS) | Supported via `webkitSpeechRecognition`, but continuous sessions are unreliable — the managed restart loop is the mitigation, and this path is **untested on hardware** | Supported |
| Firefox (all platforms) | **Not supported** — no Web Speech API. The mic button is hidden and a banner explains the text fallback | Supported |
| iOS Chrome / Firefox | **Not supported** — WebKit shells without the entitlement | Supported |

Two further requirements: the page must be served over **HTTPS or localhost**,
and Chrome's implementation sends audio to Google's servers for transcription.

No claim of universal browser support is made.

---

## Usage Reference

### English

```
add milk
I need apples
I want to buy bananas
please add milk
can you add milk
I would like to add milk
add 2 bottles of water
two apples
2 kg rice
three bottles of milk
a dozen eggs
remove milk
take eggs off my list
change apples to 5
find organic apples
find toothpaste under ₹500
find Colgate under ₹300
find products between ₹100 and ₹500
alternative to milk
substitute for bread
clear my list
help
```

### Hindi

```
दूध जोड़ो
मुझे सेब चाहिए
दो बोतल पानी जोड़ो
एक किलो चावल जोड़ो
दूध हटाओ
दूध नहीं चाहिए
सेब को 5 कर दो
मेरी सूची साफ करो
टूथपेस्ट खोजो
दूध का विकल्प
```

### Keyboard

`/` focuses the command box · `Enter` runs it · `Esc` closes search results.

---

## Known Limitations

Stated plainly rather than left to be discovered:

1. **Voice availability is the browser's, not ours.** Firefox and iOS
   Chrome/Firefox have no Web Speech API. HTTPS or localhost is required.
2. **Not tested on physical mobile hardware.** The layout is mobile-first and was
   verified at mobile viewport sizes, but iOS Safari's handling of continuous
   recognition is unverified on a real device.
3. **Hindi product vocabulary is 46 aliases.** A Hindi noun outside that table is
   refused rather than guessed at.
4. **The product catalog is static sample data** — 33 invented products. There is
   no product API and no live inventory; `inStock` and `onSale` are fixed fields.
5. **Prices are simulated INR values.** A price spoken in another currency is
   read as a plain number; the UI explains this rather than converting.
6. **Seasonal data is a static Northern-Hemisphere table.**
7. **Purchase history is seeded with demo data on first run** — disclosed in the
   UI and resettable.
8. **Recommendations are rule-based, not machine-learned.**
9. **No backend, no accounts, no sync.** The list lives in one browser; clearing
   site data clears the list.
10. **One item per command.** "add milk and bread" is deliberately refused rather
    than half-executed.
11. **No component or end-to-end tests** — the tested layer is the pure logic.

---

## Approach

*The 200-word write-up required by the assessment. Also available as
[`APPROACH.md`](APPROACH.md).*

Shopping lists get edited exactly when hands are busy, so voice is the primary
input and typing is the permanent fallback — both run the same code path.

Speech comes from the browser's Web Speech API: free, no API key, no secret in
the repository. Because the browser ends a session on any pause, the hook owns
the session instead — continuous capture, a silence timer, transparent restarts,
and the parser re-ranking the recogniser's alternatives.

Interpretation is a hand-written rule-based parser rather than an LLM:
deterministic, offline, zero-cost, testable as pure functions. One pipeline
serves both languages; only the vocabulary differs, so Hindi's verb-final order
and non-Latin script needed markers and an alias table, not a second parser. The
parser prefers refusing to guessing — anything ambiguous never touches the list.

State flows through one reducer, so list, categories and purchase history update
atomically and recommendations recompute from real usage. Suggestions combine
history, seasonality, sales and substitutes with plain, explainable ranking.

No backend: everything required is client-side, so a server would add cost and
latency without improving behaviour. The trade-off is no cross-device sync.

---

Built for a technical assessment. Public repository, `main` branch.
