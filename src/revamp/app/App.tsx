import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from '../shared/ui'
import { BackendProvider } from './backend'
import { router } from './router'

export default function App() {
  return (
    <BackendProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </BackendProvider>
  )
}
