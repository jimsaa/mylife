# Builder Pass — Guided Builder Journey (UX Standard)

**Product rule:** `.cursor/rules/builder-pass-product-rule.mdc` (LOCKED)

---

## Core definition

| Builder Pass is | Builder Pass is not |
|-----------------|---------------------|
| A guided Builder Journey | A course |
| Mission-based progress | Documentation |
| Action-first screens | A knowledge base |
| Momentum at every step | Long-form reading |

---

## The customer loop

Every Builder Pass experience should drive this cycle:

```
Learn
  ↓
Build
  ↓
Complete
  ↓
Continue
```

Repeat until First Build Mission is done — then upgrade path to Monthly Build Pro.

---

## Design benchmark: onboarding

The setup wizard at `/start-here` is the **visual and UX standard** for the entire Builder Journey.

**Use onboarding as the benchmark for every future page:**

- Same dark premium environment
- Same card system (`src/components/vault/vault-ui.tsx`)
- Same gradient progress indicators
- Same short, confidence-building copy
- Same clear primary CTA per screen
- Same feeling: *"I can do this — what's next?"*

The customer should **never feel they left onboarding** when moving through Builder Pass.

---

## Screen principles

### 1. Momentum over information
- Minimize reading time
- Maximize doing time
- No page exists only to explain

### 2. One primary action
- Every screen has one obvious "do this now"
- Secondary actions are subtle
- Never leave the customer wondering what to do next

### 3. Mission framing
- Use **Mission**, **Step**, **Checkpoint** — not Module, Lesson, Article
- Progress is visible (%, steps completed, mission status)
- Completion is celebrated briefly, then forward motion

### 4. Documentation test
> If a page feels like documentation instead of progress, redesign it.

Signs of failure:
- Long paragraphs without a task
- Browse-only libraries with no mission context
- Dashboards that summarize instead of direct
- "Here's everything included" without "Do step 1"

---

## Current vault — known gap

The member area (`/vault/**`) now matches onboarding **visually** but some pages still behave like **content libraries** (Prompt Library, Hook Vault, etc.).

**Next sprint priority:** Transform journey entry (`/vault/start`) and Mission 1 into mission-driven flows. Libraries become tools **inside** missions, not destinations.

---

## Mission 1 direction (next build)

Replace passive "Start Here" reading with:

1. **Mission brief** — one sentence goal
2. **Steps** — 3–5 actionable checkpoints
3. **Build action** — customer produces something real
4. **Complete** — clear done state
5. **Continue** — next mission or upgrade path

See `docs/AI_INCOME_BUILDER_COURSE.md` for content outline (reframe as missions, not course modules).

---

## Copy tone

- Direct, second person ("You", "Your")
- Short sentences
- Confidence, not theory
- Action verbs: Install, Choose, Build, Ship, Continue

---

## North star

Customer thinks: **"I'm completing missions"** — not **"I'm taking a course"** or **"I'm browsing a vault"**.

When First Build Mission ships, they think: **"I built something real"** — and they're ready for Monthly Build Pro.
