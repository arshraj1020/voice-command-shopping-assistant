# Voice Command Shopping Assistant

> 🚧 **Currently in development.** Implementation is being completed in phases according to the technical assessment roadmap. See [Project Status](#project-status) for what is actually working today — everything else on this page describes the **planned** design, not finished work.

A voice-based shopping list manager that lets users add, remove, and modify items using natural spoken language, and provides smart shopping suggestions based on history, seasonality, and product alternatives.

---

## Table of Contents

- [Project Description](#project-description)
- [Assignment Objective](#assignment-objective)
- [Planned Features](#planned-features)
- [Planned Technology Stack](#planned-technology-stack)
- [Planned Architecture](#planned-architecture)
- [Planned Voice / NLP Flow](#planned-voice--nlp-flow)
- [Multilingual Scope](#multilingual-scope)
- [Natural-Language Commands](#natural-language-commands)
- [Voice Input](#voice-input)
- [Product Search](#product-search)
- [Project Status](#project-status)
- [Implementation Roadmap](#implementation-roadmap)
- [Assignment Constraints](#assignment-constraints)
- [Live Demo](#live-demo)
- [Screenshots](#screenshots)
- [Installation](#installation)
- [Usage](#usage)
- [Browser Support](#browser-support)
- [Architecture Details](#architecture-details)
- [Testing](#testing)
- [Limitations](#limitations)
- [Final Approach](#final-approach)

---

## Project Description

The Voice Command Shopping Assistant is a voice-first web application for managing a shopping list.

Instead of typing, the user speaks naturally — *"add milk"*, *"I need apples"*, *"add two bottles of water"* — and the application interprets the intent, extracts the relevant details (item, quantity, unit), categorizes the product automatically, and updates the shopping list.

Alongside list management, the application is intended to provide intelligent shopping suggestions: recommending items the user buys regularly, highlighting seasonal or discounted products, and offering substitutes when a preferred product is unavailable or an alternative may suit the user better.

## Assignment Objective

Shopping lists are typically managed by typing, which is inconvenient in exactly the situations where lists are most often updated — while cooking, while unpacking groceries, or while moving around a store with occupied hands.

This project addresses that problem by making voice the primary input method, and by reducing the manual effort of list-keeping in three ways:

1. **Hands-free capture** — spoken commands are understood without requiring rigid, memorized syntax.
2. **Automatic organization** — items are categorized and quantified without the user having to specify structure.
3. **Anticipation** — the application suggests items the user is likely to need rather than waiting to be told.

The goal is a small, reliable, well-documented application that demonstrates clear problem-solving and clean engineering within a strict time budget, rather than a broad but fragile feature set.

## Planned Features

The features required by the assignment brief. Ticked items are implemented; the rest are planned.

### Voice Input

- [x] **Voice command recognition** — add and manage list items by speaking
- [x] **Natural language command understanding** — recognize varied phrasings of the same intent (*"add bananas"*, *"I need bananas"*, *"I want to buy bananas"*)
- [x] **Multilingual voice commands** — English and Hindi

### Smart Suggestions

- [ ] **History-based product recommendations** — suggest items based on previous additions and frequency
- [ ] **Seasonal / on-sale recommendations** — surface products that are in season or discounted
- [ ] **Product substitutes** — offer alternatives when an item is unavailable or another option may suit the user

### Shopping List Management

- [x] **Add / remove / modify items** via voice commands
- [x] **Automatic categorization** — group items into categories such as produce, dairy, bakery, and snacks
- [x] **Quantity management** — interpret quantities and units (*"add 2 bottles of water"*, *"buy 5 oranges"*)

### Voice-Activated Search

- [x] **Voice product search** — find products by spoken query (*"find me organic apples"*)
- [x] **Brand filtering** — filter results by spoken brand name
- [x] **Size filtering** — filter results by spoken size or volume
- [x] **Price-range filtering** — filter results by spoken price constraint (*"find toothpaste under $5"*)

### UI / UX

- [ ] **Minimalist UI** — a clean interface focused on the shopping list *(functional; visual polish pending)*
- [x] **Real-time visual feedback** — show the recognized command and the resulting action as it happens
- [ ] **Mobile / voice-first experience** — designed for small screens and spoken interaction *(polish pending)*
- [x] **Loading states** — clear indication while speech is being processed
- [x] **Error handling** — graceful handling of unsupported browsers, denied microphone permissions, and unrecognized commands

## Planned Technology Stack

The stack chosen for this project. Everything below is now in place, with the exception of hosting.

| Layer | Planned choice | Rationale |
|---|---|---|
| UI framework | **React** | Fast to build component-based interfaces with clear state boundaries |
| Build tool | **Vite** | Minimal configuration, fast development feedback, small production build |
| Language | **TypeScript** | Type definitions double as data-model documentation and catch errors before runtime |
| Speech recognition | **Web Speech API** | Browser-native, free, requires no API key and therefore no secrets in the repository; language switching is built in |
| NLP | **Custom rule-based parser** | A small, deterministic, dependency-free module — predictable behaviour and no external service cost |
| Persistence | **localStorage** | Satisfies the persistence needs of the brief without a backend, account system, or hosting cost |
| Styling | **Plain CSS** (with CSS custom properties) | No additional dependency or build configuration for an application of this size |
| Hosting | **Vercel** | Free tier, automatic HTTPS (required for microphone access), and direct deployment from this repository |

The dependency footprint is intended to be kept deliberately small, in line with the assignment's submission guidelines.

## Planned Architecture

The intended architecture separates presentation from logic so that the interpretation of commands can be reasoned about, and tested, independently of the interface.

```
        UI Components (React)
                 │
                 ▼
        Application State
       (reducer + context)
                 │
                 ▼
   Pure Business-Logic Functions
 (parser · categorizer · search ·
       suggestion engine)
                 │
        ┌────────┴────────┐
        ▼                 ▼
 Speech Recognition   Static Product
      / NLP               Data
                 │
                 ▼
      Local Persistence
        (localStorage)
```

Key intentions:

- **Business logic lives in pure functions** with no React and no side effects, so command interpretation is isolated, readable, and independently verifiable.
- **All state transitions flow through a single reducer**, so features that depend on one another (list, history, suggestions) update atomically rather than through competing effects.
- **Voice commands and typed text commands will use the same parsing and execution path.** A spoken command and a typed command produce identical behaviour, which keeps the application fully usable when a microphone is unavailable and makes command interpretation straightforward to test.

## Planned Voice / NLP Flow

```
User speaks
      ↓
Speech Recognition        (Web Speech API, language-aware)
      ↓
Transcript                (interim text shown live, then finalized)
      ↓
Intent & Entity Parsing   (normalize → detect intent → extract
                           item, quantity, unit, filters)
      ↓
Command Execution         (map the parsed command to an action)
      ↓
State Update              (list, history, suggestions, search results)
      ↓
UI Feedback               (visible confirmation, or a clear message
                           when a command is not understood)
```

The transcript is intended to remain visible throughout, so the user can always see what was heard and how it was interpreted.

## Multilingual Scope

Two languages are supported:

- **English** — speech recognition locale `en-US`
- **Hindi** — speech recognition locale `hi-IN`

Selecting a language switches both the recognition locale and the vocabulary the parser uses. It takes effect on the next recognition session, and the choice is remembered across reloads.

Only the words differ between languages — the parsing pipeline is shared. Each language contributes its own intent markers, number words, unit words, fillers, and a product alias table. English is verb-first (*"add milk"*), Hindi is verb-final (*"दूध जोड़ो"*), so markers are matched as prefixes in one and suffixes in the other; everything after that is identical code.

Product aliases resolve spoken names onto **canonical English names** — `दूध` → `milk`, `सेब` → `apple`, `पानी` → `water` — so the shopping list, categories, and (later) history stay in one namespace regardless of the language a command was given in.

The assignment brief does not specify which languages must be supported. Two is the smallest scope that demonstrates the requirement properly, and Hindi in particular proves the architecture handles a non-Latin script and a different word order. UI labels remain in English; the requirement is multilingual *commands*, not a localised interface.

## Natural-Language Commands

Commands are interpreted by a small rule-based parser written for this project. There is no NLP library, no machine-learning model, and no external API — the whole pipeline is deterministic pure functions, which keeps it fast, offline, free, and testable.

```
raw input
   ↓  normalizeText()      lowercase · expand contractions · strip punctuation
   ↓                       · number words to digits · collapse whitespace
   ↓  detect intent        ordered keyword rules, most specific first
   ↓  extractQuantity()    number + unit, article + unit, or a bare count
   ↓  stripFillers()       "to my list", "please", "some", "the", …
   ↓  canonicalizeItemName()   lowercase + simple singularisation
   ↓
ParsedCommand { intent, item, quantity, unit, filters, language, raw, confidence }
   ↓  runCommand()         dispatches the existing shopping-list actions
   ↓
list update + visible feedback
```

**Intents:** `add`, `remove`, `update`, `clear`, `help`, `unknown`. (`search` is recognised as an intent but not executed — that arrives with the voice-search phase.)

**Examples that work**

| Command | Result |
|---|---|
| `add milk` · `I need apples` · `I want to buy bananas` | adds one item |
| `put rice on my list` · `get me eggs` | adds one item |
| `add 2 bottles of water` | adds water, quantity 2, unit bottle |
| `buy 5 oranges` · `add three apples` | adds with a plain count |
| `add a dozen eggs` · `add 500 ml milk` · `add 1 kg rice` | adds with a unit |
| `remove milk` · `delete bread` · `take eggs off my list` | removes an item |
| `change apples to 5` · `make apples 3` · `set milk to 2` | changes a quantity |
| `clear my list` · `empty my shopping list` · `remove everything` | clears the list |
| `help` | shows the supported commands |

**Safety rule.** The parser prefers a false negative over a destructive false positive. Anything it cannot match confidently — nonsense, questions, multi-item commands, an item name with a stray number in it — returns `unknown` or `low` confidence, and the execution layer refuses to modify the list. Every command shows both what was heard and what was understood, so an unexpected result is always explainable rather than mysterious.

## Voice Input

Speech is handled by the browser's own **Web Speech API** — no external service, no API key, and therefore no secret anywhere in this repository. Voice is a transport layer on top of the parser above, nothing more:

```
Speech Recognition   (Web Speech API, push-to-talk, locale from the selector)
        ↓
Transcript           (interim text shown live, then the final utterance)
        ↓
Shared NLP Parser    (the same parseCommand() the text box uses)
        ↓
Command Execution    (runCommand() → existing shopping-list actions)
        ↓
Shopping List
```

A spoken command and the identical typed command run the same code from the transcript onward, so they cannot diverge.

**Push-to-talk, not always-listening.** Mobile browsers end recognition on every pause, which makes a continuous session unreliable in exactly the setting this app is meant for.

**Microphone states.** `idle` → `listening` → `processing` → `idle`, plus `unsupported`, `denied`, and `error`. The button and the status line always reflect the real state, so it is never unclear whether the app is listening.

**Voice is never required.** The browser is feature-detected at startup. Where speech recognition is unavailable, the app says so plainly and the text command box — which is a permanent part of the interface, not a stopgap — does everything voice does.

Speech recognition also needs a secure context: it works on `localhost` and over HTTPS, but not over plain `http://` on a LAN address.

## Product Search

Search is a separate action from the shopping list: it reads a static catalog and **never modifies the list**. Adding a result to the list goes through the same `addItem()` action a spoken "add" uses.

```
"find Colgate under $5"
        ↓  same parser, search intent
SearchFilters { query, brand, minPrice, maxPrice, size, attributes }
        ↓  searchProducts(catalog, filters)
results  →  removable filter chips + product cards
```

**Filters are extracted most-specific-first**, each stage consuming its own tokens:

1. **Price** — `under $5`, `below $5`, `less than $5`, `over $10`, `above $10`, `between $5 and $10`. Price is consumed *first* so the "5" in "under $5" can never be mistaken for a size or a quantity.
2. **Size** — `500ml`, `1 l`, `250 g`, `1 kg`. Normalised to a common base, so `1L` matches a product listed as `1000 ml`.
3. **Brand** — matched against the brands actually present in the catalog, derived from the data rather than hardcoded.
4. **Attributes** — `organic`, `sugar-free`, `whole-grain`, `low-fat`, `gluten-free`, each with spoken variants (`sugar free`, `wholegrain`).
5. **Query** — whatever meaningful words survive.

**Examples**

| Command | Parsed as |
|---|---|
| `find me organic apples` | query `apples`, attribute `organic` |
| `find toothpaste under $5` | query `toothpaste`, maxPrice `5` |
| `find Colgate under $5` | brand `Colgate`, maxPrice `5` |
| `find 500ml Coke` | query `coke`, size `500 ml` |
| `search for organic apples` · `look for toothpaste below $5` · `show me Colgate under $5` | same as above |

**Filter chips make the parsing visible.** Every extracted filter is shown as a removable chip, so it is obvious which constraints were actually heard — and dropping one re-runs the search immediately. Results are ordered deterministically: in stock first, then cheapest first. When nothing matches, the panel says so and suggests relaxing a filter rather than going blank.

**The catalog is static sample data.** `src/data/catalog.ts` holds 33 invented products across eight categories, with brands, sizes, prices, sale prices, stock flags, and attribute tags. It is written for this assessment — it is **not** live supermarket inventory, and the prices and stock levels are simulated. There is no product API and no backend.

## Project Status

🚧 **Currently in development.** Implementation will be completed in phases according to the technical assessment roadmap.

Working today:

- **Shopping list** — add, merge, modify, check off, remove, and clear items; automatic categorisation; persistence in the browser.
- **Natural-language commands** — instructions such as *"add 2 bottles of water"* or *"take eggs off my list"* are parsed and executed. See [Natural-Language Commands](#natural-language-commands).
- **Voice input** — spoken commands via the browser's Web Speech API, feeding the same parser. See [Voice Input](#voice-input).
- **English and Hindi** — commands in either language, resolving to one canonical list. See [Multilingual Scope](#multilingual-scope).
- **Voice product search** — spoken queries with brand, size, price-range, and attribute filters. See [Product Search](#product-search).

Not implemented yet: smart suggestions (history-based recommendations, seasonal/on-sale suggestions, and product substitutes) and final UI polish. The application is not deployed yet.

Browser support has not been formally tested yet, so this README makes no compatibility claims. The app feature-detects speech recognition at startup and falls back to the text command box wherever it is unavailable. The [Browser Support](#browser-support) section will be filled in once real testing is done.

## Implementation Roadmap

| # | Phase | Status |
|---|---|---|
| 1 | Project setup | Complete |
| 2 | Core shopping list | Complete |
| 3 | NLP / parser | Complete |
| 4 | Voice recognition | Complete |
| 5 | Multilingual support | Complete (English + Hindi) |
| 6 | Voice search | Complete |
| 7 | Smart suggestions | Not started |
| 8 | UI / UX | Not started |
| 9 | Testing | Not started |
| 10 | Deployment | Not started |
| 11 | Documentation and final submission | In progress |

## Assignment Constraints

This project is a Software Engineering technical assessment and is built under the following constraints:

- **Maximum implementation effort:** 8 hours
- **Cost:** free / zero-cost services and free tiers only
- **Dependencies:** kept minimal — only what is strictly required
- **Repository:** public GitHub repository, `main` branch
- **Submission:** public GitHub repository link only
- **Deadline:** 24 August 2026

---

## Live Demo

> _To be added once the application is deployed._

## Screenshots

> _To be added once the interface is implemented._

## Installation

> _To be added once the project is set up. Will include clone, install, and local development instructions._

## Usage

> _To be added once voice commands are implemented. Will include a reference table of supported commands and example phrasings._

## Browser Support

> _To be added once the application has been tested across browsers and devices._

## Architecture Details

> _To be added once implementation is complete. Will include the final project structure and an explanation of each module's responsibility._

## Testing

> _To be added once the application has been tested. Will include the feature-by-feature test checklist and its results._

## Limitations

> _To be added once implementation is complete. Will document known constraints and any assumptions made, including the use of static sample product data._

## Final Approach

> _To be added on completion — a write-up of no more than 200 words explaining the approach taken._
