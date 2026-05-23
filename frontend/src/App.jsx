import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Activity, Clock, FileDigit, Cpu, HardDrive, BarChart2, Terminal, TrendingUp, Zap, CheckCircle2, XCircle, ChevronRight, Server, Layers, Monitor, AlertTriangle, Trash2, TableProperties } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Area, ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import AlgorithmVisualizer from './AlgorithmVisualizer';

const ALGO_META = {
  serial:  { color: '#6366F1', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', label: 'Serial',  icon: Server },
  openmp:  { color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'OpenMP', icon: Layers },
  mpi:     { color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'MPI', icon: Cpu },
  cuda:    { color: '#EC4899', bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700', label: 'CUDA', icon: Zap },
  hybrid:  { color: '#8B5CF6', bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', label: 'Hybrid (CPU+GPU)', icon: Activity },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-xl border border-slate-200 rounded-xl p-3 text-xs">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}:</span>
            <span className="font-semibold text-slate-800">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function MetricCard({ icon: Icon, label, value, unit, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`inline-flex p-2 rounded-xl mb-3`} style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </p>
    </motion.div>
  );
}

function App() {
  const [algorithm, setAlgorithm] = useState('serial');
  const [threads, setThreads] = useState(4);
  const [processes, setProcesses] = useState(4);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [currentOutput, setCurrentOutput] = useState('');
  const [activeTab, setActiveTab]       = useState('bar');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [osInfo, setOsInfo]             = useState(null);
  const [toasts, setToasts]             = useState([]); // {id, type, message}

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const clearResults = () => {
    setResults([]);
    setCurrentOutput('');
    showToast('info', 'All results cleared.');
  };

  const pingBackend = async () => {
    setBackendStatus('checking');
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/status', { timeout: 3000 });
      setOsInfo(res.data);
      setBackendStatus('connected');
    } catch {
      setOsInfo(null);
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    pingBackend();
    const interval = setInterval(pingBackend, 10000); // re-check every 10s
    return () => clearInterval(interval);
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setCurrentOutput('Initializing process...\n');
    try {
      const params = {};
      if (algorithm === 'openmp') params.threads = Number(threads);
      if (algorithm === 'mpi')    params.processes = Number(processes);

      const response = await axios.post('http://127.0.0.1:5000/api/run', { algorithm, params });
      const data = response.data;

      setCurrentOutput(data.stdout || data.stderr || 'No output generated.');

      if (data.status === 'success') {
        setResults(prev => [
          ...prev,
          {
            name: `${algorithm.toUpperCase()}${algorithm === 'openmp' ? ` (${threads}T)` : algorithm === 'mpi' ? ` (${processes}P)` : ''}`,
            time: Number(data.execution_time.toFixed(4)),
            throughput: Number(data.throughput_mb_s.toFixed(2)),
            rmse: data.rmse,
            algorithm,
            threads: algorithm === 'openmp' ? Number(threads) : null,
            processes: algorithm === 'mpi' ? Number(processes) : null,
            gpu_time_ms: data.gpu_time_ms ?? null,
            cpu_time_ms: data.cpu_time_ms ?? null,
          },
        ]);
        showToast('success', `${algorithm.toUpperCase()} completed in ${data.execution_time.toFixed(3)}s`);
      } else {
        setCurrentOutput(prev => prev + `\n\n⚠ Error: ${data.error || 'Execution failed'}`);
        showToast('error', `${algorithm.toUpperCase()} execution failed.`);
      }
    } catch (err) {
      setCurrentOutput(prev => prev + `\n\n✘ Connection error: ${err.message}`);
      showToast('error', `Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentResult = results.length > 0 ? results[results.length - 1] : null;
  const serialResult  = results.find(r => r.algorithm === 'serial');
  const hasOpenMP = results.some(r => r.algorithm === 'openmp');
  const hasMPI    = results.some(r => r.algorithm === 'mpi');
  const ompData   = results.filter(r => r.algorithm === 'openmp').sort((a, b) => a.threads - b.threads);

  // Efficiency = (SerialTime / ParallelTime) / Workers  × 100%
  const efficiencyData = (() => {
    if (!serialResult) return [];
    const T_s = serialResult.time;
    // Collect all OpenMP + MPI runs, key by worker count
    const map = {};
    results.filter(r => r.algorithm === 'openmp' && r.threads).forEach(r => {
      const key = r.threads;
      const eff = Number(((T_s / r.time) / r.threads * 100).toFixed(1));
      if (!map[key] || map[key].omp === undefined) map[key] = { ...map[key], workers: key, omp: eff };
    });
    results.filter(r => r.algorithm === 'mpi' && r.processes).forEach(r => {
      const key = r.processes;
      const eff = Number(((T_s / r.time) / r.processes * 100).toFixed(1));
      map[key] = { ...map[key], workers: key, mpi: eff };
    });
    return Object.values(map).sort((a, b) => a.workers - b.workers);
  })();
  const hasEfficiency = efficiencyData.length > 0;

  const algos = ['serial', 'openmp', 'mpi', 'cuda', 'hybrid'];

  const tabs = [
    { id: 'bar',        label: 'Comparison',     icon: BarChart2 },
    { id: 'line',       label: 'Thread Scaling',  icon: TrendingUp },
    { id: 'efficiency', label: 'Efficiency',      icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-lg tracking-tight">HPC Analysis Dashboard</span>
            <span className="text-slate-300 text-lg">|</span>
            <span className="text-sm text-slate-400">XOR Encryption Benchmark</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Backend Status */}
            {backendStatus === 'checking' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                <span className="text-xs text-slate-500 font-medium">Connecting...</span>
              </div>
            )}
            {backendStatus === 'connected' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-medium">Backend Online</span>
              </div>
            )}
            {backendStatus === 'offline' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-red-600 font-medium">Backend Offline</span>
              </div>
            )}

            {/* OS Indicator */}
            {osInfo && (
              osInfo.is_windows ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200" title={osInfo.warning}>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-amber-700 font-medium">Windows — Limited Execution</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <Monitor className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-medium">{osInfo.os} — Full Support</span>
                </div>
              )
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-[1920px] mx-auto px-6 py-8 space-y-6">

        {/* Stats overview row */}
        {currentResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={Clock}     label="Execution Time" value={`${currentResult.time}s`} color="#6366F1" delay={0} />
            <MetricCard icon={HardDrive} label="Throughput"     value={currentResult.throughput} unit="MB/s" color="#10B981" delay={0.05} />
            <MetricCard icon={FileDigit} label="RMSE Accuracy"  value={currentResult.rmse === 0 ? '0.0000' : currentResult.rmse.toFixed(4)} color={currentResult.rmse === 0 ? '#10B981' : '#EF4444'} delay={0.1} />
            <MetricCard icon={Cpu}       label="Algorithm"      value={ALGO_META[currentResult.algorithm].label} color={ALGO_META[currentResult.algorithm].color} delay={0.15} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* ── Left Panel ── */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-500" /> Execution Controls
              </h2>

              {/* Algorithm Selector */}
              <div className="space-y-2 mb-6">
                <p className="text-xs font-medium text-slate-400 mb-3">Select Algorithm</p>
                {algos.map(alg => {
                  const meta = ALGO_META[alg];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={alg}
                      onClick={() => setAlgorithm(alg)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        algorithm === alg
                          ? `${meta.bg} ${meta.border} text-slate-800 shadow-sm`
                          : 'border-transparent text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: algorithm === alg ? meta.color : '#E2E8F0' }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: algorithm === alg ? 'white' : '#94A3B8' }} />
                      </div>
                      <span>{meta.label}</span>
                      {algorithm === alg && <ChevronRight className="w-4 h-4 ml-auto" style={{ color: meta.color }} />}
                    </button>
                  );
                })}
              </div>

              {/* Parameters */}
              <AnimatePresence>
                {algorithm === 'openmp' && (
                  <motion.div key="threads" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5">
                    <label className="block text-xs font-medium text-slate-500 mb-2">Number of Threads</label>
                    <input type="number" min="1" max="64" value={threads} onChange={e => setThreads(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white" />
                    <p className="text-xs text-slate-400 mt-1.5">Recommended: 2, 4, 8, 16</p>
                  </motion.div>
                )}
                {algorithm === 'mpi' && (
                  <motion.div key="procs" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-5">
                    <label className="block text-xs font-medium text-slate-500 mb-2">MPI Processes</label>
                    <input type="number" min="1" max="64" value={processes} onChange={e => setProcesses(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleRun}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: loading ? '#94A3B8' : `linear-gradient(135deg, ${ALGO_META[algorithm].color}, ${ALGO_META[algorithm].color}cc)` }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Play className="w-4 h-4" /> Run Simulation</>
                )}
              </button>
            </div>

            {/* Run History */}
            {results.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Run History</h2>
                  <button onClick={clearResults}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-all">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {[...results].reverse().map((r, i) => {
                    const meta = ALGO_META[r.algorithm];
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>{r.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {r.rmse === 0 ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className="text-xs text-slate-600 font-semibold tabular-nums">{r.time}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Panel ── */}
          <div className="xl:col-span-9 space-y-4">

            {/* Chart Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 pt-5 flex items-center justify-between">
                <div className="flex gap-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      disabled={
                        (tab.id === 'line' && !hasOpenMP) ||
                        (tab.id === 'efficiency' && !hasEfficiency)
                      }
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                        activeTab === tab.id
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                {!hasOpenMP && (
                  <p className="text-xs text-slate-400 italic pb-2">Run OpenMP/MPI to enable Thread Scaling & Efficiency charts</p>
                )}
              </div>

              <div className="p-6 h-72">
                {activeTab === 'bar' && (
                  results.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={results} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="time" name="Time (s)" radius={[6, 6, 0, 0]} maxBarSize={48}
                          fill="url(#barGradient)" />
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" />
                            <stop offset="100%" stopColor="#8B5CF6" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                      <BarChart2 className="w-10 h-10 text-slate-200" />
                      <p className="text-sm">Run a simulation to see performance data</p>
                    </div>
                  )
                )}

                {activeTab === 'line' && hasOpenMP && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={ompData} margin={{ top: 4, right: 20, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="timeArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="throughputArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="threads" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}T`} />
                      <YAxis yAxisId="left"  tick={{ fill: '#6366F1', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: '#10B981', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} labelFormatter={v => `${v} Threads`} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Area yAxisId="left"  type="monotone" dataKey="time"       name="Time (s)"       stroke="#6366F1" strokeWidth={2} fill="url(#timeArea)" dot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7 }} />
                      <Area yAxisId="right" type="monotone" dataKey="throughput" name="Throughput (MB/s)" stroke="#10B981" strokeWidth={2} fill="url(#throughputArea)" dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
                {activeTab === 'efficiency' && hasEfficiency && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={efficiencyData} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ompEffArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="mpiEffArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="workers"
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => `${v} workers`}
                      />
                      <YAxis
                        domain={[0, 110]}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        axisLine={false} tickLine={false}
                        tickFormatter={v => `${v}%`}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        labelFormatter={v => `${v} Workers`}
                        formatter={(val) => [`${val}%`]}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      {/* Ideal 100% reference line */}
                      <ReferenceLine y={100} stroke="#E2E8F0" strokeDasharray="5 5" label={{ value: 'Ideal 100%', position: 'right', fontSize: 10, fill: '#94A3B8' }} />
                      {/* 50% warning zone line */}
                      <ReferenceLine y={50}  stroke="#FCA5A5" strokeDasharray="4 4" label={{ value: '50% threshold', position: 'right', fontSize: 10, fill: '#F87171' }} />
                      {efficiencyData.some(d => d.omp !== undefined) && (
                        <Area
                          type="monotone" dataKey="omp" name="OpenMP Efficiency (%)"
                          stroke="#10B981" strokeWidth={2.5} fill="url(#ompEffArea)"
                          dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7 }}
                        />
                      )}
                      {efficiencyData.some(d => d.mpi !== undefined) && (
                        <Area
                          type="monotone" dataKey="mpi" name="MPI Efficiency (%)"
                          stroke="#F59E0B" strokeWidth={2.5} fill="url(#mpiEffArea)"
                          dot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 7 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}

                {activeTab === 'efficiency' && !hasEfficiency && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Activity className="w-10 h-10 text-slate-200" />
                    <p className="text-sm text-center">Run <span className="font-semibold text-emerald-500">OpenMP</span> or <span className="font-semibold text-amber-500">MPI</span> with serial baseline to compute efficiency</p>
                  </div>
                )}
              </div>
            </div>

            {/* RMSE & Analysis Cards */}
            {results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Integrity (RMSE)</h3>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${currentResult.rmse === 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {currentResult.rmse === 0 ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-bold ${currentResult.rmse === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {currentResult.rmse === 0 ? 'Perfect Accuracy' : 'Data Mismatch'}
                      </p>
                      <p className={`text-xs ${currentResult.rmse === 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        RMSE = {currentResult.rmse.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Speedup vs Serial</h3>
                  {(() => {
                    const serial = results.find(r => r.algorithm === 'serial');
                    if (!serial || currentResult.algorithm === 'serial') return (
                      <p className="text-sm text-slate-400 italic">Run serial first to compare.</p>
                    );
                    const speedup = (serial.time / currentResult.time).toFixed(2);
                    return (
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-slate-800">{speedup}<span className="text-lg font-normal text-slate-400">×</span></span>
                        <span className="text-xs text-slate-400 mb-1">faster than serial</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Best Recorded Run</h3>
                  {(() => {
                    const best = results.reduce((a, b) => a.time < b.time ? a : b);
                    const meta = ALGO_META[best.algorithm];
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${meta.color}20` }}>
                          <Zap className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{best.time}s</p>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${meta.badge}`}>{best.name}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Hybrid Breakdown Card */}
            {currentResult?.algorithm === 'hybrid' && currentResult.gpu_time_ms !== null && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5"
              >
                <h3 className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Hybrid CPU + GPU Breakdown
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-pink-50 border border-pink-100 text-center">
                    <p className="text-xs text-pink-400 font-medium mb-1">GPU Time</p>
                    <p className="text-2xl font-bold text-pink-700">{currentResult.gpu_time_ms.toFixed(3)}<span className="text-sm font-normal text-pink-400 ml-1">ms</span></p>
                    <p className="text-xs text-pink-400 mt-1">50% of data (GPU chunk)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
                    <p className="text-xs text-indigo-400 font-medium mb-1">CPU Time</p>
                    <p className="text-2xl font-bold text-indigo-700">{currentResult.cpu_time_ms.toFixed(3)}<span className="text-sm font-normal text-indigo-400 ml-1">ms</span></p>
                    <p className="text-xs text-indigo-400 mt-1">50% of data (CPU chunk)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 text-center">
                    <p className="text-xs text-violet-400 font-medium mb-1">GPU / CPU Ratio</p>
                    <p className="text-2xl font-bold text-violet-700">
                      {currentResult.cpu_time_ms > 0
                        ? `${(currentResult.gpu_time_ms / currentResult.cpu_time_ms).toFixed(2)}×`
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-violet-400 mt-1">{currentResult.gpu_time_ms < currentResult.cpu_time_ms ? 'GPU faster' : 'CPU faster'}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Process Console */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Process Console</span>
                <div className="flex gap-1.5 ml-auto">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="bg-slate-950 p-5 h-52 overflow-auto font-mono text-sm">
                {currentOutput ? (
                  <pre className="whitespace-pre-wrap text-slate-300 leading-relaxed">{currentOutput}</pre>
                ) : (
                  <span className="text-slate-600 italic text-xs">$ Waiting for process execution...</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Algorithm Visualizer — full width */}
        <AlgorithmVisualizer />

        {/* ── Results Table ── */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800">Full Results Table</h2>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{results.length} runs</span>
              </div>
              <button onClick={clearResults}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all font-medium border border-red-200">
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['#','Algorithm','Workers','Time (s)','Throughput (MB/s)','RMSE','Speedup','Integrity'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const meta = ALGO_META[r.algorithm];
                    const speedup = serialResult && r.algorithm !== 'serial'
                      ? (serialResult.time / r.time).toFixed(2) : '—';
                    const workers = r.threads ?? r.processes ?? 1;
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>{r.name}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-600 tabular-nums text-xs">{workers}</td>
                        <td className="px-5 py-3 font-bold text-slate-800 tabular-nums">{r.time}</td>
                        <td className="px-5 py-3 text-slate-600 tabular-nums">{r.throughput}</td>
                        <td className="px-5 py-3 text-slate-600 tabular-nums font-mono text-xs">{r.rmse.toFixed(4)}</td>
                        <td className="px-5 py-3">
                          {speedup !== '—'
                            ? <span className={`font-bold tabular-nums ${Number(speedup) >= 1 ? 'text-emerald-600' : 'text-red-500'}`}>{speedup}×</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          {r.rmse === 0
                            ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Pass</span>
                            : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="w-3.5 h-3.5" />Fail</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── Toast Notifications ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.22 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto max-w-xs ${
                toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
                                           'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {toast.type === 'error'   && <XCircle      className="w-4 h-4 text-red-500 shrink-0" />}
              {toast.type === 'info'    && <Activity     className="w-4 h-4 text-blue-500 shrink-0" />}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default App;
