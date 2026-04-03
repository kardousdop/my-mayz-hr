import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ============================================================
// SUPABASE
// ============================================================
const SUPABASE_URL = "https://qijcyebopepzzrrtflvm.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpamN5ZWJvcGVwenpycnRmbHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTc3MzUsImV4cCI6MjA5MDEzMzczNX0.Ej8X0ZjLJTLz7yYIHMkX2Y6b1jSnTCXlJgDxiX-SnCo";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpamN5ZWJvcGVwenpycnRmbHZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU1NzczNSwiZXhwIjoyMDkwMTMzNzM1fQ.iNyDJq4Xdzjr_kFlDEvYuIkULuhIrcVAHJ0bt-vumg4";

async function db(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  // Use service key for writes to bypass RLS, anon key for reads
  const key = (method === "GET") ? SUPABASE_ANON_KEY : SUPABASE_SERVICE_KEY;
  const headers = {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
    Prefer: "return=representation",
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    opts.signal = controller.signal;
    const res = await fetch(url, opts);
    clearTimeout(timeout);
    if (!res.ok) { console.error(`DB ${method} ${table}:`, res.status, await res.text()); return null; }
    if (method === "DELETE") return true;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    if (e.name === "AbortError") { console.warn(`DB timeout: ${table}`); return null; }
    console.error("DB error:", e); return null;
  }
}

// ============================================================
// GPS
// ============================================================
function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Geolocation not supported")); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      e => reject(new Error(e.code === 1 ? "Location permission denied. Please allow location access." : "Location unavailable.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ============================================================
// CAMERA PHOTO CAPTURE
// ============================================================
function capturePhoto() {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false })
      .then(stream => {
        video.srcObject = stream;
        video.play();
        setTimeout(() => {
          canvas.width = 320;
          canvas.height = 240;
          canvas.getContext("2d").drawImage(video, 0, 0, 320, 240);
          stream.getTracks().forEach(t => t.stop());
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        }, 1500);
      })
      .catch(() => reject(new Error("Camera access denied. Please allow camera and try again.")));
  });
}
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

// ============================================================
// WORKING HOURS & SHIFT CONFIG
// ============================================================
const MIN_SHIFT_HOURS = 8;
const DEFAULT_SHIFTS = [
  { id: 1, name: "Morning Shift", name_ar: "الوردية الصباحية", start_time: "09:00", end_time: "17:00", is_night_shift: false, grace_minutes: 15, color: "#10b981" },
  { id: 2, name: "Evening Shift", name_ar: "الوردية المسائية", start_time: "14:00", end_time: "22:00", is_night_shift: false, grace_minutes: 15, color: "#f59e0b" },
  { id: 3, name: "Night Shift",   name_ar: "الوردية الليلية",  start_time: "22:00", end_time: "06:00", is_night_shift: true,  grace_minutes: 15, color: "#6366f1" },
  { id: 4, name: "Split Shift",   name_ar: "الوردية المقسمة",  start_time: "08:00", end_time: "20:00", is_night_shift: false, grace_minutes: 15, color: "#3b82f6" },
  { id: 5, name: "Weekend Morning", name_ar: "صباح الأسبوع", start_time: "09:00", end_time: "15:00", is_night_shift: false, grace_minutes: 15, color: "#10b981" },
];

function getShiftStatus(shift, clockInTime) {
  if (!shift) return "present";
  const [sh, sm] = shift.start_time.split(":").map(Number);
  const grace = shift.grace_minutes || 15;
  const clockMin = clockInTime.getHours() * 60 + clockInTime.getMinutes();
  const shiftMin = sh * 60 + sm;
  // For night shift, adjust comparison
  let diff = clockMin - shiftMin;
  if (shift.is_night_shift && diff < -600) diff += 1440;
  if (diff <= grace) return "present";
  if (diff <= grace + 60) return "late";
  return "very_late";
}

// ============================================================
// APPROVED GPS LOCATIONS — update coords when confirmed
// ============================================================
// Load GPS locations from localStorage (admin can edit from Settings)
function getApprovedLocations() {
  try {
    const saved = localStorage.getItem("mymayz_locations");
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return [
    { id: "office",    name: "Office",        nameAr: "المكتب",    lat: 30.0446215, lng: 31.1988618, radius: 0.5, icon: "🏢" },
    { id: "warehouse", name: "Warehouse",     nameAr: "المستودع",  lat: 29.9527,    lng: 30.9219,    radius: 0.5, icon: "🏭" },
    { id: "mall",      name: "Mall of Egypt", nameAr: "مول مصر",   lat: 29.97243,   lng: 31.01641,   radius: 0.5, icon: "🛍️" },
  ];
}
const APPROVED_LOCATIONS = getApprovedLocations();

function getMatchedLocation(lat, lng, approvedIds) {
  const locs = getApprovedLocations(); // always reads latest from localStorage
  const toCheck = approvedIds?.length > 0
    ? locs.filter(l => approvedIds.includes(l.id))
    : locs;
  for (const loc of toCheck) {
    if (distKm(lat, lng, loc.lat, loc.lng) <= loc.radius) return loc;
  }
  return null;
}

// Distance calculation — proper Haversine formula (accurate)
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ============================================================
// CSS
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  :root{
    --bg:#080c18;--bg2:#0f1623;--card:#141c2e;--card2:#1a2440;
    --border:#1e2d4a;--border2:#2a3d60;
    --t1:#eef0f8;--t2:#7c89a8;--t3:#4a5570;
    --acc:#6366f1;--acc2:#818cf8;--acc3:#4f46e5;--accg:rgba(99,102,241,0.12);
    --ok:#10b981;--okb:rgba(16,185,129,0.1);
    --warn:#f59e0b;--warnb:rgba(245,158,11,0.1);
    --err:#ef4444;--errb:rgba(239,68,68,0.1);
    --info:#3b82f6;--infob:rgba(59,130,246,0.1);
    --sw:264px;--r:14px;--rs:9px;--rl:18px;
    --shadow:0 4px 24px rgba(0,0,0,0.4);
    --shadow-lg:0 8px 48px rgba(0,0,0,0.6);
  }
  html{-webkit-tap-highlight-color:transparent}
  body,#root{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;font-size:14px;line-height:1.5}
  .rtl{direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif}
  .app{display:flex;min-height:100vh}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}

  /* ── LOGIN ── */
  .login-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 20% 50%,rgba(99,102,241,0.15) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(16,185,129,0.08) 0%,transparent 50%),var(--bg)}
  .login-card{background:var(--card);border:1px solid var(--border);border-radius:var(--rl);padding:48px 40px;width:420px;max-width:94vw;box-shadow:var(--shadow-lg)}
  .login-logo{font-size:30px;font-weight:700;text-align:center;margin-bottom:6px;letter-spacing:-0.5px}.login-logo span{color:var(--acc)}
  .login-tagline{text-align:center;color:var(--t3);font-size:13px;margin-bottom:36px}
  .login-field{margin-bottom:18px}.login-field label{display:block;font-size:12px;color:var(--t2);margin-bottom:6px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase}
  .login-field input{width:100%;padding:12px 16px;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;transition:border-color 0.2s,box-shadow 0.2s;font-family:inherit}
  .login-field input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
  .login-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--acc),var(--acc3));color:white;border:none;border-radius:var(--rs);font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 12px rgba(99,102,241,0.4)}
  .login-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,0.5)}.login-btn:disabled{opacity:0.5;cursor:not-allowed}
  .login-error{background:var(--errb);border:1px solid var(--err);color:var(--err);padding:10px 14px;border-radius:var(--rs);font-size:13px;margin-bottom:16px}
  .login-lang{display:flex;justify-content:center;gap:12px;margin-top:20px}
  .login-lang button{background:none;border:none;color:var(--t3);cursor:pointer;font-size:13px;font-family:inherit;padding:4px 8px;transition:color 0.15s}
  .login-lang button.active{color:var(--acc);font-weight:600}

  /* ── SIDEBAR ── */
  .sidebar{width:var(--sw);background:var(--card);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:200;transition:transform 0.28s cubic-bezier(0.4,0,0.2,1);box-shadow:var(--shadow)}
  .rtl .sidebar{left:auto;right:0;border-right:none;border-left:1px solid var(--border)}
  .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:199;backdrop-filter:blur(3px);transition:opacity 0.28s}
  .sidebar-header{padding:22px 20px 18px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(99,102,241,0.08),transparent)}
  .sidebar-logo{font-size:21px;font-weight:700;letter-spacing:-0.3px}.sidebar-logo span{color:var(--acc)}
  .sidebar-logo-sub{font-size:11px;color:var(--t3);margin-top:2px;font-weight:400}
  .sidebar-nav{flex:1;padding:10px 0;overflow-y:auto}
  .nav-section{font-size:10px;font-weight:700;color:var(--t3);letter-spacing:1px;text-transform:uppercase;padding:14px 20px 6px}
  .nav-item{display:flex;align-items:center;gap:11px;width:100%;padding:10px 16px;background:none;border:none;color:var(--t2);cursor:pointer;font-size:13.5px;font-weight:500;transition:all 0.15s;font-family:inherit;text-align:left;border-radius:8px;margin:1px 8px;width:calc(100% - 16px)}
  .rtl .nav-item{text-align:right}
  .nav-item:hover{background:var(--accg);color:var(--t1)}
  .nav-item.active{background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(99,102,241,0.08));color:var(--acc);font-weight:600;box-shadow:inset 2px 0 0 var(--acc)}
  .rtl .nav-item.active{box-shadow:inset -2px 0 0 var(--acc)}
  .nav-badge{margin-left:auto;background:var(--err);color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center;animation:pulse 2s infinite}
  .rtl .nav-badge{margin-left:0;margin-right:auto}
  .sidebar-footer{padding:14px 16px;border-top:1px solid var(--border)}
  .sidebar-user{display:flex;align-items:center;gap:10px;padding:8px;border-radius:var(--rs);transition:background 0.15s;cursor:default}
  .sidebar-user:hover{background:var(--bg2)}
  .sidebar-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--acc),var(--acc3));color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;box-shadow:0 2px 8px rgba(99,102,241,0.4)}
  .sidebar-user-info{flex:1;min-width:0}
  .sidebar-user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sidebar-user-role{font-size:11px;color:var(--t3);text-transform:capitalize}

  /* ── TOPBAR ── */
  .main{flex:1;margin-left:var(--sw);display:flex;flex-direction:column;min-height:100vh;background:var(--bg)}
  .rtl .main{margin-left:0;margin-right:var(--sw)}
  .topbar{height:60px;background:var(--card);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:100;box-shadow:0 1px 12px rgba(0,0,0,0.3)}
  .topbar-title{font-size:16px;font-weight:600;color:var(--t1);display:flex;align-items:center;gap:8px}
  .topbar-actions{display:flex;align-items:center;gap:10px}
  .topbar-btn{background:var(--bg2);border:1px solid var(--border);color:var(--t2);width:34px;height:34px;border-radius:var(--rs);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-size:15px}
  .topbar-btn:hover{border-color:var(--acc);color:var(--acc);background:var(--accg)}
  .hamburger{display:none;background:none;border:none;color:var(--t1);font-size:20px;cursor:pointer;padding:6px;border-radius:var(--rs);transition:background 0.15s;line-height:1}
  .hamburger:hover{background:var(--bg2)}
  .lang-toggle{background:var(--accg);border:1px solid rgba(99,102,241,0.3);color:var(--acc2);padding:5px 12px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all 0.2s}
  .lang-toggle:hover{background:var(--acc);color:white;border-color:var(--acc)}
  .content{padding:24px;flex:1}

  /* ── STATS ── */
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;transition:all 0.2s;cursor:default;position:relative;overflow:hidden}
  .stat-card::after{content:'';position:absolute;top:0;right:0;width:60px;height:60px;background:radial-gradient(circle at top right,rgba(255,255,255,0.03),transparent)}
  .stat-card:hover{border-color:var(--border2);transform:translateY(-2px);box-shadow:var(--shadow)}
  .stat-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:17px}
  .stat-icon.blue{background:var(--infob);color:var(--info)}.stat-icon.green{background:var(--okb);color:var(--ok)}
  .stat-icon.yellow{background:var(--warnb);color:var(--warn)}.stat-icon.red{background:var(--errb);color:var(--err)}.stat-icon.purple{background:var(--accg);color:var(--acc)}
  .stat-value{font-size:24px;font-weight:700;margin-bottom:3px;letter-spacing:-0.5px}
  .stat-label{font-size:12px;color:var(--t3);font-weight:500}

  /* ── CARDS ── */
  .card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:22px;margin-bottom:18px}
  .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px}
  .card-title{font-size:15px;font-weight:600;letter-spacing:-0.2px}

  /* ── TABLE ── */
  .table-wrap{overflow-x:auto;border-radius:var(--r);border:1px solid var(--border)}
  table{width:100%;border-collapse:collapse;min-width:600px}
  .sort-th{cursor:pointer;user-select:none;white-space:nowrap}
  .sort-th:hover{color:var(--acc);background:rgba(99,102,241,0.06)}
  .sort-th .sort-arrow{margin-left:4px;opacity:0.5;font-size:10px}
  .sort-th.active-sort{color:var(--acc)}
  .sort-th.active-sort .sort-arrow{opacity:1}
  th{text-align:left;font-size:11px;color:var(--t3);font-weight:600;padding:11px 14px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:0.6px;background:var(--bg2);white-space:nowrap}
  .rtl th{text-align:right}
  td{padding:12px 14px;font-size:13px;border-bottom:1px solid var(--border);color:var(--t2);vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:var(--card2)}

  /* ── BADGES ── */
  .badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
  .badge.green{background:var(--okb);color:var(--ok)}.badge.red{background:var(--errb);color:var(--err)}
  .badge.yellow{background:var(--warnb);color:var(--warn)}.badge.blue{background:var(--infob);color:var(--info)}
  .badge.purple{background:var(--accg);color:var(--acc2)}.badge.gray{background:var(--bg2);color:var(--t3)}

  /* ── BUTTONS ── */
  .btn{padding:9px 18px;border-radius:var(--rs);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;border:none;font-family:inherit;display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
  .btn-primary{background:linear-gradient(135deg,var(--acc),var(--acc3));color:white;box-shadow:0 2px 8px rgba(99,102,241,0.3)}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(99,102,241,0.4)}
  .btn-outline{background:transparent;border:1px solid var(--border);color:var(--t2)}.btn-outline:hover{border-color:var(--acc);color:var(--acc);background:var(--accg)}
  .btn-success{background:var(--ok);color:white;box-shadow:0 2px 8px rgba(16,185,129,0.3)}.btn-success:hover{background:#0d9d6e}
  .btn-danger{background:var(--err);color:white;box-shadow:0 2px 8px rgba(239,68,68,0.3)}.btn-danger:hover{background:#dc2626}
  .btn-warning{background:var(--warn);color:white}.btn-warning:hover{background:#d97706}
  .btn-sm{padding:5px 12px;font-size:12px}
  .btn:disabled{opacity:0.45;cursor:not-allowed;transform:none !important;box-shadow:none !important}

  /* ── CLOCK ── */
  .clock-section{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px}
  .clock-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:28px 24px;text-align:center;position:relative;overflow:hidden;transition:all 0.2s}
  .clock-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--r) var(--r) 0 0}
  .clock-card.in::before{background:linear-gradient(90deg,var(--ok),#34d399)}.clock-card.out::before{background:linear-gradient(90deg,var(--err),#f87171)}
  .clock-card::after{content:'';position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.02),transparent)}
  .clock-time{font-size:42px;font-weight:700;margin:14px 0 6px;font-variant-numeric:tabular-nums;letter-spacing:-1px}
  .clock-date{color:var(--t3);font-size:13px;margin-bottom:20px}
  .clock-btn{padding:13px 36px;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;border:none;color:white;transition:all 0.2s;font-family:inherit;letter-spacing:0.2px}
  .clock-btn:disabled{opacity:0.45;cursor:not-allowed}
  .clock-btn.in{background:linear-gradient(135deg,var(--ok),#059669)}.clock-btn.in:hover:not(:disabled){transform:scale(1.03);box-shadow:0 6px 20px rgba(16,185,129,0.4)}
  .clock-btn.out{background:linear-gradient(135deg,var(--err),#dc2626)}.clock-btn.out:hover:not(:disabled){transform:scale(1.03);box-shadow:0 6px 20px rgba(239,68,68,0.4)}
  .verify-steps{display:flex;flex-direction:column;gap:8px;margin-top:18px}
  .verify-step{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border-radius:var(--rs);font-size:13px;text-align:left;border:1px solid var(--border);transition:all 0.2s}
  .verify-step.error{background:var(--errb);border-color:var(--err)}.verify-step.success{background:var(--okb);border-color:rgba(16,185,129,0.3)}
  .verify-icon{font-size:15px;flex-shrink:0}
  .gps-coords{font-size:11px;color:var(--t3);margin-top:3px}

  /* ── MODAL ── */
  .modal-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;backdrop-filter:blur(4px)}
  .modal{background:var(--card);border:1px solid var(--border);border-radius:var(--rl);padding:28px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-lg);animation:fadeIn 0.2s ease}
  .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
  .modal-title{font-size:17px;font-weight:700}

  /* ── FORMS ── */
  .form-group{margin-bottom:14px}
  .form-group label{display:block;font-size:12px;color:var(--t2);margin-bottom:5px;font-weight:500}
  .form-group input,.form-group select,.form-group textarea{width:100%;padding:10px 13px;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:13px;outline:none;font-family:inherit;transition:border-color 0.2s,box-shadow 0.2s}
  .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(99,102,241,0.12)}
  .form-group select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a6580' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .form-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px;flex-wrap:wrap}

  /* ── MISC COMPONENTS ── */
  .emp-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accg),rgba(99,102,241,0.2));color:var(--acc2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;border:1px solid rgba(99,102,241,0.2)}
  .emp-row{display:flex;align-items:center;gap:10px}
  .search-bar{position:relative;margin-bottom:18px}
  .search-bar input{width:100%;padding:11px 16px 11px 42px;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:13px;outline:none;font-family:inherit;transition:border-color 0.2s}
  .search-bar input:focus{border-color:var(--acc)}
  .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:15px}
  .notif-dot{position:relative}
  .notif-dot::after{content:'';position:absolute;top:-2px;right:-2px;width:7px;height:7px;background:var(--err);border-radius:50%;border:2px solid var(--card)}
  .photo-thumb{width:44px;height:34px;border-radius:6px;object-fit:cover;border:1px solid var(--border);cursor:pointer;transition:transform 0.15s}.photo-thumb:hover{transform:scale(1.1)}
  .info-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);padding:14px 16px;margin-bottom:14px;font-size:13px;color:var(--t2);line-height:1.6}
  .net-salary-box{background:var(--okb);border:1px solid rgba(16,185,129,0.3);border-radius:var(--rs);padding:18px;text-align:center;margin-top:14px}
  .net-salary-box .amount{font-size:30px;font-weight:700;color:var(--ok);letter-spacing:-0.5px}
  .net-salary-box .label{font-size:12px;color:var(--t3);margin-top:3px}
  .loan-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:18px;margin-bottom:14px}
  .loan-progress{height:7px;background:var(--bg2);border-radius:4px;margin:10px 0;overflow:hidden}
  .loan-bar{height:100%;background:linear-gradient(90deg,var(--warn),#fbbf24);border-radius:4px;transition:width 0.6s ease}
  .req-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:10px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;transition:border-color 0.2s}
  .req-card:hover{border-color:var(--border2)}
  .ss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-bottom:22px}
  .ss-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:22px;cursor:pointer;transition:all 0.2s}
  .ss-card:hover{border-color:var(--acc);transform:translateY(-2px);box-shadow:0 4px 20px rgba(99,102,241,0.15)}
  .ss-card-icon{font-size:26px;margin-bottom:10px}
  .ss-card-title{font-size:14px;font-weight:600;margin-bottom:5px}
  .ss-card-desc{font-size:12px;color:var(--t2);line-height:1.5}
  .payroll-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
  .pfield label{font-size:11px;color:var(--t3);display:block;margin-bottom:3px;font-weight:500}
  .pfield input{width:100%;padding:8px 10px;background:var(--bg2);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:13px;font-weight:600;outline:none;font-family:inherit;transition:border-color 0.2s}
  .pfield input:focus{border-color:var(--acc)}
  .tab-bar{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:22px;overflow-x:auto;scrollbar-width:none}
  .tab-bar::-webkit-scrollbar{display:none}
  .tab{padding:9px 18px;background:none;border:none;color:var(--t3);cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;white-space:nowrap}
  .tab.active{color:var(--acc);border-bottom-color:var(--acc);font-weight:600}
  .tab:hover:not(.active){color:var(--t1)}

  /* ── ANIMATIONS ── */
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.5)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideIn{from{transform:translateX(-8px);opacity:0}to{transform:translateX(0);opacity:1}}
  .fade-in{animation:fadeIn 0.25s ease forwards}
  .spinner{display:inline-block;width:15px;height:15px;border:2px solid var(--border2);border-top-color:var(--acc);border-radius:50%;animation:spin 0.7s linear infinite}

  /* ── LIVE INDICATOR ── */
  .live-dot{width:8px;height:8px;border-radius:50%;background:var(--ok);animation:pulse 2.5s infinite;flex-shrink:0}

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     MOBILE RESPONSIVE — 768px and below
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-110%); box-shadow: none }
    .rtl .sidebar { transform: translateX(110%); }
    .sidebar.open { transform: translateX(0); box-shadow: var(--shadow-lg) }
    .sidebar-overlay.open { display: block; }
    .main { margin-left: 0 !important; margin-right: 0 !important; }
    .hamburger { display: flex; align-items: center; justify-content: center; }
    .topbar { padding: 0 14px; height: 54px; }
    .topbar-title { font-size: 14px; }
    .content { padding: 14px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
    .stat-card { padding: 14px 12px; }
    .stat-icon { width: 32px; height: 32px; font-size: 14px; margin-bottom: 10px; }
    .stat-value { font-size: 20px; }
    .stat-label { font-size: 11px; }
    .card { padding: 16px; margin-bottom: 12px; }
    .card-title { font-size: 14px; }
    .card-header { flex-direction: column; align-items: flex-start; gap: 8px; }
    .clock-section { grid-template-columns: 1fr; gap: 12px; }
    .clock-time { font-size: 38px; }
    .clock-card { padding: 22px 18px; }
    .clock-btn { padding: 13px 30px; font-size: 15px; }
    .form-row { grid-template-columns: 1fr; gap: 10px; }
    .form-actions { justify-content: stretch; }
    .form-actions .btn { flex: 1; justify-content: center; }
    table { font-size: 12px; min-width: 480px; }
    th { padding: 9px 10px; font-size: 10px; }
    td { padding: 10px; }
    .btn { padding: 8px 14px; font-size: 12px; }
    .btn-sm { padding: 5px 9px; font-size: 11px; }
    .modal { padding: 20px 16px; border-radius: var(--r); }
    .modal-title { font-size: 15px; }
    .ss-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .ss-card { padding: 16px 14px; }
    .ss-card-icon { font-size: 22px; margin-bottom: 8px; }
    .ss-card-title { font-size: 13px; }
    .payroll-grid { grid-template-columns: repeat(2, 1fr); }
    .live-indicator-text { display: none; }
    .lang-toggle { padding: 4px 10px; font-size: 11px; }
    .tab { padding: 8px 14px; font-size: 12px; }
    .tab-bar { margin-bottom: 16px; }
    .req-card { flex-direction: column; }
    .req-card > div:last-child { width: 100%; display: flex; gap: 8px; }
    .req-card > div:last-child .btn { flex: 1; justify-content: center; }
    .search-bar input { font-size: 13px; padding: 10px 14px 10px 38px; }
    .verify-step { padding: 9px 12px; font-size: 12px; }
  }
  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .stat-value { font-size: 18px; }
    .clock-time { font-size: 32px; }
    .content { padding: 12px; }
    .card { padding: 14px; }
    .ss-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .topbar { height: 50px; }
    .topbar-title { font-size: 13px; }
  }
`;

// ============================================================
// MODAL
// ============================================================
function Modal({ show, onClose, title, children, width }) {
  if (!show) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={width ? { width } : {}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--t2)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// BTN COMPONENT
// ============================================================
function Btn({ onClick, disabled, color = "outline", size = "normal", children }) {
  const colors = {
    primary: { background: "var(--acc)", color: "white", border: "none" },
    outline: { background: "transparent", color: "var(--t2)", border: "1px solid var(--border)" },
    success: { background: "var(--ok)", color: "white", border: "none" },
    danger: { background: "var(--err)", color: "white", border: "none" },
    warning: { background: "var(--warn)", color: "white", border: "none" },
  };
  const sizes = {
    normal: { padding: "10px 20px", fontSize: 13 },
    sm: { padding: "6px 14px", fontSize: 12 },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...colors[color], ...sizes[size],
        borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit", fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >{children}</button>
  );
}

// ============================================================
// SIGNUP PAGE
// ============================================================
function SignupPage({ lang, setLang, onBack }) {
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const ar = lang === "ar";
  const T = (en, a) => ar ? a : en;

  const createAccount = async () => {
    if (!name.trim()) { setError(T("Please enter your full name.", "يرجى إدخال اسمك الكامل.")); return; }
    if (password !== confirm) { setError(T("Passwords do not match.", "كلمتا المرور غير متطابقتين.")); return; }
    if (password.length < 8) { setError(T("Password must be at least 8 characters.", "كلمة المرور 8 أحرف على الأقل.")); return; }
    setError(""); setLoading(true);
    try {
      // Check if email already exists in employees table
      const existing = await db("employees", "GET", null, `?email=eq.${encodeURIComponent(email)}&select=id,status`);
      if (existing && existing.length > 0) {
        const existingEmp = existing[0];
        if (existingEmp.status === "pending") {
          setError(T("This email is already registered and waiting for approval.", "هذا البريد مسجل بالفعل وينتظر الموافقة.")); setLoading(false); return;
        }
        if (existingEmp.status === "active") {
          setError(T("This email is already registered and active. Contact admin.", "هذا البريد مسجل ونشط. تواصل مع المشرف.")); setLoading(false); return;
        }
        // status = inactive/deleted — update existing record instead of creating new
        if (existingEmp.status === "inactive") {
          setError(T("This email was previously deactivated. Contact admin to reactivate.", "هذا البريد كان معطلاً. تواصل مع المشرف لإعادة التفعيل.")); setLoading(false); return;
        }
      }

      // ── Generate UNIQUE code ──
      // Get ALL existing codes to find the real max — handles deletions correctly
      const allEmps = await db("employees", "GET", null, "?select=employee_code");
      let maxNum = 0;
      (allEmps || []).forEach(e => {
        const match = (e.employee_code || "").match(/EMP(\d+)/);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
      });
      let nextNum = maxNum + 1;
      // Double-check this code doesn't already exist (safety net)
      let code = "EMP" + String(nextNum).padStart(3, "0");
      while ((allEmps || []).some(e => e.employee_code === code)) {
        nextNum++;
        code = "EMP" + String(nextNum).padStart(3, "0");
      }

      // Register in Supabase Auth
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password, data: { name, employee_code: code } }),
      });
      const data = await res.json();
      // If auth user already exists (previously deleted from employees but auth remains)
      // Supabase returns a fake success — we just proceed to create/update employee record
      if (data.error && !data.id && !data.access_token) {
        // Only fail if it's not a "user already exists" situation
        const errMsg = data.error?.message || data.msg || "";
        if (!errMsg.toLowerCase().includes("already") && !errMsg.toLowerCase().includes("registered")) {
          setError(errMsg || T("Registration failed.", "فشل التسجيل.")); setLoading(false); return;
        }
        // User exists in auth but not in employees — continue to create employee record
      }

      // Create employee record
      await db("employees", "POST", {
        employee_code: code,
        name: name.trim(),
        name_ar: nameAr.trim() || name.trim(),
        email,
        status: "pending",
        role: "employee",
        avatar: name.trim().substring(0, 2).toUpperCase(),
        salary: 0,
      });

      // ── Notify admin — hardcoded credentials (work across all devices) ──
      const msg = encodeURIComponent(`🆕 New Employee Registration!\nName: ${name.trim()}\nEmail: ${email}\nCode: ${code}\nGo to Employees page to approve.`);
      // WhatsApp — admin
      fetch(`https://api.callmebot.com/whatsapp.php?phone=201004444558&text=${msg}&apikey=2789945`).catch(()=>{});
      // Email — via Brevo
      fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": "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"
        },
        body: JSON.stringify({
          sender: { name: "myMayz HR", email: "hello@mymayz.com" },
          to: [{ email: "hello@mymayz.com", name: "Ahmed Kardous" }],
          subject: `🆕 New Employee Signup — ${name.trim()} (${code})`,
          htmlContent: `<div style="font-family:Arial,sans-serif;max-width:500px;padding:24px;background:#f5f5f5">
            <div style="background:#1a2035;padding:20px;border-radius:8px;text-align:center;margin-bottom:20px">
              <h2 style="color:white;margin:0">my<span style="color:#6366f1">Mayz</span> HR</h2>
            </div>
            <div style="background:white;padding:20px;border-radius:8px;border-left:4px solid #f59e0b">
              <h3 style="color:#f59e0b;margin-top:0">⏳ New Employee Awaiting Approval</h3>
              <p><b>Name:</b> ${name.trim()}</p>
              <p><b>Email:</b> ${email}</p>
              <p><b>Code:</b> ${code}</p>
              <p style="color:#666">Go to <b>Employees</b> page in myMayz HR to approve and activate this account.</p>
              <a href="https://my-mayz-hr.vercel.app" style="display:inline-block;background:#6366f1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:10px">Open myMayz HR →</a>
            </div>
          </div>`
        })
      }).catch(()=>{});

      setSuccess({ name: name.trim(), code, email });
    } catch(e) { setError(T("Registration failed. Please try again.", "فشل التسجيل. حاول مرة أخرى.")); }
    setLoading(false);
  };

  if (success) return (
    <div className={`login-page ${ar ? "rtl" : ""}`}>
      <div className="login-card fade-in" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <div className="login-logo">my<span>Mayz</span> HR</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ok)", margin: "16px 0 8px" }}>{T("Registration Successful!", "تم التسجيل بنجاح!")}</div>
        <div className="info-box" style={{ textAlign: ar ? "right" : "left", margin: "16px 0" }}>
          <div style={{ marginBottom: 8 }}>👤 <strong>{success.name}</strong></div>
          <div style={{ marginBottom: 8 }}>🔑 {T("Your Employee Code", "كود موظفك")}: <strong style={{ color: "var(--acc)", fontSize: 18, letterSpacing: 2 }}>{success.code}</strong></div>
          <div>📧 {success.email}</div>
        </div>
        <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 24, lineHeight: 1.7, textAlign: ar ? "right" : "left" }}>
          ⏳ {T("Your account is pending Admin approval. You will be able to login once activated. Please save your Employee Code above.", "حسابك في انتظار موافقة المشرف. ستتمكن من تسجيل الدخول بعد التفعيل. يرجى حفظ كود الموظف أعلاه.")}
        </div>
        <button className="login-btn" onClick={onBack}>{T("← Back to Login", "← العودة لتسجيل الدخول")}</button>
      </div>
    </div>
  );

  return (
    <div className={`login-page ${ar ? "rtl" : ""}`}>
      <div className="login-card fade-in">
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← {T("Back", "رجوع")}
        </button>
        <div className="login-logo">my<span>Mayz</span> HR</div>
        <div className="login-tagline">✨ {T("Create Your Account", "إنشاء حسابك")}</div>
        <div className="info-box" style={{ marginBottom: 16 }}>
          💡 {T("Fill in your details below. Your Employee Code will be automatically generated and shown to you after registration.", "أدخل بياناتك أدناه. سيتم إنشاء كود الموظف تلقائياً وعرضه لك بعد التسجيل.")}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label>{T("Full Name (English) *", "الاسم الكامل بالإنجليزية *")}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed Mohamed" />
        </div>
        <div className="login-field">
          <label>{T("Full Name (Arabic)", "الاسم الكامل بالعربية")}</label>
          <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="أحمد محمد" />
        </div>
        <div className="login-field">
          <label>{T("Email *", "البريد الإلكتروني *")}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmed@company.com" />
        </div>
        <div className="login-field">
          <label>{T("Password (min 8 characters) *", "كلمة المرور (8 أحرف على الأقل) *")}</label>
          <div style={{ position: "relative" }}>
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--t3)", padding: 0 }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <div className="login-field">
          <label>{T("Confirm Password *", "تأكيد كلمة المرور *")}</label>
          <div style={{ position: "relative" }}>
            <input type={showPw ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && createAccount()}
              style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--t3)", padding: 0 }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <button className="login-btn" onClick={createAccount} disabled={loading || !name || !email || !password || !confirm}>
          {loading ? <><span className="spinner" />{T("Creating account...", "جاري إنشاء الحساب...")}</> : T("Create Account →", "إنشاء الحساب ←")}
        </button>
        <div className="login-lang" style={{ marginTop: 20 }}>
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
          <button className={lang === "ar" ? "active" : ""} onClick={() => setLang("ar")}>العربية</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PORTAL SELECTOR
