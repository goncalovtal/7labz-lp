/**
 * Who the site is about, in one place: metadata, structured data, robots, the sitemap and
 * llms.txt all read from here.
 */

/**
 * The public origin. Set `NEXT_PUBLIC_SITE_URL` once there's a domain; until then Vercel's
 * production URL is used, and localhost in development.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '')

export const SITE_NAME = '7labz'

export const SITE_TITLE = '7labz | Boutique studio of growth engineers'

export const SITE_DESCRIPTION =
  'We build the systems that make a business faster: CRMs, automations, internal tools, websites and AI products. Live in weeks, built by a small team of growth engineers, with a venture arm, 7labz Ventures, that backs a few founders a year.'

/** The co-founders, as named on the site. */
export const FOUNDERS = [
  { name: 'Mário', role: 'Co-founder, Management' },
  { name: 'Miguel', role: 'Co-founder, Growth' },
  { name: 'Gonçalo', role: 'Co-founder, Software' },
]

/** How an engagement runs, in the order the site tells it. */
export const PROCESS = [
  { when: 'Day 1', what: 'A call. You walk us through a normal week' },
  { when: 'Week 1', what: 'We map where your hours go and pick what to fix first' },
  { when: 'Week 2', what: 'The first system is live and your team is using it' },
  { when: 'Week 4', what: 'It runs without you. The hours are yours again' },
]
