
import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import FXConversionPage from './pages/FXConversionPage'
import RemittancesPage from './pages/RemittancesPage'
import TransactionsPage from './pages/TransactionsPage'
import AccountStatementsPage from './pages/AccountStatementsPage'
import ProfileKycPage from './pages/ProfileKycPage'

import NotFound from './pages/NotFound'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './pages/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import TransferPage from './pages/TransferPage'
import AccountsPage from './pages/AccountsPage'

export default function App() {
  return (
    <Routes>
      {/* Public authentication pages */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected customer workspace */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Canonical routes */}
        <Route path="/transfers" element={<TransferPage />} />
        <Route path="/accounts" element={<AccountsPage />} />

        <Route path="/fx" element={<FXConversionPage />} />
        <Route path="/remittances" element={<RemittancesPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/statements" element={<AccountStatementsPage />} />
        <Route path="/profile" element={<ProfileKycPage />} />
        </Route>

        {/* Backward-compatible redirects */}
        <Route
          path="/transfer"
          element={<Navigate to="/transfers" replace />}
        />
        <Route
          path="/account"
          element={<Navigate to="/accounts" replace />}
        />
      </Route>

      {/* Public home page and fallback */}
      {/* <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
      </Route> */}

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
