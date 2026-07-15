import { Route, Routes, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ToastProvider } from '@/components/ToastProvider'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { useTituloRevenda } from '@/hooks/useTituloRevenda'

import Dashboard from '@/pages/Dashboard'
import Veiculos from '@/pages/Veiculos'
import Compras from '@/pages/Compras'
import Vendas from '@/pages/Vendas'
import Despesas from '@/pages/Despesas'
import Calculadora from '@/pages/Calculadora'
import ConsultaFipe from '@/pages/ConsultaFipe'
import BancoPessoal from '@/pages/BancoPessoal'
import Relatorios from '@/pages/Relatorios'
import Configuracoes from '@/pages/Configuracoes'
import Login from '@/pages/Login'

function AppRoutes() {
  useTheme()
  useTituloRevenda()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/veiculos" element={<Veiculos />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/despesas" element={<Despesas />} />
          <Route path="/calculadora" element={<Calculadora />} />
          <Route path="/consulta-fipe" element={<ConsultaFipe />} />
          <Route path="/banco-pessoal" element={<BancoPessoal />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}
