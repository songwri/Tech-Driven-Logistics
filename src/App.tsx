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
import GuestbookSection from './components/GuestbookSection'
import Footer from './components/Footer'

export default function App() {
  return (
    <LabProvider>
      <div className="min-h-screen bg-white">
        <Nav />
        <main>
          <LabGate />
          {/* 어두운 영상 첫 화면과 흰 본문 사이의 짧은 전환 구간 (영상은 가리지 않는다) */}
          <div
            aria-hidden
            className="h-20 bg-[linear-gradient(to_bottom,#0c0e11_0%,#3a3836_30%,#a9a6a4_62%,#ecebea_85%,#ffffff_100%)] md:h-28"
          />
          <ScrollIntro />
          <TeamIntro />
          <TechMap />
          <TdlLab />
          <CaseStudy />
          <Roadmap />
          <ContactCta />
          <GuestbookSection />
        </main>
        <Footer />
      </div>
    </LabProvider>
  )
}
