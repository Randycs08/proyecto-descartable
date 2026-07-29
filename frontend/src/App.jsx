/**
 * Raíz de la aplicación. Compone los providers globales:
 *   - BrowserRouter : enrutado.
 *   - AuthProvider  : sesión/JWT.
 *   - Toaster       : notificaciones (react-hot-toast).
 * y renderiza el árbol de rutas (AppRouter).
 */

import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContext.jsx'
import { AppRouter } from '@/routes/AppRouter.jsx'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        {/* Notificaciones globales */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'hsl(222 47% 11%)',
              color: '#fff',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: 'hsl(160 84% 39%)', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
