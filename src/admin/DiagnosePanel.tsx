import { useState } from 'react'
import { Stethoscope, X } from 'lucide-react'
import type { ServerHealth } from './useAdminData'

/**
 * 서버 진단: 예약이 실제로 어느 스프레드시트 · 탭에 저장되는지, 코드 버전과 행 수를 보여준다.
 * "메일은 오는데 시트에 없다 / 승인 링크가 예약을 못 찾는다" 같은 문제를 원인별로 가르기 위한 도구.
 */
export function DiagnoseButton({ diagnose }: { diagnose: () => Promise<ServerHealth> }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<ServerHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      setResult(await diagnose())
    } catch (diagnoseError) {
      setResult(null)
      setError(
        diagnoseError instanceof Error
          ? `${diagnoseError.message} (Apps Script 코드가 최신 버전인지 확인하세요)`
          : '진단에 실패했습니다.',
      )
    } finally {
      setLoading(false)
    }
  }

  const sheet = result?.visitSheet
  const rows: [string, React.ReactNode, boolean?][] = result
    ? [
        ['코드 버전', result.version],
        [
          '저장 스프레드시트',
          <a key="s" href={result.spreadsheet.url} target="_blank" rel="noreferrer" className="text-brand underline">
            {result.spreadsheet.name} ↗
          </a>,
        ],
        ['예약 탭(visit_requests)', sheet ? '있음' : '없음 — 아직 한 건도 저장되지 않음', !sheet],
        ['제목 행', sheet ? (sheet.headerOk ? '정상' : '깨짐') : '-', sheet ? !sheet.headerOk : false],
        [
          '빠진 열',
          sheet ? (sheet.missingColumns.length ? sheet.missingColumns.join(', ') : '없음') : '-',
          Boolean(sheet?.missingColumns.length),
        ],
        ['저장된 예약', sheet ? `${sheet.reservations}건 (승인 링크용 토큰 있음 ${sheet.withToken}건)` : '-'],
        [
          '마지막 예약',
          sheet?.last
            ? `${sheet.last.row}행 · ${sheet.last.date} · ${sheet.last.status} · 번호 ${sheet.last.id} · 토큰 ${sheet.last.hasToken ? '있음' : '없음'}`
            : '-',
          sheet?.last ? !sheet.last.hasToken : false,
        ],
        ['메일 버튼 주소', <span key="u" className="break-all font-mono text-[11px]">{result.webAppUrl}</span>],
        ['탭 목록', result.tabs.map((tab) => `${tab.name}(${tab.rows}행)`).join(' · ')],
      ]
    : []

  return (
    <>
      <button
        type="button"
        onClick={() => void run()}
        className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-[12px] text-white/80 transition hover:border-white hover:text-white"
      >
        <Stethoscope width={13} height={13} /> 서버 진단
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-20" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl border border-warm-300/50 bg-white p-5 text-warm-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">서버 진단</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="text-warm-600 hover:text-brand">
                <X width={16} height={16} />
              </button>
            </div>
            {loading && <p className="py-6 text-center text-sm text-warm-600">확인 중…</p>}
            {error && <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}
            {result && !loading && (
              <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-[13px]">
                {rows.map(([label, value, bad]) => (
                  <div key={label} className="contents">
                    <dt className="text-warm-600">{label}</dt>
                    <dd className={bad ? 'font-semibold text-brand' : undefined}>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-4 text-[11px] text-warm-600">
              시트에 예약이 안 보이면 위 "저장 스프레드시트" 링크로 여세요. 지금 보고 계신 파일과 다를 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
