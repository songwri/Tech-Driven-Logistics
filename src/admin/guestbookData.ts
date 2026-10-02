import { maskCompany, maskName } from '@/lib/mask'
import { snapRating } from '@/lib/rating'
import { isGuestbookTour, type GuestbookTour } from '@/lib/visit'

/** 관리자가 보는 방명록 한 건: 실명 · 실제 소속과 공개 표시값, 숨김 여부를 함께 가진다. */
export interface AdminGuestbookEntry {
  id: string
  createdAt: string
  /** 작성자가 입력한 실명 (관리자에게만 보인다) */
  name: string
  /** 작성자가 입력한 실제 소속 */
  company: string
  team: string
  role: string
  rating: number
  message: string
  /** 사이트에 공개되는 가려진 이름 · 소속 */
  displayName: string
  displayCompany: string
  /** 숨김이면 방명록 페이지에 나오지 않는다 */
  hidden: boolean
  /** 어떤 투어 후기인지. 없으면 '미분류' (투어 선택이 생기기 전 기록) */
  tour: GuestbookTour | ''
}

const text = (value: unknown) => (value == null ? '' : String(value))

/** 서버 응답을 안전하게 맞춘다 (빠진 값은 빈 값, 평가는 0.5점 단위 0.5~5). */
export function normalizeGuestbook(raw: unknown): AdminGuestbookEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const entry = (item ?? {}) as Record<string, unknown>
    const rating = Number(entry.rating)
    return {
      id: text(entry.id),
      createdAt: text(entry.createdAt),
      name: text(entry.name),
      company: text(entry.company),
      team: text(entry.team),
      role: text(entry.role),
      rating: Number.isFinite(rating) ? snapRating(rating) : 5,
      message: text(entry.message),
      displayName: text(entry.displayName),
      displayCompany: text(entry.displayCompany),
      hidden: entry.hidden === true,
      tour: isGuestbookTour(entry.tour) ? entry.tour : '',
    }
  })
}

/** 데모 모드용 예시 방명록 (서버 연결 전 화면 확인용). 최신순. */
export function buildSampleGuestbook(now = new Date()): AdminGuestbookEntry[] {
  const day = 24 * 60 * 60 * 1000
  const tourOrder: (GuestbookTour | '')[] = ['center', 'combined', 'lab', 'combined', 'lab', 'center', 'lab', 'center', 'combined', 'lab', '', 'center']
  const rows: [number, string, string, string, string, number, string, boolean][] = [
    [1, '김도현', '세림케미칼', '물류혁신팀', '책임', 5, '로봇이 실제로 작업하는 모습을 가까이서 볼 수 있어 도입 검토에 큰 도움이 됐습니다.', false],
    [3, '박서윤', '누리전자', 'SCM팀', '선임', 4, '현장 적용 관점으로 설명해 주셔서 우리 센터에 맞는 방식을 바로 떠올릴 수 있었습니다.', false],
    [4, '최민재', '오션로지스', '운영담당', '팀장', 5, '설비 담당 엔지니어가 직접 질문에 답해 주셔서 신뢰가 갔습니다.', false],
    [6, '이준호', '한결유통', '구매팀', '매니저', 3, '시간이 조금 짧았습니다. 다음에는 자율주행 쪽도 더 보고 싶습니다.', false],
    [8, '정하린', '마루코스메틱', '풀필먼트', '파트장', 4, 'AMR 동선 최적화 사례가 인상 깊었습니다. 자료도 정리해서 주셨으면 합니다.', false],
    [9, '홍길동', '테스트회사', '', '테스트', 1, 'ㅋㅋㅋ 테스트 입니다', true],
    [12, '윤서진', '미래모빌리티', '신사업팀', '책임', 5, '신기술 PoC를 짧게 검증하는 방식이 우리 팀 일하는 방식과 잘 맞았습니다.', false],
    [15, '강태민', '데일리마트24', '물류기획', '과장', 4, '분류 자동화 설비가 움직이는 걸 보니 설명서보다 이해가 빨랐습니다.', false],
    [19, '오세영', '쇼핑온', '운영지원팀', '사원', 5, '안내해 주신 분이 친절했고 질문마다 구체적인 사례로 답해 주셨습니다.', false],
    [23, '문지후', '모던어패럴', '유통혁신팀', '선임', 4, '로봇팔과 AMR이 함께 일하는 흐름을 한 자리에서 볼 수 있어 좋았습니다.', false],
    [27, '송가은', '푸른식품', '품질관리팀', '책임', 3, '전시 설비 설명은 좋았는데 주차 안내가 조금 부족했습니다.', false],
    [31, '임도윤', '하이홈가전', '물류팀', '팀장', 5, '현장 도입 전에 꼭 와서 봐야 할 곳이라고 팀에 공유했습니다.', false],
  ]
  return rows.map(([ago, name, company, team, role, rating, message, hidden], index) => ({
    id: `sample-${index + 1}`,
    createdAt: new Date(now.getTime() - ago * day).toISOString(),
    name,
    company,
    team,
    role,
    rating,
    message,
    displayName: maskName(name),
    displayCompany: maskCompany(company),
    hidden,
    tour: tourOrder[index],
  }))
}
