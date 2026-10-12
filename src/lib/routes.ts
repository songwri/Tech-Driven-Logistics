/** 예약 신청 페이지 (reserve/index.html) */
export const RESERVE_URL = `${import.meta.env.BASE_URL}reserve/`

/** 방명록 페이지 (guestbook/index.html) */
export const GUESTBOOK_URL = `${import.meta.env.BASE_URL}guestbook/`

/** 관리자 페이지: 메가와이즈 · TDL Lab / 시화MTV / 통합 관제 */
export const ADMIN_URLS = {
  main: `${import.meta.env.BASE_URL}admin/`,
  mtv: `${import.meta.env.BASE_URL}admin-mtv/`,
  hq: `${import.meta.env.BASE_URL}admin-hq/`,
} as const
