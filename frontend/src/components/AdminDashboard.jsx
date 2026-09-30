import { useEffect, useState } from 'react';
import api from '../api';
import { fmt, money } from '../format';

const ROLE_STYLES = {
  ADMIN: 'bg-purple-100 text-purple-800',
  FARMER: 'bg-emerald-100 text-emerald-800',
  BUYER: 'bg-blue-100 text-blue-800',
};

function KpiCard({ label, value, sub, accent = 'emerald' }) {
  const accents = {
    emerald: 'from-emerald-600 to-teal-700',
    blue: 'from-blue-600 to-indigo-700',
    purple: 'from-purple-600 to-fuchsia-700',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className={`bg-gradient-to-br ${accents[accent]} text-white p-5 rounded-2xl shadow-md`}>
      <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">{label}</span>
      <p className="text-2xl font-black mt-1">{value}</p>
      {sub && <p className="text-[11px] opacity-80 mt-1">{sub}</p>}
    </div>
  );
}

function CurrencyTable({ title, byCurrency }) {
  const rows = Object.entries(byCurrency || {});
  if (rows.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-bold text-sm text-gray-900">{title}</h3>
      <div className="mt-3 space-y-1.5">
        {rows.map(([currency, total]) => (
          <div key={currency} className="flex justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
            <span className="font-semibold text-gray-700">{currency}</span>
            <span className="font-mono font-bold text-emerald-700">{money(total, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout, onBackToUser }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [escrows, setEscrows] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    (async () => {
      try {
        const [s, u, e] = await Promise.all([api.adminStats(), api.adminUsers(), api.adminEscrows()]);
        setStats(s); setUsers(u); setEscrows(e);
      } catch (err) {
        setError(err.message || 'Failed to load admin data');
      }
    })();
  }, []);

  const filteredUsers = roleFilter ? users.filter((u) => u.role === roleFilter) : users;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-800">
      <header className="bg-gray-900 text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500 text-purple-950 font-black px-3.5 py-1.5 rounded-lg text-xs tracking-wider shadow-sm">AGRO JET ⚙️ ADMIN</div>
          <div>
            <h1 className="text-base sm:text-lg font-bold">Platform Administration Console</h1>
            <p className="text-[11px] text-gray-400">Signed in as {user.email} · Full platform access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onBackToUser && (
            <button onClick={onBackToUser} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">Switch to User View</button>
          )}
          <button onClick={onLogout} className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">Logout</button>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 flex shadow-sm">
        {[
          { id: 'overview', label: '📊 Platform Overview' },
          { id: 'users', label: `👥 Users (${users.length})` },
          { id: 'escrows', label: `🔒 Escrow Contracts (${escrows.length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${tab === t.id ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-transparent text-gray-600 hover:text-purple-600'}`}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">{error}</div>
        )}

        {tab === 'overview' && (
          <>
            {!stats ? (
              <p className="text-xs text-gray-500 py-8 text-center">Loading platform statistics…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard label="Total Users" value={fmt(stats.total_users)} sub={`${stats.bvn_verified_users} BVN verified`} />
                  <KpiCard label="Farmers" value={fmt(stats.total_farmers)} accent="emerald" />
                  <KpiCard label="Buyers" value={fmt(stats.total_buyers)} accent="blue" />
                  <KpiCard label="Escrow Contracts" value={fmt(stats.total_escrows)} sub={`${stats.escrow_locked_count} currently locked`} accent="purple" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CurrencyTable title="💰 Funds Locked in Escrow" byCurrency={stats.escrow_locked_value} />
                  <CurrencyTable title="✅ Escrow Released (Settled)" byCurrency={stats.escrow_released_value} />
                  <CurrencyTable title="💳 Payment Volume" byCurrency={stats.payment_volume} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="font-bold text-sm text-gray-900">Newest Users</h3>
                    <div className="mt-3 space-y-2">
                      {stats.recent_users.map((u) => (
                        <div key={u.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <div>
                            <p className="font-semibold text-gray-900">{u.full_name || u.email}</p>
                            <p className="text-gray-500">{u.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="font-bold text-sm text-gray-900">Latest Escrow Activity</h3>
                    <div className="mt-3 space-y-2">
                      {stats.recent_escrows.map((e) => (
                        <div key={e.id} className="flex justify-between items-center text-xs bg-gray-50 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="font-mono font-semibold text-emerald-700 truncate">{e.reference}</p>
                            <p className="text-gray-500 truncate">{e.item}</p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="font-mono font-bold text-gray-900">{money(e.amount, e.currency)}</p>
                            <p className="text-[10px] text-gray-500">{e.stage_label}</p>
                          </div>
                        </div>
                      ))}
                      {stats.recent_escrows.length === 0 && <p className="text-xs text-gray-500">No escrow activity yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard label="Produce Listings" value={fmt(stats.produce_listings)} accent="emerald" />
                  <KpiCard label="Active Import Pools" value={fmt(stats.active_pools)} accent="blue" />
                  <KpiCard label="Total Payments" value={fmt(stats.total_payments)} accent="amber" />
                  <KpiCard label="KYC Verified" value={fmt(stats.bvn_verified_users)} accent="purple" />
                </div>
              </>
            )}
          </>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-900">User Directory</h3>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg">
                <option value="">All roles</option>
                <option value="ADMIN">Admins</option>
                <option value="FARMER">Farmers</option>
                <option value="BUYER">Buyers</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-semibold">User</th>
                    <th className="pb-2 font-semibold">Role</th>
                    <th className="pb-2 font-semibold">KYC</th>
                    <th className="pb-2 font-semibold">BVN</th>
                    <th className="pb-2 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-2.5">
                        <p className="font-semibold text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-gray-500">{u.email}</p>
                      </td>
                      <td><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${ROLE_STYLES[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                      <td>{u.kyc_tier >= 2 ? '✅ Tier 2' : `Tier ${u.kyc_tier}`}</td>
                      <td className="font-mono">{u.bvn ? `${u.bvn.slice(0, 3)}•••${u.bvn.slice(-2)}` : '—'}</td>
                      <td className="text-gray-500">{new Date(u.date_joined).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'escrows' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 mb-4">All Escrow Contracts (Platform-wide)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-semibold">Reference</th>
                    <th className="pb-2 font-semibold">Kind</th>
                    <th className="pb-2 font-semibold">Item</th>
                    <th className="pb-2 font-semibold">Value</th>
                    <th className="pb-2 font-semibold">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {escrows.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-2.5 font-mono font-semibold text-emerald-700">{e.reference}</td>
                      <td><span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-[10px]">{e.kind}</span></td>
                      <td className="max-w-[220px] truncate">{e.item}</td>
                      <td className="font-mono font-bold">{money(e.amount, e.currency)}</td>
                      <td>{e.stage_label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
