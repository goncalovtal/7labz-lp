import Faq from '@/components/faq/Faq'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/hero/Hero'
import Manifesto from '@/components/manifesto/Manifesto'
import Model from '@/components/model/Model'
import Services from '@/components/services/Services'
import TimeBack from '@/components/timeback/TimeBack'
import Ventures from '@/components/ventures/Ventures'
import { homeStructuredData } from '@/content/structuredData'

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // Escaped so the JSON can never close the script tag early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData()).replace(/</g, '\\u003c'),
        }}
      />
      <main>
        <Hero />
        <Model />
        <TimeBack />
        <Services />
        <Manifesto />
        <Faq />
        <Ventures />
      </main>
      <Footer />
    </>
  )
}
