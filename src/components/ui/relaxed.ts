import { createContext } from 'react'

/**
 * 관리자 수기 등록처럼 신청 화면과 같은 입력 칸을 쓰되 대부분을 필수로 받지 않는 화면에서 켠다.
 * 켜져 있으면 필수(*) 표시를 숨긴다. 그래도 필수인 칸은 strict 로 표시를 남긴다.
 */
export const RelaxedFormContext = createContext(false)
