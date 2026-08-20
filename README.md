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

The following features are required by the assignment brief and are planned for implementation. None are complete at this stage.

### Voice Input

- [ ] **Voice command recognition** — add and manage list items by speaking
- [ ] **Natural language command understanding** — recognize varied phrasings of the same intent (*"add bananas"*, *"I need bananas"*, *"I want to buy bananas"*)
- [ ] **Multilingual voice commands** — command recognition in more than one language

### Smart Suggestions

- [ ] **History-based product recommendations** — suggest items based on previous additions and frequency
- [ ] **Seasonal / on-sale recommendations** — surface products that are in season or discounted
- [ ] **Product substitutes** — offer alternatives when an item is unavailable or another option may suit the user

### Shopping List Management

- [ ] **Add / remove / modify items** via voice commands
- [ ] **Automatic categorization** — group items into categories such as produce, dairy, bakery, and snacks
- [ ] **Quantity management** — interpret quantities and units (*"add 2 bottles of water"*, *"buy 5 oranges"*)

### Voice-Activated Search

- [ ] **Voice product search** — find products by spoken query (*"find me organic apples"*)
- [ ] **Brand filtering** — filter results by spoken brand name
- [ ] **Size filtering** — filter results by spoken size or volume
- [ ] **Price-range filtering** — filter results by spoken price constraint (*"find toothpaste under $5"*)

### UI / UX

- [ ] **Minimalist UI** — a clean interface focused on the shopping list
- [ ] **Real-time visual feedback** — show the recognized command and the resulting action as it happens
- [ ] **Mobile / voice-first experience** — designed for small screens and spoken interaction
- [ ] **Loading states** — clear indication while speech is being processed
- [ ] **Error handling** — graceful handling of unsupported browsers, denied microphone permissions, and unrecognized commands

## Planned Technology Stack

These are the **planned** technologies for this project. None of the following have been set up or installed in this repository yet.

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

Multilingual voice commands are **planned** and not yet implemented.

Initial target languages:

- **English**
- **Hindi**

The planned approach is to switch the speech recognition language and map recognized command keywords and common product names to a single canonical internal representation, so that the shopping list, categories, and product data remain consistent regardless of the input language.

The assignment brief does not specify which languages must be supported. The scope above is chosen as the smallest implementation that demonstrates the requirement properly within the time budget. Additional languages may be added if time permits.

## Project Status

🚧 **Currently in development.** Implementation will be completed in phases according to the technical assessment roadmap.

The project is set up and the shopping-list foundation is in place: items can be added, merged, modified, checked off, removed, and cleared, they are grouped automatically by category, and the list persists in the browser.

Voice recognition, natural-language parsing, multilingual support, voice search, and smart suggestions are not implemented yet. The application is not deployed yet.

## Implementation Roadmap

| # | Phase | Status |
|---|---|---|
| 1 | Project setup | Complete |
| 2 | Core shopping list | Complete |
| 3 | NLP / parser | Not started |
| 4 | Voice recognition | Not started |
| 5 | Multilingual support | Not started |
| 6 | Voice search | Not started |
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
