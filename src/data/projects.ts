// Single source for how the project section is classified. Prose, diagrams and games live in
// ProjectShowcase.astro and src/lib/games; tests/projects.test.mjs checks the two stay in step.
type Text = { en: string; zh: string };

// Each project has exactly one category.
export const CATEGORIES = {
  competition: { en: 'Competitions & hackathons', zh: '竞赛与黑客松' },
  course: { en: 'Course projects', zh: '课程项目' },
  tool: { en: 'Software', zh: '软件工具' },
} as const satisfies Record<string, Text>;

// Controlled topic list: a project may carry one to three of these and nothing else.
export const TAGS = {
  vision: { en: 'Vision', zh: '视觉' },
  planning: { en: 'Planning', zh: '规划' },
  control: { en: 'Control', zh: '控制' },
  'multi-robot': { en: 'Multi-robot', zh: '多机器人' },
  embedded: { en: 'Embedded', zh: '嵌入式' },
  'ai-agents': { en: 'AI agents', zh: '智能体' },
  hpc: { en: 'HPC', zh: '高性能计算' },
  teaching: { en: 'Teaching', zh: '教学' },
} as const satisfies Record<string, Text>;

export type CategoryId = keyof typeof CATEGORIES;
export type TagId = keyof typeof TAGS;
export type ProjectMeta = { id: string; cat: CategoryId; tags: TagId[]; featured?: Text };

// `featured` is the only featured flag: present means featured, and it carries the reason shown on the page.
export const PROJECTS: ProjectMeta[] = [
  {
    id: 'hackabot-2026', cat: 'competition', tags: ['vision', 'planning', 'multi-robot'],
    featured: { en: 'Led the team and built the whole software stack.', zh: '带队并完成整套软件。' },
  },
  {
    id: 'hackabot-2025', cat: 'competition', tags: ['vision', 'planning', 'control'],
    featured: { en: 'First prize.', zh: '一等奖。' },
  },
  { id: 'openclaw-2026', cat: 'competition', tags: ['ai-agents'] },
  { id: 'puzzlethon-2024', cat: 'competition', tags: ['vision', 'control'] },
  { id: 'traffic-cones', cat: 'course', tags: ['embedded', 'control', 'multi-robot'] },
  { id: 'esp-buggy', cat: 'course', tags: ['embedded', 'control'] },
  {
    id: 'software-tools-2026', cat: 'tool', tags: ['hpc', 'ai-agents'],
    featured: { en: 'Used every day for the author’s own cluster work.', zh: '作者日常使用的集群工具。' },
  },
  { id: 'local-workbenches', cat: 'tool', tags: ['teaching'] },
];
