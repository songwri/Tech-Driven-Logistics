import Nav from './components/Nav'
import ScrollIntro from './components/ScrollIntro'
import TeamIntro from './components/TeamIntro'
import TechMap from './components/TechMap'
import CaseStudy from './components/CaseStudy'
import Roadmap from './components/Roadmap'
import ContactCta from './components/ContactCta'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-navy-950">
      <Nav />
      <main>
        <ScrollIntro />
        <TeamIntro />
        <TechMap />
        <CaseStudy />
        <Roadmap />
        <ContactCta />
      </main>
      <Footer />
    </div>
  )
}
