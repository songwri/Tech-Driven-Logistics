export interface OverlayPoint {
  label: string
  description: string
}

export interface TechItem {
  id: string
  name: string
  englishName: string
  tagline: string
  sceneCaption: string
  overlayPoints: OverlayPoint[]
  effects: string[]
  keywords: string[]
}

export const techItems: TechItem[] = [
  {
    id: 'robot-arm',
    name: '로봇팔',
    englishName: 'Robot Arm Automation',
    tagline: '정밀한 반복 작업을 자동화하는 핵심 장치',
    sceneCaption: '로봇팔 피킹 · 적재 · 이송 동작을 3D 와이어프레임으로 재현',
    overlayPoints: [
      { label: 'Base Joint', description: '회전 반경 최적화' },
      { label: 'Shoulder Joint', description: '하중 안정성 확보' },
      { label: 'Elbow Joint', description: '정밀 위치 제어' },
      { label: 'Wrist Joint', description: '엔드이펙터 방향 제어' },
      { label: 'End Effector', description: '그리퍼 · 흡착 기술 적용' },
    ],
    effects: ['반복 작업 자동화', '작업자 부담 감소', '정밀도 및 처리속도 향상'],
    keywords: ['모터 제어', '토크 제어', '비전 인식', '안전 정지 로직'],
  },
  {
    id: 'amr-agv',
    name: 'AMR / AGV',
    englishName: 'Autonomous Mobile Robot',
    tagline: '센터 내 자율주행으로 물류 흐름을 최적화',
    sceneCaption: '센터 내 자율주행 경로와 장애물 회피 로직을 재현',
    overlayPoints: [
      { label: 'SLAM 위치 인식', description: '실시간 자기 위치 추정' },
      { label: '라이다 · 비전 센서', description: '주변 환경 인식' },
      { label: '경로 최적화', description: '최단 이동 경로 산출' },
      { label: '안전 주행 로직', description: '장애물 감지 시 정지/우회' },
    ],
    effects: ['운반 작업 무인화', '동선 최적화', '작업 대기시간 단축'],
    keywords: ['SLAM', '경로 계획', '장애물 회피', '안전 주행'],
  },
  {
    id: 'autonomous-driving',
    name: '자율주행 차량',
    englishName: 'Autonomous Driving',
    tagline: '도로 · 야드 환경에서의 자율주행 기술 검증',
    sceneCaption: '도로 주행 시 센서 융합과 차선 인식 과정을 재현',
    overlayPoints: [
      { label: '센서 융합', description: '카메라 · 레이더 · 라이다 통합 인식' },
      { label: '차선 인식', description: '주행 차로 실시간 추적' },
      { label: '경로 계획', description: '동적 상황 대응 경로 생성' },
      { label: '안전 제어', description: '정지선 대응 및 비상 제동' },
    ],
    effects: ['운영 효율 개선', '운전자 피로도 감소', '운행 안전성 강화'],
    keywords: ['센서 융합', '경로 계획', '안전 제어'],
  },
  {
    id: 'automation-facility',
    name: '자동화 설비',
    englishName: 'Automation Facility',
    tagline: '컨베이어 · 소터 기반의 물류 흐름 자동화',
    sceneCaption: '컨베이어 · 소터 · 셔틀 시스템의 흐름을 재현',
    overlayPoints: [
      { label: '컨베이어 라인', description: '연속 이송 흐름 구성' },
      { label: '소터 · 분류기', description: '자동 분류 및 라우팅' },
      { label: '셔틀 시스템', description: '고밀도 보관 · 반출 자동화' },
    ],
    effects: ['처리량 향상', '병목 최소화', '표준화된 운영 구조', '안정적 품질 확보'],
    keywords: ['처리량', '표준화', '운영 안정성'],
  },
  {
    id: 'poc',
    name: '신기술 PoC',
    englishName: 'New Tech PoC',
    tagline: '실험 → 검증 → 적용으로 이어지는 기술 실증 체계',
    sceneCaption: '실험 → 데이터 수집 → 검증으로 이어지는 PoC 흐름을 재현',
    overlayPoints: [
      { label: '실험 설계', description: '가설 수립 및 테스트베드 구성' },
      { label: '데이터 수집', description: '센서 · 로그 기반 실증 데이터 확보' },
      { label: '검증', description: '사업 적용 가능성 평가' },
    ],
    effects: ['빠른 실증과 의사결정', '실패 비용 최소화', '기술 검증 체계 확보'],
    keywords: ['실증', '검증', '사업화 검토'],
  },
]
