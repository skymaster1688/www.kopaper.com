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

export const collections = { tutorials, 'letter-paper': letterPaper };
