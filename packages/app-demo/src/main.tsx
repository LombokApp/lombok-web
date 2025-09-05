import { AppBrowserSdkContextProvider } from '@lombokapp/app-browser-sdk'
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router'

import { App } from './App.tsx'
import { DemoPage } from './pages/DemoPage.tsx'
import { FolderRootPage } from './pages/FolderRootPage.tsx'

function Root() {
  const navigate = useNavigate()
  const handleNavigateTo = React.useCallback(
    (to: { pathAndQuery: string }) => {
      void navigate(
        to.pathAndQuery.startsWith('/')
          ? to.pathAndQuery
          : `/${to.pathAndQuery}`,
        {
          replace: true,
        },
      )
    },
    [navigate],
  )
  return (
    <AppBrowserSdkContextProvider onNavigateTo={handleNavigateTo}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/demo-page" element={<DemoPage />} />
        <Route path="/folders/*" element={<FolderRootPage />} />
      </Routes>
    </AppBrowserSdkContextProvider>
  )
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)
