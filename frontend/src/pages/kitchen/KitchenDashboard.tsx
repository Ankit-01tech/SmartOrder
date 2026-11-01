import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../utils/socket';
import api from '../../utils/api';
import { Order, BatchSuggestion } from '../../types';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatTime } from '../../utils/eta';
import toast from 'react-hot-toast';

const STATUS_FLOW: Record<string, string> = {
  confirmed: 'preparing', preparing: 'quality_check', quality_check: 'ready',
};
const STATUS_LABELS: Record<string, string> = {
  preparing: '▶ Start Preparing', quality_check: '🔍 Quality Check', ready: '✅ Mark Ready',
};

const getStudentName = (student: any): string => {
  if (!student || typeof student !== 'object') return 'Student';
  return student.name || 'Student';
};

/* ── Camera QR Scanner ── */
const QrCameraScanner: React.FC<{ onScan: (result: string) => void }> = ({ onScan }) => {
  const [active, setActive]           = useState(false);
  const [cameras, setCameras]         = useState<{ id: string; label: string }[]>([]);
  const [selectedCam, setSelectedCam] = useState<string>('');
  const [loadingCam, setLoadingCam]   = useState(false);
  const [err, setErr]                 = useState('');
  const scannerInstanceRef           = useRef<any>(null);

  useEffect(() => {
    if (!active) return;
    let isMounted = true;

    const initScanner = async () => {
      setLoadingCam(true);
      setErr('');
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        const readerEl = document.getElementById('qr-reader-kitchen');
        if (!readerEl) return;

        if (scannerInstanceRef.current) {
          try {
            if (scannerInstanceRef.current.isScanning) {
              await scannerInstanceRef.current.stop();
            }
            scannerInstanceRef.current.clear();
          } catch {}
          scannerInstanceRef.current = null;
        }

        const html5Qrcode = new Html5Qrcode('qr-reader-kitchen');
        scannerInstanceRef.current = html5Qrcode;

        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (isMounted && devices.length > 0) {
          setCameras(devices.map(d => ({ id: d.id, label: d.label || `Camera ${d.id}` })));
        }

        let cameraConfig: any = { facingMode: 'environment' };
        if (selectedCam) {
          cameraConfig = { deviceId: { exact: selectedCam } };
        } else if (devices.length > 0) {
          const backCam = devices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          if (backCam) {
            cameraConfig = { deviceId: { exact: backCam.id } };
            if (isMounted) setSelectedCam(backCam.id);
          } else {
            cameraConfig = { deviceId: { exact: devices[0].id } };
            if (isMounted) setSelectedCam(devices[0].id);
          }
        }

        await html5Qrcode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            onScan(decodedText);
            stopScanner();
          },
          () => {}
        );

        if (isMounted) setLoadingCam(false);
      } catch (e: any) {
        console.error('Camera error:', e);
        if (isMounted) {
          setLoadingCam(false);
          const isPermErr = e?.name === 'NotAllowedError' || e?.toString()?.includes('Permission');
          const msg = isPermErr
            ? '📷 Camera permission denied. Please allow camera access in your browser site settings.'
            : '⚠️ Camera access failed or device has no active camera. You can use manual entry below.';
          setErr(msg);
        }
      }
    };

    const timer = setTimeout(initScanner, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerInstanceRef.current) {
        try {
          if (scannerInstanceRef.current.isScanning) {
            scannerInstanceRef.current.stop().catch(() => {});
          }
          scannerInstanceRef.current.clear();
        } catch {}
        scannerInstanceRef.current = null;
      }
    };
  }, [active, selectedCam]);

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          scannerInstanceRef.current.stop().catch(() => {});
        }
        scannerInstanceRef.current.clear();
      } catch {}
      scannerInstanceRef.current = null;
    }
    setActive(false);
    setErr('');
    setLoadingCam(false);
  };

  return (
    <div className="mb-4">
      {!active ? (
        <button
          onClick={() => { setActive(true); setErr(''); }}
          className="w-full border-2 border-dashed border-indigo-200 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-primary hover:bg-indigo-50 transition-all group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">📷</span>
          <span className="text-sm font-bold text-primary">Start Camera Scanner</span>
          <span className="text-xs text-gray-400">Works on MacBook FaceTime camera, phones & tablets</span>
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-100 p-3 shadow-glass">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {loadingCam ? 'Starting camera...' : 'Camera Active'}
            </span>
            <button
              onClick={stopScanner}
              className="text-xs text-gray-400 hover:text-red-500 font-semibold px-2 py-1"
            >
              ✕ Stop Camera
            </button>
          </div>

          {cameras.length > 1 && (
            <div className="mb-2">
              <select
                value={selectedCam}
                onChange={e => setSelectedCam(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
              >
                {cameras.map(c => (
                  <option key={c.id} value={c.id}>
                    📷 {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden bg-black min-h-[220px] flex items-center justify-center">
            {loadingCam && (
              <div className="absolute inset-0 bg-gray-900/80 z-10 flex flex-col items-center justify-center text-white text-xs gap-2">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Accessing device camera...</span>
              </div>
            )}
            <div id="qr-reader-kitchen" className="w-full text-center" />
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Point camera at student's QR code to verify order pickup
          </p>
        </div>
      )}
      {err && <p className="text-xs text-amber-700 mt-2 text-center bg-amber-50 p-2.5 rounded-xl border border-amber-200">{err}</p>}
    </div>
  );
};

const KitchenDashboard: React.FC = () => {
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [batches,      setBatches]      = useState<BatchSuggestion[]>([]);
  const [inventory,    setInventory]    = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [kitchenOnline,setKitchenOnline]= useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [qrInput,      setQrInput]      = useState('');
  const [verifying,    setVerifying]    = useState(false);
  const [tab,          setTab]          = useState<'queue'|'inventory'|'qr'>('queue');
  const [advancing,    setAdvancing]    = useState<Record<string,boolean>>({});

  const loadData = useCallback(async (silent = false) => {
    try {
      const [ordersRes, batchRes, invRes, statusRes] = await Promise.all([
        api.get('/orders/kitchen'),
        api.get('/recommendations/batch').catch(() => ({ data: { suggestions: [] } })),
        api.get('/menu').catch(() => ({ data: { items: [] } })),
        api.get('/kitchen/status'),
      ]);
      setOrders((ordersRes.data.orders || []).filter((o: any) => o?._id && o?.status));
      setBatches(batchRes.data.suggestions || []);
      setInventory((invRes.data.items || []).slice(0, 12));
      setKitchenOnline(statusRes.data.isOnline !== false);
    } catch (err) { console.error(err); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    loadData(false);
    const socket = getSocket();
    socket.emit('joinKitchen');

    socket.on('newOrder',           () => { loadData(true); toast('New order!', { icon: '🛎️' }); });
    socket.on('kitchenOrderRefresh',({ orderId, status }: any) => {
      setOrders(prev =>
        ['picked_up','cancelled'].includes(status)
          ? prev.filter(o => String(o._id) !== orderId)
          : prev.map(o => String(o._id) === orderId ? { ...o, status } : o)
      );
    });
    socket.on('kitchenStatusChange',({ isOnline }: any) => setKitchenOnline(isOnline));

    return () => {
      socket.off('newOrder');
      socket.off('kitchenOrderRefresh');
      socket.off('kitchenStatusChange');
    };
  }, [loadData]);

  const toggleKitchen = async () => {
    setTogglingStatus(true);
    try {
      const res = await api.patch('/kitchen/status', { isOnline: !kitchenOnline });
      setKitchenOnline(res.data.isOnline);
      toast.success(`Kitchen is now ${res.data.isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
    } catch { toast.error('Failed to toggle kitchen status'); }
    finally { setTogglingStatus(false); }
  };

  const advanceOrder = async (order: Order) => {
    const next = STATUS_FLOW[order.status];
    if (!next || advancing[String(order._id)]) return;
    setAdvancing(p => ({ ...p, [String(order._id)]: true }));
    setOrders(p => p.map(o => String(o._id) === String(order._id) ? { ...o, status: next as any } : o));
    try {
      await api.patch(`/orders/${order._id}/status`, { status: next });
      toast.success(`${order.orderId} → ${next.replace(/_/g,' ')}`);
    } catch (err: any) {
      setOrders(p => p.map(o => String(o._id) === String(order._id) ? { ...o, status: order.status } : o));
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setAdvancing(p => ({ ...p, [String(order._id)]: false }));
    }
  };

  const verifyQR = async (rawToken?: string) => {
    const raw = (rawToken || qrInput).trim();
    if (!raw) { toast.error('Enter QR token first'); return; }
    const cleanToken = raw.includes('|') ? raw.split('|')[0].trim() : raw.trim();
    setVerifying(true);
    try {
      const res = await api.post('/orders/verify-qr', { qrToken: cleanToken });
      toast.success(`✅ Pickup verified for ${res.data.order?.orderId}!`);
      setQrInput('');
      setOrders(p => p.filter(o => String(o._id) !== String(res.data.order?._id)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid QR code');
    } finally { setVerifying(false); }
  };

  const counts = {
    pending:   orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    check:     orders.filter(o => o.status === 'quality_check').length,
    ready:     orders.filter(o => o.status === 'ready').length,
  };

  if (loading) return <LoadingSpinner text="Loading kitchen..." />;

  return (
    <div className="min-h-screen bg-bg p-4 max-w-6xl mx-auto page-enter">
      {/* Header with kitchen toggle */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-poppins font-bold text-xl">👨‍🍳 Kitchen Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${kitchenOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {kitchenOnline ? 'Kitchen Online' : 'Kitchen Offline'} · {orders.length} active orders
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={toggleKitchen} disabled={togglingStatus}
            className={`text-xs font-bold px-4 py-2 rounded-full transition-all disabled:opacity-60 ${
              kitchenOnline
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
            {togglingStatus ? '...' : kitchenOnline ? '🔴 Go Offline' : '🟢 Go Online'}
          </button>
          <button onClick={() => loadData(true)} className="text-xs bg-indigo-50 text-primary font-semibold px-3 py-2 rounded-full hover:bg-indigo-100 transition-all">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label:'Pending',  value:counts.pending,   color:'#4F46E5' },
          { label:'Preparing',value:counts.preparing, color:'#F59E0B' },
          { label:'Checking', value:counts.check,     color:'#06B6D4' },
          { label:'Ready',    value:counts.ready,     color:'#22C55E' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-glass p-4" style={{ borderLeftWidth:3, borderLeftColor:s.color }}>
            <div className="font-poppins text-2xl font-bold" style={{ color:s.color }}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Batch suggestions */}
      {batches.length > 0 && (
        <div className="mb-5">
          <div className="text-sm font-semibold mb-2">🔥 Batch Suggestions</div>
          <div className="flex gap-2 flex-wrap">
            {batches.map(b => (
              <div key={b.itemName} className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-sm font-semibold">{b.itemName} ×{b.quantity}</span>
                <span className="text-xs text-amber-600">saves {b.estimatedTimeSaved}</span>
                <button onClick={() => toast.success(`Batch started for ${b.itemName}!`)}
                  className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">Cook</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {(['queue','inventory','qr'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${tab===t?'bg-white text-primary shadow':'text-gray-400 hover:text-gray-600'}`}>
            {t==='queue'?`📋 Queue (${orders.length})`:t==='inventory'?'📦 Stock':'📷 QR Scan'}
          </button>
        ))}
      </div>

      {/* Queue */}
      {tab === 'queue' && (
        <AnimatePresence>
          {orders.length === 0
            ? <div className="text-center py-16 text-gray-400"><div className="text-5xl mb-3">✅</div><div>All caught up!</div></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orders.map(order => {
                  if (!order?._id) return null;
                  const nextStatus = STATUS_FLOW[order.status];
                  const ageMin = Math.round((Date.now() - new Date(order.createdAt||0).getTime())/60000);
                  const isUrgent = ageMin > 12 && order.status !== 'ready';
                  const isAdv = advancing[String(order._id)] || false;
                  return (
                    <motion.div key={String(order._id)} layout
                      initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.95}}
                      className={`bg-white rounded-2xl shadow-glass p-4 border border-gray-100 border-l-4 ${order.status==='ready'?'border-l-green-500':isUrgent?'border-l-red-500':'border-l-primary'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-poppins font-bold text-sm">{order.orderId||`#${String(order._id).slice(-4)}`}</div>
                          <div className="text-xs text-gray-400">{getStudentName(order.student)} · {formatTime(order.createdAt)} · {ageMin}m</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={order.status} />
                          {isUrgent && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">⚠️ Urgent</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(order.items||[]).filter(Boolean).map((it:any,i:number)=>(
                          <span key={i} className="bg-gray-50 border border-gray-100 text-xs px-2 py-1 rounded-lg">{it?.name||'Item'} ×{it?.quantity||1}</span>
                        ))}
                      </div>
                      {order.notes?.trim() && <div className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg mb-3">📝 {order.notes}</div>}
                      {nextStatus
                        ? <button onClick={()=>advanceOrder(order)} disabled={isAdv}
                            className="w-full bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {isAdv?<><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>Updating...</>:STATUS_LABELS[nextStatus]}
                          </button>
                        : order.status==='ready'
                          ? <div className="w-full bg-green-50 border border-green-200 text-green-700 text-xs font-bold py-2.5 rounded-xl text-center">🎉 Awaiting QR scan</div>
                          : null}
                    </motion.div>
                  );
                })}
              </div>}
        </AnimatePresence>
      )}

      {/* Inventory */}
      {tab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
          <div className="text-sm font-semibold mb-4">📦 Live Inventory</div>
          <div className="space-y-3">
            {inventory.map((item:any) => {
              if (!item?._id) return null;
              const stock=Number(item.currentStock)||0, max=Number(item.maxStock)||1;
              const pct=Math.min(100,Math.round(stock/max*100));
              const color=pct>60?'#22C55E':pct>25?'#F59E0B':'#EF4444';
              return (
                <div key={item._id} className="flex items-center gap-3">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>
                    : <span className="text-2xl w-8 text-center flex-shrink-0">{item.emoji||'🍽️'}</span>}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1"><span className="text-sm font-medium">{item.name}</span><span className="text-xs font-bold" style={{color}}>{stock}/{max}</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:color}}/></div>
                  </div>
                  {pct<=25&&<button onClick={async()=>{
                    await api.patch('/inventory/update',{menuItemId:item._id,quantity:max-stock,type:'restock'});
                    toast.success(`Restocked ${item.name}`); loadData(true);
                  }} className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-200">Restock</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QR */}
      {tab === 'qr' && (
        <div className="max-w-md mx-auto">
          <QrCameraScanner onScan={verifyQR} />
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200"/><span className="text-xs text-gray-400">or paste manually</span><div className="flex-1 h-px bg-gray-200"/>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5 text-center">
            <div className="text-3xl mb-2">⌨️</div>
            <h3 className="font-poppins font-bold text-sm mb-1">Manual Token Entry</h3>
            <p className="text-xs text-gray-400 mb-3">Paste the token from student's order screen</p>
            <textarea value={qrInput} onChange={e=>setQrInput(e.target.value)} placeholder="Paste QR token..." rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-primary transition-all font-mono resize-none"
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();verifyQR();}}}/>
            <button onClick={()=>verifyQR()} disabled={verifying||!qrInput.trim()}
              className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {verifying?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Verifying...</>:'✅ Verify Pickup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;
