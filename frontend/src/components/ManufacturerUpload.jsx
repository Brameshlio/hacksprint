import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Cpu, Download, CheckCircle2, XCircle,
  TerminalSquare, Package, Layers, AlertTriangle, Loader2,
  RefreshCw, FolderOpen, QrCode, FlaskConical, Calendar,
  Hash, ChevronRight, Sparkles
} from 'lucide-react';
import axios from 'axios';

// ── Helpers ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const parseCSVorTXT = (text) => {
  // Split by newlines and/or commas, strip empty rows and BOM
  const raw = text.replace(/^\uFEFF/, '').split(/[\r\n,]+/);
  return raw.map(s => s.trim()).filter(Boolean);
};

const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadCSV = (rows, filename) => {
  const csv  = ['childId,parentBatchId,status,cryptoHash', ...rows.map(r =>
    `${r.childId},${r.parentBatchId},${r.status},${r.cryptoHash || ''}`
  )].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Terminal Log Item ──────────────────────────────────────────────────────
const TermLog = ({ type = 'info', children }) => {
  const colors = {
    info:    'text-cyber-cyan',
    success: 'text-cyber-emerald',
    warn:    'text-amber-400',
    error:   'text-cyber-crimson',
    muted:   'text-neutral-500'
  };
  const prefixes = { info: '›', success: '✓', warn: '⚠', error: '✗', muted: '#' };
  return (
    <p className={`font-mono text-[10px] leading-relaxed ${colors[type]}`}>
      <span className="opacity-60 mr-2">{prefixes[type]}</span>{children}
    </p>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const ManufacturerUpload = ({ token }) => {
  const [activeTab, setActiveTab] = useState('generate');

  // ── Tab 1: Generate Form State ───────────────────────────────────────────
  const [genForm, setGenForm] = useState({
    batchName:       '',
    productType:     '',
    manufactureDate: today,
    expiryDate:      '',
    totalUnits:      ''
  });
  const [genLoading, setGenLoading] = useState(false);
  const [genResult,  setGenResult]  = useState(null);
  const [genLogs,    setGenLogs]    = useState([
    { type: 'muted', msg: '// Terminal ready. Awaiting batch submission...' }
  ]);

  // ── Tab 2: CSV Parser State ──────────────────────────────────────────────
  const [csvSerials,    setCsvSerials]    = useState([]);
  const [csvFileName,   setCsvFileName]   = useState('');
  const [isDragging,    setIsDragging]    = useState(false);
  const [ingestBatchId, setIngestBatchId] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestResult,  setIngestResult]  = useState(null);
  const [ingestLogs,    setIngestLogs]    = useState([
    { type: 'muted', msg: '// Drop a CSV/TXT file to begin serial ingestion...' }
  ]);
  const fileInputRef = useRef(null);

  // ── Utility: append terminal log ─────────────────────────────────────────
  const appendLog = (setter, type, msg) =>
    setter(prev => [...prev.slice(-24), { type, msg }]);

  // ── Tab 1: Form Submission ────────────────────────────────────────────────
  const handleGenSubmit = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    setGenResult(null);
    const { batchName, productType, manufactureDate, expiryDate, totalUnits } = genForm;

    appendLog(setGenLogs, 'info', `Initiating batch mint for: ${batchName}`);
    appendLog(setGenLogs, 'info', `Product: ${productType} | Units: ${totalUnits}`);

    try {
      const batchId     = `BATCH-${batchName.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`;
      const distributorId = 'DEFAULT-DIST-01';

      appendLog(setGenLogs, 'info', `Assigning Batch ID: ${batchId}`);

      const res = await axios.post('/api/batches', {
        batchId,
        productVariant:       productType,
        totalUnits:           Number(totalUnits),
        assignedDistributorId: distributorId,
        manufactureDate,
        expiryDate
      }, { headers: { Authorization: `Bearer ${token}` } });

      const { childQRs = [], polygonTxHash } = res.data;
      appendLog(setGenLogs, 'success', `Blockchain TX committed: ${polygonTxHash}`);
      appendLog(setGenLogs, 'success', `${childQRs.length} child QR identifiers minted.`);
      appendLog(setGenLogs, 'info', 'Preparing CSV export package...');

      const exportRows = childQRs.map(id => ({
        childId: id, parentBatchId: batchId, status: 'INACTIVE', cryptoHash: ''
      }));
      downloadCSV(exportRows, `${batchId}-serials.csv`);
      downloadJSON({ batchId, polygonTxHash, childQRs, manufactureDate, expiryDate, exportedAt: new Date() }, `${batchId}-manifest.json`);

      appendLog(setGenLogs, 'success', 'CSV + JSON manifest downloaded to your device.');
      setGenResult({ success: true, batchId, count: childQRs.length, txHash: polygonTxHash });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      appendLog(setGenLogs, 'error', `Batch mint failed: ${msg}`);
      setGenResult({ success: false, message: msg });
    } finally {
      setGenLoading(false);
    }
  };

  // ── Tab 2: File Parsing ───────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(ext)) {
      appendLog(setIngestLogs, 'error', `Unsupported file type: .${ext}. Only .csv and .txt accepted.`);
      return;
    }
    setCsvFileName(file.name);
    appendLog(setIngestLogs, 'info', `Reading file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const serials = parseCSVorTXT(ev.target.result);
      setCsvSerials(serials);
      appendLog(setIngestLogs, 'success', `Parsed ${serials.length} unique serial entries.`);
      appendLog(setIngestLogs, 'info', `Preview [0]: ${serials[0] || 'N/A'}`);
      if (serials[1]) appendLog(setIngestLogs, 'info', `Preview [1]: ${serials[1]}`);
      appendLog(setIngestLogs, 'muted', '// Ready to synchronize with NutriChain blockchain registry.');
    };
    reader.onerror = () => appendLog(setIngestLogs, 'error', 'File read failed. Please try again.');
    reader.readAsText(file);
  }, []);

  const onDropZoneDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── Tab 2: Bulk Ingestion Submission ─────────────────────────────────────
  const handleIngestSubmit = async () => {
    if (!csvSerials.length) return;
    if (!ingestBatchId.trim()) {
      appendLog(setIngestLogs, 'warn', 'Please enter a Batch Reference ID before submitting.');
      return;
    }
    setIngestLoading(true);
    setIngestResult(null);
    appendLog(setIngestLogs, 'info', `Forwarding ${csvSerials.length} serials to /api/batch/ingest...`);
    appendLog(setIngestLogs, 'info', `Batch Reference: ${ingestBatchId}`);

    try {
      const res = await axios.post('/api/batch/ingest', {
        serials:        csvSerials,
        batchId:        ingestBatchId.trim(),
        productVariant: 'BULK_INGESTED'
      }, { headers: { Authorization: `Bearer ${token}` } });

      const { created, skipped, txHash } = res.data;
      appendLog(setIngestLogs, 'success', `Ingestion complete. ${created} new records created.`);
      if (skipped > 0) appendLog(setIngestLogs, 'warn', `${skipped} duplicates skipped (already registered).`);
      appendLog(setIngestLogs, 'success', `Blockchain event emitted: ${txHash}`);
      setIngestResult({ success: true, created, skipped, txHash });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      appendLog(setIngestLogs, 'error', `Ingestion failed: ${msg}`);
      setIngestResult({ success: false, message: msg });
    } finally {
      setIngestLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-purple/30 to-cyber-cyan/20 border border-cyber-cyan/20 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-cyber-cyan" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-neutral-100">
            QR Batch Processing &amp; Upload Workspace
          </h1>
          <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
            Generate serialized identifiers or ingest existing serial keys into the NutriChain registry.
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        {[
          { id: 'generate', icon: Sparkles, label: 'Generate & Export' },
          { id: 'ingest',   icon: Upload,   label: 'CSV / TXT Ingestion' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
              activeTab === tab.id
                ? 'bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30 shadow-[0_0_20px_rgba(0,242,254,0.08)]'
                : 'bg-white/[0.02] text-neutral-400 border-white/[0.05] hover:text-neutral-200 hover:bg-white/[0.03]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ================================================================
            TAB 1: GENERATE & BULK EXPORT
            ================================================================ */}
        {activeTab === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Form Panel */}
            <div className="lg:col-span-3 glass-panel p-7 rounded-3xl space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-cyber-purple" />
                <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">
                  Batch Registration Metadata
                </h2>
              </div>

              <form onSubmit={handleGenSubmit} className="space-y-4">
                {/* Batch Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Batch Name / ID
                  </label>
                  <input
                    required
                    placeholder="e.g. OMEGA3-Q2-PRODUCTION-RUN"
                    value={genForm.batchName}
                    onChange={e => setGenForm(f => ({ ...f, batchName: e.target.value }))}
                    className="w-full bg-black/20 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none focus:border-cyber-cyan/40 focus:ring-1 focus:ring-cyber-cyan/20 transition-all"
                  />
                </div>

                {/* Product Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                    <FlaskConical className="w-3 h-3" /> Product Type / Variant
                  </label>
                  <input
                    required
                    placeholder="e.g. Omega-3 Fish Oil 1000mg Softgels"
                    value={genForm.productType}
                    onChange={e => setGenForm(f => ({ ...f, productType: e.target.value }))}
                    className="w-full bg-black/20 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none focus:border-cyber-cyan/40 focus:ring-1 focus:ring-cyber-cyan/20 transition-all"
                  />
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Manufacture Date
                    </label>
                    <input
                      type="date"
                      required
                      value={genForm.manufactureDate}
                      onChange={e => setGenForm(f => ({ ...f, manufactureDate: e.target.value }))}
                      className="w-full bg-black/20 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono focus:outline-none focus:border-cyber-cyan/40 focus:ring-1 focus:ring-cyber-cyan/20 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" /> Expiry Date
                    </label>
                    <input
                      type="date"
                      required
                      value={genForm.expiryDate}
                      onChange={e => setGenForm(f => ({ ...f, expiryDate: e.target.value }))}
                      className="w-full bg-black/20 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono focus:outline-none focus:border-cyber-cyan/40 focus:ring-1 focus:ring-cyber-cyan/20 transition-all"
                    />
                  </div>
                </div>

                {/* Total Units */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                    <Package className="w-3 h-3" /> Total Batch Volume (Unit Count)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="10000"
                    placeholder="e.g. 500"
                    value={genForm.totalUnits}
                    onChange={e => setGenForm(f => ({ ...f, totalUnits: e.target.value }))}
                    className="w-full bg-black/20 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none focus:border-cyber-cyan/40 focus:ring-1 focus:ring-cyber-cyan/20 transition-all"
                  />
                </div>

                {/* Result Banner */}
                <AnimatePresence>
                  {genResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs font-mono ${
                        genResult.success
                          ? 'bg-cyber-emerald/5 border-cyber-emerald/20 text-cyber-emerald'
                          : 'bg-cyber-crimson/5 border-cyber-crimson/20 text-cyber-crimson'
                      }`}
                    >
                      {genResult.success
                        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                      <div>
                        {genResult.success
                          ? <><strong>{genResult.count} QR codes minted.</strong><br />TX: {genResult.txHash}<br />CSV + JSON manifest auto-downloaded.</>
                          : <><strong>Mint failed.</strong><br />{genResult.message}</>
                        }
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={genLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-bold text-sm tracking-wide hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyber-cyan/10"
                >
                  {genLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Minting on Blockchain...</>
                    : <><Download className="w-4 h-4" /> Mint Batch &amp; Download Export</>
                  }
                </button>
              </form>
            </div>

            {/* Terminal Console */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-3xl flex flex-col border-cyber-cyan/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <TerminalSquare className="w-4 h-4 text-cyber-cyan" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Mint Terminal</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
              </div>
              <div className="flex-1 bg-black/30 rounded-2xl p-4 border border-white/[0.03] overflow-y-auto space-y-1.5 font-mono min-h-[280px] max-h-[380px]">
                <TermLog type="muted">NutriChain AI — Batch Mint Terminal v1.0</TermLog>
                <TermLog type="muted">{'─'.repeat(36)}</TermLog>
                {genLogs.map((l, i) => <TermLog key={i} type={l.type}>{l.msg}</TermLog>)}
                {genLoading && (
                  <p className="text-cyber-cyan font-mono text-[10px] animate-pulse">
                    › Processing blockchain transaction...
                  </p>
                )}
              </div>
              <button
                onClick={() => setGenLogs([{ type: 'muted', msg: '// Terminal cleared.' }])}
                className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-neutral-300 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Clear Terminal
              </button>
            </div>
          </motion.div>
        )}

        {/* ================================================================
            TAB 2: CSV / TXT INGESTION
            ================================================================ */}
        {activeTab === 'ingest' && (
          <motion.div
            key="ingest"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Left: Drop Zone + Controls */}
            <div className="lg:col-span-3 space-y-5">

              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDropZoneDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`glass-panel rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 py-14 px-8 text-center select-none ${
                  isDragging
                    ? 'border-cyber-cyan/70 bg-cyber-cyan/5 shadow-[0_0_40px_rgba(0,242,254,0.12)]'
                    : csvSerials.length
                    ? 'border-cyber-emerald/40 bg-cyber-emerald/5'
                    : 'border-white/[0.08] hover:border-cyber-cyan/30 hover:bg-cyber-cyan/[0.02]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={e => processFile(e.target.files[0])}
                />

                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                  csvSerials.length
                    ? 'bg-cyber-emerald/10 border border-cyber-emerald/20'
                    : 'bg-white/[0.03] border border-white/[0.06]'
                }`}>
                  {csvSerials.length
                    ? <CheckCircle2 className="w-8 h-8 text-cyber-emerald" />
                    : <FolderOpen className={`w-8 h-8 ${isDragging ? 'text-cyber-cyan' : 'text-neutral-500'}`} />
                  }
                </div>

                {csvSerials.length > 0 ? (
                  <>
                    <div>
                      <p className="text-cyber-emerald font-bold text-base">
                        Loaded {csvSerials.length.toLocaleString()} unique product keys to synchronize...
                      </p>
                      <p className="text-neutral-400 text-xs font-mono mt-1">{csvFileName}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setCsvSerials([]); setCsvFileName(''); }}
                      className="text-[10px] font-mono text-neutral-500 hover:text-cyber-crimson transition-all flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Clear &amp; Load New File
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-neutral-300 font-semibold text-sm">
                        {isDragging ? 'Release to import file' : 'Drag & drop your serial file here'}
                      </p>
                      <p className="text-neutral-600 text-xs font-mono mt-1.5">
                        Supported formats: .csv · .txt — one serial per line or comma-separated
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                      <ChevronRight className="w-3 h-3" /> or click to browse files
                    </div>
                  </>
                )}
              </div>

              {/* Batch Reference + Submit */}
              <div className="glass-panel p-5 rounded-3xl space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Batch Reference ID
                  </label>
                  <input
                    placeholder="e.g. OMEGA3-BULK-IMPORT-2025"
                    value={ingestBatchId}
                    onChange={e => setIngestBatchId(e.target.value)}
                    className="w-full bg-black/20 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none focus:border-cyber-emerald/40 focus:ring-1 focus:ring-cyber-emerald/20 transition-all"
                  />
                </div>

                {/* Preview strip */}
                {csvSerials.length > 0 && (
                  <div className="bg-black/20 border border-white/[0.04] rounded-xl p-3 font-mono text-[10px] text-neutral-500 space-y-1">
                    <span className="text-neutral-600">Preview (first 3 entries):</span>
                    {csvSerials.slice(0, 3).map((s, i) => (
                      <p key={i} className="text-neutral-400">[{i}] {s}</p>
                    ))}
                    {csvSerials.length > 3 && (
                      <p className="text-neutral-600">...and {csvSerials.length - 3} more.</p>
                    )}
                  </div>
                )}

                {/* Result Banner */}
                <AnimatePresence>
                  {ingestResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs font-mono ${
                        ingestResult.success
                          ? 'bg-cyber-emerald/5 border-cyber-emerald/20 text-cyber-emerald'
                          : 'bg-cyber-crimson/5 border-cyber-crimson/20 text-cyber-crimson'
                      }`}
                    >
                      {ingestResult.success
                        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                      <div>
                        {ingestResult.success
                          ? <><strong>{ingestResult.created} records registered.</strong> {ingestResult.skipped > 0 && `${ingestResult.skipped} duplicates skipped.`}<br />TX: {ingestResult.txHash}</>
                          : <><strong>Ingestion failed.</strong><br />{ingestResult.message}</>
                        }
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleIngestSubmit}
                  disabled={ingestLoading || csvSerials.length === 0}
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
                >
                  {ingestLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Synchronizing to NutriChain Registry...</>
                    : <><Cpu className="w-4 h-4" /> Synchronize {csvSerials.length > 0 ? `${csvSerials.length.toLocaleString()} Serials` : ''} to Registry</>
                  }
                </button>
              </div>
            </div>

            {/* Right: Terminal */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-3xl flex flex-col border-cyber-emerald/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <TerminalSquare className="w-4 h-4 text-cyber-emerald" />
                <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">Ingestion Terminal</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
              </div>
              <div className="flex-1 bg-black/30 rounded-2xl p-4 border border-white/[0.03] overflow-y-auto space-y-1.5 font-mono min-h-[320px] max-h-[460px]">
                <TermLog type="muted">NutriChain AI — Ingestion Parser v1.0</TermLog>
                <TermLog type="muted">{'─'.repeat(36)}</TermLog>
                {ingestLogs.map((l, i) => <TermLog key={i} type={l.type}>{l.msg}</TermLog>)}
                {ingestLoading && (
                  <p className="text-cyber-emerald font-mono text-[10px] animate-pulse">
                    › Registering serials to blockchain layer...
                  </p>
                )}
              </div>
              <button
                onClick={() => setIngestLogs([{ type: 'muted', msg: '// Terminal cleared.' }])}
                className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-neutral-300 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Clear Terminal
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ManufacturerUpload;
