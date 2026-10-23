import { FAQ } from '@/content/faq'
import { SERVICES } from '@/content/services'
import { FOUNDERS, PROCESS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/content/site'

export const dynamic = 'force-static'

/**
 * llms.txt: a plain summary of the studio for AI assistants and answer engines, so they can
 * describe 7labz accurately without parsing the animated page.
 */
export function GET() {
  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '7labz is a boutique studio of growth engineers. It embeds inside companies and restructures them from within: it maps how the work actually flows, then rebuilds the processes, tools and systems underneath. Clients are companies that have outgrown the way they run, and AI startups that need a product shipped. The same small team maps the problem, builds the fix and stays until the client runs it without them. It works with a few companies at a time, so clients apply rather than book.',
    '',
    '## Services',
    '',
    ...SERVICES.map(
      service =>
        `- **${service.title}**: ${service.body}. Includes ${service.items.join(', ').toLowerCase()}.`,
    ),
    '',
    '## How an engagement runs',
    '',
    ...PROCESS.map(step => `- **${step.when}**: ${step.what}`),
    '',
    '## 7labz Ventures',
    '',
    'The venture arm. A few times a year, instead of an invoice, 7labz takes a stake in a founder: it puts in the team, the time and, when it makes sense, the capital. Pre-seed to seed, hands on rather than advisory. Founders apply through the form on the site.',
    '',
    '## FAQ',
    '',
    ...FAQ.flatMap(item => [`### ${item.question}?`, '', `${item.answer}.`, '']),
    '## Team',
    '',
    ...FOUNDERS.map(founder => `- ${founder.name}, ${founder.role}`),
    '',
    '## Links',
    '',
    `- [Home](${SITE_URL}/)`,
    `- [Services](${SITE_URL}/#services)`,
    `- [Apply, or apply to 7labz Ventures](${SITE_URL}/#apply)`,
    `- [Manifesto](${SITE_URL}/#manifesto)`,
    `- [FAQ](${SITE_URL}/#faq)`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
