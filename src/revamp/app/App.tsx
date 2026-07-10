import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from '../shared/ui'
import { router } from './router'

export default function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
