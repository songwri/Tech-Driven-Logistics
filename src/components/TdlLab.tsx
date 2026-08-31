import { motion } from 'framer-motion'
import { useLab } from '@/lib/labContext'
import { Button } from './ui/Button'
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

export default function TdlLab() {
  const { openReservation } = useLab()

  return (
    <section id="tdl-lab" className="bg-cream py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">TDL Lab</p>
          <h2 className="text-3xl font-bold text-warm-800 md:text-4xl">
            기술을 눈으로 확인하는 공간
          </h2>
          <p className="mt-4 max-w-2xl text-warm-600">
            TDL Lab은 테크이노베이션팀이 검증한 물류 기술을 실제 동작 상태로 전시하는 오프라인
            쇼룸입니다. 고객사·협력사 방문을 상시 받고 있습니다.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {labPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className="relative border border-warm-300/50 bg-white p-6"
            >
              <BlueprintFrame size={14} />
              <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 text-lg font-semibold text-warm-800">{point.title}</h3>
              <p className="mt-3 text-sm text-warm-600">{point.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={openReservation}>쇼룸 방문 예약</Button>
          <a
            href="#guestbook"
            className="inline-flex items-center rounded-full border border-warm-300 px-6 py-2.5 text-sm font-semibold text-warm-800 transition hover:border-brand hover:text-brand"
          >
            방문자 기록 보기
          </a>
        </div>
      </div>
    </section>
  )
}
