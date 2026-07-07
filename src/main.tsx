import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/fraunces/index.css'
import '@fontsource-variable/inter/index.css'
import './ui/tokens.css'
import App from './App'
import { initHashSync } from './state/navigation'

initHashSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
