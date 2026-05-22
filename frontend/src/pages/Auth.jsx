import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, KeyRound, Mail, User as UserIcon, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const getAuthErrorMessage = (error) => {
  const responseData = error.response?.data;
  return responseData?.error
    || responseData?.message
    || error.message
    || 'Gateway transmission error. Please check configurations.';
};

const Auth = ({ onLoginSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('MANUFACTURER'); // MANUFACTURER, DISTRIBUTOR, ADMIN
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    const payload = isLogin ? { email, password } : { email, password, name, role };
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });
      const { token, user } = response.data;
      
      setSuccessMessage(isLogin ? 'Access granted. Synchronizing session keys...' : 'Identity registered successfully.');
      
      setTimeout(() => {
        onLoginSuccess(token, user);
      }, 1000);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSeed = (emailSeed, passwordSeed) => {
    setEmail(emailSeed);
    setPassword(passwordSeed);
    setIsLogin(true);
  };

  const roles = [
    { id: 'MANUFACTURER', label: 'Manufacturer' },
    { id: 'DISTRIBUTOR', label: 'Distributor' },
    { id: 'ADMIN', label: 'System Admin' }
  ];

  return (
    <div className="flex items-center justify-center min-h-[75vh] px-4">
      <div className="w-full max-w-4xl glass-panel rounded-3xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Interactive Art Panel */}
        <div className="md:w-5/12 bg-gradient-to-br from-cyber-purple/30 via-cyber-dark to-cyber-cyan/15 p-8 flex flex-col justify-between border-r border-white/[0.05]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-cyber-cyan animate-pulse" />
            <span className="font-mono text-xs text-cyber-cyan font-bold tracking-widest uppercase">Secured Gateway</span>
          </div>

          <div className="my-8 md:my-0 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight Outfit bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Decentralized Supply Consensus
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed font-sans">
              Enter your cryptographically authenticated parameters to log into NutriChain's unified minting and verification ecosystem.
            </p>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.04] p-4.5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 font-semibold mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-cyber-purple" />
              <span>Sandbox Access Logins</span>
            </div>
            <div className="space-y-1.5 text-[11px] font-mono text-neutral-400">
              <button 
                onClick={() => handleQuickSeed('manufacturer@nutrichain.ai', 'manu123')}
                className="w-full text-left bg-white/[0.02] hover:bg-cyber-purple/10 border border-white/[0.05] p-1.5 rounded transition-all flex items-center justify-between"
              >
                <span>Emma (Manufacturer)</span>
                <span className="text-cyber-cyan font-semibold">Load Seed</span>
              </button>
              <button 
                onClick={() => handleQuickSeed('distributor@nutrichain.ai', 'dist123')}
                className="w-full text-left bg-white/[0.02] hover:bg-cyber-purple/10 border border-white/[0.05] p-1.5 rounded transition-all flex items-center justify-between"
              >
                <span>Dave (Distributor)</span>
                <span className="text-cyber-cyan font-semibold">Load Seed</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Active Fields Panel */}
        <div className="md:w-7/12 p-8 md:p-12 bg-cyber-surface/30">
          
          {/* Slider Tab Switcher */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex bg-neutral-900/60 p-1.5 rounded-2xl border border-white/[0.03]">
              <button
                onClick={() => { setIsLogin(true); setErrorMessage(''); }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${isLogin ? 'bg-white/[0.05] text-cyber-cyan shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setErrorMessage(''); }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${!isLogin ? 'bg-white/[0.05] text-cyber-cyan shadow-md' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Register
              </button>
            </div>

            <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-200 transition-all font-mono">
              ← Return Guest
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sliding Role Switcher - Framer Motion */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <label className="text-xs font-mono text-neutral-400 font-medium">Select System Node Role</label>
                  <div className="grid grid-cols-3 gap-2 bg-neutral-900/60 p-1.5 rounded-2xl border border-white/[0.03]">
                    {roles.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className="relative py-2.5 rounded-xl text-[11px] font-bold tracking-wide transition-all z-10 text-center"
                      >
                        {role === r.id && (
                          <motion.div
                            layoutId="activeRoleBackground"
                            className="absolute inset-0 bg-gradient-to-tr from-cyber-purple/20 to-cyber-cyan/10 border border-cyber-cyan/20 rounded-xl -z-10"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                        <span className={role === r.id ? 'text-cyber-cyan font-extrabold' : 'text-neutral-400'}>
                          {r.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* General Fields */}
            <div className="space-y-4">
              
              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-neutral-400">Full Official Name</label>
                  <div className="relative flex items-center">
                    <UserIcon className="w-4.5 h-4.5 text-neutral-500 absolute left-3.5" />
                    <input
                      type="text"
                      placeholder="e.g. Emma Vance"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="w-full cyber-input pl-11 text-sm text-neutral-200"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-neutral-400">Email Vector Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4.5 h-4.5 text-neutral-500 absolute left-3.5" />
                  <input
                    type="email"
                    placeholder="e.g. emma@nutrichain.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full cyber-input pl-11 text-sm text-neutral-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-neutral-400">Cryptographic Password Key</label>
                <div className="relative flex items-center">
                  <KeyRound className="w-4.5 h-4.5 text-neutral-500 absolute left-3.5" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full cyber-input pl-11 text-sm text-neutral-200"
                  />
                </div>
              </div>
            </div>

            {/* Error/Success Feedbacks */}
            {errorMessage && (
              <div className="flex items-center gap-2 bg-cyber-crimson/10 border border-cyber-crimson/20 p-4 rounded-2xl text-xs font-mono text-cyber-crimson leading-relaxed">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 bg-cyber-emerald/10 border border-cyber-emerald/20 p-4 rounded-2xl text-xs font-mono text-cyber-emerald leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 animate-bounce" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Trigger */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-xs tracking-wider text-black bg-gradient-to-r from-cyber-cyan to-cyber-purple hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'AUTHORIZE SESSION' : 'REGISTER PLATFORM NODE'}</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>

          </form>

        </div>

      </div>
    </div>
  );
};

export default Auth;
