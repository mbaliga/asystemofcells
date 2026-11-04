// Content collections. `products` carries the copy for every roster cell's
// page: one file per roster slug, src/content/products/<slug>.md. Identity,
// status, accent and the call to action come from @asoc/roster; the words and
// the choice of imagery come from here.
//
// Contract (see docs/handoff/02_SITE_ARCHITECTURE.md 4.3 and 03_WING_APPS.md 1):
//   headline        one declarative sentence: the mechanism, not the benefit
//   lede            one or two short sentences
//   features        >= 3 for non-hub products, any number for hub products
//   neverHappens    2 to 4 lines, each true from the manifest or the code
//   openSource      isOpen only for an OSI licence on the default branch
//   faq             0 to 4 product-specific questions
//   hub             light treatment: hero, neverHappens, link out
//   statusProposal / ownerNotes   never rendered
import { defineCollection, z } from 'astro:content'
import manifest from '../../../../screenshots/manifest.json'

const MANIFEST_IDS = new Set(manifest.entries.map((e: { id: string }) => e.id))

const feature = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  status: z.enum(['shipped', 'partial', 'planned']),
  // A manifest entry id for this product's imagery key. The id is checked
  // against the whole manifest here, and against the product's own imagery key
  // where the page is built (layouts/ProductLayout.astro).
  image: z
    .string()
    .optional()
    .refine((id) => id === undefined || MANIFEST_IDS.has(id), {
      message: 'feature.image is not an id in screenshots/manifest.json',
    }),
})

const products = defineCollection({
  type: 'content',
  schema: z
    .object({
      headline: z.string().min(1),
      lede: z.string().min(1),
      features: z.array(feature).default([]),
      neverHappens: z.array(z.string().min(1)).min(2).max(4),
      openSource: z.object({
        isOpen: z.boolean(),
        licence: z.string().min(1),
        repo: z
          .string()
          .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'repo must be owner/name')
          .optional(),
        note: z.string().optional(),
      }),
      faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).max(4).default([]),
      hub: z.boolean().optional(),
      statusProposal: z.string().optional(),
      ownerNotes: z.array(z.string()).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.hub && data.features.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['features'],
          message: `non-hub products need at least 3 features (found ${data.features.length}); set hub: true for a light page`,
        })
      }
    }),
})

export const collections = { products }
