import { useState, useEffect } from "react";

// ============================================================
// SUPABASE
// ============================================================
const SUPABASE_URL = "https://qijcyebopepzzrrtflvm.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";
const SB = { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

async function db(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const opts = { method, headers: { ...SB, Prefer: method === "POST" ? "return=representation" : "return=representation" } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    if (!res.ok) { const err = await res.text(); console.error(`DB ${method} ${table}:`, res.status, err); return null; }
    if (method === "DELETE") return true;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) { console.error("DB error:", e); return null; }
}

// ============================================================
// GPS
// ============================================================
function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => reject(new Error(e.code === 1 ? "Location permission denied" : "Location unavailable")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ============================================================
// CAMERA
// ============================================================
function takePhoto() {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(stream => {
        video.srcObject = stream;
        video.play();
        setTimeout(() => {
          canvas.width = 320; canvas.height = 240;
          canvas.getContext("2d").drawImage(video, 0, 0, 320, 240);
          stream.getTracks().forEach(t => t.stop());
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        }, 1500);
      }).catch(reject);
  });
}

// Office coordinates (from your Google Maps link)
const OFFICE_LAT = 29.9921;
const OFFICE_LNG = 31.0316;
const OFFICE_RADIUS_KM = 0.5;

function distanceKm(lat1, lng1, lat2, lng2) {
  return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)) * 111;
}

