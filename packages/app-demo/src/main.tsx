import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { App } from './App.tsx'
import { DemoPage } from './pages/DemoPage.tsx'

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/demo-page" element={<DemoPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
