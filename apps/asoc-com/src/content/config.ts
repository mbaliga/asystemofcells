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

// The Cabinet (05_WING_CABINET.md section 2). One file per piece. `sample: true`
// entries exist so the pages and the checkout can be built and tested; they are
// dropped from a production build, like the placeholders in @asoc/roster/sections.
const cabinet = defineCollection({
  type: 'content',
  schema: z
    .object({
      title: z.string().min(1),
      kind: z.enum(['made', 'curiosity']),
      status: z.enum(['available', 'reserved', 'sold', 'archived']),
      sample: z.boolean().default(false),
      price: z.object({ inr: z.number().int().positive(), usd: z.number().positive().optional() }),
      edition: z.object({ size: z.number().int().positive(), sold: z.number().int().min(0) }).optional(),
      qty: z.literal(1).optional(),
      condition: z.enum(['mint', 'excellent', 'very good', 'good', 'fair']).optional(),
      conditionNote: z.string().optional(),
      provenance: z.string().optional(),
      making: z.string().optional(),
      dims: z.object({ w: z.number(), h: z.number(), d: z.number(), unit: z.enum(['mm', 'cm']) }).optional(),
      weightGrams: z.number().positive(),
      materials: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      shipsTo: z.array(z.enum(['IN', 'INTL'])).min(1),
      fragile: z.boolean().default(false),
      madeOn: z.coerce.date().optional(),
      acquired: z.coerce.date().optional(),
      summary: z.string().min(1),
    })
    .superRefine((v, ctx) => {
      if (v.kind === 'curiosity' && v.edition) ctx.addIssue({ code: 'custom', message: 'edition is for made pieces only' })
      if (v.kind === 'made' && !v.edition) ctx.addIssue({ code: 'custom', message: 'a made piece needs an edition' })
      if (v.kind === 'curiosity' && v.qty !== undefined && v.qty !== 1) ctx.addIssue({ code: 'custom', message: 'curiosities are one of one' })
    }),
})

// Practice: previous work as explorables (06_WING_ARCHITECTURE.md section 2). `pending: true`
// entries are excluded from the index, the sitemap and the build until the owner supplies the images.
const work = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    year: z.number().int().optional(),
    role: z.array(z.string()).default([]),
    location: z.string().optional(),
    format: z.enum(['scroll', 'compare', 'plan']), // not 'layout': Astro reads that frontmatter key as a layout import
    cover: z.string().optional(),
    pending: z.boolean().default(true),
    scenes: z
      .array(
        z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('pin'), image: z.string(), steps: z.array(z.string()).min(1) }),
          z.object({ kind: z.literal('compare'), before: z.string(), after: z.string(), labels: z.tuple([z.string(), z.string()]) }),
          z.object({ kind: z.literal('plan'), image: z.string(), hotspots: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), title: z.string(), body: z.string() })) }),
        ]),
      )
      .default([]),
  }),
})

export const collections = { products, cabinet, work }
