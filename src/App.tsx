import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PeoplePage from './pages/PeoplePage'
import PersonDetailPage from './pages/PersonDetailPage'
import DiscoveryPage from './pages/DiscoveryPage'
import ShoppingListPage from './pages/ShoppingListPage'
import WishlistPage from './pages/WishlistPage'
import ProfilePage from './pages/ProfilePage'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
      <Route path="/people/:id" element={<ProtectedRoute><PersonDetailPage /></ProtectedRoute>} />
      <Route path="/discover" element={<ProtectedRoute><DiscoveryPage /></ProtectedRoute>} />
      <Route path="/shopping-list" element={<ProtectedRoute><ShoppingListPage /></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
