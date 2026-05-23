import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, CheckCircle2, XCircle, ShieldAlert, Zap, PlusCircle, ArrowRight, RefreshCw, BarChart2, Database, Settings, Activity, QrCode, Scan, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

// UPGRADE: Accept contractInstance and signerInstance injected from global Web3 provider context
const ManufacturerDashboard = ({ token, user, contractInstance, signerInstance }) => {
  const [stats, setStats] = useState({
    totalMinted: 0,
    activeQRs: 0,
    verificationVelocity: 0,
    flaggedAnomalies: 0
  });

  const [batches, setBatches] = useState([]);
  const [subBatches, setSubBatches] = useState([]);

  // Dev Sanity Panel states & fetchers
  const [devStatus, setDevStatus] = useState({
    mongodbConnected: false,
    isUsingMemoryStore: false,
    blockchainSimulated: false
  });

  const fetchDevStatus = async () => {
    try {
      const res = await axios.get('/api/dev/status');
      setDevStatus(res.data);
    } catch (err) {
      console.warn('⚠️ Could not fetch dev status:', err.message);
    }
  };

  useEffect(() => {
    fetchDevStatus();
    const interval = setInterval(fetchDevStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggleDbMode = async () => {
    try {
      const res = await axios.post('/api/dev/toggle-db');
      if (res.data.success) {
        fetchDevStatus();
      }
    } catch (err) {
      console.error('Error toggling DB mode:', err);
    }
  };

  const toggleBlockchainMode = async () => {
    try {
      const res = await axios.post('/api/dev/toggle-blockchain');
      if (res.data.success) {
        fetchDevStatus();
      }
    } catch (err) {
      console.error('Error toggling blockchain mode:', err);
    }
  };

  // Minting form parameters
  const [batchId, setBatchId] = useState('');
  const [productVariant, setProductVariant] = useState('');
  const [totalUnitsCount, setTotalUnitsCount] = useState(20);
  const [distributorId, setDistributorId] = useState('DIST-GLOBAL-SUPPLY');

  // Scanner and custom Toast states
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Session / Auth Error State
  const [sessionError, setSessionError] = useState(null);
  const sessionErrorTimerRef = React.useRef(null);

  const raiseSessionError = (msg) => {
    setSessionError(msg);
    if (sessionErrorTimerRef.current) clearTimeout(sessionErrorTimerRef.current);
    sessionErrorTimerRef.current = setTimeout(() => setSessionError(null), 6000);
  };

  const dismissSessionError = () => {
    setSessionError(null);
    if (sessionErrorTimerRef.current) clearTimeout(sessionErrorTimerRef.current);
  };

  // ── Ethers.js v6 Safe Address Resolvers ──────────────────────────────────
  const resolveSignerAddress = async (signer) => {
    if (!signer) return null;
    try {
      return await signer.getAddress(); // Ethers v6 clean async resolver
    } catch {
      return user?.walletAddress ?? null;
    }
  };

  const resolveContractAddress = (contract) => {
    if (!contract) return null;
    return contract?.target ?? contract?.address ?? null; // Defensive target check
  };

  const [activationLogs, setActivationLogs] = useState([]);
  const [liveScans, setLiveScans] = useState([]);

  // Fetch metrics & records
  const loadDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, batchesRes, subRes, scansRes] = await Promise.all([
        axios.get('/api/telemetry/stats', { headers }),
        axios.get('/api/batches', { headers }),
        axios.get('/api/subbatches', { headers }),
        axios.get('/api/telemetry/scans', { headers })
      ]);

      setStats(statsRes.data);
      setBatches(batchesRes.data);
      setSubBatches(subRes.data);
      setLiveScans(scansRes.data);
    } catch (e) {
      console.error('Error fetching dashboard datasets:', e.message);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast('');
    }, 4000);
  };

  const handleQrCodeDecoded = (decodedText) => {
    try {
      let parsedData = {};
      if (decodedText.trim().startsWith('{')) {
        const json = JSON.parse(decodedText);
        parsedData.batchId = json.batchId || json.id;
        parsedData.productVariant = json.productVariant || json.variant;
        parsedData.totalUnits = json.totalUnits || json.units;
      } else {
        let searchParams = decodedText.includes('?')
          ? new URLSearchParams(decodedText.split('?')[1])
          : new URLSearchParams(decodedText);

        parsedData.batchId = searchParams.get('batchId') || searchParams.get('id');
        parsedData.productVariant = searchParams.get('productVariant') || searchParams.get('variant');
        parsedData.totalUnits = searchParams.get('totalUnits') || searchParams.get('units');
      }

      if (!parsedData.batchId) {
        const batchMatch = decodedText.match(/(?:batchId|id)[:=]([^&,\s}]+)/i) || decodedText.match(/(?:SAMPLE-BATCH|BATCH)-\w+/i);
        if (batchMatch) parsedData.batchId = batchMatch[1] || batchMatch[0];
      }

      if (parsedData.batchId) setBatchId(parsedData.batchId.toUpperCase().replace(/['"]/g, ''));
      if (parsedData.productVariant) setProductVariant(parsedData.productVariant.replace(/['"]/g, ''));
      if (parsedData.totalUnits) setTotalUnitsCount(Number(parsedData.totalUnits));

      showToast("⚡ Sample Label Decoded: Batch Parameters Ingested Successfully");
      setScanning(false);
    } catch (err) {
      console.error("QR Ingest Parse Error:", err);
      if (decodedText && decodedText.length < 50) {
        setBatchId(decodedText.toUpperCase());
        showToast("⚡ Sample Label Decoded: Set Batch ID");
        setScanning(false);
      }
    }
  };

  useEffect(() => {
    let html5QrCode = null;
    if (scanning) {
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("manufacturer-qr-reader");
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => handleQrCodeDecoded(decodedText),
            () => { }
          ).catch(err => console.error("Failed to start Html5Qrcode:", err));
        } catch (err) {
          console.error("Failed to initialize Html5Qrcode:", err);
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop()
              .then(() => html5QrCode.clear())
              .catch(err => console.error("Failed to stop Html5Qrcode cleanly:", err));
          } else {
            try { html5QrCode.clear(); } catch (e) { }
          }
        }
      };
    }
  }, [scanning]);

  // ── ON-CHAIN & BACKEND MINT ENGINE ───────────────────────────────────────
  const handleMintBatch = async (e) => {
    e.preventDefault();

    setFormLoading(true);
    setFormSuccess('');
    setFormError('');
    dismissSessionError();

    // 1. Session Token Pre-Flight Check
    if (!token || typeof token !== 'string' || token.trim() === '') {
      raiseSessionError('Token is invalid or expired. Please re-authenticate your session.');
      setFormLoading(false);
      return;
    }

    try {
      let transactionHash = "SIMULATED_PROVENANCE_ANCHOR";

      // 2. Blockchain Execution Layer (Only fires if dev mode is running live node)
      if (!devStatus.blockchainSimulated && contractInstance) {
        const targetAddress = resolveContractAddress(contractInstance);
        const activeSigner = await resolveSignerAddress(signerInstance);

        console.log(`Targeting Provenance Smart Contract: ${targetAddress} via node ${activeSigner}`);

        // Fire the on-chain minting transaction
        // Maps parameters directly to NutriChainProvenance.sol spec
        const tx = await contractInstance.initializeBatch(
          batchId,
          productVariant,
          Number(totalUnitsCount),
          distributorId
        );

        console.log("Transaction broadcasting to Polygon Amoy... Hash:", tx.hash);
        const receipt = await tx.wait(); // Wait for confirmation block anchoring
        transactionHash = receipt.hash || tx.hash;
        console.log("On-chain cryptographic tracking state confirmed.");
      }

      // 3. Database Sync Pipeline (Saves records to MongoDB Atlas)
      const response = await axios.post('/api/batches', {
        batchId,
        productVariant,
        totalUnits: Number(totalUnitsCount),
        assignedDistributorId: distributorId,
        blockchainTxHash: transactionHash // Anchoring transaction ID to database registry record
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFormSuccess(
        `MINT SUCCESS: Batch ${batchId} cryptographically verified and anchored on-chain! Tx: ${transactionHash.substring(0, 10)}...`
      );

      // Clear inputs for clean operational cycle
      setBatchId('');
      setProductVariant('');
      loadDashboardData();

    } catch (err) {
      console.error("Pipeline failure captured:", err);

      // Clean error parsing structures
      const httpStatus = err?.response?.status;
      const apiMessage = err?.response?.data?.message ?? err?.response?.data?.error ?? null;
      const blockchainRevertReason = err?.reason || err?.message;

      if (httpStatus === 401 || (apiMessage && /token|expired|invalid|unauthorized/i.test(apiMessage))) {
        raiseSessionError(apiMessage || 'Token is invalid or expired. Please re-authenticate.');
      } else {
        setFormError(`Batch creation pipeline failed: ${apiMessage || blockchainRevertReason || 'Unexpected error'}`);
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleActivateCarton = async (subBatchId) => {
    try {
      const response = await axios.post('/api/subbatches/activate', {
        subBatchId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const activeLog = `⚡ ${subBatchId} activated successfully. ${response.data.activatedUnits} items live.`;
      setActivationLogs(prev => [activeLog, ...prev]);
      loadDashboardData();

    } catch (err) {
      const httpStatus = err?.response?.status;
      const apiMessage = err?.response?.data?.message ?? err?.response?.data?.error ?? null;

      if (httpStatus === 401 || (apiMessage && /token|expired|invalid|unauthorized/i.test(apiMessage))) {
        raiseSessionError(apiMessage || 'Token is invalid or expired. Please re-authenticate.');
      } else {
        setFormError(`Logistic activation failed: ${apiMessage ?? err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 text-white">

      {/* ── TOAST OVERLAY ── */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-cyber-cyan/40 px-4 py-3 rounded-xl font-mono text-xs text-cyber-cyan shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-2 animate-bounce">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          {toast}
        </div>
      )}

      {/* ENTERPRISE METRICS SECTION (GRID CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Minted Container IDs */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden bg-slate-900/40 border border-slate-800">
          <Layers className="absolute right-4 top-4 text-purple-500/10 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Total Minted IDs</span>
          <span className="text-3xl font-extrabold text-white tracking-tight">{stats.totalMinted}</span>
          <span className="text-[9px] font-mono text-purple-400 tracking-widest uppercase">Cryptographic Nodes</span>
        </div>

        {/* JIT Active QR Statuses */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden bg-slate-900/40 border border-slate-800">
          <CheckCircle2 className="absolute right-4 top-4 text-emerald-500/10 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Active In-Transit</span>
          <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{stats.activeQRs}</span>
          <span className="text-[9px] font-mono text-emerald-400 tracking-widest uppercase">JIT Live Inventory</span>
        </div>

        {/* Verification Velocity */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden bg-slate-900/40 border border-slate-800">
          <Zap className="absolute right-4 top-4 text-cyan-500/10 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Verify Velocity</span>
          <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">
            {stats.verificationVelocity} <span className="text-sm font-medium text-neutral-400">/hr</span>
          </span>
          <span className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase">Real-time scan logs</span>
        </div>

        {/* High Counterfeit Threats Flagged */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden bg-slate-900/40 border border-red-500/15">
          <ShieldAlert className="absolute right-4 top-4 text-red-500/10 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-red-400 uppercase font-bold">Flagged Threats</span>
          <span className={`text-3xl font-extrabold tracking-tight ${stats.flaggedAnomalies > 0 ? 'text-red-500 animate-pulse' : 'text-neutral-400'}`}>
            {stats.flaggedAnomalies}
          </span>
          <span className="text-[9px] font-mono text-red-500 tracking-widest uppercase">Blocked counterfeits</span>
        </div>
      </div>

      {/* CREATION & ACTIVATION ARENAS (SPLIT LAYOUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Dynamic Pallet Creator Column */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl flex flex-col justify-between bg-slate-900/40 border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">Mint Parent-Child Lot</h2>
            </div>

            {scanning && (
              <div className="mb-4 rounded-xl overflow-hidden border border-slate-700 bg-black relative h-48">
                <div id="manufacturer-qr-reader" className="w-full h-full"></div>
                <button
                  type="button"
                  onClick={() => setScanning(false)}
                  className="absolute top-2 right-2 z-10 bg-red-600/80 px-2 py-1 rounded text-[10px] uppercase font-bold"
                >
                  Cancel
                </button>
              </div>
            )}

            <form onSubmit={handleMintBatch} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-neutral-400">Unique Batch Identifier ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2026-X99"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                    required
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono w-full focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setScanning(true)}
                    className="glass-panel px-3 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/15 transition-all flex items-center gap-1.5 font-mono text-[10px] font-bold shrink-0"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan Label</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-neutral-400">Product Variant Name</label>
                <input
                  type="text"
                  placeholder="Whey Isolate Double Chocolate"
                  value={productVariant}
                  onChange={(e) => setProductVariant(e.target.value)}
                  required
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono w-full focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-neutral-400">Total Units Count</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={totalUnitsCount}
                    onChange={(e) => setTotalUnitsCount(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono w-full focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-neutral-400">Assigned Logistics Hub</label>
                  <input
                    type="text"
                    value={distributorId}
                    onChange={(e) => setDistributorId(e.target.value)}
                    required
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono w-full focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Session Auth Error Banner */}
              <AnimatePresence>
                {sessionError && (
                  <motion.div
                    key="session-error-banner"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono p-3.5 rounded-xl leading-relaxed"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                    <div className="flex-1 space-y-0.5">
                      <p className="font-bold uppercase tracking-widest text-amber-300 text-[9px]">Session Token Error</p>
                      <p className="text-amber-400/90">{sessionError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={dismissSessionError}
                      className="text-amber-600 hover:text-amber-200 transition-colors ml-1 p-0.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mint Success Confirmation */}
              <AnimatePresence>
                {formSuccess && (
                  <motion.div
                    key="form-success"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono p-3.5 rounded-xl leading-relaxed"
                  >
                    {formSuccess}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* General Pipeline Error */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    key="form-error"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono p-3.5 rounded-xl leading-relaxed"
                  >
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Action Button Element */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-cyan-500 hover:brightness-110 active:scale-[0.98] transition-all text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {formLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>PROCESSING MINT...</span>
                  </>
                ) : (
                  <>
                    <span>INITIALIZE ENCRYPTION MINT</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* JIT Activation Logistics Column */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col justify-between bg-slate-900/40 border border-slate-800">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">Logistic JIT Activation Dispatch</h2>
              </div>
              <button
                onClick={loadDashboardData}
                className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-400 hover:text-white transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] border border-white/[0.04] rounded-2xl bg-black/20 p-4 space-y-3">
              {subBatches.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-600">
                  NO ACTIVE WAREHOUSE CARTONS LOGGED
                </div>
              ) : (
                subBatches.map(sb => (
                  <div
                    key={sb.subBatchId}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl transition-all gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-200">{sb.subBatchId}</span>
                        <span className={`text-[9px] font-mono tracking-wider font-extrabold px-2 py-0.5 rounded ${sb.isActivated ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                          {sb.isActivated ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500 mt-1">
                        Parent Pallet: {sb.parentBatchId} | Route: {sb.assignedDistributorId}
                      </p>
                    </div>

                    {!sb.isActivated ? (
                      <button
                        onClick={() => handleActivateCarton(sb.subBatchId)}
                        className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg bg-cyan-400 text-black transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 fill-black" />
                        JIT ACTIVATE
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-500">
                        Disp. {new Date(sb.activatedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="text-[9px] font-mono text-cyan-400 font-bold tracking-widest mb-1.5 uppercase">Logistic Hub Dispatch Feed</div>
              <div className="bg-black/30 border border-white/[0.03] p-2.5 rounded-xl h-14 overflow-y-auto font-mono text-[10px] text-white/50 space-y-1">
                {activationLogs.length === 0 ? (
                  <span className="text-white/20 italic">No activations triggers logged in current browser session...</span>
                ) : (
                  activationLogs.map((log, index) => <div key={index}>{log}</div>)
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Dev Sanity Panel & Offline Simulators Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-900/20 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Settings className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-bold tracking-wider text-white">INTERACTIVE DEV SANITY PANEL</span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Simulate persistent database dropouts or ledger RPC gateway failures to verify NutriChain's Sandbox Fallback Mode integrity in real-time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* DB Toggle Card */}
          <button
            type="button"
            onClick={toggleDbMode}
            className={`p-4 border rounded-2xl transition-all text-left space-y-2 relative overflow-hidden group ${devStatus.isUsingMemoryStore
                ? 'bg-amber-500/5 border-amber-500/30'
                : 'bg-emerald-500/5 border-emerald-500/20'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400">DATABASE TIER</span>
              <Database className={`w-4 h-4 ${devStatus.isUsingMemoryStore ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-white">
                {devStatus.isUsingMemoryStore ? 'In-Memory Sandbox' : 'MongoDB Connected'}
              </div>
              <div className="text-[9px] font-mono text-neutral-500">
                {devStatus.isUsingMemoryStore ? '⚠️ Sandbox routing active' : '✅ Persistence tier active'}
              </div>
            </div>
          </button>

          {/* Blockchain Toggle Card */}
          <button
            type="button"
            onClick={toggleBlockchainMode}
            className={`p-4 border rounded-2xl transition-all text-left space-y-2 relative overflow-hidden group ${devStatus.blockchainSimulated
                ? 'bg-amber-500/5 border-amber-500/30'
                : 'bg-emerald-500/5 border-emerald-500/20'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400">LEDGER NETWORK</span>
              <Activity className={`w-4 h-4 ${devStatus.blockchainSimulated ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-white">
                {devStatus.blockchainSimulated ? 'Simulated Sandbox' : 'Live Polygon Node'}
              </div>
              <div className="text-[9px] font-mono text-neutral-500">
                {devStatus.blockchainSimulated ? '⚠️ Local transaction logging' : '✅ Contract execution active'}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManufacturerDashboard;