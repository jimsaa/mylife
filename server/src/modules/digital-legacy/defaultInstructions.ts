/**
 * Default Legacy Instructions sections — seeded once if table is empty.
 * All content is editable via admin; nothing is hardcoded in the UI.
 */
export const DEFAULT_INSTRUCTION_SECTIONS: Array<{ title: string; body: string; sort_order: number }> = [
  {
    sort_order: 1,
    title: 'Welcome',
    body: `Welcome to My Life's Legacy Instructions.

This handbook was written for my family. It explains what this system is, what matters most, and how to find your way.

Read it carefully before changing anything.`,
  },
  {
    sort_order: 2,
    title: 'First Things To Do',
    body: `1. Read this guide completely.
2. Do not rush.
3. Everything important has been documented.
4. Ask for help if you need it — you are not alone in this.
5. When you are ready, explore My Life section by section.`,
  },
  {
    sort_order: 3,
    title: 'Family',
    body: `Personal messages and things I want you to know.

[Edit this section with messages to each person, values, and anything that should not be forgotten.]`,
  },
  {
    sort_order: 4,
    title: 'Projects',
    body: `Overview of major projects and what they are:

• My Life — personal operating system and this estate hub
• CabRadar — taxi / fleet related project
• Digital Production Factory — digital product pipeline
• KDP — Kindle Direct Publishing books and print products
• Etsy — marketplace storefronts
• HPB (High Pressure Bets) — betting / analytics related work
• Haunted Sweden — creative / content project
• Future projects — ideas still forming

[Add status, ownership notes, and what should continue or pause.]`,
  },
  {
    sort_order: 5,
    title: 'Domains',
    body: `List all domains here.

For each domain include:
• Domain name
• Purpose
• Registrar
• Renewal date / auto-renew status
• Who should take over DNS and ownership

[Fill in the live list — do not leave this empty.]`,
  },
  {
    sort_order: 6,
    title: 'Accounts',
    body: `Do NOT store passwords in this document.

For each important account, document:
• Where the account exists (provider / URL)
• What it is used for
• How to recover access (email, phone, recovery codes location)
• Whether a password manager or family recovery contact is involved

[Add rows as needed. Keep secrets out of this handbook.]`,
  },
  {
    sort_order: 7,
    title: 'Financial Overview',
    body: `High-level map of money flowing in and out:

• Bank accounts (names / banks only — not full numbers unless you choose)
• Subscriptions and recurring costs
• Income streams
• KDP royalties
• Etsy revenue
• Affiliate income
• Other businesses

[Update regularly. Link to documents elsewhere when needed.]`,
  },
  {
    sort_order: 8,
    title: 'Important Documents',
    body: `Where to find critical paperwork:

• Insurance
• Wills
• Contracts
• Business agreements
• Property documents
• Medical directives

[Describe location: physical folder, cloud drive, lawyer, etc.]`,
  },
  {
    sort_order: 9,
    title: 'Digital Assets',
    body: `Digital estate inventory:

• GitHub repositories and ownership
• Source code and deployment hosts
• AI prompts and workflows
• Research library
• Artwork
• Books and manuscripts
• Templates
• Databases

[Note access paths and who should inherit each asset class.]`,
  },
  {
    sort_order: 10,
    title: 'Future Vision',
    body: `Why My Life was built.

The purpose behind every major project — not just what it is, but why it mattered to me and what I hoped it could become.

[Write the vision so the family understands the intent, not only the mechanics.]`,
  },
  {
    sort_order: 11,
    title: 'Things I Never Finished',
    body: `Opportunity Bank

Ideas worth continuing:
• …

Ideas to ignore or archive:
• …

Unfinished threads, sketches, and half-built systems live here so nothing important is lost — and nothing wasteful is pursued by accident.`,
  },
  {
    sort_order: 12,
    title: 'Final Letter',
    body: `A personal letter to my family.

[Write freely. This section is yours — edit it whenever you need to.]`,
  },
];
