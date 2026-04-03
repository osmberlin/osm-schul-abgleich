import { queryClient, router } from './router'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import '@fontsource-variable/inter/wght.css'
import './index.css'
import { createRoot } from 'react-dom/client'

const el = document.getElementById('root')
if (!el) throw new Error('root missing')
createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>
  </StrictMode>,
)
