import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ShieldCheck, ShieldAlert, Lock, AlertTriangle,
  Globe2, RefreshCw, Cpu, Radio, ChevronDown, ChevronUp,
  MapPin, Clock, Fingerprint
} from 'lucide-react';
import axios from 'axios';

// ── Status badge config ────────────────────────────────────────────────────
const STATUS_MAP = {
  GENUINE: {
    label: 'GENUINE',
    color: 'text-emerald-400',
    bg:    'bg-emerald-400/8',
    border:'border-emerald-400/20',
    dot:   'bg-emerald-400',
    icon:  ShieldCheck,
  },
  AI_THREAT_FLAGGED: {
    label: 'AI THREAT',
    color: 'text-red-500',
    bg:    'bg-red-500/8',
    border:'border-red-500/20',
    dot:   'bg-red-500',
    icon:  ShieldAlert,
  },
  UNREGISTERED_ID: {
    label: 'UNREGISTERED',
    color: 'text-red-500',
    bg:    'bg-red-500/8',
    border:'border-red-500/20',
    dot:   'bg-red-500',
    icon:  AlertTriangle,
  },
  INACTIVE_COMPROMISED: {
    label: 'INACTIVE',
    color: 'text-amber-400',
    bg:    'bg-amber-400/8',
    border:'border-amber-400/20',
    dot:   'bg-amber-400',
    icon:  Lock,
  },
  CRITICAL_ALERT: {
    label: 'CRITICAL',
    color: 'text-red-500',
    bg:    'bg-red-500/10',
    border:'border-red-500/25',
    dot:   'bg-red-500',
    icon:  ShieldAlert,
  },
};

const getStatusCfg = (status) =>
  STATUS_MAP[status] || STATUS_MAP.GENUINE;

// ── Format helpers ────────────────────────────────────────────────────────
const relativeTime = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000)      return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
};

const truncId = (id) => id?.length > 20 ? `${id.slice(0, 18)}…` : id;

