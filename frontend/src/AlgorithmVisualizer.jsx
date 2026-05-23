import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const N = 48; // number of data blocks to visualize
const COLORS = ['#6366F1','#10B981','#F59E0B','#EC4899','#8B5CF6','#06B6D4','#EF4444','#84CC16'];

const ALGOS = {
  serial: {
    label: 'Serial', color: '#6366F1',
    description: 'A single CPU thread processes data byte-by-byte, sequentially from start to end.',
    workers: 1, totalSteps: N + 2,
  },
  openmp: {
    label: 'OpenMP', color: '#10B981',
    description: 'Data is split into equal chunks. Multiple CPU threads process their chunk simultaneously in shared memory.',
    workers: 4, totalSteps: Math.ceil(N / 4) + 2,
  },
  mpi: {
    label: 'MPI', color: '#F59E0B',
    description: 'Root process scatters data to independent ranks. Each rank owns its chunk in separate memory space.',
    workers: 4, totalSteps: 4 + Math.ceil(N / 4) + 2,
  },
  cuda: {
    label: 'CUDA', color: '#EC4899',
    description: 'Data is split into thread blocks. Thousands of GPU threads in each block execute the XOR kernel in parallel.',
    workers: 6, totalSteps: 6 + 2,
  },
  hybrid: {
    label: 'Hybrid (CPU+GPU)', color: '#8B5CF6',
    description: 'File split 50/50: GPU processes first half via CUDA, CPU processes second half simultaneously.',
    workers: 2, totalSteps: Math.ceil(N / 2) + 2,
  },
};

function computeState(algo, step) {
  const blocks = Array.from({ length: N }, (_, i) => ({ id: i, status: 'idle', color: '#E2E8F0', worker: -1 }));

  if (algo === 'serial') {
    const cur = Math.min(step, N - 1);
    blocks.forEach((b, i) => {
      if (i < cur)       { b.status = 'done';   b.color = '#6366F1'; b.worker = 0; }
      else if (i === cur){ b.status = 'active'; b.color = '#A5B4FC'; b.worker = 0; }
    });

  } else if (algo === 'openmp') {
    const W = 4, chunk = Math.ceil(N / W);
    for (let t = 0; t < W; t++) {
      const s = t * chunk, e = Math.min(s + chunk, N);
      for (let i = s; i < e; i++) {
        const local = i - s, prog = Math.min(step, chunk);
        if (local < prog)       { blocks[i].status = 'done';   blocks[i].color = COLORS[t]; }
        else if (local === prog){ blocks[i].status = 'active'; blocks[i].color = COLORS[t] + 'AA'; }
        blocks[i].worker = t;
      }
    }

  } else if (algo === 'mpi') {
    const W = 4, chunk = Math.ceil(N / W);
    const scatterDone = Math.min(step, W);
    // Scatter phase: colour assigned chunks
    for (let t = 0; t < scatterDone; t++) {
      const s = t * chunk, e = Math.min(s + chunk, N);
      for (let i = s; i < e; i++) { blocks[i].color = COLORS[t]; blocks[i].worker = t; blocks[i].status = 'done'; }
    }
    // Highlight currently scattering rank
    if (step < W) {
      const s = step * chunk, e = Math.min(s + chunk, N);
      for (let i = s; i < e; i++) blocks[i].status = 'active';
    }
    // Processing phase after scatter
    if (step >= W) {
      const localStep = step - W;
      for (let t = 0; t < W; t++) {
        const s = t * chunk, e = Math.min(s + chunk, N);
        for (let i = s; i < e; i++) {
          const local = i - s, prog = Math.min(localStep, chunk);
          blocks[i].status = local < prog ? 'done' : local === prog ? 'active' : 'done';
        }
      }
    }

  } else if (algo === 'cuda') {
    const TPB = 8, numBlocks = Math.ceil(N / TPB);
    for (let b = 0; b < numBlocks; b++) {
      const s = b * TPB, e = Math.min(s + TPB, N);
      for (let i = s; i < e; i++) {
        if (b < step)       { blocks[i].status = 'done';   blocks[i].color = '#EC4899'; }
        else if (b === step){ blocks[i].status = 'active'; blocks[i].color = '#F9A8D4'; }
        blocks[i].worker = b;
      }
    }

  } else if (algo === 'hybrid') {
    const half = Math.floor(N / 2);
    const prog = Math.min(step, half);
    // GPU — first half (pink)
    for (let i = 0; i < half; i++) {
      if (i < prog)       { blocks[i].status = 'done';   blocks[i].color = '#EC4899'; }
      else if (i === prog){ blocks[i].status = 'active'; blocks[i].color = '#F9A8D4'; }
      blocks[i].worker = 0;
    }
    // CPU — second half slightly slower (indigo)
    const cpuProg = Math.min(Math.floor(step * 0.72), half);
    for (let i = half; i < N; i++) {
      const li = i - half;
      if (li < cpuProg)       { blocks[i].status = 'done';   blocks[i].color = '#6366F1'; }
      else if (li === cpuProg){ blocks[i].status = 'active'; blocks[i].color = '#A5B4FC'; }
      blocks[i].worker = 1;
    }
  }
  return blocks;
}

function getStepLabel(algo, step) {
  const cfg = ALGOS[algo];
  if (algo === 'serial') return `Processing byte ${Math.min(step + 1, N)} / ${N}`;
  if (algo === 'openmp') {
    const chunk = Math.ceil(N / 4);
    return step < chunk ? `All 4 threads processing block ${step + 1} / ${chunk}` : 'All threads complete ✓';
  }
  if (algo === 'mpi') {
    if (step < 4) return `Scattering chunk to Rank ${step}…`;
    return `All 4 ranks processing simultaneously — local step ${step - 4 + 1}`;
  }
  if (algo === 'cuda') {
    const nb = Math.ceil(N / 8);
    return step < nb ? `Launching Block ${step + 1} / ${nb} (8 threads each)` : 'All blocks complete ✓';
  }
  if (algo === 'hybrid') {
    const h = Math.floor(N / 2);
    return step < h ? `GPU: block ${step + 1} | CPU: block ${Math.floor(step * 0.72) + 1} (parallel)` : 'GPU + CPU complete ✓';
  }
}

