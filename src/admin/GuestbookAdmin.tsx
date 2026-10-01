import { useMemo, useState } from 'react'
import { Download, ExternalLink, Eye, EyeOff, RefreshCw, RotateCcw, Search, Star, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadWorkbook } from '@/lib/xlsx'
import { GUESTBOOK_URL } from '@/lib/routes'
import { formatRating } from '@/lib/rating'
import { toDateKey } from '@/lib/visit'
import type { AdminGuestbookEntry } from './guestbookData'
import { useAdminGuestbook } from './useAdminGuestbook'

type Filter = 'all' | 'public' | 'hidden'

function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[13px] tabular-nums text-warm-800">
      <Star width={13} height={13} className="fill-brand text-brand" strokeWidth={1.5} aria-hidden />
      {formatRating(value)}
      <span className="sr-only">점</span>
    </span>
  )
}

function VisibilityBadge({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#dee2e6] bg-[#e9ecef] px-2 py-0.5 text-[11px] font-bold text-[#6c757d]">
      <EyeOff width={12} height={12} strokeWidth={2.5} /> 숨김
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#8ce99a] bg-[#d3f9d8] px-2 py-0.5 text-[11px] font-bold text-[#1e6b2e]">
      <Eye width={12} height={12} strokeWidth={2.5} /> 공개
    </span>
  )
}

const ghostButton =
  'inline-flex items-center gap-1 border border-warm-300/60 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800 disabled:opacity-50'

/**
 * 관리자 방명록 관리: 작성자 실명 · 실제 소속을 보고, 부적절한 글은 숨기거나 삭제한다.
 * 숨긴 글은 방명록 페이지에서 바로 사라지고 시트에는 남는다. 삭제는 시트에서도 지워 되돌릴 수 없다.
 */
