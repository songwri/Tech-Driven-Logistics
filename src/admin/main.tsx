import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../fonts'
import '../index.css'
import { setAdminSite } from '@/lib/labApi'
import type { AdminSite } from '@/lib/visit'
import AdminApp from './AdminApp'
import { ErrorBoundary } from './ErrorBoundary'

// 같은 화면을 세 페이지가 함께 쓴다. 어느 곳의 관리자 페이지인지는 HTML 의 data-site 로 정한다.
const root = document.getElementById('root')!
const site: AdminSite = root.dataset.site === 'mtv' ? 'mtv' : root.dataset.site === 'hq' ? 'hq' : 'main'
setAdminSite(site)

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AdminApp site={site} />
    </ErrorBoundary>
  </StrictMode>,
)
