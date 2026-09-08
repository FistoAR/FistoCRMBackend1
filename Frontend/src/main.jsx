import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes cache validity by default
      gcTime: 1000 * 60 * 10,   // 10 minutes memory retention
      refetchOnWindowFocus: false, // Prevent aggressive re-fetching when switching windows
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode >
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