// Render helpers per algorithm
function SerialLayout({ blocks }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {blocks.map(b => (
          <motion.div key={b.id} animate={{ backgroundColor: b.color, scale: b.status === 'active' ? 1.5 : 1 }}
            transition={{ duration: 0.12 }} className="w-5 h-5 rounded-sm shadow-sm" />
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-indigo-500" /> Done</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-indigo-300" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-slate-200" /> Idle</span>
      </div>
    </div>
  );
}

function LaneLayout({ blocks, workers, labels }) {
  const chunk = Math.ceil(N / workers);
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: workers }).map((_, t) => {
        const s = t * chunk, e = Math.min(s + chunk, N);
        const lane = blocks.slice(s, e);
        return (
          <div key={t} className="flex items-center gap-2">
            <div className="w-20 text-right shrink-0">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: COLORS[t] }}>
                {labels[t]}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {lane.map(b => (
                <motion.div key={b.id} animate={{ backgroundColor: b.color, scale: b.status === 'active' ? 1.4 : 1 }}
                  transition={{ duration: 0.15 }} className="w-5 h-5 rounded-sm shadow-sm" />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CudaLayout({ blocks }) {
  const TPB = 8, numBlocks = Math.ceil(N / TPB);
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: numBlocks }).map((_, b) => {
        const s = b * TPB, e = Math.min(s + TPB, N);
        const lane = blocks.slice(s, e);
        return (
          <div key={b} className="flex items-center gap-2">
            <div className="w-20 text-right shrink-0">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white bg-pink-500">Block {b}</span>
            </div>
            <div className="flex gap-1">
              {lane.map(bl => (
                <motion.div key={bl.id} animate={{ backgroundColor: bl.color, scale: bl.status === 'active' ? 1.4 : 1 }}
                  transition={{ duration: 0.15 }} className="w-5 h-5 rounded-sm shadow-sm" />
              ))}
            </div>
            <span className="text-[10px] text-slate-400">← {TPB} threads</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AlgorithmVisualizer() {
  const [algo, setAlgo]       = useState('serial');
  const [step, setStep]       = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed]     = useState(300);

  const cfg = ALGOS[algo];

  const reset = useCallback(() => { setStep(0); setPlaying(false); }, []);
  const switchAlgo = (a) => { setAlgo(a); setStep(0); setPlaying(false); };

  useEffect(() => {
    if (!playing) return;
    if (step >= cfg.totalSteps) { setPlaying(false); return; }
    const t = setTimeout(() => setStep(s => s + 1), speed);
    return () => clearTimeout(t);
  }, [playing, step, speed, cfg.totalSteps]);

  const blocks = computeState(algo, step);

  const renderViz = () => {
    if (algo === 'serial')  return <SerialLayout blocks={blocks} />;
    if (algo === 'openmp')  return <LaneLayout blocks={blocks} workers={4} labels={['Thread 0','Thread 1','Thread 2','Thread 3']} />;
    if (algo === 'mpi')     return <LaneLayout blocks={blocks} workers={4} labels={['Rank 0','Rank 1','Rank 2','Rank 3']} />;
    if (algo === 'cuda')    return <CudaLayout blocks={blocks} />;
    if (algo === 'hybrid')  return <LaneLayout blocks={blocks} workers={2} labels={['GPU','CPU']} />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Algorithm Visualizer</h2>
          <p className="text-xs text-slate-400 mt-0.5">Live animation of how each strategy processes data</p>
        </div>
        {/* Speed */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Speed</span>
          <input type="range" min={80} max={700} step={50}
            value={700 - speed + 80}
            onChange={e => setSpeed(700 - Number(e.target.value) + 80)}
            className="w-24 accent-indigo-600" />
        </div>
      </div>

      {/* Algo tabs */}
      <div className="flex gap-1 px-6 pt-4 flex-wrap">
        {Object.entries(ALGOS).map(([key, c]) => (
          <button key={key} onClick={() => switchAlgo(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              algo === key ? 'text-white border-transparent shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            style={algo === key ? { backgroundColor: c.color } : {}}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl text-xs text-slate-600 leading-relaxed"
        style={{ backgroundColor: cfg.color + '12', border: `1px solid ${cfg.color}30` }}>
        {cfg.description}
      </div>

      {/* Visualization */}
      <div className="px-6 py-4 min-h-[220px]">
        {renderViz()}
      </div>

      {/* Step info */}
      <div className="px-6 pb-2 text-xs font-medium" style={{ color: cfg.color }}>
        ▶ {getStepLabel(algo, step)}
      </div>

      {/* Controls */}
      <div className="border-t border-slate-100 px-6 py-3 flex items-center gap-3">
        <button onClick={() => setPlaying(p => !p)} disabled={step >= cfg.totalSteps}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: cfg.color }}>
          {playing ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Play</>}
        </button>
        <button onClick={reset}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
        {/* Progress bar */}
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ backgroundColor: cfg.color }}
            animate={{ width: `${(step / cfg.totalSteps) * 100}%` }}
            transition={{ duration: 0.1 }} />
        </div>
        <span className="text-xs text-slate-400 tabular-nums w-14 text-right">
          {Math.min(Math.round((step / cfg.totalSteps) * 100), 100)}%
        </span>
      </div>
    </div>
  );
}
