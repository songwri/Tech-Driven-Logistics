import { useMemo, useState } from 'react'
import { BarChart3, CalendarRange, FileDown, FileInput, LogOut, MessageSquareText, Plus, RefreshCw, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import {
  ADMIN_SCOPES,
  formatDateShort,
  headcountOf,
  inAdminScope,
  isConfirmed,
  isCounted,
  toDateKey,
  type AdminScope,
  type VisitStatus,
} from '@/lib/visit'
import { SERVER_URL } from '@/lib/labApi'
import { useAdminData } from './useAdminData'
import { AdminCalendar } from './AdminCalendar'
import { BlockDialog } from './BlockDialog'
import { ActionPanel, UpcomingPanel } from './ActionPanel'
import { RequestTable, type StatusFilter } from './RequestTable'
import { RequestModal } from './RequestModal'
import { StatsView } from './StatsView'
import { GuestbookAdmin } from './GuestbookAdmin'
import { DiagnoseButton } from './DiagnosePanel'
import { ManualVisitModal } from './ManualVisitModal'
import { ImportModal } from './ImportModal'
import { downloadVisitRequests } from './importTemplate'

type Tab = 'dashboard' | 'stats' | 'guestbook'

/** 메일의 '확인하고 승인 · 거절하기' 버튼이 여는 주소: /admin/?review=<예약 id> */
function readReviewId() {
  try {
    return new URLSearchParams(window.location.search).get('review')
  } catch {
    return null
  }
}

function clearReviewParam() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('review')) return
    url.searchParams.delete('review')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch {
    /* 주소 정리 실패는 무시 (새로고침 시 같은 예약이 다시 열릴 뿐) */
  }
}

function LoginPanel({
  onLogin,
  error,
  loading,
  fromMail,
}: {
  onLogin: (key: string) => void
  error: string | null
  loading: boolean
  fromMail: boolean
}) {
  const [key, setKey] = useState('')
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (key.trim()) onLogin(key.trim())
      }}
      className="mx-auto mt-16 max-w-sm border border-warm-300/50 bg-white p-8"
    >
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-brand">Admin</p>
      <h2 className="mt-2 text-xl font-bold text-warm-800">관리자 로그인</h2>
      <p className="mt-1 text-sm text-warm-600">Apps Script에 설정한 관리자 키를 입력하세요.</p>
      {fromMail && (
        <p className="mt-3 border-l-2 border-brand bg-cream px-3 py-2 text-[13px] text-warm-800">
          메일에서 연 예약은 로그인하면 바로 상세 화면으로 열립니다.
        </p>
      )}
      <div className="mt-6">
        <Field label="관리자 키" required>
          <Input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoFocus autoComplete="current-password" />
        </Field>
      </div>
      {error && <p className="mt-3 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{error}</p>}
      <Button type="submit" className="mt-6 w-full" disabled={loading}>
        {loading ? '확인 중…' : '로그인'}
      </Button>
    </form>
  )
}

