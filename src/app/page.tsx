import Footer from '@/components/layout/Footer'
import Hero from '@/components/hero/Hero'
import Manifesto from '@/components/manifesto/Manifesto'
import Model from '@/components/model/Model'
import Services from '@/components/services/Services'
import TimeBack from '@/components/timeback/TimeBack'
import Ventures from '@/components/ventures/Ventures'

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        <Model />
        <TimeBack />
        <Services />
        <Manifesto />
        <Ventures />
      </main>
      <Footer />
    </>
  )
}
