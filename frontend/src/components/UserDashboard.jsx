import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { fmt, money } from '../format';

const STAGE_LABELS = ['1. Contract Drafted', '2. Funds Locked', '3. Quality Inspection', '4. Settlement Released'];

const TABS = [
  { id: 'corporatebuyers', label: '🌾 Corporate Offtake Match', badge: 'Live' },
  { id: 'harvestmarket', label: '🛒 Harvest Produce Marketplace', badge: 'Escrow' },
  { id: 'inputs', label: '🚜 Agri-Inputs & Import Pool', badge: 'Group Save' },
  { id: 'escrowledger', label: '🔒 Smart Escrow Ledger', badge: 'Live' },
  { id: 'sandboxkyc', label: '🛡️ NIBSS BVN & Onboarding', badge: 'KYC' },
  { id: 'addproduce', label: '🌱 List Your Produce', badge: 'New' },
  { id: 'docs', label: '📚 Mintlify & AI Assistant', badge: 'Docs' },
];

function Balances({ wallet }) {
  if (!wallet) return null;
  return (
    <div className="bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs">
      <div>
        <span className="text-emerald-400 block text-[10px] uppercase font-semibold">NGN Fiat</span>
        <span className="font-mono font-bold text-white">₦{fmt(wallet.ngn_balance)}</span>
      </div>
      <div className="w-px h-6 bg-emerald-800"></div>
      <div>
        <span className="text-emerald-400 block text-[10px] uppercase font-semibold">cNGN Stable</span>
        <span className="font-mono font-bold text-white">₦{fmt(wallet.cngn_balance)}</span>
      </div>
      <div className="w-px h-6 bg-emerald-800"></div>
      <div>
        <span className="text-emerald-400 block text-[10px] uppercase font-semibold">USDB Stable</span>
        <span className="font-mono font-bold text-white">${fmt(wallet.usd_balance)}</span>
      </div>
    </div>
  );
}

