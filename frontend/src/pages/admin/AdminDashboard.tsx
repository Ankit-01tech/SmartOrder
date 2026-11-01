import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getSocket } from '../../utils/socket';

const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const HOURS = ['8','9','10','11','12','13','14','15','16','17','18','19'];
const PEAK  = [3,5,12,18,38,45,32,20,14,8,5,3];
const DEMO_ITEMS = [
  {name:'Veg Biryani',emoji:'🍛',todayOrderCount:47,price:80},
  {name:'Chai',emoji:'☕',todayOrderCount:89,price:15},
  {name:'Masala Dosa',emoji:'🫓',todayOrderCount:38,price:45},
  {name:'Samosa',emoji:'🫔',todayOrderCount:62,price:20},
  {name:'Cold Coffee',emoji:'🥤',todayOrderCount:29,price:40},
];
const DEMO_REVS=[8200,9100,7800,10200,11500,10800,12480];
const CATEGORIES=['Breakfast','Lunch','Snacks','Beverages','Dinner'];
const FALLBACK_IMG='https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80';

/* ── Image thumb ── */
const ImageThumb: React.FC<{image?:string;emoji?:string;itemId:string;onUploaded:(url:string)=>void}> = ({image,emoji,itemId,onUploaded}) => {
  const inputRef=useRef<HTMLInputElement>(null);
  const [preview,setPreview]=useState(image||'');
  const [uploading,setUploading]=useState(false);
  const handleFile=async(file:File)=>{
    if(file.size>2*1024*1024){toast.error('Image must be < 2 MB');return;}
    const r=new FileReader();r.onload=e=>setPreview(e.target?.result as string);r.readAsDataURL(file);
    setUploading(true);
    try{
      const fd=new FormData();fd.append('image',file);
      const res=await api.patch(`/menu/${itemId}`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      onUploaded(res.data.item.image);toast.success('Photo updated! 🖼️');
    }catch(err:any){toast.error(err?.response?.data?.message||'Upload failed');setPreview(image||'');}
    finally{setUploading(false);}
  };
  return(
    <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-dashed border-indigo-200 cursor-pointer hover:border-primary transition-all group flex-shrink-0"
      onClick={()=>inputRef.current?.click()}>
      {preview
        ?<img src={preview} alt="item" className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).src=FALLBACK_IMG;}}/>
        :<div className="w-full h-full flex items-center justify-center text-2xl bg-indigo-50">{emoji||'🍽️'}</div>}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {uploading?<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<span className="text-white text-xs font-bold">📷</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value='';}}/>
    </div>
  );
};

