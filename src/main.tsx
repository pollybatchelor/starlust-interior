import React from 'react'
import ReactDOM from 'react-dom/client'

// @ts-ignore
import App from './App.jsx'

import './index.css'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
