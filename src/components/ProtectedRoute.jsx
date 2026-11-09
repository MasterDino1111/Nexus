
import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  const [ban, setBan] = useState(null);
  const [banChecked, setBanChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    base44.auth.me()
      .then(me => base44.entities.BannedUser.filter({ user_id: me.id }, '-created_date', 1))
      .then(list => setBan(list[0] || null))
      .catch(() => {})
      .finally(() => setBanChecked(true));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  if (!banChecked) return fallback;

  if (ban) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-black">Konto gesperrt</h1>
        <p className="text-muted-foreground max-w-sm">Dein Konto wurde gesperrt. Grund: {ban.reason || 'Verstoss gegen die Richtlinien'}</p>
        <button className="px-6 py-2 bg-secondary rounded-full text-sm font-semibold" onClick={() => base44.auth.logout()}>Abmelden</button>
      </div>
    );
  }

  return <Outlet />;
}


