
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import PremiumGate from '@/components/PremiumGate';
import { MusicPlayerProvider } from './contexts/MusicPlayerContext';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// App pages
import Home from '@/pages/Home';
const VideoDetail = lazy(() => import('@/pages/VideoDetail'));
const MusicPage = lazy(() => import('@/pages/MusicPage'));
const MusicPlayer = lazy(() => import('@/pages/MusicPlayer'));
const ChatsPage = lazy(() => import('@/pages/ChatsPage'));
const ChatDetail = lazy(() => import('@/pages/ChatDetail'));
const PremiumPage = lazy(() => import('@/pages/PremiumPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const UploadPage = lazy(() => import('@/pages/UploadPage'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const PlaylistDetail = lazy(() => import('@/pages/PlaylistDetail'));
const ChannelPage = lazy(() => import('@/pages/ChannelPage'));
const CreatorDashboard = lazy(() => import('@/pages/CreatorDashboard'));
const ChannelsPage = lazy(() => import('@/pages/ChannelsPage'));
const ShortsPage = lazy(() => import('@/pages/ShortsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const LivePage = lazy(() => import('@/pages/LivePage'));
const LiveStudio = lazy(() => import('@/pages/LiveStudio'));
const LiveWatch = lazy(() => import('@/pages/LiveWatch'));
const DonationResult = lazy(() => import('@/pages/DonationResult'));

// Layout
import AppLayout from '@/components/layout/AppLayout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground font-medium">Laden...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/live" element={<LivePage />} />
        </Route>
        <Route path="/video/:id" element={<VideoDetail />} />
        <Route path="/chat/:id" element={<ChatDetail />} />
        <Route path="/music/player" element={<MusicPlayer />} />
        <Route path="/upload" element={<PremiumGate feature="Uploads"><UploadPage /></PremiumGate>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/playlist/:id" element={<PlaylistDetail />} />
        <Route path="/channel/:type/:name" element={<ChannelPage />} />
        <Route path="/creator" element={<PremiumGate feature="Das Creator-Dashboard"><CreatorDashboard /></PremiumGate>} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/shorts" element={<ShortsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/live/studio/:id" element={<PremiumGate feature="Live-Streams"><LiveStudio /></PremiumGate>} />
        <Route path="/live/:id" element={<LiveWatch />} />
        <Route path="/donation-success" element={<DonationResult />} />
      </Route>
      
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <MusicPlayerProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </MusicPlayerProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App


