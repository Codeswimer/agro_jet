import React, { useState, useEffect, useRef } from 'react';

// BMONI Enterprise Service Adapter (Production / Sandbox bridge)
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
        email: payload.email || 'farmer@agritech.bmoni.com',
        tier: 'TIER_2_VERIFIED',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('bmoni_user_id', userId);
      localStorage.setItem('bmoni_user_profile', JSON.stringify(userObj));
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
      const txRef = 'tx_bmoni_' + Math.random().toString(36).substring(2, 10);
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
    localStorage.setItem('bmoni_kyc_data_' + userId, JSON.stringify(kycData));
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
  const [activeTab, setActiveTab] = useState('corporatebuyers');
  const [userId, setUserId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Live Console Logs Stream
  const [consoleLogs, setConsoleLogs] = useState([
    { id: 1, type: 'INFO', time: new Date().toLocaleTimeString(), message: 'System initialized. BmoniService Adapter active in Sandbox Mode.' },
    { id: 2, type: 'SUCCESS', time: new Date().toLocaleTimeString(), message: 'Mintlify index & OpenAPI definitions cached successfully.' }
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
  const [paymentRail, setPaymentRail] = useState('cngn'); // 'cngn', 'bank_transfer', 'usdb', 'card'
  const [paymentSuccessCallback, setPaymentSuccessCallback] = useState(null);

  // Mintlify docs state
  const [docContent, setDocContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([
    { role: 'assistant', text: 'Hello! I am your BMONI Embedded AI Assistant powered by BmoniService. How can I assist you with corporate off-takes, escrow rails, or BVN verification today?' }
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
  const [inputCategoryFilter, setInputCategoryFilter] = useState('All');
  const [inputSearchQuery, setInputSearchQuery] = useState('');
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

  // Sandbox Onboarding Persona State
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
      const uid = localStorage.getItem('bmoni_user_id');
      if (uid) setUserId(uid);
      const profile = localStorage.getItem('bmoni_user_profile');
      if (profile) setUserProfile(JSON.parse(profile));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMintlifyDocs = async () => {
    setDocLoading(true);
    try {
      const response = await fetch('https://bkey.mintlify.site/llms.txt').catch(() => null);
      if (response && response.ok) {
        const text = await response.text();
        setDocContent(text);
        addLog('INFO', '[Mintlify Index] Fetched live llms.txt index from bkey.mintlify.site');
      } else {
        throw new Error('CORS or offline fallback');
      }
    } catch (err) {
      setDocContent(`# BMONI Embedded Documentation Index (Cached / Sandbox Mode)

> Base URL: https://api.bmoni.com/docs
> SDK Version: @bmoni/embedded-sdk v2.4.0

## Core Modules & API Services
1. BmoniService.createUser(payload) - Initializes high-volume agritech user sessions
2. BmoniService.bvnLookup(bvn) - Instant 11-digit NIBSS identity verification
3. BmoniService.submitKyc(userId, data) - Tiered KYC submission & business verification
4. BmoniService.createEscrow(params) - Multi-currency (cNGN, USDB, NGN) smart escrow contract locking
5. BmoniService.initializePayment(params) - BMONI payment gateway initialization for instant checkout rails
6. Corporate Offtake Rail - FMCG factory raw material sourcing contracts with bank-grade guarantees`);
      addLog('INFO', '[Mintlify Index] Loaded robust cached documentation index.');
    } finally {
      setDocLoading(false);
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
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `You are the BMONI Embedded Agritech Assistant. Reference these docs:\n${docContent}\n\nUser Question: ${userText}` }] }]
        })
      });
      const result = await response.json();
      const answer = result?.candidates?.[0]?.content?.parts?.[0]?.text || "BMONI provides multi-currency smart escrow settlement for agricultural off-take contracts. BVNs are verified instantly via NIBSS rails.";
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: answer }]);
      addLog('API_CALL', `[AI Assistant] Responded to query: "${userText.substring(0, 30)}..."`);
    } catch (err) {
      let fallbackText = "For BVN verification, provide an 11-digit BVN (e.g., 95888168924). For Escrow, select any produce item in the Harvest Marketplace to lock funds into cNGN or USDB smart contracts.";
      setAiChatHistory(prev => [...prev, { role: 'assistant', text: fallbackText }]);
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
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
      addLog('API_CALL', `[BMONI Payment] Initialized payment session ${initRes.txRef} for ${currency} ${amount.toLocaleString()}`);
    } catch (e) {
      addLog('WARN', '[BMONI Payment] Failed to initialize payment gateway gateway session');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmBmoniPayment = () => {
    if (!paymentInitData) return;

    const amt = paymentInitData.amount;
    const curr = paymentInitData.currency;

    if (paymentRail === 'cngn' || curr === 'cNGN') {
      if (cngnBalance < amt) {
        setCngnBalance(prev => prev + amt * 2);
      }
      setCngnBalance(prev => Math.max(0, prev - amt));
    } else if (paymentRail === 'usdb' || curr === 'USDB' || curr === 'USD') {
      if (usdBalance < amt) {
        setUsdBalance(prev => prev + amt * 2);
      }
      setUsdBalance(prev => Math.max(0, prev - amt));
    } else {
      if (ngnBalance < amt) {
        setNgnBalance(prev => prev + amt * 2);
      }
      setNgnBalance(prev => Math.max(0, prev - amt));
    }

    addLog('SUCCESS', `[BMONI Payment Gateway] Transaction ${paymentInitData.txRef} successfully completed via ${paymentRail.toUpperCase()}`);
    
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

  const handleApplyForOfftake = (buyer) => {
    setSelectedBuyerForProposal(buyer);
    setProposalSubmittedSuccess('');
  };

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
            seller: 'You (Offtake Supplier)',
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
        }, 2500);
      } catch (err) {
        addLog('WARN', `[Offtake Proposal Error] ${err.message || 'Failed to submit proposal'}`);
      }
    });
  };

  const handleJoinImportPool = (pool) => {
    setSelectedPoolForJoin(pool);
    setPoolUnitsToOrder(1);
    setPoolSuccessMsg('');
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
      setPoolSuccessMsg(`Successfully joined import pool! Funds ($${totalCostUSD.toLocaleString()} USD) are safely locked in BMONI Group Import Escrow.`);

      setTimeout(() => {
        setSelectedPoolForJoin(null);
        setPoolUnitsToOrder(1);
        setPoolSuccessMsg('');
      }, 2800);
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
      }, 2500);
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
          buyer: 'You (Active User)',
          quantity: `${qty} ${selectedProduceForEscrow.unit}`,
          totalAmount,
          currency: escrowCurrency,
          status: 'LOCKED_IN_ESCROW',
          stage: 2,
          date: new Date().toISOString().split('T')[0],
          qualitySpecs: selectedProduceForEscrow.specs.join(', ')
        };

        setActiveEscrowContracts(prev => [newContract, ...prev]);
        addLog('SUCCESS', `[Smart Escrow ${res.contractId}] Locked ${escrowCurrency} ${totalAmount.toLocaleString()} for ${qty} ${selectedProduceForEscrow.unit} of ${selectedProduceForEscrow.crop}`);
        setEscrowSuccessMsg(`Smart Escrow contract ${res.contractId} created & funds locked in BMONI Ledger!`);

        setTimeout(() => {
          setSelectedProduceForEscrow(null);
          setEscrowSuccessMsg('');
        }, 2500);
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

  const handleCreateUserSandbox = async () => {
    try {
      const user = await BmoniServiceAdapter.createUser({
        firstName: kycProfile.firstName,
        lastName: kycProfile.lastName,
        email: kycProfile.email,
        phone: kycProfile.phoneNumber
      });
      setUserId(user.userId);
      setUserProfile(user);
      setKycProfile(prev => ({ ...prev, step: 2 }));
      addLog('SUCCESS', `[User Management] Created BMONI user account: ${user.userId}`);
    } catch (err) {
      addLog('WARN', `[User Creation Error] ${err.message}`);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800">
      
      {/* Header */}
      <header className="bg-emerald-900 text-white px-4 sm:px-6 py-4 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-md gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs tracking-wider shadow-sm shrink-0">
            BMONI Enterprise SDK v2.4
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-snug tracking-wide">
              Agritech BMONI Platform — Modular Service Adapter & Payment Integration
            </h1>
            <p className="text-xs text-emerald-200">
              Active Adapter: <code className="bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 font-mono">BmoniServiceAdapter</code> (Sandbox Bridge)
            </p>
          </div>
        </div>

        {/* Balance Drawer & User Identity */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end border-t border-emerald-800 lg:border-t-0 pt-3 lg:pt-0">
          <div className="bg-emerald-800/80 border border-emerald-700/80 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap flex items-center gap-3">
            <span>NGN: <strong className="text-emerald-300">₦{ngnBalance.toLocaleString()}</strong></span>
            <span className="text-emerald-600">|</span>
            <span>cNGN: <strong className="text-emerald-300">₦{cngnBalance.toLocaleString()}</strong></span>
            <span className="text-emerald-600">|</span>
            <span>USD: <strong className="text-emerald-300">${usdBalance.toLocaleString()}</strong></span>
          </div>

          <button
            onClick={() => {
              setNgnBalance(prev => prev + 500000);
              setCngnBalance(prev => prev + 100000);
              setUsdBalance(prev => prev + 500);
              addLog('INFO', '[Sandbox Wallet] Added top-up funds to all currency accounts.');
            }}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-600 transition-colors"
          >
            + Top Up Wallet
          </button>

          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border whitespace-nowrap ${userId ? 'bg-emerald-100 text-emerald-800 border-emerald-700' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
            {userId ? `User: ${userId}` : 'Session: Guest'}
          </span>

        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 flex space-x-1 sm:space-x-4 overflow-x-auto whitespace-nowrap scrollbar-thin">
        {[
          { id: 'corporatebuyers', label: '🏭 Factory Buyer Offtake' },
          { id: 'inputmerchants', label: '🌱 Inputs & Group Import' },
          { id: 'marketplace', label: '🌾 Harvest Produce & Escrow' },
          { id: 'escrowledger', label: '🛡️ Active Escrow Contracts' },
          { id: 'aiassistant', label: '🤖 Built-in AI Assistant' },
          { id: 'personas', label: '👥 Onboarding & BVN Sandbox' },
          { id: 'docsindex', label: '📖 Mintlify llms.txt Index' },
          { id: 'aiconfig', label: '⚙️ API & Payment Gateway Terminal' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-3 text-xs sm:text-sm font-medium border-b-2 shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Body Grid */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* TAB 1: CORPORATE BUYER OFFTAKE */}
          {activeTab === 'corporatebuyers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span>🏭 Corporate Buyer Offtake & Supply Match</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Connect verified agricultural cooperatives directly with FMCG processors backed by BMONI Escrow & Payment rails.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Search buyers or raw materials..."
                    value={buyerSearchQuery}
                    onChange={(e) => setBuyerSearchQuery(e.target.value)}
                    className="text-xs px-3 py-2 border rounded-lg w-full md:w-48 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 placeholder-gray-400"
                  />
                  <select
                    value={selectedCropCategory}
                    onChange={(e) => setSelectedCropCategory(e.target.value)}
                    className="text-xs px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900"
                  >
                    <option value="All">All Categories</option>
                    <option value="Maize">Maize</option>
                    <option value="Cassava">Cassava</option>
                    <option value="Soybeans">Soybeans</option>
                    <option value="Sesame">Sesame</option>
                  </select>
                </div>
              </div>

              {selectedBuyerForProposal && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">
                        Active Offtake Binding
                      </span>
                      <h3 className="text-sm font-bold text-emerald-900 mt-1">
                        Supply Offer for {selectedBuyerForProposal.companyName}
                      </h3>
                      <p className="text-xs text-emerald-700">
                        Needed: {selectedBuyerForProposal.rawMaterialNeeded} | Offer Price: <strong className="text-emerald-900">{selectedBuyerForProposal.offerPrice}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedBuyerForProposal(null)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  {proposalSubmittedSuccess ? (
                    <div className="bg-white border border-emerald-300 p-4 rounded-lg text-center space-y-2">
                      <div className="text-emerald-600 font-bold text-sm">🎉 Supply Proposal & BMONI Escrow Initialized!</div>
                      <p className="text-xs text-gray-600">{proposalSubmittedSuccess}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitSupplyProposal} className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-emerald-900 block mb-1">
                          Your Tonnage Offer (Metric Tons - MT)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 50"
                          value={farmerTonnageOffer}
                          onChange={(e) => setFarmerTonnageOffer(e.target.value)}
                          className="w-full text-sm p-2.5 border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white text-gray-900 placeholder-gray-400"
                        />
                      </div>
                      {farmerTonnageOffer && !isNaN(farmerTonnageOffer) && (
                        <div className="text-xs bg-white p-3 rounded border border-emerald-200 text-emerald-900 flex justify-between items-center">
                          <span>Computed Contract Gross Value:</span>
                          <strong className="text-sm font-mono text-emerald-700">
                            ₦{(parseFloat(farmerTonnageOffer) * selectedBuyerForProposal.unitPriceNumeric).toLocaleString()} NGN
                          </strong>
                        </div>
                      )}
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🔒 Pay & Lock Escrow via BMONI Gateway</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCorporateBuyers.map(buyer => (
                  <div key={buyer.id} className="border border-gray-200 rounded-xl p-4 hover:border-emerald-500 transition-colors flex flex-col justify-between space-y-3 bg-white">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">
                          {buyer.industry}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {buyer.offerPrice}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{buyer.companyName}</h3>
                      <p className="text-xs text-gray-600 font-medium">
                        🌾 <span className="text-emerald-800">{buyer.rawMaterialNeeded}</span>
                      </p>
                      <p className="text-xs text-gray-500">📍 {buyer.location}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {buyer.qualitySpecs.map((spec, i) => (
                          <span key={i} className="text-[10px] bg-gray-50 border text-gray-600 px-1.5 py-0.5 rounded">
                            ✓ {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Escrow Guarantee:</span>
                        <span className="font-semibold text-emerald-700">{buyer.escrowDepositLocked}</span>
                      </div>
                      <button
                        onClick={() => handleApplyForOfftake(buyer)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-3 py-1.5 rounded-lg text-xs shadow-sm transition-colors"
                      >
                        Submit Supply Offer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: INPUTS & GROUP IMPORT POOL */}
          {activeTab === 'inputmerchants' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-950">🌱 Agri-Inputs Marketplace & Group Import Pools</h2>
                  <p className="text-xs text-gray-500">Co-op bulk purchasing for heavy machinery, irrigation kits, and certified seeds with BMONI escrow protection.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setInputSubTab('importpools')}
                    className={`px-3 py-1.5 rounded-md transition-all ${inputSubTab === 'importpools' ? 'bg-white text-emerald-900 shadow-sm font-bold' : 'text-gray-600'}`}
                  >
                    Global Import Pools ({importPools.length})
                  </button>
                  <button
                    onClick={() => setInputSubTab('merchants')}
                    className={`px-3 py-1.5 rounded-md transition-all ${inputSubTab === 'merchants' ? 'bg-white text-emerald-900 shadow-sm font-bold' : 'text-gray-600'}`}
                  >
                    Local Agri-Inputs ({MOCK_AGRI_INPUTS.length})
                  </button>
                </div>
              </div>

              {inputSubTab === 'importpools' && (
                <div className="space-y-4">
                  {selectedPoolForJoin && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Group Import Pool Escrow</span>
                          <h3 className="text-sm font-bold text-emerald-950 mt-1">{selectedPoolForJoin.title}</h3>
                          <p className="text-xs text-emerald-800">Origin: {selectedPoolForJoin.origin} | Unit Price: <strong className="font-mono text-emerald-950">${selectedPoolForJoin.priceUSD.toLocaleString()} USD</strong></p>
                        </div>
                        <button onClick={() => setSelectedPoolForJoin(null)} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold">✕ Cancel</button>
                      </div>

                      {poolSuccessMsg ? (
                        <div className="bg-white border border-emerald-300 p-3 rounded-lg text-center text-xs text-emerald-900 font-semibold">{poolSuccessMsg}</div>
                      ) : (
                        <form onSubmit={handleConfirmPoolParticipation} className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-emerald-900 block mb-1">Number of Units to Reserve</label>
                            <input
                              type="number"
                              min="1"
                              max={selectedPoolForJoin.targetUnits - selectedPoolForJoin.reservedUnits}
                              value={poolUnitsToOrder}
                              onChange={(e) => setPoolUnitsToOrder(e.target.value)}
                              className="w-full text-sm p-2.5 border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white text-gray-900"
                            />
                          </div>
                          <div className="text-xs bg-white p-3 rounded border border-emerald-200 text-emerald-950 flex justify-between items-center">
                            <span>Total USD Deposit Required:</span>
                            <strong className="text-sm font-mono text-emerald-800">${(selectedPoolForJoin.priceUSD * poolUnitsToOrder).toLocaleString()} USD</strong>
                          </div>
                          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs shadow-sm">
                            🔒 Pay & Join Pool via BMONI Gateway
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {importPools.map(pool => {
                      const percent = Math.round((pool.reservedUnits / pool.targetUnits) * 100);
                      return (
                        <div key={pool.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-4 bg-white">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-medium px-2 py-0.5 rounded border border-emerald-200">{pool.category}</span>
                              <span className="text-xs font-bold text-gray-900 font-mono">${pool.priceUSD.toLocaleString()} USD</span>
                            </div>
                            <h3 className="text-sm font-bold text-gray-950">{pool.title}</h3>
                            <p className="text-xs text-gray-600">{pool.description}</p>
                            <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded">{pool.groupSavings}</div>
                            
                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Pool Progress: {pool.reservedUnits}/{pool.targetUnits} units</span>
                                <span className="font-semibold text-emerald-800">{percent}%</span>
                              </div>
                              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          </div>

                          <div className="border-t pt-3 flex justify-between items-center">
                            <span className="text-[11px] text-gray-500">Est. Delivery: {pool.estimatedDays} days</span>
                            <button
                              onClick={() => handleJoinImportPool(pool)}
                              className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-3 py-1.5 rounded-lg text-xs"
                            >
                              Join Pool
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {inputSubTab === 'merchants' && (
                <div className="space-y-4">
                  {selectedMerchantItem && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Merchant Escrow Checkout</span>
                          <h3 className="text-sm font-bold text-emerald-950 mt-1">{selectedMerchantItem.name}</h3>
                          <p className="text-xs text-emerald-800">Merchant: {selectedMerchantItem.merchant} | Price: <strong className="font-mono text-emerald-950">₦{selectedMerchantItem.priceNGN.toLocaleString()} NGN</strong></p>
                        </div>
                        <button onClick={() => setSelectedMerchantItem(null)} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold">✕ Cancel</button>
                      </div>

                      {merchantBuySuccessMsg ? (
                        <div className="bg-white border border-emerald-300 p-3 rounded-lg text-center text-xs text-emerald-900 font-semibold">{merchantBuySuccessMsg}</div>
                      ) : (
                        <form onSubmit={handleBuyMerchantInput} className="space-y-3">
                          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs shadow-sm">
                            🔒 Pay ₦{selectedMerchantItem.priceNGN.toLocaleString()} via BMONI Gateway
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MOCK_AGRI_INPUTS.map(inp => (
                      <div key={inp.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-white">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">{inp.category}</span>
                            <span className="text-xs font-bold text-emerald-700 font-mono">₦{inp.priceNGN.toLocaleString()}</span>
                          </div>
                          <h3 className="text-sm font-bold text-gray-950">{inp.name}</h3>
                          <p className="text-xs text-gray-600 font-medium">Merchant: <span className="text-emerald-800">{inp.merchant}</span></p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {inp.specs.map((s, idx) => (
                              <span key={idx} className="text-[10px] bg-gray-50 border text-gray-600 px-1.5 py-0.5 rounded">✓ {s}</span>
                            ))}
                          </div>
                        </div>

                        <div className="border-t pt-3 flex justify-between items-center text-xs">
                          <span className="text-gray-500">In Stock: <strong className="text-gray-800">{inp.stock}</strong></span>
                          <button
                            onClick={() => setSelectedMerchantItem(inp)}
                            className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-3 py-1.5 rounded-lg text-xs"
                          >
                            Buy with Escrow
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HARVEST PRODUCE & ESCROW */}
          {activeTab === 'marketplace' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-950">🌾 Verified Harvest Produce & Smart Escrow Settlement</h2>
                <p className="text-xs text-gray-500">Lock cNGN or USDB smart escrow for harvested agricultural produce with stage-gate verification.</p>
              </div>

              {selectedProduceForEscrow && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Smart Escrow Contract Builder</span>
                      <h3 className="text-sm font-bold text-emerald-950 mt-1">{selectedProduceForEscrow.crop}</h3>
                      <p className="text-xs text-emerald-800">Seller: {selectedProduceForEscrow.seller} | Unit Price: <strong className="font-mono text-emerald-950">₦{selectedProduceForEscrow.priceNGN.toLocaleString()} / {selectedProduceForEscrow.unit}</strong></p>
                    </div>
                    <button onClick={() => setSelectedProduceForEscrow(null)} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold">✕ Cancel</button>
                  </div>

                  {escrowSuccessMsg ? (
                    <div className="bg-white border border-emerald-300 p-3 rounded-lg text-center text-xs text-emerald-900 font-semibold">{escrowSuccessMsg}</div>
                  ) : (
                    <form onSubmit={handleExecuteHarvestEscrow} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-emerald-900 block mb-1">Quantity ({selectedProduceForEscrow.unit})</label>
                          <input
                            type="number"
                            min="1"
                            max={selectedProduceForEscrow.volumeAvailable}
                            value={escrowQuantity}
                            onChange={(e) => setEscrowQuantity(e.target.value)}
                            className="w-full text-sm p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-emerald-900 block mb-1">Escrow Rail</label>
                          <select
                            value={escrowCurrency}
                            onChange={(e) => setEscrowCurrency(e.target.value)}
                            className="w-full text-sm p-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900"
                          >
                            <option value="cNGN">cNGN (Stablecoin)</option>
                            <option value="USDB">USDB (Foreign USD)</option>
                          </select>
                        </div>
                      </div>

                      <div className="text-xs bg-white p-3 rounded border border-emerald-200 text-emerald-950 flex justify-between items-center">
                        <span>Total Escrow Lock Amount:</span>
                        <strong className="text-sm font-mono text-emerald-800">
                          {escrowCurrency === 'cNGN' ? `₦${(escrowQuantity * selectedProduceForEscrow.priceNGN).toLocaleString()} cNGN` : `$${Math.round((escrowQuantity * selectedProduceForEscrow.priceNGN) / 1500).toLocaleString()} USDB`}
                        </strong>
                      </div>

                      <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-xs shadow-sm">
                        🔒 Pay & Lock Funds in BMONI Escrow
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INITIAL_HARVEST_PRODUCE.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-white">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-medium px-2 py-0.5 rounded border border-emerald-200">Available: {item.volumeAvailable} {item.unit}</span>
                        <span className="text-xs font-bold text-emerald-700 font-mono">₦{item.priceNGN.toLocaleString()} / {item.unit}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-950">{item.crop}</h3>
                      <p className="text-xs text-gray-600">Farmer Co-op: <span className="font-medium text-emerald-900">{item.seller}</span></p>
                      <p className="text-xs text-gray-500">📍 {item.location}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.specs.map((s, idx) => (
                          <span key={idx} className="text-[10px] bg-gray-50 border text-gray-600 px-1.5 py-0.5 rounded">✓ {s}</span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-3 flex justify-between items-center text-xs">
                      <span className="text-emerald-700 font-semibold">★ {item.rating} Verified</span>
                      <button
                        onClick={() => setSelectedProduceForEscrow(item)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium px-3 py-1.5 rounded-lg text-xs"
                      >
                        Create Escrow Contract
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE ESCROW CONTRACTS LEDGER */}
          {activeTab === 'escrowledger' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-950">🛡️ Active Escrow Contracts Ledger</h2>
                <p className="text-xs text-gray-500">Track stage-gate releases, quality inspections, and milestone disbursement for all active commodity contracts.</p>
              </div>

              <div className="space-y-4">
                {activeEscrowContracts.map(contract => (
                  <div key={contract.id} className="border border-gray-200 rounded-xl p-5 space-y-4 bg-white shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{contract.id}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded">{contract.status}</span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-950 mt-1">{contract.crop} ({contract.quantity})</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">Total Value:</span>
                        <strong className="text-sm font-mono text-emerald-900">{contract.currency} {contract.totalAmount.toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <div><strong className="text-gray-800 block">Seller:</strong> {contract.seller}</div>
                      <div><strong className="text-gray-800 block">Buyer:</strong> {contract.buyer}</div>
                      <div><strong className="text-gray-800 block">Quality Spec:</strong> {contract.qualitySpecs}</div>
                    </div>

                    {/* Stage Tracker */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-gray-600">
                        <span>Stage 1: Contract Initialized</span>
                        <span>Stage 2: Funds Locked</span>
                        <span>Stage 3: In Transit</span>
                        <span>Stage 4: Released</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
                        <div className={`h-full transition-all ${contract.stage >= 1 ? 'bg-emerald-600' : 'bg-gray-300'}`} style={{ width: '25%' }}></div>
                        <div className={`h-full transition-all ${contract.stage >= 2 ? 'bg-emerald-600' : 'bg-gray-300'}`} style={{ width: '25%' }}></div>
                        <div className={`h-full transition-all ${contract.stage >= 3 ? 'bg-emerald-600' : 'bg-gray-300'}`} style={{ width: '25%' }}></div>
                        <div className={`h-full transition-all ${contract.stage >= 4 ? 'bg-emerald-600' : 'bg-gray-300'}`} style={{ width: '25%' }}></div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-gray-500">Date: {contract.date}</span>
                      {contract.stage < 4 ? (
                        <button
                          onClick={() => handleReleaseEscrowFunds(contract.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-3 py-1.5 rounded-lg text-xs"
                        >
                          Verify Inspection & Release Funds
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-700 font-bold">✓ Funds Fully Settled to Seller</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AI ASSISTANT */}
          {activeTab === 'aiassistant' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[600px]">
              <div className="border-b pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-950">🤖 BMONI Embedded AI Agritech Assistant</h2>
                  <p className="text-xs text-gray-500">Ask questions about NIBSS BVN verification, smart escrow rails, and factory off-take contracts.</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-2">
                {aiChatHistory.map((chat, idx) => (
                  <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm ${chat.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200'}`}>
                      {chat.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-500 rounded-2xl px-4 py-3 text-xs animate-pulse">
                      Analyzing BMONI SDK documentation...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  "How does cNGN escrow locking work?",
                  "Explain NIBSS BVN verification integration",
                  "How do I join Group Import Pools?",
                  "What is the fee for factory off-take?"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setAiQuery(prompt)}
                    className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAiAsk} className="flex gap-2 pt-2 border-t">
                <input
                  type="text"
                  placeholder="Type question about BMONI API..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="flex-1 text-xs p-2.5 border rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white text-gray-900 placeholder-gray-400"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold">
                  Send
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: ONBOARDING & BVN SANDBOX */}
          {activeTab === 'personas' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-950">👥 Onboarding & NIBSS BVN Verification Sandbox</h2>
                <p className="text-xs text-gray-500">Test live KYC persona creation and instant 11-digit NIBSS BVN verification using BmoniServiceAdapter.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`border rounded-xl p-4 space-y-3 ${kycProfile.step === 1 ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Step 1</span>
                  <h3 className="text-sm font-bold text-gray-950">Initialize User</h3>
                  <div className="space-y-2 text-xs">
                    <input type="text" value={kycProfile.firstName} onChange={(e) => setKycProfile({...kycProfile, firstName: e.target.value})} placeholder="First Name" className="w-full text-xs p-2 border rounded bg-white text-gray-900 placeholder-gray-400" />
                    <input type="text" value={kycProfile.lastName} onChange={(e) => setKycProfile({...kycProfile, lastName: e.target.value})} placeholder="Last Name" className="w-full text-xs p-2 border rounded bg-white text-gray-900 placeholder-gray-400" />
                    <input type="email" value={kycProfile.email} onChange={(e) => setKycProfile({...kycProfile, email: e.target.value})} placeholder="Email" className="w-full text-xs p-2 border rounded bg-white text-gray-900 placeholder-gray-400" />
                    <button onClick={handleCreateUserSandbox} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-semibold">
                      Create BMONI User
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl p-4 space-y-3 ${kycProfile.step === 2 ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Step 2</span>
                  <h3 className="text-sm font-bold text-gray-950">NIBSS BVN Lookup</h3>
                  <div className="space-y-2 text-xs">
                    <p className="text-gray-500">Test BVN: <strong className="text-emerald-800">95888168924</strong></p>
                    <input type="text" maxLength="11" value={kycProfile.bvn} onChange={(e) => setKycProfile({...kycProfile, bvn: e.target.value})} placeholder="11-digit BVN" className="w-full text-xs p-2 border rounded bg-white text-gray-900 placeholder-gray-400 font-mono" />
                    <button onClick={() => handlePerformBvnLookup()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-semibold">
                      Verify BVN
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl p-4 space-y-3 ${kycProfile.step === 3 ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">Step 3</span>
                  <h3 className="text-sm font-bold text-gray-950">Verification Status</h3>
                  {kycProfile.bvnResult ? (
                    <div className="space-y-1 text-xs bg-white p-3 rounded border text-gray-800">
                      <div><strong className="text-emerald-800">Name:</strong> {kycProfile.bvnResult.firstName} {kycProfile.bvnResult.lastName}</div>
                      <div><strong className="text-emerald-800">Status:</strong> {kycProfile.bvnResult.verificationStatus}</div>
                      <div><strong className="text-emerald-800">Confidence:</strong> {kycProfile.bvnResult.confidenceScore}</div>
                      <div><strong className="text-emerald-800">NIN:</strong> {kycProfile.bvnResult.nin}</div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Awaiting BVN lookup verification...</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MINTLIFY INDEX */}
          {activeTab === 'docsindex' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="border-b pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-950">📖 Mintlify llms.txt Documentation Index</h2>
                  <p className="text-xs text-gray-500">Live synchronized OpenAPI endpoints and SDK documentation index.</p>
                </div>
                <button
                  onClick={() => copyToClipboard(docContent, 'Docs')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1.5 rounded-lg border font-medium"
                >
                  {copiedNotification === 'Docs' ? '✓ Copied llms.txt' : 'Copy Index'}
                </button>
              </div>

              <div className="bg-gray-900 text-emerald-400 font-mono text-xs p-4 rounded-xl overflow-x-auto max-h-[500px]">
                <pre>{docContent}</pre>
              </div>
            </div>
          )}

          {/* TAB 8: API & PAYMENT GATEWAY TERMINAL */}
          {activeTab === 'aiconfig' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-base sm:text-lg font-bold text-gray-950">⚙️ BMONI API & Payment Gateway Terminal</h2>
                <p className="text-xs text-gray-500">Test payment gateway initialization, escrow contracts, and inspect live sandbox adapter logs.</p>
              </div>

              <form onSubmit={handleRunTerminalTest} className="bg-gray-50 border p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Test Payment Gateway Session</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Amount</label>
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Currency / Rail</label>
                    <select
                      value={testChannel}
                      onChange={(e) => setTestChannel(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-lg bg-white text-gray-900"
                    >
                      <option value="cNGN">cNGN Stablecoin</option>
                      <option value="NGN">NGN Bank Transfer</option>
                      <option value="USDB">USDB Foreign Currency</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm">
                  Initialize BMONI Checkout Session
                </button>

                {terminalResult && (
                  <div className="bg-white border p-3 rounded-lg text-xs font-mono text-gray-800 space-y-1">
                    <div><strong className="text-emerald-700">Ref:</strong> {terminalResult.txRef}</div>
                    <div><strong className="text-emerald-700">Checkout URL:</strong> {terminalResult.checkoutUrl}</div>
                    <div><strong className="text-emerald-700">Virtual Account:</strong> {terminalResult.accountNumber} ({terminalResult.bankName})</div>
                  </div>
                )}
              </form>
            </div>
          )}

        </div>

        {/* Right Sidebar: Live Console Logs Stream */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col h-[650px] shadow-sm font-mono text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
            <span className="font-bold flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              BMONI Live Console Stream
            </span>
            <button
              onClick={() => setConsoleLogs([])}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {consoleLogs.map((log) => (
              <div key={log.id} className="border-b border-slate-800/60 pb-2 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span className={`font-semibold ${log.type === 'SUCCESS' ? 'text-emerald-400' : log.type === 'WARN' ? 'text-amber-400' : 'text-blue-400'}`}>
                    [{log.type}]
                  </span>
                  <span>{log.time}</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed break-words">{log.message}</p>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

      </main>

      {/* BMONI UNIFIED PAYMENT GATEWAY MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-600 text-white font-bold p-2 rounded-lg text-xs">BMONI</div>
                <div>
                  <h3 className="text-base font-bold text-gray-950">Secure Payment Gateway</h3>
                  <p className="text-xs text-gray-500">Powered by BmoniServiceAdapter</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {paymentLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-gray-600">Initializing BMONI checkout session...</p>
              </div>
            ) : paymentInitData ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-1">
                  <span className="text-xs text-emerald-800 uppercase tracking-wider font-bold">Total Amount Due</span>
                  <div className="text-2xl font-black font-mono text-emerald-950">
                    {paymentInitData.currency} {paymentInitData.amount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-emerald-700 block font-mono">Ref: {paymentInitData.txRef}</span>
                </div>

                {/* Payment Rail Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">Select Payment Rail</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'cngn', label: '🪙 cNGN Stablecoin', desc: 'Instant blockchain' },
                      { id: 'bank_transfer', label: '🏦 Bank Transfer', desc: 'NIBSS Virtual Acc' },
                      { id: 'usdb', label: '💵 USDB Foreign', desc: 'USD Dollar Rail' },
                      { id: 'card', label: '💳 Debit / Credit Card', desc: 'Visa / Mastercard' }
                    ].map(rail => (
                      <button
                        key={rail.id}
                        type="button"
                        onClick={() => setPaymentRail(rail.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${paymentRail === rail.id ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="text-xs font-bold text-gray-900">{rail.label}</div>
                        <div className="text-[10px] text-gray-500">{rail.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentRail === 'bank_transfer' && (
                  <div className="bg-gray-50 border p-3 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank Name:</span>
                      <strong className="text-gray-900">{paymentInitData.bankName}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Account Number:</span>
                      <div className="flex items-center gap-2">
                        <strong className="font-mono text-emerald-800">{paymentInitData.accountNumber}</strong>
                        <button
                          onClick={() => copyToClipboard(paymentInitData.accountNumber, 'Account')}
                          className="text-[10px] bg-white border px-2 py-0.5 rounded text-gray-700 font-semibold"
                        >
                          {copiedNotification === 'Account' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmBmoniPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm shadow-md transition-colors"
                >
                  Confirm & Authorize Payment
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}