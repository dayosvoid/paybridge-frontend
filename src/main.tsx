import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { API_BASE_URL, USE_MOCK } from './config'
import { installMockApi } from './mocks/mockApi'
import './index.css'

if (USE_MOCK) {
  installMockApi(API_BASE_URL)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