// ============================================================
// CSS
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --bg:#0a0e1a;--bg2:#111827;--card:#1a2035;--card2:#1f2847;
    --border:#2a3454;--border2:#374068;
    --t1:#f0f2f8;--t2:#8b95b0;--t3:#5a6580;
    --acc:#6366f1;--acc2:#818cf8;--accg:rgba(99,102,241,0.15);
    --ok:#10b981;--okb:rgba(16,185,129,0.12);
    --warn:#f59e0b;--warnb:rgba(245,158,11,0.12);
    --err:#ef4444;--errb:rgba(239,68,68,0.12);
    --info:#3b82f6;--infob:rgba(59,130,246,0.12);
    --sw:260px;--r:12px;--rs:8px;--rl:16px;
    --shadow:0 4px 24px rgba(0,0,0,0.3);
    --fen:'DM Sans',sans-serif;--far:'IBM Plex Sans Arabic',sans-serif;
  }
  body,#root{font-family:var(--fen);background:var(--bg);color:var(--t1);min-height:100vh}
  .rtl{direction:rtl;font-family:var(--far)}
  .app{display:flex;min-height:100vh}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
  /* LOGIN */
  .login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a0e1a 0%,#1a1040 50%,#0a0e1a 100%)}
  .login-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rl);padding:48px;width:420px;max-width:90vw;box-shadow:0 8px 48px rgba(0,0,0,0.5)}
  .login-logo{font-size:28px;font-weight:700;text-align:center;margin-bottom:8px}.login-logo span{color:var(--acc)}
  .login-tagline{text-align:center;color:var(--t2);font-size:14px;margin-bottom:32px}
  .login-field{margin-bottom:20px}.login-field label{display:block;font-size:13px;color:var(--t2);margin-bottom:6px;font-weight:500}
  .login-field input{width:100%;padding:12px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;transition:border-color 0.2s;font-family:inherit}
  .login-field input:focus{border-color:var(--acc)}
  .login-btn{width:100%;padding:14px;background:var(--acc);color:white;border:none;border-radius:var(--rs);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.2s;display:flex;align-items:center;justify-content:center;gap:8px}
  .login-btn:hover:not(:disabled){background:var(--acc2)}.login-btn:disabled{opacity:0.6;cursor:not-allowed}
  .login-error{background:var(--errb);border:1px solid var(--err);color:var(--err);padding:10px 14px;border-radius:var(--rs);font-size:13px;margin-bottom:16px}
  .login-lang{display:flex;justify-content:center;gap:12px;margin-top:20px}
  .login-lang button{background:none;border:none;color:var(--t3);cursor:pointer;font-size:13px;font-family:inherit;padding:4px 8px;border-radius:4px}
  .login-lang button.active{color:var(--acc);font-weight:600}
  /* SIDEBAR */
  .sidebar{width:var(--sw);background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:100;transition:transform 0.3s}
  .rtl .sidebar{left:auto;right:0;border-right:none;border-left:1px solid var(--border)}
  .sidebar-header{padding:24px 20px;border-bottom:1px solid var(--border)}
  .sidebar-logo{font-size:22px;font-weight:700}.sidebar-logo span{color:var(--acc)}
  .sidebar-nav{flex:1;padding:12px 0;overflow-y:auto}
  .nav-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 20px;background:none;border:none;color:var(--t2);cursor:pointer;font-size:14px;font-weight:500;transition:all 0.15s;font-family:inherit;text-align:left}
  .rtl .nav-item{text-align:right}
  .nav-item svg{width:18px;height:18px;flex-shrink:0}
  .nav-item:hover{background:var(--accg);color:var(--t1)}
  .nav-item.active{background:var(--accg);color:var(--acc);border-right:3px solid var(--acc)}
  .rtl .nav-item.active{border-right:none;border-left:3px solid var(--acc)}
  .nav-badge{margin-left:auto;background:var(--err);color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px}
  .rtl .nav-badge{margin-left:0;margin-right:auto}
  .sidebar-footer{padding:16px 20px;border-top:1px solid var(--border)}
  .sidebar-user{display:flex;align-items:center;gap:12px}
  .sidebar-avatar{width:36px;height:36px;border-radius:50%;background:var(--accg);color:var(--acc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  .sidebar-user-info{flex:1;min-width:0}
  .sidebar-user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sidebar-user-role{font-size:11px;color:var(--t3)}
  /* MAIN */
  .main{flex:1;margin-left:var(--sw);display:flex;flex-direction:column;min-height:100vh}
  .rtl .main{margin-left:0;margin-right:var(--sw)}
  .topbar{height:64px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:50}
  .topbar-title{font-size:18px;font-weight:600}
  .topbar-actions{display:flex;align-items:center;gap:12px}
  .topbar-btn{background:var(--bg2);border:1px solid var(--border);color:var(--t2);width:36px;height:36px;border-radius:var(--rs);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
  .topbar-btn:hover{border-color:var(--acc);color:var(--acc)}
  .topbar-btn svg{width:16px;height:16px}
  .lang-toggle{background:var(--accg);border:1px solid var(--acc);color:var(--acc);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all 0.2s}
  .lang-toggle:hover{background:var(--acc);color:white}
  .content{padding:28px;flex:1}
  /* CARDS & STATS */
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:28px}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;transition:all 0.2s}
  .stat-card:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:var(--shadow)}
  .stat-icon{width:40px;height:40px;border-radius:var(--rs);display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:18px}
  .stat-icon.blue{background:var(--infob);color:var(--info)}.stat-icon.green{background:var(--okb);color:var(--ok)}
  .stat-icon.yellow{background:var(--warnb);color:var(--warn)}.stat-icon.red{background:var(--errb);color:var(--err)}
  .stat-icon.purple{background:var(--accg);color:var(--acc)}
  .stat-value{font-size:28px;font-weight:700;margin-bottom:4px}
  .stat-label{font-size:13px;color:var(--t2)}
  .card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:24px;margin-bottom:20px}
  .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
  .card-title{font-size:16px;font-weight:600}
  /* TABLE */
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:12px;color:var(--t3);font-weight:600;padding:12px 16px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:0.5px}
  .rtl th{text-align:right}
  td{padding:14px 16px;font-size:14px;border-bottom:1px solid var(--border);color:var(--t2)}
  tr:hover td{background:var(--card2)}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
  .badge.green{background:var(--okb);color:var(--ok)}.badge.red{background:var(--errb);color:var(--err)}
  .badge.yellow{background:var(--warnb);color:var(--warn)}.badge.blue{background:var(--infob);color:var(--info)}
  .badge.purple{background:var(--accg);color:var(--acc)}.badge.gray{background:var(--bg2);color:var(--t2)}
  /* BUTTONS */
  .btn{padding:10px 20px;border-radius:var(--rs);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;border:none;font-family:inherit;display:inline-flex;align-items:center;gap:8px}
  .btn-primary{background:var(--acc);color:white}.btn-primary:hover{background:var(--acc2)}
  .btn-outline{background:transparent;border:1px solid var(--border);color:var(--t2)}.btn-outline:hover{border-color:var(--acc);color:var(--acc)}
  .btn-success{background:var(--ok);color:white}.btn-danger{background:var(--err);color:white}
  .btn-warning{background:var(--warn);color:white}
  .btn-sm{padding:6px 12px;font-size:12px}.btn:disabled{opacity:0.5;cursor:not-allowed}
  /* ATTENDANCE */
  .clock-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
  .clock-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:32px;text-align:center;position:relative;overflow:hidden}
  .clock-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
  .clock-card.in::before{background:var(--ok)}.clock-card.out::before{background:var(--err)}
  .clock-time{font-size:48px;font-weight:700;margin:16px 0 8px;font-variant-numeric:tabular-nums}
  .clock-date{color:var(--t3);font-size:14px;margin-bottom:24px}
  .clock-btn{padding:16px 48px;border-radius:var(--r);font-size:16px;font-weight:700;cursor:pointer;border:none;color:white;transition:all 0.2s;font-family:inherit}
  .clock-btn:disabled{opacity:0.5;cursor:not-allowed}
  .clock-btn.in{background:var(--ok)}.clock-btn.in:hover:not(:disabled){background:#0d9d6e;transform:scale(1.02)}
  .clock-btn.out{background:var(--err)}.clock-btn.out:hover:not(:disabled){background:#dc2626;transform:scale(1.02)}
  .verify-steps{display:flex;flex-direction:column;gap:12px;margin-top:24px}
  .verify-step{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg2);border-radius:var(--rs);font-size:13px}
  .verify-step.error{background:var(--errb);color:var(--err)}.verify-step.success{background:var(--okb)}
  .verify-icon{font-size:18px}.verify-icon.done{color:var(--ok)}.verify-icon.wait{color:var(--t3)}.verify-icon.err{color:var(--err)}
  .gps-coords{font-size:11px;color:var(--t3);margin-top:4px}
  /* MODAL */
  .modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
  .modal{background:var(--card);border:1px solid var(--border);border-radius:var(--rl);padding:32px;width:560px;max-width:100%;max-height:90vh;overflow-y:auto}
  .modal-title{font-size:18px;font-weight:700;margin-bottom:24px}
  .form-group{margin-bottom:16px}
  .form-group label{display:block;font-size:13px;color:var(--t2);margin-bottom:6px;font-weight:500}
  .form-group input,.form-group select,.form-group textarea{width:100%;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;font-family:inherit;transition:border-color 0.2s}
  .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--acc)}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .form-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:24px;flex-wrap:wrap}
  /* MISC */
  .emp-avatar{width:36px;height:36px;border-radius:50%;background:var(--accg);color:var(--acc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  .emp-row{display:flex;align-items:center;gap:12px}
  .search-bar{position:relative;margin-bottom:20px}
  .search-bar input{width:100%;padding:12px 16px 12px 44px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;font-family:inherit}
  .search-bar input:focus{border-color:var(--acc)}
  .search-bar svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:var(--t3)}
  .notif-dot{position:relative}
  .notif-dot::after{content:'';position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:var(--err);border-radius:50%;border:2px solid var(--bg2)}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn 0.3s ease forwards}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--t3);border-top-color:var(--acc);border-radius:50%;animation:spin 0.8s linear infinite}
  @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .s1{animation:slideUp 0.4s ease 0.05s both}.s2{animation:slideUp 0.4s ease 0.1s both}
  .s3{animation:slideUp 0.4s ease 0.15s both}.s4{animation:slideUp 0.4s ease 0.2s both}
  .s5{animation:slideUp 0.4s ease 0.25s both}.s6{animation:slideUp 0.4s ease 0.3s both}
  .tab-bar{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:24px}
  .tab{padding:10px 20px;background:none;border:none;color:var(--t2);cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s}
  .tab.active{color:var(--acc);border-bottom-color:var(--acc)}
  .tab:hover{color:var(--t1)}
  .photo-thumb{width:48px;height:36px;border-radius:6px;object-fit:cover;border:1px solid var(--border);cursor:pointer}
  .photo-thumb:hover{border-color:var(--acc)}
  .info-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);padding:16px;margin-bottom:16px;font-size:13px;color:var(--t2);line-height:1.6}
  .payroll-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px}
  .payroll-field label{font-size:12px;color:var(--t3);display:block;margin-bottom:4px}
  .payroll-field input{width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;font-weight:600;outline:none;font-family:inherit}
  .payroll-field input:focus{border-color:var(--acc)}
  .net-salary-box{background:var(--okb);border:1px solid var(--ok);border-radius:var(--rs);padding:16px;text-align:center;margin-top:16px}
  .net-salary-box .amount{font-size:32px;font-weight:700;color:var(--ok)}
  .net-salary-box .label{font-size:13px;color:var(--t2);margin-top:4px}
  .loan-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-bottom:16px}
  .loan-progress{height:8px;background:var(--bg2);border-radius:4px;margin:12px 0;overflow:hidden}
  .loan-progress-bar{height:100%;background:var(--warn);border-radius:4px;transition:width 0.5s}
  .excuse-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
  @media(max-width:768px){
    .sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}
    .rtl .sidebar{transform:translateX(100%)}.rtl .sidebar.open{transform:translateX(0)}
    .main{margin-left:0!important;margin-right:0!important}
    .clock-section{grid-template-columns:1fr}.stats-grid{grid-template-columns:1fr 1fr}
    .content{padding:16px}.topbar{padding:0 16px}
    .mobile-menu{display:block!important}
    .form-row{grid-template-columns:1fr}
    .payroll-row{grid-template-columns:1fr 1fr}
  }
