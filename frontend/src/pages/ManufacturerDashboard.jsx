import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, CheckCircle2, ShieldAlert, Zap, PlusCircle, ArrowRight, RefreshCw, BarChart2, Database, Settings, Activity } from 'lucide-react';
import axios from 'axios';

const ManufacturerDashboard = ({ token, user }) => {
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
  const [totalUnits, setTotalUnits] = useState(20); // default group size to see child lists immediately
  const [distributorId, setDistributorId] = useState('DIST-GLOBAL-SUPPLY');

  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  
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
    // Dynamically poll every 3 seconds to update real-time telemetry pipelines!
    const interval = setInterval(loadDashboardData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMintBatch = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormSuccess('');
    setFormError('');

    try {
      const response = await axios.post('/api/batches', {
        batchId,
        productVariant,
        totalUnits: Number(totalUnits),
        assignedDistributorId: distributorId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFormSuccess(`MINT SUCCESS: Batch ${batchId} cryptographically verified and anchored on-chain!`);
      // Reset form variables
      setBatchId('');
      setProductVariant('');
      loadDashboardData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Transaction submission error.');
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

      // Show temporary toast feedback
      const activeLog = `⚡ ${subBatchId} activated successfully. ${response.data.activatedUnits} items live.`;
      setActivationLogs(prev => [activeLog, ...prev]);
      loadDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Logistic activation failed.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------------------
          ENTERPRISE METRICS SECTION (GRID CARDS)
          ------------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Minted Container IDs */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
          <Layers className="absolute right-4 top-4 text-cyber-purple/20 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Total Minted IDs</span>
          <span className="text-3xl font-extrabold text-white glow-text-purple tracking-tight">
            {stats.totalMinted}
          </span>
          <span className="text-[9px] font-mono text-cyber-purple tracking-widest uppercase">Cryptographic Nodes</span>
        </div>

        {/* JIT Active QR Statuses */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
          <CheckCircle2 className="absolute right-4 top-4 text-cyber-emerald/20 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Active In-Transit</span>
          <span className="text-3xl font-extrabold text-cyber-emerald glow-text-emerald tracking-tight">
            {stats.activeQRs}
          </span>
          <span className="text-[9px] font-mono text-cyber-emerald tracking-widest uppercase">JIT Live Inventory</span>
        </div>

        {/* Verification Velocity */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
          <Zap className="absolute right-4 top-4 text-cyber-cyan/20 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Verify Velocity</span>
          <span className="text-3xl font-extrabold text-cyber-cyan glow-text-cyan tracking-tight">
            {stats.verificationVelocity} <span className="text-sm font-medium text-neutral-400">/hr</span>
          </span>
          <span className="text-[9px] font-mono text-cyber-cyan tracking-widest uppercase">Real-time scan logs</span>
        </div>

        {/* High Counterfeit Threats Flagged */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden border-cyber-crimson/15">
          <ShieldAlert className="absolute right-4 top-4 text-cyber-crimson/20 w-12 h-12" />
          <span className="text-[10px] font-mono tracking-wider text-cyber-crimson uppercase font-bold">Flagged Threats</span>
          <span className={`text-3xl font-extrabold tracking-tight ${stats.flaggedAnomalies > 0 ? 'text-cyber-crimson animate-pulse' : 'text-neutral-400'}`}>
            {stats.flaggedAnomalies}
          </span>
          <span className="text-[9px] font-mono text-cyber-crimson tracking-widest uppercase">Blocked counterfeits</span>
        </div>

      </div>

      {/* ------------------------------------------------------------------------
          CREATION & ACTIVATION ARENAS (SPLIT LAYOUT)
          ------------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Pallet Creator Column */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl flex flex-col justify-between border-cyber-purple/20">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PlusCircle className="w-5 h-5 text-cyber-purple" />
              <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">Mint Parent-Child Lot</h2>
            </div>
            
            <form onSubmit={handleMintBatch} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-neutral-400">Unique Batch Identifer ID</label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2026-X99"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                  required
                  className="cyber-input text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-neutral-400">Product Variant Name</label>
                <input
                  type="text"
                  placeholder="Whey Isolate Double Chocolate (5 lbs)"
                  value={productVariant}
                  onChange={(e) => setProductVariant(e.target.value)}
                  required
                  className="cyber-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-neutral-400">Total Units Count</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(e.target.value)}
                    required
                    className="cyber-input text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-neutral-400">Assigned Logistics Hub</label>
                  <input
                    type="text"
                    value={distributorId}
                    onChange={(e) => setDistributorId(e.target.value)}
                    required
                    className="cyber-input text-xs"
                  />
                </div>
              </div>

              {formSuccess && (
                <div className="bg-cyber-emerald/10 border border-cyber-emerald/20 text-cyber-emerald text-[10px] font-mono p-3.5 rounded-xl leading-relaxed">
                  {formSuccess}
                </div>
              )}

              {formError && (
                <div className="bg-cyber-crimson/10 border border-cyber-crimson/20 text-cyber-crimson text-[10px] font-mono p-3.5 rounded-xl leading-relaxed">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyber-purple to-cyber-cyan hover:brightness-110 active:scale-[0.98] transition-all text-white shadow-lg shadow-cyber-purple/20 disabled:opacity-50"
              >
                {formLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col justify-between">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyber-cyan" />
                <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">Logistic JIT Activation Dispatch</h2>
              </div>
              <button 
                onClick={loadDashboardData}
                className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-400 hover:text-white transition-all"
                title="Refresh logs"
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
                    className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.08] p-4 rounded-xl transition-all gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-200">{sb.subBatchId}</span>
                        <span className={`text-[9px] font-mono tracking-wider font-extrabold px-2 py-0.5 rounded ${sb.isActivated ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20' : 'bg-neutral-800 text-neutral-400'}`}>
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
                        className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg bg-cyber-cyan hover:bg-cyber-cyan/80 active:scale-95 text-black transition-all shadow-md shadow-cyber-cyan/10"
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

            {/* Quick Terminal Logs Ticker */}
            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="text-[9px] font-mono text-cyber-cyan font-bold tracking-widest mb-1.5 uppercase">Logistic Hub Dispatch Feed</div>
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
      <div className="glass-panel p-6 rounded-3xl border-white/[0.04] space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Settings className="w-4 h-4 text-cyber-cyan animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-bold tracking-wider text-white">INTERACTIVE DEV SANITY PANEL</span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Simulate persistent database dropouts or ledger RPC gateway failures to verify NutriChain's Sandbox Fallback Mode integrity in real-time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* DB Toggle Card */}
          <button
            onClick={toggleDbMode}
            className={`p-4 border rounded-2xl transition-all text-left space-y-2 relative overflow-hidden group ${
              devStatus.isUsingMemoryStore
                ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                : 'bg-emerald-500/5 border-emerald-500/20 hover:border-cyber-cyan/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400">DATABASE TIER</span>
              <Database className={`w-4 h-4 ${devStatus.isUsingMemoryStore ? 'text-amber-500 animate-pulse' : 'text-cyber-emerald'}`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-white">
                {devStatus.isUsingMemoryStore ? 'In-Memory Sandbox' : 'MongoDB Connected'}
              </div>
              <div className="text-[9px] font-mono text-neutral-500">
                {devStatus.isUsingMemoryStore ? '⚠️ Sandbox routing active' : '✅ Persistence tier active'}
              </div>
            </div>
            {/* Hover overlay glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </button>

          {/* Blockchain Toggle Card */}
          <button
            onClick={toggleBlockchainMode}
            className={`p-4 border rounded-2xl transition-all text-left space-y-2 relative overflow-hidden group ${
              devStatus.blockchainSimulated
                ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                : 'bg-emerald-500/5 border-emerald-500/20 hover:border-cyber-cyan/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-neutral-400">LEDGER NETWORK</span>
              <Activity className={`w-4 h-4 ${devStatus.blockchainSimulated ? 'text-amber-500 animate-pulse' : 'text-cyber-emerald'}`} />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-white">
                {devStatus.blockchainSimulated ? 'Simulated Sandbox' : 'Live Polygon Node'}
              </div>
              <div className="text-[9px] font-mono text-neutral-500">
                {devStatus.blockchainSimulated ? '⚠️ Local transaction logging' : '✅ Contract execution active'}
              </div>
            </div>
            {/* Hover overlay glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------
          LIVE GLOBAL SCANSTREAM CONSOLE TICKER (BOTTOM PANEL)
          ------------------------------------------------------------------------ */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-cyber-purple" />
          <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">Global Verification Telemetry Ticker</h2>
        </div>

        <div className="overflow-x-auto border border-white/[0.04] rounded-2xl bg-black/20">
          <table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01] text-neutral-500 text-[10px]">
                <th className="p-4">CONTAINER CODE</th>
                <th className="p-4">SCAN COORDINATES</th>
                <th className="p-4">GPS LOCATION NAME</th>
                <th className="p-4">STATE</th>
                <th className="p-4">AI METRIC SCORE</th>
                <th className="p-4 text-right">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-neutral-300">
              {liveScans.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-neutral-600 italic">
                    NO VERIFICATION LOGS DETECTED IN Persistance tier
                  </td>
                </tr>
              ) : (
                liveScans.map(scan => {
                  const isThreat = scan.isThreat;
                  return (
                    <tr key={scan._id} className="hover:bg-white/[0.01] transition-all">
                      <td className="p-4 font-bold text-neutral-200">{scan.childId.substring(0, 16)}...</td>
                      <td className="p-4 text-neutral-400">{scan.location.lat.toFixed(4)}, {scan.location.lng.toFixed(4)}</td>
                      <td className="p-4 text-neutral-300">{scan.location.name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] ${
                          scan.status === 'GENUINE' 
                            ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20' 
                            : 'bg-cyber-crimson/10 text-cyber-crimson border border-cyber-crimson/20'
                        }`}>
                          {scan.status}
                        </span>
                      </td>
                      <td className="p-4 font-bold">
                        <span className={scan.anomalyScore > 0.6 ? 'text-cyber-crimson' : 'text-cyber-cyan'}>
                          {scan.anomalyScore.toFixed(3)}
                        </span>
                      </td>
                      <td className="p-4 text-right text-neutral-500">
                        {new Date(scan.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default ManufacturerDashboard;
