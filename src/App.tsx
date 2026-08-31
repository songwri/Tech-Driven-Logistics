import Nav from './components/Nav'
import LabProvider from './components/LabProvider'
import LabGate from './components/LabGate'
import ScrollIntro from './components/ScrollIntro'
import TeamIntro from './components/TeamIntro'
import TechMap from './components/TechMap'
import TdlLab from './components/TdlLab'
import CaseStudy from './components/CaseStudy'
import Roadmap from './components/Roadmap'
import ContactCta from './components/ContactCta'
import Footer from './components/Footer'

export default function App() {
  return (
    <LabProvider>
      <div className="min-h-screen bg-white">
        <Nav />
        <main>
          <LabGate />
          <ScrollIntro />
          <TeamIntro />
          <TechMap />
          <TdlLab />
          <CaseStudy />
          <Roadmap />
          <ContactCta />
        </main>
        <Footer />
      </div>
    </LabProvider>
  )
}
