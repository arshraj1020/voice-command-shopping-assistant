# Approach

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
