import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, Scan, Zap, Globe2, Lock,
  ChevronRight, ArrowUpRight, Activity, Cpu, Boxes, Hash
} from 'lucide-react';
import { getOrCreateConsumerUUID } from '../utils/deviceSession';
import axios from 'axios';

// ── Static hero metric callouts ────────────────────────────────────────────
const HERO_STATS = [
  { label: 'Minted IDs',      value: '115',  accent: 'cyan',    icon: Boxes },
  { label: 'Blocked Threats', value: '6',    accent: 'crimson', icon: ShieldAlert },
  { label: 'Chain Events',    value: '2,347',accent: 'purple',  icon: Activity },
  { label: 'Uptime',          value: '99.9%',accent: 'emerald', icon: Zap },
];

// ── Floating particle background ──────────────────────────────────────────
const ParticleOrb = ({ style }) => (
  <div
    className="absolute rounded-full pointer-events-none"
    style={{
      background: 'radial-gradient(circle, rgba(0,242,254,0.15) 0%, transparent 70%)',
      filter: 'blur(40px)',
      ...style
    }}
  />
);

// ── Typewriter effect for hero headline ───────────────────────────────────
const useTypewriter = (text, speed = 35) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
};

// ── Verification status colours & messages ────────────────────────────────
const STATUS_CONFIG = {
  GENUINE: {
    border: 'border-cyber-emerald/40',
    bg: 'bg-cyber-emerald/5',
    icon: ShieldCheck,
    iconColor: 'text-cyber-emerald',
    pulse: 'bg-cyber-emerald',
    label: 'GENUINE — PRODUCT CERTIFIED',
    labelColor: 'text-cyber-emerald',
  },
  FRAUD_THREAT: {
    border: 'border-cyber-crimson/40',
    bg: 'bg-cyber-crimson/5',
    icon: ShieldAlert,
    iconColor: 'text-cyber-crimson',
    pulse: 'bg-cyber-crimson',
    label: 'THREAT — COUNTERFEIT DETECTED',
    labelColor: 'text-cyber-crimson',
  },
  INACTIVE_STOLEN: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    icon: Lock,
    iconColor: 'text-amber-400',
    pulse: 'bg-amber-400',
    label: 'LOCKED — PRE-DISTRIBUTION UNIT',
    labelColor: 'text-amber-400',
  },
  LOCKED: {
    border: 'border-cyber-crimson/30',
    bg: 'bg-cyber-crimson/5',
    icon: Lock,
    iconColor: 'text-cyber-crimson',
    pulse: 'bg-cyber-crimson',
    label: 'SCAN LIMIT REACHED — DEVICE HARDCAP',
    labelColor: 'text-cyber-crimson',
  },
  COUNTERFEIT_ALERT: {
    border: 'border-cyber-crimson/40',
    bg: 'bg-cyber-crimson/10',
    icon: ShieldAlert,
    iconColor: 'text-cyber-crimson',
    pulse: 'bg-cyber-crimson',
    label: 'COUNTERFEIT ALERT — UUID MISMATCH',
    labelColor: 'text-cyber-crimson',
  }
};