`;

// ============================================================
// ICONS
// ============================================================
const I = {
  Dashboard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Dollar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Menu: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Camera: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Report: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Loan: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  OrgChart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="2" y="14" width="6" height="4" rx="1"/><rect x="9" y="14" width="6" height="4" rx="1"/><rect x="16" y="14" width="6" height="4" rx="1"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="5" y1="14" x2="5" y2="10"/><line x1="12" y1="10" x2="5" y2="10"/><line x1="19" y1="14" x2="19" y2="10"/><line x1="12" y1="10" x2="19" y2="10"/></svg>,
  SelfService: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Download: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

// ============================================================
// MODAL COMPONENT
// ============================================================
function Modal({ show, onClose, title, children, width }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={width ? { width } : {}} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div className="modal-title" style={{ margin: 0 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--t2)", cursor: "pointer", padding: 4 }}><I.X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// LOGIN PAGE
// ============================================================
function LoginPage({ lang, setLang, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) { onLogin("admin", data.user, data.access_token); return; }
    } catch (e) { console.warn("Auth error:", e); }
    if ((email === "hello@mymayz.com" && password === "Ghalia@0902") || (email === "admin@peopleflow.com" && password === "demo123")) {
      onLogin("admin", { email, id: "demo" }, null);
    } else { setError(lang === "ar" ? "فشل تسجيل الدخول. تحقق من البريد وكلمة المرور." : "Login failed. Check your email and password."); }
    setLoading(false);
  };

  return (
    <div className={`login-page ${lang === "ar" ? "rtl" : ""}`} style={{ fontFamily: lang === "ar" ? "var(--far)" : "var(--fen)" }}>
      <div className="login-card fade-in">
        <div className="login-logo">my<span>Mayz</span> HR</div>
        <div className="login-tagline">{lang === "ar" ? "منصة أتمتة الموارد البشرية الذكية" : "Smart HR Automation Platform"}</div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field"><label>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@mymayz.com" /></div>
        <div className="login-field"><label>{lang === "ar" ? "كلمة المرور" : "Password"}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></div>
        <button className="login-btn" onClick={submit} disabled={loading || !email || !password}>
          {loading ? <><span className="spinner" /> {lang === "ar" ? "جاري التحميل..." : "Loading..."}</> : lang === "ar" ? "تسجيل الدخول" : "Sign In"}
        </button>
        <div className="login-lang">
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
          <button className={lang === "ar" ? "active" : ""} onClick={() => setLang("ar")}>العربية</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [lang, setLang] = useState("en");
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  // Data
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loans, setLoans] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [payroll, setPayroll] = useState([]);

  // Attendance state
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [pendingLoc, setPendingLoc] = useState(null);
  const [pendingTime, setPendingTime] = useState(null);

  // UI state
  const [searchQ, setSearchQ] = useState("");
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [attTab, setAttTab] = useState("clockin");
  const [reportFilter, setReportFilter] = useState({ from: "", to: "", emp: "" });

  const ar = lang === "ar";
  const t = (en, arab) => ar ? arab : en;

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load data
  useEffect(() => {
    if (loggedIn) loadAll();
  }, [loggedIn]);

  const loadAll = async () => {
    const [emps, att, ln, ex, lv, pay] = await Promise.all([
      db("employees", "GET", null, "?select=*&order=name"),
      db("attendance", "GET", null, "?select=*&order=date.desc&limit=100"),
      db("loans", "GET", null, "?select=*&order=created_at.desc"),
      db("excuse_requests", "GET", null, "?select=*&order=created_at.desc"),
      db("leave_requests", "GET", null, "?select=*&order=created_at.desc"),
      db("payroll", "GET", null, "?select=*&order=year.desc,month.desc"),
    ]);
    if (emps) setEmployees(emps);
    if (att) setAttendance(att);
    if (ln) setLoans(ln);
    if (ex) setExcuses(ex);
    if (lv) setLeaveReqs(lv);
    if (pay) setPayroll(pay);
  };

  const handleLogin = (r, user) => { setCurrentUser(user); setLoggedIn(true); };
  const handleLogout = () => { setLoggedIn(false); setPage("dashboard"); setClockedIn(false); setGpsVerified(false); setFaceVerified(false); };

  // ============================================================
  // CLOCK IN
  // ============================================================
  const handleClockIn = async () => {
    setGpsError(""); setFaceError(""); setGpsVerified(false); setFaceVerified(false); setGpsLocation(null); setCapturedPhoto(null);

    setVerifying("gps");
    let loc;
    try { loc = await getGPS(); setGpsLocation(loc); setGpsVerified(true); }
    catch (err) { setGpsError(err.message); setVerifying(null); return; }

    setVerifying("face");
    try { const photo = await takePhoto(); setCapturedPhoto(photo); setFaceVerified(true); }
    catch (err) { setFaceError(t("Camera access denied. Please allow camera.", "تم رفض الوصول للكاميرا.")); setVerifying(null); return; }

    const clockTime = new Date();
    const dist = distanceKm(loc.lat, loc.lng, OFFICE_LAT, OFFICE_LNG);
    const isOffice = dist < OFFICE_RADIUS_KM;

    if (isOffice) {
      await saveClockIn(clockTime, loc, t("Office", "المكتب"), capturedPhoto);
    } else {
      setPendingLoc(loc); setPendingTime(clockTime); setShowLocationModal(true); setVerifying(null);
    }
  };

  const saveClockIn = async (clockTime, loc, label, photo) => {
    setVerifying("saving");
    const empId = employees[0]?.id || null;
    const rec = await db("attendance", "POST", {
      employee_id: empId,
      date: clockTime.toISOString().split("T")[0],
      check_in: clockTime.toISOString(),
      gps_lat: loc?.lat, gps_lng: loc?.lng,
      location_label: label,
      face_photo: photo || capturedPhoto,
      status: clockTime.getHours() > 8 || (clockTime.getHours() === 8 && clockTime.getMinutes() > 15) ? "late" : "present",
      source: "app",
    });
    if (rec) { setClockedIn(true); setClockInTime(clockTime); setLocationLabel(label); await loadAll(); }
    setVerifying(null);
  };

  const handleClockOut = async () => {
    const clockTime = new Date();
    const today = clockTime.toISOString().split("T")[0];
    const rec = attendance.find(a => a.date === today && a.employee_id === employees[0]?.id);
    if (rec) {
      const checkIn = new Date(rec.check_in);
      const hours = (clockTime - checkIn) / 3600000;
      await db("attendance", "PATCH", { check_out: clockTime.toISOString(), hours_worked: Math.round(hours * 100) / 100 }, `?id=eq.${rec.id}`);
    }
    setClockedIn(false); setClockInTime(null); setGpsVerified(false); setFaceVerified(false); setCapturedPhoto(null); setLocationLabel(null);
    await loadAll();
  };

  // ============================================================
  // RENDER: DASHBOARD
  // ============================================================
  const renderDashboard = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayAtt = attendance.filter(a => a.date === today);
    const pending = excuses.filter(e => e.status === "pending").length + leaveReqs.filter(l => l.status === "pending").length;
    return (
      <div className="fade-in">
        <div className="stats-grid">
          {[
            { icon: "👥", color: "blue", value: employees.length, label: t("Total Employees", "إجمالي الموظفين"), cls: "s1" },
            { icon: "✅", color: "green", value: todayAtt.filter(a => a.check_in).length, label: t("Present Today", "الحضور اليوم"), cls: "s2" },
            { icon: "🏖️", color: "yellow", value: leaveReqs.filter(l => l.status === "approved").length, label: t("On Leave", "في إجازة"), cls: "s3" },
            { icon: "📋", color: "red", value: pending, label: t("Pending Requests", "طلبات معلقة"), cls: "s4" },
            { icon: "💰", color: "purple", value: employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString() + " EGP", label: t("Monthly Payroll", "الرواتب الشهرية"), cls: "s5" },
            { icon: "💳", color: "green", value: loans.filter(l => l.status === "active").length, label: t("Active Loans", "قروض نشطة"), cls: "s6" },
          ].map((s, i) => (
            <div className={`stat-card ${s.cls}`} key={i}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">{t("Today's Attendance", "حضور اليوم")}</div></div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>{t("Employee", "الموظف")}</th><th>{t("Check In", "دخول")}</th><th>{t("Check Out", "خروج")}</th><th>{t("Location", "الموقع")}</th><th>{t("Status", "الحالة")}</th><th>{t("Photo", "صورة")}</th></tr></thead>
              <tbody>
                {todayAtt.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--t3)" }}>{t("No attendance recorded today", "لا يوجد حضور اليوم")}</td></tr> :
                  todayAtt.map((a, i) => {
                    const emp = employees.find(e => e.id === a.employee_id);
                    return (
                      <tr key={i}>
                        <td><div className="emp-row"><div className="emp-avatar">{emp?.avatar || "?"}</div><span style={{ color: "var(--t1)", fontWeight: 500 }}>{emp?.name || "Unknown"}</span></div></td>
                        <td>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td>{a.location_label || "—"}</td>
                        <td><span className={`badge ${a.status === "present" ? "green" : a.status === "late" ? "yellow" : "red"}`}>{a.status}</span></td>
                        <td>{a.face_photo ? <img src={a.face_photo} alt="face" className="photo-thumb" onClick={() => setPhotoPreview(a.face_photo)} /> : "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: EMPLOYEES
  // ============================================================
  const renderEmployees = () => {
    const filtered = employees.filter(e => e.name?.toLowerCase().includes(searchQ.toLowerCase()) || e.department?.toLowerCase().includes(searchQ.toLowerCase()));
    return (
      <div className="fade-in">
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}><I.Search /><input placeholder={t("Search employees...", "بحث عن موظف...")} value={searchQ} onChange={e => setSearchQ(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => { setModal("addEmployee"); setModalData({}); }}><I.Plus />{t("Add Employee", "إضافة موظف")}</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>#</th><th>{t("Name", "الاسم")}</th><th>{t("Department", "القسم")}</th><th>{t("Position", "المنصب")}</th><th>{t("Salary", "الراتب")}</th><th>{t("Status", "الحالة")}</th><th>{t("Actions", "إجراءات")}</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{t("No employees found", "لا يوجد موظفون")}</td></tr> :
                  filtered.map((emp, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--acc)", fontWeight: 600 }}>{emp.employee_code || emp.id}</td>
                      <td><div className="emp-row"><div className="emp-avatar">{emp.avatar || emp.name?.substring(0, 2).toUpperCase()}</div><div><div style={{ color: "var(--t1)", fontWeight: 500 }}>{emp.name}</div><div style={{ fontSize: 12, color: "var(--t3)" }}>{emp.email}</div></div></div></td>
                      <td>{emp.department}</td>
                      <td>{emp.position}</td>
                      <td style={{ color: "var(--ok)", fontWeight: 600 }}>{(emp.salary || 0).toLocaleString()} EGP</td>
                      <td><span className={`badge ${emp.status === "active" ? "green" : "red"}`}>{emp.status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => { setModal("editEmployee"); setModalData({ ...emp }); }}><I.Edit /></button>
                          <button className="btn btn-outline btn-sm" onClick={() => { setModal("editSalary"); setModalData({ ...emp }); }}><I.Dollar /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        <Modal show={modal === "addEmployee"} onClose={() => setModal(null)} title={t("Add New Employee", "إضافة موظف جديد")}>
          <div className="form-row">
            <div className="form-group"><label>{t("Full Name", "الاسم الكامل")}</label><input value={modalData.name || ""} onChange={e => setModalData({ ...modalData, name: e.target.value })} /></div>
            <div className="form-group"><label>{t("Arabic Name", "الاسم بالعربية")}</label><input value={modalData.name_ar || ""} onChange={e => setModalData({ ...modalData, name_ar: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t("Email", "البريد الإلكتروني")}</label><input type="email" value={modalData.email || ""} onChange={e => setModalData({ ...modalData, email: e.target.value })} /></div>
            <div className="form-group"><label>{t("Phone", "الهاتف")}</label><input value={modalData.phone || ""} onChange={e => setModalData({ ...modalData, phone: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t("Department", "القسم")}</label><input value={modalData.department || ""} onChange={e => setModalData({ ...modalData, department: e.target.value })} /></div>
            <div className="form-group"><label>{t("Position", "المنصب")}</label><input value={modalData.position || ""} onChange={e => setModalData({ ...modalData, position: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t("Salary (EGP)", "الراتب")}</label><input type="number" value={modalData.salary || ""} onChange={e => setModalData({ ...modalData, salary: +e.target.value })} /></div>
            <div className="form-group"><label>{t("Hire Date", "تاريخ التعيين")}</label><input type="date" value={modalData.hire_date || ""} onChange={e => setModalData({ ...modalData, hire_date: e.target.value })} /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{t("Cancel", "إلغاء")}</button>
            <button className="btn btn-primary" disabled={saving} onClick={async () => {
              setSaving(true);
              const code = "EMP" + String(Date.now()).slice(-4);
              await db("employees", "POST", { ...modalData, employee_code: code, avatar: (modalData.name || "?").substring(0, 2).toUpperCase(), status: "active" });
              await loadAll(); setSaving(false); setModal(null);
            }}>{saving ? <span className="spinner" /> : t("Save Employee", "حفظ الموظف")}</button>
          </div>
        </Modal>

        {/* Edit Employee Modal */}
        <Modal show={modal === "editEmployee"} onClose={() => setModal(null)} title={t("Edit Employee", "تعديل الموظف")}>
          <div className="form-row">
            <div className="form-group"><label>{t("Full Name", "الاسم الكامل")}</label><input value={modalData.name || ""} onChange={e => setModalData({ ...modalData, name: e.target.value })} /></div>
            <div className="form-group"><label>{t("Email", "البريد")}</label><input value={modalData.email || ""} onChange={e => setModalData({ ...modalData, email: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{t("Department", "القسم")}</label><input value={modalData.department || ""} onChange={e => setModalData({ ...modalData, department: e.target.value })} /></div>
            <div className="form-group"><label>{t("Position", "المنصب")}</label><input value={modalData.position || ""} onChange={e => setModalData({ ...modalData, position: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>{t("Status", "الحالة")}</label>
            <select value={modalData.status || "active"} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
              <option value="active">{t("Active", "نشط")}</option>
              <option value="inactive">{t("Inactive", "غير نشط")}</option>
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{t("Cancel", "إلغاء")}</button>
            <button className="btn btn-primary" disabled={saving} onClick={async () => {
              setSaving(true);
              await db("employees", "PATCH", { name: modalData.name, email: modalData.email, department: modalData.department, position: modalData.position, status: modalData.status }, `?id=eq.${modalData.id}`);
              await loadAll(); setSaving(false); setModal(null);
            }}>{saving ? <span className="spinner" /> : t("Save Changes", "حفظ التغييرات")}</button>
          </div>
        </Modal>

        {/* Edit Salary Modal */}
        <Modal show={modal === "editSalary"} onClose={() => setModal(null)} title={t("Edit Salary", "تعديل الراتب")}>
          <div className="info-box">{t("Employee", "الموظف")}: <strong>{modalData.name}</strong></div>
          <div className="form-group"><label>{t("Base Salary (EGP)", "الراتب الأساسي")}</label><input type="number" value={modalData.salary || ""} onChange={e => setModalData({ ...modalData, salary: +e.target.value })} /></div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={() => setModal(null)}>{t("Cancel", "إلغاء")}</button>
            <button className="btn btn-primary" disabled={saving} onClick={async () => {
              setSaving(true);
              await db("employees", "PATCH", { salary: modalData.salary }, `?id=eq.${modalData.id}`);
              await loadAll(); setSaving(false); setModal(null);
            }}>{saving ? <span className="spinner" /> : t("Update Salary", "تحديث الراتب")}</button>
          </div>
        </Modal>
      </div>
    );
  };

  // ============================================================
  // RENDER: ATTENDANCE
  // ============================================================
  const renderAttendance = () => {
    const timeStr = now.toLocaleTimeString(ar ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = now.toLocaleDateString(ar ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const filteredAtt = attendance.filter(a => {
      if (reportFilter.from && a.date < reportFilter.from) return false;
      if (reportFilter.to && a.date > reportFilter.to) return false;
      if (reportFilter.emp && a.employee_id !== +reportFilter.emp) return false;
      return true;
    });

    return (
      <div className="fade-in">
        <div className="tab-bar">
          {[{ id: "clockin", label: t("Clock In/Out", "تسجيل الحضور") }, { id: "reports", label: t("Reports", "التقارير") }].map(tab => (
            <button key={tab.id} className={`tab ${attTab === tab.id ? "active" : ""}`} onClick={() => setAttTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {attTab === "clockin" && (
          <div>
            <div className="clock-section">
              {/* Clock In Card */}
              <div className="clock-card in">
                <div style={{ fontSize: 14, color: "var(--t2)" }}>{t("Clock In", "تسجيل الدخول")}</div>
                <div className="clock-time">{timeStr}</div>
                <div className="clock-date">{dateStr}</div>
                {!clockedIn ? (
                  <button className="clock-btn in" onClick={handleClockIn} disabled={!!verifying}>
                    {verifying ? <><span className="spinner" /> {t("Verifying...", "جاري التحقق...")}</> : t("Clock In", "تسجيل الدخول")}
                  </button>
                ) : (
                  <div style={{ color: "var(--ok)", fontWeight: 600, fontSize: 16 }}>
                    ✓ {t("Clocked in at", "تم الدخول في")} {clockInTime?.toLocaleTimeString()}
                    {locationLabel && <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>📍 {locationLabel}</div>}
                  </div>
                )}
                <div className="verify-steps">
                  <div className={`verify-step ${gpsError ? "error" : gpsVerified ? "success" : ""}`}>
                    <span className={`verify-icon ${gpsVerified ? "done" : gpsError ? "err" : "wait"}`}>{gpsVerified ? "✓" : gpsError ? "✗" : verifying === "gps" ? <span className="spinner" /> : "○"}</span>
                    <I.MapPin />
                    <div>
                      <span>{gpsVerified ? t("Location Verified", "تم التحقق من الموقع") : gpsError ? t("GPS Error", "خطأ GPS") : t("GPS Location", "موقع GPS")}</span>
                      {gpsVerified && gpsLocation && <div className="gps-coords">{gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)} (±{Math.round(gpsLocation.accuracy)}m)</div>}
                      {gpsError && <div className="gps-coords" style={{ color: "var(--err)" }}>{gpsError}</div>}
                    </div>
                  </div>
                  <div className={`verify-step ${faceError ? "error" : faceVerified ? "success" : ""}`}>
                    <span className={`verify-icon ${faceVerified ? "done" : faceError ? "err" : "wait"}`}>{faceVerified ? "✓" : faceError ? "✗" : verifying === "face" ? <span className="spinner" /> : "○"}</span>
                    <I.Camera />
                    <div style={{ flex: 1 }}>
                      <span>{faceVerified ? t("Photo Captured ✓", "تم التقاط الصورة ✓") : faceError ? t("Camera Error", "خطأ الكاميرا") : t("Face Photo", "صورة الوجه")}</span>
                      {faceError && <div className="gps-coords" style={{ color: "var(--err)" }}>{faceError}</div>}
                      {capturedPhoto && <img src={capturedPhoto} alt="captured" style={{ width: 60, height: 45, borderRadius: 6, marginTop: 6, objectFit: "cover" }} />}
                    </div>
                  </div>
                </div>
                {(gpsError || faceError) && <button className="btn btn-outline" style={{ marginTop: 16, width: "100%" }} onClick={handleClockIn}>{t("Try Again", "حاول مرة أخرى")}</button>}
              </div>

              {/* Clock Out Card */}
              <div className="clock-card out">
                <div style={{ fontSize: 14, color: "var(--t2)" }}>{t("Clock Out", "تسجيل الخروج")}</div>
                <div className="clock-time">{timeStr}</div>
                <div className="clock-date">{dateStr}</div>
                <button className="clock-btn out" onClick={handleClockOut} disabled={!clockedIn}>{t("Clock Out", "تسجيل الخروج")}</button>
                {clockedIn && clockInTime && (
                  <div style={{ marginTop: 16, color: "var(--t2)", fontSize: 13 }}>
                    {t("Duration", "المدة")}: {Math.floor((now - clockInTime) / 3600000)}h {Math.floor(((now - clockInTime) % 3600000) / 60000)}m
                  </div>
                )}
              </div>
            </div>

            {/* Location Modal */}
            <Modal show={showLocationModal} onClose={() => {}} title={t("📍 Where are you working from?", "📍 من أين تعمل؟")}>
              <div className="info-box">{t("You are outside the office. Please select your work location.", "أنت خارج المكتب. يرجى تحديد موقع عملك.")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {[t("Home", "المنزل"), t("Out of Office", "خارج المكتب"), t("Client Site", "موقع العميل"), t("Other", "أخرى")].map(loc => (
                  <button key={loc} className={`btn ${customLocation === loc ? "btn-primary" : "btn-outline"}`} onClick={() => setCustomLocation(loc)}>{loc}</button>
                ))}
              </div>
              {customLocation === t("Other", "أخرى") && (
                <div className="form-group"><label>{t("Enter location name", "أدخل اسم الموقع")}</label><input placeholder={t("e.g. Alexandria office", "مثال: مكتب الإسكندرية")} onChange={e => setCustomLocation(e.target.value)} /></div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" disabled={!customLocation || saving} onClick={async () => {
                  setShowLocationModal(false);
                  await saveClockIn(pendingTime, pendingLoc, customLocation, capturedPhoto);
                  setCustomLocation("");
                }}>{saving ? <span className="spinner" /> : t("Confirm & Clock In", "تأكيد وتسجيل الدخول")}</button>
              </div>
            </Modal>
          </div>
        )}

        {attTab === "reports" && (
          <div>
            {/* Filters */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>{t("Filter Reports", "تصفية التقارير")}</div>
              <div className="form-row">
                <div className="form-group"><label>{t("From Date", "من تاريخ")}</label><input type="date" value={reportFilter.from} onChange={e => setReportFilter({ ...reportFilter, from: e.target.value })} /></div>
                <div className="form-group"><label>{t("To Date", "إلى تاريخ")}</label><input type="date" value={reportFilter.to} onChange={e => setReportFilter({ ...reportFilter, to: e.target.value })} /></div>
                <div className="form-group"><label>{t("Employee", "الموظف")}</label>
                  <select value={reportFilter.emp} onChange={e => setReportFilter({ ...reportFilter, emp: e.target.value })}>
                    <option value="">{t("All Employees", "جميع الموظفين")}</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setReportFilter({ from: "", to: "", emp: "" })}>{t("Clear Filters", "مسح التصفية")}</button>
            </div>

            {/* Attendance Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title">{t("Attendance Records", "سجلات الحضور")} ({filteredAtt.length})</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr><th>{t("Date", "التاريخ")}</th><th>{t("Employee", "الموظف")}</th><th>{t("Check In", "دخول")}</th><th>{t("Check Out", "خروج")}</th><th>{t("Hours", "ساعات")}</th><th>{t("Location", "الموقع")}</th><th>{t("GPS", "GPS")}</th><th>{t("Status", "الحالة")}</th><th>{t("Photo", "صورة")}</th></tr></thead>
                  <tbody>
                    {filteredAtt.length === 0 ? <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{t("No records found", "لا توجد سجلات")}</td></tr> :
                      filteredAtt.map((a, i) => {
                        const emp = employees.find(e => e.id === a.employee_id);
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{a.date}</td>
                            <td>{emp?.name || "—"}</td>
                            <td style={{ color: "var(--ok)" }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td style={{ color: "var(--err)" }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td>{a.hours_worked ? `${a.hours_worked}h` : "—"}</td>
                            <td>{a.location_label || "—"}</td>
                            <td style={{ fontSize: 11 }}>{a.gps_lat ? `${a.gps_lat?.toFixed(4)}, ${a.gps_lng?.toFixed(4)}` : "—"}</td>
                            <td><span className={`badge ${a.status === "present" ? "green" : a.status === "late" ? "yellow" : "red"}`}>{a.status}</span></td>
                            <td>{a.face_photo ? <img src={a.face_photo} alt="face" className="photo-thumb" onClick={() => setPhotoPreview(a.face_photo)} /> : "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER: PAYROLL
  // ============================================================
  const renderPayroll = () => {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const calcNet = (d) => (d.base_salary || 0) + (d.allowances || 0) + (d.bonuses || 0) - (d.deductions || 0) - (d.tax || 0) - (d.insurance || 0) - (d.loan_deduction || 0);

    return (
      <div className="fade-in">
        <div className="card-header" style={{ marginBottom: 20 }}>
          <div className="card-title">{t("Payroll Management", "إدارة الرواتب")}</div>
          <button className="btn btn-primary" onClick={() => {
            const d = { month: months[now.getMonth()], year: now.getFullYear(), base_salary: employees[0]?.salary || 0, allowances: 0, bonuses: 0, deductions: 0, tax: 0, insurance: 0, loan_deduction: 0 };
            setModal("createPayroll"); setModalData({ ...d, employee_id: employees[0]?.id });
          }}><I.Plus />{t("Create Payslip", "إنشاء راتب")}</button>
        </div>

        {/* Payroll Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>{t("Employee", "الموظف")}</th><th>{t("Month/Year", "الشهر/السنة")}</th><th>{t("Base", "أساسي")}</th><th>{t("Allowances", "بدلات")}</th><th>{t("Bonuses", "مكافآت")}</th><th>{t("Deductions", "خصومات")}</th><th>{t("Net", "الصافي")}</th><th>{t("Status", "الحالة")}</th><th>{t("Actions", "إجراءات")}</th></tr></thead>
              <tbody>
                {payroll.length === 0 ? <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{t("No payroll records", "لا توجد سجلات رواتب")}</td></tr> :
                  payroll.map((p, i) => {
                    const emp = employees.find(e => e.id === p.employee_id);
                    const net = p.net_salary || calcNet(p);
                    return (
                      <tr key={i}>
                        <td>{emp?.name || "—"}</td>
                        <td>{p.month} {p.year}</td>
                        <td>{(p.base_salary || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)" }}>+{(p.allowances || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)" }}>+{(p.bonuses || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--err)" }}>-{((p.deductions || 0) + (p.tax || 0) + (p.insurance || 0) + (p.loan_deduction || 0)).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)", fontWeight: 700 }}>{net.toLocaleString()} EGP</td>
                        <td><span className={`badge ${p.status === "paid" ? "green" : "yellow"}`}>{p.status}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => { setModal("editPayroll"); setModalData({ ...p }); }}><I.Edit /></button>
                            {p.status === "pending" && <button className="btn btn-success btn-sm" onClick={async () => { await db("payroll", "PATCH", { status: "paid", paid_at: new Date().toISOString() }, `?id=eq.${p.id}`); loadAll(); }}>{t("Pay", "دفع")}</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Payroll Modal */}
        {["createPayroll","editPayroll"].map(mtype => (
          <Modal key={mtype} show={modal === mtype} onClose={() => setModal(null)} title={mtype === "createPayroll" ? t("Create Payslip", "إنشاء راتب") : t("Edit Payslip", "تعديل الراتب")}>
            {mtype === "createPayroll" && (
              <div className="form-group"><label>{t("Employee", "الموظف")}</label>
                <select value={modalData.employee_id || ""} onChange={e => { const emp = employees.find(x => x.id === +e.target.value); setModalData({ ...modalData, employee_id: +e.target.value, base_salary: emp?.salary || 0 }); }}>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <div className="form-group"><label>{t("Month", "الشهر")}</label>
                <select value={modalData.month || ""} onChange={e => setModalData({ ...modalData, month: e.target.value })}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t("Year", "السنة")}</label><input type="number" value={modalData.year || now.getFullYear()} onChange={e => setModalData({ ...modalData, year: +e.target.value })} /></div>
            </div>
            <div className="payroll-row">
              {[["base_salary","Base Salary","الراتب الأساسي"],["allowances","Allowances","البدلات"],["bonuses","Bonuses","المكافآت"]].map(([k,en,ar2]) => (
                <div key={k} className="payroll-field"><label>{t(en,ar2)}</label><input type="number" value={modalData[k] || 0} onChange={e => setModalData({ ...modalData, [k]: +e.target.value })} /></div>
              ))}
            </div>
            <div className="payroll-row">
              {[["deductions","Deductions","الخصومات"],["tax","Tax","الضريبة"],["insurance","Insurance","التأمين"],["loan_deduction","Loan Deduction","خصم القرض"]].map(([k,en,ar2]) => (
                <div key={k} className="payroll-field"><label>{t(en,ar2)}</label><input type="number" value={modalData[k] || 0} onChange={e => setModalData({ ...modalData, [k]: +e.target.value })} /></div>
              ))}
            </div>
            <div className="net-salary-box">
              <div className="amount">{calcNet(modalData).toLocaleString()} EGP</div>
              <div className="label">{t("Net Salary", "صافي الراتب")}</div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}><label>{t("Notes", "ملاحظات")}</label><textarea rows={2} value={modalData.notes || ""} onChange={e => setModalData({ ...modalData, notes: e.target.value })} /></div>
            <div className="form-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>{t("Cancel", "إلغاء")}</button>
              <button className="btn btn-primary" disabled={saving} onClick={async () => {
                setSaving(true);
                const net = calcNet(modalData);
                const payload = { ...modalData, net_salary: net };
                if (mtype === "createPayroll") await db("payroll", "POST", payload);
                else await db("payroll", "PATCH", payload, `?id=eq.${modalData.id}`);
                await loadAll(); setSaving(false); setModal(null);
              }}>{saving ? <span className="spinner" /> : t("Save", "حفظ")}</button>
            </div>
          </Modal>
        ))}
      </div>
    );
  };

  // ============================================================
  // RENDER: LOANS
  // ============================================================
  const renderLoans = () => (
    <div className="fade-in">
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div className="card-title">{t("Employee Loans", "قروض الموظفين")}</div>
        <button className="btn btn-primary" onClick={() => { setModal("addLoan"); setModalData({ employee_id: employees[0]?.id, amount: 0, monthly_deduction: 0, reason: "" }); }}><I.Plus />{t("New Loan", "قرض جديد")}</button>
      </div>

      {loans.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--t3)" }}>{t("No loans recorded", "لا توجد قروض")}</div>
      ) : loans.map((loan, i) => {
        const emp = employees.find(e => e.id === loan.employee_id);
        const paidPct = Math.min(100, Math.round(((loan.amount - loan.remaining) / loan.amount) * 100));
        return (
          <div className="loan-card" key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{emp?.name || "—"}</div>
                <div style={{ color: "var(--t3)", fontSize: 13, marginTop: 4 }}>{loan.reason}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: "var(--warn)", fontSize: 18 }}>{(loan.remaining || 0).toLocaleString()} EGP {t("remaining", "متبقي")}</div>
                <div style={{ fontSize: 12, color: "var(--t3)" }}>{t("of", "من")} {(loan.amount || 0).toLocaleString()} EGP · {(loan.monthly_deduction || 0).toLocaleString()} EGP/{t("month","شهر")}</div>
              </div>
            </div>
            <div className="loan-progress"><div className="loan-progress-bar" style={{ width: `${paidPct}%` }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t3)" }}>
              <span>{paidPct}% {t("paid", "مدفوع")}</span>
              <span className={`badge ${loan.status === "active" ? "yellow" : "green"}`}>{loan.status}</span>
            </div>
            {loan.status === "active" && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={async () => {
                  const newRemaining = Math.max(0, loan.remaining - loan.monthly_deduction);
                  const newStatus = newRemaining <= 0 ? "settled" : "active";
                  await db("loans", "PATCH", { remaining: newRemaining, status: newStatus }, `?id=eq.${loan.id}`);
                  loadAll();
                }}>{t("Deduct Monthly", "خصم شهري")}</button>
                <button className="btn btn-success btn-sm" onClick={async () => { await db("loans", "PATCH", { remaining: 0, status: "settled" }, `?id=eq.${loan.id}`); loadAll(); }}>{t("Mark Settled", "تسوية كاملة")}</button>
              </div>
            )}
          </div>
        );
      })}

      <Modal show={modal === "addLoan"} onClose={() => setModal(null)} title={t("New Loan Request", "طلب قرض جديد")}>
        <div className="form-group"><label>{t("Employee", "الموظف")}</label>
          <select value={modalData.employee_id || ""} onChange={e => setModalData({ ...modalData, employee_id: +e.target.value })}>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group"><label>{t("Loan Amount (EGP)", "مبلغ القرض")}</label><input type="number" value={modalData.amount || ""} onChange={e => setModalData({ ...modalData, amount: +e.target.value, remaining: +e.target.value })} /></div>
          <div className="form-group"><label>{t("Monthly Deduction (EGP)", "الخصم الشهري")}</label><input type="number" value={modalData.monthly_deduction || ""} onChange={e => setModalData({ ...modalData, monthly_deduction: +e.target.value })} /></div>
        </div>
        {modalData.amount && modalData.monthly_deduction && (
          <div className="info-box">{t("Duration", "المدة")}: ~{Math.ceil(modalData.amount / modalData.monthly_deduction)} {t("months", "أشهر")}</div>
        )}
        <div className="form-group"><label>{t("Reason", "السبب")}</label><textarea rows={3} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} /></div>
        <div className="form-group"><label>{t("Start Date", "تاريخ البدء")}</label><input type="date" value={modalData.start_date || ""} onChange={e => setModalData({ ...modalData, start_date: e.target.value })} /></div>
        <div className="form-actions">
          <button className="btn btn-outline" onClick={() => setModal(null)}>{t("Cancel", "إلغاء")}</button>
          <button className="btn btn-primary" disabled={saving} onClick={async () => {
            setSaving(true);
            await db("loans", "POST", { ...modalData, status: "active" });
            await loadAll(); setSaving(false); setModal(null);
          }}>{saving ? <span className="spinner" /> : t("Approve Loan", "الموافقة على القرض")}</button>
        </div>
      </Modal>
    </div>
  );

  // ============================================================
  // RENDER: SELF SERVICE (Excuses & Leave)
  // ============================================================
  const renderSelfService = () => {
    const myExcuses = excuses.filter(e => e.employee_id === employees[0]?.id);
    const myLeaves = leaveReqs.filter(l => l.employee_id === employees[0]?.id);
    const pendingExcuses = excuses.filter(e => e.status === "pending");
    const pendingLeaves = leaveReqs.filter(l => l.status === "pending");

    return (
      <div className="fade-in">
        <div className="tab-bar">
          {[{ id: "myreqs", label: t("My Requests", "طلباتي") }, { id: "excuse", label: t("Request Excuse", "طلب إذن") }, { id: "leave", label: t("Request Leave", "طلب إجازة") }, { id: "admin", label: t("Manage Requests", "إدارة الطلبات") + (pendingExcuses.length + pendingLeaves.length > 0 ? ` (${pendingExcuses.length + pendingLeaves.length})` : "") }].map(tab => (
            <button key={tab.id} className={`tab ${modal === tab.id || (!modal && tab.id === "myreqs") ? "active" : ""}`} onClick={() => setModal(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {(modal === "myreqs" || !modal) && (
          <div>
            <div className="card-title" style={{ marginBottom: 16 }}>{t("My Excuse Requests", "طلبات الإذن")}</div>
            {myExcuses.length === 0 ? <div className="info-box">{t("No excuse requests", "لا توجد طلبات إذن")}</div> :
              myExcuses.map((ex, i) => (
                <div className="excuse-card" key={i}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ex.type} — {ex.date}</div>
                    <div style={{ fontSize: 13, color: "var(--t3)" }}>{ex.from_time} → {ex.to_time} · {ex.reason}</div>
                  </div>
                  <span className={`badge ${ex.status === "approved" ? "green" : ex.status === "rejected" ? "red" : "yellow"}`}>{ex.status}</span>
                </div>
              ))}
            <div className="card-title" style={{ margin: "24px 0 16px" }}>{t("My Leave Requests", "طلبات الإجازة")}</div>
            {myLeaves.length === 0 ? <div className="info-box">{t("No leave requests", "لا توجد طلبات إجازة")}</div> :
              myLeaves.map((lv, i) => (
                <div className="excuse-card" key={i}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{lv.type} — {lv.days} {t("days", "أيام")}</div>
                    <div style={{ fontSize: 13, color: "var(--t3)" }}>{lv.start_date} → {lv.end_date} · {lv.reason}</div>
                  </div>
                  <span className={`badge ${lv.status === "approved" ? "green" : lv.status === "rejected" ? "red" : "yellow"}`}>{lv.status}</span>
                </div>
              ))}
          </div>
        )}

        {modal === "excuse" && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>{t("Request an Excuse", "طلب إذن")}</div>
            <div className="form-group"><label>{t("Date", "التاريخ")}</label><input type="date" value={modalData.date || ""} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
            <div className="form-group"><label>{t("Type", "النوع")}</label>
              <select value={modalData.type || ""} onChange={e => setModalData({ ...modalData, type: e.target.value })}>
                <option value="">{t("Select type", "اختر النوع")}</option>
                <option value="Late Arrival">{t("Late Arrival", "تأخير")}</option>
                <option value="Early Departure">{t("Early Departure", "خروج مبكر")}</option>
                <option value="Personal Errand">{t("Personal Errand", "مأمورية شخصية")}</option>
                <option value="Medical">{t("Medical", "طبي")}</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t("From", "من")}</label><input type="time" value={modalData.from_time || ""} onChange={e => setModalData({ ...modalData, from_time: e.target.value })} /></div>
              <div className="form-group"><label>{t("To", "إلى")}</label><input type="time" value={modalData.to_time || ""} onChange={e => setModalData({ ...modalData, to_time: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>{t("Reason", "السبب")}</label><textarea rows={3} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} /></div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={saving || !modalData.date || !modalData.type || !modalData.reason} onClick={async () => {
                setSaving(true);
                await db("excuse_requests", "POST", { ...modalData, employee_id: employees[0]?.id, status: "pending" });
                await loadAll(); setSaving(false); setModalData({}); setModal("myreqs");
              }}>{saving ? <span className="spinner" /> : t("Submit Request", "إرسال الطلب")}</button>
            </div>
          </div>
        )}

        {modal === "leave" && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>{t("Request Leave", "طلب إجازة")}</div>
            <div className="form-group"><label>{t("Leave Type", "نوع الإجازة")}</label>
              <select value={modalData.type || ""} onChange={e => setModalData({ ...modalData, type: e.target.value })}>
                <option value="">{t("Select type", "اختر النوع")}</option>
                <option value="Annual Leave">{t("Annual Leave", "إجازة سنوية")}</option>
                <option value="Sick Leave">{t("Sick Leave", "إجازة مرضية")}</option>
                <option value="Personal Leave">{t("Personal Leave", "إجازة شخصية")}</option>
                <option value="Unpaid Leave">{t("Unpaid Leave", "إجازة بدون راتب")}</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{t("Start Date", "من")}</label><input type="date" value={modalData.start_date || ""} onChange={e => setModalData({ ...modalData, start_date: e.target.value })} /></div>
              <div className="form-group"><label>{t("End Date", "إلى")}</label><input type="date" value={modalData.end_date || ""} onChange={e => setModalData({ ...modalData, end_date: e.target.value })} /></div>
            </div>
            {modalData.start_date && modalData.end_date && (
              <div className="info-box">{t("Days", "أيام")}: {Math.max(0, Math.ceil((new Date(modalData.end_date) - new Date(modalData.start_date)) / 86400000) + 1)}</div>
            )}
            <div className="form-group"><label>{t("Reason", "السبب")}</label><textarea rows={3} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} /></div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={saving || !modalData.type || !modalData.start_date || !modalData.end_date} onClick={async () => {
                setSaving(true);
                const days = Math.ceil((new Date(modalData.end_date) - new Date(modalData.start_date)) / 86400000) + 1;
                await db("leave_requests", "POST", { ...modalData, employee_id: employees[0]?.id, days, status: "pending" });
                await loadAll(); setSaving(false); setModalData({}); setModal("myreqs");
              }}>{saving ? <span className="spinner" /> : t("Submit Request", "إرسال الطلب")}</button>
            </div>
          </div>
        )}

        {modal === "admin" && (
          <div>
            <div className="card-title" style={{ marginBottom: 16 }}>{t("Pending Excuse Requests", "طلبات الإذن المعلقة")}</div>
            {pendingExcuses.length === 0 ? <div className="info-box">{t("No pending excuse requests", "لا توجد طلبات إذن معلقة")}</div> :
              pendingExcuses.map((ex, i) => {
                const emp = employees.find(e => e.id === ex.employee_id);
                return (
                  <div className="excuse-card" key={i}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp?.name} — {ex.type}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)" }}>{ex.date} · {ex.from_time}→{ex.to_time} · {ex.reason}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-success btn-sm" onClick={async () => { await db("excuse_requests", "PATCH", { status: "approved" }, `?id=eq.${ex.id}`); loadAll(); }}><I.Check /></button>
                      <button className="btn btn-danger btn-sm" onClick={async () => { await db("excuse_requests", "PATCH", { status: "rejected" }, `?id=eq.${ex.id}`); loadAll(); }}><I.X /></button>
                    </div>
                  </div>
                );
              })}
            <div className="card-title" style={{ margin: "24px 0 16px" }}>{t("Pending Leave Requests", "طلبات الإجازة المعلقة")}</div>
            {pendingLeaves.length === 0 ? <div className="info-box">{t("No pending leave requests", "لا توجد طلبات إجازة معلقة")}</div> :
              pendingLeaves.map((lv, i) => {
                const emp = employees.find(e => e.id === lv.employee_id);
                return (
                  <div className="excuse-card" key={i}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp?.name} — {lv.type} ({lv.days} {t("days", "أيام")})</div>
                      <div style={{ fontSize: 13, color: "var(--t3)" }}>{lv.start_date} → {lv.end_date} · {lv.reason}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-success btn-sm" onClick={async () => { await db("leave_requests", "PATCH", { status: "approved" }, `?id=eq.${lv.id}`); loadAll(); }}><I.Check /></button>
                      <button className="btn btn-danger btn-sm" onClick={async () => { await db("leave_requests", "PATCH", { status: "rejected" }, `?id=eq.${lv.id}`); loadAll(); }}><I.X /></button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER: SETTINGS
  // ============================================================
  const renderSettings = () => (
    <div className="fade-in">
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>{t("System Settings", "إعدادات النظام")}</div>
        <div className="form-group"><label>{t("Language", "اللغة")}</label>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            <option value="en">English</option><option value="ar">العربية</option>
          </select>
        </div>
        <div className="form-group"><label>{t("Office Location", "موقع المكتب")}</label>
          <div className="info-box">{t("Lat", "خط العرض")}: {OFFICE_LAT} · {t("Lng", "خط الطول")}: {OFFICE_LNG} · {t("Radius", "النطاق")}: {OFFICE_RADIUS_KM * 1000}m</div>
        </div>
        <div className="form-group"><label>{t("Supabase Status", "حالة قاعدة البيانات")}</label>
          <span className={`badge ${SUPABASE_ANON_KEY ? "green" : "red"}`}>{SUPABASE_ANON_KEY ? t("Connected", "متصل") : t("No API Key", "لا يوجد مفتاح")}</span>
        </div>
        <div className="form-group"><label>{t("Version", "الإصدار")}</label>
          <span className="badge blue">myMayz HR v3.0</span>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // LAYOUT
  // ============================================================
  if (!loggedIn) return <><style>{css}</style><LoginPage lang={lang} setLang={setLang} onLogin={handleLogin} /></>;

  const navItems = [
    { id: "dashboard", icon: <I.Dashboard />, label: t("Dashboard", "لوحة التحكم") },
    { id: "employees", icon: <I.Users />, label: t("Employees", "الموظفون") },
    { id: "attendance", icon: <I.Clock />, label: t("Attendance", "الحضور") },
    { id: "payroll", icon: <I.Dollar />, label: t("Payroll", "الرواتب") },
    { id: "loans", icon: <I.Loan />, label: t("Loans", "القروض") },
    { id: "selfservice", icon: <I.SelfService />, label: t("Self-Service", "الخدمة الذاتية"), badge: excuses.filter(e => e.status === "pending").length + leaveReqs.filter(l => l.status === "pending").length || null },
    { id: "settings", icon: <I.Settings />, label: t("Settings", "الإعدادات") },
  ];

  const pages = { dashboard: renderDashboard, employees: renderEmployees, attendance: renderAttendance, payroll: renderPayroll, loans: renderLoans, selfservice: renderSelfService, settings: renderSettings };

  return (
    <>
      <style>{css}</style>
      <div className={`app ${ar ? "rtl" : ""}`}>
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header"><div className="sidebar-logo">my<span>Mayz</span> HR</div></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); if (item.id !== "selfservice") setModal(null); }}>
                {item.icon}<span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">AK</div>
              <div className="sidebar-user-info"><div className="sidebar-user-name">Ahmed Kardous</div><div className="sidebar-user-role">Admin</div></div>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--t2)", cursor: "pointer", padding: 4 }}><I.Logout /></button>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="topbar-btn mobile-menu" style={{ display: "none" }} onClick={() => setSidebarOpen(!sidebarOpen)}><I.Menu /></button>
              <div className="topbar-title">{navItems.find(n => n.id === page)?.label}</div>
            </div>
            <div className="topbar-actions">
              <button className="lang-toggle" onClick={() => setLang(ar ? "en" : "ar")}>{ar ? "English" : "العربية"}</button>
              <button className="topbar-btn notif-dot"><I.Bell /></button>
            </div>
          </header>
          <div className="content">{pages[page]?.()}</div>
        </div>

        {/* Photo Preview Modal */}
        {photoPreview && (
          <div className="modal-overlay" onClick={() => setPhotoPreview(null)}>
            <div style={{ background: "var(--card)", borderRadius: "var(--rl)", padding: 24, maxWidth: 400 }}>
              <img src={photoPreview} alt="attendance" style={{ width: "100%", borderRadius: 8 }} />
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button className="btn btn-outline" onClick={() => setPhotoPreview(null)}>{t("Close", "إغلاق")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
