# Builder Pass — Mission Content Outline

**UX standard:** `docs/BUILDER_JOURNEY.md` (LOCKED product rule)

**This is NOT a course outline.** These are **missions and checkpoints** — short, actionable, build-first.

**Business model:** `docs/BUSINESS_MODEL.md` (LOCKED)

**North star:** Builder Pass buyer completes First Build Mission and is ready to upgrade to Monthly Build Pro ($29/mo).

**Mindset:** Mission designer, not course author. Momentum, not content volume.

---

## What the customer is buying

Not information. Not videos. **A first built thing** — with a workflow they can repeat.

| They think they're buying | They actually need |
|---------------------------|-------------------|
| AI course | Confidence + clarity |
| Tool list | A system (Chat → Builder → Output) |
| Passive income promise | One real mini project completed |

---

## Mission structure (5 checkpoints → 1 shipped project)

Aligned with landing promise. Each checkpoint = **one action**, not reading time.

### Checkpoint 1 — AI Mindset (~5 min active)
**Mission outcome:** Stop feeling overwhelmed; name your project in one sentence.

- Do: What AI actually does (2 min read max)
- Do: Write your project idea in one sentence
- ✓ Checkpoint complete → Continue

### Checkpoint 2 — AI Workflow (~10 min active)
**Mission outcome:** Run the 4-step loop once.

1. Define outcome
2. Prompt with context
3. Review + refine
4. Ship

- Lesson: The workflow explained
- Exercise: Run the workflow on a tiny task (rename files, draft email)
- Checkpoint: Screenshot or paste your first workflow result

### Module 3 — AI Tool Stack (10 min)
**Outcome:** Tools installed and connected (wizard already did heavy lifting).

- Lesson: Your AI Chat (ChatGPT / Claude / Gemini — their choice)
- Lesson: Your AI Builder (Cursor — already recommended in onboarding)
- Link: AI Tool Stack in vault (data-driven, not hardcoded)
- Checkpoint: Confirm both tools open

### Module 4 — AI Building Method (25 min)
**Outcome:** Turn idea → spec → build plan.

- Lesson: Idea → one-page spec (audience, outcome, pages/sections)
- Lesson: Prompting Cursor to scaffold (not coding from scratch)
- Template: Mini project spec (copy-paste starter)
- Checkpoint: Completed spec for mini project

### Module 5 — First Mini Project (45–60 min)
**Outcome:** **Something live they can show someone.**

**Recommended first project:** Simple landing page for a niche they care about (affiliate angle, KDP lead magnet, or personal brand).

Steps:
1. Pick niche (worksheet: 3 options)
2. Generate copy with AI Chat
3. Build single-page site in Cursor
4. Publish or export (good enough > perfect)
5. Celebrate screen: "You built this."

---

## Learning UX principles

1. **One primary action per screen** — Watch → Do → Check off
2. **Progress visible always** — Module X of 5, % complete
3. **No dead ends** — Every lesson ends with "Do this now" (5 min max)
4. **Mobile-readable, desktop-build** — Lessons on phone; building on desktop
5. **Vault supports, course leads** — Prompts/tools linked from lessons, not the main path

---

## Member journey (end-to-end)

```
Purchase → Signup → /start-here (wizard) → /vault/lessons (Module 1)
     → complete mini project → Dashboard unlocks "What's next"
```

- Setup wizard: **done** ✓
- Missing: `/vault/lessons` experience, progress, Lesson 1 content

---

## First mini project — product spec

**Name:** My First AI Landing Page

**Time:** Under 1 hour for motivated beginner

**Deliverable:** Single HTML page or simple deployed site with:
- Headline
- 3 benefit bullets
- CTA button (email or link)

**Why this project:**
- Visible proof of progress
- Uses Chat + Cursor from onboarding
- Maps to affiliate/KDP/digital product paths later
- Shareable ("I built this with AI")

---

## What NOT to build this sprint

- Video hosting platform
- Quizzes / certificates
- Community
- Custom LMS infrastructure
- Supabase migration (unless blocking content edits)
- New payment tiers

**Use:** Markdown/JSON lessons in data layer + simple lesson pages (same pattern as AI Tools).

---

## Success metrics (qualitative until launch)

- [ ] Member completes setup wizard
- [ ] Member starts Module 1 within 24h
- [ ] Member reaches mini project spec (Module 4)
- [ ] Member publishes or exports landing page
- [ ] Unprompted feedback: ready to upgrade to Monthly Build Pro

---

## Suggested build order

1. Lesson data model + 5 module skeleton in admin
2. `/vault/lessons` hub + single lesson page template
3. Progress tracking (lesson_completed on user profile or progress table)
4. Write Module 1–3 content (short, actionable)
5. Module 4 spec template (downloadable or in-app)
6. Module 5 guided mini project (step-by-step checklist in UI)
7. Wire "Start Lesson 1" from setup wizard → `/vault/lessons/1`
8. Replace `/vault/start` vault-era copy with course entry

---

**When ready to implement:** Start with lesson hub + Module 1 only. Ship, get one real user through it, then expand.