// ── Single scan row ───────────────────────────────────────────────────────
const ScanRow = ({ scan, index, expanded, onToggle }) => {
  const cfg  = getStatusCfg(scan.status);
  const Icon = cfg.icon;
  const isThreat = scan.isThreat;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className={`w-full text-left grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 transition-all hover:bg-white/[0.015] ${
          isThreat ? 'bg-red-500/[0.02]' : ''
        } ${expanded ? 'bg-white/[0.02]' : ''}`}
      >
        {/* Status LED */}
        <div className="relative flex items-center justify-center w-7 h-7">
          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          {isThreat && (
            <span className={`absolute w-2 h-2 rounded-full ${cfg.dot} animate-ping opacity-60`} />
          )}
        </div>

        {/* ID + Location */}
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-neutral-200 font-semibold truncate">
            {truncId(scan.childId)}
          </p>
          <p className="font-mono text-[9px] text-neutral-600 truncate flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 inline shrink-0" />
            {scan.location?.name || 'Unknown'}
          </p>
        </div>

        {/* Status Badge */}
        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-widest uppercase border ${cfg.color} ${cfg.bg} ${cfg.border} whitespace-nowrap`}>
          {cfg.label}
        </span>

        {/* Anomaly Score */}
        <span className={`font-mono text-[11px] font-bold tabular-nums w-12 text-right ${
          scan.anomalyScore > 0.8 ? 'text-red-500' :
          scan.anomalyScore > 0.5 ? 'text-amber-400' :
          'text-emerald-400'
        }`}>
          {(scan.anomalyScore ?? 0).toFixed(2)}
        </span>

        {/* Timestamp */}
        <span className="font-mono text-[10px] text-neutral-600 w-16 text-right tabular-nums">
          {relativeTime(scan.timestamp)}
        </span>
      </button>

      {/* Expanded detail drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`mx-4 mb-3 p-3.5 rounded-xl border ${isThreat ? 'border-red-500/10 bg-red-500/[0.03]' : 'border-white/[0.04] bg-white/[0.01]'} grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] font-mono`}>
              <div>
                <span className="text-neutral-600">Full Code</span>
                <p className="text-neutral-300 truncate mt-0.5">{scan.childId}</p>
              </div>
              <div>
                <span className="text-neutral-600">GPS Coordinates</span>
                <p className="text-neutral-300 mt-0.5">
                  {scan.location?.lat?.toFixed(4) ?? '—'}, {scan.location?.lng?.toFixed(4) ?? '—'}
                  {scan.location?.name?.includes('BLR') ? ' [BLR_MANUFACTURER]' : ' [BOM_DISTRIBUTOR]'}
                </p>
              </div>
              <div>
                <span className="text-neutral-600">Threat Reason</span>
                <p className={`mt-0.5 ${isThreat ? 'text-red-400 font-semibold' : 'text-neutral-500'}`}>
                  {scan.threatReason || '—'}
                </p>
              </div>
              <div>
                <span className="text-neutral-600">Scan Timestamp</span>
                <p className="text-neutral-300 mt-0.5">{new Date(scan.timestamp).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TELEMETRY FEED BENTO COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const TelemetryFeed = ({ token }) => {
  const [scans,       setScans]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const scrollRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scansRes, statsRes] = await Promise.all([
        axios.get('/api/telemetry/scans'),
        axios.get('/api/telemetry/stats')
      ]);
      setScans(Array.isArray(scansRes.data) ? scansRes.data.slice(0, 50) : []);
      setStats(statsRes.data);
    } catch (err) {
      console.warn('Telemetry fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 4000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const threatCount  = scans.filter(s => s.isThreat).length;
  const genuineCount = scans.filter(s => !s.isThreat).length;

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-cyan/20 to-cyber-purple/10 border border-cyber-cyan/15 flex items-center justify-center">
            <Radio className="w-5 h-5 text-cyber-cyan" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-neutral-100">
              Live Telemetry Feed
            </h2>
            <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
              Immutable ledger stream — scan events processed by the AI Isolation Forest engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all border ${
              autoRefresh
                ? 'text-cyber-emerald border-cyber-emerald/20 bg-cyber-emerald/5'
                : 'text-neutral-500 border-white/[0.06] bg-white/[0.01]'
            }`}
          >
            <Activity className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'LIVE' : 'PAUSED'}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/[0.04] text-neutral-400 hover:text-white transition-all disabled:opacity-30"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats Bento Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Minted',     value: stats?.totalMinted ?? '—',         accent: 'cyber-cyan',    icon: Cpu },
          { label: 'Total Scans',      value: stats?.totalScans ?? '—',          accent: 'cyber-purple',  icon: Activity },
          { label: 'Genuine Verified',  value: genuineCount,                      accent: 'cyber-emerald', icon: ShieldCheck },
          { label: 'Threats Flagged',  value: stats?.flaggedAnomalies ?? threatCount, accent: 'cyber-crimson', icon: ShieldAlert },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`glass-panel rounded-2xl p-4 border border-${s.accent}/10 flex flex-col gap-1`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 text-${s.accent} opacity-60`} />
                <span className={`w-1.5 h-1.5 rounded-full bg-${s.accent} ${s.accent === 'cyber-crimson' && threatCount > 0 ? 'animate-pulse' : ''}`} />
              </div>
              <span className={`text-2xl font-extrabold tracking-tight text-${s.accent}`}>
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </span>
              <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Scan Ledger Table ──────────────────────────────────────────── */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.04]">

        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01] text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
          <span className="w-7 text-center">●</span>
          <span>Container / Location</span>
          <span>Status</span>
          <span className="w-12 text-right">Score</span>
          <span className="w-16 text-right">Time</span>
        </div>

        {/* Rows */}
        <div ref={scrollRef} className="max-h-[520px] overflow-y-auto divide-y divide-white/[0.03]">
          {scans.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-neutral-600">
              <Globe2 className="w-8 h-8 opacity-40" />
              <p className="text-xs font-mono">No scan telemetry recorded yet.</p>
              <p className="text-[10px] font-mono text-neutral-700">Scan a QR code from the Consumer Verification tab to populate this ledger.</p>
            </div>
          ) : (
            scans.map((scan, i) => (
              <ScanRow
                key={scan._id || `scan-${i}`}
                scan={scan}
                index={i}
                expanded={expandedId === (scan._id || `scan-${i}`)}
                onToggle={() => setExpandedId(
                  expandedId === (scan._id || `scan-${i}`) ? null : (scan._id || `scan-${i}`)
                )}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-[9px] font-mono text-neutral-600">
          <span>{scans.length} events loaded</span>
          <span className="flex items-center gap-1.5">
            <Fingerprint className="w-3 h-3" />
            SHA-256 chain-linked immutable ledger
          </span>
        </div>
      </div>
    </div>
  );
};

export default TelemetryFeed;
