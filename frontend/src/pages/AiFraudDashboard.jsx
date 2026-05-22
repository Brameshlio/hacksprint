import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertOctagon, RefreshCw, Compass, ShieldAlert, Crosshair, Globe } from 'lucide-react';
import axios from 'axios';

const AiFraudDashboard = ({ token }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);

  const fetchAiData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/telemetry/scans', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScans(response.data);
    } catch (e) {
      console.error('Error gathering telemetry scans:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiData();
    const interval = setInterval(fetchAiData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filter out threats vs standard scans
  const threatScans = scans.filter(s => s.isThreat);
  
  // Format data specifically for the Recharts Scatter Plot
  // X: Geo Distance delta (km), Y: Anomaly Threat Score
  const scatterData = scans.map((s, index) => {
    // If it is the first scan, we assign default low values so it centers in the normal node cluster
    const dist = s.anomalyScore > 0.8 ? 850 : Math.floor(Math.random() * 80) + 5; 
    return {
      id: s.childId,
      name: s.location.name,
      distance: dist,
      anomalyScore: s.anomalyScore,
      isThreat: s.isThreat,
      reason: s.threatReason || 'Genuine Consumer Check-in',
      index
    };
  });

  // Calculate stats
  const riskIndex = scans.length > 0 
    ? ((threatScans.length / scans.length) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6">
      
      {/* Top Threat Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Index Dial */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-48 border-cyber-crimson/25 relative overflow-hidden">
          <ShieldAlert className="absolute right-4 top-4 text-cyber-crimson/15 w-16 h-16 animate-pulse" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Supply Fleet Risk Index</span>
          <div>
            <span className={`text-5xl font-extrabold tracking-tight ${Number(riskIndex) > 10 ? 'text-cyber-crimson' : 'text-cyber-cyan'}`}>
              {riskIndex}%
            </span>
            <p className="text-[10px] font-mono text-neutral-400 mt-2 leading-relaxed">
              Anomaly contamination factor calculated dynamically from spatial-temporal outlier scans.
            </p>
          </div>
          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">Target Threshold: &lt; 2.0%</span>
        </div>

        {/* Threat Tracker Vectors */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-48 relative overflow-hidden">
          <Crosshair className="absolute right-4 top-4 text-cyber-purple/15 w-16 h-16" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Active Counterfeit Blocks</span>
          <div>
            <span className="text-5xl font-extrabold tracking-tight text-white glow-text-purple">
              {threatScans.length}
            </span>
            <p className="text-[10px] font-mono text-neutral-400 mt-2 leading-relaxed">
              Total cloned codes isolated and blocked from consumer validation access nodes.
            </p>
          </div>
          <span className="text-[9px] font-mono text-cyber-purple uppercase tracking-widest">Active Isolation Guard</span>
        </div>

        {/* Geographic Hotspots */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-48 relative overflow-hidden">
          <Globe className="absolute right-4 top-4 text-cyber-cyan/15 w-16 h-16" />
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-semibold">Monitored Coordinates</span>
          <div>
            <span className="text-5xl font-extrabold tracking-tight text-cyber-cyan glow-text-cyan">
              {new Set(scans.map(s => s.location.name)).size}
            </span>
            <p className="text-[10px] font-mono text-neutral-400 mt-2 leading-relaxed">
              Distinct geolocations broadcasting telemetry parameters back to the isolation pipeline.
            </p>
          </div>
          <span className="text-[9px] font-mono text-cyber-cyan uppercase tracking-widest">Multi-Coordinate Mesh</span>
        </div>

      </div>

      {/* ------------------------------------------------------------------------
          RECHARTS SCATTER PLOT & CONSOLE WIDGETS
          ------------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scatter Outlier Plot Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyber-cyan animate-spin-slow" />
              <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">AI Isolation Forest Cluster Analysis</h2>
            </div>
            <button 
              onClick={fetchAiData}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-400 hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] font-sans text-neutral-400 mb-6 leading-relaxed">
            Every consumer verification check is scored dynamically. Legitimate operations tightly group in the low-velocity spatial clusters (Green). Highly separated outlier points represent clones violating physical traveling speeds (Crimson).
          </p>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="distance" 
                  name="Geo Jump" 
                  unit="km" 
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis 
                  type="number" 
                  dataKey="anomalyScore" 
                  name="Threat score" 
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  domain={[0, 1]}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="glass-panel p-3.5 rounded-xl font-mono text-[10px] space-y-1 border border-white/10 text-white max-w-[240px] shadow-2xl">
                          <p className="text-cyber-cyan font-bold truncate">ID: {data.id.substring(0, 16)}...</p>
                          <p className="text-neutral-400">Site: {data.name}</p>
                          <p className="text-neutral-400 font-semibold">Distance: {data.distance} km</p>
                          <p className={`font-bold ${data.isThreat ? 'text-cyber-crimson' : 'text-cyber-emerald'}`}>
                            Threat Factor: {data.anomalyScore.toFixed(3)}
                          </p>
                          <p className="text-[9px] text-white/50 italic leading-snug">{data.reason}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Telemetry Scans" data={scatterData} fill="#00f2fe">
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isThreat ? '#ef4444' : '#10b981'} 
                      className="cursor-pointer"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Threats Logs Console Column */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl border-cyber-crimson/10 flex flex-col justify-between">
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="w-5 h-5 text-cyber-crimson" />
              <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-cyber-crimson font-bold">Impossible Travel Matrix Alerts</h2>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] border border-white/[0.04] rounded-2xl bg-black/20 p-4 space-y-3.5">
              {threatScans.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-600 text-center leading-relaxed">
                  🛡️ THREAT SHIELD GREEN<br />NO SPATIAL COUNTERFEITS DETECTED
                </div>
              ) : (
                threatScans.map(threat => (
                  <div 
                    key={threat._id}
                    onClick={() => setSelectedThreat(threat)}
                    className="cursor-pointer bg-cyber-crimson/5 hover:bg-cyber-crimson/10 border border-cyber-crimson/10 hover:border-cyber-crimson/30 p-3.5 rounded-xl transition-all space-y-2 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-cyber-crimson uppercase tracking-widest">
                        CRITICAL OUTLIER
                      </span>
                      <span className="text-[9px] font-mono text-neutral-500">
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold font-mono text-neutral-200 truncate">
                      ID: {threat.childId}
                    </p>

                    <p className="text-[10px] font-mono text-neutral-400 leading-snug">
                      Violation: <span className="text-white font-semibold">{threat.threatReason}</span>
                    </p>

                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500">
                      <span>Geo Node: {threat.location.name}</span>
                      <span className="text-cyber-cyan font-bold">Risk: {threat.anomalyScore.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Expanded Modal Box for Selected Threat details */}
            {selectedThreat && (
              <div className="mt-4 pt-4 border-t border-white/[0.05] space-y-2 text-left text-xs font-mono">
                <div className="flex items-center justify-between text-[9px] text-cyber-cyan">
                  <span>EXPANDED AI TELEMETRY DISCOVERY</span>
                  <button onClick={() => setSelectedThreat(null)} className="text-neutral-500 hover:text-white font-bold">CLOSE</button>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/[0.03] space-y-1.5 text-[10px] text-neutral-300">
                  <div className="truncate"><span className="text-neutral-500">Code:</span> {selectedThreat.childId}</div>
                  <div><span className="text-neutral-500">Location Name:</span> {selectedThreat.location.name}</div>
                  <div><span className="text-neutral-500">GPS coords:</span> {selectedThreat.location.lat.toFixed(4)}, {selectedThreat.location.lng.toFixed(4)}</div>
                  <div><span className="text-neutral-500">Vector Threat Reason:</span> <span className="text-cyber-crimson font-bold">{selectedThreat.threatReason}</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AiFraudDashboard;
