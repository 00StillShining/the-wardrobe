import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/fraunces/index.css'
import '@fontsource-variable/inter/index.css'
import './ui/tokens.css'
import './ui/panels.css'
import App from './App'
import { initHashSync } from './state/navigation'
import { AppErrorBoundary } from './ui/AppErrorBoundary'

initHashSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
