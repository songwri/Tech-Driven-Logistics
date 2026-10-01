import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../fonts'
import '../index.css'
import GuestbookPage from './GuestbookPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GuestbookPage />
  </StrictMode>,
)