export function GuestbookAdmin({ adminKey }: { adminKey: string }) {
  const { entries, loading, error, outdated, reload, setHidden, remove, resetDemo, demo } = useAdminGuestbook(adminKey)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const counts = useMemo(() => {
    const hidden = entries.filter((entry) => entry.hidden).length
    const visible = entries.filter((entry) => !entry.hidden)
    const average = visible.length ? visible.reduce((sum, entry) => sum + entry.rating, 0) / visible.length : null
    return { all: entries.length, hidden, public: visible.length, average }
  }, [entries])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries
      .filter((entry) => filter === 'all' || (filter === 'hidden' ? entry.hidden : !entry.hidden))
      .filter(
        (entry) =>
          !needle ||
          [entry.name, entry.company, entry.team, entry.role, entry.message, entry.displayName, entry.displayCompany]
            .join(' ')
            .toLowerCase()
            .includes(needle),
      )
  }, [entries, filter, query])

  const act = async (id: string, task: () => Promise<void>) => {
    setBusyId(id)
    setNotice(null)
    try {
      await task()
    } catch (actionError) {
      setNotice(actionError instanceof Error ? actionError.message : '처리에 실패했습니다.')
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  const exportExcel = () => {
    downloadWorkbook(`TDL_guestbook_${toDateKey(new Date())}.xlsx`, [
      {
        name: '방명록',
        columns: [
          { header: '작성일', width: 12 },
          { header: '평가', width: 6 },
          { header: '이름(실명)', width: 12 },
          { header: '회사명(실제)', width: 18 },
          { header: '팀명', width: 18 },
          { header: '직책', width: 14 },
          { header: '메시지', width: 60 },
          { header: '공개 이름', width: 10 },
          { header: '공개 소속', width: 10 },
          { header: '상태', width: 8 },
        ],
        rows: entries.map((entry) => [
          entry.createdAt ? toDateKey(new Date(entry.createdAt)) : '',
          entry.rating,
          entry.name,
          entry.company,
          entry.team,
          entry.role,
          entry.message,
          entry.displayName,
          entry.displayCompany,
          entry.hidden ? '숨김' : '공개',
        ]),
      },
    ])
  }

  const summary = [
    { label: '전체 방명록', value: counts.all, unit: '건', hint: '숨긴 글 포함' },
    { label: '공개 중', value: counts.public, unit: '건', hint: '방명록 페이지에 표시', accent: 'text-[#2b8a3e]' },
    { label: '숨김', value: counts.hidden, unit: '건', hint: '시트에는 남아 있음' },
    {
      label: '평균 평가',
      value: counts.average === null ? '-' : counts.average.toFixed(1),
      unit: counts.average === null ? '' : '/ 5',
      hint: '공개 글 기준 (방명록 페이지와 같은 값)',
    },
  ]

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: '전체', count: counts.all },
    { id: 'public', label: '공개', count: counts.public },
    { id: 'hidden', label: '숨김', count: counts.hidden },
  ]

  const actions = (entry: AdminGuestbookEntry) => {
    const busy = busyId === entry.id
    if (confirmId === entry.id) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(entry.id, () => remove(entry.id))}
            className="inline-flex items-center gap-1 border border-brand bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? '삭제 중…' : '삭제 확인'}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirmId(null)} className={ghostButton}>
            취소
          </button>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act(entry.id, () => setHidden(entry.id, !entry.hidden))}
          className={ghostButton}
        >
          {entry.hidden ? (
            <>
              <Eye width={13} height={13} /> 다시 표시
            </>
          ) : (
            <>
              <EyeOff width={13} height={13} /> 숨기기
            </>
          )}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirmId(entry.id)}
          aria-label="삭제"
          className="inline-flex items-center border border-transparent p-1.5 text-warm-600 transition hover:text-brand disabled:opacity-50"
        >
          <Trash2 width={15} height={15} />
        </button>
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {demo && (
        <p className="border border-[#ffd8a8] bg-[#fff4e6] px-4 py-2 text-[13px] text-[#9a3412]">
          예시 방명록입니다. 서버가 연결되면 실제 방명록이 여기에 표시됩니다.{' '}
          <button type="button" onClick={resetDemo} className="inline-flex items-center gap-1 font-semibold underline">
            <RotateCcw width={12} height={12} /> 예시 초기화
          </button>
        </p>
      )}

      {outdated && (
        <div className="border border-[#ffc078] bg-[#fff4e6] px-4 py-3 text-sm text-[#9a3412]" role="alert">
          <p className="font-semibold">방명록 관리에는 Apps Script 재배포가 필요합니다.</p>
          <p className="mt-1 text-[13px] leading-relaxed">{outdated}</p>
        </div>
      )}

      {error && <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}

      <div className="grid grid-cols-2 border border-warm-300/50 bg-white lg:grid-cols-4">
        {summary.map((card, index) => (
          <div
            key={card.label}
            className={cn(
              'px-5 py-4',
              index % 2 === 1 && 'border-l border-warm-300/40',
              index >= 2 && 'border-t border-warm-300/40 lg:border-t-0',
              index === 2 && 'lg:border-l',
            )}
          >
            <p className="text-[13px] font-semibold text-warm-600">{card.label}</p>
            <p className={cn('mt-1 text-[2rem] font-semibold leading-none tracking-tight tabular-nums', card.accent ?? 'text-warm-800')}>
              {card.value}
              {card.unit && <span className="ml-1 text-base font-medium text-warm-600">{card.unit}</span>}
            </p>
            <p className="mt-2 text-[12px] text-warm-600">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="border border-warm-300/50 bg-white" aria-label="방명록 목록">
        <div className="flex flex-wrap items-center gap-3 border-b border-warm-300/40 px-4 py-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="공개 상태 필터">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 border px-3 py-1.5 text-[13px] font-semibold transition',
                  filter === item.id
                    ? 'border-warm-800 bg-warm-800 text-white'
                    : 'border-warm-300/60 text-warm-600 hover:border-warm-800 hover:text-warm-800',
                )}
              >
                {item.label}
                <span className={cn('font-mono text-[11px] tabular-nums', filter === item.id ? 'text-white/70' : 'text-warm-600')}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 border border-warm-300/60 px-2 py-1.5 focus-within:border-brand">
            <Search width={14} height={14} className="text-warm-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 · 회사 · 팀 · 메시지 검색"
              aria-label="방명록 검색"
              className="w-48 bg-transparent text-[13px] text-warm-800 outline-none placeholder:text-warm-600/70"
            />
          </label>
          <div className="flex gap-1.5">
            <a href={GUESTBOOK_URL} target="_blank" rel="noreferrer" className={ghostButton}>
              <ExternalLink width={13} height={13} /> 공개 페이지
            </a>
            <button type="button" onClick={() => void reload()} disabled={loading || demo} className={ghostButton}>
              <RefreshCw width={13} height={13} className={loading ? 'animate-spin' : undefined} /> 새로고침
            </button>
            <button type="button" onClick={exportExcel} disabled={entries.length === 0} className={ghostButton}>
              <Download width={13} height={13} /> 엑셀
            </button>
          </div>
        </div>

        {notice && (
          <p className="flex items-center justify-between border-b border-brand/30 bg-brand/5 px-4 py-2 text-sm text-brand">
            {notice}
            <button type="button" onClick={() => setNotice(null)} aria-label="닫기">
              <X width={14} height={14} />
            </button>
          </p>
        )}

        <p className="px-4 pt-3 text-[12px] tabular-nums text-warm-600">{rows.length}건</p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-warm-300/40 text-left text-[12px] text-warm-600">
                <th className="py-2 pl-4 pr-2 font-semibold">작성일</th>
                <th className="px-2 py-2 font-semibold">평가</th>
                <th className="px-2 py-2 font-semibold">작성자</th>
                <th className="px-2 py-2 font-semibold">메시지</th>
                <th className="px-2 py-2 font-semibold">상태</th>
                <th className="py-2 pl-2 pr-4 text-right font-semibold">처리</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0
                ? Array.from({ length: 4 }, (_, index) => (
                    <tr key={index} className="border-b border-warm-300/30" aria-hidden>
                      {[16, 8, 28, 56, 12, 24].map((width, cell) => (
                        <td key={cell} className="px-2 py-4 first:pl-4 last:pr-4">
                          <div className="h-3.5 animate-pulse bg-warm-300/30" style={{ width: `${width * 4}px`, maxWidth: '100%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((entry) => (
                    <tr
                      key={entry.id}
                      className={cn(
                        'border-b border-warm-300/30 align-top transition',
                        entry.hidden ? 'bg-[#f1f3f5] text-[#868e96]' : 'hover:bg-cream/60',
                      )}
                    >
                      <td className="whitespace-nowrap py-3 pl-4 pr-2 font-mono tabular-nums">{formatDate(entry.createdAt)}</td>
                      <td className="px-2 py-3">
                        <Rating value={entry.rating} />
                      </td>
                      <td className="px-2 py-3">
                        <p className={cn('font-semibold', !entry.hidden && 'text-warm-800')}>
                          {entry.name || '(이름 없음)'}
                          {entry.role && <span className="ml-1.5 font-normal text-warm-600">{entry.role}</span>}
                        </p>
                        <p className="text-[12px] text-warm-600">
                          {[entry.company, entry.team].filter(Boolean).join(' · ') || '-'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-warm-600/80">
                          공개 표시 {entry.displayName || '-'} / {entry.displayCompany || '-'}
                        </p>
                      </td>
                      <td className={cn('max-w-[420px] px-2 py-3 leading-relaxed', !entry.hidden && 'text-warm-800')}>
                        {entry.message}
                      </td>
                      <td className="px-2 py-3">
                        <VisibilityBadge hidden={entry.hidden} />
                      </td>
                      <td className="whitespace-nowrap py-3 pl-2 pr-4 text-right">{actions(entry)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-warm-600">
            {entries.length === 0
              ? '아직 남겨진 방명록이 없습니다. 방문자가 방명록 페이지에서 글을 남기면 여기에 나타납니다.'
              : '조건에 맞는 방명록이 없습니다.'}
          </div>
        )}
      </section>
    </div>
  )
}