export default function UserDashboard({ user, wallet, onLogout, openCheckout, addLog }) {
  const [activeTab, setActiveTab] = useState('corporatebuyers');
  const [inputSubTab, setInputSubTab] = useState('importpools');

  // Catalog state (server data)
  const [buyers, setBuyers] = useState([]);
  const [produce, setProduce] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [pools, setPools] = useState([]);
  const [escrows, setEscrows] = useState([]);

  // Filters
  const [cropCategory, setCropCategory] = useState('All');
  const [buyerSearch, setBuyerSearch] = useState('');

  // Modal + KYC state
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [tonnage, setTonnage] = useState('');
  const [selectedProduce, setSelectedProduce] = useState(null);
  const [escrowQty, setEscrowQty] = useState(5);
  const [escrowCurrency, setEscrowCurrency] = useState('cNGN');
  const [selectedPool, setSelectedPool] = useState(null);
  const [poolUnits, setPoolUnits] = useState(1);
  const [selectedInput, setSelectedInput] = useState(null);
  const [kyc, setKyc] = useState({ bvn: '', result: null });
  const [produceForm, setProduceForm] = useState({
    crop: '', volume_available: '', unit: 'MT', price_per_unit: '', location: '', category: 'Grain',
  });
  const [flash, setFlash] = useState('');

  const loadCatalog = async () => {
    try {
      const [b, p, i, po, es] = await Promise.all([
        api.buyers(), api.produce(), api.inputs(), api.pools(), api.escrows(),
      ]);
      setBuyers(b); setProduce(p); setInputs(i); setPools(po); setEscrows(es);
    } catch (err) {
      addLog('WARN', `Failed to load catalog: ${err.message}`);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [b, p, i, po, es] = await Promise.all([
          api.buyers(), api.produce(), api.inputs(), api.pools(), api.escrows(),
        ]);
        if (!ignore) { setBuyers(b); setProduce(p); setInputs(i); setPools(po); setEscrows(es); }
      } catch (err) {
        addLog('WARN', `Failed to load catalog: ${err.message}`);
      }
    })();
    return () => { ignore = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredBuyers = useMemo(() => buyers.filter((b) => {
    const matchesCat = cropCategory === 'All' || b.category === cropCategory;
    const q = buyerSearch.toLowerCase();
    const matchesQ = !q
      || b.company_name.toLowerCase().includes(q)
      || b.raw_material_needed.toLowerCase().includes(q)
      || b.location.toLowerCase().includes(q);
    return matchesCat && matchesQ;
  }), [buyers, cropCategory, buyerSearch]);

  const say = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 4000); };

  // ---------------- Checkout handlers (initialize → modal → confirm) ----------------
  const startOfftake = async (e) => {
    e.preventDefault();
    const t = parseFloat(tonnage);
    if (!t || t <= 0 || !selectedBuyer) return;
    const total = t * parseFloat(selectedBuyer.unit_price_numeric);
    try {
      const data = await api.initPayment({
        amount: String(total), currency: 'cNGN', rail: 'cngn', kind: 'OFFTAKE',
        purpose: `${t} MT of ${selectedBuyer.raw_material_needed}`,
        seller_label: 'AGRO JET Supplier', quantity: `${t} MT`,
        quality_specs: (selectedBuyer.quality_specs || []).join(', '),
        corporate_buyer: selectedBuyer.id,
      });
      openCheckout({
        payload: {
          amount: String(total), currency: 'cNGN', kind: 'OFFTAKE',
          purpose: `${t} MT of ${selectedBuyer.raw_material_needed}`,
          seller_label: 'AGRO JET Supplier', quantity: `${t} MT`,
          quality_specs: (selectedBuyer.quality_specs || []).join(', '),
          corporate_buyer: selectedBuyer.id,
        },
        payment: data.payment,
        onSuccess: (res) => {
          addLog('SUCCESS', `[Offtake ${res.escrow.reference}] Supply of ${t} MT to ${selectedBuyer.company_name} locked in escrow.`);
          say(`Supply offer bound in escrow ${res.escrow.reference}!`);
          loadCatalog();
        },
      });
      setSelectedBuyer(null);
      setTonnage('');
    } catch (err) {
      say(err.message);
    }
  };

  const startHarvestEscrow = async (e) => {
    e.preventDefault();
    if (!selectedProduce) return;
    const qty = parseFloat(escrowQty);
    const totalNGN = qty * parseFloat(selectedProduce.price_per_unit);
    const total = escrowCurrency === 'USDB' ? Math.round(totalNGN / 1500) : totalNGN;
    try {
      const payload = {
        amount: String(total), currency: escrowCurrency, kind: 'HARVEST',
        purpose: `${qty} ${selectedProduce.unit} of ${selectedProduce.crop}`,
        seller_label: selectedProduce.seller_name || selectedProduce.seller_email,
        quantity: `${qty} ${selectedProduce.unit}`,
        quality_specs: (selectedProduce.specs || []).join(', '),
        produce: selectedProduce.id,
      };
      const data = await api.initPayment(payload);
      openCheckout({
        payload, payment: data.payment,
        onSuccess: (res) => {
          addLog('SUCCESS', `[Escrow ${res.escrow.reference}] Locked ${escrowCurrency} ${fmt(total)}.`);
          say(`Smart escrow ${res.escrow.reference} created & funds locked!`);
          loadCatalog();
        },
      });
      setSelectedProduce(null);
    } catch (err) {
      say(err.message);
    }
  };

  const startPoolJoin = async (e) => {
    e.preventDefault();
    if (!selectedPool) return;
    const units = parseInt(poolUnits, 10);
    const total = parseFloat(selectedPool.price_usd) * units;
    try {
      const payload = {
        amount: String(total), currency: 'USDB', rail: 'usdb', kind: 'POOL',
        purpose: `${units}x ${selectedPool.title}`,
        seller_label: 'AGRO JET Group Import', quantity: `${units} units`,
        pool: selectedPool.id, pool_units: units,
      };
      const data = await api.initPayment(payload);
      openCheckout({
        payload, payment: data.payment,
        onSuccess: (res) => {
          addLog('SUCCESS', `[Group Import] Locked $${fmt(total)} for ${units} unit(s).`);
          say(`Joined import pool! Funds locked in ${res.escrow?.reference || 'escrow'}.`);
          loadCatalog();
        },
      });
      setSelectedPool(null);
      setPoolUnits(1);
    } catch (err) {
      say(err.message);
    }
  };

  const startInputBuy = async (e) => {
    e.preventDefault();
    if (!selectedInput) return;
    try {
      const payload = {
        amount: String(selectedInput.price), currency: 'NGN', rail: 'bank', kind: 'INPUT',
        purpose: selectedInput.name,
        seller_label: selectedInput.merchant, quantity: '1',
      };
      const data = await api.initPayment(payload);
      openCheckout({
        payload, payment: data.payment,
        onSuccess: () => {
          addLog('SUCCESS', `[Merchant Escrow] Purchased "${selectedInput.name}".`);
          say(`Order confirmed! Funds locked until merchant delivery.`);
          loadCatalog();
        },
      });
      setSelectedInput(null);
    } catch (err) {
      say(err.message);
    }
  };

  const releaseFunds = async (escrowId) => {
    try {
      await api.releaseEscrow(escrowId);
      addLog('SUCCESS', `[Settlement] Quality verified — funds released to seller.`);
      loadCatalog();
    } catch (err) {
      say(err.message);
    }
  };

  const verifyBvn = async (bvn) => {
    try {
      const res = await api.bvnVerify(bvn);
      setKyc({ bvn, result: res.bvn_record });
      addLog('SUCCESS', `[NIBSS] Match confirmed for ${res.bvn_record.firstName} ${res.bvn_record.lastName} (${res.bvn_record.confidenceScore})`);
    } catch (err) {
      addLog('WARN', `[NIBSS] ${err.message}`);
    }
  };

  const submitProduce = async (e) => {
    e.preventDefault();
    try {
      await api.createProduce({
        ...produceForm,
        specs: ['Listed via AGRO JET dashboard'],
      });
      say('Produce listing published to the marketplace!');
      setProduceForm({ crop: '', volume_available: '', unit: 'MT', price_per_unit: '', location: '', category: 'Grain' });
      loadCatalog();
      setActiveTab('harvestmarket');
    } catch (err) {
      say(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      <header className="bg-emerald-900 text-white px-4 sm:px-6 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-md gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-emerald-500 text-emerald-950 font-black px-3.5 py-1.5 rounded-lg text-xs tracking-wider shadow-sm shrink-0">AGRO JET 🚀</div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-snug tracking-wide">AGRO JET — Powered by BMONI Payment API & Escrow Rails</h1>
            <p className="text-xs text-emerald-200">
              Signed in as <strong>{user.full_name || user.email}</strong> · Role: <code className="bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 font-mono">{user.role}</code>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <Balances wallet={wallet} />
          <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="font-medium text-emerald-100 truncate max-w-[140px]">{user.email}</span>
            <button onClick={onLogout} className="ml-2 bg-red-600/80 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all">Logout</button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 flex overflow-x-auto shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === tab.id ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{tab.badge}</span>
          </button>
        ))}
      </nav>

      {flash && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 text-center">{flash}</div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* ---------------- Corporate buyers ---------------- */}
          {activeTab === 'corporatebuyers' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-md">
                <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">AGRO JET Industrial Offtake Bridge</span>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-2">Match Farm Produce Directly with Corporate Offtakers</h2>
                <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed mt-1">
                  Connect your harvest to blue-chip processing plants with payment settlements locked in BMONI multi-currency escrow rails.
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                  {['All', 'Maize', 'Cassava', 'Soybeans', 'Sesame'].map((cat) => (
                    <button key={cat} onClick={() => setCropCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${cropCategory === cat ? 'bg-emerald-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-72">
                  <input type="text" placeholder="Search company or location…" value={buyerSearch}
                    onChange={(e) => setBuyerSearch(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBuyers.map((buyer) => (
                  <div key={buyer.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">{buyer.industry}</span>
                          <h3 className="font-bold text-base text-gray-900 mt-1">{buyer.company_name}</h3>
                        </div>
                        {buyer.verified_buyer && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">✓ Verified Buyer</span>}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Raw Material Needed:</span><span className="font-semibold text-gray-900 text-right">{buyer.raw_material_needed}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Monthly Volume:</span><span className="font-bold text-emerald-700">{buyer.monthly_volume_req}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Offer Price:</span><span className="font-mono font-bold text-gray-900">{buyer.offer_price}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Escrow Deposit:</span><span className="font-mono text-emerald-600 font-semibold">{buyer.escrow_deposit_locked}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Location:</span><span className="text-gray-700">{buyer.location}</span></div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(buyer.quality_specs || []).map((spec, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">• {spec}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setSelectedBuyer(buyer)}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm">
                      🤝 Supply to Offtaker & Lock Escrow
                    </button>
                  </div>
                ))}
                {filteredBuyers.length === 0 && (
                  <p className="text-xs text-gray-500 col-span-2 text-center py-8">No corporate buyers match your filters.</p>
                )}
              </div>
            </div>
          )}

          {/* ---------------- Harvest marketplace ---------------- */}
          {activeTab === 'harvestmarket' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white p-6 rounded-2xl shadow-md">
                <span className="bg-teal-500/30 text-teal-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Verified Farmer Listings</span>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-2">Source Cleaned & Graded Farm Produce</h2>
                <p className="text-xs sm:text-sm text-teal-100 mt-1">Purchase certified grains and tubers directly from farmer cooperatives with automated BMONI escrow protection.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produce.map((prod) => (
                  <div key={prod.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded">{prod.seller_name || prod.seller_email}</span>
                          <h3 className="font-bold text-base text-gray-900 mt-1">{prod.crop}</h3>
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-lg">★ {prod.rating}</span>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">Available Volume:</span><span className="font-bold text-gray-900">{fmt(prod.volume_available)} {prod.unit}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Unit Price:</span><span className="font-mono font-bold text-emerald-700">₦{fmt(prod.price_per_unit)} / {prod.unit}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Location:</span><span className="text-gray-700">{prod.location}</span></div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(prod.specs || []).map((s, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">✓ {s}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => setSelectedProduce(prod)}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all">
                      Lock Escrow & Purchase Produce
                    </button>
                  </div>
                ))}
                {produce.length === 0 && <p className="text-xs text-gray-500 col-span-2 text-center py-8">No produce listings yet — be the first to list!</p>}
              </div>
            </div>
          )}

          {/* ---------------- Inputs & pools ---------------- */}
          {activeTab === 'inputs' && (
            <div className="space-y-6">
              <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-full sm:w-fit">
                <button onClick={() => setInputSubTab('importpools')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${inputSubTab === 'importpools' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-emerald-700'}`}>
                  🚢 Group Import Pooling
                </button>
                <button onClick={() => setInputSubTab('inputs')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${inputSubTab === 'inputs' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-emerald-700'}`}>
                  🧪 Agri-Inputs & Fertilizers
                </button>
              </div>

              {inputSubTab === 'importpools' && (
                <div className="space-y-4">
                  <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-base">Co-Import High-End Farm Machinery & Green Tech</h3>
                    <p className="text-xs text-emerald-200 mt-1">Pool orders with other cooperatives to cut freight fees by up to 35% and secure factory pricing with BMONI escrow.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pools.map((pool) => (
                      <div key={pool.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{pool.origin}</span>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{pool.status}</span>
                          </div>
                          <h4 className="font-bold text-sm text-gray-900">{pool.title}</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">{pool.description}</p>
                          <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-gray-500">Group Pool Price:</span><span className="font-mono font-bold text-emerald-700">${fmt(pool.price_usd)} USD (₦{fmt(pool.price_ngn)})</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Retail Comparison:</span><span className="font-mono line-through text-gray-400">${fmt(pool.retail_price_usd)} USD</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Progress:</span><span className="font-bold text-gray-900">{pool.reserved_units} / {pool.target_units} Units Locked</span></div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${(pool.reserved_units / pool.target_units) * 100}%` }}></div>
                          </div>
                          <div className="text-[10px] bg-emerald-50 text-emerald-800 p-2 rounded-lg font-semibold">💡 {pool.group_savings}</div>
                        </div>
                        <button onClick={() => setSelectedPool(pool)} disabled={pool.units_remaining === 0}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all">
                          {pool.units_remaining === 0 ? 'Pool Fully Reserved' : 'Join Import Pool & Lock Deposit ($USD)'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inputSubTab === 'inputs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inputs.map((inp) => (
                    <div key={inp.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">{inp.category}</span>
                          <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">★ {inp.rating}</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-900">{inp.name}</h4>
                        <p className="text-xs text-gray-500 font-medium">{inp.merchant} • {inp.location}</p>
                        <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Price:</span><span className="font-mono font-bold text-emerald-700">₦{fmt(inp.price)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Stock Availability:</span><span className="font-bold text-gray-900">{inp.stock}</span></div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(inp.specs || []).map((s, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">✓ {s}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setSelectedInput(inp)}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm">
                        Buy with BMONI Escrow Protection
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------- Escrow ledger ---------------- */}
          {activeTab === 'escrowledger' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Active Escrow Contracts & Milestone Ledger</h2>
                <p className="text-xs text-gray-500 mt-1">Track multi-currency smart escrow contracts, quality inspection states, and release funds upon successful delivery.</p>
              </div>
              <div className="space-y-4">
                {escrows.map((c) => (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">{c.reference}</span>
                        <h3 className="font-bold text-sm text-gray-900 mt-1">{c.item}</h3>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-xl ${c.stage >= 4 ? 'bg-blue-50 text-blue-700' : 'bg-emerald-100 text-emerald-800 animate-pulse'}`}>{c.stage_label}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3 rounded-xl">
                      <div><span className="text-gray-500 block text-[10px]">Seller / Supplier</span><span className="font-semibold text-gray-900 truncate block">{c.seller_label}</span></div>
                      <div><span className="text-gray-500 block text-[10px]">Buyer / Offtaker</span><span className="font-semibold text-gray-900 truncate block">{c.buyer_username || c.buyer_label}</span></div>
                      <div><span className="text-gray-500 block text-[10px]">Quantity</span><span className="font-semibold text-gray-900">{c.quantity}</span></div>
                      <div><span className="text-gray-500 block text-[10px]">Escrow Value</span><span className="font-mono font-bold text-emerald-700">{money(c.amount, c.currency)}</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                        {STAGE_LABELS.map((label, i) => (
                          <span key={label} className={c.stage > i + 1 || c.stage === 4 ? (c.stage === 4 ? 'text-blue-700 font-bold' : 'text-emerald-700') : ''}>{label}</span>
                        ))}
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${(c.stage / 4) * 100}%` }}></div>
                      </div>
                    </div>
                    {c.stage >= 2 && c.stage < 4 && (
                      <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => releaseFunds(c.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all">
                          ✓ Verify Quality & Release Escrow Funds to Seller
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {escrows.length === 0 && <p className="text-xs text-gray-500 text-center py-8">No escrow contracts yet.</p>}
              </div>
            </div>
          )}

          {/* ---------------- BVN KYC ---------------- */}
          {activeTab === 'sandboxkyc' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div>
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">NIBSS Verification Layer</span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">Instant 11-Digit BVN & Tiered KYC Onboarding</h2>
                <p className="text-xs text-gray-500 mt-1">Your current KYC tier: <strong>Tier {user.kyc_tier}</strong> {user.bvn_verified ? '✅ BVN verified' : '— BVN not yet verified'}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2">
                <span className="text-xs font-bold text-emerald-900 block">Quick Test BVNs (NIBSS Sandbox Mocks):</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Bunch Dillon (Farmer)', bvn: '95888168924' },
                    { name: 'Samson Jabo (Coop Lead)', bvn: '22222222222' },
                    { name: 'Amina Abubakar (Aggregator)', bvn: '33333333333' },
                  ].map((test) => (
                    <button key={test.bvn} onClick={() => verifyBvn(test.bvn)}
                      className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all">
                      ⚡ Test {test.name} ({test.bvn})
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Enter 11-Digit BVN for NIBSS Verification</label>
                <div className="flex gap-3">
                  <input type="text" maxLength={11} value={kyc.bvn} onChange={(e) => setKyc((p) => ({ ...p, bvn: e.target.value }))}
                    className="flex-1 px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono" placeholder="e.g. 95888168924" />
                  <button onClick={() => verifyBvn(kyc.bvn)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-sm">Verify BVN</button>
                </div>
                {kyc.result && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center font-bold text-emerald-900 border-b border-emerald-200 pb-1">
                      <span>NIBSS Verification Successful</span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">Confidence: {kyc.result.confidenceScore}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      <div><span className="text-gray-500">Full Name:</span> {kyc.result.firstName} {kyc.result.lastName}</div>
                      <div><span className="text-gray-500">DOB:</span> {kyc.result.dateOfBirth}</div>
                      <div><span className="text-gray-500">Phone:</span> {kyc.result.phone}</div>
                      <div><span className="text-gray-500">NIN:</span> {kyc.result.nin}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- List produce ---------------- */}
          {activeTab === 'addproduce' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div>
                <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">Farmer Listing</span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">List Your Harvest on the Marketplace</h2>
                <p className="text-xs text-gray-500 mt-1">Published listings are immediately visible to corporate buyers and marketplace customers.</p>
              </div>
              <form onSubmit={submitProduce} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700">Crop / Produce Name</label>
                    <input type="text" required value={produceForm.crop} onChange={(e) => setProduceForm((p) => ({ ...p, crop: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" placeholder="Cleaned Yellow Maize (Grade A)" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">Category</label>
                    <select value={produceForm.category} onChange={(e) => setProduceForm((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl">
                      <option>Grain</option><option>Tuber</option><option>Oilseed</option><option>Legume</option><option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">Location</label>
                    <input type="text" required value={produceForm.location} onChange={(e) => setProduceForm((p) => ({ ...p, location: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl" placeholder="Ilaro, Ogun State" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">Available Volume</label>
                    <input type="number" step="0.01" min="0" required value={produceForm.volume_available}
                      onChange={(e) => setProduceForm((p) => ({ ...p, volume_available: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">Unit</label>
                    <select value={produceForm.unit} onChange={(e) => setProduceForm((p) => ({ ...p, unit: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl">
                      <option>MT</option><option>kg</option><option>bags</option>
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700">Price per Unit (₦ NGN)</label>
                    <input type="number" step="0.01" min="0" required value={produceForm.price_per_unit}
                      onChange={(e) => setProduceForm((p) => ({ ...p, price_per_unit: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all">
                  Publish Produce Listing
                </button>
              </form>
            </div>
          )}

          {/* ---------------- Docs / AI ---------------- */}
          {activeTab === 'docs' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded uppercase tracking-wider">Developer Resources</span>
                <h3 className="font-bold text-base text-gray-900 mt-1">AGRO JET API Documentation</h3>
                <p className="text-xs text-gray-500 mt-1">
                  The interactive OpenAPI swagger docs are served by the Django backend at{' '}
                  <a className="text-emerald-700 underline" href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/docs/`} target="_blank" rel="noreferrer">
                    /api/docs/
                  </a>
                </p>
              </div>
              <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
{`AGRO JET API — key endpoints
POST /api/auth/register/         create farmer/buyer account
POST /api/auth/login/            obtain JWT access + refresh
GET  /api/auth/me/               current profile
POST /api/kyc/bvn-verify/        NIBSS sandbox BVN check
GET  /api/marketplace/buyers/    corporate offtake catalog
GET  /api/marketplace/produce/   harvest listings
POST /api/marketplace/produce/new/  list your produce
GET  /api/marketplace/inputs/    agri-input merchants
GET  /api/marketplace/pools/     group import pools
GET  /api/wallet/                multi-currency balances
POST /api/payments/initialize/   start BMONI checkout
POST /api/payments/confirm/      settle & lock escrow
GET  /api/escrows/               your escrow ledger
POST /api/escrows/:id/release/   verify & release funds
GET  /api/admin-panel/stats/     admin dashboard KPIs`}
            </pre>
          </div>
        )}
        </div>

        {/* Right rail: live log stream */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl p-5 text-gray-300 space-y-3 shadow-md">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">Live Console & API Stream</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto text-[11px] font-mono">
              {addLog.length === 0 && <p className="text-gray-500">Awaiting API activity…</p>}
              <p className="text-gray-500 leading-tight">Connected to Django REST API at {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
            </div>
          </div>
        </div>
      </main>

      {/* ---------------- Modals ---------------- */}
      {selectedBuyer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">Offtake Contract Binding</span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedBuyer.company_name}</h3>
              </div>
              <button onClick={() => setSelectedBuyer(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full">✕</button>
            </div>
            <form onSubmit={startOfftake} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Raw Material:</span><span className="font-semibold">{selectedBuyer.raw_material_needed}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Agreed Offtake Price:</span><span className="font-mono font-bold text-emerald-700">{selectedBuyer.offer_price}</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Enter Your Supply Tonnage Offer (MT)</label>
                <input type="number" min="1" required value={tonnage} onChange={(e) => setTonnage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono" placeholder="e.g. 50" />
                {tonnage && parseFloat(tonnage) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1.5">
                    Total Contract Value: ₦{(parseFloat(tonnage) * parseFloat(selectedBuyer.unit_price_numeric)).toLocaleString()} cNGN
                  </p>
                )}
              </div>
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md">
                Submit Supply Proposal & Lock BMONI Escrow Deposit
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedProduce && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded uppercase">Harvest Escrow Contract</span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedProduce.crop}</h3>
              </div>
              <button onClick={() => setSelectedProduce(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full">✕</button>
            </div>
            <form onSubmit={startHarvestEscrow} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Seller Cooperative:</span><span className="font-semibold">{selectedProduce.seller_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Unit Price:</span><span className="font-mono font-bold text-emerald-700">₦{fmt(selectedProduce.price_per_unit)} / {selectedProduce.unit}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity ({selectedProduce.unit})</label>
                  <input type="number" min="1" required value={escrowQty} onChange={(e) => setEscrowQty(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Escrow Currency</label>
                  <select value={escrowCurrency} onChange={(e) => setEscrowCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl">
                    <option value="cNGN">cNGN (Stablecoin)</option>
                    <option value="USDB">USDB (USD Stable)</option>
                  </select>
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-xs flex justify-between font-bold text-emerald-900">
                <span>Total Escrow Lock:</span>
                <span className="font-mono">
                  {escrowCurrency} {escrowCurrency === 'USDB'
                    ? Math.round((escrowQty * parseFloat(selectedProduce.price_per_unit)) / 1500).toLocaleString()
                    : (escrowQty * parseFloat(selectedProduce.price_per_unit)).toLocaleString()}
                </span>
              </div>
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md">
                Lock Funds into Smart Escrow Contract
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedPool && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded uppercase">Co-Import Pooling</span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedPool.title}</h3>
              </div>
              <button onClick={() => setSelectedPool(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full">✕</button>
            </div>
            <form onSubmit={startPoolJoin} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Origin / Manufacturer:</span><span className="font-semibold">{selectedPool.origin}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Pool Unit Price:</span><span className="font-mono font-bold text-emerald-700">${fmt(selectedPool.price_usd)} USD</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Units to Reserve</label>
                <input type="number" min="1" max={selectedPool.units_remaining} required value={poolUnits}
                  onChange={(e) => setPoolUnits(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono" />
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl text-xs flex justify-between font-bold text-emerald-900">
                <span>Total Deposit Lock:</span>
                <span className="font-mono">${(parseFloat(selectedPool.price_usd) * poolUnits).toLocaleString()} USD</span>
              </div>
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md">
                Confirm & Lock Deposit in Group Import Escrow
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedInput && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">Agri-Input Escrow</span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedInput.name}</h3>
              </div>
              <button onClick={() => setSelectedInput(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full">✕</button>
            </div>
            <form onSubmit={startInputBuy} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Merchant:</span><span className="font-semibold">{selectedInput.merchant}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Price:</span><span className="font-mono font-bold text-emerald-700">₦{fmt(selectedInput.price)}</span></div>
              </div>
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md">
                Pay & Lock Escrow (₦{fmt(selectedInput.price)})
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
