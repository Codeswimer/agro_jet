import { useEffect, useState } from 'react';
import api, { getStoredUser } from './api';
import AuthView from './components/AuthView';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import PaymentModal from './components/PaymentModal';

export default function App() {
  // user: authenticated profile from the Django API (null → show auth screen)
  const [user, setUser] = useState(getStoredUser);
  const [wallet, setWallet] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);

  const notify = (message) => {
    // Surface important API events in the browser console for now.
    console.info(`[AGRO JET] ${message}`);
  };

  useEffect(() => {
    if (!user) return undefined;
    let ignore = false;
    (async () => {
      try {
        const w = await api.wallet();
        if (!ignore) setWallet(w);
      } catch {
        /* wallet loads lazily; ignore here */
      }
    })();
    return () => { ignore = true; };
  }, [user]);

  const refreshWallet = async () => {
    try {
      const w = await api.wallet();
      setWallet(w);
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setWallet(null);
    notify('[Auth] User logged out successfully.');
  };

  if (!user) {
    return (
      <AuthView
        onAuthed={(u) => {
          setUser(u);
          notify(`[Auth] Login successful. Welcome back, ${u.first_name || u.email}!`);
        }}
      />
    );
  }

  const isAdmin = user.role === 'ADMIN';

  return (
    <>
      {isAdmin ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <UserDashboard
          user={user}
          wallet={wallet}
          onLogout={handleLogout}
          openCheckout={setCheckoutSession}
          addLog={notify}
        />
      )}
      {checkoutSession && (
        <PaymentModal
          session={{
            ...checkoutSession,
            onSuccess: async (res) => {
              checkoutSession.onSuccess?.(res);
              notify(`[BMONI Payment API] Transaction ${res.payment.reference} completed.`);
              await refreshWallet();
            },
          }}
          onClose={() => setCheckoutSession(null)}
        />
      )}
    </>
  );
}
