import { motion } from 'framer-motion'
import { RESERVE_URL } from '@/lib/routes'
import BlueprintFrame from './BlueprintFrame'

const labPoints = [
  {
    title: '작동하는 설비를 직접',
    description: '로봇팔, AMR, 자동화 설비가 실제로 움직이는 상태로 전시되어 있습니다.',
  },
  {
    title: '기술 담당자와 직접 대화',
    description: '설비를 도입·운영한 엔지니어가 직접 설명하고 질문에 답합니다.',
  },
  {
    title: '현장 적용 관점의 검토',
    description: '보유 기술을 고객사 환경에 어떻게 적용할 수 있을지 함께 검토합니다.',
  },
]

const LAB_IMAGE = `${import.meta.env.BASE_URL}media/tdl-lab-hero.jpg`

export default function TdlLab() {
  return (
    <section id="tdl-lab" className="bg-cream py-28">
      {/* 사진(왼쪽)과 설명 · 포인트 목록(오른쪽)의 2단 구성 — 다른 섹션의 3칸 카드와 겹치지 않게 */}
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[#0c0e11] lg:aspect-[5/6]">
            <img
              src={LAB_IMAGE}
              alt="TDL Lab에 전시된 물류 로봇"
              loading="lazy"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <p className="absolute bottom-5 left-5 font-mono text-[11px] uppercase tracking-[0.3em] text-white/80">
              TDL Lab · Live Demo Floor
            </p>
          </div>
          <div className="pointer-events-none absolute -inset-2.5">
            <BlueprintFrame size={18} />
          </div>
        </motion.div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">TDL Lab</p>
            <h2 className="text-3xl font-bold leading-tight text-ink md:text-[2.75rem]">
              기술을 눈으로 확인하는 공간
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-warm-600">
              TDL Lab은 테크이노베이션팀이 검증한 물류 기술을 실제 동작 상태로 전시하는 오프라인 공간입니다.
              고객사·협력사 방문을 상시 받고 있습니다.
            </p>
          </motion.div>

          <ol className="mt-10 border-t border-warm-300/60">
            {labPoints.map((point, i) => (
              <motion.li
                key={point.title}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-b border-warm-300/60 py-5"
              >
                <span className="font-mono text-[13px] tabular-nums text-brand">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{point.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-warm-600">{point.description}</p>
                </div>
              </motion.li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <a
              href={RESERVE_URL}
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:translate-y-px"
            >
              TDL 방문 예약
            </a>
            <a
              href="#guestbook"
              className="text-sm font-semibold text-warm-800 underline decoration-warm-300 underline-offset-4 transition hover:text-brand hover:decoration-brand"
            >
              방문자 기록 보기 →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
