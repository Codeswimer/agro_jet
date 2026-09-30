import { useState } from 'react';
import api from '../api';

/**
 * Login / onboarding screen. Calls the Django JWT endpoints and hands the
 * authenticated user up to <App />.
 */
export default function AuthView({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    role: 'FARMER', bvn: '', password: '', password2: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(loginForm.email, loginForm.password);
      onAuthed(user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.register(form);
      const user = await api.login(form.email, form.password);
      onAuthed(user);
    } catch (err) {
      setError(err.message || 'Onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-gray-100">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center bg-emerald-500 text-emerald-950 font-black px-4 py-2 rounded-2xl text-sm tracking-wider shadow-lg">
            AGRO JET 🚀
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-2">
            {mode === 'login' ? 'Welcome Back to AGRO JET' : 'Create Your AGRO JET Account'}
          </h1>
          <p className="text-xs text-emerald-200">
            {mode === 'login'
              ? 'Sign in to access your BMONI escrow & agricultural rails'
              : 'Fast onboarding with NIBSS BVN verification & multi-currency rails'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-200">Email Address</label>
              <input
                type="email" required value={loginForm.email}
                onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 text-xs bg-white text-gray-900 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                placeholder="farmer@agrojet.africa"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-200">Password</label>
              <input
                type="password" required value={loginForm.password}
                onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-3 text-xs bg-white text-gray-900 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono font-bold"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 font-extrabold py-3.5 rounded-2xl text-xs shadow-lg transition-all transform active:scale-95"
            >
              {loading ? 'Authenticating…' : 'Sign In to AGRO JET'}
            </button>
            <div className="text-center pt-2 space-y-1">
              <button
                type="button" onClick={() => setMode('register')}
                className="text-xs text-emerald-300 hover:text-white underline font-semibold transition-all"
              >
                Don&apos;t have an account? Sign up / Onboard
              </button>
              <p className="text-[10px] text-emerald-400/70">
                Sandbox logins — farmer@agrojet.africa / AgroJet2026!
              </p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">First Name</label>
                <input type="text" required value={form.first_name} onChange={set('first_name')}
                  className="w-full px-3 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Last Name</label>
                <input type="text" required value={form.last_name} onChange={set('last_name')}
                  className="w-full px-3 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-200">Email Address</label>
              <input type="email" required value={form.email} onChange={set('email')}
                className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-200">Phone Number (E.164)</label>
              <input type="text" required value={form.phone_number} onChange={set('phone_number')}
                className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                placeholder="+2348030001122" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-200">I am a…</label>
              <select value={form.role} onChange={set('role')}
                className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl">
                <option value="FARMER">Farmer / Supplier</option>
                <option value="BUYER">Buyer / Offtaker</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-emerald-200">11-Digit BVN (NIBSS Sandbox)</label>
              <input type="text" maxLength={11} required value={form.bvn} onChange={set('bvn')}
                className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                placeholder="95888168924" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Password</label>
                <input type="password" required value={form.password} onChange={set('password')}
                  className="w-full px-3 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Confirm</label>
                <input type="password" required value={form.password2} onChange={set('password2')}
                  className="w-full px-3 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" />
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 font-extrabold py-3.5 rounded-2xl text-xs shadow-lg transition-all"
            >
              {loading ? 'Verifying NIBSS BVN & Creating Wallet…' : 'Complete Onboarding & Start'}
            </button>
            <div className="text-center pt-2">
              <button type="button" onClick={() => setMode('login')}
                className="text-xs text-emerald-300 hover:text-white underline font-semibold transition-all">
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
