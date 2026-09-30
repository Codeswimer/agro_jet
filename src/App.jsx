import React, { useState, useEffect, useRef } from 'react';

const BmoniServiceAdapter = {
  isProduction: false,

  async request(endpoint, options = {}) {
    await new Promise(r => setTimeout(r, 250)); // simulate network latency

    if (endpoint.includes('/v1/users') && options.method === 'POST') {
      const payload = JSON.parse(options.body || '{}');
      const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
      const userObj = {
        userId,
        status: 'ACTIVE',
        firstName: payload.firstName || 'Bunch',
        lastName: payload.lastName || 'Dillon',
        email: payload.email || 'farmer@agrojet.bmoni.com',
        tier: 'TIER_2_VERIFIED',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('agrojet_user_id', userId);
      localStorage.setItem('agrojet_user_profile', JSON.stringify(userObj));
      return userObj;
    }

    if (endpoint.includes('/bvn-lookup')) {
      const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
      const bvn = urlParams.get('bvn');
      if (bvn === '95888168924') {
        return {
          bvn: "95888168924",
          firstName: "Bunch",
          lastName: "Dillon",
          dateOfBirth: "1990-01-15",
          gender: "male",
          nin: "63184876213",
          phone: "+2348030001122",
          verificationStatus: "VERIFIED_MATCH",
          confidenceScore: "99.8%"
        };
      } else if (bvn === '22222222222') {
        return {
          bvn: "22222222222",
          firstName: "Samson",
          lastName: "Jabo",
          dateOfBirth: "1988-11-20",
          gender: "male",
          nin: "18482561982",
          phone: "+2348029993344",
          verificationStatus: "VERIFIED_MATCH",
          confidenceScore: "98.5%"
        };
      } else if (bvn === '33333333333') {
        return {
          bvn: "33333333333",
          firstName: "Amina",
          lastName: "Abubakar",
          dateOfBirth: "1994-05-12",
          gender: "female",
          nin: "90218471625",
          phone: "+2348055551122",
          verificationStatus: "VERIFIED_MATCH",
          confidenceScore: "100.0%"
        };
      }
      throw { errorCode: 404, message: 'BVN record not found on NIBSS validation layer' };
    }

    if (endpoint.includes('/escrow/contracts') && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const contractId = 'esc_' + Math.random().toString(36).substring(2, 9);
      return {
        contractId,
        status: 'FUNDS_LOCKED',
        amount: body.amount,
        currency: body.currency,
        beneficiary: body.beneficiary,
        item: body.item,
        timestamp: new Date().toISOString()
      };
    }

    if (endpoint.includes('/v1/payments/initialize') && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const txRef = 'tx_agrojet_' + Math.random().toString(36).substring(2, 10);
      return {
        status: 'SUCCESS',
        txRef,
        checkoutUrl: `https://checkout.bmoni.com/pay/${txRef}`,
        accountNumber: '99' + Math.floor(10000000 + Math.random() * 90000000),
        bankName: 'BMONI Settlement Bank (NIBSS)',
        amount: body.amount,
        currency: body.currency
      };
    }

    return { status: 'SUCCESS', mode: 'ADAPTER_SANDBOX' };
  },

  async createUser(payload) {
    return this.request('/v1/users', { method: 'POST', body: JSON.stringify(payload) });
  },

  async submitKyc(userId, kycData) {
    localStorage.setItem('agrojet_kyc_data_' + userId, JSON.stringify(kycData));
    return this.request(`/v1/users/${userId}/kyc`, { method: 'PATCH', body: JSON.stringify(kycData) });
  },

  async bvnLookup(bvn) {
    const trimmed = bvn ? bvn.trim() : '';
    if (!/^\d{11}$/.test(trimmed)) {
      throw { errorCode: 400, message: 'BVN must be exactly 11 digits' };
    }
    return this.request(`/v1/bvn-lookup?bvn=${bvn}`);
  },

  async createEscrow(params) {
    return this.request('/escrow/contracts', { method: 'POST', body: JSON.stringify(params) });
  },

  async initializePayment(params) {
    return this.request('/v1/payments/initialize', { method: 'POST', body: JSON.stringify(params) });
  }
};

const MOCK_CORPORATE_BUYERS = [
  {
    id: 'cb_1',
    companyName: 'Nestlé Food Processing Plant',
    industry: 'FMCG / Food & Beverage',
    rawMaterialNeeded: 'Non-GMO Grain Maize (Yellow/White)',
    monthlyVolumeReq: '800 MT / Month',
    offerPrice: '₦490,000 / MT',
    unitPriceNumeric: 490000,
    location: 'Agbara Industrial Zone, Ogun State',
    qualitySpecs: ['Moisture < 12%', 'Aflatoxin < 10 ppb', 'Impurity < 1%'],
    escrowDepositLocked: '$120,000 USD (BMONI Escrow)',
    contactPerson: 'Procurement Desk - Grains',
    verifiedBuyer: true,
    category: 'Maize'
  },
  {
    id: 'cb_2',
    companyName: 'Psaltry International Starch Ltd',
    industry: 'Industrial Starch & Alcohol',
    rawMaterialNeeded: 'Fresh Cassava Roots (High Starch Content)',
    monthlyVolumeReq: '2,500 MT / Month',
    offerPrice: '₦195,000 / MT',
    unitPriceNumeric: 195000,
    location: 'Ado-Awaye, Oyo State',
    qualitySpecs: ['Starch Content > 25%', 'Harvested within 24hrs', 'Cyanide Low'],
    escrowDepositLocked: '₦150,000,000 NGN (cNGN Locked)',
    contactPerson: 'Raw Materials Sourcing Team',
    verifiedBuyer: true,
    category: 'Cassava'
  },
  {
    id: 'cb_3',
    companyName: 'Olam Agri Processing Mills',
    industry: 'Edible Oils & Animal Feed',
    rawMaterialNeeded: 'Raw Soybeans (Industrial Grade)',
    monthlyVolumeReq: '1,200 MT / Month',
    offerPrice: '₦850,000 / MT',
    unitPriceNumeric: 850000,
    location: 'Kaduna Industrial Layout, Kaduna State',
    qualitySpecs: ['Oil content > 18%', 'Foreign matter < 2%', 'Splits < 5%'],
    escrowDepositLocked: '$250,000 USD (BMONI Escrow)',
    contactPerson: 'Agri Supply Chain Lead',
    verifiedBuyer: true,
    category: 'Soybeans'
  },
  {
    id: 'cb_4',
    companyName: 'Grand Cereals & Feeds (UAC)',
    industry: 'Livestock & Poultry Feed',
    rawMaterialNeeded: 'Cleaned Yellow Maize & Sorghum',
    monthlyVolumeReq: '600 MT / Month',
    offerPrice: '₦475,000 / MT',
    unitPriceNumeric: 475000,
    location: 'Jos, Plateau State',
    qualitySpecs: ['Moisture < 13%', 'Cleaned & Destoned'],
    escrowDepositLocked: '₦80,000,000 NGN (cNGN Locked)',
    contactPerson: 'Feed Mill Grains Procurement',
    verifiedBuyer: true,
    category: 'Maize'
  },
  {
    id: 'cb_5',
    companyName: 'Tolaram Nutri-Beverages Exporters',
    industry: 'Export & Oil Extraction',
    rawMaterialNeeded: 'White Sesame Seeds (Grade A Cleaned)',
    monthlyVolumeReq: '300 MT / Month',
    offerPrice: '₦1,380,000 / MT',
    unitPriceNumeric: 1380000,
    location: 'Kano Free Trade Zone, Kano',
    qualitySpecs: ['Purity > 99%', 'Admixture < 1%', 'Oil content > 50%'],
    escrowDepositLocked: '$180,000 USD (BMONI Escrow)',
    contactPerson: 'Export Commodity Desk',
    verifiedBuyer: true,
    category: 'Sesame'
  }
];

const MOCK_AGRI_INPUTS = [
  {
    id: 'inp_1',
    name: 'Premier Hybrid F1 Seed Maize (25kg Bag)',
    category: 'Seeds',
    merchant: 'Premier Seeds Nigeria Ltd',
    priceNGN: 48000,
    location: 'Ibadan, Oyo State',
    rating: 4.9,
    stock: '150 Bags',
    verified: true,
    specs: ['Germination Rate > 98%', 'High Yield Potential (7-9 MT/Ha)', 'Drought Tolerant']
  },
  {
    id: 'inp_2',
    name: 'Indorama Granular Urea 46% Nitrogen (50kg)',
    category: 'Fertilizers',
    merchant: 'FarmRight Agrochemicals Ltd',
    priceNGN: 38500,
    location: 'Kano, Kano State',
    rating: 4.8,
    stock: '500 Bags',
    verified: true,
    specs: ['46% Pure Nitrogen Content', 'Quick-dissolving Granules', 'NNPC/Indorama Factory Direct']
  },
  {
    id: 'inp_3',
    name: 'Honda 3-inch Gasoline Water Pump for Irrigation',
    category: 'Tools & Machinery',
    merchant: 'AgriTech Heavy Machinery Depot',
    priceNGN: 185000,
    location: 'Ikeja, Lagos State',
    rating: 4.9,
    stock: '25 Units',
    verified: true,
    specs: ['GX200 6.5HP Engine', '1,000 Liters/min Flow', 'Suction Head 8 meters']
  },
  {
    id: 'inp_4',
    name: 'Dual Powered Battery/Manual Knapsack Sprayer (20L)',
    category: 'Tools & Machinery',
    merchant: 'GreenField Agro Supplies',
    priceNGN: 62000,
    location: 'Akure, Ondo State',
    rating: 4.7,
    stock: '80 Units',
    verified: true,
    specs: ['12V 8Ah Rechargeable Battery', '4-5 Hours Continuous Operation', 'Stainless Steel Wand']
  }
];

const MOCK_IMPORT_POOLS = [
  {
    id: 'pool_1',
    title: 'Solar-Powered Continuous Grain & Cassava Dryer (10 Ton/Day)',
    origin: 'Germany (AgroTech GmbH)',
    category: 'Post-Harvest Drying',
    priceUSD: 4200,
    priceNGN: 6300000,
    retailPriceUSD: 6500,
    targetUnits: 5,
    reservedUnits: 3,
    status: 'Pooling Active',
    estimatedDays: 25,
    description: 'Hybrid solar and biomass multi-crop dryer. Prevents mold, aflatoxins, and crop wastage during harvest season.',
    specs: ['15kW Integrated Solar Array', 'Automated Humidity & Temp Sensors', 'CE & ISO 9001 Certified'],
    groupSavings: 'Save $2,300 USD per unit via bulk freight & customs'
  },
  {
    id: 'pool_2',
    title: 'Precision IoT Drip Irrigation & Fertigation Master Kit (5 Hectares)',
    origin: 'Israel (Netafim Export)',
    category: 'Irrigation & Smart Farming',
    priceUSD: 1800,
    priceNGN: 2700000,
    retailPriceUSD: 2800,
    targetUnits: 10,
    reservedUnits: 7,
    status: 'Pooling Active',
    estimatedDays: 18,
    description: 'Automated pressure-compensating drip system with solar fertigation pump and smartphone soil moisture telemetry.',
    specs: ['Self-Cleaning Drippers', 'Venturi Fertilizer Injector', 'App-Controlled Solenoid Valves'],
    groupSavings: 'Save $1,000 USD per unit via group customs clearance'
  },
  {
    id: 'pool_3',
    title: 'Compact Multi-Crop Paddy & Soybean Mini Combine Harvester (25 HP)',
    origin: 'Japan (Yanmar Agri)',
    category: 'Heavy Harvesting',
    priceUSD: 8500,
    priceNGN: 12750000,
    retailPriceUSD: 12000,
    targetUnits: 6,
    reservedUnits: 5,
    status: 'Finalizing Pool (83% Locked)',
    estimatedDays: 30,
    description: 'Crawler-track mini combine harvester specifically engineered for smallholder fields and wet soil conditions.',
    specs: ['25 HP Water-cooled Diesel Engine', 'Rice, Wheat & Soy Harvesting', 'Rubber Tracks for Soft Terrain'],
    groupSavings: 'Save $3,500 USD per unit in container shipping'
  },
  {
    id: 'pool_4',
    title: 'Wireless Spectrometer Soil NPK & pH Diagnostic Probe',
    origin: 'Netherlands (SensorTech EU)',
    category: 'Agronomy Tech',
    priceUSD: 350,
    priceNGN: 525000,
    retailPriceUSD: 580,
    targetUnits: 20,
    reservedUnits: 14,
    status: 'Pooling Active',
    estimatedDays: 14,
    description: 'Instant optical soil testing probe providing real-time N-P-K nutrient levels, soil pH, and EC reading directly on mobile app.',
    specs: ['Bluetooth 5.0 Connectivity', 'Instant 30-Second Analysis', 'Rechargeable Li-Ion Battery'],
    groupSavings: 'Save $230 USD per probe via co-import'
  }
];

const INITIAL_HARVEST_PRODUCE = [
  { id: 'har_1', seller: 'Ogun Farmers Cooperative Union', crop: 'Cleaned Yellow Maize (Grade A)', volumeAvailable: 150, priceNGN: 450000, unit: 'MT', location: 'Ilaro, Ogun State', rating: 4.9, verified: true, specs: ['Moisture < 12%', 'Aflatoxin Safe', 'Bags in 50kg PP'] },
  { id: 'har_2', seller: 'Greenfields Cassava Outgrowers', crop: 'Fresh High-Starch Cassava Tubers', volumeAvailable: 300, priceNGN: 180000, unit: 'MT', location: 'Abeokuta, Ogun State', rating: 4.8, verified: true, specs: ['Starch > 26%', 'Harvest on Order', 'Farmgate Direct'] },
  { id: 'har_3', seller: 'Northern Sesame Exporters Coop', crop: 'White Raw Sesame Seeds (Humera Grade)', volumeAvailable: 80, priceNGN: 1250000, unit: 'MT', location: 'Dawanau, Kano State', rating: 5.0, verified: true, specs: ['Purity 99.5%', 'Oil Content 52%', 'Free from Foreign Matter'] },
  { id: 'har_4', seller: 'Middle Belt Soy Farmers Network', crop: 'Non-GMO Yellow Soybeans', volumeAvailable: 200, priceNGN: 820000, unit: 'MT', location: 'Gboko, Benue State', rating: 4.7, verified: true, specs: ['Protein > 40%', 'Moisture 10%', 'Cleaned & Sorted'] }
];

export default function App() {
  // Auth & Onboarding State: 'login', 'onboard', or 'dashboard'
  const [authView, setAuthView] = useState('login');
  const [loginEmail, setLoginEmail] = useState('farmer@agrojet.bmoni.com');
  const [loginPin, setLoginPin] = useState('123456');

  // Onboarding Form State
  const [onboardForm, setOnboardForm] = useState({
    firstName: 'Bunch',
    lastName: 'Dillon',
    email: 'bunch.dillon@example.com',
    phoneNumber: '+2348030001122',
    bvn: '95888168924'
  });
  const [onboardLoading, setOnboardLoading] = useState(false);

  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('corporatebuyers');

  // Live Console Logs Stream
  const [consoleLogs, setConsoleLogs] = useState([
    { id: 1, type: 'INFO', time: new Date().toLocaleTimeString(), message: 'System initialized. AGRO JET connected to BMONI Payment Gateway & Escrow Rails.' }
  ]);

  // Balances
  const [ngnBalance, setNgnBalance] = useState(2500000);
  const [cngnBalance, setCngnBalance] = useState(150000);
  const [usdBalance, setUsdBalance] = useState(2500);

  // Active Escrow Contracts Ledger
  const [activeEscrowContracts, setActiveEscrowContracts] = useState([
    {
      id: 'esc_9021',
      crop: 'Cleaned Yellow Maize (Grade A)',
      seller: 'Ogun Farmers Cooperative Union',
      buyer: 'You (Active User)',
      quantity: '20 MT',
      totalAmount: 9000000,
      currency: 'cNGN',
      status: 'LOCKED_IN_ESCROW',
      stage: 2,
      date: '2026-09-01',
      qualitySpecs: 'Moisture < 12%, Aflatoxin Safe'
    }
  ]);

  // BMONI Payment Gateway Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInitData, setPaymentInitData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentRail, setPaymentRail] = useState('cngn');
  const [paymentSuccessCallback, setPaymentSuccessCallback] = useState(null);

  // Mintlify docs state
  const [docContent, setDocContent] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    { role: 'assistant', text: 'Hello! I am your AGRO JET & BMONI Embedded AI Assistant. How can I assist you with corporate off-takes, escrow rails, or BVN verification today?' }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState('');

  // Corporate Buyer Match state
  const [selectedCropCategory, setSelectedCropCategory] = useState('All');
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [selectedBuyerForProposal, setSelectedBuyerForProposal] = useState(null);
  const [farmerTonnageOffer, setFarmerTonnageOffer] = useState('');
  const [proposalSubmittedSuccess, setProposalSubmittedSuccess] = useState('');

  // Agri-Inputs & Import Pool State
  const [inputSubTab, setInputSubTab] = useState('importpools');
  const [importPools, setImportPools] = useState(MOCK_IMPORT_POOLS);
  const [selectedPoolForJoin, setSelectedPoolForJoin] = useState(null);
  const [poolUnitsToOrder, setPoolUnitsToOrder] = useState(1);
  const [poolSuccessMsg, setPoolSuccessMsg] = useState('');
  const [selectedMerchantItem, setSelectedMerchantItem] = useState(null);
  const [merchantBuySuccessMsg, setMerchantBuySuccessMsg] = useState('');

  // Harvest Marketplace & Escrow Contract Execution State
  const [selectedProduceForEscrow, setSelectedProduceForEscrow] = useState(null);
  const [escrowQuantity, setEscrowQuantity] = useState(5);
  const [escrowCurrency, setEscrowCurrency] = useState('cNGN');
  const [escrowSuccessMsg, setEscrowSuccessMsg] = useState('');

  // Sandbox Onboarding Persona State inside dashboard
  const [kycProfile, setKycProfile] = useState({
    firstName: 'Bunch',
    lastName: 'Dillon',
    email: 'bunch.dillon@example.com',
    phoneNumber: '+2348030001122',
    bvn: '95888168924',
    bvnResult: null,
    step: 1
  });

  // Sandbox API Test Terminal State
  const [testAmount, setTestAmount] = useState('500000');
  const [testChannel, setTestChannel] = useState('cNGN');
  const [terminalResult, setTerminalResult] = useState(null);

  const logsEndRef = useRef(null);

  useEffect(() => {
    loadSessionState();
    fetchMintlifyDocs();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addLog = (type, message) => {
    const newEntry = {
      id: Date.now() + Math.random(),
      type,
      time: new Date().toLocaleTimeString(),
      message
    };
    setConsoleLogs(prev => [...prev.slice(-40), newEntry]);
  };

  const loadSessionState = async () => {
    try {
      const uid = localStorage.getItem('agrojet_user_id');
      const profile = localStorage.getItem('agrojet_user_profile');
      if (uid && profile) {
        setUserId(uid);
        setUserProfile(JSON.parse(profile));
        setAuthView('dashboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    addLog('INFO', `[Auth] Authenticating session for ${loginEmail}...`);
    try {
      const user = await BmoniServiceAdapter.createUser({
        firstName: 'Bunch',
        lastName: 'Dillon',
        email: loginEmail,
        phone: '+2348030001122'
      });
      setUserId(user.userId);
      setUserProfile(user);
      setAuthView('dashboard');
      addLog('SUCCESS', `[Auth] Login successful. Welcome back, ${user.firstName}!`);
    } catch (err) {
      addLog('WARN', '[Auth] Login failed');
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setOnboardLoading(true);
    try {
      // 1. Create user
      const user = await BmoniServiceAdapter.createUser({
        firstName: onboardForm.firstName,
        lastName: onboardForm.lastName,
        email: onboardForm.email,
        phone: onboardForm.phoneNumber
      });

      // 2. BVN Lookup verification
      await BmoniServiceAdapter.bvnLookup(onboardForm.bvn);

      setUserId(user.userId);
      setUserProfile(user);
      addLog('SUCCESS', `[Onboarding] Successfully registered & NIBSS verified user ${user.userId}`);
      setAuthView('dashboard');
    } catch (err) {
      addLog('WARN', `[Onboarding Error] ${err.message || 'Onboarding failed'}`);
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('agrojet_user_id');
    localStorage.removeItem('agrojet_user_profile');
    setUserId(null);
    setUserProfile(null);
    setAuthView('login');
    addLog('INFO', '[Auth] User logged out successfully.');
  };

  const fetchMintlifyDocs = async () => {
    try {
      const response = await fetch('https://bkey.mintlify.site/llms.txt').catch(() => null);
      if (response && response.ok) {
        const text = await response.text();
        setDocContent(text);
      } else {
        setDocContent(`# AGRO JET & BMONI Embedded Documentation Index (Cached)\nBase URL: https://api.bmoni.com/docs`);
      }
    } catch (err) {
      setDocContent(`# AGRO JET & BMONI Embedded Documentation Index (Cached)`);
    }
  };

  const handleAiAsk = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    const userText = aiQuery;
    setAiQuery('');
    setAiChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setAiLoading(true);

    try {
      const apiKey = '';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `You are the AGRO JET & BMONI Embedded Agritech Assistant. Reference these docs:\n${docContent}\n\nUser Question: ${userText}` }] }]
        })
      });
      const result = await response.json();
      const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text || "AGRO JET provides multi-currency smart escrow settlement for agricultural off-take contracts powered by the BMONI Payment API.";
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: "For BVN verification, provide an 11-digit BVN (e.g., 95888168924). For Escrow, select any produce item in the Harvest Marketplace." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(''), 2500);
  };

  // Open BMONI Unified Payment Gateway Modal
  const openBmoniCheckout = async (amount, currency, itemTitle, onSuccess) => {
    setPaymentLoading(true);
    setPaymentModalOpen(true);
    setPaymentSuccessCallback(() => onSuccess);

    try {
      const initRes = await BmoniServiceAdapter.initializePayment({ amount, currency, item: itemTitle });
      setPaymentInitData(initRes);
      addLog('API_CALL', `[BMONI Payment API] Initialized checkout session ${initRes.txRef} for ${currency} ${amount.toLocaleString()}`);
    } catch (e) {
      addLog('WARN', '[BMONI Payment API] Failed to initialize payment gateway session');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmBmoniPayment = () => {
    if (!paymentInitData) return;

    const amt = paymentInitData.amount;
    const curr = paymentInitData.currency;

    if (paymentRail === 'cngn' || curr === 'cNGN') {
      if (cngnBalance < amt) setCngnBalance(prev => prev + amt * 2);
      setCngnBalance(prev => Math.max(0, prev - amt));
    } else if (paymentRail === 'usdb' || curr === 'USDB' || curr === 'USD') {
      if (usdBalance < amt) setUsdBalance(prev => prev + amt * 2);
      setUsdBalance(prev => Math.max(0, prev - amt));
    } else {
      if (ngnBalance < amt) setNgnBalance(prev => prev + amt * 2);
      setNgnBalance(prev => Math.max(0, prev - amt));
    }

    addLog('SUCCESS', `[BMONI Payment API] Transaction ${paymentInitData.txRef} successfully completed via ${paymentRail.toUpperCase()}`);
    
    if (paymentSuccessCallback) {
      paymentSuccessCallback(paymentInitData);
    }

    setPaymentModalOpen(false);
    setPaymentInitData(null);
  };

  const filteredCorporateBuyers = MOCK_CORPORATE_BUYERS.filter(buyer => {
    const matchesCategory = selectedCropCategory === 'All' || buyer.category === selectedCropCategory;
    const matchesSearch = buyer.companyName.toLowerCase().includes(buyerSearchQuery.toLowerCase()) ||
                          buyer.rawMaterialNeeded.toLowerCase().includes(buyerSearchQuery.toLowerCase()) ||
                          buyer.location.toLowerCase().includes(buyerSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitSupplyProposal = async (e) => {
    e.preventDefault();
    if (!farmerTonnageOffer || parseFloat(farmerTonnageOffer) <= 0) return;

    const tonnage = parseFloat(farmerTonnageOffer);
    const totalContractValue = tonnage * selectedBuyerForProposal.unitPriceNumeric;

    openBmoniCheckout(totalContractValue, 'cNGN', `${tonnage} MT of ${selectedBuyerForProposal.rawMaterialNeeded}`, async (paymentRes) => {
      try {
        const res = await BmoniServiceAdapter.createEscrow({
          amount: totalContractValue,
          currency: 'cNGN',
          beneficiary: selectedBuyerForProposal.companyName,
          item: `${tonnage} MT of ${selectedBuyerForProposal.rawMaterialNeeded}`
        });

        addLog('SUCCESS', `[Industrial Offtake Contract ${res.contractId}] Drafted supply of ${tonnage} MT to ${selectedBuyerForProposal.companyName}. Escrow reserved!`);
        setProposalSubmittedSuccess(`Successfully bound supply offer of ${tonnage} MT into BMONI Escrow Draft (${res.contractId}) for ${selectedBuyerForProposal.companyName}!`);
        
        setActiveEscrowContracts(prev => [
          {
            id: res.contractId,
            crop: selectedBuyerForProposal.rawMaterialNeeded,
            seller: 'You (AGRO JET Supplier)',
            buyer: selectedBuyerForProposal.companyName,
            quantity: `${tonnage} MT`,
            totalAmount: totalContractValue,
            currency: 'cNGN',
            status: 'OFFER_SUBMITTED',
            stage: 1,
            date: new Date().toISOString().split('T')[0],
            qualitySpecs: selectedBuyerForProposal.qualitySpecs.join(', ')
          },
          ...prev
        ]);

        setTimeout(() => {
          setSelectedBuyerForProposal(null);
          setFarmerTonnageOffer('');
          setProposalSubmittedSuccess('');
        }, 1500);
      } catch (err) {
        addLog('WARN', `[Offtake Proposal Error] ${err.message || 'Failed to submit proposal'}`);
      }
    });
  };

  const handleConfirmPoolParticipation = (e) => {
    e.preventDefault();
    const qty = parseInt(poolUnitsToOrder, 10);
    if (!qty || qty <= 0 || !selectedPoolForJoin) return;

    const totalCostUSD = selectedPoolForJoin.priceUSD * qty;

    openBmoniCheckout(totalCostUSD, 'USDB', `${qty}x ${selectedPoolForJoin.title}`, async (paymentRes) => {
      setImportPools(prev => prev.map(p => {
        if (p.id === selectedPoolForJoin.id) {
          const newReserved = Math.min(p.targetUnits, p.reservedUnits + qty);
          return {
            ...p,
            reservedUnits: newReserved,
            status: newReserved >= p.targetUnits ? 'Pool Reached! Order Placed' : p.status
          };
        }
        return p;
      }));

      addLog('SUCCESS', `[Group Import Escrow] Locked deposit for ${qty}x unit(s) of "${selectedPoolForJoin.title}" ($${totalCostUSD.toLocaleString()} USD) in BMONI Escrow.`);
      setPoolSuccessMsg(`Successfully joined import pool! Funds ($${totalCostUSD.toLocaleString()} USD) are safely locked.`);

      setTimeout(() => {
        setSelectedPoolForJoin(null);
        setPoolUnitsToOrder(1);
        setPoolSuccessMsg('');
      }, 1500);
    });
  };

  const handleBuyMerchantInput = (e) => {
    e.preventDefault();
    if (!selectedMerchantItem) return;

    const price = selectedMerchantItem.priceNGN;

    openBmoniCheckout(price, 'NGN', selectedMerchantItem.name, async (paymentRes) => {
      addLog('SUCCESS', `[Merchant Escrow] Purchased "${selectedMerchantItem.name}" from ${selectedMerchantItem.merchant} for ₦${price.toLocaleString()} NGN.`);
      setMerchantBuySuccessMsg(`Order confirmed! ₦${price.toLocaleString()} locked in BMONI Escrow until merchant delivery.`);

      setTimeout(() => {
        setSelectedMerchantItem(null);
        setMerchantBuySuccessMsg('');
      }, 1500);
    });
  };

  const handleExecuteHarvestEscrow = async (e) => {
    e.preventDefault();
    if (!selectedProduceForEscrow) return;

    const qty = parseFloat(escrowQuantity);
    const totalNGN = qty * selectedProduceForEscrow.priceNGN;
    const totalAmount = escrowCurrency === 'USDB' ? Math.round(totalNGN / 1500) : totalNGN;

    openBmoniCheckout(totalAmount, escrowCurrency, `${qty} ${selectedProduceForEscrow.unit} of ${selectedProduceForEscrow.crop}`, async (paymentRes) => {
      try {
        const res = await BmoniServiceAdapter.createEscrow({
          amount: totalAmount,
          currency: escrowCurrency,
          beneficiary: selectedProduceForEscrow.seller,
          item: `${qty} ${selectedProduceForEscrow.unit} of ${selectedProduceForEscrow.crop}`
        });

        const newContract = {
          id: res.contractId,
          crop: selectedProduceForEscrow.crop,
          seller: selectedProduceForEscrow.seller,
          buyer: 'You (AGRO JET User)',
          quantity: `${qty} ${selectedProduceForEscrow.unit}`,
          totalAmount,
          currency: escrowCurrency,
          status: 'LOCKED_IN_ESCROW',
          stage: 2,
          date: new Date().toISOString().split('T')[0],
          qualitySpecs: selectedProduceForEscrow.specs.join(', ')
        };

        setActiveEscrowContracts(prev => [newContract, ...prev]);
        addLog('SUCCESS', `[Smart Escrow ${res.contractId}] Locked ${escrowCurrency} ${totalAmount.toLocaleString()} for ${qty} ${selectedProduceForEscrow.unit}`);
        setEscrowSuccessMsg(`Smart Escrow contract ${res.contractId} created & funds locked in BMONI Ledger!`);

        setTimeout(() => {
          setSelectedProduceForEscrow(null);
          setEscrowSuccessMsg('');
        }, 1500);
      } catch (err) {
        addLog('WARN', `[Escrow Execution Error] ${err.message}`);
      }
    });
  };

  const handleReleaseEscrowFunds = (contractId) => {
    setActiveEscrowContracts(prev => prev.map(c => {
      if (c.id === contractId) {
        return { ...c, status: 'FUNDS_RELEASED_TO_SELLER', stage: 4 };
      }
      return c;
    }));
    addLog('SUCCESS', `[Escrow Settlement] Quality verified for ${contractId}. Funds released to seller wallet!`);
  };

  const handlePerformBvnLookup = async (bvnToTest) => {
    const targetBvn = bvnToTest || kycProfile.bvn;
    try {
      const res = await BmoniServiceAdapter.bvnLookup(targetBvn);
      setKycProfile(prev => ({ ...prev, bvn: targetBvn, bvnResult: res, step: 3 }));
      addLog('SUCCESS', `[NIBSS BVN Lookup] Match confirmed for ${res.firstName} ${res.lastName} (${res.confidenceScore})`);
    } catch (err) {
      addLog('WARN', `[NIBSS BVN Error] ${err.message || 'Lookup failed'}`);
    }
  };

  const handleRunTerminalTest = async (e) => {
    e.preventDefault();
    const amt = parseFloat(testAmount);
    if (!amt || isNaN(amt)) return;

    openBmoniCheckout(amt, testChannel, 'Manual API Test Terminal Checkout', (res) => {
      setTerminalResult(res);
      addLog('SUCCESS', `[Terminal Test] Payment ref ${res.txRef} verified successfully via BMONI API adapter.`);
    });
  };

  // -------------------------------------------------------------------------
  // RENDER AUTH VIEWS (LOGIN / ONBOARDING) IF NOT LOGGED IN
  // -------------------------------------------------------------------------
  if (authView !== 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 font-sans text-gray-100">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center bg-emerald-500 text-emerald-950 font-black px-4 py-2 rounded-2xl text-sm tracking-wider shadow-lg">
              AGRO JET 🚀
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-2">
              {authView === 'login' ? 'Welcome Back to AGRO JET' : 'Create Your AGRO JET Account'}
            </h1>
            <p className="text-xs text-emerald-200">
              {authView === 'login' ? 'Sign in to access your BMONI escrow & agricultural rails' : 'Fast onboarding with NIBSS BVN verification & multi-currency rails'}
            </p>
          </div>

          {authView === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Email Address / Farmer ID</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-white text-gray-900 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Signing PIN (6-Digit)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-white text-gray-900 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold py-3.5 rounded-2xl text-xs shadow-lg transition-all transform active:scale-95"
              >
                Sign In to AGRO JET
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthView('onboard')}
                  className="text-xs text-emerald-300 hover:text-white underline font-semibold transition-all"
                >
                  Don't have an account? Sign up / Onboard
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-emerald-200">First Name</label>
                  <input
                    type="text"
                    value={onboardForm.firstName}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-emerald-200">Last Name</label>
                  <input
                    type="text"
                    value={onboardForm.lastName}
                    onChange={(e) => setOnboardForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Email Address</label>
                <input
                  type="email"
                  value={onboardForm.email}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">Phone Number (E.164)</label>
                <input
                  type="text"
                  value={onboardForm.phoneNumber}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-emerald-200">11-Digit BVN (NIBSS Sandbox)</label>
                <input
                  type="text"
                  maxLength={11}
                  value={onboardForm.bvn}
                  onChange={(e) => setOnboardForm(prev => ({ ...prev, bvn: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                  placeholder="95888168924"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={onboardLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold py-3.5 rounded-2xl text-xs shadow-lg transition-all"
              >
                {onboardLoading ? 'Verifying NIBSS BVN & Creating Wallet...' : 'Complete Onboarding & Start'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthView('login')}
                  className="text-xs text-emerald-300 hover:text-white underline font-semibold transition-all"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER DASHBOARD VIEW ONCE LOGGED IN
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      
      {/* Header */}
      <header className="bg-emerald-900 text-white px-4 sm:px-6 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-md gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-emerald-500 text-emerald-950 font-black px-3.5 py-1.5 rounded-lg text-xs tracking-wider shadow-sm shrink-0">
            AGRO JET 🚀
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-snug tracking-wide">
              AGRO JET — Powered by BMONI Payment API & Escrow Rails
            </h1>
            <p className="text-xs text-emerald-200">
              Active Gateway: <code className="bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 font-mono">BmoniPaymentAPI</code> (Sandbox Mode)
            </p>
          </div>
        </div>

        {/* Balance Drawer & User Identity & Logout */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <div className="bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs">
            <div>
              <span className="text-emerald-400 block text-[10px] uppercase font-semibold">NGN Fiat</span>
              <span className="font-mono font-bold text-white">₦{ngnBalance.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-emerald-800"></div>
            <div>
              <span className="text-emerald-400 block text-[10px] uppercase font-semibold">cNGN Stable</span>
              <span className="font-mono font-bold text-white">₦{cngnBalance.toLocaleString()}</span>
            </div>
            <div className="w-px h-6 bg-emerald-800"></div>
            <div>
              <span className="text-emerald-400 block text-[10px] uppercase font-semibold">USDB Stable</span>
              <span className="font-mono font-bold text-white">${usdBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="font-medium text-emerald-100 truncate max-w-[120px]">
              {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Guest'}
            </span>
            <button
              onClick={handleLogout}
              className="ml-2 bg-red-600/80 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold transition-all"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 flex overflow-x-auto shadow-sm">
        {[
          { id: 'corporatebuyers', label: '🌾 Corporate Offtake Match', badge: '5 Buyers' },
          { id: 'harvestmarket', label: '🛒 Harvest Produce Marketplace', badge: 'Escrow' },
          { id: 'inputs', label: '🚜 Agri-Inputs & Import Pool', badge: 'Group Save' },
          { id: 'escrowledger', label: '🔒 Smart Escrow Ledger', badge: activeEscrowContracts.length },
          { id: 'sandboxkyc', label: '🛡️ NIBSS BVN & Onboarding', badge: 'Live API' },
          { id: 'docs', label: '📚 Mintlify & AI Assistant', badge: 'Docs' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {tab.badge}
            </span>
          </button>
        ))}
      </nav>

      {/* Copied Notification Toast */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-gray-700 animate-bounce">
          <span className="text-emerald-400 font-bold">✓ Copied</span>
          <span>{copiedNotification}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left & Center Columns (Main Tab View) */}
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: CORPORATE BUYERS MATCH */}
          {activeTab === 'corporatebuyers' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                    AGRO JET Industrial Offtake Bridge
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold">Match Farm Produce Directly with Corporate Offtakers</h2>
                  <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
                    Connect your harvest directly to blue-chip processing plants (Nestlé, Psaltry, Olam, UAC) with guaranteed payment settlements locked in BMONI multi-currency escrow rails.
                  </p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                  {['All', 'Maize', 'Cassava', 'Soybeans', 'Sesame'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCropCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCropCategory === cat
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search company or location..."
                    value={buyerSearchQuery}
                    onChange={(e) => setBuyerSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Corporate Buyer Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCorporateBuyers.map(buyer => (
                  <div key={buyer.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                            {buyer.industry}
                          </span>
                          <h3 className="font-bold text-base text-gray-900 mt-1">{buyer.companyName}</h3>
                        </div>
                        {buyer.verifiedBuyer && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold flex items-center gap-1">
                            ✓ Verified Buyer
                          </span>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Raw Material Needed:</span>
                          <span className="font-semibold text-gray-900 text-right">{buyer.rawMaterialNeeded}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monthly Volume:</span>
                          <span className="font-bold text-emerald-700">{buyer.monthlyVolumeReq}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Offer Price:</span>
                          <span className="font-mono font-bold text-gray-900">{buyer.offerPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Escrow Deposit:</span>
                          <span className="font-mono text-emerald-600 font-semibold">{buyer.escrowDepositLocked}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span className="text-gray-700">{buyer.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {buyer.qualitySpecs.map((spec, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                            • {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedBuyerForProposal(buyer)}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <span>🤝 Supply to Offtaker & Lock Escrow</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: HARVEST PRODUCE MARKETPLACE */}
          {activeTab === 'harvestmarket' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white p-6 rounded-2xl shadow-md">
                <span className="bg-teal-500/30 text-teal-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Verified Farmer Listings
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold mt-2">Source Cleaned & Graded Farm Produce</h2>
                <p className="text-xs sm:text-sm text-teal-100 mt-1">
                  Purchase certified grains and tubers directly from farmer cooperatives with automated BMONI escrow protection.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INITIAL_HARVEST_PRODUCE.map(prod => (
                  <div key={prod.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded">
                            {prod.seller}
                          </span>
                          <h3 className="font-bold text-base text-gray-900 mt-1">{prod.crop}</h3>
                        </div>
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-lg">
                          ★ {prod.rating}
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Available Volume:</span>
                          <span className="font-bold text-gray-900">{prod.volumeAvailable} {prod.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Unit Price:</span>
                          <span className="font-mono font-bold text-emerald-700">₦{prod.priceNGN.toLocaleString()} / {prod.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location:</span>
                          <span className="text-gray-700">{prod.location}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {prod.specs.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedProduceForEscrow(prod)}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all"
                    >
                      Lock Escrow & Purchase Produce
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AGRI-INPUTS & IMPORT POOL */}
          {activeTab === 'inputs' && (
            <div className="space-y-6">
              <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-full sm:w-fit">
                <button
                  onClick={() => setInputSubTab('importpools')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    inputSubTab === 'importpools' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  🚢 Group Import Pooling (Machinery & Tech)
                </button>
                <button
                  onClick={() => setInputSubTab('inputs')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    inputSubTab === 'inputs' ? 'bg-emerald-700 text-white shadow-sm' : 'text-gray-600 hover:text-emerald-700'
                  }`}
                >
                  🧪 Agri-Inputs & Fertilizers
                </button>
              </div>

              {inputSubTab === 'importpools' && (
                <div className="space-y-4">
                  <div className="bg-emerald-900 text-white p-5 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-base">Co-Import High-End Farm Machinery & Green Tech</h3>
                    <p className="text-xs text-emerald-200 mt-1">
                      Pool orders with other cooperatives to bypass middlemen, reduce freight fees by up to 35%, and secure direct factory pricing with BMONI escrow security.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {importPools.map(pool => (
                      <div key={pool.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                              {pool.origin}
                            </span>
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                              {pool.status}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-gray-900">{pool.title}</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">{pool.description}</p>

                          <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Group Pool Price:</span>
                              <span className="font-mono font-bold text-emerald-700">${pool.priceUSD.toLocaleString()} USD (₦{(pool.priceUSD * 1500).toLocaleString()})</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Retail Comparison:</span>
                              <span className="font-mono line-through text-gray-400">${pool.retailPriceUSD.toLocaleString()} USD</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Progress:</span>
                              <span className="font-bold text-gray-900">{pool.reservedUnits} / {pool.targetUnits} Units Locked</span>
                            </div>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${(pool.reservedUnits / pool.targetUnits) * 100}%` }}></div>
                          </div>

                          <div className="text-[10px] bg-emerald-50 text-emerald-800 p-2 rounded-lg font-semibold">
                            💡 {pool.groupSavings}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedPoolForJoin(pool)}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all"
                        >
                          Join Import Pool & Lock Deposit ($USD)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inputSubTab === 'inputs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MOCK_AGRI_INPUTS.map(inp => (
                    <div key={inp.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded">
                            {inp.category}
                          </span>
                          <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded">
                            ★ {inp.rating}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-gray-900">{inp.name}</h4>
                        <p className="text-xs text-gray-500 font-medium">{inp.merchant} • {inp.location}</p>

                        <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Price:</span>
                            <span className="font-mono font-bold text-emerald-700">₦{inp.priceNGN.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Stock Availability:</span>
                            <span className="font-bold text-gray-900">{inp.stock}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {inp.specs.map((s, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedMerchantItem(inp)}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm"
                      >
                        Buy with BMONI Escrow Protection
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SMART ESCROW LEDGER */}
          {activeTab === 'escrowledger' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Active Escrow Contracts & Milestone Ledger</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Track multi-currency smart escrow contracts, quality inspection states, and release funds upon successful delivery.
                </p>
              </div>

              <div className="space-y-4">
                {activeEscrowContracts.map(contract => (
                  <div key={contract.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                          {contract.id}
                        </span>
                        <h3 className="font-bold text-sm text-gray-900 mt-1">{contract.crop}</h3>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-xl ${
                        contract.status === 'FUNDS_RELEASED_TO_SELLER'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-100 text-emerald-800 animate-pulse'
                      }`}>
                        {contract.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-gray-50 p-3 rounded-xl">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Seller / Supplier</span>
                        <span className="font-semibold text-gray-900 truncate block">{contract.seller}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Buyer / Offtaker</span>
                        <span className="font-semibold text-gray-900 truncate block">{contract.buyer}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Quantity</span>
                        <span className="font-semibold text-gray-900">{contract.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Escrow Value</span>
                        <span className="font-mono font-bold text-emerald-700">{contract.currency} {contract.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Milestone Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-600">
                        <span className={contract.stage >= 1 ? 'text-emerald-700' : ''}>1. Contract Drafted</span>
                        <span className={contract.stage >= 2 ? 'text-emerald-700' : ''}>2. Funds Locked</span>
                        <span className={contract.stage >= 3 ? 'text-emerald-700' : ''}>3. Quality Inspection</span>
                        <span className={contract.stage >= 4 ? 'text-blue-700 font-bold' : ''}>4. Settlement Released</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full transition-all" style={{ width: `${(contract.stage / 4) * 100}%` }}></div>
                      </div>
                    </div>

                    {contract.status !== 'FUNDS_RELEASED_TO_SELLER' && (
                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => handleReleaseEscrowFunds(contract.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
                        >
                          ✓ Verify Quality & Release Escrow Funds to Seller
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: NIBSS BVN & ONBOARDING */}
          {activeTab === 'sandboxkyc' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                    NIBSS Verification Layer
                  </span>
                  <h2 className="text-lg font-bold text-gray-900 mt-2">Instant 11-Digit BVN & Tiered KYC Onboarding</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Test live NIBSS BVN verification using test profiles or enter any 11-digit BVN to validate identity.
                  </p>
                </div>

                {/* Test BVN Quick Buttons */}
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 space-y-2">
                  <span className="text-xs font-bold text-emerald-900 block">Quick Test BVNs (NIBSS Sandbox Mocks):</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Bunch Dillon (Farmer)', bvn: '95888168924' },
                      { name: 'Samson Jabo (Coop Lead)', bvn: '22222222222' },
                      { name: 'Amina Abubakar (Aggregator)', bvn: '33333333333' }
                    ].map(test => (
                      <button
                        key={test.bvn}
                        onClick={() => {
                          setKycProfile(prev => ({ ...prev, bvn: test.bvn, firstName: test.name.split(' ')[0], lastName: test.name.split(' ')[1] }));
                          handlePerformBvnLookup(test.bvn);
                        }}
                        className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all"
                      >
                        ⚡ Test {test.name} ({test.bvn})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <label className="block text-xs font-semibold text-gray-700">Enter 11-Digit BVN for NIBSS Verification</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        maxLength={11}
                        value={kycProfile.bvn}
                        onChange={(e) => setKycProfile(prev => ({ ...prev, bvn: e.target.value }))}
                        className="flex-1 px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                        placeholder="e.g. 95888168924"
                      />
                      <button
                        onClick={() => handlePerformBvnLookup()}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-sm"
                      >
                        Verify BVN
                      </button>
                    </div>

                    {kycProfile.bvnResult && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold text-emerald-900 border-b border-emerald-200 pb-1">
                          <span>NIBSS Verification Successful</span>
                          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">
                            Confidence: {kycProfile.bvnResult.confidenceScore}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-gray-700">
                          <div><span className="text-gray-500">Full Name:</span> {kycProfile.bvnResult.firstName} {kycProfile.bvnResult.lastName}</div>
                          <div><span className="text-gray-500">DOB:</span> {kycProfile.bvnResult.dateOfBirth}</div>
                          <div><span className="text-gray-500">Phone:</span> {kycProfile.bvnResult.phone}</div>
                          <div><span className="text-gray-500">NIN:</span> {kycProfile.bvnResult.nin}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MINTLIFY & AI ASSISTANT */}
          {activeTab === 'docs' && (
            <div className="space-y-6">
              {/* AI Assistant Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded uppercase tracking-wider">
                      Embedded AI Assistant
                    </span>
                    <h3 className="font-bold text-base text-gray-900 mt-1">Ask AGRO JET Developer AI</h3>
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-1 rounded">
                    ⚡ Connected to BMONI API
                  </span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {aiChatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-700 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-500 border border-gray-200 rounded-2xl p-3 text-xs animate-pulse">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAiAsk} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask about escrow contracts, BVN validation, or BMONI payment API..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
                  >
                    Ask AI
                  </button>
                </form>
              </div>

              {/* Mintlify LLMs.txt Raw Index */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-900">Documentation Index (llms.txt)</h3>
                  <button
                    onClick={() => copyToClipboard(docContent, 'Documentation index copied')}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-lg transition-all"
                  >
                    Copy llms.txt
                  </button>
                </div>
                <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {docContent || 'Loading documentation...'}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live API Console & Sandbox Terminal */}
        <div className="space-y-6">
          
          {/* API Test Sandbox Terminal */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <span>⚡</span> BMONI API Test Terminal
            </h3>
            <p className="text-xs text-gray-500">
              Directly invoke <code className="bg-gray-100 px-1 rounded font-mono text-emerald-700">initializePayment()</code> or <code className="bg-gray-100 px-1 rounded font-mono text-emerald-700">createEscrow()</code> with custom payloads.
            </p>

            <form onSubmit={handleRunTerminalTest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Test Amount</label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Rail / Currency</label>
                <select
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl"
                >
                  <option value="cNGN">cNGN (Stablecoin)</option>
                  <option value="NGN">NGN Fiat Bank Transfer</option>
                  <option value="USDB">USDB (USD Stable)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all"
              >
                Execute API Test Checkout
              </button>
            </form>

            {terminalResult && (
              <div className="bg-gray-900 text-emerald-400 p-3 rounded-xl text-[11px] font-mono space-y-1 overflow-x-auto">
                <div>status: "{terminalResult.status}"</div>
                <div>txRef: "{terminalResult.txRef}"</div>
                <div>accountNumber: "{terminalResult.accountNumber}"</div>
                <div>bankName: "{terminalResult.bankName}"</div>
              </div>
            )}
          </div>

          {/* Live Console Logs Stream */}
          <div className="bg-gray-900 rounded-2xl p-5 text-gray-300 space-y-3 shadow-md">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">
                Live Console & API Stream
              </span>
              <button
                onClick={() => setConsoleLogs([])}
                className="text-[10px] text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto text-[11px] font-mono">
              {consoleLogs.map(log => (
                <div key={log.id} className="border-b border-gray-800/50 pb-1.5 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span className={log.type === 'SUCCESS' ? 'text-emerald-400 font-bold' : log.type === 'WARN' ? 'text-amber-400' : 'text-blue-400'}>
                      [{log.type}]
                    </span>
                    <span>{log.time}</span>
                  </div>
                  <p className="text-gray-300 leading-tight">{log.message}</p>
                </div>
              ))}
              <div ref={logsEndRef}></div>
            </div>
          </div>

        </div>

      </main>

      {/* BMONI Unified Payment Gateway Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">
                  AGRO JET Secure Checkout
                </span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">BMONI Payment API Integration</h3>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {paymentLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-500 font-medium">Initializing secure BMONI settlement channel...</p>
              </div>
            ) : paymentInitData ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reference:</span>
                    <span className="font-mono font-bold text-emerald-900">{paymentInitData.txRef}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Settlement Bank:</span>
                    <span className="font-semibold text-gray-900">{paymentInitData.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Virtual Account:</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{paymentInitData.accountNumber}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-2 font-bold text-sm">
                    <span>Total Amount:</span>
                    <span className="font-mono text-emerald-900">{paymentInitData.currency} {paymentInitData.amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Select Funding Rail / Wallet</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cngn', label: 'cNGN Stable' },
                      { id: 'usdb', label: 'USDB (USD)' },
                      { id: 'bank', label: 'NGN Fiat Bank' }
                    ].map(rail => (
                      <button
                        key={rail.id}
                        type="button"
                        onClick={() => setPaymentRail(rail.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                          paymentRail === rail.id
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {rail.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleConfirmBmoniPayment}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Authorize & Complete Payment ({paymentInitData.currency} {paymentInitData.amount.toLocaleString()})</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Corporate Offtake Proposal Modal */}
      {selectedBuyerForProposal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded uppercase">
                  Offtake Contract Binding
                </span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedBuyerForProposal.companyName}</h3>
              </div>
              <button
                onClick={() => setSelectedBuyerForProposal(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {proposalSubmittedSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <span className="text-emerald-700 font-bold text-sm block">✓ Proposal Bound in Escrow!</span>
                <p className="text-xs text-gray-600">{proposalSubmittedSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSupplyProposal} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Raw Material:</span> <span className="font-semibold">{selectedBuyerForProposal.rawMaterialNeeded}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Agreed Offtake Price:</span> <span className="font-mono font-bold text-emerald-700">{selectedBuyerForProposal.offerPrice}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Location:</span> <span className="text-gray-700">{selectedBuyerForProposal.location}</span></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Enter Your Supply Tonnage Offer (Metric Tons - MT)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={farmerTonnageOffer}
                    onChange={(e) => setFarmerTonnageOffer(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                    required
                  />
                  {farmerTonnageOffer && !isNaN(parseFloat(farmerTonnageOffer)) && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1.5">
                      Total Contract Value: ₦{(parseFloat(farmerTonnageOffer) * selectedBuyerForProposal.unitPriceNumeric).toLocaleString()} cNGN
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all"
                >
                  Submit Supply Proposal & Lock BMONI Escrow Deposit
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Harvest Produce Escrow Modal */}
      {selectedProduceForEscrow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2.5 py-1 rounded uppercase">
                  Harvest Escrow Contract
                </span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedProduceForEscrow.crop}</h3>
              </div>
              <button
                onClick={() => setSelectedProduceForEscrow(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {escrowSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <span className="text-emerald-700 font-bold text-sm block">✓ Escrow Successfully Locked!</span>
                <p className="text-xs text-gray-600">{escrowSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleExecuteHarvestEscrow} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Seller Cooperative:</span> <span className="font-semibold">{selectedProduceForEscrow.seller}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Unit Price:</span> <span className="font-mono font-bold text-emerald-700">₦{selectedProduceForEscrow.priceNGN.toLocaleString()} / {selectedProduceForEscrow.unit}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Location:</span> <span className="text-gray-700">{selectedProduceForEscrow.location}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity ({selectedProduceForEscrow.unit})</label>
                    <input
                      type="number"
                      min="1"
                      value={escrowQuantity}
                      onChange={(e) => setEscrowQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Escrow Currency</label>
                    <select
                      value={escrowCurrency}
                      onChange={(e) => setEscrowCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl"
                    >
                      <option value="cNGN">cNGN (Stablecoin)</option>
                      <option value="USDB">USDB (USD Stable)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl text-xs flex justify-between font-bold text-emerald-900">
                  <span>Total Escrow Lock:</span>
                  <span className="font-mono">
                    {escrowCurrency} {escrowCurrency === 'USDB' ? Math.round((escrowQuantity * selectedProduceForEscrow.priceNGN) / 1500).toLocaleString() : (escrowQuantity * selectedProduceForEscrow.priceNGN).toLocaleString()}
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all"
                >
                  Lock Funds into Smart Escrow Contract
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Group Import Pool Modal */}
      {selectedPoolForJoin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded uppercase">
                  Co-Import Pooling
                </span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedPoolForJoin.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPoolForJoin(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {poolSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <span className="text-emerald-700 font-bold text-sm block">✓ Joined Import Pool!</span>
                <p className="text-xs text-gray-600">{poolSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmPoolParticipation} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Origin / Manufacturer:</span> <span className="font-semibold">{selectedPoolForJoin.origin}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Pool Unit Price:</span> <span className="font-mono font-bold text-emerald-700">${selectedPoolForJoin.priceUSD.toLocaleString()} USD</span></div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Units to Reserve</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedPoolForJoin.targetUnits - selectedPoolForJoin.reservedUnits}
                    value={poolUnitsToOrder}
                    onChange={(e) => setPoolUnitsToOrder(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-gray-900 border border-gray-300 rounded-xl font-mono"
                    required
                  />
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl text-xs flex justify-between font-bold text-emerald-900">
                  <span>Total Deposit Lock:</span>
                  <span className="font-mono">${(selectedPoolForJoin.priceUSD * poolUnitsToOrder).toLocaleString()} USD</span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all"
                >
                  Confirm & Lock Deposit in Group Import Escrow
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Merchant Agri-Input Buy Modal */}
      {selectedMerchantItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded uppercase">
                  Agri-Input Escrow
                </span>
                <h3 className="font-bold text-lg text-gray-900 mt-1">{selectedMerchantItem.name}</h3>
              </div>
              <button
                onClick={() => setSelectedMerchantItem(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {merchantBuySuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2">
                <span className="text-emerald-700 font-bold text-sm block">✓ Order Confirmed!</span>
                <p className="text-xs text-gray-600">{merchantBuySuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleBuyMerchantInput} className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Merchant:</span> <span className="font-semibold">{selectedMerchantItem.merchant}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Price:</span> <span className="font-mono font-bold text-emerald-700">₦{selectedMerchantItem.priceNGN.toLocaleString()}</span></div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-2xl text-xs shadow-md transition-all"
                >
                  Pay & Lock Escrow (₦{selectedMerchantItem.priceNGN.toLocaleString()})
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}