/* ── Add Item Modal ── */
const EMPTY={name:'',description:'',category:'Lunch',price:'',prepTime:'',calories:'',emoji:'🍽️',maxStock:'50',lowStockThreshold:'5',isSpecial:false};
const AddItemModal: React.FC<{onClose:()=>void;onAdded:(item:any)=>void}>=({onClose,onAdded})=>{
  const [form,setForm]=useState<any>(EMPTY);
  const [imageFile,setImageFile]=useState<File|null>(null);
  const [preview,setPreview]=useState('');
  const [saving,setSaving]=useState(false);
  const imgRef=useRef<HTMLInputElement>(null);
  const set=(k:string,v:any)=>setForm((p:any)=>({...p,[k]:v}));
  const handleImg=(file:File)=>{
    if(file.size>2*1024*1024){toast.error('Image < 2MB');return;}
    setImageFile(file);const r=new FileReader();r.onload=e=>setPreview(e.target?.result as string);r.readAsDataURL(file);
  };
  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!form.name||!form.price||!form.prepTime){toast.error('Name, price & prep time required');return;}
    setSaving(true);
    try{
      const fd=new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k,String(v)));
      fd.set('currentStock',form.maxStock);
      if(imageFile)fd.append('image',imageFile);
      const res=await api.post('/menu',fd,{headers:{'Content-Type':'multipart/form-data'}});
      toast.success(`${form.name} added! 🎉`);onAdded(res.data.item);onClose();
    }catch(err:any){toast.error(err?.response?.data?.message||'Failed to add item');}
    finally{setSaving(false);}
  };
  return(
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}
        className="bg-white rounded-3xl shadow-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-poppins font-bold text-lg">Add New Menu Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Photo (optional)</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 cursor-pointer hover:border-primary transition-all flex items-center justify-center bg-gray-50"
                onClick={()=>imgRef.current?.click()}>
                {preview?<img src={preview} alt="preview" className="w-full h-full object-cover"/>:<span className="text-2xl">{form.emoji}</span>}
              </div>
              <div>
                <button type="button" onClick={()=>imgRef.current?.click()} className="text-sm text-primary font-medium hover:underline">📷 Choose photo</button>
                <div className="text-xs text-gray-400 mt-0.5">JPEG/PNG/WebP, max 2MB<br/>If skipped, a relevant default image is used</div>
              </div>
              <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={e=>{const f=e.target.files?.[0];if(f)handleImg(f);e.target.value='';}}/>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="block text-sm font-medium mb-1.5">Item Name *</label>
              <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Veg Biryani"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary" required/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Emoji</label>
              <input value={form.emoji} onChange={e=>set('emoji',e.target.value)} maxLength={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary text-center text-xl"/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <input value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Short description..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category *</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary">
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              {key:'price',label:'Price (₹) *',placeholder:'e.g. 80'},
              {key:'prepTime',label:'Prep Time (min) *',placeholder:'e.g. 10'},
              {key:'calories',label:'Calories',placeholder:'e.g. 400'},
              {key:'maxStock',label:'Max Stock',placeholder:'e.g. 50'},
              {key:'lowStockThreshold',label:'Low Stock Alert',placeholder:'e.g. 5'},
            ].map(f=>(
              <div key={f.key}>
                <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                <input type="number" value={form[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
                  required={f.label.includes('*')}/>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" id="isSpecial" checked={form.isSpecial} onChange={e=>set('isSpecial',e.target.checked)} className="w-4 h-4 accent-primary"/>
              <label htmlFor="isSpecial" className="text-sm font-medium">⭐ Special item</label>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 text-sm flex items-center justify-center gap-2">
            {saving?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Adding...</>:'➕ Add to Menu'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

/* ── Payment Config Panel ── */
const PaymentConfigPanel: React.FC = () => {
  const [config,setConfig]=useState<any>(null);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    upiId:'', phonePe:'', contactName:'', instructions:'',
    razorpayKeyId:'', razorpayKeySecret:'', razorpayWebhookSecret:'', isRazorpayEnabled:true
  });
  const [qrFile,setQrFile]=useState<File|null>(null);
  const [qrPreview,setQrPreview]=useState('');
  const qrRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    api.get('/payment/config').then(res=>{
      const c = res.data.config;
      setConfig(c);
      setForm({
        upiId:                 c.upiId || '',
        phonePe:               c.phonePe || '',
        contactName:           c.contactName || '',
        instructions:          c.instructions || '',
        razorpayKeyId:         c.razorpayKeyId || '',
        razorpayKeySecret:     c.hasKeySecret ? '••••••••••••••••' : '',
        razorpayWebhookSecret: c.hasWebhookSecret ? '••••••••••••••••' : '',
        isRazorpayEnabled:     c.isRazorpayEnabled !== false,
      });
      setQrPreview(c.qrImage || '');
    });
  },[]);

  const handleQrFile=(file:File)=>{
    if(file.size>2*1024*1024){toast.error('QR image < 2MB');return;}
    setQrFile(file);const r=new FileReader();r.onload=e=>setQrPreview(e.target?.result as string);r.readAsDataURL(file);
  };

  const save=async()=>{
    setSaving(true);
    try{
      const fd=new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k,String(v)));
      if(qrFile)fd.append('qrImage',qrFile);
      const res=await api.patch('/payment/config',fd,{headers:{'Content-Type':'multipart/form-data'}});
      setConfig(res.data.config);toast.success('Payment config saved!');
    }catch{toast.error('Save failed');}finally{setSaving(false);}
  };

  if(!config) return <LoadingSpinner text="Loading payment config..."/>;
  const set=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));

  return(
    <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
      <h3 className="font-semibold text-sm mb-4">💳 Payment Configuration (Payment System V3)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-primary font-medium">
            🔒 Razorpay Gateway Settings (Server-Verified Payments)
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Razorpay Key ID (Public)</label>
            <input value={form.razorpayKeyId} onChange={e=>set('razorpayKeyId',e.target.value)} placeholder="rzp_test_..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary font-mono"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Razorpay Key Secret (Server-Side Secret)</label>
            <input type="password" value={form.razorpayKeySecret} onChange={e=>set('razorpayKeySecret',e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary font-mono"/>
            <p className="text-[10px] text-gray-400 mt-1">Stored securely on server. Never sent to student browser.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Razorpay Webhook Secret (Optional)</label>
            <input type="password" value={form.razorpayWebhookSecret} onChange={e=>set('razorpayWebhookSecret',e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary font-mono"/>
          </div>

          <hr className="border-gray-100 my-2" />

          {[
            {key:'contactName',label:'Canteen / Business Name',placeholder:'College Canteen'},
            {key:'upiId',label:'Display UPI ID (Optional)',placeholder:'canteen@paytm'},
            {key:'phonePe',label:'PhonePe Number (Optional)',placeholder:'9876543210'},
          ].map(f=>(
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1.5">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"/>
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1.5">Checkout Instructions</label>
            <textarea value={form.instructions} onChange={e=>set('instructions',e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary resize-none"
              placeholder="Instructions shown to students during checkout..."/>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Display QR Code (Optional)</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-all mb-4"
            onClick={()=>qrRef.current?.click()}>
            {qrPreview
              ?<img src={qrPreview} alt="Payment QR Code" className="w-40 h-40 object-contain mx-auto rounded-lg"/>
              :<div className="py-8 text-gray-400"><div className="text-3xl mb-2">📷</div><div className="text-sm">Upload display QR image</div></div>}
          </div>
          <input ref={qrRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e=>{const f=e.target.files?.[0];if(f)handleQrFile(f);e.target.value='';}}/>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
            <div className="font-bold">ℹ️ Payment Security Note:</div>
            <div>• Students pay the exact backend-calculated amount via Razorpay.</div>
            <div>• Manual UTR entries are disabled and rejected by the server.</div>
            <div>• Orders reach the Kitchen only after Razorpay payment verification.</div>
          </div>
        </div>
      </div>
      <button onClick={save} disabled={saving}
        className="mt-5 bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-60 text-sm flex items-center gap-2">
        {saving?<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</>:'💾 Save Configuration'}
      </button>
    </div>
  );
};

/* ── Main AdminDashboard ── */
const AdminDashboard: React.FC = () => {
  const [analytics,setAnalytics]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<'overview'|'menu'|'users'|'payment'>('overview');
  const [menuItems,setMenuItems]=useState<any[]>([]);
  const [editItem,setEditItem]=useState<any|null>(null);
  const [saving,setSaving]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [menuSearch,setMenuSearch]=useState('');
  const [users,setUsers]=useState<any[]>([]);
  const [pendingKitchen,setPendingKitchen]=useState<any[]>([]);
  const [approvingId,setApprovingId]=useState<string|null>(null);

  const loadUsers=useCallback(async()=>{
    const [usersRes,pendingRes]=await Promise.all([
      api.get('/admin/users').catch(()=>({data:{users:[]}})),
      api.get('/admin/kitchen-requests').catch(()=>({data:{requests:[]}})),
    ]);
    setUsers(usersRes.data.users||[]);
    setPendingKitchen(pendingRes.data.requests||[]);
  },[]);

  useEffect(()=>{
    Promise.all([
      api.get('/admin/analytics').catch(()=>({data:{data:null}})),
      api.get('/menu'),
    ]).then(([aRes,mRes])=>{
      setAnalytics(aRes.data.data);
      setMenuItems(mRes.data.items||[]);
      setLoading(false);
    });
    loadUsers();

    const socket=getSocket();
    socket.emit('joinAdmin');

    // Real-time: new user registered → reload users
    socket.on('kitchenRegistrationRequest',()=>{
      loadUsers();toast('New kitchen staff request!',{icon:'👨‍🍳'});
    });
    // Real-time: menu updates
    socket.on('menuUpdate',({type,item,itemId}:any)=>{
      setMenuItems(prev=>
        type==='add'?[item,...prev]:
        type==='update'?prev.map(i=>i._id===item._id?item:i):
        prev.filter(i=>i._id!==itemId)
      );
    });

    return()=>{socket.off('kitchenRegistrationRequest');socket.off('menuUpdate');};
  },[loadUsers]);

  const handleApproval=async(userId:string,action:'approve'|'reject')=>{
    setApprovingId(userId);
    try{
      await api.patch(`/admin/kitchen-requests/${userId}`,{action});
      toast.success(`Kitchen account ${action}d!`);
      loadUsers();
    }catch{toast.error('Action failed');}
    finally{setApprovingId(null);}
  };

  const toggleItem=async(item:any)=>{
    try{
      await api.patch(`/menu/${item._id}`,{isAvailable:!item.isAvailable});
      setMenuItems(p=>p.map(i=>i._id===item._id?{...i,isAvailable:!i.isAvailable}:i));
      toast.success(`${item.name} ${!item.isAvailable?'enabled':'disabled'}`);
    }catch{toast.error('Update failed');}
  };

  const saveEdit=async()=>{
    if(!editItem)return;setSaving(true);
    try{
      const res=await api.patch(`/menu/${editItem._id}`,{price:Number(editItem.price),currentStock:Number(editItem.currentStock),prepTime:Number(editItem.prepTime),name:editItem.name});
      setMenuItems(p=>p.map(i=>i._id===editItem._id?{...i,...res.data.item}:i));
      setEditItem(null);toast.success('Item updated!');
    }catch{toast.error('Save failed');}finally{setSaving(false);}
  };

  const deleteItem=async(item:any)=>{
    if(!confirm(`Delete "${item.name}"?`))return;
    try{await api.delete(`/menu/${item._id}`);setMenuItems(p=>p.filter(i=>i._id!==item._id));toast.success(`${item.name} deleted`);}
    catch{toast.error('Delete failed');}
  };

  if(loading)return<LoadingSpinner text="Loading admin dashboard..."/>;

  const topItems=analytics?.topItems?.length?analytics.topItems:DEMO_ITEMS;
  const weeklyRevs=analytics?.weeklyOrders?.length?analytics.weeklyOrders.map((w:any)=>w.revenue):DEMO_REVS;
  const maxRev=Math.max(...weeklyRevs,1);
  const maxOrders=Math.max(...topItems.map((i:any)=>i.todayOrderCount),1);
  const maxPeak=Math.max(...PEAK);
  const filteredMenu=menuItems.filter(i=>!menuSearch||i.name?.toLowerCase().includes(menuSearch.toLowerCase()));

  return(
    <div className="min-h-screen bg-bg p-4 max-w-6xl mx-auto page-enter">
      <div className="mb-5">
        <h1 className="font-poppins font-bold text-xl">📊 Admin Dashboard</h1>
        <p className="text-xs text-gray-400 mt-0.5">Real-time canteen performance & management</p>
        {pendingKitchen.length>0&&(
          <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 w-fit cursor-pointer" onClick={()=>setTab('users')}>
            <span className="text-amber-600 font-bold text-xs">⚠️ {pendingKitchen.length} pending kitchen request{pendingKitchen.length>1?'s':''}</span>
            <span className="text-amber-500 text-xs">→ Review</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 flex-wrap">
        {(['overview','menu','users','payment'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${tab===t?'bg-white text-primary shadow':'text-gray-400 hover:text-gray-600'}`}>
            {t==='overview'?'📈 Overview':t==='menu'?`🍽️ Menu (${menuItems.length})`:t==='users'?`👥 Users`:' 💳 Payment'}
            {t==='users'&&pendingKitchen.length>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{pendingKitchen.length}</span>}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab==='overview'&&(
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {label:"Today's Revenue",value:`₹${(analytics?.todayRevenue??12480).toLocaleString()}`,sub:'↑ 18% vs yesterday',g:'linear-gradient(135deg,#4F46E5,#7C3AED)'},
              {label:'Orders Today',value:analytics?.todayOrders??284,sub:'↑ 12% vs yesterday',g:'linear-gradient(135deg,#06B6D4,#0891B2)'},
              {label:'Avg Wait Time',value:'7.2 min',sub:'↓ 3.1 min improved',g:'linear-gradient(135deg,#22C55E,#16A34A)'},
              {label:'Students',value:(analytics?.studentCount??1247).toLocaleString(),sub:'Registered',g:'linear-gradient(135deg,#F59E0B,#D97706)'},
            ].map((s,i)=>(
              <motion.div key={s.label} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*.08}}
                className="rounded-2xl p-4 text-white" style={{background:s.g}}>
                <div className="text-xs opacity-75 mb-1">{s.label}</div>
                <div className="font-poppins text-2xl font-bold">{s.value}</div>
                <div className="text-xs opacity-65 mt-1">{s.sub}</div>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
              <div className="text-sm font-semibold mb-1">Weekly Revenue</div>
              <div className="text-xs text-gray-400 mb-4">₹ per day</div>
              <div className="flex gap-2 items-end h-28 mb-2">
                {weeklyRevs.map((v:number,i:number)=>(
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] text-gray-400">₹{Math.round(v/1000)}k</div>
                    <motion.div className="w-full rounded-t-lg" initial={{height:0}} animate={{height:`${Math.round(v/maxRev*80)}px`}}
                      transition={{duration:.7,delay:i*.05}} style={{background:i===weeklyRevs.length-1?'#4F46E5':'rgba(79,70,229,.4)',borderRadius:'6px 6px 0 0'}}/>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">{DAYS.map((d,i)=><div key={d} className={`flex-1 text-center text-[9px] ${i===DAYS.length-1?'text-primary font-bold':'text-gray-400'}`}>{d}</div>)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
              <div className="text-sm font-semibold mb-4">🏆 Top Items Today</div>
              {topItems.map((item:any,i:number)=>(
                <div key={item.name} className="flex items-center gap-3 mb-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1"><span className="text-sm font-medium">{item.name}</span><span className="text-xs text-gray-400">{item.todayOrderCount} orders</span></div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" initial={{width:0}} animate={{width:`${Math.round(item.todayOrderCount/maxOrders*100)}%`}}
                        transition={{duration:.8,delay:i*.06}} style={{background:'linear-gradient(90deg,#4F46E5,#06B6D4)'}}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
            <div className="text-sm font-semibold mb-1">⏰ Peak Hour Heatmap</div>
            <div className="text-xs text-gray-400 mb-4">Orders per hour</div>
            <div className="flex gap-1.5 items-end h-20 mb-2">
              {PEAK.map((v,i)=><div key={i} className="flex-1 rounded-t-md" style={{height:`${Math.round(v/maxPeak*64)}px`,background:v===maxPeak?'#EF4444':v>30?'#F59E0B':v>15?'#4F46E5':'#06B6D4',opacity:.85}}/>)}
            </div>
            <div className="flex gap-1.5">{HOURS.map(h=><div key={h} className="flex-1 text-center text-[9px] text-gray-400">{h}h</div>)}</div>
          </div>
        </>
      )}

      {/* MENU */}
      {tab==='menu'&&(
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
                <input value={menuSearch} onChange={e=>setMenuSearch(e.target.value)} placeholder="Search..."
                  className="pl-8 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-primary w-44"/>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-indigo-50 text-primary px-3 py-1.5 rounded-full hidden sm:block">📷 Click thumbnail to upload photo</span>
              <button onClick={()=>setShowAdd(true)} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-1.5">➕ Add Item</button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-glass overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-400 border-b border-gray-100">
              <span className="col-span-1">Photo</span><span className="col-span-3">Name</span><span className="col-span-2">Category</span><span className="col-span-2">Price/Stock/Time</span><span className="col-span-2">Status</span><span className="col-span-2">Actions</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-[55vh] overflow-y-auto">
              {filteredMenu.length===0&&<div className="text-center py-10 text-gray-400 text-sm">No items found</div>}
              {filteredMenu.map(item=>(
                <div key={item._id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-1">
                    <ImageThumb image={item.image} emoji={item.emoji} itemId={item._id}
                      onUploaded={url=>setMenuItems(p=>p.map(i=>i._id===item._id?{...i,image:url}:i))}/>
                  </div>
                  <div className="col-span-3">
                    {editItem?._id===item._id
                      ?<input value={editItem.name} onChange={e=>setEditItem((p:any)=>({...p,name:e.target.value}))} className="w-full border border-primary rounded-lg px-2 py-1 text-xs"/>
                      :<div><div className="text-sm font-semibold truncate">{item.name}</div><div className="text-[10px] text-gray-400">{item.calories} kcal</div></div>}
                  </div>
                  <div className="col-span-2"><span className="text-xs bg-indigo-50 text-primary font-medium px-2 py-0.5 rounded-full">{item.category}</span></div>
                  <div className="col-span-2">
                    {editItem?._id===item._id
                      ?<div className="space-y-1">
                        {[['price','₹'],['currentStock','Stock'],['prepTime','min']].map(([k,p])=>(
                          <input key={k} type="number" value={(editItem as any)[k]} placeholder={p}
                            onChange={e=>setEditItem((prev:any)=>({...prev,[k]:e.target.value}))}
                            className="w-full border border-primary rounded-lg px-2 py-1 text-xs"/>
                        ))}
                       </div>
                      :<div className="text-xs space-y-0.5">
                        <div className="font-bold text-primary">₹{item.price}</div>
                        <div className={item.currentStock<=5?'text-red-500':item.currentStock<=15?'text-amber-500':'text-green-600'}>{item.currentStock}/{item.maxStock}</div>
                        <div className="text-gray-400">⏱ {item.prepTime}m</div>
                       </div>}
                  </div>
                  <div className="col-span-2">
                    <button onClick={()=>toggleItem(item)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full transition-all ${item.isAvailable?'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700':'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'}`}>
                      {item.isAvailable?'✅ Active':'❌ Off'}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                    {editItem?._id===item._id
                      ?<><button onClick={saveEdit} disabled={saving} className="text-xs bg-green-500 text-white px-2.5 py-1.5 rounded-lg font-bold hover:bg-green-600 disabled:opacity-60">Save</button>
                        <button onClick={()=>setEditItem(null)} className="text-xs text-gray-400 hover:text-red-500 px-1">✕</button></>
                      :<><button onClick={()=>setEditItem({...item})} className="text-xs bg-indigo-50 text-primary font-semibold px-2.5 py-1.5 rounded-lg hover:bg-indigo-100">✏️</button>
                        <button onClick={()=>deleteItem(item)} className="text-xs bg-red-50 text-red-500 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-100">🗑️</button></>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">📷 Click any thumbnail to upload a real photo · Max 2MB, JPEG/PNG/WebP · Default images assigned based on item name</div>
        </div>
      )}

      {/* USERS */}
      {tab==='users'&&(
        <div className="space-y-5">
          {pendingKitchen.length>0&&(
            <div className="bg-white rounded-2xl border border-amber-200 shadow-glass p-5">
              <h3 className="font-semibold text-sm mb-4 text-amber-700">⏳ Pending Kitchen Staff Requests ({pendingKitchen.length})</h3>
              <div className="space-y-3">
                {pendingKitchen.map(u=>(
                  <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center" style={{background:'linear-gradient(135deg,#F59E0B,#EF4444)'}}>{u.name[0]}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.email} · Applied {new Date(u.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button onClick={()=>handleApproval(u._id,'approve')} disabled={approvingId===u._id}
                      className="text-xs bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 disabled:opacity-60">
                      {approvingId===u._id?'...':'✅ Approve'}
                    </button>
                    <button onClick={()=>handleApproval(u._id,'reject')} disabled={approvingId===u._id}
                      className="text-xs bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 disabled:opacity-60">
                      ❌ Reject
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-glass p-5">
            <h3 className="font-semibold text-sm mb-4">All Users ({users.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.map(u=>(
                <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-50">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {u.avatar?<img src={u.avatar} alt={u.name} className="w-full h-full object-cover"/>
                      :<div className="w-full h-full text-white text-sm font-bold flex items-center justify-center" style={{background:'linear-gradient(135deg,#4F46E5,#06B6D4)'}}>{u.name?.[0]||'U'}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{u.name}</div>
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${u.role==='admin'?'bg-indigo-100 text-indigo-700':u.role==='kitchen'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{u.role}</span>
                  {u.accountStatus!=='approved'&&<span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${u.accountStatus==='pending'?'bg-amber-50 text-amber-600':'bg-red-50 text-red-600'}`}>{u.accountStatus}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${u.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{u.isActive?'Active':'Disabled'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT */}
      {tab==='payment'&&<PaymentConfigPanel/>}

      <AnimatePresence>
        {showAdd&&<AddItemModal onClose={()=>setShowAdd(false)} onAdded={item=>setMenuItems(p=>[item,...p])}/>}
      </AnimatePresence>
    </div>
  );
};


export default AdminDashboard;
