import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/utils'
import { languageSummary, hasLanguageNote, formatDateShort, formatSlot, type VisitRequest } from '@/lib/visit'
import { readXlsx } from '@/lib/xlsxRead'
import { parseDelimited, parseTable, visitKey, type ManualInput } from './importLegacy'
import { downloadImportTemplate } from './importTemplate'
import type { ImportResult } from './useAdminData'
import { StatusBadge } from './status'

const EXAMPLE = [
  '순번\t날짜\t요일\t시작시간\t종료시간\t구분\t업체(기관)명\t방문 목적\t방문인원수\t주요 인원\t가이드\t유관부서1\t유관부서2\t유관부서3\t유관부서4\t완료유무\t후속 진행현황',
  '1\t2026-07-27\t월\t13:00\t14:00\t외부\tACME\t영업\t6\t-\t"홍길동 책임\n김철수 선임"\t영업팀\t\t\t\t완료\t',
].join('\n')

/** CSV 는 엑셀이 한글을 CP949(EUC-KR)로 저장하는 경우가 많아, UTF-8 이 아니면 EUC-KR 로 읽는다. */
function decodeText(buffer: ArrayBuffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('euc-kr').decode(buffer)
  }
}

/** 올린 파일 → 셀 표. .xlsx 는 visit_requests 시트(없으면 내용이 있는 첫 시트)를 읽는다. */
async function readTableFile(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase()
  const buffer = await file.arrayBuffer()
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    const sheets = await readXlsx(buffer)
    const hasRows = (rows: string[][]) => rows.some((cells) => cells.some((cell) => cell.trim()))
    const sheet =
      sheets.find((item) => item.name.trim() === 'visit_requests' && hasRows(item.rows)) ??
      sheets.find((item) => item.name !== '안내' && hasRows(item.rows))
    if (!sheet) throw new Error('파일에 내용이 있는 시트가 없습니다.')
    return sheet.rows
  }
  if (name.endsWith('.xls')) throw new Error('예전 엑셀 형식(.xls)은 읽을 수 없습니다. 엑셀에서 .xlsx 로 다시 저장해 올려 주세요.')
  const text = decodeText(buffer)
  return parseDelimited(text, name.endsWith('.csv') ? ',' : '\t')
}

/**
 * 기존에 엑셀 · 구글 시트로 관리하던 방문 이력을 파일 · 붙여넣기로 한 번에 가져온다.
 * 붙여넣은 내용은 구글 시트(visit_requests)에만 저장된다.
 */