export default function AdminApp() {
  const data = useAdminData()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  // 메일 버튼으로 들어오면 해당 예약을 바로 연다 (로그인 · 목록 로딩이 끝나는 대로)
  const [reviewId] = useState(readReviewId)
  const [openId, setOpenId] = useState<string | null>(reviewId)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scope, setScope] = useState<'month' | 'upcoming' | 'all'>('upcoming')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dialog, setDialog] = useState<'manual' | 'import' | null>(null)
  const [blockRange, setBlockRange] = useState<{ start: string; end: string } | null>(null)

  /** 요약 카드를 누르면 해당 조건으로 아래 목록을 바로 보여준다. */
  const focusList = (nextScope: 'month' | 'upcoming' | 'all', nextStatus: StatusFilter) => {
    setSelectedDate(null)
    setScope(nextScope)
    setStatusFilter(nextStatus)
    document.getElementById('request-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // 센터 · Lab 담당 관리자가 각자 관련 투어만 볼 수 있게 한다. 기본은 전체.
  const [adminScope, setAdminScope] = useState<AdminScope>('all')
  const allRequests = data.requests
  const requests = useMemo(
    () => (adminScope === 'all' ? allRequests : allRequests.filter((request) => inAdminScope(request.tour, adminScope))),
    [allRequests, adminScope],
  )
  const today = toDateKey(new Date())
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-`

  const summary = useMemo(() => {
    const inMonth = requests.filter((request) => request.date.startsWith(monthPrefix))
    const upcomingApproved = requests.filter((request) => request.status === 'approved' && request.date >= today)
    const counted = inMonth.filter((request) => isCounted(request.status))
    const pending = requests.filter((request) => request.status === 'pending')
    const overdue = pending.filter((request) => request.date < today).length
    return [
      {
        label: '승인 대기',
        value: pending.length - overdue,
        unit: '건',
        accent: 'text-[#c2410c]',
        hint: overdue > 0 ? `방문일 지난 대기 ${overdue}건 별도` : '방문일이 남은 요청',
        focus: ['upcoming', 'pending'] as const,
      },
      {
        label: '다가오는 확정 방문',
        value: upcomingApproved.length,
        unit: '건',
        accent: 'text-[#2b8a3e]',
        hint: `예정 인원 ${upcomingApproved.reduce((sum, request) => sum + headcountOf(request), 0)}명`,
        focus: ['upcoming', 'approved'] as const,
      },
      {
        label: `${month.getMonth() + 1}월 신청`,
        value: counted.length,
        unit: '건',
        accent: 'text-warm-800',
        hint: `승인·완료 ${counted.filter((request) => isConfirmed(request.status)).length} · 거절·취소 ${inMonth.length - counted.length}건은 제외`,
        focus: ['month', 'all'] as const,
      },
      {
        label: `${month.getMonth() + 1}월 방문 인원`,
        value: counted.filter((request) => isConfirmed(request.status)).reduce((sum, request) => sum + headcountOf(request), 0),
        unit: '명',
        accent: 'text-warm-800',
        hint: '승인 · 완료 기준',
        focus: ['month', 'approved'] as const,
      },
    ]
  }, [requests, monthPrefix, month, today])

  const tableRequests = useMemo(() => {
    if (selectedDate) return requests.filter((request) => request.date === selectedDate)
    if (scope === 'month') return requests.filter((request) => request.date.startsWith(monthPrefix))
    if (scope === 'upcoming') return requests.filter((request) => request.date >= today)
    return requests
  }, [requests, selectedDate, scope, monthPrefix, today])

  const scopeLabel = selectedDate
    ? formatDateShort(selectedDate)
    : scope === 'month'
      ? `${month.getFullYear()}년 ${month.getMonth() + 1}월`
      : scope === 'upcoming'
        ? '오늘 이후 전체'
        : '전체 기간'

  const setStatus = async (id: string, status: VisitStatus) => {
    setBusyId(id)
    setNotice(null)
    try {
      await data.setStatus(id, status)
    } catch (statusError) {
      setNotice(statusError instanceof Error ? statusError.message : '상태 변경에 실패했습니다.')
    } finally {
      setBusyId(null)
    }
  }

  const openRequest = allRequests.find((request) => request.id === openId)
  const reviewMissing =
    Boolean(reviewId) && openId === reviewId && data.authenticated && !data.loading && !openRequest
  const closeModal = () => {
    setOpenId(null)
    clearReviewParam()
  }

  return (
    <div className="min-h-screen bg-[#f7f6f5]">
      <header className="border-b-4 border-brand bg-[#1e2229] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex items-center gap-4">
            <Logo tone="light" className="h-8" />
            <div>
              <h1 className="text-lg font-bold">방문 예약 관리자</h1>
              <p className="text-[12px] text-white/60">예약 요청 확인 · 승인/거절 · 방문 통계 · 방명록</p>
            </div>
          </div>
          {data.authenticated && (
            <div className="flex items-center gap-2">
              {data.mode === 'live' ? (
                <>
                  <button
                    type="button"
                    onClick={() => void data.reload()}
                    className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-[12px] text-white/80 transition hover:border-white hover:text-white"
                  >
                    <RefreshCw width={13} height={13} className={data.loading ? 'animate-spin' : undefined} /> 새로고침
                  </button>
                  <DiagnoseButton diagnose={data.diagnose} />
                  <button
                    type="button"
                    onClick={data.logout}
                    className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-[12px] text-white/80 transition hover:border-white hover:text-white"
                  >
                    <LogOut width={13} height={13} /> 로그아웃
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={data.resetDemo}
                  className="inline-flex items-center gap-1.5 border border-white/25 px-3 py-1.5 text-[12px] text-white/80 transition hover:border-white hover:text-white"
                >
                  <RotateCcw width={13} height={13} /> 데모 데이터 초기화
                </button>
              )}
            </div>
          )}
        </div>
        {data.authenticated && (
          <nav className="mx-auto flex max-w-7xl gap-1 px-4 md:px-8" aria-label="관리자 메뉴">
            {(
              [
                ['dashboard', '예약 대시보드', CalendarRange],
                ['stats', '방문 통계', BarChart3],
                ['guestbook', '방명록', MessageSquareText],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition',
                  tab === id ? 'bg-[#f7f6f5] text-warm-800' : 'text-white/60 hover:text-white',
                )}
              >
                <Icon width={16} height={16} /> {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {data.mode === 'demo' && (
        <p className="border-b border-[#ffd8a8] bg-[#fff4e6] px-4 py-2 text-center text-[12px] text-[#9a3412]">
          예약 서버(VITE_LAB_API)가 연결되지 않아 <b>데모 데이터</b>로 표시 중입니다. 변경 내용은 이 브라우저에만 저장됩니다.
        </p>
      )}

      {!data.authenticated ? (
        <LoginPanel
          onLogin={(key) => void data.login(key)}
          error={data.error}
          loading={data.loading}
          fromMail={Boolean(reviewId)}
        />
      ) : (
        <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
          {data.error && <p className="border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">{data.error}</p>}
          {data.outdatedServer && (
            <div className="border border-[#ffc078] bg-[#fff4e6] px-4 py-3 text-sm text-[#9a3412]" role="alert">
              <p className="font-semibold">
                사이트가 연결된 Apps Script 배포가 이전 버전({data.outdatedServer.version})입니다. 재배포가 필요합니다.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed">
                연결된 웹앱 주소: <code className="break-all bg-white/70 px-1 font-mono text-[12px]">{SERVER_URL}</code>
                <br />
                Apps Script <b>배포 → 배포 관리</b>에서 <b>이 주소의 배포 ID</b>와 같은 배포를 연필로 열고 <b>버전: 새 버전 → 배포</b>
                하세요. 최신 버전이면 괄호 안이 <b>2026-10-01.division</b> 이후로 바뀝니다.
                <br />
                주소 끝이 <b>/dev</b>인 ‘테스트 배포’는 항상 최신 코드로 돌아가므로 테스트가 통과해도, 사이트가 쓰는 <b>/exec</b>{' '}
                배포는 배포할 때 고른 버전에 고정되어 있습니다. 새 배포를 만들었다면 GitHub 변수 VITE_LAB_API 도 그 주소로 바꾸고 Actions
                를 다시 실행해야 합니다.
              </p>
            </div>
          )}
          {reviewMissing && (
            <p className="flex items-center justify-between gap-3 border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">
              메일에서 연 예약(번호 {reviewId?.slice(0, 8)})을 찾을 수 없습니다. 삭제되었거나 다른 시트에 저장된 예약일 수 있습니다.
              <button type="button" onClick={closeModal} aria-label="닫기">
                <X width={14} height={14} />
              </button>
            </p>
          )}

          {tab !== 'guestbook' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="radiogroup" aria-label="보기 범위">
              <span className="text-[13px] font-semibold text-warm-600">보기 범위</span>
              <div className="inline-flex border border-warm-300/60 bg-white">
                {ADMIN_SCOPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={adminScope === item.id}
                    onClick={() => {
                      setAdminScope(item.id)
                      setSelectedDate(null)
                    }}
                    title={item.hint}
                    className={cn(
                      'px-3 py-1.5 text-[13px] font-semibold transition',
                      adminScope === item.id ? 'bg-warm-800 text-white' : 'text-warm-600 hover:text-warm-800',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="text-[12px] text-warm-600">
                {ADMIN_SCOPES.find((item) => item.id === adminScope)?.hint}
                {adminScope !== 'all' && ` · ${requests.length}건 (요약 · 달력 · 목록 · 통계에 모두 적용)`}
              </span>
            </div>
          )}

          {tab === 'dashboard' ? (
            <>
              <div className="grid grid-cols-2 border border-warm-300/50 bg-white lg:grid-cols-4">
                {summary.map((card, index) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => focusList(card.focus[0], card.focus[1])}
                    className={cn(
                      'px-5 py-4 text-left transition hover:bg-cream/60',
                      index % 2 === 1 && 'border-l border-warm-300/40',
                      index >= 2 && 'border-t border-warm-300/40 lg:border-t-0',
                      index === 2 && 'lg:border-l',
                    )}
                  >
                    <p className="text-[13px] font-semibold text-warm-600">{card.label}</p>
                    <p className={cn('mt-1 text-[2rem] font-semibold leading-none tracking-tight tabular-nums', card.accent)}>
                      {card.value}
                      <span className="ml-1 text-base font-medium text-warm-600">{card.unit}</span>
                    </p>
                    <p className="mt-2 text-[12px] text-warm-600">{card.hint}</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <ActionPanel
                  requests={requests}
                  today={today}
                  busyId={busyId}
                  onOpen={setOpenId}
                  onSetStatus={(id, status) => void setStatus(id, status)}
                  onShowAll={() => focusList('all', 'pending')}
                />
                <UpcomingPanel requests={requests} today={today} onOpen={setOpenId} />
              </div>

              <AdminCalendar
                month={month}
                onMonthChange={(next) => {
                  setMonth(next)
                  setSelectedDate(null)
                }}
                requests={requests}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onOpen={setOpenId}
                blocks={data.blocks}
                onBlock={(start, end) => setBlockRange({ start, end })}
              />

              <section id="request-list" className="scroll-mt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold text-warm-800">예약 요청 관리</h2>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDialog('manual')}
                        className="inline-flex items-center gap-1 border border-warm-300/60 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800"
                      >
                        <Plus width={13} height={13} /> 수기 등록
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog('import')}
                        className="inline-flex items-center gap-1 border border-warm-300/60 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800"
                      >
                        <FileInput width={13} height={13} /> 기존 이력 가져오기
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadVisitRequests(allRequests)}
                        disabled={allRequests.length === 0}
                        title="전체 기록을 구글 시트 visit_requests 탭과 같은 양식의 엑셀로 내려받습니다"
                        className="inline-flex items-center gap-1 border border-warm-300/60 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-warm-600 transition hover:border-warm-800 hover:text-warm-800 disabled:opacity-50"
                      >
                        <FileDown width={13} height={13} /> 전체 내려받기
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedDate ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDate(null)}
                        className="inline-flex items-center gap-1.5 border border-brand bg-brand/5 px-3 py-1.5 text-[13px] font-semibold text-brand"
                      >
                        {formatDateShort(selectedDate)} 만 보기 <X width={13} height={13} />
                      </button>
                    ) : (
                      <div className="inline-flex border border-warm-300/60 bg-white" role="radiogroup" aria-label="조회 범위">
                        {(
                          [
                            ['upcoming', '오늘 이후'],
                            ['all', '전체'],
                            ['month', '달력 월'],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={scope === value}
                            onClick={() => setScope(value)}
                            className={cn(
                              'px-3 py-1.5 text-[13px] font-semibold transition',
                              scope === value ? 'bg-warm-800 text-white' : 'text-warm-600 hover:text-warm-800',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {notice && (
                  <p className="mb-3 flex items-center justify-between border border-brand/40 bg-brand/5 px-3 py-2 text-sm text-brand">
                    {notice}
                    <button type="button" onClick={() => setNotice(null)} aria-label="닫기">
                      <X width={14} height={14} />
                    </button>
                  </p>
                )}
                <RequestTable
                  requests={tableRequests}
                  scopeLabel={scopeLabel}
                  onOpen={setOpenId}
                  onSetStatus={(id, status) => void setStatus(id, status)}
                  busyId={busyId}
                  status={statusFilter}
                  onStatusChange={setStatusFilter}
                />
              </section>
            </>
          ) : tab === 'stats' ? (
            <StatsView requests={requests} />
          ) : (
            <GuestbookAdmin adminKey={data.adminKey} />
          )}
        </main>
      )}

      {dialog === 'manual' && (
        <ManualVisitModal
          onClose={() => setDialog(null)}
          onSubmit={async (input) => {
            const created = await data.create(input)
            setNotice(`${formatDateShort(created.date)} ${created.company} 방문을 등록했습니다.`)
          }}
        />
      )}
      {blockRange && (
        <BlockDialog
          start={blockRange.start}
          end={blockRange.end}
          blocks={data.blocks}
          requests={allRequests}
          onClose={() => setBlockRange(null)}
          onAdd={async (input) => {
            await data.addBlocks(input)
            setNotice(`${input.dates.length}일 일정을 막았습니다.`)
          }}
          onRemove={async (ids) => {
            await data.removeBlocks(ids)
            setNotice(`막힌 일정 ${ids.length}건을 해제했습니다.`)
          }}
        />
      )}
      {dialog === 'import' && (
        <ImportModal requests={allRequests} onClose={() => setDialog(null)} onImport={data.importMany} />
      )}

      {openRequest && (
        <RequestModal
          key={openRequest.id}
          request={openRequest}
          requests={allRequests}
          onClose={closeModal}
          onSetStatus={data.setStatus}
          onUpdate={data.update}
          onDelete={data.remove}
        />
      )}
    </div>
  )
}