// ── Right Column: Interactive Consumer Verification Terminal ──────────────
const VerificationTerminal = () => {
  const [code,     setCode]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [logs,     setLogs]     = useState([
    '// NutriChain Verification Terminal v2.0',
    '// Device UUID bound to local session.',
    '// Awaiting container code input...',
  ]);
  const uuid = getOrCreateConsumerUUID();
  const logRef = useRef(null);

  const pushLog = (msg) => setLogs(p => [...p.slice(-20), msg]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    pushLog(`› Scanning: ${code.trim()}`);
    pushLog(`› UUID: ${uuid.slice(0, 28)}...`);
    pushLog(`› Forwarding to AI gatekeeping pipeline...`);

    try {
      // Try device-level hardcap endpoint first
      const res = await axios.post('/api/verify-device', {
        containerCode: code.trim(),
        consumerUuid:  uuid,
        location: { name: 'Hero Verification Terminal', lat: 12.9716, lng: 77.5946 }
      });
      const data = res.data;
      pushLog(`✓ Response: ${data.status}`);
      if (data.scanCountLeft !== undefined) pushLog(`  Scans remaining: ${data.scanCountLeft}/${data.totalAllowed}`);
      setResult({ status: data.status, message: data.message, extra: data });
    } catch (err) {
      const errData = err.response?.data;
      const status  = errData?.status || 'ERROR';
      pushLog(`✗ ${status}: ${errData?.message || err.message}`);
      setResult({ status, message: errData?.message || 'Verification system error.', extra: errData });
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (STATUS_CONFIG[result.status] || STATUS_CONFIG.FRAUD_THREAT) : null;

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/[0.06] relative overflow-hidden h-full flex flex-col gap-4">
      {/* Corner decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyber-purple/5 rounded-full blur-3xl pointer-events-none" />

      {/* Terminal header */}
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyber-crimson/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald/70" />
        </div>
        <span className="font-mono text-[10px] text-neutral-500 tracking-widest ml-1 uppercase">
          Consumer Verification Terminal
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-pulse" />
          <span className="font-mono text-[9px] text-neutral-600">ONLINE</span>
        </span>
      </div>

      {/* Log console */}
      <div
        ref={logRef}
        className="bg-black/40 rounded-2xl border border-white/[0.04] p-4 font-mono text-[10px] leading-6 text-neutral-500 overflow-y-auto h-36 space-y-0.5"
      >
        {logs.map((l, i) => (
          <p key={i} className={l.startsWith('✓') ? 'text-cyber-emerald' : l.startsWith('✗') ? 'text-cyber-crimson' : 'text-neutral-500'}>
            {l}
          </p>
        ))}
        {loading && <p className="text-cyber-cyan animate-pulse">› Processing AI threat assessment...</p>}
      </div>

      {/* Code input */}
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && handleVerify()}
          placeholder="Paste QR container code…"
          className="flex-1 bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono placeholder-neutral-700 focus:outline-none focus:border-cyber-cyan/40 focus:ring-1 focus:ring-cyber-cyan/15 transition-all"
        />
        <button
          onClick={handleVerify}
          disabled={loading || !code.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyber-cyan/80 to-cyber-purple/80 hover:from-cyber-cyan hover:to-cyber-purple text-white font-bold text-xs tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyber-cyan/10"
        >
          <Scan className="w-3.5 h-3.5" />
          {loading ? 'Checking…' : 'Scan'}
        </button>
      </div>

      {/* Result Banner */}
      <AnimatePresence>
        {result && cfg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`rounded-2xl border p-4 flex items-start gap-3 ${cfg.border} ${cfg.bg}`}
          >
            <div className="relative mt-0.5">
              <cfg.icon className={`w-5 h-5 ${cfg.iconColor}`} />
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${cfg.pulse} animate-ping opacity-75`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-mono text-[10px] font-bold tracking-widest uppercase ${cfg.labelColor}`}>
                {cfg.label}
              </p>
              <p className="text-neutral-300 text-xs mt-1 leading-relaxed font-sans">
                {result.message}
              </p>
              {result.extra?.scanCountLeft !== undefined && (
                <p className="text-[10px] font-mono text-neutral-500 mt-1">
                  Remaining scans: <span className="text-cyber-cyan font-bold">{result.extra.scanCountLeft}</span> / {result.extra.totalAllowed}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UUID badge */}
      <div className="mt-auto pt-2 border-t border-white/[0.04] flex items-center gap-2 text-[9px] font-mono text-neutral-600">
        <Hash className="w-3 h-3" />
        <span className="truncate">{uuid}</span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LANDING HERO
// ═══════════════════════════════════════════════════════════════════════════
const LandingHero = ({ onEnterApp }) => {
  const headline  = useTypewriter('Immutable Supply Chain Authentication via AI', 30);
  const [live, setLive] = useState({ minted: 115, threats: 6, scans: 2347 });

  // Poll live stats every 8s
  useEffect(() => {
    const tick = async () => {
      try {
        const res = await axios.get('/api/telemetry/stats');
        if (res.data) {
          setLive({
            minted:  res.data.totalMinted  ?? live.minted,
            threats: res.data.flaggedAnomalies ?? live.threats,
            scans:   res.data.totalScans   ?? live.scans,
          });
        }
      } catch { /* use static fallbacks */ }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => clearInterval(id);
  }, []);

  // Merge live data into stats
  const dynamicStats = [
    { ...HERO_STATS[0], value: live.minted.toLocaleString() },
    { ...HERO_STATS[1], value: live.threats.toString() },
    { ...HERO_STATS[2], value: live.scans.toLocaleString() },
    { ...HERO_STATS[3] },
  ];

  const accentMap = {
    cyan:    'text-cyber-cyan border-cyber-cyan/20 bg-cyber-cyan/5',
    crimson: 'text-cyber-crimson border-cyber-crimson/20 bg-cyber-crimson/5',
    purple:  'text-cyber-purple border-cyber-purple/20 bg-cyber-purple/5',
    emerald: 'text-cyber-emerald border-cyber-emerald/20 bg-cyber-emerald/5',
  };

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0A0B0D 0%, #0E1114 50%, #080a0c 100%)' }}
    >
      {/* Ambient orbs */}
      <ParticleOrb style={{ width: 600, height: 600, top: '-15%', left: '-10%', opacity: 0.6 }} />
      <ParticleOrb style={{ width: 500, height: 500, bottom: '-10%', right: '-8%', opacity: 0.5,
        background: 'radial-gradient(circle, rgba(127,0,255,0.12) 0%, transparent 70%)' }} />
      <ParticleOrb style={{ width: 300, height: 300, top: '40%', left: '38%', opacity: 0.3 }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,242,254,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,254,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto w-full px-6 lg:px-16 py-20">

        {/* ── TOP BADGE ROW ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center gap-3 mb-14"
        >
          <div className="flex items-center gap-2 bg-cyber-cyan/5 border border-cyber-cyan/15 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-cyber-cyan tracking-widest uppercase">
              System Online — Polygon Amoy Testnet
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-full px-4 py-1.5">
            <Globe2 className="w-3 h-3 text-neutral-500" />
            <span className="text-[10px] font-mono text-neutral-500">
              BLR_MANUFACTURER ↔ BOM_DISTRIBUTOR corridor active
            </span>
          </div>
        </motion.div>

        {/* ── TWO-COLUMN HERO GRID ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col gap-8"
          >
            {/* Micro-label */}
            <p className="text-[11px] font-mono tracking-[0.25em] text-cyber-cyan/70 uppercase flex items-center gap-2">
              <span className="inline-block w-6 h-px bg-cyber-cyan/50" />
              Web3 Anti-Counterfeiting Platform
            </p>

            {/* Main Headline */}
            <div>
              <h1
                className="text-4xl xl:text-6xl font-extrabold leading-[1.08] tracking-tight"
                style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #c4c4c4 60%, #7a7a7a 100%)' }}
                >
                  {headline.split(' via ')[0]}
                  {headline.includes(' via ') ? (
                    <>
                      {' '}via{' '}
                      <span
                        className="bg-clip-text text-transparent glow-text-cyan"
                        style={{ backgroundImage: 'linear-gradient(135deg, #00f2fe, #00c6ff)' }}
                      >
                        AI
                      </span>
                    </>
                  ) : null}
                </span>
                <span className="inline-block w-0.5 h-10 bg-cyber-cyan align-middle ml-1 animate-pulse" />
              </h1>
              <p className="text-neutral-400 text-base leading-relaxed mt-5 max-w-lg font-sans">
                Every supplement unit cryptographically registered on Polygon. AI-powered Isolation
                Forest threat scoring intercepts counterfeit clones in real-time across the full
                Bengaluru–Mumbai supply corridor.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onEnterApp}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white font-bold text-sm tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-cyber-cyan/20"
              >
                Enter Platform <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={onEnterApp}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-neutral-300 font-semibold text-sm hover:bg-white/[0.06] hover:border-cyber-cyan/30 transition-all"
              >
                Live Scan Demo <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* ── Metric Callout Grid ────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
              {dynamicStats.map(stat => {
                const IconComp = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    whileHover={{ y: -2 }}
                    className={`glass-panel rounded-2xl p-4 border flex flex-col gap-1.5 ${accentMap[stat.accent]}`}
                  >
                    <IconComp className="w-4 h-4 opacity-70" />
                    <span className="text-2xl font-extrabold tracking-tight">{stat.value}</span>
                    <span className="text-[10px] font-mono opacity-60 uppercase tracking-widest leading-tight">{stat.label}</span>
                  </motion.div>
                );
              })}
            </div>

            {/* Tech stack micro-badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {['Polygon Amoy', 'Isolation Forest AI', 'Express + MongoDB', 'SHA-256 Hashing', 'React + Vite'].map(t => (
                <span
                  key={t}
                  className="text-[9px] font-mono tracking-widest text-neutral-500 border border-white/[0.05] rounded-full px-3 py-1 bg-white/[0.01] uppercase"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: Verification Terminal ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {/* Terminal label */}
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-cyber-cyan" />
              <span className="text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
                Live Consumer Verification Portal
              </span>
            </div>
            <VerificationTerminal />
          </motion.div>
        </div>

        {/* ── BOTTOM FEATURE ROW (Bento strip) ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 border-t border-white/[0.04] pt-12"
        >
          {[
            { icon: ShieldCheck, title: 'Zero-Trust Scan Engine', desc: 'Device-level UUID hardcap enforces a max of 3 verifications per consumer. UUID mismatch triggers instant fraud intercept.', accent: 'text-cyber-emerald' },
            { icon: Globe2,      title: 'Geo-Spatial AI Scoring', desc: 'Haversine distance + temporal delta fed into an Isolation Forest model. Impossible velocity triggers >0.95 threat scores.', accent: 'text-cyber-cyan' },
            { icon: Boxes,       title: 'Hierarchical QR Minting', desc: 'Parent → Sub-Batch → Child QR cryptographic hierarchy minted on Polygon. Each ID is SHA-256 hashed and immutably recorded.', accent: 'text-cyber-purple' },
          ].map(f => (
            <div key={f.title} className="glass-panel glass-panel-hover rounded-2xl p-5 flex flex-col gap-3">
              <f.icon className={`w-5 h-5 ${f.accent}`} />
              <h3 className="font-bold text-sm text-neutral-200 tracking-tight">{f.title}</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default LandingHero;
