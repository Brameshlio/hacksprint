import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Brain, Activity, Cpu, LogOut, ScanLine, User as UserIcon } from 'lucide-react';
import Auth from './pages/Auth';
import ManufacturerDashboard from './pages/ManufacturerDashboard';
import AiFraudDashboard from './pages/AiFraudDashboard';
import BlockchainActivity from './pages/BlockchainActivity';
import ConsumerVerification from './pages/ConsumerVerification';
import ErrorBoundary from './components/ErrorBoundary';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('consumer'); // defaults to consumer scan page so Frank can scan immediately
  const [networkStatus, setNetworkStatus] = useState('polygon-amoy'); // visual Amoy Testnet ledger status indicator
  const [walletAddress, setWalletAddress] = useState('0x71C7...476B');
  const [sandboxMode, setSandboxMode] = useState(false);

  // Poll server sandbox and persistence status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/dev/status');
        setSandboxMode(res.data.sandboxActive);
      } catch (err) {
        console.warn('⚠️ Could not fetch backend simulation status:', err.message);
        setSandboxMode(true);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Attempt auto-login if token is cached
  useEffect(() => {
    const cachedToken = localStorage.getItem('nutrichain_token');
    const cachedUser = localStorage.getItem('nutrichain_user');
    if (cachedToken && cachedUser) {
      setToken(cachedToken);
      setUser(JSON.parse(cachedUser));
      setActiveTab('manufacturer'); // default to dashboard if signed in
    }
  }, []);

  const handleLogin = (jwtToken, loggedUser) => {
    setToken(jwtToken);
    setUser(loggedUser);
    localStorage.setItem('nutrichain_token', jwtToken);
    localStorage.setItem('nutrichain_user', JSON.stringify(loggedUser));
    
    if (loggedUser.role === 'MANUFACTURER' || loggedUser.role === 'ADMIN') {
      setActiveTab('manufacturer');
    } else {
      setActiveTab('ai-intelligence');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nutrichain_token');
    localStorage.removeItem('nutrichain_user');
    setActiveTab('consumer');
  };

  // Nav configuration
  const navigationItems = [
    { id: 'consumer', label: 'Consumer Verification', icon: ScanLine, roles: ['ANY'] },
    { id: 'manufacturer', label: 'Manufacturer Terminal', icon: LayoutDashboard, roles: ['MANUFACTURER', 'ADMIN'] },
    { id: 'ai-intelligence', label: 'AI Threat Hub', icon: Brain, roles: ['MANUFACTURER', 'DISTRIBUTOR', 'ADMIN'] },
    { id: 'blockchain', label: 'On-Chain Ledger', icon: Activity, roles: ['MANUFACTURER', 'DISTRIBUTOR', 'ADMIN'] }
  ];

  return (
    <div className="min-h-screen flex flex-col selection:bg-cyber-cyan selection:text-black">
      
      {/* ------------------------------------------------------------------------
          GLOBAL NAVIGATION HEADER
          ------------------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 bg-cyber-dark/80 backdrop-blur-md border-b border-white/[0.05] px-6 py-4 flex items-center justify-between">
        
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyber-purple to-cyber-cyan flex items-center justify-center shadow-lg shadow-cyber-cyan/10">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              NUTRICHAIN <span className="text-cyber-cyan font-semibold">AI</span>
            </h1>
            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Provenance Assurance Platform</p>
          </div>
        </div>

        {/* Global Telemetry Gauges */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
          
          {/* Network / Sandbox Fallback LED Indicator */}
          {sandboxMode ? (
            <div className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-full px-3.5 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px] animate-pulse">SANDBOX FALLBACK MODE ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
              <span className="text-neutral-400">Ledger:</span>
              <span className="text-cyber-cyan font-bold uppercase">{networkStatus.replace('-', ' ')}</span>
            </div>
          )}

          {/* Connected Admin Node Wallet */}
          <div className="flex items-center gap-2.5 bg-white/[0.02] border border-white/[0.05] rounded-full px-3 py-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyber-purple" />
            <span className="text-neutral-400">Node Wallet:</span>
            <span className="text-neutral-300 font-bold">{user ? walletAddress : 'GUEST MODE'}</span>
          </div>

        </div>

        {/* Session / User Control */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3.5 bg-white/[0.02] border border-white/[0.05] pl-3.5 pr-2 py-1 rounded-xl">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-neutral-200">{user.name}</span>
                <span className="text-[9px] font-mono text-cyber-cyan tracking-wider font-semibold uppercase">{user.role}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-cyber-crimson/10 text-neutral-400 hover:text-cyber-crimson transition-all"
                title="Logout Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            activeTab !== 'auth' && (
              <button
                onClick={() => setActiveTab('auth')}
                className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-cyan hover:brightness-110 active:scale-95 transition-all text-white shadow-lg shadow-cyber-cyan/15"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Partner Portal
              </button>
            )
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------------
          GLOBAL TABS CONTROLLER (SUB-BAR)
          ------------------------------------------------------------------------ */}
      <div className="bg-cyber-dark/40 border-b border-white/[0.03] px-6 py-2 flex items-center gap-2 overflow-x-auto">
        {navigationItems.map(item => {
          // Check role restrictions
          const isAllowed = item.roles.includes('ANY') || (user && (item.roles.includes(user.role) || user.role === 'ADMIN'));
          if (!isAllowed) return null;

          const IconComponent = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all ${
                isActive 
                  ? 'bg-white/[0.04] text-cyber-cyan border border-white/[0.08] glow-text-cyan' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.01]'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-cyber-cyan' : 'text-neutral-400'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------------
          MAIN DATA ARENA
          ------------------------------------------------------------------------ */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
        <ErrorBoundary>
          {activeTab === 'auth' && !user && (
            <Auth onLoginSuccess={handleLogin} onCancel={() => setActiveTab('consumer')} />
          )}
          
          {activeTab === 'consumer' && (
            <ConsumerVerification />
          )}

          {activeTab === 'manufacturer' && user && (
            <ManufacturerDashboard token={token} user={user} />
          )}

          {activeTab === 'ai-intelligence' && user && (
            <AiFraudDashboard token={token} />
          )}

          {activeTab === 'blockchain' && user && (
            <BlockchainActivity token={token} />
          )}
        </ErrorBoundary>
      </main>

      {/* Live Cyber Ticker Footer */}
      <footer className="bg-cyber-dark border-t border-white/[0.03] px-6 py-3 flex items-center justify-between text-[10px] font-mono text-white/30">
        <div>NUTRICHAIN PROVENANCE CORE v1.0.0</div>
        <div>ACTIVE THREAT SHIELD CONFIGURED</div>
      </footer>
    </div>
  );
}

export default App;
