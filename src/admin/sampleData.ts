import { toDateKey, type TourType, type VisitRequest, type VisitStatus, type Visitor } from '@/lib/visit'

/**
 * 백엔드(VITE_LAB_API)가 연결되지 않았을 때 관리자 화면을 둘러볼 수 있도록 하는
 * 데모 데이터. 목업의 10건 + 월별/연도별 통계가 의미 있게 보이도록 2025~2026년
 * 예약을 결정적(seeded)으로 생성합니다. 실제 개인정보가 아닙니다.
 */

const MOCKUP: VisitRequest[] = [
  mock('m1', '2026-09-23', 'lab', '10:30-11:30', 'approved', '가나로지스틱스', 'existing', ['물류', '유통'], ['기존 고객사 Lock-in'],
    '기존 계약 갱신 논의 겸 최신 자동화 설비 시연 요청', ['김도현', '책임', 'CL사업담당 풀필먼트팀'], [
      ['이정민', '팀장', '물류혁신팀', 'jm.lee@ganalog.example', '12가 3456', ['운영', '기획']],
      ['박서준', '매니저', '구매팀', 'sj.park@ganalog.example', '', ['구매']],
    ]),
  mock('m2', '2026-09-23', 'lab', '14:00-15:00', 'pending', '스마일리테일', 'new', ['유통', '이커머스'], ['신규 영업'],
    '온라인 풀필먼트 자동화 니즈 확인 필요', ['최유리', '선임', 'CL사업담당 신사업팀'], [
      ['한지훈', '이사', '경영기획실', 'jh.han@smiretail.example', '34나 7890', ['경영진']],
      ['오세영', '팀장', 'IT전략팀', 'sy.oh@smiretail.example', '', ['IT/개발']],
      ['류하은', '매니저', '영업팀', 'he.ryu@smiretail.example', '', ['영업']],
    ]),
  mock('m3', '2026-09-25', 'combined', '09:30-11:30', 'approved', '블루웨어전자', 'existing', ['전자', '가전'], ['교육'],
    '신규 라인 담당자 대상 설비 이해 교육 목적', ['박준서', '책임', 'CL사업담당 전자산업팀'], [
      ['정민아', '연구원', '생산기술연구소', 'ma.jung@bluware.example', '', ['R&D/연구개발']],
      ['윤태호', '주임', '품질보증팀', 'th.yoon@bluware.example', '56다 1234', ['품질관리']],
    ]),
  mock('m4', '2026-09-25', 'lab', '14:00-15:00', 'rejected', '탑패션', 'new', ['의류'], ['투어'],
    '단순 시설 견학 요청, 일정 조율 어려움으로 거절', ['최유리', '선임', 'CL사업담당 신사업팀'], [
      ['김소라', '매니저', '마케팅팀', 'sr.kim@topfashion.example', '', ['마케팅']],
    ]),
  mock('m5', '2026-09-28', 'center', '10:00-11:00', 'pending', '그린푸드', 'existing', ['식품'], ['기존 고객사 Lock-in'],
    '냉동/냉장 물류 자동화 확장 검토', ['김도현', '책임', 'CL사업담당 풀필먼트팀'], [
      ['서민준', '팀장', '영업1팀', 'mj.seo@greenfood.example', '78라 4567', ['영업']],
      ['배지현', '매니저', '물류운영팀', 'jh.bae@greenfood.example', '', ['물류']],
    ]),
  mock('m6', '2026-09-28', 'combined', '13:00-15:00', 'approved', '시티모터스', 'new', ['자동차'], ['신규 영업'],
    '부품 물류센터 자동화 제안 목적, 경영진 동반 방문', ['박준서', '책임', 'CL사업담당 전자산업팀'], [
      ['노현우', '상무', '경영지원본부', 'hw.noh@citymotors.example', '90마 5678', ['경영진']],
      ['장미란', '팀장', '구매팀', 'mr.jang@citymotors.example', '', ['구매']],
      ['홍석진', '매니저', 'IT인프라팀', 'sj.hong@citymotors.example', '', ['IT/개발']],
      ['이수빈', '주임', '물류운영팀', 'sb.lee@citymotors.example', '', ['운영']],
    ]),
  mock('m7', '2026-09-30', 'lab', '10:30-11:30', 'pending', '라이프헬스케어', 'new', ['제약/헬스케어'], ['교육'],
    '의약품 보관/추적 자동화 사례 학습 목적', ['최유리', '선임', 'CL사업담당 신사업팀'], [
      ['조은비', '연구원', '품질보증팀', 'eb.cho@lifehealth.example', '', ['품질관리']],
      ['문성재', '선임연구원', '연구개발팀', 'sj.moon@lifehealth.example', '', ['R&D/연구개발']],
    ]),
  mock('m8', '2026-09-30', 'center', '14:00-15:00', 'approved', '한빛물류', 'existing', ['물류'], ['기존 고객사 Lock-in'],
    '', ['김도현', '책임', 'CL사업담당 풀필먼트팀'], [
      ['강태윤', '팀장', '운영관리팀', 'ty.kang@hanbitlog.example', '11바 2222', ['운영']],
    ]),
  mock('m9', '2026-10-02', 'combined', '09:30-11:30', 'pending', 'CVS프레시', 'new', ['CVS/편의점'], ['신규 영업'],
    '점포 물류 자동화 솔루션 소개 요청', ['박준서', '책임', 'CL사업담당 전자산업팀'], [
      ['유하림', '팀장', '영업개발팀', 'hr.yoo@cvsfresh.example', '', ['영업']],
      ['백승우', '매니저', '전략기획팀', 'sw.baek@cvsfresh.example', '', ['기획']],
    ]),
  mock('m10', '2026-10-02', 'lab', '14:00-15:00', 'rejected', '홈리빙퍼니처', 'new', ['가구/인테리어'], ['투어'],
    '내부 사정으로 일정 취소', ['최유리', '선임', 'CL사업담당 신사업팀'], [
      ['남지수', '매니저', '브랜드마케팅팀', 'js.nam@homeliving.example', '', ['마케팅']],
    ]),
  {
    ...mock('m11', '2026-10-05', 'center', '13:00-14:00', 'pending', 'CL사업담당 신입사원 교육', undefined, [], ['교육'],
      '신입사원 현장 이해 교육', ['김대현', '책임', '테크이노베이션팀'], [
        ['이하늘', '사원', 'CL사업담당', 'hn.lee@lxpantos.example', '', ['운영']],
        ['정다은', '사원', 'CL사업담당', 'de.jung@lxpantos.example', '', ['기획']],
      ]),
    category: 'internal',
  },
]