export function ImportModal({
  requests,
  onClose,
  onImport,
}: {
  requests: VisitRequest[]
  onClose: () => void
  onImport: (inputs: ManualInput[]) => Promise<ImportResult>
}) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<{ name: string; table: string[][] } | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; skipped: { line: number; reason: string }[] } | null>(null)

  const table = useMemo(() => parseTable(file ? file.table : parseDelimited(text)), [file, text])
  const parsed = table.rows

  const openFile = async (picked: File | undefined) => {
    if (!picked) return
    setError(null)
    setResult(null)
    try {
      setFile({ name: picked.name, table: await readTableFile(picked) })
      setText('')
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : '파일을 읽지 못했습니다.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }
  const existing = useMemo(() => new Set(requests.map(visitKey)), [requests])
  const valid = parsed.filter((row): row is typeof row & { input: ManualInput } => Boolean(row.input))
  const fresh = valid.filter((row) => !existing.has(visitKey(row.input)))
  const invalid = parsed.filter((row) => row.error)

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      const response = await onImport(fresh.map((row) => row.input))
      setResult({
        created: response.created.length,
        skipped: response.skipped.map((item) => ({ line: fresh[item.index]?.line ?? 0, reason: item.reason })),
      })
      setText('')
      setFile(null)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : '가져오기에 실패했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      eyebrow="Import History"
      title="기존 방문 이력 가져오기"
      description="visit_requests 양식 파일(.xlsx · .csv)을 올리거나, 엑셀 · 구글 시트에서 표를 복사해 붙여넣으세요."
      onClose={onClose}
      className="max-w-6xl"
    >
      {result && (
        <div className="mb-5 flex items-start gap-3 border border-[#8ce99a] bg-[#ebfbee] px-4 py-3 text-sm text-[#2b8a3e]" role="status">
          <CheckCircle2 width={18} height={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{result.created}건을 가져왔습니다. 구글 시트(visit_requests)에 저장되었습니다.</p>
            {result.skipped.length > 0 && (
              <ul className="mt-1 text-[13px] text-warm-800">
                {result.skipped.map((item) => (
                  <li key={`${item.line}-${item.reason}`}>
                    {item.line}번째 줄: {item.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void openFile(event.dataTransfer.files[0])
        }}
        className={cn(
          'flex flex-wrap items-center gap-3 border border-dashed px-4 py-4 transition',
          dragging ? 'border-brand bg-brand/5' : 'border-warm-300 bg-cream/40',
        )}
      >
        <FileSpreadsheet width={22} height={22} className="shrink-0 text-warm-600" />
        {file ? (
          <p className="min-w-0 flex-1 text-sm text-warm-800">
            <b className="break-all">{file.name}</b>
            <span className="ml-2 text-[12px] text-warm-600">
              {table.format === 'visit_requests' ? 'visit_requests 양식' : '기존 관리 양식'}으로 읽었습니다
            </span>
          </p>
        ) : (
          <p className="min-w-0 flex-1 text-sm text-warm-600">
            파일을 여기로 끌어다 놓거나 <b className="text-warm-800">파일 선택</b>을 누르세요. (.xlsx · .csv)
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xlsm,.csv,.tsv,.txt"
          className="hidden"
          aria-label="방문 이력 파일"
          onChange={(event) => void openFile(event.target.files?.[0])}
        />
        {file && (
          <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
            <X width={14} height={14} /> 파일 빼기
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <Upload width={14} height={14} /> 파일 선택
        </Button>
        <Button variant="outline" size="sm" onClick={downloadImportTemplate}>
          <Download width={14} height={14} /> 양식 내려받기
        </Button>
      </div>

      {!file && (
        <>
          <p className="mb-1.5 mt-4 font-mono text-[11px] text-warm-600">또는 표를 복사해 붙여넣기</p>
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setResult(null)
            }}
            placeholder={EXAMPLE}
            aria-label="방문 이력 붙여넣기"
            className="font-mono text-[12px] leading-relaxed"
          />
        </>
      )}
      <details className="mt-2 text-[12px] leading-relaxed text-warm-600">
        <summary className="cursor-pointer select-none font-semibold">읽을 수 있는 양식</summary>
        <p className="mt-1">
          <b>① visit_requests 양식</b> — 구글 시트 visit_requests 탭과 같은 제목 행 (양식 내려받기). 제목 이름으로 열을 찾으므로 순서가
          달라도 되고, <b>방문일 · 업체명</b>만 있으면 됩니다. 구글 시트를 그대로 내려받은 파일도 됩니다. 상태가 비어 있으면 승인으로
          가져옵니다.
          <br />
          <b>② 기존 관리 양식</b> — 순번 · 날짜 · 요일 · 시작시간 · 종료시간 · 구분(내부/외부) · 업체(기관)명 · 방문 목적 · 방문인원수 ·
          주요 인원 · 가이드 · 유관부서1~4 · 완료유무 · 후속 진행현황. 완료유무가 완료면 완료, 취소면 취소(통계 제외), 비어 있으면 승인.
          시간 TBD는 ‘시간 미정’, 인원수의 (E)는 영어 투어.
          <br />
          이미 있는 방문(날짜 + 업체 + 시간)은 건너뜁니다.
        </p>
      </details>

      {parsed.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-warm-800">미리보기</span>
            <span className="text-[#2b8a3e]">가져올 기록 {fresh.length}건</span>
            {valid.length - fresh.length > 0 && <span className="text-warm-600">이미 등록됨 {valid.length - fresh.length}건</span>}
            {invalid.length > 0 && (
              <span className="inline-flex items-center gap-1 text-brand">
                <AlertTriangle width={14} height={14} /> 확인 필요 {invalid.length}줄
              </span>
            )}
          </div>
          <div className="mt-2 max-h-[45vh] overflow-auto border border-warm-300/50">
            <table className="w-full min-w-[900px] border-collapse text-[12px]">
              <thead className="sticky top-0 bg-cream">
                <tr className="text-left font-mono text-[11px] text-warm-600">
                  {['줄', '날짜', '시간', '구분', '업체(기관)명', '목적', '인원', '주요 인원', '가이드', '유관부서', '상태', '후속'].map((head) => (
                    <th key={head} className="whitespace-nowrap border-b border-warm-300/50 px-2 py-1.5 font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.map((row) => {
                  if (!row.input) {
                    return (
                      <tr key={row.line} className="bg-brand/5 text-brand">
                        <td className="border-b border-warm-300/30 px-2 py-1.5 font-mono">{row.line}</td>
                        <td colSpan={11} className="border-b border-warm-300/30 px-2 py-1.5">
                          {row.error} — 이 줄은 건너뜁니다
                        </td>
                      </tr>
                    )
                  }
                  const input = row.input
                  const duplicate = existing.has(visitKey(input))
                  return (
                    <tr key={row.line} className={cn('align-top', duplicate && 'text-warm-300 line-through')}>
                      <td className="border-b border-warm-300/30 px-2 py-1.5 font-mono text-warm-600">{row.line}</td>
                      <td className="whitespace-nowrap border-b border-warm-300/30 px-2 py-1.5">{formatDateShort(input.date)}</td>
                      <td className="whitespace-nowrap border-b border-warm-300/30 px-2 py-1.5">{formatSlot(input.slot)}</td>
                      <td className="whitespace-nowrap border-b border-warm-300/30 px-2 py-1.5">
                        {input.category === 'internal' ? '내부' : '외부'}
                        {hasLanguageNote(input) && <span className="ml-1 font-semibold text-brand">{languageSummary(input)}</span>}
                      </td>
                      <td className="border-b border-warm-300/30 px-2 py-1.5 font-semibold">{input.company}</td>
                      <td className="border-b border-warm-300/30 px-2 py-1.5">{input.purposes.join(', ')}</td>
                      <td className="border-b border-warm-300/30 px-2 py-1.5">{input.headcount ?? '미정'}</td>
                      <td className="whitespace-pre border-b border-warm-300/30 px-2 py-1.5">{input.keyPersons}</td>
                      <td className="whitespace-pre border-b border-warm-300/30 px-2 py-1.5">{input.guides}</td>
                      <td className="border-b border-warm-300/30 px-2 py-1.5">{input.departments?.join(', ')}</td>
                      <td className="border-b border-warm-300/30 px-2 py-1.5">
                        {duplicate ? '이미 등록됨' : <StatusBadge status={input.status} />}
                      </td>
                      <td className="whitespace-pre-line border-b border-warm-300/30 px-2 py-1.5">{input.followUp}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {error && <p className="mt-4 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
        <Button onClick={() => void submit()} disabled={pending || fresh.length === 0}>
          {pending ? '가져오는 중…' : `${fresh.length}건 가져오기`}
        </Button>
      </div>
    </Modal>
  )
}
