export const SETUP_WIZARD_COPY = {
  title: 'Welcome to Builder Pass',
  steps: {
    builder: {
      title: 'Step 1: Install Your AI Builder',
      subtitle:
        "You'll use the same AI Builder throughout your entire Builder Journey — so every lesson, prompt, and project works exactly as demonstrated.",
      body: [
        "You're joining a proven system — not just installing software. One workflow, one repeatable Builder Method. Install once, then follow the same approach through your entire Builder Journey.",
        'No coding experience required. If you can describe an idea, you can build with this system.',
      ],
      setupTime: '✅ About 2 minutes',
      primaryLabel: 'Install Cursor Free',
      secondaryLabel: "I've already installed it",
    },
    chat: {
      title: 'Step 2: Choose Your AI Assistant',
      subtitle: 'Your AI Chat thinks and plans. Your AI Builder builds.',
      body:
        'Use your AI Assistant for thinking, planning, brainstorming, and writing clear instructions — then send that work to your AI Builder. That is the Human → AI Chat → AI Builder workflow.',
      footer: 'Pick the assistant you already use — ChatGPT, Claude, Gemini, or any modern AI chat.',
      primaryLabel: 'Continue',
      secondaryLabel: "I'll set this up later",
    },
    complete: {
      title: 'Your AI Team Is Ready',
      congratulations: '🚀 Your AI Team Is Ready',
      message:
        'You are not building alone anymore. Think with AI Chat, build with AI Builder, and ship real projects — one step at a time.',
      submessage: 'Your workspace is set. Time to put it to work.',
      builderRule: {
        label: 'Builder Rule #1',
        text: 'Never spend more than 10 minutes learning without building something.',
      },
      primaryLabel: 'Start Your Build Journey',
      flow: [
        { label: 'YOU', role: 'The Vision' },
        { label: 'AI Chat', role: 'The Strategist' },
        { label: 'AI Builder', role: 'The Creator' },
        { label: 'Ideas' },
        { label: 'Projects' },
        { label: 'Income' },
      ],
    },
  },
} as const;

export const AI_CHAT_OPTIONS = [
  { id: 'chatgpt', label: 'ChatGPT', recommended: true },
  { id: 'claude', label: 'Claude', recommended: false },
  { id: 'gemini', label: 'Gemini', recommended: false },
] as const;