type VisitorTuple = [string, string, string, string, string, string[]]

function mock(
  id: string,
  date: string,
  tour: TourType,
  slot: string,
  status: VisitStatus,
  company: string,
  clientType: 'existing' | 'new' | undefined,
  industries: string[],
  purposes: string[],
  hostComment: string,
  host: [string, string, string],
  visitors: VisitorTuple[],
): VisitRequest {
  return {
    id,
    status,
    createdAt: `${date}T00:00:00.000Z`,
    adminMemo: '',
    tour,
    date,
    slot,
    category: 'external',
    clientType,
    company,
    industries,
    purposes,
    hostComment,
    host: { name: host[0], title: host[1], org: host[2], phone: '010-0000-0000', email: 'host@lxpantos.example' },
    visitors: visitors.map(([name, title, org, email, car, jobs]): Visitor => ({ name, title, org, email, car, jobs })),
    note: '',
    consent: true,
  }
}

/* ------------------------------------------------------- 생성 데이터 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COMPANIES: [string, string[]][] = [
  ['대한정밀', ['제조']], ['세림케미칼', ['화학']], ['누리전자', ['전자']], ['한결유통', ['유통']],
  ['바른물류', ['물류']], ['마루코스메틱', ['화장품']], ['푸른식품', ['식품']], ['모던어패럴', ['의류']],
  ['데일리마트24', ['CVS/편의점']], ['쇼핑온', ['이커머스', '유통']], ['하이홈가전', ['가전', '전자']],
  ['미래모빌리티', ['자동차', '제조']], ['메디팜', ['제약/헬스케어']], ['우드앤홈', ['가구/인테리어']],
  ['오션로지스', ['물류']], ['뷰티랩코리아', ['화장품', '이커머스']], ['신선마켓', ['식품', '이커머스']],
]
const HOSTS: [string, string, string][] = [
  ['김도현', '책임', 'CL사업담당 풀필먼트팀'],
  ['최유리', '선임', 'CL사업담당 신사업팀'],
  ['박준서', '책임', 'CL사업담당 전자산업팀'],
  ['김대현', '책임', '테크이노베이션팀'],
]
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오']
const GIVEN = ['민준', '서연', '지훈', '하은', '도윤', '수아', '현우', '지민', '예준', '채원', '승현', '유진']
const TITLES = ['사원', '주임', '매니저', '팀장', '책임', '이사']
const JOB_POOL = ['영업', '운영', '기획', '구매', 'IT/개발', '경영진', '마케팅', '물류', '품질관리', 'R&D/연구개발']
const PURPOSE_POOL = ['기존 고객사 Lock-in', '신규 영업', '신규 영업', '교육', '투어']

const MORNING: [TourType, string][] = [
  ['combined', '09:30-11:30'], ['combined', '09:30-11:30'], ['lab', '10:30-11:30'],
  ['center', '10:00-11:00'], ['center', '11:00-12:00'],
]
const AFTERNOON: [TourType, string][] = [
  ['combined', '13:00-15:00'], ['lab', '14:00-15:00'], ['center', '13:00-14:00'], ['center', '15:00-16:00'],
]

function generate(): VisitRequest[] {
  const random = mulberry32(20260929)
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)]
  const today = toDateKey(new Date())
  const taken = new Set(MOCKUP.map((request) => request.date))
  const requests: VisitRequest[] = []

  const cursor = new Date(2025, 0, 1)
  const end = new Date(2026, 11, 31)
  let serial = 0
  while (cursor <= end) {
    const day = cursor.getDay()
    const key = toDateKey(cursor)
    if ([1, 3, 5].includes(day) && !taken.has(key)) {
      // 2025년 하반기부터 방문이 늘고, 먼 미래는 신청이 적은 모양을 흉내 낸다.
      const month = cursor.getFullYear() * 12 + cursor.getMonth()
      const growth = month < 2025 * 12 + 6 ? 0.28 : 0.42
      const future = key > today ? Math.max(0.05, 0.5 - (month - (2026 * 12 + 9)) * 0.15) : 1
      for (const [half, options] of [[0, MORNING], [1, AFTERNOON]] as const) {
        if (random() > growth * future * (half === 0 ? 1.1 : 0.8)) continue
        const [tour, slot] = pick([...options])
        const upcoming = key >= today
        const roll = random()
        const status: VisitStatus = upcoming
          ? roll < 0.55 ? 'pending' : roll < 0.93 ? 'approved' : 'rejected'
          : roll < 0.82 ? 'approved' : 'rejected'
        const internal = random() < 0.15
        const [company, industries] = pick(COMPANIES)
        const size = 1 + Math.floor(random() * (tour === 'combined' ? 8 : 5))
        const visitors: Visitor[] = Array.from({ length: size }, () => {
          const name = pick(SURNAMES) + pick(GIVEN)
          return {
            name,
            title: pick(TITLES),
            org: internal ? 'CL사업담당' : `${company} ${pick(['영업팀', '물류팀', '기획팀', '구매팀', 'IT팀'])}`,
            email: 'visitor@example.com',
            car: random() < 0.3 ? `${10 + Math.floor(random() * 89)}가 ${1000 + Math.floor(random() * 8999)}` : '',
            jobs: [pick(JOB_POOL)],
          }
        })
        const created = new Date(cursor)
        created.setDate(created.getDate() - 7 - Math.floor(random() * 14))
        serial += 1
        requests.push({
          id: `g${serial}`,
          status,
          createdAt: created.toISOString(),
          adminMemo: '',
          tour,
          date: key,
          slot,
          category: internal ? 'internal' : 'external',
          clientType: internal ? undefined : random() < 0.55 ? 'existing' : 'new',
          company: internal ? pick(['CL사업담당', '경영지원팀', 'IT전략팀', '해외법인 교육단']) : company,
          industries: internal ? [] : industries,
          purposes: internal ? ['교육'] : [pick(PURPOSE_POOL)],
          host: { ...toHost(pick(HOSTS)) },
          hostComment: '',
          visitors,
          note: '',
          consent: true,
        })
      }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return requests
}

function toHost([name, title, org]: [string, string, string]) {
  return { name, title, org, phone: '010-0000-0000', email: 'host@lxpantos.example' }
}

export function buildSampleRequests(): VisitRequest[] {
  return [...MOCKUP, ...generate()]
}
