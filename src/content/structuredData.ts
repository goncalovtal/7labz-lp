import { FAQ } from './faq'
import { SERVICES } from './services'
import { FOUNDERS, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site'

/**
 * Schema.org graph for the home page: the studio as an organisation and a professional
 * service with its catalogue, the site, and the page. Search engines read it for rich
 * results; AI answer engines read it to say accurately what 7labz is and does. Only facts
 * shown on the page go in here.
 */
export function homeStructuredData() {
  const org = `${SITE_URL}/#organization`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': org,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        image: `${SITE_URL}/opengraph-image.png`,
        slogan: 'Boutique studio of growth engineers',
        description: SITE_DESCRIPTION,
        founder: FOUNDERS.map(founder => ({
          '@type': 'Person',
          name: founder.name,
          jobTitle: founder.role,
        })),
        knowsAbout: SERVICES.flatMap(service => [service.title, ...service.items]),
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Services',
          itemListElement: SERVICES.map(service => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: service.title,
              description: service.body,
              provider: { '@id': org },
            },
          })),
        },
        subOrganization: {
          '@type': 'Organization',
          name: '7labz Ventures',
          description:
            'The venture arm of 7labz: instead of an invoice, it takes a stake in a few founders a year and builds with them.',
          url: `${SITE_URL}/#apply`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { '@id': org },
        inLanguage: 'en',
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: '7labz | Boutique studio of growth engineers',
        description: SITE_DESCRIPTION,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': org },
        primaryImageOfPage: `${SITE_URL}/opengraph-image.png`,
        inLanguage: 'en',
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        url: `${SITE_URL}/#faq`,
        isPartOf: { '@id': `${SITE_URL}/#webpage` },
        about: { '@id': org },
        inLanguage: 'en',
        mainEntity: FAQ.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  }
}
