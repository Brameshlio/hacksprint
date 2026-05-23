import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, ShieldCheck, ShieldAlert, Cpu, Compass, MapPin, Send, AlertTriangle, Database, Settings, Activity } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';

const ConsumerVerification = () => {
  const [childId, setChildId] = useState('');
  
  // Geolocation states
  const [lat, setLat] = useState(12.9716); // defaults to Bengaluru
  const [lng, setLng] = useState(77.5946);
  const [locationName, setLocationName] = useState('Kempegowda Logistics Zone, Bengaluru');

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

  const [scanning, setScanning] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Attempt to acquire consumer actual coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocationName('User Browser GPS Node');
        },
        (err) => {
          console.warn('Geolocation access declined. Operating under virtualized retail hubs.');
        }
      );
    }
  }, []);

  // HTML5 QR Scanner management
  useEffect(() => {
    let scanner = null;
    if (scanning) {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 10, 
        qrbox: { width: 250, height: 250 } 
      }, false);

      scanner.render(
        (decodedText) => {
          setChildId(decodedText);
          setScanning(false);
          scanner.clear();
          // Automatically fire verify for decoded scans
          handleVerify(decodedText);
        },
        (error) => {
          // Silent scan log failures
        }
      );
    }

    return () => {
      if (scanner) {
        try {
          scanner.clear();
        } catch (e) {
          // scanner already shut down
        }
      }
    };
  }, [scanning]);

  const handleVerify = async (targetId = childId) => {
    if (!targetId) {
      setErrorMsg('Please scan a QR or enter a container identifier code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setVerificationResult(null);

    try {
      // POST coordinates and location name
      const response = await axios.post(`/api/verify/${targetId}`, {
        lat: Number(lat),
        lng: Number(lng),
        locationName
      });

      setVerificationResult(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVerificationResult(err.response.data);
      } else {
        setErrorMsg(err.response?.data?.message || 'Verification endpoint transmission fault.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick sandbox helper triggers (Bengaluru vs. Mumbai geographical leaps to test AI Isolation Forest)
  const handleQuickCoordinateSet = (latitude, longitude, name) => {
    setLat(latitude);
    setLng(longitude);
    setLocationName(name);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Dynamic Results Display Area */}
      <AnimatePresence mode="wait">
        
        {/* Genuine Successful Verification (Emerald Haptic Ripple Pulse) */}
        {verificationResult && verificationResult.genuine && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel p-8 rounded-3xl text-center border-cyber-emerald/30 shadow-2xl relative overflow-hidden"
          >
            
            {/* Pulsing Ripple Backgrounds */}
            <div className="absolute inset-0 flex items-center justify-center -z-10">
              <div className="w-40 h-40 rounded-full bg-cyber-emerald/10 absolute animate-ping" />
              <div className="w-56 h-56 rounded-full bg-cyber-emerald/5 absolute animate-pulse-slow" />
            </div>

            <div className="w-20 h-20 rounded-full bg-cyber-emerald/20 border border-cyber-emerald/40 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyber-emerald/10">
              <ShieldCheck className="w-10 h-10 text-cyber-emerald" />
            </div>

            <h2 className="text-2xl font-black Outfit text-cyber-emerald tracking-tight mb-2 uppercase glow-text-emerald">
              {verificationResult.message}
            </h2>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed max-w-md mx-auto mb-6">
              {verificationResult.details}
            </p>

            <div className="bg-black/40 border border-white/[0.04] p-4.5 rounded-2xl space-y-3 font-mono text-[11px] text-left">
              <div className="flex justify-between">
                <span className="text-neutral-500">CONTAINER SERIAL ID</span>
                <span className="text-white font-bold">{verificationResult.scanLog?.childId.substring(0, 24)}...</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.03] pt-2">
                <span className="text-neutral-500">VERIFICATION DEPTH</span>
                <span className="text-cyber-cyan font-bold">{verificationResult.scanCount} scans logged</span>
              </div>
              <div className="flex justify-between border-t border-white/[0.03] pt-2">
                <span className="text-neutral-500">LEDGER HASH</span>
                <span className="text-cyber-purple font-bold truncate max-w-[200px]" title={verificationResult.polygonTxHash}>
                  {verificationResult.polygonTxHash}
                </span>
              </div>
            </div>

            <button
              onClick={() => setVerificationResult(null)}
              className="mt-6 text-xs text-neutral-400 hover:text-white border-b border-dashed border-neutral-500 hover:border-white transition-all font-mono"
            >
              Scan Another Container
            </button>

          </motion.div>
        )}

        {/* Failed Verification (Crimson Siren Glow Warnings) */}
        {verificationResult && !verificationResult.genuine && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-panel p-8 rounded-3xl text-center border-cyber-crimson/40 shadow-2xl animate-siren relative overflow-hidden"
          >
            
            <div className="w-20 h-20 rounded-full bg-cyber-crimson/20 border border-cyber-crimson/40 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyber-crimson/10 animate-bounce">
              <ShieldAlert className="w-10 h-10 text-cyber-crimson" />
            </div>

            <h2 className="text-2xl font-black Outfit text-cyber-crimson tracking-tight mb-2 uppercase text-shadow">
              {verificationResult.message}
            </h2>
            
            <p className="text-xs text-neutral-300 font-sans leading-relaxed max-w-md mx-auto mb-6">
              {verificationResult.details}
            </p>

            <div className="flex items-center gap-2 bg-cyber-crimson/10 border border-cyber-crimson/20 p-4.5 rounded-2xl text-[11px] font-mono text-cyber-crimson text-left mb-6 leading-relaxed">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-extrabold uppercase block mb-0.5">SECURITY ALERT ADVICE</span>
                This unique identifier has been flagged as compromised. The seals or labels have been copy-duplicated. Do NOT consume this supplement powder. Contact brand support immediately.
              </div>
            </div>

            {verificationResult.threatLog && (
              <div className="bg-black/40 border border-white/[0.04] p-4 rounded-xl space-y-1.5 font-mono text-[10px] text-left text-neutral-400">
                <div><span className="text-neutral-500">Threat Code:</span> {verificationResult.threatLog.status}</div>
                <div><span className="text-neutral-500">Flagged Reason:</span> <span className="text-white font-semibold">{verificationResult.threatLog.threatReason}</span></div>
                {verificationResult.anomalyScore && (
                  <div><span className="text-neutral-500">AI Threat Score:</span> <span className="text-cyber-cyan font-bold">{verificationResult.anomalyScore.toFixed(3)}</span></div>
                )}
              </div>
            )}

            <button
              onClick={() => setVerificationResult(null)}
              className="mt-6 text-xs text-neutral-400 hover:text-white border-b border-dashed border-neutral-500 hover:border-white transition-all font-mono"
            >
              Scan Another Container
            </button>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Main scanner Input console */}
      {!verificationResult && (
        <div className="glass-panel p-8 rounded-3xl border-white/[0.04] space-y-6">
          
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold Outfit text-white">Cryptographic Verification Portal</h2>
            <p className="text-xs text-neutral-400">Scan container security labels to authenticate product origin details.</p>
          </div>

          {/* Interactive QR Scanner Camera View */}
          {scanning ? (
            <div className="space-y-4">
              <div id="reader" className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 aspect-square max-w-sm mx-auto" />
              <button
                onClick={() => setScanning(false)}
                className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-white/[0.05] transition-all"
              >
                Deactivate Camera Scanner
              </button>
            </div>
          ) : (
            <button
              onClick={() => setScanning(true)}
              className="w-full flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-cyber-cyan/30 bg-white/[0.01] hover:bg-white/[0.02] transition-all gap-4 group"
            >
              <div className="w-14 h-14 rounded-full bg-cyber-cyan/10 group-hover:bg-cyber-cyan/20 flex items-center justify-center text-cyber-cyan transition-all">
                <ScanLine className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-neutral-300 block">Initialize Camera scan</span>
                <span className="text-[10px] text-neutral-500 font-mono mt-1 block">Supports smartphone and web cameras</span>
              </div>
            </button>
          )}

          {/* Manual Entry sandbox Form (Developer sanity panel) */}
          <div className="space-y-3 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <span className="font-semibold">Developer sandbox Sandbox Input</span>
              <span className="text-neutral-600">Bypasses camera scanner</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste code (e.g. NC-BATCH-2026-X99-01-01-xxxx)"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="flex-1 cyber-input text-xs font-mono"
              />
              <button
                onClick={() => handleVerify()}
                disabled={loading}
                className="px-5 rounded-xl bg-gradient-to-r from-cyber-cyan to-cyber-purple hover:brightness-110 active:scale-95 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {errorMsg && (
              <div className="bg-cyber-crimson/10 border border-cyber-crimson/20 text-cyber-crimson text-[10px] font-mono p-3 rounded-xl">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Virtual Coordinate overrides (Critical for testing Impossible Travel checks) */}
          <div className="space-y-3 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <div className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyber-purple" />
                <span className="font-semibold">Coordinate Node Simulation Overrides</span>
              </div>
              <span className="text-neutral-600">Simulate geographic leaps</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-neutral-400">
              <button
                onClick={() => handleQuickCoordinateSet(12.9716, 77.5946, 'KA-BLR Production Floor')}
                className={`w-full py-2 border rounded-xl transition-all flex items-center justify-center gap-1.5 ${locationName.includes('BLR') || locationName.includes('Bengaluru') ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/30 font-bold' : 'bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.05]'}`}
              >
                <MapPin className="w-3 h-3" /> BLR Hub
              </button>
              
              <button
                onClick={() => handleQuickCoordinateSet(19.0760, 72.8777, 'MH-BOM Retail Network')}
                className={`w-full py-2 border rounded-xl transition-all flex items-center justify-center gap-1.5 ${locationName.includes('BOM') ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/30 font-bold' : 'bg-white/[0.01] hover:bg-white/[0.02] border-white/[0.05]'}`}
              >
                <MapPin className="w-3 h-3" /> BOM Retail
              </button>
            </div>

            <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl font-mono text-[9px] text-neutral-500 leading-relaxed">
              Active Virtual GPS Location: <span className="text-neutral-300 font-semibold">{locationName}</span> ({lat.toFixed(4)}, {lng.toFixed(4)})
            </div>
          </div>

        </div>
      )}

      {/* Dev Sanity Panel & Offline Simulators Card */}
      <div className="glass-panel p-6 rounded-3xl border-white/[0.04] space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Settings className="w-4 h-4 text-cyber-cyan animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-bold tracking-wider text-white">INTERACTIVE DEV SANITY PANEL</span>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Simulate runtime persistent outages in real-time. Toggle MongoDB database connectivity or blockchain transaction node providers to test fail-safe simulations.
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

    </div>
  );
};

export default ConsumerVerification;
