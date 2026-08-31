/**
 * Guestbook entries are stored in a PUBLIC repository, so names and companies
 * are masked before they are ever written. The worker masks on write; these
 * helpers exist so the browser can preview exactly what will be published.
 *
 *   홍길동      → 홍**
 *   David Kim  → D** K**
 *   LG전자      → L**
 */
function maskToken(token: string) {
  const trimmed = token.trim()
  if (!trimmed) return ''
  return `${[...trimmed][0]}**`
}

export function maskName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map(maskToken).join(' ')
}

export function maskCompany(company: string) {
  return maskToken(company)
}
