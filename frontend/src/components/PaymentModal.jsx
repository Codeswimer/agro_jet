import { useState } from 'react';
import api from '../api';
import { money } from '../format';

const RAILS = [
  { id: 'cngn', label: 'cNGN Stable' },
  { id: 'usdb', label: 'USDB (USD)' },
  { id: 'bank', label: 'NGN Fiat Bank' },
];

/**
 * BMONI unified checkout modal.
 * `session` = { payload, payment, escrow, onSuccess } — re-initializes when
 * the user switches funding rail.
 */
export default function PaymentModal({ session, onClose }) {
  const [rail, setRail] = useState('cngn');
  const [payment, setPayment] = useState(session.payment);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const changeRail = async (nextRail) => {
    setRail(nextRail);
    setLoading(true);
    setError('');
    try {
      const data = await api.initPayment({ ...session.payload, rail: nextRail });
      setPayment(data.payment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const data = await api.confirmPayment(payment.reference);
      session.onSuccess?.(data);
      onClose();
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-gray-800">
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">
              AGRO JET Secure Checkout
            </span>
            <h3 className="font-bold text-lg text-gray-900 mt-1">BMONI Payment API Integration</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">✕</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">{error}</div>
        )}

        {loading || !payment ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-medium">Initializing secure BMONI settlement channel…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Reference:</span>
                <span className="font-mono font-bold text-emerald-900">{payment.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Settlement Bank:</span>
                <span className="font-semibold text-gray-900">{payment.bank_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Virtual Account:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">{payment.virtual_account}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200 pt-2 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-900">{money(payment.amount, payment.currency)} {payment.currency}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">Select Funding Rail / Wallet</label>
              <div className="grid grid-cols-3 gap-2">
                {RAILS.map((r) => (
                  <button
                    key={r.id} type="button" onClick={() => changeRail(r.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      rail === r.id
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={confirm} disabled={confirming}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{confirming ? 'Settling…' : `Authorize & Complete Payment (${money(payment.amount, payment.currency)})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