// ============================================================
function PortalSelector({ lang, setLang, onSelect, onSignup }) {
  const ar = lang === "ar";
  const T = (en, a) => ar ? a : en;
  const portals = [
    { role: "admin", icon: "🛡️", title: T("Admin Portal", "بوابة المشرف"), desc: T("Full system access", "وصول كامل للنظام"), color: "#6366f1" },
    { role: "hr", icon: "👥", title: T("HR Portal", "بوابة الموارد البشرية"), desc: T("Employee & attendance management", "إدارة الموظفين والحضور"), color: "#10b981" },
    { role: "accountant", icon: "💰", title: T("Accountant Portal", "بوابة المحاسب"), desc: T("Payroll, loans & financials", "الرواتب والقروض والمالية"), color: "#f59e0b" },
    { role: "employee", icon: "🙋", title: T("Employee Portal", "بوابة الموظف"), desc: T("My profile, attendance & requests", "ملفي وحضوري وطلباتي"), color: "#3b82f6" },
  ];
  return (
    <div className={`login-page ${ar ? "rtl" : ""}`}>
      <div className="login-card fade-in" style={{ maxWidth: 460 }}>
        <div className="login-logo">my<span>Mayz</span> HR</div>
        <div className="login-tagline">{T("Smart HR Automation Platform", "منصة أتمتة الموارد البشرية الذكية")}</div>
        <div style={{ fontSize: 13, color: "var(--t3)", textAlign: "center", marginBottom: 20 }}>{T("Select your portal to continue", "اختر بوابتك للمتابعة")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {portals.map(p => (
            <button key={p.role} onClick={() => onSelect(p.role)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", textAlign: ar ? "right" : "left" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.background = "var(--card2)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg2)"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: p.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--t1)", fontSize: 14 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{p.desc}</div>
              </div>
              <div style={{ color: "var(--t3)", fontSize: 18 }}>{ar ? "←" : "→"}</div>
            </button>
          ))}
        </div>
        {/* Signup Link */}
        <div style={{ marginTop: 20, padding: "14px 18px", background: "var(--bg2)", border: "1px dashed var(--border)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 8 }}>
            {T("New employee? Register with your employee code", "موظف جديد؟ سجّل بكود الموظف الخاص بك")}
          </div>
          <button onClick={onSignup} style={{ background: "var(--accg)", border: "1px solid var(--acc)", color: "var(--acc)", padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--acc)"; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--accg)"; e.currentTarget.style.color = "var(--acc)"; }}>
            ✨ {T("Create Account", "إنشاء حساب جديد")}
          </button>
        </div>
        <div className="login-lang" style={{ marginTop: 16 }}>
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
          <button className={lang === "ar" ? "active" : ""} onClick={() => setLang("ar")}>العربية</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// LOGIN PAGE (role-specific)
// ============================================================
function LoginPage({ lang, setLang, role, onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const ar = lang === "ar";
  const T = (en, a) => ar ? a : en;

  const roleInfo = {
    admin: { icon: "🛡️", title: T("Admin Portal", "بوابة المشرف"), color: "#6366f1", placeholder: "hello@mymayz.com" },
    hr: { icon: "👥", title: T("HR Portal", "بوابة الموارد البشرية"), color: "#10b981", placeholder: "hr@mymayz.com" },
    accountant: { icon: "💰", title: T("Accountant Portal", "بوابة المحاسب"), color: "#f59e0b", placeholder: "accountant@mymayz.com" },
    employee: { icon: "🙋", title: T("Employee Portal", "بوابة الموظف"), color: "#3b82f6", placeholder: "employee@mymayz.com" },
  }[role] || {};

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      // Try Supabase Auth first
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        // Get employee record by email
        const emps = await db("employees", "GET", null, `?email=eq.${encodeURIComponent(email)}&select=*`);
        const emp = emps?.[0];
        if (!emp) {
          setError(T("Account not found in employee records. Contact admin.", "الحساب غير موجود في سجلات الموظفين. تواصل مع المشرف."));
          setLoading(false); return;
        }
        if (emp.status === "pending") {
          setError(T("Your account is pending admin approval. Please wait.", "حسابك في انتظار موافقة المشرف. يرجى الانتظار."));
          setLoading(false); return;
        }
        if (emp.status === "inactive") {
          setError(T("Your account has been deactivated. Contact admin.", "تم تعطيل حسابك. تواصل مع المشرف."));
          setLoading(false); return;
        }
        const empRole = emp?.role || "employee";
        // Verify role matches portal (admin can access any portal)
        if (role !== "admin" && empRole !== role && empRole !== "admin") {
          setError(T(`This account does not have ${role} access. Please use the correct portal.`, `هذا الحساب ليس له صلاحية ${role}. استخدم البوابة الصحيحة.`));
          setLoading(false); return;
        }
        onLogin(empRole, data.user, emp); return;
      }
      // Handle specific Supabase errors
      if (data.error_description?.includes("Email not confirmed")) {
        setError(T("Please confirm your email first, or contact admin to activate your account.", "يرجى تأكيد بريدك الإلكتروني، أو تواصل مع المشرف لتفعيل حسابك."));
        setLoading(false); return;
      }
    } catch (e) { console.warn("Auth error:", e); }

    // Fallback demo credentials
    const creds = {
      admin: [{ email: "hello@mymayz.com", password: "Ghalia@0902" }, { email: "admin@peopleflow.com", password: "demo123" }],
      hr: [{ email: "hr@mymayz.com", password: "hr123456" }],
      accountant: [{ email: "accountant@mymayz.com", password: "acc123456" }],
      employee: [{ email: "employee@mymayz.com", password: "emp123456" }, { email: "test@mymayz.com", password: "test1234" }],
    };
    const match = (creds[role] || []).find(c => c.email === email && c.password === password);
    if (match) {
      const emps = await db("employees", "GET", null, `?email=eq.${encodeURIComponent(email)}&select=*`);
      onLogin(role, { email, id: "demo" }, emps?.[0] || null);
    } else {
      setError(T("Login failed. Check your email and password.", "فشل تسجيل الدخول. تحقق من بياناتك."));
    }
    setLoading(false);
  };

  return (
    <div className={`login-page ${ar ? "rtl" : ""}`}>
      <div className="login-card fade-in">
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
          ← {T("Back to portals", "العودة للبوابات")}
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{roleInfo.icon}</span>
          <div className="login-logo" style={{ margin: 0 }}>my<span>Mayz</span> HR</div>
        </div>
        <div className="login-tagline" style={{ color: roleInfo.color, fontWeight: 600 }}>{roleInfo.title}</div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label>{T("Email", "البريد الإلكتروني")}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={roleInfo.placeholder} />
        </div>
        <div className="login-field">
          <label>{T("Password", "كلمة المرور")}</label>
          <div style={{ position: "relative" }}>
            <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--t3)", padding: 0 }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>
        <button className="login-btn" onClick={submit} disabled={loading || !email || !password}
          style={{ background: roleInfo.color }}>
          {loading ? <><span className="spinner" />{T("Signing in...", "جاري الدخول...")}</> : T("Sign In", "تسجيل الدخول")}
        </button>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button onClick={async () => {
            if (!email) { alert(T("Please enter your email address first.", "يرجى إدخال بريدك الإلكتروني أولاً.")); return; }
            try {
              const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
                body: JSON.stringify({ email }),
              });
              if (res.ok) {
                alert(T(`✅ Password reset email sent to ${email}\n\nCheck your inbox and follow the link to reset your password.`,
                  `✅ تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}\n\nتحقق من بريدك الوارد واتبع الرابط.`));
              } else {
                alert(T("Could not send reset email. Please contact your admin.", "تعذر إرسال البريد. تواصل مع المشرف."));
              }
            } catch(e) {
              alert(T("Error sending reset email. Contact admin.", "خطأ في الإرسال. تواصل مع المشرف."));
            }
          }} style={{ background: "none", border: "none", color: "var(--acc)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", textDecoration: "underline" }}>
            🔑 {T("Forgot Password?", "نسيت كلمة المرور؟")}
          </button>
        </div>
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
  // ── Restore session from localStorage on first load ──
  const savedSession = (() => {
    try { return JSON.parse(localStorage.getItem("mymayz_session") || "null"); } catch { return null; }
  })();

  const [lang, setLang] = useState(() => localStorage.getItem("mymayz_lang") || "en");
  const [portal, setPortal] = useState(savedSession?.portal || null);
  const [loggedIn, setLoggedIn] = useState(!!savedSession?.role);
  const [role, setRole] = useState(savedSession?.role || "employee");
  const [currentEmployee, setCurrentEmployee] = useState(savedSession?.employee || null);
  const [page, setPage] = useState("dashboard");

  // Set default page based on role when logged in
  useEffect(() => {
    if (loggedIn) {
      if (role === "employee") setPage("attendance");
      else setPage("dashboard");
      // Reset ssTab based on role
      if (role === "admin" || role === "hr" || role === "accountant") setSsTab("manage");
      else setSsTab("overview");
    }
  }, [loggedIn, role]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  // Data state
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loans, setLoans] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [payroll, setPayroll] = useState([]);

  // Attendance flow state
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [gpsOk, setGpsOk] = useState(false);
  const [gpsLoc, setGpsLoc] = useState(null);
  const [gpsErr, setGpsErr] = useState("");
  const [photoOk, setPhotoOk] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [photo, setPhoto] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [locLabel, setLocLabel] = useState(null);
  const [showLocModal, setShowLocModal] = useState(false);
  const [customLoc, setCustomLoc] = useState("");
  const [pendingLoc, setPendingLoc] = useState(null);
  const [pendingTime, setPendingTime] = useState(null);

  // UI state
  const [searchQ, setSearchQ] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [attTab, setAttTab] = useState("clockin");
  const [ssTab, setSsTab] = useState("overview");
  const [reqFilter, setReqFilter] = useState("pending");
  const [dashFilter, setDashFilter] = useState("all");
  const [dashSort, setDashSort] = useState("checkin_desc");
  const [dashSortCol, setDashSortCol] = useState({ col: "checkin", dir: "desc" });
  const [dashEmpSearch, setDashEmpSearch] = useState("");
  const [attSort, setAttSort] = useState({ col: "date", dir: "desc" });
  const [gpsLocs, setGpsLocs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mymayz_locations") || "null") || getApprovedLocations(); } catch { return getApprovedLocations(); }
  });
  const todayStr = new Date().toISOString().split("T")[0];
  const [reportFilter, setReportFilter] = useState({ from: todayStr, to: todayStr, emp: "", status: "", sort: "desc", month: "" });
  const [shifts, setShifts] = useState(DEFAULT_SHIFTS);
  const [empShifts, setEmpShifts] = useState([]);
  const [clockOutGpsOk, setClockOutGpsOk] = useState(false);
  const [clockOutPhotoOk, setClockOutPhotoOk] = useState(false);
  const [clockOutPhoto, setClockOutPhoto] = useState(null);
  const [clockOutDone, setClockOutDone] = useState(false);
  const [clockOutVerifying, setClockOutVerifying] = useState(false);
  const [signup, setSignup] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return { month: ["January","February","March","April","May","June","July","August","September","October","November","December"][d.getMonth()], year: d.getFullYear() };
  });

  // Notification settings — stored in localStorage
  const [notifSettings, setNotifSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mymayz_notif") || JSON.stringify({
        enabled: true,
        brevoKey: "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",
        recipients: [
          { name: "Ahmed Kardous", role: "Admin",      email: "hello@mymayz.com",       whatsapp: "201004444558", whatsappKey: "2789945", active: true },
          { name: "Accountant",    role: "Accountant", email: "accountant@chefmay.com", whatsapp: "",             whatsappKey: "",        active: true },
          { name: "Mahmoud",       role: "HR",         email: "mahmoud@chefmay.com",    whatsapp: "",             whatsappKey: "",        active: true },
        ],
        events: {
          signin:         { on: false, label: "Employee Sign In",       icon: "✅", warn: true },
          signout:        { on: false, label: "Employee Sign Out",      icon: "🚪", warn: true },
          excuse_request: { on: true,  label: "Excuse Request",         icon: "⏰", warn: false },
          leave_request:  { on: true,  label: "Leave Request",          icon: "🏖️", warn: false },
          loan_request:   { on: true,  label: "Loan Request",           icon: "💰", warn: false },
          loan_approved:  { on: true,  label: "Loan Approved/Rejected", icon: "🎉", warn: false },
        }
      }));
    } catch { return { enabled: false, recipients: [], events: {} }; }
  });

  const ar = lang === "ar";
  const T = (en, a) => ar ? a : en;

  // Save language preference
  useEffect(() => { localStorage.setItem("mymayz_lang", lang); }, [lang]);

  // ── Smart real-time refresh ──
  // Fast: attendance only every 30s (lightweight)
  // Full: everything every 3 minutes
  useEffect(() => {
    if (!loggedIn) return;

    const loadAttendanceOnly = async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const last30 = new Date(Date.now() - 30*86400000).toISOString().split("T")[0];
      // Load today's records + last 30 days — no limit so nobody gets cut off
      const att = await db("attendance", "GET", null, `?select=*&date=gte.${last30}&order=date.desc,check_in.desc`);
      if (att) setAttendance(att);
      const [ex, lv, ln] = await Promise.all([
        db("excuse_requests", "GET", null, "?select=*&order=created_at.desc"),
        db("leave_requests", "GET", null, "?select=*&order=created_at.desc"),
        db("loans", "GET", null, "?select=*&order=created_at.desc"),
      ]);
      if (ex) setExcuses(ex);
      if (lv) setLeaveReqs(lv);
      if (ln) setLoans(ln);
    };

    const fastInterval = setInterval(loadAttendanceOnly, 30000);  // 30s — attendance only
    const slowInterval = setInterval(loadAll, 180000);            // 3min — full refresh
    return () => { clearInterval(fastInterval); clearInterval(slowInterval); };
  }, [loggedIn]);

  useEffect(() => { if (loggedIn) loadAll(); }, [loggedIn]);

  // ── GPS Proximity Notification — remind employee to sign in/out ──
  useEffect(() => {
    if (!loggedIn || !navigator.geolocation || role !== "employee") return;
    const workMode = currentEmployee?.work_mode || "office";
    if (workMode === "no_verify") return;

    let lastNotifTime = 0;
    let lastState = null; // "inside" | "outside" | null

    const checkProximity = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const freshLocs = getApprovedLocations();
      const empApprovedLocs = (() => {
        try {
          const v = currentEmployee?.approved_locations;
          if (!v) return freshLocs.map(l => l.id);
          return typeof v === "string" ? JSON.parse(v) : v;
        } catch { return freshLocs.map(l => l.id); }
      })();
      const toCheck = freshLocs.filter(l => empApprovedLocs.includes(l.id));
      const matched = toCheck.find(l => distKm(lat, lng, l.lat, l.lng) <= l.radius);
      const now = Date.now();
      const cooldown = 5 * 60 * 1000; // 5 min between notifications

      if (matched && !clockedIn && lastState !== "inside") {
        lastState = "inside";
        if (now - lastNotifTime > cooldown) {
          lastNotifTime = now;
          // Browser notification
          if (Notification.permission === "granted") {
            new Notification("myMayz HR — Sign In Reminder 🟢", {
              body: `You are at ${matched.name}. Don't forget to sign in!`,
              icon: "/favicon.ico",
            });
          }
        }
      }

      if (!matched && clockedIn && lastState !== "outside") {
        lastState = "outside";
        if (now - lastNotifTime > cooldown) {
          lastNotifTime = now;
          if (Notification.permission === "granted") {
            new Notification("myMayz HR — Sign Out Reminder 🔴", {
              body: "You have left your work location. Don't forget to sign out!",
              icon: "/favicon.ico",
            });
          }
        }
      }
    };

    // Request notification permission once
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const watchId = navigator.geolocation.watchPosition(
      checkProximity,
      err => console.warn("GPS watch error:", err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [loggedIn, clockedIn, currentEmployee]);

  const loadAll = async () => {
    const [emps, att, ln, ex, lv, pay, sh, esh] = await Promise.all([
      db("employees", "GET", null, "?select=*&order=name"),
      db("attendance", "GET", null, `?select=*&date=gte.${new Date(Date.now()-90*86400000).toISOString().split("T")[0]}&order=date.desc,check_in.desc`),
      db("loans", "GET", null, "?select=*&order=created_at.desc"),
      db("excuse_requests", "GET", null, "?select=*&order=created_at.desc"),
      db("leave_requests", "GET", null, "?select=*&order=created_at.desc"),
      db("payroll", "GET", null, "?select=*&order=year.desc,month.desc"),
      db("shifts", "GET", null, "?select=*&order=id"),
      db("employee_shifts", "GET", null, "?select=*&order=employee_id"),
    ]);
    if (emps) {
      setEmployees(emps);
      if (currentEmployee) {
        const fresh = emps.find(e => e.id === currentEmployee.id);
        if (fresh) {
          setCurrentEmployee(fresh);
          const saved = JSON.parse(localStorage.getItem("mymayz_session") || "{}");
          localStorage.setItem("mymayz_session", JSON.stringify({ ...saved, employee: fresh }));
        }
      }
    }
    if (att) setAttendance(att);
    if (ln) setLoans(ln);
    if (ex) setExcuses(ex);
    if (lv) setLeaveReqs(lv);
    if (pay) setPayroll(pay);
    // Always update shifts from DB — use DEFAULT_SHIFTS only if DB fails completely
    if (sh !== null && sh !== undefined) setShifts(sh.length > 0 ? sh : DEFAULT_SHIFTS);
    if (esh) setEmpShifts(esh);

    // ✅ RESTORE CLOCK-IN STATE FROM DATABASE
    // Check if current employee has clocked in today but not yet clocked out
    if (emps && att) {
      const empId = currentEmployee?.id || emps[0]?.id;
      const today = new Date().toISOString().split("T")[0];
      const todayRecord = att.find(a =>
        a.employee_id === empId &&
        a.date === today &&
        a.check_in &&
        !a.check_out
      );
      if (todayRecord) {
        setClockedIn(true);
        setClockInTime(new Date(todayRecord.check_in));
        setLocLabel(todayRecord.location_label || null);
        setGpsOk(true);
        setPhotoOk(true);
      } else {
        setClockedIn(false);
        setClockInTime(null);
        setLocLabel(null);
      }
    }

    // Auto-generate payroll for current month if admin/hr and missing
    if ((role === "admin" || role === "hr") && emps && pay !== null && ln !== null) {
      const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const curMonth = months[new Date().getMonth()];
      const curYear = new Date().getFullYear();
      const activeEmps = emps.filter(e => e.status === "active" && Number(e.salary || 0) > 0);
      let generated = 0;
      for (const emp of activeEmps) {
        const exists = (pay || []).find(p => p.employee_id === emp.id && p.month === curMonth && p.year === curYear);
        if (!exists) {
          // Get active loan for this employee
          const activeLoan = (ln || []).find(l => l.employee_id === emp.id && l.status === "active");
          const loanDed = activeLoan ? Number(activeLoan.monthly_deduction) : 0;
          const net = (emp.salary||0) + (emp.allowances||0) + (emp.bonuses||0) - (emp.deductions||0) - (emp.tax||0) - (emp.insurance||0) - loanDed;
          await db("payroll", "POST", {
            employee_id: emp.id, month: curMonth, year: curYear,
            base_salary: emp.salary||0, allowances: emp.allowances||0,
            bonuses: emp.bonuses||0, deductions: emp.deductions||0,
            tax: emp.tax||0, insurance: emp.insurance||0,
            loan_deduction: loanDed, net_salary: net, status: "pending",
          });
          // Auto-deduct from loan remaining
          if (activeLoan && loanDed > 0) {
            const newRemaining = Math.max(0, Number(activeLoan.remaining) - loanDed);
            await db("loans", "PATCH", {
              remaining: newRemaining,
              status: newRemaining <= 0 ? "settled" : "active",
            }, `?id=eq.${activeLoan.id}`);
          }
          generated++;
        }
      }
      if (generated > 0) {
        const freshPay = await db("payroll", "GET", null, "?select=*&order=year.desc,month.desc");
        if (freshPay) setPayroll(freshPay);
        const freshLoans = await db("loans", "GET", null, "?select=*&order=created_at.desc");
        if (freshLoans) setLoans(freshLoans);
      }
    }
  };

  const openModal = (name, data = {}) => { setActiveModal(name); setModalData(data); };
  const closeModal = () => { setActiveModal(null); setModalData({}); };

  const handleLogin = (r, user, emp) => {
    setRole(r);
    setCurrentEmployee(emp);
    setLoggedIn(true);
    // Persist session
    localStorage.setItem("mymayz_session", JSON.stringify({ role: r, employee: emp, portal: portal }));
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setPortal(null);
    setRole("employee");
    setCurrentEmployee(null);
    setClockedIn(false);
    setGpsOk(false); setPhotoOk(false); setPhoto(null); setLocLabel(null);
    setClockOutDone(false);
    // Clear session
    localStorage.removeItem("mymayz_session");
  };

  // ── Notification System ──
  const saveNotifSettings = (newSettings) => {
    setNotifSettings(newSettings);
    localStorage.setItem("mymayz_notif", JSON.stringify(newSettings));
  };

  const sendNotification = async (eventType, message) => {
    const settings = JSON.parse(localStorage.getItem("mymayz_notif") || "{}");
    if (!settings.enabled) return;
    const event = settings.events?.[eventType];
    if (!event?.on) return;

    const activeRecipients = (settings.recipients || []).filter(r => r.active);

    for (const recipient of activeRecipients) {
      // ── WhatsApp via CallMeBot (free) ──
      if (recipient.whatsapp && recipient.whatsappKey) {
        const phone = recipient.whatsapp.replace(/[^0-9]/g, "");
        const text = encodeURIComponent(`🔔 *myMayz HR*\n${message}`);
        fetch(`https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${recipient.whatsappKey}`)
          .catch(() => {});
      }

      // ── Email via Brevo (free 300/day) ──
      if (recipient.email && settings.brevoKey) {
        fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": settings.brevoKey,
          },
          body: JSON.stringify({
            sender: { name: "myMayz HR", email: "hello@mymayz.com" },
            to: [{ email: recipient.email, name: recipient.name }],
            subject: `🔔 myMayz HR — ${event.label}`,
            htmlContent: `
              <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f5f5f5;border-radius:12px;">
                <div style="background:#1a2035;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px;">
                  <h2 style="color:white;margin:0;">my<span style="color:#6366f1">Mayz</span> HR</h2>
                </div>
                <div style="background:white;border-radius:8px;padding:20px;">
                  <p style="font-size:16px;color:#333;">${message}</p>
                  <hr style="border:1px solid #eee;margin:16px 0"/>
                  <p style="font-size:12px;color:#999;">myMayz HR Notification System · ${new Date().toLocaleString()}</p>
                </div>
              </div>
            `
          })
        }).catch(() => {});
      }
    }
  };
  const handleClockIn = async () => {
    setGpsErr(""); setPhotoErr(""); setGpsOk(false); setPhotoOk(false); setGpsLoc(null); setPhoto(null);

    // Check if attendance tracking is disabled for this employee

    const clockTime = new Date();
    const day = clockTime.getDay();
    const workMode = currentEmployee?.work_mode
      || employees.find(e => e.id === currentEmployee?.id)?.work_mode
      || "office";
    console.log("🕐 Clock-in | Employee:", currentEmployee?.name, "| work_mode:", workMode, "| day:", day);

    // No verification mode — skip everything and sign in directly
    if (workMode === "no_verify") {
      setVerifying("saving");
      setGpsOk(true); setPhotoOk(true);
      await doSaveClockIn(clockTime, null, T("Free Sign-in", "تسجيل حر"), null);
      return;
    }

    // Skip camera for: full remote (always) or hybrid on Friday/Saturday
    const skipCamera =
      workMode === "remote" ||
      (workMode === "hybrid" && (day === 5 || day === 6));

    // Step 1: GPS — always required for everyone
    setVerifying("gps");
    let loc;
    try {
      loc = await getGPS();
      setGpsLoc(loc); setGpsOk(true);
    } catch (e) {
      setGpsErr(e.message); setVerifying(null); return;
    }

    // Step 2: Camera — only for office mode (or hybrid on weekdays)
    let photoData = null;
    if (!skipCamera) {
      setVerifying("photo");
      try {
        photoData = await capturePhoto();
        setPhoto(photoData);
        setPhotoOk(true);
      } catch (e) {
        setPhotoErr(e.message);
        setVerifying(null);
        return;
      }
    } else {
      setPhotoOk(true); // mark as ok, just no photo taken
    }

    // Step 3: Check employee's assigned locations
    const empApprovedLocs = currentEmployee?.approved_locations
      ? (typeof currentEmployee.approved_locations === "string"
          ? JSON.parse(currentEmployee.approved_locations)
          : currentEmployee.approved_locations)
      : ["office", "warehouse", "mall"]; // default: all locations

    // Always read fresh coordinates from localStorage (admin may have updated them)
    const freshLocs = getApprovedLocations();
    const matchedLoc = (() => {
      const toCheck = empApprovedLocs?.length > 0
        ? freshLocs.filter(l => empApprovedLocs.includes(l.id))
        : freshLocs;
      console.log("🗺️ GPS Check | Employee loc:", loc.lat.toFixed(5), loc.lng.toFixed(5));
      console.log("🗺️ Checking against:", toCheck.map(l => `${l.name}: ${l.lat.toFixed(5)},${l.lng.toFixed(5)} r=${(l.radius*1000).toFixed(0)}m`));
      for (const l of toCheck) {
        const dist = distKm(loc.lat, loc.lng, l.lat, l.lng);
        console.log(`🗺️ ${l.name}: dist=${(dist*1000).toFixed(0)}m, allowed=${(l.radius*1000).toFixed(0)}m → ${dist <= l.radius ? "✅ MATCH" : "❌ too far"}`);
        if (dist <= l.radius) return l;
      }
      return null;
    })();

    if (matchedLoc) {
      await doSaveClockIn(clockTime, loc, matchedLoc.name, photoData);
    } else {
      setPendingLoc(loc); setPendingTime(clockTime);
      setShowLocModal(true); setVerifying(null);
    }
  };

  const doSaveClockIn = async (clockTime, loc, label, photoData) => {
    setVerifying("saving");
    const empId = currentEmployee?.id || employees[0]?.id || null;
    const status = (() => {
      const empShift = empShifts.find(es => es.employee_id === (currentEmployee?.id || employees[0]?.id));
      const shift = empShift ? shifts.find(s => s.id === empShift.shift_id) : shifts[0];
      // Check if today is an off day for this shift
      const todayDay = clockTime.getDay();
      const shiftOffDays = (() => { try { return JSON.parse(shift?.off_days || "[]"); } catch { return []; } })();
      if (shiftOffDays.includes(todayDay)) return "present"; // off day — no late
      if (shift?.is_flexible) return "present"; // flexible shift — no late marking
      return getShiftStatus(shift, clockTime);
    })();
    const day = clockTime.getDay();
    const isSaturday = day === 6;
    const empType = currentEmployee?.employee_type || "office";

    await db("attendance", "POST", {
      employee_id: empId,
      date: clockTime.toISOString().split("T")[0],
      check_in: clockTime.toISOString(),
      gps_lat: loc?.lat,
      gps_lng: loc?.lng,
      location_label: label,
      face_photo: photoData || photo,
      status,
      source: "app",
      employee_type: empType,
      is_saturday: isSaturday,
    });
    setClockedIn(true); setClockInTime(clockTime); setLocLabel(label);
    setVerifying(null);
    await loadAll();
    // Send sign-in notification
    sendNotification("signin", `✅ ${currentEmployee?.name || "Employee"} signed in at ${clockTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} — ${label || "Office"}`);
  };

  const handleClockOut = async () => {
    // Check minimum shift duration
    if (clockInTime) {
      const hoursWorked = (new Date() - clockInTime) / 3600000;
      if (hoursWorked < MIN_SHIFT_HOURS) {
        const remaining = (MIN_SHIFT_HOURS - hoursWorked).toFixed(1);
        const ok = window.confirm(
          `You have only worked ${hoursWorked.toFixed(1)}h out of ${MIN_SHIFT_HOURS}h minimum.\n${remaining}h remaining.\n\nClocking out now will be flagged as an INCOMPLETE SHIFT. Continue?`
        );
        if (!ok) return;
      }
    }

    setClockOutVerifying(true);
    setClockOutGpsOk(false);
    setClockOutPhotoOk(false);
    setClockOutPhoto(null);
    setClockOutDone(false);

    const outDay = new Date().getDay();
    const outWorkMode = currentEmployee?.work_mode
      || employees.find(e => e.id === currentEmployee?.id)?.work_mode
      || "office";
    console.log("🚪 Clock-out | work_mode:", outWorkMode, "| day:", outDay);

    let outLoc = null;
    let outPhoto = null;

    if (outWorkMode === "no_verify") {
      // No verification — skip everything
      setClockOutGpsOk(true); setClockOutPhotoOk(true);
    } else {
      // GPS
      try { outLoc = await getGPS(); setClockOutGpsOk(true); } catch(e) {}
      // Camera
      const outSkipCamera = outWorkMode === "remote" || (outWorkMode === "hybrid" && (outDay === 5 || outDay === 6));
      if (!outSkipCamera) {
        try { outPhoto = await capturePhoto(); setClockOutPhoto(outPhoto); setClockOutPhotoOk(true); } catch(e) {}
      } else {
        setClockOutPhotoOk(true);
      }
    }

    // Save clock out - always fetch fresh from DB to find today's open record
    const clockTime = new Date();
    const today = clockTime.toISOString().split("T")[0];
    const empId = currentEmployee?.id || employees[0]?.id;

    // Fetch fresh attendance to find today's open record
    const freshAtt = await db("attendance", "GET", null, `?employee_id=eq.${empId}&date=eq.${today}&check_out=is.null&select=*`);
    const rec = freshAtt?.[0];

    if (rec) {
      const checkinTime = new Date(rec.check_in);
      const hours = Math.round(((clockTime - checkinTime) / 3600000) * 100) / 100;
      const incomplete = hours < MIN_SHIFT_HOURS;
      await db("attendance", "PATCH", {
        check_out: clockTime.toISOString(),
        hours_worked: hours,
        checkout_gps_lat: outLoc?.lat || null,
        checkout_gps_lng: outLoc?.lng || null,
        checkout_photo: outPhoto || null,
        status: incomplete ? "incomplete" : rec.status,
        notes: incomplete ? `Incomplete shift: ${hours}h worked (min ${MIN_SHIFT_HOURS}h)` : null,
      }, `?id=eq.${rec.id}`);
    }
    setClockedIn(false); setClockInTime(null); setGpsOk(false); setPhotoOk(false); setPhoto(null); setLocLabel(null);
    setClockOutVerifying(false); setClockOutDone(true);
    await loadAll();
    sendNotification("signout", `🚪 ${currentEmployee?.name || "Employee"} signed out at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`);
  };

  // ============================================================
  // DASHBOARD
  // ============================================================
  const renderDashboard = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayAtt = attendance
      .filter(a => a.date === today)
      .sort((a, b) => new Date(b.check_in || 0) - new Date(a.check_in || 0));
    const pending = excuses.filter(e => e.status === "pending").length + leaveReqs.filter(l => l.status === "pending").length;
    const totalPayroll = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0);

    const toggleDashSort = (col) => {
      setDashSortCol(prev => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }));
    };
    const SH = ({ col, children }) => {
      const active = dashSortCol.col === col;
      const arrow = active ? (dashSortCol.dir === "asc" ? "▲" : "▼") : "⇅";
      return <th className={`sort-th${active ? " active-sort" : ""}`} onClick={() => toggleDashSort(col)}>{children}<span className="sort-arrow">{arrow}</span></th>;
    };

    const filteredTodayAtt = todayAtt
      .filter(a => {
        if (dashFilter === "present") return !!a.check_in;
        if (dashFilter === "late") return a.status === "late" || a.status === "very_late";
        if (dashFilter === "incomplete") return a.status === "incomplete";
        if (dashFilter === "out") return !!a.check_out;
        if (dashFilter === "still_in") return !!a.check_in && !a.check_out;
        return true;
      })
      .filter(a => {
        if (!dashEmpSearch) return true;
        const emp = employees.find(e => e.id === a.employee_id);
        return emp?.name?.toLowerCase().includes(dashEmpSearch.toLowerCase());
      })
      .sort((a, b) => {
        const { col, dir } = dashSortCol;
        const mul = dir === "asc" ? 1 : -1;
        if (col === "checkin")  return mul * (new Date(a.check_in||0) - new Date(b.check_in||0));
        if (col === "checkout") return mul * (new Date(a.check_out||0) - new Date(b.check_out||0));
        if (col === "hours") return mul * ((Number(a.hours_worked)||0) - (Number(b.hours_worked)||0));
        if (col === "status")   return mul * (a.status||"").localeCompare(b.status||"");
        if (col === "location") return mul * (a.location_label||"").localeCompare(b.location_label||"");
        if (col === "name") {
          const ea = employees.find(e => e.id === a.employee_id);
          const eb = employees.find(e => e.id === b.employee_id);
          return mul * (ea?.name||"").localeCompare(eb?.name||"");
        }
        return mul * (new Date(b.check_in||0) - new Date(a.check_in||0));
      });

    return (
      <div>
        {/* Clickable stat cards */}
        <div className="stats-grid">
          {[
            { key: "all",        icon: "👥", color: "blue",   value: employees.length,                                         label: T("Total Employees","إجمالي الموظفين"),  nav: "employees" },
            { key: "present",    icon: "✅", color: "green",  value: todayAtt.filter(a => a.check_in).length,                  label: T("Present Today","حضور اليوم") },
            { key: "late",       icon: "⏰", color: "yellow", value: todayAtt.filter(a => a.status === "late" || a.status === "very_late").length, label: T("Late Today","متأخرون اليوم") },
            { key: "still_in",   icon: "🟢", color: "green",  value: todayAtt.filter(a => a.check_in && !a.check_out).length,  label: T("Still Working","لا يزالون يعملون") },
            { key: "requests",   icon: "📋", color: "red",    value: pending,                                                  label: T("Pending Requests","طلبات معلقة"),     nav: "selfservice" },
            { key: "payroll",    icon: "💰", color: "purple", value: totalPayroll.toLocaleString() + " EGP",                   label: T("Monthly Payroll","الرواتب الشهرية"),  nav: "payroll" },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ cursor: s.nav || s.key !== "payroll" ? "pointer" : "default" }}
              onClick={() => {
                if (s.nav) { setPage(s.nav); return; }
                if (["present","late","still_in","incomplete"].includes(s.key)) setDashFilter(s.key);
              }}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {["present","late","still_in"].includes(s.key) && (
                <div style={{ fontSize: 10, color: "var(--acc)", marginTop: 4, fontWeight: 500 }}>
                  {dashFilter === s.key ? "✓ " + T("Filtered","مفلتر") : T("Click to filter ↓","اضغط للتصفية ↓")}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Today's Attendance — filterable & sortable */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 {T("Today's Attendance","حضور اليوم")} — {today}
              <span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 400, marginLeft: 8 }}>({filteredTodayAtt.length} {T("records","سجل")})</span>
            </div>
          </div>

          {/* Filter + Sort bar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            {/* Status filter pills */}
            {[
              { key: "all",        label: T("All","الكل"),              color: "var(--acc)" },
              { key: "present",    label: T("✅ Present","✅ حاضر"),     color: "var(--ok)" },
              { key: "late",       label: T("⏰ Late","⏰ متأخر"),        color: "var(--warn)" },
              { key: "still_in",   label: T("🟢 Still In","🟢 داخل"),   color: "var(--ok)" },
              { key: "out",        label: T("🚪 Checked Out","🚪 خرج"),  color: "var(--err)" },
              { key: "incomplete", label: T("❌ Incomplete","❌ ناقص"),   color: "var(--err)" },
            ].map(f => (
              <button key={f.key} onClick={() => setDashFilter(f.key)}
                style={{ padding: "5px 12px", borderRadius: 20, border: `2px solid ${dashFilter === f.key ? f.color : "var(--border)"}`, background: dashFilter === f.key ? f.color : "var(--bg2)", color: dashFilter === f.key ? "white" : "var(--t2)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap" }}>
                {f.label}
              </button>
            ))}

            {/* Sort */}
            <input placeholder={T("Search employee...","بحث موظف...")} value={dashEmpSearch}
              onChange={e => setDashEmpSearch(e.target.value)}
              style={{ marginLeft: "auto", padding: "5px 12px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--t1)", fontFamily: "inherit", fontSize: 12, outline: "none", width: 180 }} />
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <SH col="name">{T("Employee","الموظف")}</SH>
                <SH col="checkin">{T("Check In","دخول")}</SH>
                <SH col="checkout">{T("Check Out","خروج")}</SH>
                <SH col="hours">{T("Hours","ساعات")}</SH>
                <SH col="location">{T("Location","الموقع")}</SH>
                <th>{T("GPS","GPS")}</th>
                <SH col="status">{T("Status","الحالة")}</SH>
                <th>{T("Photo","صورة")}</th>
                {role === "admin" && <th>{T("Action","إجراء")}</th>}
              </tr></thead>
              <tbody>
                {filteredTodayAtt.length === 0
                  ? <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>
                      {dashFilter !== "all" ? T("No records match this filter","لا توجد سجلات لهذا الفلتر") : T("No attendance recorded today","لا يوجد حضور اليوم")}
                    </td></tr>
                  : filteredTodayAtt.map((a, i) => {
                    const emp = employees.find(e => e.id === a.employee_id);
                    const hrs = a.hours_worked ? `${a.hours_worked}h` : (a.check_in && !a.check_out ? (() => { const diff = (new Date() - new Date(a.check_in))/3600000; return `${diff.toFixed(1)}h ⏳`; })() : "—");
                    const statusBadge = a.status === "present" ? "green" : a.status === "late" || a.status === "very_late" ? "yellow" : a.status === "incomplete" ? "red" : "gray";
                    return (
                      <tr key={i} style={{ background: a.status === "very_late" ? "rgba(239,68,68,0.03)" : a.status === "late" ? "rgba(245,158,11,0.03)" : "" }}>
                        <td>
                          <div className="emp-row">
                            <div className="emp-avatar">{emp?.avatar || "?"}</div>
                            <div>
                              <div style={{ color: "var(--t1)", fontWeight: 600, fontSize: 13 }}>{emp?.name || "Unknown"}</div>
                              <div style={{ fontSize: 11, color: "var(--t3)" }}>{emp?.employee_code}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--ok)", fontWeight: 600 }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td style={{ color: a.check_out ? "var(--err)" : "var(--t3)" }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : <span style={{ fontSize: 11 }}>🟢 {T("Still in","داخل")}</span>}</td>
                        <td style={{ color: "var(--t2)", fontSize: 12 }}>{hrs}</td>
                        <td>{a.location_label ? <span className="badge blue" title={a.location_label} style={{ fontSize: 11, whiteSpace: "normal", wordBreak: "break-word", maxWidth: 200, display: "inline-block", lineHeight: 1.4 }}>{a.location_label}</span> : "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--t3)" }}>{a.gps_lat ? `${Number(a.gps_lat).toFixed(4)}, ${Number(a.gps_lng).toFixed(4)}` : "—"}</td>
                        <td><span className={`badge ${statusBadge}`}>{a.status}</span></td>
                        <td>{a.face_photo ? <img src={a.face_photo} alt="face" className="photo-thumb" onClick={() => setPhotoPreview(a.face_photo)} /> : "—"}</td>
                        {role === "admin" && (
                          <td>
                            {a.check_in && !a.check_out ? (
                              <Btn size="sm" color="warning"
                                title={T("Manually sign out this employee","تسجيل خروج يدوي")}
                                onClick={async () => {
                                  const now = new Date();
                                  const hours = Math.round(((now - new Date(a.check_in)) / 3600000) * 100) / 100;
                                  const es = empShifts.find(x => x.employee_id === a.employee_id);
                                  const sh = es ? shifts.find(s => s.id === es.shift_id) : null;
                                  const incomplete = hours < (sh?.min_hours || 8);
                                  if (window.confirm(T(
                                    `Sign out ${emp?.name}?\nTime: ${now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}\nWorked: ${hours.toFixed(1)}h`,
                                    `تسجيل خروج ${emp?.name}؟\nالوقت: ${now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}\nساعات العمل: ${hours.toFixed(1)}`
                                  ))) {
                                    await db("attendance","PATCH",{
                                      check_out: now.toISOString(),
                                      hours_worked: hours,
                                      status: incomplete ? "incomplete" : a.status,
                                      notes: `Manual sign-out by admin at ${now.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}`,
                                    },`?id=eq.${a.id}`);
                                    loadAll();
                                  }
                                }}>
                                🚪 {T("Sign Out","خروج")}
                              </Btn>
                            ) : <span style={{ fontSize: 11, color: "var(--t3)" }}>—</span>}
                          </td>
                        )}
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
  // EMPLOYEES
  // ============================================================
  const renderEmployees = () => {
    const filtered = employees.filter(e =>
      (e.name || "").toLowerCase().includes(searchQ.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(searchQ.toLowerCase()) ||
      (e.employee_code || "").toLowerCase().includes(searchQ.toLowerCase())
    );
    const calcNet = d => (d.base_salary || d.salary || 0) + (d.allowances || 0) + (d.bonuses || 0) - (d.deductions || 0) - (d.tax || 0) - (d.insurance || 0);

    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <span className="search-icon">🔍</span>
            <input placeholder={T("Search employees...", "بحث عن موظف...")} value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
          {role === "admin" && (
            <Btn color="outline" size="sm" onClick={async () => {
              if (!window.confirm(T("Rearrange all employee codes sequentially? (EMP001, EMP002...) This cannot be undone.", "إعادة ترتيب كودات الموظفين تسلسلياً؟ (EMP001, EMP002...) لا يمكن التراجع."))) return;
              // Sort employees by hire_date or id, then reassign codes
              const sorted = [...employees]
                .filter(e => e.status !== "pending")
                .sort((a, b) => (a.id || 0) - (b.id || 0));
              let num = 1;
              for (const emp of sorted) {
                const newCode = "EMP" + String(num).padStart(3, "0");
                if (emp.employee_code !== newCode) {
                  await db("employees", "PATCH", { employee_code: newCode }, `?id=eq.${emp.id}`);
                }
                num++;
              }
              // Also fix pending employees codes after active ones
              const pending = employees.filter(e => e.status === "pending");
              for (const emp of pending) {
                const newCode = "EMP" + String(num).padStart(3, "0");
                await db("employees", "PATCH", { employee_code: newCode }, `?id=eq.${emp.id}`);
                num++;
              }
              await loadAll();
              alert(T(`✅ Done! Rearranged ${num - 1} employee codes.`, `✅ تم! تم إعادة ترتيب ${num - 1} كودات موظفين.`));
            }}>🔢 {T("Rearrange Codes", "إعادة ترتيب الكودات")}</Btn>
          )}
          <Btn color="primary" onClick={() => openModal("addEmployee")} style={{ display: (role === "admin" || role === "hr") ? "" : "none" }}>➕ {T("Add Employee", "إضافة موظف")}</Btn>
        </div>

        {/* Pending Activation Banner — admin & hr only */}
        {(role === "admin" || role === "hr") && employees.filter(e => e.status === "pending").length > 0 && (
          <div style={{ background: "var(--warnb)", border: "1px solid var(--warn)", borderRadius: 10, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--warn)" }}>{employees.filter(e => e.status === "pending").length} {T("employee(s) waiting for activation", "موظف ينتظر التفعيل")}</div>
              <div style={{ fontSize: 12, color: "var(--t2)" }}>{T("Review and assign roles in the table below", "راجع وعيّن الأدوار في الجدول أدناه")}</div>
            </div>
          </div>
        )}

        {/* Pending Employees */}
        {(role === "admin" || role === "hr") && employees.filter(e => e.status === "pending").length > 0 && (
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 20, border: "1px solid var(--warn)" }}>
            <div style={{ padding: "12px 24px", background: "var(--warnb)", borderBottom: "1px solid var(--warn)" }}>
              <div className="card-title" style={{ color: "var(--warn)" }}>⏳ {T("Pending Activation", "في انتظار التفعيل")}</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr>
                  <th>{T("Code", "الكود")}</th><th>{T("Name", "الاسم")}</th><th>{T("Email", "البريد")}</th>
                  <th>{T("Department", "القسم")}</th><th>{T("Assign Role", "تعيين الدور")}</th><th>{T("Actions", "إجراءات")}</th>
                </tr></thead>
                <tbody>
                  {employees.filter(e => e.status === "pending").map((emp, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--acc)", fontWeight: 600 }}>{emp.employee_code}</td>
                      <td style={{ color: "var(--t1)", fontWeight: 500 }}>{emp.name}</td>
                      <td style={{ fontSize: 12 }}>{emp.email}</td>
                      <td>{emp.department}</td>
                      <td>
                        <select defaultValue="employee" id={`role_${emp.id}`}
                          style={{ padding: "6px 10px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--t1)", fontFamily: "inherit", fontSize: 13 }}>
                          <option value="employee">🙋 {T("Employee", "موظف")}</option>
                          <option value="hr">👥 HR</option>
                          <option value="accountant">💰 {T("Accountant", "محاسب")}</option>
                          <option value="admin">🛡️ Admin</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn size="sm" color="success" onClick={async () => {
                            const sel = document.getElementById(`role_${emp.id}`);
                            const newRole = sel ? sel.value : "employee";
                            await db("employees", "PATCH", { status: "active", role: newRole }, `?id=eq.${emp.id}`);
                            await loadAll();
                          }}>✅ {T("Activate", "تفعيل")}</Btn>
                          <Btn size="sm" color="danger" onClick={async () => {
                            await db("employees", "PATCH", { status: "inactive", email: "" }, `?id=eq.${emp.id}`);
                            await loadAll();
                          }}>❌ {T("Reject", "رفض")}</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>{T("Code", "الكود")}</th>
                <th>{T("Name", "الاسم")}</th>
                <th>{T("Department", "القسم")}</th>
                <th>{T("Position", "المنصب")}</th>
                <th>{T("Salary", "الراتب")}</th>
                <th>{T("Role", "الدور")}</th>
                <th>{T("Payment ID", "كود الدفع")}</th>
                <th>{T("Status", "الحالة")}</th>
                {role === "accountant" && <th>{T("This Month", "هذا الشهر")}</th>}
                <th>{T("Actions", "إجراءات")}</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{T("No employees found", "لا يوجد موظفون")}</td></tr>
                  : filtered.map((emp, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--acc)", fontWeight: 600, fontSize: 12 }}>{emp.employee_code}</td>
                      <td>
                        <div className="emp-row">
                          <div className="emp-avatar">{(emp.avatar || (emp.name || "?").substring(0, 2)).toUpperCase()}</div>
                          <div>
                            <div style={{ color: "var(--t1)", fontWeight: 500 }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: "var(--t3)" }}>{emp.name_ar}</div>
                            {emp.email && <div style={{ fontSize: 11, color: "var(--t3)" }}>{emp.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{emp.department || "—"}</td>
                      <td>{emp.position || "—"}</td>
                      <td>
                        {(() => {
                          const base = Number(emp.salary || 0);
                          const benefits = Number(emp.allowances||0) + Number(emp.bonuses||0);
                          const deds = Number(emp.deductions||0) + Number(emp.tax||0) + Number(emp.insurance||0);
                          const structuralNet = base + benefits - deds;
                          // Find active loan deduction for this employee
                          const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                          const curMonth = months[new Date().getMonth()];
                          const curYear = new Date().getFullYear();
                          const empPayroll = payroll.find(p => p.employee_id === emp.id && p.month === curMonth && p.year === curYear);
                          const loanDed = empPayroll ? Number(empPayroll.loan_deduction||0) : 0;
                          const finalNet = structuralNet - loanDed;
                          return (
                            <div style={{ lineHeight: 1.5 }}>
                              <div style={{ color: "var(--ok)", fontWeight: 700, fontSize: 14 }}>
                                {base.toLocaleString()} EGP
                                <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 400, marginLeft: 4 }}>{T("base", "أساسي")}</span>
                              </div>
                              {benefits > 0 && <div style={{ fontSize: 11, color: "var(--ok)" }}>+{benefits.toLocaleString()} {T("benefits", "بدلات")}</div>}
                              {deds > 0 && <div style={{ fontSize: 11, color: "var(--err)" }}>-{deds.toLocaleString()} {T("deductions", "خصومات")}</div>}
                              {loanDed > 0 && <div style={{ fontSize: 11, color: "var(--warn)" }}>-{loanDed.toLocaleString()} {T("loan", "قرض")}</div>}
                              {(benefits > 0 || deds > 0 || loanDed > 0) && (
                                <div style={{ fontSize: 13, color: "var(--acc)", fontWeight: 700, borderTop: "1px solid var(--border)", paddingTop: 2, marginTop: 2 }}>
                                  = {finalNet.toLocaleString()} {T("net", "صافي")}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td><span className={`badge ${emp.role === "admin" ? "purple" : emp.role === "hr" ? "green" : emp.role === "accountant" ? "yellow" : "blue"}`}>{emp.role || "employee"}</span></td>
                      <td style={{ textAlign: "center" }}>
                        {emp.payment_id
                          ? <div>
                              <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--ok)", fontWeight: 600 }}>{emp.payment_id}</div>
                              <div style={{ fontSize: 10, color: "var(--t3)" }}>{emp.payment_mobile || ""}</div>
                            </div>
                          : <span style={{ fontSize: 11, color: "var(--err)" }}>⚠️ {T("Not linked", "غير مرتبط")}</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${emp.status === "active" ? "green" : emp.status === "pending" ? "yellow" : "red"}`}>
                          {emp.status === "active" ? "✅ " + T("Active","نشط") : emp.status === "pending" ? "⏳ " + T("Pending","معلق") : "🚫 " + T("Inactive","غير نشط")}
                        </span>
                      </td>
                      {/* Payroll status column — visible to accountant */}
                      {role === "accountant" && (() => {
                        const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                        const curMonth = months[new Date().getMonth()];
                        const curYear = new Date().getFullYear();
                        const empPay = payroll.find(p => p.employee_id === emp.id && p.month === curMonth && p.year === curYear);
                        return (
                          <td>
                            {empPay
                              ? <span className={`badge ${empPay.status === "paid" ? "green" : "yellow"}`}>
                                  {empPay.status === "paid" ? `✅ ${T("Paid","مدفوع")}` : `⏳ ${T("Pending","معلق")}`}
                                </span>
                              : <span className="badge red">❌ {T("No payslip","لا مسير")}</span>
                            }
                          </td>
                        );
                      })()}
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {/* Edit full profile — admin & hr only */}
                          {(role === "admin" || role === "hr") && (
                            <Btn size="sm" color="outline" onClick={() => {
                              const es = empShifts.find(x => x.employee_id === emp.id);
                              openModal("editEmployee", { ...emp, assigned_shift_id: es ? String(es.shift_id) : "" });
                            }}>✏️ {T("Edit", "تعديل")}</Btn>
                          )}
                          {/* Salary — admin, hr, accountant */}
                          {(role === "admin" || role === "hr" || role === "accountant") && (
                            <Btn size="sm" color="success" onClick={() => openModal("editSalary", { ...emp, base_salary: emp.salary, allowances: emp.allowances || 0, bonuses: emp.bonuses || 0, deductions: emp.deductions || 0, tax: emp.tax || 0, insurance: emp.insurance || 0 })}>💰 {T("Salary", "الراتب")}</Btn>
                          )}
                          {/* Payment ID — admin & accountant */}
                          {(role === "admin" || role === "accountant") && (
                            <Btn size="sm" color="outline" onClick={() => openModal("editPaymentId", { ...emp })}>🏦 {T("Payment", "دفع")}</Btn>
                          )}
                          {/* Delete — admin only */}
                          {role === "admin" && (
                            <Btn size="sm" color="danger" onClick={async () => {
                              if (window.confirm(T(`Delete ${emp.name}? This cannot be undone.`, `حذف ${emp.name}؟ لا يمكن التراجع.`))) {
                                await db("attendance", "DELETE", null, `?employee_id=eq.${emp.id}`);
                                await db("loans", "DELETE", null, `?employee_id=eq.${emp.id}`);
                                await db("excuse_requests", "DELETE", null, `?employee_id=eq.${emp.id}`);
                                await db("leave_requests", "DELETE", null, `?employee_id=eq.${emp.id}`);
                                await db("payroll", "DELETE", null, `?employee_id=eq.${emp.id}`);
                                await db("employee_shifts", "DELETE", null, `?employee_id=eq.${emp.id}`);
                                await db("employees", "DELETE", null, `?id=eq.${emp.id}`);
                                await loadAll();
                              }
                            }}>🗑️</Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        <Modal show={activeModal === "addEmployee"} onClose={closeModal} title={T("Add New Employee", "إضافة موظف جديد")}>
          <div className="form-row">
            <div className="form-group"><label>{T("Full Name (English) *", "الاسم بالإنجليزية *")}</label><input value={modalData.name || ""} onChange={e => setModalData({ ...modalData, name: e.target.value })} placeholder="Mohamed Ahmed" /></div>
            <div className="form-group"><label>{T("Full Name (Arabic)", "الاسم بالعربية")}</label><input value={modalData.name_ar || ""} onChange={e => setModalData({ ...modalData, name_ar: e.target.value })} placeholder="محمد أحمد" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Email *", "البريد الإلكتروني *")}</label><input type="email" value={modalData.email || ""} onChange={e => setModalData({ ...modalData, email: e.target.value })} placeholder="employee@company.com" /></div>
            <div className="form-group"><label>{T("Phone", "الهاتف")}</label><input value={modalData.phone || ""} onChange={e => setModalData({ ...modalData, phone: e.target.value })} placeholder="+201XXXXXXXXX" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Department", "القسم")}</label><input value={modalData.department || ""} onChange={e => setModalData({ ...modalData, department: e.target.value })} /></div>
            <div className="form-group"><label>{T("Position", "المنصب")}</label><input value={modalData.position || ""} onChange={e => setModalData({ ...modalData, position: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Base Salary (EGP)", "الراتب الأساسي")}</label><input type="number" value={modalData.salary || ""} onChange={e => setModalData({ ...modalData, salary: +e.target.value })} /></div>
            <div className="form-group"><label>{T("Hire Date", "تاريخ التعيين")}</label><input type="date" value={modalData.hire_date || ""} style={{ background: "#fff", color: "#1a2035" }} onChange={e => setModalData({ ...modalData, hire_date: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>{T("Role", "الدور")}</label>
              <select value={modalData.role || "employee"} onChange={e => setModalData({ ...modalData, role: e.target.value })}>
                <option value="employee">🙋 {T("Employee", "موظف")}</option>
                <option value="hr">👥 HR</option>
                <option value="accountant">💰 {T("Accountant", "محاسب")}</option>
                <option value="admin">🛡️ Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>{T("Employee Type", "نوع الموظف")}</label>
              <select value={modalData.employee_type || "office"} onChange={e => setModalData({ ...modalData, employee_type: e.target.value })}>
                <option value="office">🏢 {T("Office", "مكتب")}</option>
                <option value="warehouse">🏭 {T("Warehouse", "مستودع")}</option>
                <option value="retail">🛍️ {T("Retail / Mall", "متجر / مول")}</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div style={{ background: "var(--okb)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: 14, marginBottom: 4 }}>
            <div style={{ fontWeight: 600, color: "var(--ok)", marginBottom: 10, fontSize: 13 }}>🔑 {T("Login Password", "كلمة مرور الدخول")}</div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>{T("Password *", "كلمة المرور *")}</label>
                <div style={{ position: "relative" }}>
                  <input type={modalData.showPw ? "text" : "password"} value={modalData.password || ""}
                    onChange={e => setModalData({ ...modalData, password: e.target.value })}
                    placeholder={T("Min 8 characters", "8 أحرف على الأقل")}
                    style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setModalData({ ...modalData, showPw: !modalData.showPw })}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "var(--t3)", padding: 0 }}>
                    {modalData.showPw ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <Btn color="outline" size="sm" type="button" onClick={() => {
                  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
                  const pw = Array.from({length: 10}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
                  setModalData({ ...modalData, password: pw, showPw: true });
                }}>🎲 {T("Generate", "توليد")}</Btn>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
              💡 {T("Share this password with the employee so they can log in. They can change it later.", "شارك كلمة المرور مع الموظف حتى يتمكن من الدخول.")}
            </div>
          </div>

          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving || !modalData.name || !modalData.email || !modalData.password || modalData.password.length < 8}
              onClick={async () => {
                setSaving(true);
                try {
                  // Check duplicate email
                  const existing = await db("employees", "GET", null, `?email=eq.${encodeURIComponent(modalData.email)}&select=id`);
                  if (existing && existing.length > 0) { alert(T("Email already registered.", "البريد مسجل مسبقاً.")); setSaving(false); return; }

                  // Generate unique code
                  const allCodes = await db("employees", "GET", null, "?select=employee_code");
                  let maxNum = 0;
                  (allCodes || []).forEach(e => { const m = (e.employee_code||"").match(/EMP(\d+)/); if(m) maxNum = Math.max(maxNum, parseInt(m[1],10)); });
                  const code = "EMP" + String(maxNum + 1).padStart(3, "0");

                  // Create Supabase Auth user
                  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
                    body: JSON.stringify({ email: modalData.email, password: modalData.password }),
                  });
                  const authData = await res.json();
                  if (authData.error && !authData.access_token) {
                    // Auth user might already exist — proceed anyway
                    console.warn("Auth signup:", authData.error);
                  }

                  // Create employee record
                  const empResult = await db("employees", "POST", {
                    employee_code: code,
                    name: modalData.name.trim(),
                    name_ar: modalData.name_ar || modalData.name.trim(),
                    email: modalData.email,
                    phone: modalData.phone || null,
                    department: modalData.department || null,
                    position: modalData.position || null,
                    salary: modalData.salary || 0,
                    hire_date: modalData.hire_date || null,
                    role: modalData.role || "employee",
                    employee_type: modalData.employee_type || "office",
                    status: "active",
                    avatar: modalData.name.trim().substring(0,2).toUpperCase(),
                  });

                  if (!empResult) {
                    alert(T("❌ Failed to save employee. Check Supabase RLS policies — run: ALTER TABLE employees DISABLE ROW LEVEL SECURITY;", "❌ فشل حفظ الموظف. تحقق من صلاحيات Supabase."));
                    setSaving(false); return;
                  }

                  await loadAll(); setSaving(false); closeModal();
                  alert(T(`✅ Employee created!\nCode: ${code}\nEmail: ${modalData.email}\nPassword: ${modalData.password}\n\nShare these credentials with the employee.`,
                    `✅ تم إنشاء الموظف!\nالكود: ${code}\nالبريد: ${modalData.email}\nكلمة المرور: ${modalData.password}\n\nشارك هذه البيانات مع الموظف.`));
                } catch(e) { alert(T("Failed to create employee.", "فشل إنشاء الموظف.")); setSaving(false); }
              }}>
              {saving ? <span className="spinner" /> : `➕ ${T("Add Employee", "إضافة موظف")}`}
            </Btn>
          </div>
        </Modal>

        {/* Edit Employee Modal */}
        <Modal show={activeModal === "editEmployee"} onClose={closeModal} title={T("Edit Employee", "تعديل الموظف")}>
          <div className="form-row">
            <div className="form-group"><label>{T("Full Name (English)", "الاسم بالإنجليزية")}</label><input value={modalData.name || ""} onChange={e => setModalData({ ...modalData, name: e.target.value })} /></div>
            <div className="form-group"><label>{T("Full Name (Arabic)", "الاسم بالعربية")}</label><input value={modalData.name_ar || ""} onChange={e => setModalData({ ...modalData, name_ar: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Email", "البريد")}</label><input value={modalData.email || ""} onChange={e => setModalData({ ...modalData, email: e.target.value })} /></div>
            <div className="form-group"><label>{T("Phone", "الهاتف")}</label><input value={modalData.phone || ""} onChange={e => setModalData({ ...modalData, phone: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Department", "القسم")}</label><input value={modalData.department || ""} onChange={e => setModalData({ ...modalData, department: e.target.value })} /></div>
            <div className="form-group"><label>{T("Position", "المنصب")}</label><input value={modalData.position || ""} onChange={e => setModalData({ ...modalData, position: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Salary (EGP)", "الراتب")}</label><input type="number" value={modalData.salary || ""} onChange={e => setModalData({ ...modalData, salary: +e.target.value })} /></div>
            <div className="form-group"><label>{T("Status", "الحالة")}</label>
              <select value={modalData.status || "active"} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
                <option value="active">{T("Active", "نشط")}</option>
                <option value="inactive">{T("Inactive", "غير نشط")}</option>
              </select>
            </div>
          </div>
          {/* Role — admin only */}
          {role === "admin" && (
            <div className="form-group">
              <label>🛡️ {T("Portal Role (changes which portal they log into)", "دور البوابة (يحدد أي بوابة يدخلون منها)")}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {[
                  { val: "employee",   icon: "🙋", label: T("Employee","موظف"),       desc: T("Standard employee portal","بوابة الموظف العادية") },
                  { val: "hr",         icon: "👥", label: "HR",                       desc: T("Can manage attendance & requests","يدير الحضور والطلبات") },
                  { val: "accountant", icon: "💰", label: T("Accountant","محاسب"),    desc: T("Can view payroll & reports","يعرض الرواتب والتقارير") },
                  { val: "admin",      icon: "🛡️", label: "Admin",                    desc: T("Full access to everything","وصول كامل لكل شيء") },
                ].map(r => {
                  const active = (modalData.role || "employee") === r.val;
                  return (
                    <div key={r.val} onClick={() => setModalData({ ...modalData, role: r.val })}
                      style={{ flex: "1 1 140px", padding: "10px 14px", borderRadius: 10, border: `2px solid ${active ? "var(--acc)" : "var(--border)"}`, background: active ? "var(--accg)" : "var(--bg2)", cursor: "pointer", transition: "all 0.15s" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: active ? "var(--acc)" : "var(--t1)" }}>{r.icon} {r.label}</div>
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{r.desc}</div>
                      {active && <div style={{ fontSize: 10, color: "var(--acc)", marginTop: 4, fontWeight: 600 }}>✓ {T("Selected","محدد")}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Approved GPS Locations */}
          <div className="form-group">
            <label>📍 {T("Approved Work Locations (GPS)", "مواقع العمل المعتمدة (GPS)")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
              {APPROVED_LOCATIONS.map(loc => {
                const current = (() => {
                  try {
                    const v = modalData.approved_locations;
                    return Array.isArray(v) ? v : (typeof v === "string" ? JSON.parse(v || "[]") : []);
                  } catch { return ["office"]; }
                })();
                const checked = current.includes(loc.id);
                return (
                  <label key={loc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: checked ? "var(--accg)" : "var(--bg2)", border: `1px solid ${checked ? "var(--acc)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", fontWeight: checked ? 600 : 400, transition: "all 0.15s" }}>
                    <input type="checkbox" checked={checked} onChange={() => {
                      const next = checked ? current.filter(x => x !== loc.id) : [...current, loc.id];
                      setModalData({ ...modalData, approved_locations: next });
                    }} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 18 }}>{loc.icon}</span>
                    <div>
                      <div style={{ color: "var(--t1)", fontSize: 14 }}>{loc.name}</div>
                      <div style={{ color: "var(--t3)", fontSize: 12 }}>{loc.nameAr} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 6 }}>
              💡 {T("Select all locations where this employee is allowed to clock in. If they clock in from elsewhere, they must explain why.", "اختر جميع المواقع المسموح للموظف بتسجيل الحضور منها. إذا سجّل من مكان آخر يجب أن يوضح السبب.")}
            </div>
          </div>
          {/* Payment Company Info */}
          <div style={{ background: "var(--infob)", border: "1px solid var(--info)", borderRadius: 8, padding: 14, marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: "var(--info)", fontWeight: 700, marginBottom: 10 }}>💳 {T("Payment Company Info", "بيانات شركة الدفع")}</div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12 }}>👤 {T("dopay Official Name", "الاسم الرسمي في dopay")}</label>
              <input value={modalData.dopay_full_name || ""}
                onChange={e => setModalData({ ...modalData, dopay_full_name: e.target.value })}
                placeholder={T("Full name exactly as registered in dopay", "الاسم الكامل كما هو مسجل في dopay")} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ fontSize: 12 }}>{T("Payment Company ID", "كود شركة الدفع")}</label>
                <input value={modalData.payment_id || ""} onChange={e => setModalData({ ...modalData, payment_id: e.target.value })} placeholder="e.g. 29111262102853" style={{ fontFamily: "monospace", letterSpacing: 1 }} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12 }}>{T("Payment Mobile", "موبايل شركة الدفع")}</label>
                <input value={modalData.payment_mobile || ""} onChange={e => setModalData({ ...modalData, payment_mobile: e.target.value })} placeholder="+201XXXXXXXXX" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ fontSize: 12 }}>🪪 {T("National ID", "الرقم القومي")}</label>
                <input value={modalData.national_id || ""}
                  onChange={e => setModalData({ ...modalData, national_id: e.target.value })}
                  placeholder="e.g. 29xxxxxxxxxx" style={{ fontFamily: "monospace" }} />
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 22 }}>
                <input type="checkbox" id="track_att"
                  checked={modalData.track_attendance !== false}
                  onChange={e => setModalData({ ...modalData, track_attendance: e.target.checked })}
                  style={{ width: 18, height: 18 }} />
                <label htmlFor="track_att" style={{ cursor: "pointer", fontSize: 13 }}>
                  📋 {T("Track Attendance", "تتبع الحضور")}
                </label>
              </div>
            </div>
          </div>

          {/* Work Mode */}
          <div className="form-group" style={{ marginBottom: 4 }}>
            <label>🏢 {T("Work Mode", "نمط العمل")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {[
                { id: "office",     icon: "🏢", title: T("Office", "المكتب"),               desc: T("GPS + Camera required on every clock-in", "GPS وكاميرا مطلوبان عند كل تسجيل دخول") },
                { id: "hybrid",     icon: "🔀", title: T("Hybrid", "هجين"),                  desc: T("GPS always required. Camera on workdays (Sun–Thu) only. No camera on Fri & Sat", "GPS دائماً مطلوب. الكاميرا أيام العمل (أحد–خميس) فقط. بدون كاميرا الجمعة والسبت") },
                { id: "remote",     icon: "🏠", title: T("Full Remote", "عمل من المنزل"),    desc: T("GPS always required. No camera ever", "GPS دائماً مطلوب. بدون كاميرا نهائياً") },
                { id: "no_verify",  icon: "🆓", title: T("No Verification", "بدون تحقق"),    desc: T("No GPS, no camera — employee signs in freely from anywhere", "بدون GPS أو كاميرا — الموظف يسجل حضوره بحرية من أي مكان") },
              ].map(opt => {
                const selected = (modalData.work_mode || "office") === opt.id;
                return (
                  <div key={opt.id} onClick={() => setModalData({ ...modalData, work_mode: opt.id })}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: selected ? "var(--accg)" : "var(--bg2)", border: `2px solid ${selected ? "var(--acc)" : "var(--border)"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ fontSize: 22, marginTop: 1 }}>{opt.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: selected ? "var(--acc)" : "var(--t1)", fontSize: 14 }}>{opt.title}</div>
                      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    {selected && <div style={{ color: "var(--acc)", fontWeight: 700, fontSize: 18 }}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Shift Assignment */}
          <div className="form-group">
            <label>🕐 {T("Assigned Shift", "المناوبة المعينة")}</label>
            <select
              value={String(modalData.assigned_shift_id ?? empShifts.find(es => es.employee_id === modalData.id)?.shift_id ?? "")}
              onChange={e => setModalData({ ...modalData, assigned_shift_id: e.target.value })}>
              <option value="">{T("No shift assigned", "بدون مناوبة")}</option>
              {shifts.map(s => (
                <option key={s.id} value={String(s.id)}>
                  {ar ? (s.name_ar || s.name) : s.name} ({s.start_time} → {s.end_time})
                  {(() => { try { const od = JSON.parse(s.off_days||"[]"); if(od.length) return ` 🏖️ off: ${od.map(d=>["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]).join(",")}` } catch{} return ""; })()}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving} onClick={async () => {
              setSaving(true);
              const locs = (() => {
                try {
                  const v = modalData.approved_locations;
                  return Array.isArray(v) ? v : JSON.parse(v || '["office"]');
                } catch { return ["office"]; }
              })();
              await db("employees", "PATCH", {
                name: modalData.name, name_ar: modalData.name_ar,
                email: modalData.email, phone: modalData.phone,
                department: modalData.department, position: modalData.position,
                salary: modalData.salary, status: modalData.status,
                role: modalData.role || "employee",
                approved_locations: JSON.stringify(locs),
                payment_id: modalData.payment_id || null,
                payment_mobile: modalData.payment_mobile || null,
dopay_full_name: modalData.dopay_full_name || null,
                national_id: modalData.national_id || null,
                dopay_mobile: modalData.dopay_mobile || null,
                payment_method: modalData.payment_method || "dopay",
                track_attendance: modalData.track_attendance !== false,
                work_mode: modalData.work_mode || "office",
              }, `?id=eq.${modalData.id}`);
              // Update shift assignment
              if (modalData.assigned_shift_id !== undefined) {
                await db("employee_shifts", "DELETE", null, `?employee_id=eq.${modalData.id}`);
                if (modalData.assigned_shift_id) {
                  await db("employee_shifts", "POST", { employee_id: modalData.id, shift_id: Number(modalData.assigned_shift_id) });
                }
              }
              await loadAll(); setSaving(false); closeModal();
            }}>{saving ? <span className="spinner" /> : T("Save Changes", "حفظ التغييرات")}</Btn>
          </div>

          {/* Admin: Reset Password */}
          {role === "admin" && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--warnb)", border: "1px solid var(--warn)", borderRadius: 10 }}>
              <div style={{ fontWeight: 600, color: "var(--warn)", marginBottom: 10, fontSize: 13 }}>🔑 {T("Reset Employee Password", "إعادة تعيين كلمة مرور الموظف")}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    id="reset_pw_input"
                    type={modalData.showResetPw ? "text" : "password"}
                    value={modalData.newPassword || ""}
                    onChange={e => setModalData({ ...modalData, newPassword: e.target.value })}
                    placeholder={T("Enter new password (min 8 chars)", "أدخل كلمة المرور الجديدة (8 أحرف على الأقل)")}
                    style={{ width: "100%", padding: "9px 40px 9px 12px", background: "var(--bg2)", border: "1.5px solid var(--border)", borderRadius: 8, color: "var(--t1)", fontFamily: "inherit", fontSize: 13, outline: "none" }}
                  />
                  <button type="button" onClick={() => setModalData({ ...modalData, showResetPw: !modalData.showResetPw })}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "var(--t3)", padding: 0 }}>
                    {modalData.showResetPw ? "🙈" : "👁️"}
                  </button>
                </div>
                <Btn color="warning" size="sm" disabled={!modalData.newPassword || modalData.newPassword.length < 8 || saving}
                  onClick={async () => {
                    if (!window.confirm(T(`Reset password for ${modalData.name}?`, `إعادة تعيين كلمة مرور ${modalData.name}؟`))) return;
                    setSaving(true);
                    try {
                      // Step 1: Find user in Supabase Auth by email
                      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
                        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
                      });
                      const listData = await listRes.json();
                      const allUsers = listData?.users || [];
                      const foundUser = allUsers.find(u => u.email?.toLowerCase() === modalData.email?.toLowerCase());
                      const userId = foundUser?.id;

                      if (userId) {
                        // Step 2: Update password via admin API
                        const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
                          body: JSON.stringify({ password: modalData.newPassword })
                        });
                        const updateData = await updateRes.json();
                        if (updateData.id || updateData.email) {
                          // Step 3: Send new password via WhatsApp to admin
                          const msg = encodeURIComponent(`🔑 myMayz HR\nPassword reset for: ${modalData.name}\nEmail: ${modalData.email}\nNew Password: ${modalData.newPassword}`);
                          fetch(`https://api.callmebot.com/whatsapp.php?phone=201004444558&text=${msg}&apikey=2789945`).catch(()=>{});
                          alert(T(`✅ Password updated successfully!\n\nEmployee: ${modalData.name}\nEmail: ${modalData.email}\nNew Password: ${modalData.newPassword}\n\nSent to your WhatsApp.`,
                            `✅ تم تحديث كلمة المرور!\n\nالموظف: ${modalData.name}\nالبريد: ${modalData.email}\nكلمة المرور الجديدة: ${modalData.newPassword}`));
                          setModalData({ ...modalData, newPassword: "", showResetPw: false });
                        } else {
                          throw new Error("Update failed: " + JSON.stringify(updateData));
                        }
                      } else {
                        // User not in Auth yet — send reset email instead
                        await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
                          body: JSON.stringify({ email: modalData.email })
                        });
                        alert(T(`⚠️ User not found in auth system.\nA password reset email has been sent to ${modalData.email}.`,
                          `⚠️ المستخدم غير موجود في نظام المصادقة.\nتم إرسال بريد إعادة تعيين إلى ${modalData.email}.`));
                      }
                    } catch(e) {
                      console.error("Password reset error:", e);
                      // Fallback: send reset email
                      await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
                        body: JSON.stringify({ email: modalData.email })
                      });
                      alert(T(`⚠️ Service key not configured. Password reset email sent to ${modalData.email} instead.\n\nTo enable direct password reset, add REACT_APP_SUPABASE_SERVICE_KEY to Vercel environment variables.`,
                        `⚠️ مفتاح الخدمة غير مكوّن. تم إرسال بريد إعادة تعيين إلى ${modalData.email} بدلاً من ذلك.`));
                    }
                    setSaving(false);
                  }}>
                  {saving ? <span className="spinner" /> : T("Set Password", "تعيين")}
                </Btn>
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                💡 {T("Password will be saved and sent to admin WhatsApp to share with the employee.", "ستُحفظ كلمة المرور وتُرسل لواتساب المشرف لمشاركتها مع الموظف.")}
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Salary Modal */}
        <Modal show={activeModal === "editSalary"} onClose={closeModal} title={T("💰 Edit Salary", "💰 تعديل الراتب")}>
          <div className="info-box">
            <strong>{modalData.name}</strong> — {modalData.employee_code}
          </div>

          {/* Green additions box */}
          <div style={{ background: "var(--okb)", border: "1px solid var(--ok)", borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--ok)", fontWeight: 700, marginBottom: 10 }}>➕ {T("ADDITIONS", "الإضافات")}</div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ fontSize: 12 }}>{T("Base Salary", "الراتب الأساسي")}</label>
                <input type="number" value={modalData.base_salary ?? modalData.salary ?? 0}
                  onChange={e => setModalData({ ...modalData, base_salary: +e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12 }}>{T("Allowances", "البدلات")}</label>
                <input type="number" value={modalData.allowances ?? 0}
                  onChange={e => setModalData({ ...modalData, allowances: +e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12 }}>{T("Bonuses", "المكافآت")}</label>
              <input type="number" value={modalData.bonuses ?? 0}
                onChange={e => setModalData({ ...modalData, bonuses: +e.target.value })} />
            </div>
          </div>

          {/* Red deductions box */}
          <div style={{ background: "var(--errb)", border: "1px solid var(--err)", borderRadius: 8, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--err)", fontWeight: 700, marginBottom: 10 }}>➖ {T("DEDUCTIONS", "الخصومات")}</div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ fontSize: 12 }}>{T("Deductions", "خصومات")}</label>
                <input type="number" value={modalData.deductions ?? 0}
                  onChange={e => setModalData({ ...modalData, deductions: +e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 12 }}>{T("Tax", "الضريبة")}</label>
                <input type="number" value={modalData.tax ?? 0}
                  onChange={e => setModalData({ ...modalData, tax: +e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12 }}>{T("Insurance", "التأمين")}</label>
              <input type="number" value={modalData.insurance ?? 0}
                onChange={e => setModalData({ ...modalData, insurance: +e.target.value })} />
            </div>
          </div>

          {/* Net Salary */}
          <div className="net-salary-box">
            <div style={{ fontSize: 13, color: "var(--t2)", marginBottom: 4 }}>
              {((modalData.base_salary ?? modalData.salary ?? 0) + (modalData.allowances ?? 0) + (modalData.bonuses ?? 0)).toLocaleString()} − {((modalData.deductions ?? 0) + (modalData.tax ?? 0) + (modalData.insurance ?? 0)).toLocaleString()} =
            </div>
            <div className="amount">
              {((modalData.base_salary ?? modalData.salary ?? 0) + (modalData.allowances ?? 0) + (modalData.bonuses ?? 0) - (modalData.deductions ?? 0) - (modalData.tax ?? 0) - (modalData.insurance ?? 0)).toLocaleString()} EGP
            </div>
            <div className="label">🎯 {T("Net Monthly Salary", "صافي الراتب الشهري")}</div>
          </div>

          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving} onClick={async () => {
              setSaving(true);
              const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
              const base = Number(modalData.base_salary ?? modalData.salary ?? 0);
              const allowances = Number(modalData.allowances ?? 0);
              const bonuses = Number(modalData.bonuses ?? 0);
              const deductions = Number(modalData.deductions ?? 0);
              const tax = Number(modalData.tax ?? 0);
              const insurance = Number(modalData.insurance ?? 0);
              const net = base + allowances + bonuses - deductions - tax - insurance;
              const curMonth = months[new Date().getMonth()];
              const curYear = new Date().getFullYear();

              // Save to employee record - net WITHOUT loan (structural salary)
              const empResult = await db("employees", "PATCH", { salary: base, allowances, bonuses, deductions, tax, insurance, net_salary: net }, `?id=eq.${modalData.id}`);

              // Get ALL active loans for this employee and sum deductions
              const activeLoans = loans.filter(l => l.employee_id === modalData.id && l.status === "active");
              const totalLoanDed = activeLoans.reduce((s, l) => s + Number(l.monthly_deduction || 0), 0);
              const netWithLoan = net - totalLoanDed;

              // Auto-create or update payroll for this month WITH loan deduction
              const existing = payroll.find(p => p.employee_id === modalData.id && p.month === curMonth && p.year === curYear);
              if (existing) {
                await db("payroll", "PATCH", { base_salary: base, allowances, bonuses, deductions, tax, insurance, loan_deduction: totalLoanDed, net_salary: netWithLoan }, `?id=eq.${existing.id}`);
              } else {
                await db("payroll", "POST", { employee_id: modalData.id, month: curMonth, year: curYear, base_salary: base, allowances, bonuses, deductions, tax, insurance, loan_deduction: totalLoanDed, net_salary: netWithLoan, status: "pending" });
              }
              await loadAll(); setSaving(false); closeModal();
              alert(T(
                `✅ Saved!\nStructural net: ${net.toLocaleString()} EGP\nLoan deduction: -${totalLoanDed.toLocaleString()} EGP\nPayroll net: ${netWithLoan.toLocaleString()} EGP`,
                `✅ تم الحفظ!\nالصافي الهيكلي: ${net.toLocaleString()} جنيه\nخصم القرض: -${totalLoanDed.toLocaleString()} جنيه\nصافي مسير الراتب: ${netWithLoan.toLocaleString()} جنيه`
              ));
            }}>{saving ? <span className="spinner" /> : T("💾 Save & Generate Payslip", "💾 حفظ وإنشاء مسير الراتب")}</Btn>
          </div>
        </Modal>

        {/* Edit Payment ID Modal — admin & accountant */}
        <Modal show={activeModal === "editPaymentId"} onClose={closeModal} title={T("🏦 Payment Info", "🏦 معلومات الدفع")}>
          <div className="info-box" style={{ marginBottom: 16 }}>
            <strong>{modalData.name}</strong> — <span style={{ color: "var(--t3)", fontSize: 12 }}>{modalData.employee_code}</span>
          </div>
          <div style={{ background: "var(--infob)", border: "1px solid var(--info)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: "var(--info)", marginBottom: 12, fontSize: 13 }}>💳 {T("Payment Company Details", "بيانات شركة الدفع")}</div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>{T("Payment Company ID (National ID / Account No.)", "كود شركة الدفع (رقم قومي / حساب)")}</label>
              <input
                value={modalData.payment_id || ""}
                onChange={e => setModalData({ ...modalData, payment_id: e.target.value })}
                placeholder="e.g. 29111262102853"
                style={{ fontFamily: "monospace", letterSpacing: 1 }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{T("Payment Mobile Number", "رقم الهاتف للدفع")}</label>
              <input
                value={modalData.payment_mobile || ""}
                onChange={e => setModalData({ ...modalData, payment_mobile: e.target.value })}
                placeholder="+201XXXXXXXXX"
              />
            </div>
          </div>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>📊 {T("Current Salary Summary", "ملخص الراتب الحالي")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              <div style={{ color: "var(--t3)" }}>{T("Base Salary","الراتب الأساسي")}</div>
              <div style={{ color: "var(--ok)", fontWeight: 600 }}>{(modalData.salary || 0).toLocaleString()} EGP</div>
              <div style={{ color: "var(--t3)" }}>{T("Net Salary","صافي الراتب")}</div>
              <div style={{ color: "var(--acc)", fontWeight: 700 }}>{(modalData.net_salary || modalData.salary || 0).toLocaleString()} EGP</div>
            </div>
          </div>
          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving} onClick={async () => {
              setSaving(true);
              const result = await db("employees", "PATCH", {
                payment_id: modalData.payment_id || null,
                payment_mobile: modalData.payment_mobile || null,
              }, `?id=eq.${modalData.id}`);
              if (!result) alert(T("Failed to save. Check permissions.", "فشل الحفظ. تحقق من الصلاحيات."));
              await loadAll(); setSaving(false); closeModal();
            }}>{saving ? <span className="spinner" /> : T("💾 Save Payment Info", "💾 حفظ بيانات الدفع")}</Btn>
          </div>
        </Modal>
      </div>
    );
  };
  const renderAttendance = () => {
    const timeStr = now.toLocaleTimeString(ar ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = now.toLocaleDateString(ar ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const filtered = attendance.filter(a => {
      if (role === "employee" && a.employee_id !== currentEmployee?.id) return false;
      if (reportFilter.month) {
        if (!a.date?.startsWith(reportFilter.month)) return false;
      } else {
        if (reportFilter.from && a.date < reportFilter.from) return false;
        if (reportFilter.to && a.date > reportFilter.to) return false;
      }
      if (reportFilter.emp && a.employee_id !== Number(reportFilter.emp)) return false;
      if (reportFilter.status && a.status !== reportFilter.status) return false;
      return true;
    }).sort((a, b) => {
      const { col, dir } = attSort;
      const mul = dir === "asc" ? 1 : -1;
      if (col === "date")     return mul * (a.date||"").localeCompare(b.date||"");
      if (col === "checkin")  return mul * (new Date(a.check_in||0) - new Date(b.check_in||0));
      if (col === "checkout") return mul * (new Date(a.check_out||0) - new Date(b.check_out||0));
      if (col === "hours")    return mul * ((Number(a.hours_worked)||0) - (Number(b.hours_worked)||0));
      if (col === "status")   return mul * (a.status||"").localeCompare(b.status||"");
      if (col === "location") return mul * (a.location_label||"").localeCompare(b.location_label||"");
      if (col === "notes")    return mul * (a.notes||"").localeCompare(b.notes||"");
      if (col === "name") {
        const ea = employees.find(e => e.id === a.employee_id);
        const eb = employees.find(e => e.id === b.employee_id);
        return mul * (ea?.name||"").localeCompare(eb?.name||"");
      }
      if (col === "shift") {
        const ea = empShifts.find(x => x.employee_id === a.employee_id);
        const eb = empShifts.find(x => x.employee_id === b.employee_id);
        const sa = ea ? (shifts.find(s => s.id === ea.shift_id)?.name||"") : "";
        const sb = eb ? (shifts.find(s => s.id === eb.shift_id)?.name||"") : "";
        return mul * sa.localeCompare(sb);
      }
      return mul * (new Date(b.check_in||b.date) - new Date(a.check_in||a.date));
    });

    const toggleAttSort = (col) => setAttSort(prev => ({ col, dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc" }));
    const AH = ({ col, children }) => {
      const active = attSort.col === col;
      const arrow = active ? (attSort.dir === "asc" ? "▲" : "▼") : "⇅";
      return <th className={`sort-th${active ? " active-sort" : ""}`} onClick={() => toggleAttSort(col)}>{children}<span className="sort-arrow">{arrow}</span></th>;
    };

    const stats = {
      present: filtered.filter(a => a.status === "present").length,
      late: filtered.filter(a => a.status === "late").length,
      absent: filtered.filter(a => a.status === "absent").length,
      totalHours: filtered.reduce((s, a) => s + (Number(a.hours_worked) || 0), 0).toFixed(1),
    };

    return (
      <div>
        <div className="tab-bar">
          {[
            { id: "clockin", label: T("🕐 Sign In / Sign Out", "🕐 تسجيل الحضور / الانصراف") },
            { id: "reports", label: (role === "admin" || role === "hr" || role === "accountant") ? T("📊 Reports", "📊 التقارير") : T("📊 My Attendance", "📊 حضوري") },
          ].map(tab => (
            <button key={tab.id} className={`tab ${attTab === tab.id ? "active" : ""}`} onClick={() => setAttTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {attTab === "clockin" && (
          <>
            <div className="clock-section">
              {/* Clock In */}
              <div className="clock-card in">
                <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4 }}>{T("Sign In", "تسجيل الحضور")}</div>

                {/* Work mode badge */}
                {(() => {
                  const wm = currentEmployee?.work_mode || employees.find(e => e.id === currentEmployee?.id)?.work_mode || "office";
                  const d = new Date().getDay();
                  if (wm === "no_verify") return (
                    <div style={{ display: "inline-block", background: "var(--okb)", border: "1px solid var(--ok)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "var(--ok)", fontWeight: 600, marginBottom: 8 }}>
                      🆓 {T("No Verification Mode — Sign in freely", "بدون تحقق — سجّل حضورك بحرية")}
                    </div>
                  );
                  const isRemoteToday = wm === "remote" || (wm === "hybrid" && (d === 5 || d === 6));
                  if (isRemoteToday) return (
                    <div style={{ display: "inline-block", background: "var(--accg)", border: "1px solid var(--acc)", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "var(--acc)", fontWeight: 600, marginBottom: 8 }}>
                      🏠 {wm === "remote" ? T("Full Remote Mode", "عمل من المنزل") : T("Hybrid — Fri/Sat Remote", "هجين — جمعة/سبت من المنزل")} — {T("GPS required, no camera", "GPS مطلوب، بدون كاميرا")}
                    </div>
                  );
                  return null;
                })()}
                <div className="clock-time">{timeStr}</div>
                <div className="clock-date">{dateStr}</div>
                {!clockedIn
                  ? <button className="clock-btn in" onClick={handleClockIn} disabled={!!verifying}>
                      {verifying ? <><span className="spinner" style={{ marginRight: 8 }} />{T("Verifying...", "جاري التحقق...")}</> : T("Sign In", "تسجيل الحضور")}
                    </button>
                  : <div style={{ color: "var(--ok)", fontWeight: 600, fontSize: 15 }}>
                      ✅ {T("Signed in at", "تم تسجيل الحضور في")} {clockInTime?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      {locLabel && <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>📍 {locLabel}</div>}
                      <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>
                        ⏱️ {T("Working for", "مدة العمل")}: {Math.floor((now - clockInTime) / 3600000)}h {Math.floor(((now - clockInTime) % 3600000) / 60000)}m
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4, background: "var(--okb)", padding: "4px 10px", borderRadius: 6 }}>
                        🔒 {T("Session saved — you can logout and come back", "الجلسة محفوظة — يمكنك الخروج والعودة")}
                      </div>
                    </div>
                }

                {(() => {
                  const wm = currentEmployee?.work_mode || employees.find(e => e.id === currentEmployee?.id)?.work_mode || "office";
                  const d = new Date().getDay();

                  // No verification mode — show a simple ready message instead of steps
                  if (wm === "no_verify") return (
                    <div style={{ marginTop: 18, padding: "14px 16px", background: "var(--okb)", border: "1px solid var(--ok)", borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>🆓</div>
                      <div style={{ fontWeight: 700, color: "var(--ok)", fontSize: 15 }}>{T("No verification required", "لا يلزم أي تحقق")}</div>
                      <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>{T("Tap Sign In to record your attendance", "اضغط تسجيل الحضور لتسجيل حضورك")}</div>
                    </div>
                  );

                  const noCamera = wm === "remote" || (wm === "hybrid" && (d === 5 || d === 6));
                  return (
                    <div className="verify-steps">
                      {/* GPS Step */}
                      <div className={`verify-step ${gpsErr ? "error" : gpsOk ? "success" : ""}`}>
                        <span className="verify-icon">{gpsOk ? "✅" : gpsErr ? "❌" : verifying === "gps" ? "⏳" : "⭕"}</span>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div>{gpsOk ? T("Location Verified", "تم التحقق من الموقع") : gpsErr ? T("GPS Error", "خطأ GPS") : T("GPS Location", "موقع GPS")}</div>
                          {gpsOk && gpsLoc && <div className="gps-coords">📍 {gpsLoc.lat.toFixed(5)}, {gpsLoc.lng.toFixed(5)} (±{Math.round(gpsLoc.accuracy)}m)</div>}
                          {gpsErr && <div className="gps-coords" style={{ color: "var(--err)" }}>{gpsErr}</div>}
                        </div>
                      </div>

                      {/* Camera Step */}
                      {noCamera ? (
                        <div className="verify-step" style={{ opacity: 0.5 }}>
                          <span className="verify-icon">⛔</span>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={{ color: "var(--t3)" }}>{T("Camera — not required for your work mode", "الكاميرا — غير مطلوبة لنمط عملك")}</div>
                          </div>
                        </div>
                      ) : (
                        <div className={`verify-step ${photoErr ? "error" : photoOk ? "success" : ""}`}>
                          <span className="verify-icon">{photoOk ? "✅" : photoErr ? "❌" : verifying === "photo" ? "⏳" : "⭕"}</span>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div>{photoOk ? T("📸 Photo Captured ✓", "📸 تم التقاط الصورة ✓") : photoErr ? T("📵 Camera Access Denied", "📵 تم رفض الكاميرا") : verifying === "photo" ? T("Opening camera...", "جاري فتح الكاميرا...") : T("Face Photo", "صورة الوجه")}</div>
                            {photoErr && (
                              <div style={{ marginTop: 10 }}>
                                <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid var(--err)", borderRadius: 10, padding: "12px 14px", fontSize: 12, lineHeight: 1.9 }}>
                                  <div style={{ fontWeight: 700, color: "var(--err)", marginBottom: 8, fontSize: 13 }}>
                                    🔴 {T("Camera blocked — please enable it:", "الكاميرا محظورة — يرجى تفعيلها:")}
                                  </div>
                                  <div>📱 <strong>iPhone / Safari:</strong></div>
                                  <div style={{ paddingLeft: 20, color: "var(--t2)" }}>{T("Settings → Safari → Camera → Allow", "الإعدادات ← Safari ← الكاميرا ← سماح")}</div>
                                  <div style={{ marginTop: 6 }}>🤖 <strong>Android / Chrome:</strong></div>
                                  <div style={{ paddingLeft: 20, color: "var(--t2)" }}>{T("Tap 🔒 in address bar → Camera → Allow", "اضغط 🔒 في شريط العنوان ← الكاميرا ← اسمح")}</div>
                                  <div style={{ marginTop: 6 }}>💻 <strong>Desktop / Chrome:</strong></div>
                                  <div style={{ paddingLeft: 20, color: "var(--t2)" }}>{T("Click 🔒 left of URL → Camera → Allow → reload page", "اضغط 🔒 يسار الرابط ← الكاميرا ← اسمح ← أعد تحميل")}</div>
                                  <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(245,158,11,0.15)", borderRadius: 6, color: "var(--warn)", fontWeight: 600 }}>
                                    ✅ {T("After allowing → tap '🔄 Try Again' below", "بعد السماح → اضغط '🔄 حاول مرة أخرى' أدناه")}
                                  </div>
                                </div>
                              </div>
                            )}
                            {photo && (role === "admin" || role === "hr") && <img src={photo} alt="captured" style={{ width: 80, height: 60, borderRadius: 6, marginTop: 8, objectFit: "cover", border: "2px solid var(--ok)" }} />}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(gpsErr || photoErr) && !clockedIn && (() => {
                  const wm = currentEmployee?.work_mode || employees.find(e => e.id === currentEmployee?.id)?.work_mode || "office";
                  if (wm === "no_verify") return null;
                  return <button className="clock-btn in" style={{ marginTop: 16, width: "100%", padding: "12px" }} onClick={handleClockIn}>{T("🔄 Try Again", "🔄 حاول مرة أخرى")}</button>;
                })()}
              </div>

              {/* Clock Out */}
              <div className="clock-card out">
                <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4 }}>{T("Sign Out", "تسجيل الانصراف")}</div>
                <div className="clock-time">{timeStr}</div>
                <div className="clock-date">{dateStr}</div>
                {!clockOutDone
                  ? <button className="clock-btn out" onClick={handleClockOut} disabled={!clockedIn || clockOutVerifying}>
                      {clockOutVerifying ? <><span className="spinner" style={{ marginRight: 8 }} />{T("Verifying...", "جاري التحقق...")}</> : T("Sign Out", "تسجيل الانصراف")}
                    </button>
                  : <div style={{ color: "var(--err)", fontWeight: 600, fontSize: 15 }}>✅ {T("Signed out successfully", "تم تسجيل الانصراف بنجاح")}</div>
                }
                {clockedIn && clockInTime && !clockOutDone && (
                  <div style={{ marginTop: 12, color: "var(--t2)", fontSize: 13 }}>
                    ⏱️ {T("Duration", "المدة")}: {Math.floor((now - clockInTime) / 3600000)}h {Math.floor(((now - clockInTime) % 3600000) / 60000)}m
                  </div>
                )}
                {(clockOutVerifying || clockOutDone) && (
                  <div className="verify-steps">
                    <div className={`verify-step ${clockOutGpsOk ? "success" : clockOutVerifying && !clockOutGpsOk ? "" : ""}`}>
                      <span className="verify-icon">{clockOutGpsOk ? "✅" : clockOutVerifying ? "⏳" : "⭕"}</span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div>{clockOutGpsOk ? T("Exit Location Captured ✓", "تم تسجيل موقع الخروج ✓") : T("Capturing GPS...", "جاري تسجيل الموقع...")}</div>
                      </div>
                    </div>
                    {(() => {
                      const wm = currentEmployee?.work_mode || employees.find(e => e.id === currentEmployee?.id)?.work_mode || "office";
                      const d = new Date().getDay();
                      const noOutCamera = wm === "remote" || (wm === "hybrid" && (d === 5 || d === 6));
                      if (noOutCamera) return (
                        <div className="verify-step" style={{ opacity: 0.5 }}>
                          <span className="verify-icon">⛔</span>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div style={{ color: "var(--t3)" }}>{T("Camera — not required for your work mode", "الكاميرا — غير مطلوبة لنمط عملك")}</div>
                          </div>
                        </div>
                      );
                      return (
                        <div className={`verify-step ${clockOutPhotoOk ? "success" : ""}`}>
                          <span className="verify-icon">{clockOutPhotoOk ? "✅" : clockOutVerifying ? "⏳" : "⭕"}</span>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <div>{clockOutPhotoOk ? T("📸 Exit Photo Captured ✓", "📸 تم التقاط صورة الخروج ✓") : T("Opening camera...", "جاري فتح الكاميرا...")}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Outside Location Modal */}
            <Modal show={showLocModal} onClose={() => {}} title={T("📍 خارج موقع العمل المحدد", "📍 Outside Your Assigned Location")}>
              <div style={{ background: "var(--warnb)", border: "1px solid var(--warn)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
                ⚠️ <strong>{T("خارج موقع العمل المحدد", "Outside Your Assigned Work Location")}</strong><br />
                <span style={{ fontSize: 13, color: "var(--t2)", marginTop: 4, display: "block" }}>
                  {T("You are not at any of your approved work locations. Please select where you are working from.", "أنت لست في أي من مواقع عملك المعتمدة. يرجى تحديد مكان عملك.")}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {[
                  { id: "home", label: T("🏠 Home", "🏠 المنزل"), labelEn: "Home" },
                  { id: "other", label: T("📍 Other Location", "📍 موقع آخر"), labelEn: "Other" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => { setCustomLoc(opt.id); if (opt.id !== "other") setModalData({ ...modalData, otherName: "" }); }}
                    style={{ padding: "14px 18px", background: customLoc === opt.id ? "var(--acc)" : "var(--bg2)", border: `2px solid ${customLoc === opt.id ? "var(--acc)" : "var(--border)"}`, color: customLoc === opt.id ? "white" : "var(--t1)", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 600, textAlign: "left", transition: "all 0.15s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {customLoc === "other" && (
                <div className="form-group">
                  <label>{T("Location Name *", "اسم الموقع *")}</label>
                  <input
                    value={modalData.otherName || ""}
                    onChange={e => setModalData({ ...modalData, otherName: e.target.value })}
                    placeholder={T("e.g. Client office, Alexandria branch...", "مثال: مكتب العميل، فرع الإسكندرية...")}
                    style={{ fontSize: 14 }}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginTop: 8 }}>
                <label>{T("Reason *", "السبب *")}</label>
                <textarea rows={3} value={modalData.outsideReason || ""} onChange={e => setModalData({ ...modalData, outsideReason: e.target.value })}
                  placeholder={T("Why are you working from this location today?", "لماذا تعمل من هذا الموقع اليوم؟")}
                  style={{ width: "100%", resize: "vertical", fontSize: 14, lineHeight: 1.6, padding: "10px 12px" }} />
              </div>

              <div className="form-actions">
                <Btn color="primary"
                  disabled={!customLoc || !modalData.outsideReason || (customLoc === "other" && !modalData.otherName) || saving}
                  onClick={async () => {
                    setShowLocModal(false);
                    const locName = customLoc === "home"
                      ? T("Home", "المنزل")
                      : modalData.otherName;
                    const label = `${locName} — ${modalData.outsideReason}`;
                    await doSaveClockIn(pendingTime, pendingLoc, label, photo);
                    setCustomLoc(""); setModalData({});
                  }}>
                  {saving ? <span className="spinner" /> : T("✅ Confirm & Clock In", "✅ تأكيد وتسجيل الدخول")}
                </Btn>
              </div>
            </Modal>
          </>
        )}

        {attTab === "reports" && (
          <div>
            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              {[
                { label: T("Present", "حاضر"), value: stats.present, color: "green" },
                { label: T("Late", "متأخر"), value: stats.late, color: "yellow" },
                { label: T("Absent", "غائب"), value: stats.absent, color: "red" },
                { label: T("Total Hours", "إجمالي الساعات"), value: stats.totalHours + "h", color: "blue" },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <div className={`stat-icon ${s.color}`}>📊</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div className="card-title">🔍 {T("Filter Reports", "تصفية التقارير")}</div>
                <div style={{ fontSize: 11, color: "var(--t3)" }}>
                  💡 {T("Click any column header to sort ▲▼", "اضغط على أي عنوان عمود للترتيب ▲▼")}
                </div>
              </div>

              {/* Status quick filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: T("All", "الكل"), status: "" },
                  { label: T("⚠️ Late", "⚠️ متأخر"), status: "late" },
                  { label: T("❌ Incomplete", "❌ ناقصة"), status: "incomplete" },
                  { label: T("✅ Present", "✅ حاضر"), status: "present" },
                  { label: T("🔴 Absent", "🔴 غائب"), status: "absent" },
                ].map(f => (
                  <button key={f.status} onClick={() => setReportFilter({ ...reportFilter, status: f.status })}
                    style={{ padding: "6px 14px", background: reportFilter.status === f.status ? "var(--acc)" : "var(--bg2)", border: `1px solid ${reportFilter.status === f.status ? "var(--acc)" : "var(--border)"}`, color: reportFilter.status === f.status ? "white" : "var(--t2)", borderRadius: 20, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500, transition: "all 0.15s" }}>
                    {f.label} ({attendance.filter(a => f.status ? a.status === f.status : true).length})
                  </button>
                ))}
              </div>

              {/* Month quick select */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--t3)", display: "block", marginBottom: 6 }}>📅 {T("Quick Month", "اختر شهراً")}</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: T("Today", "اليوم"), action: () => setReportFilter({ ...reportFilter, month: "", from: todayStr, to: todayStr }) },
                    { label: T("This Month", "هذا الشهر"), action: () => setReportFilter({ ...reportFilter, month: new Date().toISOString().slice(0,7), from: "", to: "" }) },
                    { label: T("Last Month", "الشهر الماضي"), action: () => { const d = new Date(); d.setMonth(d.getMonth()-1); setReportFilter({ ...reportFilter, month: d.toISOString().slice(0,7), from: "", to: "" }); } },
                    { label: T("All Time", "كل الوقت"), action: () => setReportFilter({ ...reportFilter, month: "", from: "", to: "" }) },
                  ].map((q, i) => (
                    <button key={i} onClick={q.action}
                      style={{ padding: "5px 12px", background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--t2)", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, transition: "all 0.15s" }}
                      onMouseOver={e => { e.target.style.borderColor = "var(--acc)"; e.target.style.color = "var(--acc)"; }}
                      onMouseOut={e => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--t2)"; }}>
                      {q.label}
                    </button>
                  ))}
                  {/* Month picker */}
                  <input type="month" value={reportFilter.month || ""}
                    onChange={e => setReportFilter({ ...reportFilter, month: e.target.value, from: "", to: "" })}
                    style={{ padding: "5px 10px", background: "#ffffff", border: "1px solid var(--border)", borderRadius: 8, color: "#1a2035", fontFamily: "inherit", fontSize: 12, cursor: "pointer" }} />
                </div>
              </div>

              {/* Date range */}
              <div className="form-row" style={{ marginBottom: 12 }}>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>{T("From Date", "من تاريخ")}</label>
                  <input type="date" value={reportFilter.from} onChange={e => setReportFilter({ ...reportFilter, from: e.target.value, month: "" })}
                    style={{ background: "#ffffff", color: "#1a2035", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, width: "100%" }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>{T("To Date", "إلى تاريخ")}</label>
                  <input type="date" value={reportFilter.to} onChange={e => setReportFilter({ ...reportFilter, to: e.target.value, month: "" })}
                    style={{ background: "#ffffff", color: "#1a2035", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontFamily: "inherit", fontSize: 13, width: "100%" }} />
                </div>
              </div>

              {(role === "admin" || role === "hr" || role === "accountant") && (
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12 }}>{T("Employee", "الموظف")}</label>
                  <select value={reportFilter.emp} onChange={e => setReportFilter({ ...reportFilter, emp: e.target.value })}>
                    <option value="">{T("All Employees", "جميع الموظفين")}</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>)}
                  </select>
                </div>
              )}
              <Btn color="outline" size="sm" onClick={() => setReportFilter({ from: todayStr, to: todayStr, emp: "", status: "", sort: "desc", month: "" })}>🔄 {T("Reset to Today", "إعادة ضبط لليوم")}</Btn>
            </div>

            {/* Attendance Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div className="card-title">📋 {T("Attendance Records", "سجلات الحضور")} ({filtered.length})</div>
                {(role === "admin" || role === "hr" || role === "accountant") && (
                  <Btn color="success" size="sm" onClick={() => {
                    // Build CSV data
                    const headers = ["Date","Employee Code","Employee Name","Shift","Check In","Check Out","Hours Worked","Location","GPS Lat","GPS Lng","Status","Notes"];
                    const rows = filtered.map(a => {
                      const emp = employees.find(e => e.id === a.employee_id);
                      const es = empShifts.find(x => x.employee_id === a.employee_id);
                      const shift = es ? shifts.find(s => s.id === es.shift_id) : null;
                      const checkIn = a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}) : "";
                      const checkOut = a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:true}) : "";
                      const status = a.status === "on_leave" ? "On Leave" : a.status === "very_late" ? "Very Late" : a.status || "";
                      return [
                        a.date || "",
                        emp?.employee_code || "",
                        emp?.name || "Unknown",
                        shift ? shift.name : "",
                        checkIn,
                        checkOut,
                        a.hours_worked ? `${a.hours_worked}h` : "",
                        (a.location_label || "").replace(/,/g, ";"),
                        a.gps_lat ? Number(a.gps_lat).toFixed(6) : "",
                        a.gps_lng ? Number(a.gps_lng).toFixed(6) : "",
                        status,
                        (a.notes || "").replace(/,/g, ";"),
                      ];
                    });

                    // Build CSV string with BOM for Excel Arabic support
                    const csv = "\uFEFF" + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a2 = document.createElement("a");
                    const label = reportFilter.month
                      ? reportFilter.month
                      : reportFilter.from
                        ? `${reportFilter.from}_to_${reportFilter.to}`
                        : new Date().toISOString().split("T")[0];
                    a2.href = url;
                    a2.download = `myMayz_Attendance_${label}.csv`;
                    a2.click();
                    URL.revokeObjectURL(url);
                  }}>
                    📥 {T("Export Excel", "تصدير Excel")}
                  </Btn>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr>
                    <AH col="date">{T("Date", "التاريخ")}</AH>
                    <AH col="name">{T("Employee", "الموظف")}</AH>
                    <AH col="shift">{T("Shift", "المناوبة")}</AH>
                    <AH col="checkin">{T("Check In", "دخول")}</AH>
                    <AH col="checkout">{T("Check Out", "خروج")}</AH>
                    <AH col="hours">{T("Hours", "ساعات")}</AH>
                    <AH col="location">{T("Location", "الموقع")}</AH>
                    <th>{T("In GPS", "GPS دخول")}</th>
                    <AH col="status">{T("Status", "الحالة")}</AH>
                    <AH col="notes">{T("Notes", "ملاحظات")}</AH>
                    {(role === "admin" || role === "hr") && <th>{T("In Photo", "صورة دخول")}</th>}
                    {(role === "admin" || role === "hr") && <th>{T("Out Photo", "صورة خروج")}</th>}
                    {role === "admin" && <th>{T("Actions", "إجراءات")}</th>}
                  </tr></thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={11} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{T("No records found", "لا توجد سجلات")}</td></tr>
                      : filtered.map((a, i) => {
                        const emp = employees.find(e => e.id === a.employee_id);
                        const es = empShifts.find(x => x.employee_id === a.employee_id);
                        const shift = es ? shifts.find(s => s.id === es.shift_id) : null;
                        const isLate = a.status === "late" || a.status === "very_late";
                        const isIncomplete = a.status === "incomplete";
                        return (
                          <tr key={i} style={{ background: isLate ? "rgba(245,158,11,0.05)" : isIncomplete ? "rgba(239,68,68,0.05)" : "" }}>
                            <td style={{ fontWeight: 500, color: "var(--t1)" }}>{a.date}</td>
                            <td><div className="emp-row"><div className="emp-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{emp?.avatar || "?"}</div><span>{emp?.name || "Unknown"}</span></div></td>
                            <td style={{ fontSize: 11, color: shift ? shift.color || "var(--acc)" : "var(--t3)" }}>{shift ? (ar ? shift.name_ar : shift.name) : "—"}<br/>{shift ? `${shift.start_time}→${shift.end_time}` : ""}</td>
                            <td style={{ color: isLate ? "var(--warn)" : "var(--ok)", fontWeight: isLate ? 700 : 400 }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}{isLate ? " ⚠️" : ""}</td>
                            <td style={{ color: "var(--err)" }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td style={{ color: isIncomplete ? "var(--err)" : "var(--t2)", fontWeight: isIncomplete ? 700 : 400 }}>{a.hours_worked ? `${a.hours_worked}h` : "—"}{isIncomplete ? " ⚠️" : ""}</td>
                            <td>{a.location_label ? <span className="badge blue" title={a.location_label} style={{ fontSize: 11, whiteSpace: "normal", wordBreak: "break-word", maxWidth: 200, display: "inline-block", lineHeight: 1.4 }}>{a.location_label}</span> : "—"}</td>
                            <td style={{ fontSize: 11, color: "var(--t3)" }}>{a.gps_lat ? `${Number(a.gps_lat).toFixed(4)}, ${Number(a.gps_lng).toFixed(4)}` : "—"}</td>
                            <td>{(() => {
                                const empSh = empShifts.find(x => x.employee_id === a.employee_id);
                                const sh = empSh ? shifts.find(s => s.id === empSh.shift_id) : null;
                                const flexStatus = sh?.is_flexible && (a.status === "late" || a.status === "very_late") ? "present" : a.status;
                                const badgeColor = flexStatus === "present" ? "green" : flexStatus === "late" || flexStatus === "very_late" ? "yellow" : flexStatus === "incomplete" ? "red" : flexStatus === "on_leave" ? "blue" : "gray";
                                const label = flexStatus === "on_leave" ? "🏖️ On Leave" : sh?.is_flexible && a.hours_worked ? `🕐 ${a.hours_worked}h` : flexStatus;
                                return <span className={`badge ${badgeColor}`}>{label}</span>;
                              })()}</td>
                            <td style={{ fontSize: 11, color: "var(--warn)" }}>{a.notes || "—"}</td>
                            <td>{(role === "admin" || role === "hr") ? (a.face_photo ? <img src={a.face_photo} alt="in" className="photo-thumb" onClick={() => setPhotoPreview(a.face_photo)} /> : "—") : null}</td>
                            <td>{(role === "admin" || role === "hr") ? (a.checkout_photo ? <img src={a.checkout_photo} alt="out" className="photo-thumb" onClick={() => setPhotoPreview(a.checkout_photo)} /> : "—") : null}</td>
                            {role === "admin" && (
                              <td>
                                <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                                  {/* Manual Sign-Out button — only for records with no checkout */}
                                  {a.check_in && !a.check_out && (
                                    <Btn size="sm" color="warning" onClick={async () => {
                                      const now = new Date();
                                      const checkInTime = new Date(a.check_in);
                                      const hours = Math.round(((now - checkInTime) / 3600000) * 100) / 100;
                                      const incomplete = hours < (shift?.min_hours || 8);
                                      if (window.confirm(T(
                                        `Manually sign out ${emp?.name}?\nWorked: ${hours.toFixed(1)}h\nSign-out time: ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`,
                                        `تسجيل خروج ${emp?.name} يدوياً؟\nساعات العمل: ${hours.toFixed(1)}\nوقت الخروج: ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                                      ))) {
                                        await db("attendance", "PATCH", {
                                          check_out: now.toISOString(),
                                          hours_worked: hours,
                                          status: incomplete ? "incomplete" : a.status,
                                          notes: `Manual sign-out by admin at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}${incomplete ? ` — ${hours.toFixed(1)}h worked (min ${shift?.min_hours || 8}h)` : ""}`,
                                        }, `?id=eq.${a.id}`);
                                        loadAll();
                                      }
                                    }} title={T("Manual Sign Out", "تسجيل خروج يدوي")}>
                                      🚪
                                    </Btn>
                                  )}
                                  <Btn size="sm" color="danger" onClick={async () => {
                                    if (window.confirm(T("Delete this record?", "حذف هذا السجل؟"))) {
                                      await db("attendance", "DELETE", null, `?id=eq.${a.id}`);
                                      loadAll();
                                    }
                                  }} title={T("Delete", "حذف")}>🗑️</Btn>
                                </div>
                              </td>
                            )}
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
  // PAYROLL
  // ============================================================
  const renderPayroll = () => {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const calcNet = d => (Number(d.base_salary)||0) + (Number(d.allowances)||0) + (Number(d.bonuses)||0) - (Number(d.deductions)||0) - (Number(d.tax)||0) - (Number(d.insurance)||0) - (Number(d.loan_deduction)||0);

    // For employee role — show only their own payslips
    const myPayroll = role === "employee"
      ? payroll.filter(p => p.employee_id === currentEmployee?.id)
      : payroll;

    const thisMonth = payrollMonth.month;
    const thisYear = payrollMonth.year;
    const thisMonthPayroll = myPayroll.filter(p => p.month === thisMonth && p.year === thisYear);
    const totalNet = thisMonthPayroll.reduce((s, p) => s + (Number(p.net_salary) || calcNet(p)), 0);
    const paidCount = thisMonthPayroll.filter(p => p.status === "paid").length;
    const pendingCount = thisMonthPayroll.filter(p => p.status === "pending").length;

    return (
      <div>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
            <div style={{ fontSize:18, fontWeight:700 }}>💰 {T("Payroll Management","إدارة الرواتب")}</div>
            <div style={{ display:"flex", gap:8 }}>
              <select value={thisMonth} onChange={e=>setPayrollMonth(p=>({...p,month:e.target.value}))}
                style={{padding:"8px 16px",background:"var(--bg2)",border:"2px solid var(--acc)",borderRadius:8,color:"var(--t1)",fontFamily:"inherit",fontSize:15,fontWeight:700,cursor:"pointer",outline:"none"}}>
                {months.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <select value={thisYear} onChange={e=>setPayrollMonth(p=>({...p,year:+e.target.value}))}
                style={{padding:"8px 16px",background:"var(--bg2)",border:"2px solid var(--acc)",borderRadius:8,color:"var(--t1)",fontFamily:"inherit",fontSize:15,fontWeight:700,cursor:"pointer",outline:"none"}}>
                {[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {(role === "admin" || role === "hr") && (
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <Btn color="primary" onClick={async () => {
                // Auto-generate payslips for all active employees this month
                const activeEmps = employees.filter(e => e.status === "active");
                let created = 0;
                for (const emp of activeEmps) {
                  const exists = payroll.find(p => p.employee_id === emp.id && p.month === thisMonth && p.year === thisYear);
                  if (!exists && emp.salary > 0) {
                    const activeLoan = loans.find(l => l.employee_id === emp.id && l.status === "active");
                    const net = (emp.salary||0) + (emp.allowances||0) + (emp.bonuses||0) - (emp.deductions||0) - (emp.tax||0) - (emp.insurance||0) - (activeLoan?.monthly_deduction||0);
                    await db("payroll","POST",{
                      employee_id: emp.id, month: thisMonth, year: thisYear,
                      base_salary: emp.salary||0, allowances: emp.allowances||0, bonuses: emp.bonuses||0,
                      deductions: emp.deductions||0, tax: emp.tax||0, insurance: emp.insurance||0,
                      loan_deduction: activeLoan?.monthly_deduction||0, net_salary: net, status: "pending",
                    }); created++;
                  }
                }
                await loadAll();
                if (created > 0) alert(T(`✅ Generated ${created} payslips for ${thisMonth} ${thisYear}`, `✅ تم إنشاء ${created} مسير رواتب لـ ${thisMonth} ${thisYear}`));
                else alert(T("All payslips already exist for this month.", "جميع مسيرات الرواتب موجودة بالفعل لهذا الشهر."));
              }}>⚡ {T("Auto-Generate This Month", "إنشاء تلقائي للشهر")}</Btn>
              {pendingCount > 0 && (
                <Btn color="success" onClick={async()=>{
                  if(!window.confirm(T(`✅ Pay ALL ${pendingCount} pending for ${thisMonth} ${thisYear}?\nTotal: ${totalNet.toLocaleString()} EGP`,`✅ دفع ${pendingCount} موظف لـ ${thisMonth} ${thisYear}?\nالإجمالي: ${totalNet.toLocaleString()} جنيه`)))return;
                  for(const p of thisMonthPayroll.filter(x=>x.status==="pending")){await db("payroll","PATCH",{status:"paid",paid_at:new Date().toISOString()},`?id=eq.${p.id}`);}
                  await loadAll();
                  alert(T(`✅ ${pendingCount} employees marked as paid!`,`✅ تم دفع ${pendingCount} موظف!`));
                }}>✅ {T("Pay All","دفع الكل")} ({pendingCount})</Btn>
              )}
              <Btn color="success" onClick={() => {
                // Get last day of current month as disbursement date
                const disbDate = new Date(thisYear, new Date().getMonth() + 1, 0);
                const dateStr = disbDate.toISOString().split("T")[0]; // YYYY-MM-DD

                const rows = [
                  ["Full Name", "Mobile No.", "Profession", "Location ID", "Custom ID", "Card Model", "Amount", "Date"]
                ];

                const missing = [];
                myPayroll.forEach(p => {
                  const emp = employees.find(e => e.id === p.employee_id);
                  if (!emp) return;
                  const net = Number(p.net_salary) || 0;
                  if (net <= 0) return; // skip employees with no salary
                  if (!emp.payment_id) missing.push(emp.name);
                  rows.push([
                    emp.dopay_full_name || emp.name || "",      // Full Name → Payee identifier
                    emp.payment_mobile || emp.phone || "",   // Mobile No.
                    emp.position || emp.role || "Employee",  // Profession
                    "",                                       // Location ID
                    emp.payment_id || "",                    // Custom ID (NID / payment company ID)
                    "",                                       // Card Model
                    net,                                      // Amount → Total Payroll
                    dateStr,                                  // Date → disbursement date
                  ]);
                });

                if (missing.length > 0) {
                  const cont = window.confirm(T(
                    `⚠️ These employees are missing Payment ID:\n${missing.join("\n")}\n\nExport anyway? (their Custom ID will be empty)`,
                    `⚠️ هؤلاء الموظفون ليس لديهم كود دفع:\n${missing.join("\n")}\n\nتصدير على أي حال؟ (سيكون Custom ID فارغاً)`
                  ));
                  if (!cont) return;
                }

                const csv = rows.map(r =>
                  r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
                ).join("\n");

                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Payee_file_${thisMonth}_${thisYear}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}>📥 {T("Export Payment File", "تصدير ملف الدفع")}</Btn>
              <Btn color="outline" onClick={() => openModal("createPayroll", { month: thisMonth, year: thisYear, employee_id: employees[0]?.id, base_salary: 0, allowances: 0, bonuses: 0, deductions: 0, tax: 0, insurance: 0, loan_deduction: 0 })}>➕ {T("Manual Payslip", "مسير يدوي")}</Btn>
            </div>
          )}
        </div>

        {/* Stats */}
        {role !== "employee" && (
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {[
              { icon: "💰", color: "green", value: totalNet.toLocaleString() + " EGP", label: T("Total Payroll This Month", "إجمالي الرواتب هذا الشهر") },
              { icon: "✅", color: "green", value: paidCount, label: T("Paid", "مدفوع") },
              { icon: "⏳", color: "yellow", value: pendingCount, label: T("Pending Payment", "في انتظار الدفع") },
              { icon: "👥", color: "blue", value: employees.filter(e => e.status === "active").length, label: T("Active Employees", "موظفون نشطون") },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Payroll Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                {role !== "employee" && <th>{T("Employee", "الموظف")}</th>}
                <th>{T("Period", "الفترة")}</th>
                <th>{T("Base", "أساسي")}</th>
                <th style={{ color: "var(--ok)" }}>+ {T("Allowances", "بدلات")}</th>
                <th style={{ color: "var(--ok)" }}>+ {T("Bonuses", "مكافآت")}</th>
                <th style={{ color: "var(--err)" }}>- {T("Deductions", "خصومات")}</th>
                <th style={{ color: "var(--err)" }}>- {T("Tax", "ضريبة")}</th>
                <th style={{ color: "var(--err)" }}>- {T("Insurance", "تأمين")}</th>
                {role !== "employee" && <th style={{ color: "var(--err)" }}>- {T("Loan", "قرض")}</th>}
                <th style={{ color: "var(--ok)", fontWeight: 700 }}>= {T("Net", "الصافي")}</th>
                <th>{T("Status", "الحالة")}</th>
                {(role === "admin" || role === "accountant") && <th>{T("Actions", "إجراءات")}</th>}
              </tr></thead>
              <tbody>
                {thisMonthPayroll.length === 0
                  ? <tr><td colSpan={12} style={{ textAlign: "center", color: "var(--t3)", padding: 40 }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                      <div>{T("No payslips for","لا توجد مسيرات لـ")} {thisMonth} {thisYear}</div>
                      {(role === "admin" || role === "hr") && <div style={{ fontSize: 13, marginTop: 8, color: "var(--t3)" }}>{T("Click 'Auto-Generate' to create payslips for all employees.", "اضغط 'إنشاء تلقائي' لإنشاء مسيرات لجميع الموظفين.")}</div>}
                    </td></tr>
                  : thisMonthPayroll.map((p, i) => {
                    const emp = employees.find(e => e.id === p.employee_id);
                    const net = Number(p.net_salary) || calcNet(p);
                    return (
                      <tr key={i} style={{ background: p.status === "paid" ? "rgba(16,185,129,0.03)" : "" }}>
                        {role !== "employee" && (
                          <td>
                            <div className="emp-row">
                              <div className="emp-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{emp?.avatar || "?"}</div>
                              <div>
                                <div style={{ color: "var(--t1)", fontWeight: 500 }}>{emp?.name || "—"}</div>
                                <div style={{ fontSize: 11, color: "var(--t3)" }}>{emp?.employee_code}</div>
                              </div>
                            </div>
                          </td>
                        )}
                        <td style={{ fontWeight: 600, color: "var(--t1)", whiteSpace: "nowrap" }}>{p.month} {p.year}</td>
                        <td>{Number(p.base_salary||0).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)" }}>+{Number(p.allowances||0).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)" }}>+{Number(p.bonuses||0).toLocaleString()}</td>
                        <td style={{ color: "var(--err)" }}>-{Number(p.deductions||0).toLocaleString()}</td>
                        <td style={{ color: "var(--err)" }}>-{Number(p.tax||0).toLocaleString()}</td>
                        <td style={{ color: "var(--err)" }}>-{Number(p.insurance||0).toLocaleString()}</td>
                        {role !== "employee" && <td style={{ color: "var(--err)" }}>-{Number(p.loan_deduction||0).toLocaleString()}</td>}
                        <td style={{ color: "var(--ok)", fontWeight: 700, fontSize: 15 }}>{net.toLocaleString()} EGP</td>
                        <td><span className={`badge ${p.status === "paid" ? "green" : "yellow"}`}>{p.status === "paid" ? "✅ " + T("Paid","مدفوع") : "⏳ " + T("Pending","معلق")}</span></td>
                        {(role === "admin" || role === "accountant") && (
                          <td>
                            <div style={{ display: "flex", gap: 6 }}>
                              {role === "admin" && <Btn size="sm" color="outline" onClick={() => openModal("editPayroll", { ...p })}>✏️</Btn>}
                              {p.status === "pending" && <Btn size="sm" color="success" onClick={async () => { await db("payroll","PATCH",{ status:"paid", paid_at: new Date().toISOString() },`?id=eq.${p.id}`); loadAll(); }}>✅ {T("Pay","دفع")}</Btn>}
                              {p.status === "paid" && role === "admin" && (
                                <Btn size="sm" color="outline" style={{color:"var(--warn)",borderColor:"var(--warn)"}}
                                  onClick={async()=>{
                                    const en=employees.find(e=>e.id===p.employee_id)?.name;
                                    if(window.confirm(T(`↩️ Undo payment for ${en}?`,`↩️ إلغاء دفع ${en}؟`))){
                                      await db("payroll","PATCH",{status:"pending",paid_at:null},`?id=eq.${p.id}`);
                                      loadAll();
                                    }
                                  }}>↩️ {T("Unpay","إلغاء")}</Btn>
                              )}
                              {role === "admin" && <Btn size="sm" color="danger" onClick={async () => { if(window.confirm(T("Delete this payslip?","حذف مسير الراتب؟"))){ await db("payroll","DELETE",null,`?id=eq.${p.id}`); loadAll(); } }}>🗑️</Btn>}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <Modal show={activeModal === "editPayroll"} onClose={closeModal} title={T("✏️ Edit Payslip","✏️ تعديل مسير الراتب")}>
          {activeModal === "editPayroll" && (() => {
            const emp = employees.find(e => e.id === modalData.employee_id);
            const net = calcNet(modalData);
            return (<>
              {emp && <div className="info-box" style={{marginBottom:14}}><strong>{emp.name}</strong> — <span style={{color:"var(--t3)",fontSize:12}}>{emp.employee_code}</span></div>}
              <div className="form-row">
                <div className="form-group"><label>{T("Month","الشهر")}</label>
                  <select value={modalData.month||""} onChange={e=>setModalData({...modalData,month:e.target.value})}>
                    {months.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>{T("Year","السنة")}</label>
                  <input type="number" value={modalData.year||thisYear} onChange={e=>setModalData({...modalData,year:+e.target.value})} />
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                {[["base_salary",T("Base Salary","الراتب الأساسي"),"ok"],["allowances",T("Allowances","البدلات"),"ok"],["bonuses",T("Bonuses","المكافآت"),"ok"],["deductions",T("Deductions","الخصومات"),"err"],["tax",T("Tax","الضريبة"),"err"],["insurance",T("Insurance","التأمين"),"err"],["loan_deduction",T("Loan Deduction","خصم قرض"),"err"]].map(([k,lbl,c])=>(
                  <div key={k}>
                    <label style={{fontSize:12,color:`var(--${c})`,display:"block",marginBottom:4}}>{lbl}</label>
                    <input type="number" value={modalData[k]??0} onChange={e=>setModalData({...modalData,[k]:+e.target.value})}
                      style={{width:"100%",padding:"8px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,color:"var(--t1)",fontFamily:"inherit",fontSize:13,outline:"none"}} />
                  </div>
                ))}
              </div>
              <div className="net-salary-box">
                <div className="amount">{net.toLocaleString()} EGP</div>
                <div className="label">{T("Net Salary","صافي الراتب")}</div>
              </div>
              <div className="form-actions">
                <Btn color="outline" onClick={closeModal}>{T("Cancel","إلغاء")}</Btn>
                <Btn color="primary" disabled={saving} onClick={async()=>{
                  setSaving(true);
                  await db("payroll","PATCH",{...modalData,net_salary:net},`?id=eq.${modalData.id}`);
                  if(emp&&modalData.base_salary){await db("employees","PATCH",{salary:modalData.base_salary,allowances:modalData.allowances||0,bonuses:modalData.bonuses||0,deductions:modalData.deductions||0,tax:modalData.tax||0,insurance:modalData.insurance||0,net_salary:net},`?id=eq.${emp.id}`);}
                  const [p2,e2]=await Promise.all([db("payroll","GET",null,"?select=*&order=year.desc,month.desc"),db("employees","GET",null,"?select=*&order=name")]);
                  if(p2)setPayroll(p2); if(e2)setEmployees(e2);
                  setSaving(false); closeModal();
                }}>{saving?<span className="spinner"/>:T("💾 Save","💾 حفظ")}</Btn>
              </div>
            </>);
          })()}
        </Modal>
        <Modal show={activeModal === "createPayroll"} onClose={closeModal} title={T("➕ Create Payslip","➕ إنشاء مسير راتب")}>
          {activeModal === "createPayroll" && (<>
            <div className="form-group"><label>{T("Employee","الموظف")}</label>
              <select value={modalData.employee_id||""} onChange={e=>{const emp=employees.find(x=>x.id===+e.target.value);setModalData({...modalData,employee_id:+e.target.value,base_salary:emp?.salary||0,allowances:emp?.allowances||0,bonuses:emp?.bonuses||0,deductions:emp?.deductions||0,tax:emp?.tax||0,insurance:emp?.insurance||0});}}>
                <option value="">{T("Select employee...","اختر الموظف...")}</option>
                {employees.filter(e=>e.status==="active").map(emp=><option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{T("Month","الشهر")}</label>
                <select value={modalData.month||thisMonth} onChange={e=>setModalData({...modalData,month:e.target.value})}>
                  {months.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{T("Year","السنة")}</label>
                <input type="number" value={modalData.year||thisYear} onChange={e=>setModalData({...modalData,year:+e.target.value})} />
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              {[["base_salary",T("Base Salary","الراتب الأساسي"),"ok"],["allowances",T("Allowances","البدلات"),"ok"],["bonuses",T("Bonuses","المكافآت"),"ok"],["deductions",T("Deductions","الخصومات"),"err"],["tax",T("Tax","الضريبة"),"err"],["insurance",T("Insurance","التأمين"),"err"],["loan_deduction",T("Loan Deduction","خصم قرض"),"err"]].map(([k,lbl,c])=>(
                <div key={k}>
                  <label style={{fontSize:12,color:`var(--${c})`,display:"block",marginBottom:4}}>{lbl}</label>
                  <input type="number" value={modalData[k]??0} onChange={e=>setModalData({...modalData,[k]:+e.target.value})}
                    style={{width:"100%",padding:"8px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:6,color:"var(--t1)",fontFamily:"inherit",fontSize:13,outline:"none"}} />
                </div>
              ))}
            </div>
            <div className="net-salary-box">
              <div className="amount">{calcNet(modalData).toLocaleString()} EGP</div>
              <div className="label">{T("Net Salary","صافي الراتب")}</div>
            </div>
            <div className="form-actions">
              <Btn color="outline" onClick={closeModal}>{T("Cancel","إلغاء")}</Btn>
              <Btn color="primary" disabled={saving||!modalData.employee_id} onClick={async()=>{
                setSaving(true);
                const net=calcNet(modalData);
                await db("payroll","POST",{...modalData,net_salary:net,status:"pending"});
                const emp=employees.find(e=>e.id===modalData.employee_id);
                if(emp&&modalData.base_salary){await db("employees","PATCH",{salary:modalData.base_salary,allowances:modalData.allowances||0,bonuses:modalData.bonuses||0,deductions:modalData.deductions||0,tax:modalData.tax||0,insurance:modalData.insurance||0,net_salary:net},`?id=eq.${emp.id}`);}
                const p2=await db("payroll","GET",null,"?select=*&order=year.desc,month.desc");
                if(p2)setPayroll(p2);
                setSaving(false); closeModal();
              }}>{saving?<span className="spinner"/>:T("💾 Save","💾 حفظ")}</Btn>
            </div>
          </>)}
        </Modal>
      </div>
    );
  };

  // ============================================================
  // LOANS
  // ============================================================
  const renderLoans = () => {
    const myId = currentEmployee?.id;
    const visibleLoans = role === "employee" ? loans.filter(l => l.employee_id === myId) : loans;
    return (
    <div>
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div className="card-title">💳 {T("Employee Loans", "قروض الموظفين")}</div>
        {(role === "admin" || role === "hr" || role === "accountant") && (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn color="outline" onClick={async () => {
              // Recalculate all active payroll records with current loan deductions
              const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
              const curMonth = months[new Date().getMonth()];
              const curYear = new Date().getFullYear();
              let updated = 0;
              for (const loan of loans.filter(l => l.status === "active")) {
                const emp = employees.find(e => e.id === loan.employee_id);
                if (!emp) continue;
                const loanDed = Number(loan.monthly_deduction) || 0;
                const existingPay = payroll.find(p => p.employee_id === loan.employee_id && p.month === curMonth && p.year === curYear);
                if (existingPay) {
                  const base = Number(existingPay.base_salary)||0;
                  const newNet = base + (Number(existingPay.allowances)||0) + (Number(existingPay.bonuses)||0) - (Number(existingPay.deductions)||0) - (Number(existingPay.tax)||0) - (Number(existingPay.insurance)||0) - loanDed;
                  await db("payroll", "PATCH", { loan_deduction: loanDed, net_salary: newNet }, `?id=eq.${existingPay.id}`);
                  updated++;
                } else {
                  const base = emp.salary||0;
                  const newNet = base + (emp.allowances||0) + (emp.bonuses||0) - (emp.deductions||0) - (emp.tax||0) - (emp.insurance||0) - loanDed;
                  await db("payroll", "POST", { employee_id: emp.id, month: curMonth, year: curYear, base_salary: base, allowances: emp.allowances||0, bonuses: emp.bonuses||0, deductions: emp.deductions||0, tax: emp.tax||0, insurance: emp.insurance||0, loan_deduction: loanDed, net_salary: newNet, status: "pending" });
                  updated++;
                }
              }
              await loadAll();
              alert(T(`✅ Recalculated ${updated} payroll records with loan deductions.`, `✅ تم إعادة حساب ${updated} مسير رواتب مع خصومات القروض.`));
            }}>🔄 {T("Sync Loans → Payroll", "مزامنة القروض مع الرواتب")}</Btn>
            {(role === "admin" || role === "hr") && (
              <Btn color="primary" onClick={() => openModal("addLoan", { employee_id: employees[0]?.id, amount: 0, monthly_deduction: 0, reason: "" })}>➕ {T("New Loan", "قرض جديد")}</Btn>
            )}
          </div>
        )}
      </div>

      {visibleLoans.length === 0
        ? <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--t3)" }}>{T("No loans recorded", "لا توجد قروض")}</div>
        : visibleLoans.map((loan, i) => {
          const emp = employees.find(e => e.id === loan.employee_id);
          const paid = loan.amount - loan.remaining;
          const pct = Math.min(100, Math.round((paid / loan.amount) * 100)) || 0;
          const months = Math.ceil(loan.remaining / loan.monthly_deduction) || 0;
          return (
            <div className="loan-card" key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  {role !== "employee" && <div style={{ fontWeight: 600, fontSize: 15 }}>{emp?.name || "Unknown"}</div>}
                  <div style={{ color: "var(--t3)", fontSize: 13, marginTop: 4 }}>{loan.reason}</div>
                  <div style={{ color: "var(--t3)", fontSize: 12, marginTop: 4 }}>📅 {T("Started", "بدأ")}: {loan.start_date}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "var(--warn)", fontSize: 20 }}>{Number(loan.remaining || 0).toLocaleString()} EGP {T("remaining", "متبقي")}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}>{T("of", "من")} {Number(loan.amount || 0).toLocaleString()} · {Number(loan.monthly_deduction || 0).toLocaleString()} EGP/{T("month", "شهر")}</div>
                  {months > 0 && <div style={{ fontSize: 12, color: "var(--t3)" }}>~{months} {T("months left", "أشهر متبقية")}</div>}
                </div>
              </div>
              <div className="loan-progress"><div className="loan-bar" style={{ width: `${pct}%` }} /></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t3)", marginBottom: 12 }}>
                <span>{pct}% {T("paid", "مدفوع")}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className={`badge ${loan.status === "active" ? "yellow" : loan.status === "settled" ? "green" : "red"}`}>{loan.status}</span>
                  {role === "admin" && (
                    <>
                      <Btn size="sm" color="outline" onClick={() => openModal("editLoan", { ...loan })}>✏️</Btn>
                      <Btn size="sm" color="danger" onClick={async () => { if (window.confirm(T("Delete this loan?", "حذف هذا القرض؟"))) { await db("loans", "DELETE", null, `?id=eq.${loan.id}`); loadAll(); } }}>🗑️</Btn>
                    </>
                  )}
                </div>
              </div>
              {loan.status === "active" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn size="sm" color="warning" onClick={async () => {
                    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                    const newRem = Math.max(0, loan.remaining - loan.monthly_deduction);
                    await db("loans", "PATCH", { remaining: newRem, status: newRem <= 0 ? "settled" : "active" }, `?id=eq.${loan.id}`);
                    // Update current month payroll with loan deduction
                    const curMonth = months[new Date().getMonth()];
                    const curYear = new Date().getFullYear();
                    const existingPay = payroll.find(p => p.employee_id === loan.employee_id && p.month === curMonth && p.year === curYear);
                    if (existingPay && Number(existingPay.loan_deduction || 0) === 0) {
                      const newNet = Number(existingPay.net_salary) - Number(loan.monthly_deduction);
                      await db("payroll", "PATCH", { loan_deduction: loan.monthly_deduction, net_salary: newNet }, `?id=eq.${existingPay.id}`);
                    }
                    loadAll();
                  }}>💸 {T("Deduct Monthly", "خصم شهري")} ({Number(loan.monthly_deduction).toLocaleString()} EGP)</Btn>
                  <Btn size="sm" color="success" onClick={async () => { await db("loans", "PATCH", { remaining: 0, status: "settled" }, `?id=eq.${loan.id}`); loadAll(); }}>✅ {T("Mark Settled", "تسوية كاملة")}</Btn>
                </div>
              )}
            </div>
          );
        })}

      <Modal show={activeModal === "addLoan"} onClose={closeModal} title={T("New Loan Request", "طلب قرض جديد")}>
        <div className="form-group"><label>{T("Employee", "الموظف")}</label>
          <select value={modalData.employee_id || ""} onChange={e => setModalData({ ...modalData, employee_id: +e.target.value })}>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group"><label>{T("Loan Amount (EGP)", "مبلغ القرض")}</label><input type="number" value={modalData.amount || ""} onChange={e => setModalData({ ...modalData, amount: +e.target.value, remaining: +e.target.value })} /></div>
          <div className="form-group"><label>{T("Monthly Deduction (EGP)", "الخصم الشهري")}</label><input type="number" value={modalData.monthly_deduction || ""} onChange={e => setModalData({ ...modalData, monthly_deduction: +e.target.value })} /></div>
        </div>
        {modalData.amount > 0 && modalData.monthly_deduction > 0 && (
          <div className="info-box">⏱️ {T("Estimated duration", "المدة التقديرية")}: ~{Math.ceil(modalData.amount / modalData.monthly_deduction)} {T("months", "أشهر")}</div>
        )}
        <div className="form-group"><label>{T("Reason", "السبب")}</label><textarea rows={3} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} /></div>
        <div className="form-group"><label>{T("Start Date", "تاريخ البدء")}</label><input type="date" value={modalData.start_date || ""} onChange={e => setModalData({ ...modalData, start_date: e.target.value })} /></div>
        <div className="form-actions">
          <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
          <Btn color="primary" disabled={saving || !modalData.amount || !modalData.monthly_deduction} onClick={async () => {
            setSaving(true);
            await db("loans", "POST", { ...modalData, status: "active" });
            await loadAll(); setSaving(false); closeModal();
          }}>{saving ? <span className="spinner" /> : T("Approve Loan", "الموافقة على القرض")}</Btn>
        </div>
      </Modal>

      {/* Edit Loan Modal - Admin only */}
      <Modal show={activeModal === "editLoan"} onClose={closeModal} title={T("✏️ Edit Loan", "✏️ تعديل القرض")}>
        <div className="info-box">
          {T("Edit loan details. Changes will affect future payroll calculations.", "تعديل بيانات القرض. التغييرات ستؤثر على حسابات الرواتب القادمة.")}
        </div>
        <div className="form-row">
          <div className="form-group"><label>{T("Loan Amount (EGP)", "مبلغ القرض")}</label><input type="number" value={modalData.amount || ""} onChange={e => setModalData({ ...modalData, amount: +e.target.value })} /></div>
          <div className="form-group"><label>{T("Remaining (EGP)", "المتبقي")}</label><input type="number" value={modalData.remaining || ""} onChange={e => setModalData({ ...modalData, remaining: +e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>{T("Monthly Deduction (EGP)", "الخصم الشهري")}</label><input type="number" value={modalData.monthly_deduction || ""} onChange={e => setModalData({ ...modalData, monthly_deduction: +e.target.value })} /></div>
          <div className="form-group"><label>{T("Status", "الحالة")}</label>
            <select value={modalData.status || "active"} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
              <option value="active">{T("Active", "نشط")}</option>
              <option value="settled">{T("Settled", "مسدد")}</option>
              <option value="rejected">{T("Rejected", "مرفوض")}</option>
            </select>
          </div>
        </div>
        {modalData.amount > 0 && modalData.monthly_deduction > 0 && (
          <div className="info-box">⏱️ ~{Math.ceil((modalData.remaining || modalData.amount) / modalData.monthly_deduction)} {T("months remaining", "أشهر متبقية")}</div>
        )}
        <div className="form-actions">
          <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
          <Btn color="primary" disabled={saving} onClick={async () => {
            setSaving(true);
            await db("loans", "PATCH", { amount: modalData.amount, remaining: modalData.remaining, monthly_deduction: modalData.monthly_deduction, status: modalData.status }, `?id=eq.${modalData.id}`);
            await loadAll(); setSaving(false); closeModal();
          }}>{saving ? <span className="spinner" /> : T("Save Changes", "حفظ التغييرات")}</Btn>
        </div>
      </Modal>
    </div>
  );
  };

  // ============================================================
  // SELF SERVICE
  // ============================================================
  const renderSelfService = () => {
    const myEmp = currentEmployee || employees.find(e => e.id === currentEmployee?.id) || employees[0];
    const myId = myEmp?.id;
    const myExcuses = excuses.filter(e => e.employee_id === myId);
    const myLeaves = leaveReqs.filter(l => l.employee_id === myId);
    const myLoans = loans.filter(l => l.employee_id === myId && l.status === "active");
    // Pending lists: admin/hr see ALL employees' requests, others see only their own
    const pendingEx = (role === "admin" || role === "hr") ? excuses.filter(e => e.status === "pending") : myExcuses.filter(e => e.status === "pending");
    const pendingLv = (role === "admin" || role === "hr") ? leaveReqs.filter(l => l.status === "pending") : myLeaves.filter(l => l.status === "pending");
    const pendingLn = (role === "admin" || role === "hr" || role === "accountant") ? loans.filter(l => l.status === "pending") : [];

    const isAdminHR = role === "admin" || role === "hr";
    const isAccountant = role === "accountant";
    const canManage = isAdminHR || isAccountant;
    const canRequest = true; // everyone can request for themselves

    return (
      <div>
        <div className="tab-bar">
          {[
            { id: "manage", label: T("👔 All Requests", "👔 جميع الطلبات") + (pendingEx.length + pendingLv.length + pendingLn.length > 0 ? ` (${pendingEx.length + pendingLv.length + pendingLn.length})` : ""), show: canManage },
            { id: "overview", label: T("🏠 My Overview", "🏠 نظرتي"), show: true },
            { id: "excuse", label: T("⏰ Request Excuse", "⏰ طلب إذن"), show: true },
            { id: "leave", label: T("🏖️ Request Leave", "🏖️ طلب إجازة"), show: true },
            { id: "loanreq", label: T("💰 Request Loan", "💰 طلب قرض"), show: true },
            { id: "myatt", label: T("📊 My Attendance", "📊 حضوري"), show: true },
            { id: "active", label: T("🟢 Who's Active", "🟢 من يعمل الآن"), show: canManage },
          ].filter(t => t.show).map(tab => (
            <button key={tab.id} className={`tab ${ssTab === tab.id ? "active" : ""}`} onClick={() => setSsTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {ssTab === "overview" && (
          <div>
            {/* Quick action cards */}
            <div className="ss-grid" style={{ marginBottom: 24 }}>
              {[
                { icon: "⏰", title: T("Request Excuse", "طلب إذن"), desc: T("Late arrival, early departure, personal errand", "تأخير، خروج مبكر، مأمورية"), tab: "excuse" },
                { icon: "🏖️", title: T("Request Leave", "طلب إجازة"), desc: T("Annual, sick, personal, unpaid leave", "إجازة سنوية، مرضية، شخصية، بدون راتب"), tab: "leave" },
                { icon: "💰", title: T("Request Loan", "طلب قرض"), desc: T("Request salary advance or loan", "طلب سلفة أو قرض من الراتب"), tab: "loanreq" },
                { icon: "📊", title: T("My Attendance", "حضوري"), desc: T("View your attendance history", "عرض سجل حضورك"), tab: "myatt" },
              ].map((card, i) => (
                <div key={i} className="ss-card" onClick={() => card.tab && setSsTab(card.tab)}>
                  <div className="ss-card-icon">{card.icon}</div>
                  <div className="ss-card-title">{card.title}</div>
                  <div className="ss-card-desc">{card.desc}</div>
                </div>
              ))}
            </div>

            {/* My recent requests — ALL types */}
            <div className="card-title" style={{ marginBottom: 16 }}>📋 {T("My Recent Requests", "طلباتي الأخيرة")}</div>
            {(() => {
              const allReqs = [
                ...myExcuses.map(e => ({ ...e, kind: "excuse", icon: "⏰", dateStr: e.date })),
                ...myLeaves.map(l => ({ ...l, kind: "leave", icon: "🏖️", dateStr: `${l.start_date} → ${l.end_date}` })),
                ...loans.filter(l => l.employee_id === myId).map(l => ({ ...l, kind: "loan", icon: "💰", dateStr: l.start_date, type: `${Number(l.amount).toLocaleString()} EGP` })),
              ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
              return allReqs.length === 0
                ? <div className="info-box">{T("No requests yet.", "لا توجد طلبات بعد.")}</div>
                : allReqs.slice(0, 6).map((r, i) => (
                  <div className="req-card" key={i}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.icon} {r.type}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{r.dateStr} · {r.reason}</div>
                    </div>
                    <span className={`badge ${r.status === "approved" || r.status === "active" ? "green" : r.status === "rejected" ? "red" : "yellow"}`}>{r.status}</span>
                  </div>
                ));
            })()}

            {/* Active loans */}
            {myLoans.length > 0 && (
              <>
                <div className="card-title" style={{ margin: "24px 0 16px" }}>💳 {T("My Active Loan", "قرضي النشط")}</div>
                {myLoans.map((loan, i) => (
                  <div className="info-box" key={i}>
                    <strong>{Number(loan.remaining).toLocaleString()} EGP</strong> {T("remaining", "متبقي")} {T("of", "من")} {Number(loan.amount).toLocaleString()} EGP
                    <div className="loan-progress" style={{ margin: "8px 0" }}><div className="loan-bar" style={{ width: `${Math.min(100, ((loan.amount - loan.remaining) / loan.amount) * 100)}%` }} /></div>
                    {Number(loan.monthly_deduction).toLocaleString()} EGP/{T("month", "شهر")} · ~{Math.ceil(loan.remaining / loan.monthly_deduction)} {T("months left", "أشهر")}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {ssTab === "myatt" && (
          <div>
            <div className="card-title" style={{ marginBottom: 16 }}>📊 {T("My Attendance History", "سجل حضوري")}</div>
            {(() => {
              const myAtt = attendance.filter(a => a.employee_id === myId).slice(0, 30);
              return myAtt.length === 0
                ? <div className="info-box">{T("No attendance records yet.", "لا توجد سجلات حضور بعد.")}</div>
                : (
                  <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table>
                        <thead><tr>
                          <th>{T("Date", "التاريخ")}</th>
                          <th>{T("Check In", "دخول")}</th>
                          <th>{T("Check Out", "خروج")}</th>
                          <th>{T("Hours", "ساعات")}</th>
                          <th>{T("Location", "الموقع")}</th>
                          <th>{T("Status", "الحالة")}</th>
                        </tr></thead>
                        <tbody>
                          {myAtt.map((a, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 500, color: "var(--t1)" }}>{a.date}</td>
                              <td style={{ color: "var(--ok)" }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                              <td style={{ color: "var(--err)" }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: "var(--warn)" }}>⏳ {T("Working", "جاري العمل")}</span>}</td>
                              <td>{a.hours_worked ? `${a.hours_worked}h` : "—"}</td>
                              <td>{a.location_label ? <span className="badge blue" title={a.location_label} style={{ fontSize: 11, whiteSpace: "normal", wordBreak: "break-word", maxWidth: 200, display: "inline-block", lineHeight: 1.4 }}>{a.location_label}</span> : "—"}</td>
                              <td>{(() => {
                                const empSh = empShifts.find(x => x.employee_id === a.employee_id);
                                const sh = empSh ? shifts.find(s => s.id === empSh.shift_id) : null;
                                const flexStatus = sh?.is_flexible && (a.status === "late" || a.status === "very_late") ? "present" : a.status;
                                const badgeColor = flexStatus === "present" ? "green" : flexStatus === "late" || flexStatus === "very_late" ? "yellow" : flexStatus === "incomplete" ? "red" : flexStatus === "on_leave" ? "blue" : "gray";
                                const label = flexStatus === "on_leave" ? "🏖️ On Leave" : sh?.is_flexible && a.hours_worked ? `🕐 ${a.hours_worked}h` : flexStatus;
                                return <span className={`badge ${badgeColor}`}>{label}</span>;
                              })()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
            })()}
          </div>
        )}

        {ssTab === "excuse" && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>⏰ {T("Request an Excuse", "طلب إذن")}</div>
            <div className="form-group"><label>{T("Date", "التاريخ")}</label><input type="date" value={modalData.date || ""} onChange={e => setModalData({ ...modalData, date: e.target.value })} /></div>
            <div className="form-group"><label>{T("Type", "النوع")}</label>
              <select value={modalData.type || ""} onChange={e => setModalData({ ...modalData, type: e.target.value })}>
                <option value="">{T("Select type...", "اختر النوع...")}</option>
                <option value="Late Arrival">{T("Late Arrival", "تأخير")}</option>
                <option value="Early Departure">{T("Early Departure", "خروج مبكر")}</option>
                <option value="Personal Errand">{T("Personal Errand", "مأمورية شخصية")}</option>
                <option value="Medical">{T("Medical", "طبي")}</option>
                <option value="Other">{T("Other", "أخرى")}</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{T("From Time", "من الساعة")}</label><input type="time" value={modalData.from_time || ""} onChange={e => setModalData({ ...modalData, from_time: e.target.value })} /></div>
              <div className="form-group"><label>{T("To Time", "إلى الساعة")}</label><input type="time" value={modalData.to_time || ""} onChange={e => setModalData({ ...modalData, to_time: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>{T("Reason", "السبب")}</label><textarea rows={3} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} placeholder={T("Explain your reason...", "اشرح سببك...")} /></div>
            <div className="form-actions">
              <Btn color="primary" disabled={saving || !modalData.date || !modalData.type || !modalData.reason} onClick={async () => {
                setSaving(true);
                await db("excuse_requests", "POST", { ...modalData, employee_id: myId, status: "pending" }); sendNotification("excuse_request", `⏰ ${myEmp?.name} submitted an excuse request: ${modalData.type} on ${modalData.date}`);
                await loadAll(); setSaving(false); setModalData({}); setSsTab("overview");
              }}>{saving ? <span className="spinner" /> : T("📨 Submit Request", "📨 إرسال الطلب")}</Btn>
            </div>
          </div>
        )}

        {ssTab === "leave" && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>🏖️ {T("Request Leave", "طلب إجازة")}</div>
            <div className="form-group"><label>{T("Leave Type", "نوع الإجازة")}</label>
              <select value={modalData.type || ""} onChange={e => setModalData({ ...modalData, type: e.target.value })}>
                <option value="">{T("Select type...", "اختر النوع...")}</option>
                <option value="Annual Leave">{T("Annual Leave", "إجازة سنوية")}</option>
                <option value="Sick Leave">{T("Sick Leave", "إجازة مرضية")}</option>
                <option value="Personal Leave">{T("Personal Leave", "إجازة شخصية")}</option>
                <option value="Emergency Leave">{T("Emergency Leave", "إجازة طارئة")}</option>
                <option value="Unpaid Leave">{T("Unpaid Leave", "إجازة بدون راتب")}</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>{T("Start Date", "من تاريخ")}</label><input type="date" value={modalData.start_date || ""} onChange={e => setModalData({ ...modalData, start_date: e.target.value })} /></div>
              <div className="form-group"><label>{T("End Date", "إلى تاريخ")}</label><input type="date" value={modalData.end_date || ""} onChange={e => setModalData({ ...modalData, end_date: e.target.value })} /></div>
            </div>
            {modalData.start_date && modalData.end_date && (
              <div className="info-box">📅 {T("Duration", "المدة")}: {Math.max(1, Math.ceil((new Date(modalData.end_date) - new Date(modalData.start_date)) / 86400000) + 1)} {T("day(s)", "يوم/أيام")}</div>
            )}
            <div className="form-group"><label>{T("Reason", "السبب")}</label><textarea rows={3} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} placeholder={T("Explain your reason...", "اشرح سببك...")} /></div>
            <div className="form-actions">
              <Btn color="primary" disabled={saving || !modalData.type || !modalData.start_date || !modalData.end_date} onClick={async () => {
                setSaving(true);
                const days = Math.max(1, Math.ceil((new Date(modalData.end_date) - new Date(modalData.start_date)) / 86400000) + 1);
                await db("leave_requests", "POST", { ...modalData, employee_id: myId, days, status: "pending" }); sendNotification("leave_request", `🏖️ ${myEmp?.name} requested ${days} day(s) leave: ${modalData.type}`);
                await loadAll(); setSaving(false); setModalData({}); setSsTab("overview");
              }}>{saving ? <span className="spinner" /> : T("📨 Submit Request", "📨 إرسال الطلب")}</Btn>
            </div>
          </div>
        )}

        {ssTab === "loanreq" && (
          <div className="card">
            <div className="card-title" style={{ marginBottom: 20 }}>💰 {T("Request a Loan", "طلب قرض")}</div>
            {myLoans.length > 0 && <div className="info-box" style={{ borderColor: "var(--warn)", background: "var(--warnb)" }}>⚠️ {T("You already have an active loan. You must settle it before requesting a new one.", "لديك قرض نشط بالفعل. يجب تسويته قبل طلب قرض جديد.")}</div>}
            <div className="form-row">
              <div className="form-group"><label>{T("Loan Amount (EGP)", "مبلغ القرض")}</label><input type="number" disabled={myLoans.length > 0} value={modalData.amount || ""} onChange={e => setModalData({ ...modalData, amount: +e.target.value, remaining: +e.target.value })} /></div>
              <div className="form-group"><label>{T("Monthly Deduction (EGP)", "الخصم الشهري")}</label><input type="number" disabled={myLoans.length > 0} value={modalData.monthly_deduction || ""} onChange={e => setModalData({ ...modalData, monthly_deduction: +e.target.value })} /></div>
            </div>
            {modalData.amount > 0 && modalData.monthly_deduction > 0 && (
              <div className="info-box">⏱️ ~{Math.ceil(modalData.amount / modalData.monthly_deduction)} {T("months to repay", "أشهر للسداد")}</div>
            )}
            <div className="form-group"><label>{T("Reason for loan", "سبب القرض")}</label><textarea rows={3} disabled={myLoans.length > 0} value={modalData.reason || ""} onChange={e => setModalData({ ...modalData, reason: e.target.value })} placeholder={T("Explain why you need this loan...", "اشرح سبب حاجتك للقرض...")} /></div>
            <div className="form-group"><label>{T("Preferred Start Date", "تاريخ البدء المفضل")}</label><input type="date" disabled={myLoans.length > 0} value={modalData.start_date || ""} onChange={e => setModalData({ ...modalData, start_date: e.target.value })} /></div>
            <div className="form-actions">
              <Btn color="primary" disabled={saving || myLoans.length > 0 || !modalData.amount || !modalData.monthly_deduction || !modalData.reason} onClick={async () => {
                setSaving(true);
                await db("loans", "POST", { ...modalData, employee_id: myId, status: "pending" }); sendNotification("loan_request", `💰 ${myEmp?.name} requested a loan of ${modalData.amount} EGP`);
                await loadAll(); setSaving(false); setModalData({}); setSsTab("overview");
              }}>{saving ? <span className="spinner" /> : T("📨 Submit Loan Request", "📨 إرسال طلب القرض")}</Btn>
            </div>
          </div>
        )}

        {ssTab === "manage" && (
          <div>
            {/* Filter bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { key: "pending",  label: "⏳ Pending",  color: "var(--warn)" },
                { key: "approved", label: "✅ Approved", color: "var(--ok)" },
                { key: "rejected", label: "❌ Rejected", color: "var(--err)" },
                { key: "all",      label: "📋 All",       color: "var(--acc)" },
              ].map(f => {
                const allEx = (role === "admin" || role === "hr") ? excuses : myExcuses;
                const allLv = (role === "admin" || role === "hr") ? leaveReqs : myLeaves;
                const allLn = (role === "admin" || role === "hr" || role === "accountant") ? loans : [];
                const all = [...allEx, ...allLv, ...allLn];
                const count = f.key === "all" ? all.length : f.key === "approved" ? all.filter(r => r.status === "approved" || r.status === "active").length : all.filter(r => r.status === f.key).length;
                const active = reqFilter === f.key;
                return (
                  <button key={f.key} onClick={() => setReqFilter(f.key)}
                    style={{ padding: "7px 16px", borderRadius: 20, border: `2px solid ${active ? f.color : "var(--border)"}`, background: active ? f.color : "var(--bg2)", color: active ? "white" : "var(--t2)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
                    {f.label} ({count})
                  </button>
                );
              })}
            </div>
            {/* Requests list */}
            {(() => {
              const allEx = (role === "admin" || role === "hr") ? excuses : myExcuses;
              const allLv = (role === "admin" || role === "hr") ? leaveReqs : myLeaves;
              const allLn = (role === "admin" || role === "hr" || role === "accountant") ? loans : [];
              const allReqs = [
                ...allEx.map(r => ({ ...r, _type: "excuse", _icon: "⏰", _label: T("Excuse","إذن") })),
                ...allLv.map(r => ({ ...r, _type: "leave",  _icon: "🏖️", _label: T("Leave","إجازة") })),
                ...allLn.map(r => ({ ...r, _type: "loan",   _icon: "💰", _label: T("Loan","قرض") })),
              ].sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));
              const filtered = reqFilter === "all" ? allReqs : reqFilter === "approved" ? allReqs.filter(r => r.status === "approved" || r.status === "active") : allReqs.filter(r => r.status === reqFilter);
              if (filtered.length === 0) return (
                <div className="info-box" style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{T("No requests found","لا توجد طلبات")}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}>{T("Requests appear here when employees submit them","ستظهر الطلبات هنا عندما يقدمها الموظفون")}</div>
                </div>
              );
              return filtered.map((r, i) => {
                const emp = employees.find(e => e.id === r.employee_id);
                const isPending = r.status === "pending";
                const canAct = (role === "admin" || role === "hr") && isPending;
                const statusColor = r.status === "pending" ? "var(--warn)" : (r.status === "approved" || r.status === "active") ? "var(--ok)" : "var(--err)";
                const statusBadge = (r.status === "approved" || r.status === "active") ? "green" : r.status === "pending" ? "yellow" : "red";
                const submittedAt = r.created_at ? new Date(r.created_at).toLocaleString("en-US", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : r.date || "—";
                return (
                  <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderLeft: `4px solid ${statusColor}`, borderRadius: 12, padding: "16px 18px", marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{r._icon}</div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)" }}>{r._label}</span>
                        {emp && <span style={{ fontSize: 13, color: "var(--acc2)", fontWeight: 600 }}>— {emp.name} <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 400 }}>({emp.employee_code})</span></span>}
                        <span className={`badge ${statusBadge}`} style={{ marginLeft: "auto", fontSize: 11 }}>
                          {r.status === "active" ? "✅ Active" : r.status === "approved" ? "✅ Approved" : r.status === "pending" ? "⏳ Pending" : "❌ Rejected"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--t3)", marginBottom: 4 }}>
                        {r._type === "excuse" && <><span>📅 {r.date}</span><span>🕐 {r.from_time} → {r.to_time}</span><span>📝 {r.type}</span></>}
                        {r._type === "leave"  && <><span>📅 {r.start_date} → {r.end_date}</span><span>🗓️ {r.days} {T("days","أيام")}</span><span>📝 {r.type}</span></>}
                        {r._type === "loan"   && <><span>💵 {Number(r.amount||0).toLocaleString()} EGP</span><span>💸 {Number(r.monthly_deduction||0).toLocaleString()} EGP/mo</span><span>📅 {r.start_date}</span></>}
                        {r.reason && <span style={{ color: "var(--t2)", fontStyle: "italic" }}>"{r.reason}"</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t3)" }}>🕐 {T("Submitted","قُدِّم")} {submittedAt}</div>
                    </div>
                    {canAct && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <Btn size="sm" color="success" onClick={async () => {
                          if (r._type === "excuse") {
                            await db("excuse_requests","PATCH",{status:"approved"},`?id=eq.${r.id}`);
                            sendNotification("loan_approved", `✅ Excuse approved for ${emp?.name} on ${r.date}`);
                          }
                          else if (r._type === "leave") {
                            // 1. Approve the leave request
                            await db("leave_requests","PATCH",{status:"approved", approved_by: currentEmployee?.name || "Admin"},`?id=eq.${r.id}`);

                            // 2. Create attendance records for each leave day (so days aren't shown as absent)
                            const start = new Date(r.start_date);
                            const end = new Date(r.end_date);
                            const leaveLabel = `🏖️ ${r.type || "Leave"} — Approved by Admin`;
                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                              const dateStr = d.toISOString().split("T")[0];
                              // Check if attendance record already exists for this day
                              const existing = attendance.find(a => a.employee_id === r.employee_id && a.date === dateStr);
                              if (!existing) {
                                await db("attendance","POST",{
                                  employee_id: r.employee_id,
                                  date: dateStr,
                                  status: "on_leave",
                                  location_label: leaveLabel,
                                  source: "leave_approved",
                                  notes: `${r.type} leave approved. ${r.reason || ""}`.trim(),
                                  hours_worked: 0,
                                });
                              }
                            }

                            // 3. Protect salary — check if leave type is paid
                            const isPaid = !r.type?.toLowerCase().includes("unpaid");
                            if (isPaid) {
                              const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
                              const empData = employees.find(e => e.id === r.employee_id);

                              // Find all months affected by this leave
                              const affectedMonths = new Set();
                              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                affectedMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
                              }

                              for (const monthKey of affectedMonths) {
                                const [yr, mo] = monthKey.split("-").map(Number);
                                const monthName = months[mo];
                                const existingPay = payroll.find(p => p.employee_id === r.employee_id && p.month === monthName && p.year === yr);

                                if (existingPay) {
                                  // Add leave_days_approved note — salary stays full (no deduction)
                                  await db("payroll","PATCH",{
                                    notes: `Paid leave: ${r.days} days (${r.start_date}→${r.end_date}) — salary protected`,
                                  },`?id=eq.${existingPay.id}`);
                                } else if (empData) {
                                  // Create payroll with full salary + leave note
                                  const net = (empData.salary||0) + (empData.allowances||0) + (empData.bonuses||0) - (empData.deductions||0) - (empData.tax||0) - (empData.insurance||0);
                                  await db("payroll","POST",{
                                    employee_id: empData.id,
                                    month: monthName,
                                    year: yr,
                                    base_salary: empData.salary||0,
                                    allowances: empData.allowances||0,
                                    bonuses: empData.bonuses||0,
                                    deductions: empData.deductions||0,
                                    tax: empData.tax||0,
                                    insurance: empData.insurance||0,
                                    net_salary: net,
                                    status: "pending",
                                    notes: `Paid leave: ${r.days} days (${r.start_date}→${r.end_date}) — salary protected`,
                                  });
                                }
                              }
                            }

                            sendNotification("loan_approved", `✅ ${r.days}-day ${r.type} leave approved for ${emp?.name} (${r.start_date} → ${r.end_date})`);
                          }
                          else if (r._type === "loan") {
                            const months=["January","February","March","April","May","June","July","August","September","October","November","December"];
                            await db("loans","PATCH",{status:"active",approved_by:currentEmployee?.name||"Admin"},`?id=eq.${r.id}`);
                            const curMonth=months[new Date().getMonth()]; const curYear=new Date().getFullYear();
                            const empData=employees.find(e=>e.id===r.employee_id);
                            const existingPay=payroll.find(p=>p.employee_id===r.employee_id&&p.month===curMonth&&p.year===curYear);
                            const loanDed=Number(r.monthly_deduction)||0;
                            if(existingPay){await db("payroll","PATCH",{loan_deduction:loanDed,net_salary:Number(existingPay.net_salary)-loanDed},`?id=eq.${existingPay.id}`);}
                            else if(empData){const net=(empData.salary||0)+(empData.allowances||0)+(empData.bonuses||0)-(empData.deductions||0)-(empData.tax||0)-(empData.insurance||0)-loanDed;await db("payroll","POST",{employee_id:empData.id,month:curMonth,year:curYear,base_salary:empData.salary||0,allowances:empData.allowances||0,bonuses:empData.bonuses||0,deductions:empData.deductions||0,tax:empData.tax||0,insurance:empData.insurance||0,loan_deduction:loanDed,net_salary:net,status:"pending"});}
                            sendNotification("loan_approved",`✅ Loan approved for ${emp?.name}`);
                          }
                          loadAll();
                        }}>✅ {T("Approve","موافقة")}</Btn>
                        <Btn size="sm" color="danger" onClick={async () => {
                          if(r._type==="excuse") await db("excuse_requests","PATCH",{status:"rejected"},`?id=eq.${r.id}`);
                          else if(r._type==="leave") await db("leave_requests","PATCH",{status:"rejected"},`?id=eq.${r.id}`);
                          else if(r._type==="loan") await db("loans","PATCH",{status:"rejected"},`?id=eq.${r.id}`);
                          loadAll();
                        }}>❌ {T("Reject","رفض")}</Btn>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
        {/* ── WHO'S ACTIVE NOW ── */}
        {ssTab === "active" && (
          <div>
            {(() => {
              const now2 = new Date();
              const todayStr = now2.toISOString().split("T")[0];
              const todayAtt = attendance.filter(a => a.date === todayStr);

              // Determine shift status for each employee
              const empStatus = employees.filter(e => e.status === "active").map(emp => {
                const att = todayAtt.find(a => a.employee_id === emp.id && !a.check_out);
                const attAll = todayAtt.filter(a => a.employee_id === emp.id);
                const lastAtt = attAll.sort((a,b) => new Date(b.check_in) - new Date(a.check_in))[0];
                const es = empShifts.find(x => x.employee_id === emp.id);
                const shift = es ? shifts.find(s => s.id === es.shift_id) : null;

                // Is this employee's shift currently running?
                let shiftActive = false;
                let shiftLabel = shift ? `${shift.name} (${shift.start_time}–${shift.end_time})` : T("No shift assigned","لا توجد مناوبة");
                if (shift) {
                  const [sh, sm] = shift.start_time.split(":").map(Number);
                  const [eh, em] = shift.end_time.split(":").map(Number);
                  const nowMin = now2.getHours() * 60 + now2.getMinutes();
                  const startMin = sh * 60 + sm;
                  let endMin = eh * 60 + em;
                  if (shift.is_night_shift && endMin < startMin) endMin += 1440;
                  shiftActive = nowMin >= startMin && nowMin <= endMin;
                }

                const shiftOffDays = (() => { try { return JSON.parse(shift?.off_days || "[]"); } catch { return []; } })();
                const todayDayNum = now2.getDay();
                const isOffDay = shiftOffDays.includes(todayDayNum);

                return { emp, att, lastAtt, shift, shiftActive: shiftActive && !isOffDay, shiftLabel, isOffDay,
                  isSignedIn: !!att,
                  signInTime: att ? new Date(att.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
                  signOutTime: lastAtt?.check_out ? new Date(lastAtt.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
                  hoursWorked: att ? ((now2 - new Date(att.check_in)) / 3600000).toFixed(1) : null,
                };
              });

              const signedIn = empStatus.filter(e => e.isSignedIn);
              const inShiftNotSignedIn = empStatus.filter(e => !e.isSignedIn && e.shiftActive && !e.isOffDay);
              const onOffDay = empStatus.filter(e => !e.isSignedIn && e.isOffDay);
              const outOfShift = empStatus.filter(e => !e.isSignedIn && !e.shiftActive && !e.isOffDay);

              return (
                <>
                  {/* Summary */}
                  <div className="stats-grid" style={{ marginBottom: 20 }}>
                    {[
                      { label: T("Currently Working","يعملون الآن"), value: signedIn.length, color: "green", icon: "🟢" },
                      { label: T("Absent in Shift","غائبون في وقت العمل"), value: inShiftNotSignedIn.length, color: "red", icon: "🔴" },
                      { label: T("Day Off Today","يوم راحة اليوم"), value: onOffDay.length, color: "yellow", icon: "🏖️" },
                      { label: T("Total Active Staff","إجمالي الموظفين"), value: empStatus.length, color: "blue", icon: "👥" },
                    ].map((s,i) => (
                      <div key={i} className="stat-card">
                        <div className={`stat-icon ${s.color}`}>{s.icon}</div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Currently Signed In */}
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-title" style={{ marginBottom: 16, color: "var(--ok)" }}>🟢 {T("Currently Working","يعملون الآن")} ({signedIn.length})</div>
                    {signedIn.length === 0
                      ? <div className="info-box">{T("No employees currently signed in","لا يوجد موظفون حاضرون الآن")}</div>
                      : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {signedIn.map((e,i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--okb)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10 }}>
                              <div className="emp-avatar">{e.emp.avatar || e.emp.name?.substring(0,2)}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--t1)", fontSize: 14 }}>{e.emp.name}</div>
                                <div style={{ fontSize: 12, color: "var(--t3)" }}>{e.shiftLabel}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, color: "var(--ok)", fontWeight: 600 }}>✅ {T("In since","دخل في")} {e.signInTime}</div>
                                <div style={{ fontSize: 12, color: "var(--t3)" }}>⏱️ {e.hoursWorked}h {T("worked","عمل")}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>

                  {/* In shift but not signed in */}
                  {inShiftNotSignedIn.length > 0 && (
                    <div className="card" style={{ marginBottom: 16 }}>
                      <div className="card-title" style={{ marginBottom: 16, color: "var(--err)" }}>🔴 {T("Should Be Working — Not Signed In","يجب أن يكونوا حاضرين ولم يسجلوا")} ({inShiftNotSignedIn.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {inShiftNotSignedIn.map((e,i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--errb)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10 }}>
                            <div className="emp-avatar">{e.emp.avatar || e.emp.name?.substring(0,2)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: "var(--t1)", fontSize: 14 }}>{e.emp.name}</div>
                              <div style={{ fontSize: 12, color: "var(--t3)" }}>{e.shiftLabel}</div>
                            </div>
                            <span className="badge red">⚠️ {T("Absent","غائب")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day Off employees */}
                  {onOffDay.length > 0 && (
                    <div className="card" style={{ marginBottom: 16 }}>
                      <div className="card-title" style={{ marginBottom: 16, color: "var(--warn)" }}>🏖️ {T("Day Off Today","يوم راحة اليوم")} ({onOffDay.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {onOffDay.map((e,i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--warnb)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10 }}>
                            <div className="emp-avatar">{e.emp.avatar || e.emp.name?.substring(0,2)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: "var(--t1)", fontSize: 14 }}>{e.emp.name}</div>
                              <div style={{ fontSize: 12, color: "var(--t3)" }}>{e.shiftLabel}</div>
                            </div>
                            <span className="badge yellow">🏖️ {T("Off Today","يوم راحة")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Off shift */}
                  <div className="card">
                    <div className="card-title" style={{ marginBottom: 16 }}>⚪ {T("Off Shift / No Shift","خارج الوردية")} ({outOfShift.length})</div>
                    {outOfShift.length === 0
                      ? <div className="info-box">{T("All employees are in their shifts","جميع الموظفين في وردياتهم")}</div>
                      : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {outOfShift.map((e,i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10 }}>
                              <div className="emp-avatar" style={{ opacity: 0.6 }}>{e.emp.avatar || e.emp.name?.substring(0,2)}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, color: "var(--t2)", fontSize: 14 }}>{e.emp.name}</div>
                                <div style={{ fontSize: 12, color: "var(--t3)" }}>{e.shiftLabel}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                {e.signOutTime
                                  ? <div style={{ fontSize: 12, color: "var(--t3)" }}>🚪 {T("Left at","خرج في")} {e.signOutTime}</div>
                                  : <span className="badge gray">{T("Off Today","لم يسجل اليوم")}</span>
                                }
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // SETTINGS
  // ============================================================
  const renderSettings = () => (
    <div className="fade-in">
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 20 }}>⚙️ {T("System Settings", "إعدادات النظام")}</div>
        <div className="form-group">
          <label>{T("Language", "اللغة")}</label>
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="en">🇬🇧 English</option>
            <option value="ar">🇪🇬 العربية</option>
          </select>
        </div>
        <div className="form-group">
          <label>{T("Database Status", "حالة قاعدة البيانات")}</label>
          <div><span className={`badge ${SUPABASE_ANON_KEY ? "green" : "red"}`}>{SUPABASE_ANON_KEY ? "✅ " + T("Connected to Supabase", "متصل بـ Supabase") : "❌ " + T("No API Key", "لا يوجد مفتاح")}</span></div>
        </div>
        <div className="form-group">
          <label>{T("System Version", "إصدار النظام")}</label>
          <span className="badge blue">myMayz HR v4.0</span>
        </div>
        <div className="form-group">
          <label>{T("Logged in as", "مسجل الدخول كـ")}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="emp-avatar">{(currentEmployee?.avatar || "AK")}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{currentEmployee?.name || "Ahmed Kardous"}</div>
              <div style={{ fontSize: 12, color: "var(--t3)", textTransform: "capitalize" }}>{role}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <Btn color="outline" onClick={loadAll}>🔄 {T("Refresh All Data", "تحديث كل البيانات")}</Btn>
          <Btn color="warning" onClick={async () => {
            try {
              // Try to read work_mode — if it fails, column is missing
              const test = await fetch(`${SUPABASE_URL}/rest/v1/employees?select=work_mode&limit=1`, {
                headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
              });
              const data = await test.json();
              if (Array.isArray(data) && !data.error) {
                alert(T("✅ work_mode column exists! Go to Employees → Edit any employee to set their work mode.", "✅ عمود work_mode موجود! اذهب إلى الموظفون → تعديل لضبط نمط العمل."));
              } else {
                alert(T("❌ work_mode column MISSING.\n\nPlease open Supabase → SQL Editor → New Query → paste and run:\n\nALTER TABLE employees ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'office';", "❌ عمود work_mode غير موجود.\n\nيرجى فتح Supabase → SQL Editor → New Query → نسخ وتشغيل:\n\nALTER TABLE employees ADD COLUMN IF NOT EXISTS work_mode TEXT DEFAULT 'office';"));
              }
            } catch(e) {
              alert(T("❌ Database check failed. Please run the SQL manually in Supabase.", "❌ فشل فحص قاعدة البيانات. يرجى تشغيل SQL يدوياً في Supabase."));
            }
            await loadAll();
          }}>🔧 {T("Check DB Columns", "فحص أعمدة قاعدة البيانات")}</Btn>
          <Btn color="danger" onClick={handleLogout}>🚪 {T("Logout", "تسجيل الخروج")}</Btn>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="card-title">🔔 {T("Notification Settings", "إعدادات الإشعارات")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--t3)" }}>{notifSettings.enabled ? T("On","مفعل") : T("Off","معطل")}</span>
            <div style={{ width: 44, height: 24, background: notifSettings.enabled ? "var(--ok)" : "var(--border)", borderRadius: 12, position: "relative", cursor: "pointer", transition: "all 0.2s" }}
              onClick={() => saveNotifSettings({ ...notifSettings, enabled: !notifSettings.enabled })}>
              <div style={{ width: 18, height: 18, background: "white", borderRadius: "50%", position: "absolute", top: 3, left: notifSettings.enabled ? 23 : 3, transition: "all 0.2s" }} />
            </div>
          </div>
        </div>

        {/* Email API Key (Brevo) */}
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>
            📧 {T("Brevo API Key (for Email)", "مفتاح Brevo (للبريد الإلكتروني)")}
            <span style={{ fontSize: 11, color: "var(--t3)", marginLeft: 6 }}>
              — {T("Free 300 emails/day", "مجاني 300 إيميل/يوم")} ·
              <a href="https://brevo.com" target="_blank" rel="noreferrer" style={{ color: "var(--acc)", marginLeft: 4 }}>brevo.com</a>
              {T(" → Sign up → Settings → API Keys → Create Key", " → سجل → إعدادات → API Keys → Create Key")}
            </span>
          </label>
          <input value={notifSettings.brevoKey || ""} placeholder="xkeysib-..."
            onChange={e => saveNotifSettings({ ...notifSettings, brevoKey: e.target.value })}
            style={{ fontFamily: "monospace", fontSize: 12 }} />
        </div>

        {/* Recipients Table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 12 }}>
            👥 {T("Recipients", "المستلمون")}
            <span style={{ fontSize: 11, color: "var(--t3)", fontWeight: 400, marginLeft: 8 }}>{T("Each person must activate CallMeBot once to receive WhatsApp", "كل شخص يفعّل CallMeBot مرة واحدة لاستقبال واتساب")}</span>
          </div>
          {(notifSettings.recipients || []).map((r, i) => (
            <div key={i} style={{ background: r.active ? "var(--bg2)" : "var(--card)", border: `1px solid ${r.active ? "var(--border)" : "var(--border)"}`, borderRadius: 10, padding: 14, marginBottom: 10, opacity: r.active ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <input value={r.name || ""} onChange={e => { const recs = [...notifSettings.recipients]; recs[i] = { ...r, name: e.target.value }; saveNotifSettings({ ...notifSettings, recipients: recs }); }}
                    style={{ fontWeight: 700, fontSize: 14, color: "var(--t1)", background: "transparent", border: "none", borderBottom: "1px dashed var(--border)", outline: "none", fontFamily: "inherit", width: 140, padding: "2px 4px" }} />
                  <input value={r.role || ""} onChange={e => { const recs = [...notifSettings.recipients]; recs[i] = { ...r, role: e.target.value }; saveNotifSettings({ ...notifSettings, recipients: recs }); }}
                    style={{ fontSize: 11, color: "var(--info)", background: "var(--infob)", border: "1px solid var(--info)", borderRadius: 20, outline: "none", fontFamily: "inherit", padding: "2px 8px", width: 90, textAlign: "center" }} />
                  <Btn size="sm" color="danger" onClick={() => { if(window.confirm(T("Remove this recipient?","حذف هذا المستلم?"))) { const recs = notifSettings.recipients.filter((_,j) => j !== i); saveNotifSettings({ ...notifSettings, recipients: recs }); } }}>🗑️</Btn>
                </div>
                <div style={{ width: 36, height: 20, background: r.active ? "var(--ok)" : "var(--border)", borderRadius: 10, position: "relative", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}
                  onClick={() => { const recs = [...notifSettings.recipients]; recs[i] = { ...r, active: !r.active }; saveNotifSettings({ ...notifSettings, recipients: recs }); }}>
                  <div style={{ width: 14, height: 14, background: "white", borderRadius: "50%", position: "absolute", top: 3, left: r.active ? 19 : 3, transition: "all 0.2s" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>📧 Email</label>
                  <input value={r.email || ""} placeholder="email@company.com"
                    onChange={e => { const recs = [...notifSettings.recipients]; recs[i] = { ...r, email: e.target.value }; saveNotifSettings({ ...notifSettings, recipients: recs }); }}
                    style={{ width: "100%", padding: "6px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--t1)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>📱 WhatsApp (+20...)</label>
                  <input value={r.whatsapp || ""} placeholder="201XXXXXXXXX"
                    onChange={e => { const recs = [...notifSettings.recipients]; recs[i] = { ...r, whatsapp: e.target.value }; saveNotifSettings({ ...notifSettings, recipients: recs }); }}
                    style={{ width: "100%", padding: "6px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--t1)", fontFamily: "inherit", fontSize: 12, outline: "none" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 3 }}>
                    🔑 {T("CallMeBot API Key (for WhatsApp)", "مفتاح CallMeBot (للواتساب)")}
                    <span style={{ color: "var(--t3)", fontWeight: 400 }}> — {T("Get from", "احصل منه من")} </span>
                    <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer" style={{ color: "var(--acc)" }}>callmebot.com</a>
                    <span style={{ color: "var(--t3)", fontWeight: 400 }}>{T(" (each person gets their own key)", " (كل شخص يحصل على مفتاحه الخاص)")}</span>
                  </label>
                  <input value={r.whatsappKey || ""} placeholder="e.g. 1234567"
                    onChange={e => { const recs = [...notifSettings.recipients]; recs[i] = { ...r, whatsappKey: e.target.value }; saveNotifSettings({ ...notifSettings, recipients: recs }); }}
                    style={{ width: "100%", padding: "6px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--t1)", fontFamily: "monospace", fontSize: 12, outline: "none" }} />
                </div>
              </div>
            </div>
          ))}
          <Btn color="outline" size="sm" onClick={() => saveNotifSettings({ ...notifSettings, recipients: [...(notifSettings.recipients||[]), { name: "New Person", role: "Staff", email: "", whatsapp: "", whatsappKey: "", active: true }] })}>
            ➕ {T("Add Recipient", "إضافة مستلم")}
          </Btn>
        </div>

        {/* Event Toggles */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 12 }}>
          📋 {T("Notify when:", "أرسل إشعار عند:")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(notifSettings.events || {}).map(([key, ev]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: ev.on ? "var(--okb)" : "var(--bg2)", border: `1px solid ${ev.on ? "var(--ok)" : "var(--border)"}`, borderRadius: 8, transition: "all 0.15s" }}>
              <div>
                <span style={{ fontSize: 16, marginRight: 8 }}>{ev.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--t1)" }}>{ev.label}</span>
                {ev.warn && <span style={{ fontSize: 11, color: "var(--warn)", marginLeft: 8 }}>({T("high frequency", "تكرار عالي")})</span>}
              </div>
              <div style={{ width: 44, height: 24, background: ev.on ? "var(--ok)" : "var(--border)", borderRadius: 12, position: "relative", cursor: "pointer", transition: "all 0.2s", flexShrink: 0 }}
                onClick={() => saveNotifSettings({ ...notifSettings, events: { ...notifSettings.events, [key]: { ...ev, on: !ev.on } } })}>
                <div style={{ width: 18, height: 18, background: "white", borderRadius: "50%", position: "absolute", top: 3, left: ev.on ? 23 : 3, transition: "all 0.2s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Test button */}
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn color="primary" onClick={async () => {
            // Force enable leave_request for testing
            const testSettings = { ...notifSettings, enabled: true, events: { ...notifSettings.events, leave_request: { ...(notifSettings.events?.leave_request || {}), on: true } } };
            await new Promise(resolve => {
              localStorage.setItem("mymayz_notif", JSON.stringify(testSettings));
              resolve();
            });
            sendNotification("leave_request", "🧪 Test from myMayz HR — WhatsApp & Email working!");
            alert(T("Test notification sent! Check your WhatsApp and email.", "تم إرسال الإشعار التجريبي! تحقق من واتساب والبريد الإلكتروني."));
          }}>
            🧪 {T("Send Test Notification", "إرسال إشعار تجريبي")}
          </Btn>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 4 }}>📍 {T("Approved GPS Locations", "مواقع العمل المعتمدة")}</div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 16 }}>
          {T("Edit coordinates and radius for each location. Stand inside the location and tap '📍 Use My Location' for best accuracy.",
             "عدّل الإحداثيات والنطاق لكل موقع. قف داخل الموقع واضغط '📍 استخدم موقعي' للحصول على أفضل دقة.")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {gpsLocs.map((loc, i) => (
            <div key={loc.id} style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{loc.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--t1)", fontSize: 15 }}>{loc.name}</div>
                  <div style={{ fontSize: 12, color: "var(--t3)" }}>{loc.nameAr}</div>
                </div>
                <span className="badge green" style={{ marginLeft: "auto" }}>🎯 {(loc.radius * 1000).toFixed(0)}m</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 4 }}>📍 {T("Latitude","خط العرض")}</label>
                  <input type="number" step="0.000001" value={loc.lat}
                    onChange={e => {
                      const n = [...gpsLocs]; n[i] = { ...n[i], lat: +e.target.value };
                      setGpsLocs(n); localStorage.setItem("mymayz_locations", JSON.stringify(n));
                    }}
                    style={{ width:"100%", padding:"7px 8px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:6, color:"var(--t1)", fontFamily:"monospace", fontSize:12, outline:"none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 4 }}>📍 {T("Longitude","خط الطول")}</label>
                  <input type="number" step="0.000001" value={loc.lng}
                    onChange={e => {
                      const n = [...gpsLocs]; n[i] = { ...n[i], lng: +e.target.value };
                      setGpsLocs(n); localStorage.setItem("mymayz_locations", JSON.stringify(n));
                    }}
                    style={{ width:"100%", padding:"7px 8px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:6, color:"var(--t1)", fontFamily:"monospace", fontSize:12, outline:"none" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--t3)", display: "block", marginBottom: 4 }}>🎯 {T("Radius (meters)","النطاق (متر)")}</label>
                  <input type="number" step="50" min="50" value={Math.round(loc.radius * 1000)}
                    onChange={e => {
                      const n = [...gpsLocs]; n[i] = { ...n[i], radius: +e.target.value / 1000 };
                      setGpsLocs(n); localStorage.setItem("mymayz_locations", JSON.stringify(n));
                    }}
                    style={{ width:"100%", padding:"7px 8px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:6, color:"var(--t1)", fontFamily:"inherit", fontSize:12, outline:"none" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Btn size="sm" color="primary" onClick={() => {
                  if (!navigator.geolocation) { alert(T("GPS not supported on this device.", "GPS غير مدعوم على هذا الجهاز.")); return; }
                  navigator.geolocation.getCurrentPosition(pos => {
                    const newLat = +pos.coords.latitude.toFixed(7);
                    const newLng = +pos.coords.longitude.toFixed(7);
                    const n = [...gpsLocs]; n[i] = { ...n[i], lat: newLat, lng: newLng };
                    setGpsLocs(n); localStorage.setItem("mymayz_locations", JSON.stringify(n));
                    alert(T(
                      `✅ ${loc.name} coordinates updated!\nLat: ${newLat}\nLng: ${newLng}\nAccuracy: ±${Math.round(pos.coords.accuracy)}m`,
                      `✅ تم تحديث إحداثيات ${loc.nameAr}!\nخط العرض: ${newLat}\nخط الطول: ${newLng}\nالدقة: ±${Math.round(pos.coords.accuracy)}م`
                    ));
                  }, err => alert(T("Could not get GPS. Make sure location is enabled in browser.", "تعذر الحصول على GPS. تأكد من تفعيل الموقع في المتصفح.")),
                  { enableHighAccuracy: true, timeout: 10000 });
                }}>📍 {T("Use My Current Location", "استخدم موقعي الحالي")}</Btn>
                <span style={{ fontSize: 11, color: "var(--t3)" }}>
                  {T("Stand inside the office/location and tap this","قف داخل الموقع واضغط هذا الزر")}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="info-box" style={{ marginTop: 14, borderColor: "var(--warn)", background: "var(--warnb)" }}>
          ⚠️ {T("Changes save automatically. Employees need to reload the app to get new coordinates.",
                 "التغييرات تُحفظ تلقائياً. يجب على الموظفين إعادة تحميل التطبيق لتطبيق الإحداثيات الجديدة.")}
        </div>
      </div>
    </div>
  );

  // ============================================================
  // LAYOUT
  // ============================================================

  if (!loggedIn) return (
    <>
      <style>{css}</style>
      {signup
        ? <SignupPage lang={lang} setLang={setLang} onBack={() => setSignup(false)} onSuccess={() => setSignup(false)} />
        : !portal
          ? <PortalSelector lang={lang} setLang={setLang} onSelect={setPortal} onSignup={() => setSignup(true)} />
          : <LoginPage lang={lang} setLang={setLang} role={portal} onLogin={handleLogin} onBack={() => setPortal(null)} />
      }
    </>
  );

  const pendingBadge = excuses.filter(e => e.status === "pending").length + leaveReqs.filter(l => l.status === "pending").length + loans.filter(l => l.status === "pending").length;
  const pendingEmployees = employees.filter(e => e.status === "pending").length;

  // Role-based navigation
  const allNavItems = [
    { id: "dashboard", icon: "🏠", label: T("Dashboard", "لوحة التحكم"), roles: ["admin","hr","accountant"] },
    { id: "analytics", icon: "📊", label: T("Analytics", "التحليلات"), roles: ["admin","hr","accountant"] },
    { id: "employees", icon: "👥", label: T("Employees", "الموظفون"), roles: ["admin","hr","accountant"], badge: pendingEmployees || null },
    { id: "shifts", icon: "🕐", label: T("Shifts", "المناوبات"), roles: ["admin","hr"] },
    { id: "attendance", icon: "🕐", label: T("Attendance", "الحضور"), roles: ["admin","hr","accountant","employee"] },
    { id: "payroll", icon: "💰", label: T("Payroll", "الرواتب"), roles: ["admin","hr","accountant","employee"] },
    { id: "loans", icon: "💳", label: T("Loans", "القروض"), roles: ["admin","hr","accountant"] },
    { id: "selfservice", icon: "🙋", label: T("Self-Service", "الخدمة الذاتية"), roles: ["admin","hr","accountant","employee"], badge: pendingBadge || null },
    { id: "settings", icon: "⚙️", label: T("Settings", "الإعدادات"), roles: ["admin"] },
  ];
  const navItems = allNavItems.filter(n => n.roles.includes(role));

  // Safety: ensure page is valid for current role
  const validPages = navItems.map(n => n.id);
  const safePage = validPages.includes(page) ? page : (validPages[0] || "attendance");

  // ============================================================
  // ANALYTICS DASHBOARD
  // ============================================================
  const renderAnalytics = () => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const today = new Date();

    // Attendance rate per employee
    const last30 = new Date(today - 30 * 86400000).toISOString().split("T")[0];
    const recentAtt = attendance.filter(a => a.date >= last30);
    const workdays = 22; // approx working days in a month

    const empAttRate = employees.map(emp => {
      const present = recentAtt.filter(a => a.employee_id === emp.id && (a.status === "present" || a.status === "late")).length;
      const late = recentAtt.filter(a => a.employee_id === emp.id && a.status === "late").length;
      const absent = workdays - present;
      const hours = recentAtt.filter(a => a.employee_id === emp.id).reduce((s, a) => s + (Number(a.hours_worked) || 0), 0);
      return { ...emp, present, late, absent: Math.max(0, absent), hours: hours.toFixed(1), rate: Math.round((present / workdays) * 100) };
    });

    // Monthly late arrivals (last 6 months)
    const lateByMonth = months.slice(Math.max(0, today.getMonth() - 5), today.getMonth() + 1).map((m, i) => {
      const mi = (today.getMonth() - 5 + i + 12) % 12;
      const yr = today.getFullYear() - (mi > today.getMonth() ? 1 : 0);
      const key = `${yr}-${String(mi + 1).padStart(2, "0")}`;
      return { month: m, count: attendance.filter(a => a.status === "late" && a.date?.startsWith(key)).length };
    });

    // On-time vs late this month
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthAtt = attendance.filter(a => a.date?.startsWith(thisMonth));
    const onTime = thisMonthAtt.filter(a => a.status === "present").length;
    const lateCount = thisMonthAtt.filter(a => a.status === "late").length;
    const absentCount = thisMonthAtt.filter(a => a.status === "absent").length;
    const totalThisMonth = onTime + lateCount + absentCount || 1;

    // Dept headcount
    const depts = {};
    employees.forEach(e => { const d = e.department || "Other"; depts[d] = (depts[d] || 0) + 1; });

    // Payroll breakdown
    const totalBase = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0);
    const totalLoansActive = loans.filter(l => l.status === "active").reduce((s, l) => s + (Number(l.remaining) || 0), 0);
    const totalPaidPayroll = payroll.filter(p => p.status === "paid").reduce((s, p) => s + (Number(p.net_salary) || 0), 0);

    const barMax = Math.max(...lateByMonth.map(m => m.count), 1);

    return (
      <div>
        {/* Summary KPIs */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { icon: "📈", color: "green", value: Math.round(empAttRate.reduce((s, e) => s + e.rate, 0) / (empAttRate.length || 1)) + "%", label: T("Avg Attendance Rate", "متوسط نسبة الحضور") },
            { icon: "⏰", color: "yellow", value: lateCount, label: T("Late This Month", "متأخرون هذا الشهر") },
            { icon: "❌", color: "red", value: empAttRate.reduce((s, e) => s + e.absent, 0), label: T("Absent Days (30d)", "أيام غياب (30 يوم)") },
            { icon: "⏱️", color: "blue", value: empAttRate.reduce((s, e) => s + Number(e.hours), 0).toFixed(0) + "h", label: T("Total Hours (30d)", "إجمالي الساعات") },
            { icon: "💰", color: "purple", value: totalBase.toLocaleString() + " EGP", label: T("Monthly Payroll Cost", "تكلفة الرواتب الشهرية") },
            { icon: "💳", color: "yellow", value: loans.filter(l => l.status === "active").length, label: T("Active Loans", "قروض نشطة") },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* On-time vs Late Pie */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>🕐 {T("This Month: Clock-In Status", "هذا الشهر: حالة تسجيل الحضور")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: T("On Time", "في الوقت"), count: onTime, color: "var(--ok)", pct: Math.round((onTime / totalThisMonth) * 100) },
                { label: T("Late", "متأخر"), count: lateCount, color: "var(--warn)", pct: Math.round((lateCount / totalThisMonth) * 100) },
                { label: T("Absent", "غائب"), count: absentCount, color: "var(--err)", pct: Math.round((absentCount / totalThisMonth) * 100) },
              ].map((item, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: item.color, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ color: "var(--t2)" }}>{item.count} ({item.pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 4, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Headcount */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>🏢 {T("Department Headcount", "توزيع الأقسام")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(depts).sort((a, b) => b[1] - a[1]).map(([dept, count], i) => {
                const colors = ["var(--acc)", "var(--ok)", "var(--warn)", "var(--info)", "var(--err)"];
                const pct = Math.round((count / employees.length) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: "var(--t1)", fontWeight: 500 }}>{dept}</span>
                      <span style={{ color: "var(--t2)" }}>{count} {T("employees", "موظف")} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: colors[i % colors.length], borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Late Arrivals Trend */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>📉 {T("Late Arrivals Trend (Last 6 Months)", "اتجاه التأخير (آخر 6 أشهر)")}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, padding: "0 8px" }}>
            {lateByMonth.map((m, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 12, color: "var(--t2)", fontWeight: 600 }}>{m.count}</div>
                <div style={{ width: "100%", background: m.count > 0 ? "var(--warn)" : "var(--border)", borderRadius: "4px 4px 0 0", height: `${Math.max(4, (m.count / barMax) * 100)}px`, transition: "height 0.5s ease", minHeight: 4 }} />
                <div style={{ fontSize: 11, color: "var(--t3)" }}>{m.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div className="card-title">👤 {T("Employee Attendance Performance", "أداء حضور الموظفين")}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Month picker */}
              <input type="month" defaultValue={new Date().toISOString().slice(0,7)}
                onChange={e => {
                  const val = e.target.value;
                  // Update last30 filter based on selected month
                  const d = new Date(val + "-01");
                  const last = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().split("T")[0];
                  const first = val + "-01";
                  e.target.dataset.from = first;
                  e.target.dataset.to = last;
                  // Store in a ref-like way via data attributes
                  document.getElementById("perfMonthFrom").value = first;
                  document.getElementById("perfMonthTo").value = last;
                }}
                style={{ padding: "5px 10px", background: "#ffffff", border: "1px solid var(--border)", borderRadius: 8, color: "#1a2035", fontFamily: "inherit", fontSize: 12 }} />
              {/* Hidden inputs to store date range */}
              <input type="hidden" id="perfMonthFrom" defaultValue={new Date().toISOString().slice(0,8)+"01"} />
              <input type="hidden" id="perfMonthTo" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                {[
                  { key: "name", label: T("Employee", "الموظف") },
                  { key: "dept", label: T("Department", "القسم") },
                  { key: "present", label: T("Present", "حضور") },
                  { key: "late", label: T("Late", "تأخير") },
                  { key: "absent", label: T("Absent", "غياب") },
                  { key: "hours", label: T("Hours", "ساعات") },
                  { key: "rate", label: T("Rate", "النسبة") },
                ].map(col => (
                  <th key={col.key} style={{ cursor: "pointer", userSelect: "none" }}>
                    {col.label}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {empAttRate.sort((a, b) => b.rate - a.rate).map((emp, i) => (
                  <tr key={i}>
                    <td><div className="emp-row"><div className="emp-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{emp.avatar || "?"}</div><span style={{ color: "var(--t1)", fontWeight: 500 }}>{emp.name}</span></div></td>
                    <td>{emp.department || "—"}</td>
                    <td style={{ color: "var(--ok)", fontWeight: 600 }}>{emp.present}</td>
                    <td style={{ color: "var(--warn)", fontWeight: 600 }}>{emp.late}</td>
                    <td style={{ color: emp.absent > 3 ? "var(--err)" : "var(--t2)", fontWeight: emp.absent > 3 ? 700 : 400 }}>{emp.absent}</td>
                    <td>{emp.hours}h</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "var(--bg2)", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
                          <div style={{ width: `${emp.rate}%`, height: "100%", background: emp.rate >= 90 ? "var(--ok)" : emp.rate >= 70 ? "var(--warn)" : "var(--err)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: emp.rate >= 90 ? "var(--ok)" : emp.rate >= 70 ? "var(--warn)" : "var(--err)", minWidth: 36 }}>{emp.rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payroll & Loans Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>💰 {T("Payroll Breakdown", "تفصيل الرواتب")}</div>
            {[
              { label: T("Total Base Salaries", "إجمالي الرواتب الأساسية"), value: totalBase.toLocaleString() + " EGP", color: "var(--ok)" },
              { label: T("Total Paid This Year", "إجمالي المدفوع هذا العام"), value: totalPaidPayroll.toLocaleString() + " EGP", color: "var(--acc)" },
              { label: T("Pending Payroll", "رواتب معلقة"), value: payroll.filter(p => p.status === "pending").length + " " + T("payslips", "مسير راتب"), color: "var(--warn)" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: 13, color: "var(--t2)" }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>💳 {T("Loan Repayment Status", "حالة سداد القروض")}</div>
            {loans.filter(l => l.status === "active").length === 0
              ? <div style={{ color: "var(--t3)", fontSize: 13, textAlign: "center", padding: 20 }}>{T("No active loans", "لا توجد قروض نشطة")}</div>
              : loans.filter(l => l.status === "active").map((loan, i) => {
                const emp = employees.find(e => e.id === loan.employee_id);
                const pct = Math.min(100, Math.round(((loan.amount - loan.remaining) / loan.amount) * 100));
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: "var(--t1)" }}>{emp?.name || "—"}</span>
                      <span style={{ color: "var(--warn)" }}>{Number(loan.remaining).toLocaleString()} EGP {T("left", "متبقي")}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg2)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--ok)", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{pct}% {T("repaid", "تم سداده")}</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // SHIFTS MANAGEMENT
  // ============================================================
  const renderShifts = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const daysAr = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

    return (
      <div>
        <div className="card-header" style={{ marginBottom: 20 }}>
          <div className="card-title">🕐 {T("Shift Management", "إدارة المناوبات")}</div>
          {role === "admin" && (
            <Btn color="primary" onClick={() => openModal("addShift", { name: "", name_ar: "", start_time: "09:00", end_time: "17:00", grace_minutes: 15, is_night_shift: false, color: "#10b981" })}>
              ➕ {T("New Shift", "مناوبة جديدة")}
            </Btn>
          )}
        </div>

        {/* Shifts List */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
          {shifts.map((shift, i) => (
            <div key={i} className="card" style={{ borderLeft: `4px solid ${shift.color || "var(--acc)"}`, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--t1)" }}>{ar ? shift.name_ar : shift.name}</div>
                  {shift.is_night_shift && <span className="badge purple" style={{ fontSize: 11, marginTop: 4 }}>🌙 {T("Night Shift", "وردية ليلية")}</span>}
                </div>
                {role === "admin" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" color="outline" onClick={() => openModal("editShift", { ...shift })}>✏️</Btn>
                    <Btn size="sm" color="danger" onClick={async () => {
                      if (window.confirm(T(`Delete "${ar ? shift.name_ar : shift.name}"? Employees assigned to this shift will have no shift.`, `حذف "${shift.name_ar}"؟ سيبقى الموظفون المعينون بدون مناوبة.`))) {
                        await db("employee_shifts", "DELETE", null, `?shift_id=eq.${shift.id}`);
                        await db("shifts", "DELETE", null, `?id=eq.${shift.id}`);
                        await loadAll();
                      }
                    }}>🗑️</Btn>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--t2)" }}>
                <div>🟢 {T("Start", "بداية")}: <strong style={{ color: "var(--t1)" }}>{shift.start_time}</strong></div>
                <div>🔴 {T("End", "نهاية")}: <strong style={{ color: "var(--t1)" }}>{shift.end_time}</strong></div>
              </div>
              <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 8 }}>
                ⏱️ {shift.grace_minutes}min {T("grace period", "فترة سماح")} · {shift.min_hours || 8}h {T("minimum", "حد أدنى")}
              </div>
              {(() => {
                const od = (() => { try { return JSON.parse(shift.off_days || "[]"); } catch { return []; } })();
                if (!od.length) return null;
                const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                return <div style={{ fontSize: 11, color: "var(--warn)", marginTop: 3 }}>🏖️ {T("Off:","راحة:")} {od.map(d => dayNames[d]).join(", ")}</div>;
              })()}
              {shift.is_flexible && <div style={{ fontSize: 11, color: "var(--acc)", marginTop: 3 }}>🕐 {T("Flexible time — no late marking","وقت مرن — لا تأخير")}</div>}
              <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>
                👥 {employees.filter(e => empShifts.find(es => es.employee_id === e.id && es.shift_id === shift.id)).length} {T("employees assigned", "موظف معين")}
              </div>
            </div>
          ))}
        </div>

        {/* Assign Shifts to Employees */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title">👥 {T("Employee Shift Assignments", "تعيين المناوبات للموظفين")}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>{T("Employee", "الموظف")}</th>
                <th>{T("Type", "النوع")}</th>
                <th>{T("Current Shift", "المناوبة الحالية")}</th>
                <th>{T("Shift Times", "أوقات المناوبة")}</th>
                <th>{T("Change Shift", "تغيير المناوبة")}</th>
              </tr></thead>
              <tbody>
                {employees.filter(e => e.status === "active").map((emp, i) => {
                  const es = empShifts.find(x => x.employee_id === emp.id);
                  const shift = es ? shifts.find(s => s.id === es.shift_id) : null;
                  return (
                    <tr key={i}>
                      <td>
                        <div className="emp-row">
                          <div className="emp-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{emp.avatar || "?"}</div>
                          <div>
                            <div style={{ color: "var(--t1)", fontWeight: 500 }}>{emp.name}</div>
                            <div style={{ fontSize: 11, color: "var(--t3)" }}>{emp.employee_code}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${emp.employee_type === "warehouse" ? "yellow" : emp.employee_type === "retail" ? "blue" : "green"}`}>
                          {emp.employee_type === "warehouse" ? "🏭 " + T("Warehouse", "مستودع") : emp.employee_type === "retail" ? "🛍️ " + T("Retail", "متجر") : "🏢 " + T("Office", "مكتب")}
                        </span>
                      </td>
                      <td>
                        {shift
                          ? <span style={{ fontWeight: 600, color: shift.color || "var(--acc)" }}>{ar ? shift.name_ar : shift.name}</span>
                          : <span style={{ color: "var(--t3)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {shift ? `${shift.start_time} → ${shift.end_time}` : "—"}
                      </td>
                      <td>
                        <select
                          value={es?.shift_id || ""}
                          onChange={async (e) => {
                            const shiftId = +e.target.value;
                            if (es) {
                              await db("employee_shifts", "PATCH", { shift_id: shiftId }, `?id=eq.${es.id}`);
                            } else {
                              await db("employee_shifts", "POST", { employee_id: emp.id, shift_id: shiftId, effective_from: new Date().toISOString().split("T")[0] });
                            }
                            await loadAll();
                          }}
                          style={{ padding: "6px 10px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--t1)", fontFamily: "inherit", fontSize: 13, minWidth: 160 }}>
                          <option value="">{T("— Select shift —", "— اختر مناوبة —")}</option>
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>{ar ? s.name_ar : s.name} ({s.start_time}→{s.end_time})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Shift Modal */}
        {["addShift", "editShift"].map(mtype => (
          <Modal key={mtype} show={activeModal === mtype} onClose={closeModal} title={mtype === "addShift" ? T("➕ New Shift", "➕ مناوبة جديدة") : T("✏️ Edit Shift", "✏️ تعديل المناوبة")}>
            <div className="form-row">
              <div className="form-group"><label>{T("Shift Name (English)", "اسم المناوبة بالإنجليزية")}</label><input value={modalData.name || ""} onChange={e => setModalData({ ...modalData, name: e.target.value })} placeholder="Morning Shift" /></div>
              <div className="form-group"><label>{T("Shift Name (Arabic)", "اسم المناوبة بالعربية")}</label><input value={modalData.name_ar || ""} onChange={e => setModalData({ ...modalData, name_ar: e.target.value })} placeholder="الوردية الصباحية" /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>🟢 {T("Start Time", "وقت البداية")}</label><input type="time" value={modalData.start_time || "09:00"} onChange={e => setModalData({ ...modalData, start_time: e.target.value })} /></div>
              <div className="form-group"><label>🔴 {T("End Time", "وقت النهاية")}</label><input type="time" value={modalData.end_time || "17:00"} onChange={e => setModalData({ ...modalData, end_time: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>⏱️ {T("Grace Period (minutes)", "فترة السماح (دقيقة)")}</label><input type="number" value={modalData.grace_minutes || 15} onChange={e => setModalData({ ...modalData, grace_minutes: +e.target.value })} /></div>
              <div className="form-group"><label>⏰ {T("Minimum Hours", "الحد الأدنى للساعات")}</label><input type="number" value={modalData.min_hours || 8} onChange={e => setModalData({ ...modalData, min_hours: +e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>🎨 {T("Color", "اللون")}</label>
                <select value={modalData.color || "#10b981"} onChange={e => setModalData({ ...modalData, color: e.target.value })}>
                  <option value="#10b981">🟢 Green (Morning)</option>
                  <option value="#f59e0b">🟡 Yellow (Evening)</option>
                  <option value="#6366f1">🟣 Purple (Night)</option>
                  <option value="#3b82f6">🔵 Blue (Split)</option>
                  <option value="#ef4444">🔴 Red (Special)</option>
                </select>
              </div>
              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 24 }}>
                <input type="checkbox" id="night" checked={modalData.is_night_shift || false} onChange={e => setModalData({ ...modalData, is_night_shift: e.target.checked })} style={{ width: 18, height: 18 }} />
                <label htmlFor="night" style={{ cursor: "pointer" }}>🌙 {T("Night shift (crosses midnight)", "وردية ليلية (تعبر منتصف الليل)")}</label>
              </div>
            </div>

            {/* Flexible time toggle */}
            <div className="form-group">
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: modalData.is_flexible ? "var(--accg)" : "var(--bg2)", border: `2px solid ${modalData.is_flexible ? "var(--acc)" : "var(--border)"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}
                onClick={() => setModalData({ ...modalData, is_flexible: !modalData.is_flexible })}>
                <div style={{ width: 44, height: 24, background: modalData.is_flexible ? "var(--acc)" : "var(--border)", borderRadius: 12, position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, background: "white", borderRadius: "50%", position: "absolute", top: 3, left: modalData.is_flexible ? 23 : 3, transition: "all 0.2s" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: modalData.is_flexible ? "var(--acc)" : "var(--t1)" }}>
                    🕐 {T("Flexible Time Shift", "وردية بوقت مرن")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--t3)", marginTop: 2 }}>
                    {T("No fixed sign-in time — employees can arrive any time. Only minimum hours are tracked. No late marking.", "لا وقت دخول محدد — الموظفون يصلون في أي وقت. يُتتبع فقط الحد الأدنى للساعات. لا تأخير.")}
                  </div>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>🗓️ {T("Days Off — no attendance required on these days", "أيام الراحة — لا يشترط حضور في هذه الأيام")}</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {[{day:0,en:"Sun",ar:"أحد"},{day:1,en:"Mon",ar:"اثنين"},{day:2,en:"Tue",ar:"ثلاثاء"},{day:3,en:"Wed",ar:"أربعاء"},{day:4,en:"Thu",ar:"خميس"},{day:5,en:"Fri",ar:"جمعة"},{day:6,en:"Sat",ar:"سبت"}].map(({ day, en, ar: ar2 }) => {
                  const offDays = (() => { try { return JSON.parse(modalData.off_days || "[]"); } catch { return []; } })();
                  const isOff = offDays.includes(day);
                  return (
                    <div key={day} onClick={() => {
                      const cur = (() => { try { return JSON.parse(modalData.off_days || "[]"); } catch { return []; } })();
                      const upd = isOff ? cur.filter(d => d !== day) : [...cur, day];
                      setModalData({ ...modalData, off_days: JSON.stringify(upd) });
                    }} style={{ padding: "7px 14px", borderRadius: 20, background: isOff ? "var(--errb)" : "var(--bg2)", border: `2px solid ${isOff ? "var(--err)" : "var(--border)"}`, color: isOff ? "var(--err)" : "var(--t3)", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s", userSelect: "none" }}>
                      {isOff ? "🔴" : "🟢"} {ar ? ar2 : en}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
                🔴 {T("= Day off. Employees will NOT be marked absent or late on these days.", "= يوم راحة. لن يُسجَّل غياب أو تأخير في هذه الأيام.")}
              </div>
            </div>

            <div className="form-actions">
              <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
              <Btn color="primary" disabled={saving || !modalData.name} onClick={async () => {
                setSaving(true);
                const saveData = {
                  name: modalData.name,
                  name_ar: modalData.name_ar || modalData.name,
                  start_time: modalData.start_time || "09:00",
                  end_time: modalData.end_time || "17:00",
                  grace_minutes: modalData.grace_minutes || 15,
                  min_hours: modalData.min_hours || 8,
                  color: modalData.color || "#10b981",
                  is_night_shift: modalData.is_night_shift || false,
                  is_flexible: modalData.is_flexible || false,
                  off_days: modalData.off_days || "[]",
                };
                console.log("💾 Saving shift:", saveData, "mode:", mtype, "id:", modalData.id);
                let result;
                if (mtype === "addShift") {
                  result = await db("shifts", "POST", saveData);
                } else {
                  result = await db("shifts", "PATCH", saveData, `?id=eq.${modalData.id}`);
                }
                console.log("💾 Shift save result:", result);
                if (!result && mtype === "editShift") {
                  alert(T("⚠️ Could not save shift. Check Supabase RLS policies for the shifts table.", "⚠️ تعذّر حفظ المناوبة. تحقق من صلاحيات Supabase لجدول shifts."));
                }
                await loadAll(); setSaving(false); closeModal();
              }}>{saving ? <span className="spinner" /> : T("Save Shift", "حفظ المناوبة")}</Btn>
            </div>
          </Modal>
        ))}
      </div>
    );
  };

  const pages = { dashboard: renderDashboard, analytics: renderAnalytics, employees: renderEmployees, shifts: renderShifts, attendance: renderAttendance, payroll: renderPayroll, loans: renderLoans, selfservice: renderSelfService, settings: renderSettings };

  return (
    <>
      <style>{css}</style>
      <div className={`app ${ar ? "rtl" : ""}`}>
        {/* Mobile sidebar overlay */}
        <div className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">my<span>Mayz</span> HR</div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => {
                  setPage(item.id);
                  setSidebarOpen(false);
                  // Set smart default tab for self-service
                  if (item.id === "selfservice") {
                    setSsTab((role === "admin" || role === "hr" || role === "accountant") ? "manage" : "overview");
                  }
                }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{(currentEmployee?.avatar || (currentEmployee?.name || "AK").substring(0, 2)).toUpperCase()}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{currentEmployee?.name || "Ahmed Kardous"}</div>
                <div className="sidebar-user-role" style={{ textTransform: "capitalize" }}>{role === "admin" ? "Admin" : role === "hr" ? "HR" : role === "accountant" ? "Accountant" : "Employee"}</div>
              </div>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--t2)", cursor: "pointer", fontSize: 18, padding: 4 }} title={T("Logout", "تسجيل الخروج")}>🚪</button>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menu">☰</button>
              <div className="topbar-title">{navItems.find(n => n.id === safePage)?.icon} {navItems.find(n => n.id === safePage)?.label}</div>
            </div>
            <div className="topbar-actions">
              {/* Live indicator — pulses every 30s */}
              <div title={T("Live — data refreshes every 30s", "مباشر — البيانات تتحدث كل 30 ثانية")}
                style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--ok)", cursor: "pointer" }}
                onClick={() => loadAll()}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", animation: "pulse 2s infinite" }} />
                <span className="live-indicator-text">{T("Live", "مباشر")}</span>
              </div>
              <button className="lang-toggle" onClick={() => setLang(ar ? "en" : "ar")}>{ar ? "English" : "العربية"}</button>
              <button className="topbar-btn notif-dot" title={T("Notifications", "الإشعارات")}>🔔</button>
            </div>
          </header>
          <div className="content">{(pages[safePage] || pages["attendance"])?.()}</div>
        </div>

        {/* Photo Preview */}
        {photoPreview && (
          <div className="modal-overlay" onClick={() => setPhotoPreview(null)}>
            <div style={{ background: "var(--card)", borderRadius: 16, padding: 24, maxWidth: 400, textAlign: "center" }}>
              <img src={photoPreview} alt="attendance" style={{ width: "100%", borderRadius: 8, marginBottom: 16 }} />
              <Btn color="outline" onClick={() => setPhotoPreview(null)}>{T("Close", "إغلاق")}</Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
