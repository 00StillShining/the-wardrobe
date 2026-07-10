import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/fraunces/index.css'
import '@fontsource-variable/inter/index.css'
import './styles/tokens.css'
import './styles/globals.css'
import App from './app/App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
