import { defineCollection, z } from 'astro:content';

const tutorials = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['classic', 'animals', 'flowers', 'vehicles', 'models', 'holiday']),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']),
    time: z.string(),
    age: z.string(),
    emoji: z.string(),
    materials: z.array(z.string()),
    tips: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    order: z.number().default(99),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    kind: z.enum(['origami', 'papercraft']).default('origami'),
  }),
});

const letterPaper = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    emoji: z.string(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

const learn = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    emoji: z.string(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
    updated: z.string().optional(),
  }),
});

const printables = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    emoji: z.string(),
    category: z.string().optional(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

// Gallery: AI-generated papercraft showcase. Each entry is one "idea" (title);
// multiple generations of the same idea append more images to the same article.
// Images are stored as markdown image lines in the body (not frontmatter) so the
// publish endpoint can append without parsing YAML.
const gallery = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    emoji: z.string().default('🎨'),
    style: z.string().optional(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { tutorials, 'letter-paper': letterPaper, learn, printables, gallery };
