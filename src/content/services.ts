import { type Mark } from '@/lib/glyphMarks'

// Draft copy: service names and lines are placeholders until the team signs them off.
/** What the studio builds: the services section, structured data and llms.txt all read this. */
export const SERVICES: { id: Mark; title: string; body: string; items: string[] }[] = [
  {
    id: 'crm',
    title: 'CRM & pipelines',
    body: 'Every lead in one place, from the first call to the invoice',
    items: [
      'Pipeline setup',
      'Lead capture from phone, email and forms',
      'Follow-ups',
      'Reporting',
    ],
  },
  {
    id: 'automations',
    title: 'Automations',
    body: 'The work that happens on its own once it is set up',
    items: ['Quotes and invoicing', 'Reminders and scheduling', 'Syncing between tools', 'Alerts'],
  },
  {
    id: 'tools',
    title: 'Internal tools',
    body: 'The screens your team actually works in',
    items: ['Dashboards', 'Admin panels', 'Stock and job tracking', 'Approvals'],
  },
  {
    id: 'websites',
    title: 'Websites & landing pages',
    body: 'Sites that bring work in instead of sitting there',
    items: ['Marketing sites', 'Landing pages', 'Booking and forms', 'Tracking'],
  },
  {
    id: 'ai',
    title: 'AI products',
    body: 'Shipping AI features and products, for startups and for businesses',
    items: [
      'Assistants and agents',
      'Document processing',
      'Search over your data',
      'Product build-out',
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    body: 'Getting the right people to the door, and knowing where they came from',
    items: ['Ads and tracking', 'Analytics', 'Email and lifecycle', 'Conversion testing'],
  },
]
