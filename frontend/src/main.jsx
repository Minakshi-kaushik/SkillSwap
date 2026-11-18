import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.jsx'
import './index.css'
import './App.css'
import './components/common/Ui.css'
import './pages/public/PublicPages.css'
import './pages/public/PublicDesktop.css'
import './pages/auth/Auth.css'
import './pages/onboarding/Onboarding.css'
import './pages/auth/AuthFix.css'
import './AppFix.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><App /></BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
