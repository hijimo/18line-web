import React from 'react'
import ReactDOM from 'react-dom/client'
import './global.css'

import App from './App'

const root = ReactDOM.createRoot(document.getElementById('root')!)

const startApp = async () => {
  // 只在 VITE_USE_MOCK=true 时启动 MSW
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { worker } = await import('../mocks/browser')
    await worker.start()
  }
  root.render(<App />)
}

startApp()