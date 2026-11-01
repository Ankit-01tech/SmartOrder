import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';
import { calcETA, etaColor, queueLoadLabel } from '../../utils/eta';

const HOURS = ['8','9','10','11','12','13','14','15','16','17'];
const PEAK  = [5, 8, 12, 20, 35, 40, 28, 15, 10, 6];
const MAX_PEAK = 40;

const QueuePage: React.FC = () => {
  const [queueLength,   setQueueLength]   = useState(0);
  const [eta,           setEta]           = useState(0);
  const [kitchenOnline, setKitchenOnline] = useState(true);
  const [confidence]    = useState(94);

  useEffect(() => {
    api.get('/orders/queue-status').then(res => {
      setQueueLength(res.data.queueLength || 0);
      setEta(res.data.estimatedWait || 0);
      setKitchenOnline(res.data.kitchenOnline !== false);
    });

    const socket = getSocket();
    socket.on('queueUpdate', ({ queueLength: q, eta: e }: any) => {
      setQueueLength(q);
      if (e) setEta(e);
    });
    socket.on('kitchenStatusChange', ({ isOnline }: any) => setKitchenOnline(isOnline));
    return () => { socket.off('queueUpdate'); socket.off('kitchenStatusChange'); };
  }, []);

  const base       = 5;
  const queueDelay = +(queueLength * 0.3).toFixed(1);
  const kitchenLoad = queueLength > 15 ? 2.5 : queueLength > 8 ? 1.5 : 1.0;
  const loadPct    = Math.min(Math.round((queueLength / 30) * 100), 100);
  const color      = etaColor(eta);
  const label      = queueLoadLabel(queueLength);

  return (
    <div className="min-h-screen bg-bg p-4 max-w-5xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-poppins font-bold text-xl">📊 Live Queue Status</h1>
          <p className="text-xs text-gray-400 mt-0.5">Real-time AI-powered predictions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${kitchenOnline ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${kitchenOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {kitchenOnline ? 'Kitchen Open' : 'Kitchen Offline'}
          </span>
        </div>
      </div>

      {!kitchenOnline && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-center">
          <div className="text-2xl mb-1">🔴</div>
          <div className="font-semibold text-red-700 text-sm">Kitchen is currently offline</div>
          <div className="text-xs text-red-500 mt-0.5">New orders are paused until kitchen reopens</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* ETA Card */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-glass p-6 text-center">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Estimated Wait Time</div>
          <div className="font-poppins font-bold text-6xl mb-1" style={{ color }}>{eta}</div>
          <div className="text-gray-400 text-sm mb-4">minutes</div>
          <div className="text-xs text-gray-400 mb-5">
            AI Confidence: <span className="text-green-500 font-bold">{confidence}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
            <motion.div className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${loadPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ background: `linear-gradient(90deg, #4F46E5, ${color})` }} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Low Load</span>
            <span className="font-semibold" style={{ color }}>{label}</span>
            <span>High Load</span>
          </div>
        </motion.div>

        {/* Formula Breakdown */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-glass p-6">
          <div className="text-sm font-semibold mb-4">🧠 ETA Formula Breakdown</div>
          <div className="space-y-3">
            {[
              { label: 'Base Prep Time',           value: `${base} min`,       color: '#4F46E5', bg: '#EEF2FF' },
              { label: `Queue Delay (${queueLength} × 0.3)`, value: `${queueDelay} min`, color: '#F59E0B', bg: '#FEF3C7' },
              { label: 'Kitchen Load Factor',       value: `${kitchenLoad} min`, color: '#06B6D4', bg: '#ECFEFF' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: row.bg }}>
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="text-sm font-bold px-3 py-0.5 rounded-full text-white" style={{ background: row.color }}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl px-4 py-3 border-2 border-primary bg-indigo-50">
              <span className="font-bold">Total ETA</span>
              <span className="font-poppins text-lg font-bold text-primary">{eta} min</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Queue visual */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-5 mb-5">
        <div className="text-sm font-semibold mb-3">Queue Position Visualization</div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="w-6 h-6 rounded-md transition-all duration-500"
              style={{ background: i < 3 ? '#4F46E5' : i < queueLength ? '#F59E0B' : '#F1F5F9' }} />
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span>🟣 Processing ({Math.min(3, queueLength)})</span>
          <span>🟡 Waiting ({Math.max(0, queueLength - 3)})</span>
          <span>⚪ Free ({30 - queueLength})</span>
        </div>
      </div>

      {/* Peak hour chart */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-glass p-5">
        <div className="text-sm font-semibold mb-1">Peak Hour Analysis</div>
        <div className="text-xs text-gray-400 mb-4">Average queue length by hour</div>
        <div className="flex gap-1.5 items-end h-24">
          {HOURS.map((h, i) => (
            <div key={h} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md transition-all duration-700"
                style={{
                  height: `${Math.round(PEAK[i] / MAX_PEAK * 80)}px`,
                  background: PEAK[i] === MAX_PEAK ? '#EF4444' : PEAK[i] > 25 ? '#F59E0B' : '#4F46E5',
                  opacity: 0.85,
                }} />
              <div className="text-[9px] text-gray-400">{h}h</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          ⚠️ Peak time: 12:00–14:00 — Try ordering before 12 PM or after 2 PM for shorter waits
        </div>
      </div>
    </div>
  );
};

export default QueuePage;
