/**
 * TDL Lab write proxy.
 *
 * The site is a static GitHub Pages build, so it cannot hold a GitHub token or
 * send mail. This worker is the only place that holds credentials:
 *
 *   GET  /api/guestbook    → reads data/guestbook.json from the repo
 *   POST /api/guestbook    → masks the visitor's name/company, commits the entry
 *   POST /api/reservation  → emails the team (never written to the public repo,
 *                            because it carries a phone number and email address)
 */

export interface Env {
  /** Fine-grained PAT with Contents: read/write on the site repository. */
  GITHUB_TOKEN: string
  /** e.g. "songwri/Tech-Driven-Logistics" */
  GITHUB_REPO: string
  /** Branch the site is deployed from. */
  GITHUB_BRANCH: string
  /** Resend API key used for reservation + guestbook notifications. */
  RESEND_API_KEY: string
  /** Verified sender, e.g. "TDL Lab <lab@yourdomain.com>". */
  MAIL_FROM: string
  /** Team inbox that receives reservations. */
  MAIL_TO: string
  /** Comma-separated origins allowed to call this worker. */
  ALLOWED_ORIGINS: string
}

const GUESTBOOK_PATH = 'data/guestbook.json'
const MESSAGE_LIMIT = 100

interface GuestbookEntry {
  id: string
  name: string
  company: string
  role: string
  rating: number
  message: string
  createdAt: string
}

function maskToken(token: string) {
  const trimmed = token.trim()
  if (!trimmed) return ''
  return `${[...trimmed][0]}**`
}

function maskName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map(maskToken).join(' ')
}

function corsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((value) => value.trim())
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body: unknown, init: ResponseInit, request: Request, env: Env) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env), ...init.headers },
  })
}

function fail(message: string, status: number, request: Request, env: Env) {
  return new Response(message, { status, headers: corsHeaders(request, env) })
}

function githubHeaders(env: Env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tdl-lab-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function readGuestbook(env: Env): Promise<{ entries: GuestbookEntry[]; sha?: string }> {
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${GUESTBOOK_PATH}?ref=${env.GITHUB_BRANCH}`
  const response = await fetch(url, { headers: githubHeaders(env) })

  if (response.status === 404) return { entries: [] }
  if (!response.ok) throw new Error(`GitHub read failed: ${response.status}`)

  const data = (await response.json()) as { content: string; sha: string }
  const decoded = new TextDecoder().decode(
    Uint8Array.from(atob(data.content.replace(/\n/g, '')), (char) => char.charCodeAt(0)),
  )
  return { entries: JSON.parse(decoded) as GuestbookEntry[], sha: data.sha }
}

async function writeGuestbook(env: Env, entries: GuestbookEntry[], sha: string | undefined, summary: string) {
  const body = new TextEncoder().encode(`${JSON.stringify(entries, null, 2)}\n`)
  const content = btoa(String.fromCharCode(...body))

  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${GUESTBOOK_PATH}`,
    {
      method: 'PUT',
      headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `방명록: ${summary}`,
        content,
        branch: env.GITHUB_BRANCH,
        ...(sha ? { sha } : {}),
      }),
    },
  )

  if (!response.ok) throw new Error(`GitHub write failed: ${response.status} ${await response.text()}`)
}

async function sendMail(env: Env, subject: string, lines: string[]) {
  if (!env.RESEND_API_KEY) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: env.MAIL_TO.split(',').map((value) => value.trim()),
      subject,
      text: lines.join('\n'),
    }),
  })
}

function requireString(value: unknown, field: string, max: number) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}을(를) 입력해 주세요.`)
  const trimmed = value.trim()
  if (trimmed.length > max) throw new Error(`${field}이(가) 너무 깁니다.`)
  return trimmed
}

async function handleGuestbookPost(request: Request, env: Env) {
  const payload = (await request.json()) as Record<string, unknown>

  const name = requireString(payload.name, '이름', 40)
  const company = requireString(payload.company, '소속', 60)
  const role = requireString(payload.role, '직함', 60)
  const message = requireString(payload.message, '메시지', MESSAGE_LIMIT)
  const rating = Number(payload.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('평가는 1~5점 사이여야 합니다.')
  }

  const entry: GuestbookEntry = {
    id: crypto.randomUUID(),
    name: maskName(name),
    company: maskToken(company),
    role,
    rating,
    message,
    createdAt: new Date().toISOString(),
  }

  const { entries, sha } = await readGuestbook(env)
  await writeGuestbook(env, [entry, ...entries], sha, `${entry.name} · ${entry.company}`)

  // The repo only ever gets the masked entry; the team gets the real name by mail.
  await sendMail(env, `[TDL Lab] 방명록 등록 · ${name} (${company})`, [
    `이름: ${name}`,
    `소속: ${company}`,
    `직함: ${role}`,
    `평가: ${rating} / 5`,
    `메시지: ${message}`,
    `등록일시: ${entry.createdAt}`,
  ])

  return { entry }
}

async function handleReservationPost(request: Request, env: Env) {
  const payload = (await request.json()) as Record<string, unknown>

  const date = requireString(payload.date, '방문 희망일', 10)
  const company = requireString(payload.company, '회사명', 60)
  const leadName = requireString(payload.leadName, '투어 대표자', 40)
  const phone = requireString(payload.phone, '연락처', 30)
  const email = requireString(payload.email, '이메일', 120)
  const note = typeof payload.note === 'string' ? payload.note.trim().slice(0, 300) : ''
  const headcount = Number(payload.headcount)
  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 50) {
    throw new Error('방문 인원은 1~50명 사이로 입력해 주세요.')
  }

  await sendMail(env, `[TDL Lab] 방문 예약 신청 · ${company} ${date}`, [
    `방문 희망일: ${date}`,
    `회사명: ${company}`,
    `방문 인원: ${headcount}명`,
    `투어 대표자: ${leadName}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    note ? `요청사항: ${note}` : '요청사항: -',
    '',
    '※ 개인정보가 포함되어 있어 저장소에는 기록되지 않습니다.',
  ])

  return { ok: true }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    try {
      if (pathname === '/api/guestbook' && request.method === 'GET') {
        const { entries } = await readGuestbook(env)
        return json({ entries }, { status: 200 }, request, env)
      }

      if (pathname === '/api/guestbook' && request.method === 'POST') {
        return json(await handleGuestbookPost(request, env), { status: 201 }, request, env)
      }

      if (pathname === '/api/reservation' && request.method === 'POST') {
        return json(await handleReservationPost(request, env), { status: 201 }, request, env)
      }

      return fail('Not found', 404, request, env)
    } catch (error) {
      const message = error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
      return fail(message, 400, request, env)
    }
  },
}
