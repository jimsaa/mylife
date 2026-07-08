const templates = [
  'Nobody talks about this {niche} hack…',
  'I wish I knew this before starting {niche}',
  'Stop scrolling if you want to {outcome}',
  'This changed how I do {activity} forever',
  'POV: you finally figured out {topic}',
  'The {niche} mistake costing you money',
  '3 signs you need to switch your {tool}',
  'I tested {product} for 30 days — here is the truth',
  'Affiliate marketers hate this one trick',
  'Watch this before you buy {product}',
];

const platforms = ['TikTok', 'Instagram', 'Facebook', 'YouTube', 'Email'];
const categories = ['Curiosity', 'Story', 'Problem', 'Social Proof', 'Urgency'];

export const MOCK_HOOKS = Array.from({ length: 100 }, (_, i) => {
  const template = templates[i % templates.length];
  const text = template
    .replace('{niche}', 'affiliate marketing')
    .replace('{outcome}', 'make your first sale')
    .replace('{activity}', 'content creation')
    .replace('{topic}', 'AI prompts')
    .replace('{tool}', 'funnel builder')
    .replace('{product}', 'this tool');

  return {
    id: `h${i + 1}`,
    text: `${text} #${i + 1}`,
    category: categories[i % categories.length],
    platform: platforms[i % platforms.length],
  };
});
