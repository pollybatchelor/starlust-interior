import React from 'react'
import ReactDOM from 'react-dom/client'
// @ts-ignore
import App from './App.jsx'

// This finds the 'root' div in your HTML and attaches the app to it
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)