import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Layers, Database, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import axios from 'axios';

const BlockchainActivity = ({ token }) => {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contractDetails, setContractDetails] = useState({
    network: 'Polygon Amoy Testnet (Proof of Stake)',
    deployedAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
    status: 'ACTIVE',
    gasPrice: '30.5 Gwei'
  });

  const fetchBlockchainLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/blockchain/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlocks(response.data);
    } catch (e) {
      console.error('Error fetching ledger logs:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainLogs();
    const interval = setInterval(fetchBlockchainLogs, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Network Overview Card */}
      <div className="glass-panel p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center">
            <Database className="w-6 h-6 text-cyber-purple animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-widest font-semibold">Ledger Target</h3>
            <p className="text-sm font-bold font-sans text-neutral-100">Polygon Amoy</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-widest font-semibold">Consensus Mechanism</h3>
          <p className="text-sm font-bold font-sans text-neutral-100">Proof of Stake (L2)</p>
        </div>

        <div className="md:col-span-2">
          <h3 className="text-xs font-mono text-neutral-400 uppercase tracking-widest font-semibold">Verified Smart Contract Anchor</h3>
          <p className="text-xs font-bold font-mono text-cyber-cyan truncate" title={contractDetails.deployedAddress}>
            {contractDetails.deployedAddress}
          </p>
        </div>

      </div>

      {/* Main Explorer layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Blocks List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyber-cyan" />
              <h2 className="text-sm font-extrabold font-mono tracking-wider uppercase text-neutral-200">On-Chain State Confirmations</h2>
            </div>
            <button
              onClick={fetchBlockchainLogs}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/[0.04] text-neutral-400 hover:text-white transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {blocks.length === 0 ? (
              <div className="glass-panel p-8 text-center font-mono text-xs text-neutral-600">
                AWAITING SUPPLY LOT EVENTS MINTING
              </div>
            ) : (
              blocks.map(block => (
                <div 
                  key={block.txHash} 
                  className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-white/[0.04] hover:border-cyber-cyan/15 hover:shadow-lg hover:shadow-cyber-cyan/[0.02] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center font-mono text-xs font-bold text-cyber-cyan shrink-0">
                      {block.blockNumber.toString().slice(-4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-200">
                          {block.action.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-mono bg-cyber-emerald/10 border border-cyber-emerald/20 text-cyber-emerald px-1.5 py-0.2 rounded font-extrabold flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" /> SECURE
                        </span>
                      </div>
                      <p className="font-mono text-[9px] text-neutral-500 mt-1 truncate max-w-[280px]" title={block.txHash}>
                        TX: {block.txHash}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end font-mono text-[10px] text-neutral-400 gap-1">
                    <div>
                      Gas Used: <span className="text-cyber-cyan font-bold">{block.gasUsed} limit</span>
                    </div>
                    <div className="text-[9px] text-neutral-500">
                      Epoch: {new Date(block.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right side Info panels */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Smart contract status card */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyber-purple" />
              <h2 className="text-xs font-extrabold font-mono tracking-wider uppercase text-neutral-200">Decentralized Trust Profile</h2>
            </div>
            
            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                <span className="text-neutral-500">Gas Oracle Baseline</span>
                <span className="text-cyber-cyan font-bold">{contractDetails.gasPrice}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                <span className="text-neutral-500">Contract ABI</span>
                <span className="text-cyber-purple font-bold">NutriChainProvenance v1</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                <span className="text-neutral-500">Verification Block confirmations</span>
                <span className="text-cyber-emerald font-bold">12 Blocks (Finalized)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">L2 State Hashing</span>
                <span className="text-white font-bold">KECCAK-256</span>
              </div>
            </div>
          </div>

          {/* Decoded Transaction Stepper Visual */}
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyber-cyan animate-pulse" />
              <h2 className="text-xs font-extrabold font-mono tracking-wider uppercase text-neutral-200">Immutable State Shifts</h2>
            </div>

            <div className="relative pl-6 border-l border-white/[0.08] space-y-4 text-xs font-sans text-neutral-400">
              
              <div className="relative">
                <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-cyber-purple flex items-center justify-center text-[9px] text-white font-bold font-mono">1</span>
                <div className="font-bold text-neutral-200">createBatch()</div>
                <p className="text-[10px] text-neutral-500 mt-0.5">Anchors parent batch metadata, variant specs, and total size.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-cyber-cyan flex items-center justify-center text-[9px] text-black font-bold font-mono">2</span>
                <div className="font-bold text-neutral-200">activateSubBatch()</div>
                <p className="text-[10px] text-neutral-500 mt-0.5">warehouse logistics JIT activate. Unit codes set to active status.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-cyber-emerald flex items-center justify-center text-[9px] text-black font-bold font-mono">3</span>
                <div className="font-bold text-neutral-200">transferCustody()</div>
                <p className="text-[10px] text-neutral-500 mt-0.5">Commits geographic verification coords and transfers final custody to consumer retail nodes.</p>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default BlockchainActivity;
