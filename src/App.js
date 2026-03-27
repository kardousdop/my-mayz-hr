import { useState, useEffect } from "react";

// ============================================================
// SUPABASE
// ============================================================
const SUPABASE_URL = "https://qijcyebopepzzrrtflvm.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

async function db(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: "return=representation",
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    if (!res.ok) { console.error(`DB ${method} ${table}:`, res.status); return null; }
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

const OFFICE_LAT = 29.9921;
const OFFICE_LNG = 31.0316;
const OFFICE_RADIUS_KM = 0.5;

function distKm(lat1, lng1, lat2, lng2) {
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
  }
  body,#root{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);min-height:100vh}
  .rtl{direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif}
  .app{display:flex;min-height:100vh}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
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
  .login-lang button{background:none;border:none;color:var(--t3);cursor:pointer;font-size:13px;font-family:inherit;padding:4px 8px}
  .login-lang button.active{color:var(--acc);font-weight:600}
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
  .nav-badge{margin-left:auto;background:var(--err);color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;min-width:20px;text-align:center}
  .rtl .nav-badge{margin-left:0;margin-right:auto}
  .sidebar-footer{padding:16px 20px;border-top:1px solid var(--border)}
  .sidebar-user{display:flex;align-items:center;gap:12px}
  .sidebar-avatar{width:36px;height:36px;border-radius:50%;background:var(--accg);color:var(--acc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  .sidebar-user-info{flex:1;min-width:0}
  .sidebar-user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sidebar-user-role{font-size:11px;color:var(--t3)}
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
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:28px}
  .stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;transition:all 0.2s}
  .stat-card:hover{border-color:var(--border2);transform:translateY(-2px)}
  .stat-icon{width:40px;height:40px;border-radius:var(--rs);display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:18px}
  .stat-icon.blue{background:var(--infob);color:var(--info)}.stat-icon.green{background:var(--okb);color:var(--ok)}
  .stat-icon.yellow{background:var(--warnb);color:var(--warn)}.stat-icon.red{background:var(--errb);color:var(--err)}
  .stat-icon.purple{background:var(--accg);color:var(--acc)}
  .stat-value{font-size:26px;font-weight:700;margin-bottom:4px}
  .stat-label{font-size:13px;color:var(--t2)}
  .card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:24px;margin-bottom:20px}
  .card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}
  .card-title{font-size:16px;font-weight:600}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:12px;color:var(--t3);font-weight:600;padding:12px 16px;border-bottom:1px solid var(--border);text-transform:uppercase;letter-spacing:0.5px}
  .rtl th{text-align:right}
  td{padding:14px 16px;font-size:14px;border-bottom:1px solid var(--border);color:var(--t2)}
  tr:hover td{background:var(--card2)}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
  .badge.green{background:var(--okb);color:var(--ok)}.badge.red{background:var(--errb);color:var(--err)}
  .badge.yellow{background:var(--warnb);color:var(--warn)}.badge.blue{background:var(--infob);color:var(--info)}
  .badge.purple{background:var(--accg);color:var(--acc)}.badge.gray{background:var(--bg2);color:var(--t2)}
  .btn{padding:10px 20px;border-radius:var(--rs);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;border:none;font-family:inherit;display:inline-flex;align-items:center;gap:8px}
  .btn-primary{background:var(--acc);color:white}.btn-primary:hover{background:var(--acc2)}
  .btn-outline{background:transparent;border:1px solid var(--border);color:var(--t2)}.btn-outline:hover{border-color:var(--acc);color:var(--acc)}
  .btn-success{background:var(--ok);color:white}.btn-danger{background:var(--err);color:white}
  .btn-warning{background:var(--warn);color:white}
  .btn-sm{padding:6px 14px;font-size:12px}
  .btn:disabled{opacity:0.5;cursor:not-allowed}
  .clock-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
  .clock-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:32px;text-align:center;position:relative;overflow:hidden}
  .clock-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
  .clock-card.in::before{background:var(--ok)}.clock-card.out::before{background:var(--err)}
  .clock-time{font-size:44px;font-weight:700;margin:16px 0 8px;font-variant-numeric:tabular-nums}
  .clock-date{color:var(--t3);font-size:14px;margin-bottom:24px}
  .clock-btn{padding:14px 40px;border-radius:var(--r);font-size:15px;font-weight:700;cursor:pointer;border:none;color:white;transition:all 0.2s;font-family:inherit}
  .clock-btn:disabled{opacity:0.5;cursor:not-allowed}
  .clock-btn.in{background:var(--ok)}.clock-btn.in:hover:not(:disabled){background:#0d9d6e;transform:scale(1.02)}
  .clock-btn.out{background:var(--err)}.clock-btn.out:hover:not(:disabled){background:#dc2626;transform:scale(1.02)}
  .verify-steps{display:flex;flex-direction:column;gap:10px;margin-top:20px}
  .verify-step{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg2);border-radius:var(--rs);font-size:13px;text-align:left}
  .verify-step.error{background:var(--errb)}.verify-step.success{background:var(--okb)}
  .verify-icon{font-size:16px;flex-shrink:0}
  .gps-coords{font-size:11px;color:var(--t3);margin-top:4px}
  .modal-overlay{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px}
  .modal{background:var(--card);border:1px solid var(--border);border-radius:var(--rl);padding:32px;width:100%;max-width:540px;max-height:80vh;overflow-y:auto;}
  .modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
  .modal-title{font-size:18px;font-weight:700}
  .form-group{margin-bottom:16px}
  .form-group label{display:block;font-size:13px;color:var(--t2);margin-bottom:6px;font-weight:500}
  .form-group input,.form-group select,.form-group textarea{width:100%;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;font-family:inherit;transition:border-color 0.2s}
  .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--acc)}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .form-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:24px;flex-wrap:wrap}
  .emp-avatar{width:36px;height:36px;border-radius:50%;background:var(--accg);color:var(--acc);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  .emp-row{display:flex;align-items:center;gap:12px}
  .search-bar{position:relative;margin-bottom:20px}
  .search-bar input{width:100%;padding:12px 16px 12px 44px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;outline:none;font-family:inherit}
  .search-bar input:focus{border-color:var(--acc)}
  .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--t3)}
  .notif-dot{position:relative}
  .notif-dot::after{content:'';position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:var(--err);border-radius:50%;border:2px solid var(--bg2)}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn 0.3s ease forwards}
  @keyframes spin{to{transform:rotate(360deg)}}
  .spinner{display:inline-block;width:16px;height:16px;border:2px solid var(--t3);border-top-color:var(--acc);border-radius:50%;animation:spin 0.8s linear infinite}
  .tab-bar{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:24px;flex-wrap:wrap}
  .tab{padding:10px 20px;background:none;border:none;color:var(--t2);cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;white-space:nowrap}
  .tab.active{color:var(--acc);border-bottom-color:var(--acc)}
  .tab:hover{color:var(--t1)}
  .photo-thumb{width:48px;height:36px;border-radius:6px;object-fit:cover;border:1px solid var(--border);cursor:pointer}
  .info-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);padding:16px;margin-bottom:16px;font-size:13px;color:var(--t2);line-height:1.6}
  .net-salary-box{background:var(--okb);border:1px solid var(--ok);border-radius:var(--rs);padding:16px;text-align:center;margin-top:16px}
  .net-salary-box .amount{font-size:32px;font-weight:700;color:var(--ok)}
  .net-salary-box .label{font-size:13px;color:var(--t2);margin-top:4px}
  .loan-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-bottom:16px}
  .loan-progress{height:8px;background:var(--bg2);border-radius:4px;margin:12px 0;overflow:hidden}
  .loan-bar{height:100%;background:var(--warn);border-radius:4px}
  .req-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .ss-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-bottom:24px}
  .ss-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:24px;cursor:pointer;transition:all 0.2s}
  .ss-card:hover{border-color:var(--acc);transform:translateY(-2px)}
  .ss-card-icon{font-size:28px;margin-bottom:12px}
  .ss-card-title{font-size:15px;font-weight:600;margin-bottom:6px}
  .ss-card-desc{font-size:13px;color:var(--t2);line-height:1.5}
  .payroll-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}
  .pfield label{font-size:12px;color:var(--t3);display:block;margin-bottom:4px}
  .pfield input{width:100%;padding:8px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--rs);color:var(--t1);font-size:14px;font-weight:600;outline:none;font-family:inherit}
  .pfield input:focus{border-color:var(--acc)}
  @media(max-width:768px){
    .sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}
    .rtl .sidebar{transform:translateX(100%)}.rtl .sidebar.open{transform:translateX(0)}
    .main{margin-left:0!important;margin-right:0!important}
    .clock-section{grid-template-columns:1fr}.stats-grid{grid-template-columns:1fr 1fr}
    .content{padding:16px}.topbar{padding:0 16px}
    .mobile-menu{display:block!important}
    .form-row{grid-template-columns:1fr}
    .payroll-grid{grid-template-columns:1fr 1fr}
  }
`;

// ============================================================
// MODAL
// ============================================================
function Modal({ show, onClose, title, children, width }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" style={width ? { width } : {}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--t2)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
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
// LOGIN
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
      if (data.access_token) { onLogin("admin", data.user); return; }
    } catch (e) {}
    if ((email === "hello@mymayz.com" && password === "Ghalia@0902") || (email === "admin@peopleflow.com" && password === "demo123")) {
      onLogin("admin", { email, id: "demo" });
    } else {
      setError(lang === "ar" ? "فشل تسجيل الدخول. تحقق من البريد وكلمة المرور." : "Login failed. Check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className={`login-page ${lang === "ar" ? "rtl" : ""}`}>
      <div className="login-card fade-in">
        <div className="login-logo">my<span>Mayz</span> HR</div>
        <div className="login-tagline">{lang === "ar" ? "منصة أتمتة الموارد البشرية الذكية" : "Smart HR Automation Platform"}</div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@mymayz.com" />
        </div>
        <div className="login-field">
          <label>{lang === "ar" ? "كلمة المرور" : "Password"}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <button className="login-btn" onClick={submit} disabled={loading || !email || !password}>
          {loading ? <><span className="spinner" />{lang === "ar" ? "جاري التحميل..." : "Loading..."}</> : lang === "ar" ? "تسجيل الدخول" : "Sign In"}
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
  const [page, setPage] = useState("dashboard");
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
  const [reportFilter, setReportFilter] = useState({ from: "", to: "", emp: "" });

  const ar = lang === "ar";
  const T = (en, a) => ar ? a : en;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (loggedIn) loadAll(); }, [loggedIn]);

  const loadAll = async () => {
    const [emps, att, ln, ex, lv, pay] = await Promise.all([
      db("employees", "GET", null, "?select=*&order=name"),
      db("attendance", "GET", null, "?select=*&order=date.desc&limit=200"),
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

  const openModal = (name, data = {}) => { setActiveModal(name); setModalData(data); };
  const closeModal = () => { setActiveModal(null); setModalData({}); };

  // ============================================================
  // CLOCK IN / OUT
  // ============================================================
  const handleClockIn = async () => {
    setGpsErr(""); setPhotoErr(""); setGpsOk(false); setPhotoOk(false); setGpsLoc(null); setPhoto(null);

    // Step 1: GPS
    setVerifying("gps");
    let loc;
    try {
      loc = await getGPS();
      setGpsLoc(loc); setGpsOk(true);
    } catch (e) {
      setGpsErr(e.message); setVerifying(null); return;
    }

    // Step 2: Camera Photo
    setVerifying("photo");
    let photoData = null;
    try {
      photoData = await capturePhoto();
      setPhoto(photoData);
      setPhotoOk(true);
    } catch (e) {
      setPhotoErr(e.message);
      setVerifying(null);
      return;
    }

    // Step 3: Location check
    const dist = distKm(loc.lat, loc.lng, OFFICE_LAT, OFFICE_LNG);
    const isOffice = dist < OFFICE_RADIUS_KM;
    const clockTime = new Date();

    if (isOffice) {
      await doSaveClockIn(clockTime, loc, T("Office", "المكتب"), photoData);
    } else {
      setPendingLoc(loc); setPendingTime(clockTime);
      setShowLocModal(true); setVerifying(null);
    }
  };

  const doSaveClockIn = async (clockTime, loc, label, photoData) => {
    setVerifying("saving");
    const empId = employees[0]?.id || null;
    const isLate = clockTime.getHours() > 8 || (clockTime.getHours() === 8 && clockTime.getMinutes() > 15);
    await db("attendance", "POST", {
      employee_id: empId,
      date: clockTime.toISOString().split("T")[0],
      check_in: clockTime.toISOString(),
      gps_lat: loc?.lat, gps_lng: loc?.lng,
      location_label: label,
      face_photo: photoData || photo,
      status: isLate ? "late" : "present",
      source: "app",
    });
    setClockedIn(true); setClockInTime(clockTime); setLocLabel(label);
    setVerifying(null);
    await loadAll();
  };

  const handleClockOut = async () => {
    const clockTime = new Date();
    const today = clockTime.toISOString().split("T")[0];
    const empId = employees[0]?.id;
    const rec = attendance.find(a => a.date === today && a.employee_id === empId && !a.check_out);
    if (rec) {
      const hours = Math.round(((clockTime - new Date(rec.check_in)) / 3600000) * 100) / 100;
      await db("attendance", "PATCH", { check_out: clockTime.toISOString(), hours_worked: hours }, `?id=eq.${rec.id}`);
    }
    setClockedIn(false); setClockInTime(null); setGpsOk(false); setPhotoOk(false); setPhoto(null); setLocLabel(null);
    await loadAll();
  };

  // ============================================================
  // DASHBOARD
  // ============================================================
  const renderDashboard = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayAtt = attendance.filter(a => a.date === today);
    const pending = excuses.filter(e => e.status === "pending").length + leaveReqs.filter(l => l.status === "pending").length;
    const totalPayroll = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0);

    return (
      <div className="fade-in">
        <div className="stats-grid">
          {[
            { icon: "👥", color: "blue", value: employees.length, label: T("Total Employees", "إجمالي الموظفين") },
            { icon: "✅", color: "green", value: todayAtt.filter(a => a.check_in).length, label: T("Present Today", "حضور اليوم") },
            { icon: "⏰", color: "yellow", value: todayAtt.filter(a => a.status === "late").length, label: T("Late Today", "متأخرون اليوم") },
            { icon: "📋", color: "red", value: pending, label: T("Pending Requests", "طلبات معلقة") },
            { icon: "💰", color: "purple", value: totalPayroll.toLocaleString() + " EGP", label: T("Monthly Payroll", "الرواتب الشهرية") },
            { icon: "💳", color: "green", value: loans.filter(l => l.status === "active").length, label: T("Active Loans", "قروض نشطة") },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 {T("Today's Attendance", "حضور اليوم")} — {today}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>{T("Employee", "الموظف")}</th>
                <th>{T("Check In", "دخول")}</th>
                <th>{T("Check Out", "خروج")}</th>
                <th>{T("Location", "الموقع")}</th>
                <th>{T("GPS", "GPS")}</th>
                <th>{T("Status", "الحالة")}</th>
                <th>{T("Photo", "صورة")}</th>
              </tr></thead>
              <tbody>
                {todayAtt.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{T("No attendance recorded today", "لا يوجد حضور اليوم")}</td></tr>
                  : todayAtt.map((a, i) => {
                    const emp = employees.find(e => e.id === a.employee_id);
                    return (
                      <tr key={i}>
                        <td><div className="emp-row"><div className="emp-avatar">{emp?.avatar || "?"}</div><span style={{ color: "var(--t1)", fontWeight: 500 }}>{emp?.name || "Unknown"}</span></div></td>
                        <td style={{ color: "var(--ok)" }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td style={{ color: "var(--err)" }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td>{a.location_label ? <span className="badge blue">{a.location_label}</span> : "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--t3)" }}>{a.gps_lat ? `${Number(a.gps_lat).toFixed(4)}, ${Number(a.gps_lng).toFixed(4)}` : "—"}</td>
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
      <div className="fade-in">
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
            <span className="search-icon">🔍</span>
            <input placeholder={T("Search employees...", "بحث عن موظف...")} value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
          <Btn color="primary" onClick={() => openModal("addEmployee")}>➕ {T("Add Employee", "إضافة موظف")}</Btn>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>{T("Code", "الكود")}</th>
                <th>{T("Name", "الاسم")}</th>
                <th>{T("Department", "القسم")}</th>
                <th>{T("Position", "المنصب")}</th>
                <th>{T("Salary", "الراتب")}</th>
                <th>{T("Status", "الحالة")}</th>
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
                      <td style={{ color: "var(--ok)", fontWeight: 600 }}>{Number(emp.salary || 0).toLocaleString()} EGP</td>
                      <td><span className={`badge ${emp.status === "active" ? "green" : "red"}`}>{emp.status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn size="sm" color="outline" onClick={() => openModal("editEmployee", { ...emp })}>✏️ {T("Edit", "تعديل")}</Btn>
                          <Btn size="sm" color="success" onClick={() => openModal("editSalary", { ...emp, base_salary: emp.salary, allowances: 0, bonuses: 0, deductions: 0, tax: 0, insurance: 0 })}>💰 {T("Salary", "الراتب")}</Btn>
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
            <div className="form-group"><label>{T("Full Name (English)", "الاسم الكامل بالإنجليزية")}</label><input value={modalData.name || ""} onChange={e => setModalData({ ...modalData, name: e.target.value })} /></div>
            <div className="form-group"><label>{T("Full Name (Arabic)", "الاسم الكامل بالعربية")}</label><input value={modalData.name_ar || ""} onChange={e => setModalData({ ...modalData, name_ar: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Email", "البريد الإلكتروني")}</label><input type="email" value={modalData.email || ""} onChange={e => setModalData({ ...modalData, email: e.target.value })} /></div>
            <div className="form-group"><label>{T("Phone", "الهاتف")}</label><input value={modalData.phone || ""} onChange={e => setModalData({ ...modalData, phone: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Department", "القسم")}</label><input value={modalData.department || ""} onChange={e => setModalData({ ...modalData, department: e.target.value })} /></div>
            <div className="form-group"><label>{T("Position", "المنصب")}</label><input value={modalData.position || ""} onChange={e => setModalData({ ...modalData, position: e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Base Salary (EGP)", "الراتب الأساسي")}</label><input type="number" value={modalData.salary || ""} onChange={e => setModalData({ ...modalData, salary: +e.target.value })} /></div>
            <div className="form-group"><label>{T("Hire Date", "تاريخ التعيين")}</label><input type="date" value={modalData.hire_date || ""} onChange={e => setModalData({ ...modalData, hire_date: e.target.value })} /></div>
          </div>
          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving || !modalData.name} onClick={async () => {
              setSaving(true);
              const code = "EMP" + String(employees.length + 34).padStart(3, "0");
              await db("employees", "POST", { ...modalData, employee_code: code, avatar: (modalData.name || "").substring(0, 2).toUpperCase(), status: "active" });
              await loadAll(); setSaving(false); closeModal();
            }}>{saving ? <span className="spinner" /> : T("Save Employee", "حفظ الموظف")}</Btn>
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
          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving} onClick={async () => {
              setSaving(true);
              await db("employees", "PATCH", { name: modalData.name, name_ar: modalData.name_ar, email: modalData.email, phone: modalData.phone, department: modalData.department, position: modalData.position, salary: modalData.salary, status: modalData.status }, `?id=eq.${modalData.id}`);
              await loadAll(); setSaving(false); closeModal();
            }}>{saving ? <span className="spinner" /> : T("Save Changes", "حفظ التغييرات")}</Btn>
          </div>
        </Modal>

        {/* Edit Salary Modal */}
        <Modal show={activeModal === "editSalary"} onClose={closeModal} title={T("Edit Salary & Bonuses", "تعديل الراتب والمكافآت")}>
          <div className="info-box">
            <strong>{modalData.name}</strong> — {modalData.employee_code}<br />
            {T("Current Base Salary", "الراتب الأساسي الحالي")}: <strong style={{ color: "var(--ok)" }}>{Number(modalData.salary || 0).toLocaleString()} EGP</strong>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Base Salary (EGP)", "الراتب الأساسي")}</label><input type="number" value={modalData.base_salary || modalData.salary || 0} onChange={e => setModalData({ ...modalData, base_salary: +e.target.value })} /></div>
            <div className="form-group"><label>{T("Allowances (EGP)", "البدلات")}</label><input type="number" value={modalData.allowances || 0} onChange={e => setModalData({ ...modalData, allowances: +e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Bonuses (EGP)", "المكافآت")}</label><input type="number" value={modalData.bonuses || 0} onChange={e => setModalData({ ...modalData, bonuses: +e.target.value })} /></div>
            <div className="form-group"><label>{T("Deductions (EGP)", "الخصومات")}</label><input type="number" value={modalData.deductions || 0} onChange={e => setModalData({ ...modalData, deductions: +e.target.value })} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>{T("Tax (EGP)", "الضريبة")}</label><input type="number" value={modalData.tax || 0} onChange={e => setModalData({ ...modalData, tax: +e.target.value })} /></div>
            <div className="form-group"><label>{T("Insurance (EGP)", "التأمين")}</label><input type="number" value={modalData.insurance || 0} onChange={e => setModalData({ ...modalData, insurance: +e.target.value })} /></div>
          </div>
          <div className="net-salary-box">
            <div className="amount">{((modalData.base_salary || modalData.salary || 0) + (modalData.allowances || 0) + (modalData.bonuses || 0) - (modalData.deductions || 0) - (modalData.tax || 0) - (modalData.insurance || 0)).toLocaleString()} EGP</div>
            <div className="label">{T("Net Salary", "صافي الراتب")}</div>
          </div>
          <div className="form-actions">
            <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
            <Btn color="primary" disabled={saving} onClick={async () => {
              setSaving(true);
              const net = (modalData.base_salary || modalData.salary || 0) + (modalData.allowances || 0) + (modalData.bonuses || 0) - (modalData.deductions || 0) - (modalData.tax || 0) - (modalData.insurance || 0);
              await db("employees", "PATCH", { salary: modalData.base_salary || modalData.salary }, `?id=eq.${modalData.id}`);
              await loadAll(); setSaving(false); closeModal();
            }}>{saving ? <span className="spinner" /> : T("Update Salary", "تحديث الراتب")}</Btn>
          </div>
        </Modal>
      </div>
    );
  };

  // ============================================================
  // ATTENDANCE
  // ============================================================
  const renderAttendance = () => {
    const timeStr = now.toLocaleTimeString(ar ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const dateStr = now.toLocaleDateString(ar ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const filtered = attendance.filter(a => {
      if (reportFilter.from && a.date < reportFilter.from) return false;
      if (reportFilter.to && a.date > reportFilter.to) return false;
      if (reportFilter.emp && a.employee_id !== Number(reportFilter.emp)) return false;
      return true;
    });

    const stats = {
      present: filtered.filter(a => a.status === "present").length,
      late: filtered.filter(a => a.status === "late").length,
      absent: filtered.filter(a => a.status === "absent").length,
      totalHours: filtered.reduce((s, a) => s + (Number(a.hours_worked) || 0), 0).toFixed(1),
    };

    return (
      <div className="fade-in">
        <div className="tab-bar">
          {[
            { id: "clockin", label: T("🕐 Clock In/Out", "🕐 تسجيل الحضور") },
            { id: "reports", label: T("📊 Reports", "📊 التقارير") },
          ].map(tab => (
            <button key={tab.id} className={`tab ${attTab === tab.id ? "active" : ""}`} onClick={() => setAttTab(tab.id)}>{tab.label}</button>
          ))}
        </div>

        {attTab === "clockin" && (
          <>
            <div className="clock-section">
              {/* Clock In */}
              <div className="clock-card in">
                <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4 }}>{T("Clock In", "تسجيل الدخول")}</div>
                <div className="clock-time">{timeStr}</div>
                <div className="clock-date">{dateStr}</div>
                {!clockedIn
                  ? <button className="clock-btn in" onClick={handleClockIn} disabled={!!verifying}>
                      {verifying ? <><span className="spinner" style={{ marginRight: 8 }} />{T("Verifying...", "جاري التحقق...")}</> : T("Clock In", "تسجيل الدخول")}
                    </button>
                  : <div style={{ color: "var(--ok)", fontWeight: 600, fontSize: 15 }}>
                      ✅ {T("Clocked in at", "تم الدخول في")} {clockInTime?.toLocaleTimeString()}
                      {locLabel && <div style={{ fontSize: 13, color: "var(--t2)", marginTop: 6 }}>📍 {locLabel}</div>}
                    </div>
                }

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

                  {/* Camera Photo Step */}
                  <div className={`verify-step ${photoErr ? "error" : photoOk ? "success" : ""}`}>
                    <span className="verify-icon">{photoOk ? "✅" : photoErr ? "❌" : verifying === "photo" ? "⏳" : "⭕"}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div>{photoOk ? T("📸 Photo Captured ✓", "📸 تم التقاط الصورة ✓") : photoErr ? T("Camera Error", "خطأ الكاميرا") : verifying === "photo" ? T("Opening camera...", "جاري فتح الكاميرا...") : T("Face Photo", "صورة الوجه")}</div>
                      {photoErr && <div className="gps-coords" style={{ color: "var(--err)" }}>{photoErr}</div>}
                      {photo && <img src={photo} alt="captured" style={{ width: 80, height: 60, borderRadius: 6, marginTop: 8, objectFit: "cover", border: "2px solid var(--ok)" }} />}
                    </div>
                  </div>
                </div>

                {(gpsErr || photoErr) && !clockedIn && (
                  <button className="clock-btn in" style={{ marginTop: 16, width: "100%", padding: "12px" }} onClick={handleClockIn}>{T("🔄 Try Again", "🔄 حاول مرة أخرى")}</button>
                )}
              </div>

              {/* Clock Out */}
              <div className="clock-card out">
                <div style={{ fontSize: 14, color: "var(--t2)", marginBottom: 4 }}>{T("Clock Out", "تسجيل الخروج")}</div>
                <div className="clock-time">{timeStr}</div>
                <div className="clock-date">{dateStr}</div>
                <button className="clock-btn out" onClick={handleClockOut} disabled={!clockedIn}>{T("Clock Out", "تسجيل الخروج")}</button>
                {clockedIn && clockInTime && (
                  <div style={{ marginTop: 16, color: "var(--t2)", fontSize: 13 }}>
                    ⏱️ {T("Duration", "المدة")}: {Math.floor((now - clockInTime) / 3600000)}h {Math.floor(((now - clockInTime) % 3600000) / 60000)}m
                  </div>
                )}
              </div>
            </div>

            {/* Location Modal */}
            <Modal show={showLocModal} onClose={() => {}} title={T("📍 Where are you working from?", "📍 من أين تعمل؟")}>
              <div className="info-box">{T("You are outside the office. Please select your work location to complete check-in.", "أنت خارج المكتب. يرجى تحديد موقع عملك لإتمام تسجيل الحضور.")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[T("Home", "المنزل"), T("Out of Office", "خارج المكتب"), T("Client Site", "موقع العميل"), T("Field Work", "عمل ميداني"), T("Other", "أخرى")].map(loc => (
                  <button key={loc} onClick={() => setCustomLoc(loc)}
                    style={{ padding: "12px 20px", background: customLoc === loc ? "var(--acc)" : "transparent", border: `1px solid ${customLoc === loc ? "var(--acc)" : "var(--border)"}`, color: customLoc === loc ? "white" : "var(--t2)", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, textAlign: "left", transition: "all 0.15s" }}>
                    {loc}
                  </button>
                ))}
              </div>
              {customLoc === T("Other", "أخرى") && (
                <div className="form-group"><label>{T("Specify location", "حدد الموقع")}</label><input placeholder={T("e.g. Alexandria, Client office...", "مثال: الإسكندرية، مكتب العميل...")} onChange={e => setCustomLoc(e.target.value)} /></div>
              )}
              <div className="form-actions">
                <Btn color="primary" disabled={!customLoc || saving} onClick={async () => {
                  setShowLocModal(false);
                  await doSaveClockIn(pendingTime, pendingLoc, customLoc, null);
                  setCustomLoc("");
                }}>{saving ? <span className="spinner" /> : T("✅ Confirm & Clock In", "✅ تأكيد وتسجيل الدخول")}</Btn>
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
              <div className="card-title" style={{ marginBottom: 16 }}>🔍 {T("Filter Reports", "تصفية التقارير")}</div>
              <div className="form-row">
                <div className="form-group"><label>{T("From Date", "من تاريخ")}</label><input type="date" value={reportFilter.from} onChange={e => setReportFilter({ ...reportFilter, from: e.target.value })} /></div>
                <div className="form-group"><label>{T("To Date", "إلى تاريخ")}</label><input type="date" value={reportFilter.to} onChange={e => setReportFilter({ ...reportFilter, to: e.target.value })} /></div>
              </div>
              <div className="form-group">
                <label>{T("Employee", "الموظف")}</label>
                <select value={reportFilter.emp} onChange={e => setReportFilter({ ...reportFilter, emp: e.target.value })}>
                  <option value="">{T("All Employees", "جميع الموظفين")}</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <Btn color="outline" size="sm" onClick={() => setReportFilter({ from: "", to: "", emp: "" })}>🗑️ {T("Clear Filters", "مسح التصفية")}</Btn>
            </div>

            {/* Attendance Table */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title">📋 {T("Attendance Records", "سجلات الحضور")} ({filtered.length})</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr>
                    <th>{T("Date", "التاريخ")}</th>
                    <th>{T("Employee", "الموظف")}</th>
                    <th>{T("Check In", "دخول")}</th>
                    <th>{T("Check Out", "خروج")}</th>
                    <th>{T("Hours", "ساعات")}</th>
                    <th>{T("Location", "الموقع")}</th>
                    <th>{T("GPS Coordinates", "إحداثيات GPS")}</th>
                    <th>{T("Status", "الحالة")}</th>
                    <th>{T("Photo", "صورة")}</th>
                  </tr></thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{T("No records found", "لا توجد سجلات")}</td></tr>
                      : filtered.map((a, i) => {
                        const emp = employees.find(e => e.id === a.employee_id);
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 500, color: "var(--t1)" }}>{a.date}</td>
                            <td><div className="emp-row"><div className="emp-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>{emp?.avatar || "?"}</div><span>{emp?.name || "Unknown"}</span></div></td>
                            <td style={{ color: "var(--ok)" }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td style={{ color: "var(--err)" }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                            <td>{a.hours_worked ? `${a.hours_worked}h` : "—"}</td>
                            <td>{a.location_label ? <span className="badge blue">{a.location_label}</span> : "—"}</td>
                            <td style={{ fontSize: 11, color: "var(--t3)" }}>{a.gps_lat ? `${Number(a.gps_lat).toFixed(5)}, ${Number(a.gps_lng).toFixed(5)}` : "—"}</td>
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
  // PAYROLL
  // ============================================================
  const renderPayroll = () => {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const calcNet = d => (d.base_salary || 0) + (d.allowances || 0) + (d.bonuses || 0) - (d.deductions || 0) - (d.tax || 0) - (d.insurance || 0) - (d.loan_deduction || 0);

    return (
      <div className="fade-in">
        <div className="card-header" style={{ marginBottom: 20 }}>
          <div className="card-title">💰 {T("Payroll Management", "إدارة الرواتب")}</div>
          <Btn color="primary" onClick={() => openModal("createPayroll", { month: months[now.getMonth()], year: now.getFullYear(), employee_id: employees[0]?.id, base_salary: employees[0]?.salary || 0, allowances: 0, bonuses: 0, deductions: 0, tax: 0, insurance: 0, loan_deduction: 0 })}>➕ {T("Create Payslip", "إنشاء راتب")}</Btn>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr>
                <th>{T("Employee", "الموظف")}</th>
                <th>{T("Period", "الفترة")}</th>
                <th>{T("Base", "أساسي")}</th>
                <th>{T("Allowances", "بدلات")}</th>
                <th>{T("Bonuses", "مكافآت")}</th>
                <th>{T("Deductions", "خصومات")}</th>
                <th>{T("Net Salary", "صافي الراتب")}</th>
                <th>{T("Status", "الحالة")}</th>
                <th>{T("Actions", "إجراءات")}</th>
              </tr></thead>
              <tbody>
                {payroll.length === 0
                  ? <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--t3)", padding: 32 }}>{T("No payroll records", "لا توجد سجلات رواتب")}</td></tr>
                  : payroll.map((p, i) => {
                    const emp = employees.find(e => e.id === p.employee_id);
                    const net = p.net_salary || calcNet(p);
                    const totalDed = (p.deductions || 0) + (p.tax || 0) + (p.insurance || 0) + (p.loan_deduction || 0);
                    return (
                      <tr key={i}>
                        <td>{emp?.name || "—"}</td>
                        <td style={{ fontWeight: 500 }}>{p.month} {p.year}</td>
                        <td>{Number(p.base_salary || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)" }}>+{Number(p.allowances || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--ok)" }}>+{Number(p.bonuses || 0).toLocaleString()}</td>
                        <td style={{ color: "var(--err)" }}>-{totalDed.toLocaleString()}</td>
                        <td style={{ color: "var(--ok)", fontWeight: 700 }}>{Number(net).toLocaleString()} EGP</td>
                        <td><span className={`badge ${p.status === "paid" ? "green" : "yellow"}`}>{p.status}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn size="sm" color="outline" onClick={() => openModal("editPayroll", { ...p })}>✏️</Btn>
                            {p.status === "pending" && <Btn size="sm" color="success" onClick={async () => { await db("payroll", "PATCH", { status: "paid", paid_at: new Date().toISOString() }, `?id=eq.${p.id}`); loadAll(); }}>✅ {T("Pay", "دفع")}</Btn>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {["createPayroll", "editPayroll"].map(mtype => (
          <Modal key={mtype} show={activeModal === mtype} onClose={closeModal} title={mtype === "createPayroll" ? T("Create Payslip", "إنشاء راتب") : T("Edit Payslip", "تعديل الراتب")}>
            {mtype === "createPayroll" && (
              <div className="form-group">
                <label>{T("Employee", "الموظف")}</label>
                <select value={modalData.employee_id || ""} onChange={e => { const emp = employees.find(x => x.id === +e.target.value); setModalData({ ...modalData, employee_id: +e.target.value, base_salary: emp?.salary || 0 }); }}>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <div className="form-group"><label>{T("Month", "الشهر")}</label>
                <select value={modalData.month || ""} onChange={e => setModalData({ ...modalData, month: e.target.value })}>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{T("Year", "السنة")}</label><input type="number" value={modalData.year || now.getFullYear()} onChange={e => setModalData({ ...modalData, year: +e.target.value })} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[["base_salary", T("Base Salary", "الراتب الأساسي")], ["allowances", T("Allowances", "البدلات")], ["bonuses", T("Bonuses", "المكافآت")]].map(([k, lbl]) => (
                <div key={k} className="pfield"><label>{lbl}</label><input type="number" value={modalData[k] || 0} onChange={e => setModalData({ ...modalData, [k]: +e.target.value })} /></div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[["deductions", T("Deductions", "الخصومات")], ["tax", T("Tax", "الضريبة")], ["insurance", T("Insurance", "التأمين")], ["loan_deduction", T("Loan Ded.", "خصم قرض")]].map(([k, lbl]) => (
                <div key={k} className="pfield"><label>{lbl}</label><input type="number" value={modalData[k] || 0} onChange={e => setModalData({ ...modalData, [k]: +e.target.value })} /></div>
              ))}
            </div>
            <div className="net-salary-box">
              <div className="amount">{calcNet(modalData).toLocaleString()} EGP</div>
              <div className="label">{T("Net Salary", "صافي الراتب")}</div>
            </div>
            <div className="form-group" style={{ marginTop: 16 }}><label>{T("Notes", "ملاحظات")}</label><textarea rows={2} value={modalData.notes || ""} onChange={e => setModalData({ ...modalData, notes: e.target.value })} /></div>
            <div className="form-actions">
              <Btn color="outline" onClick={closeModal}>{T("Cancel", "إلغاء")}</Btn>
              <Btn color="primary" disabled={saving} onClick={async () => {
                setSaving(true);
                const net = calcNet(modalData);
                if (mtype === "createPayroll") await db("payroll", "POST", { ...modalData, net_salary: net });
                else await db("payroll", "PATCH", { ...modalData, net_salary: net }, `?id=eq.${modalData.id}`);
                await loadAll(); setSaving(false); closeModal();
              }}>{saving ? <span className="spinner" /> : T("Save", "حفظ")}</Btn>
            </div>
          </Modal>
        ))}
      </div>
    );
  };

  // ============================================================
  // LOANS
  // ============================================================
  const renderLoans = () => (
    <div className="fade-in">
      <div className="card-header" style={{ marginBottom: 20 }}>
        <div className="card-title">💳 {T("Employee Loans", "قروض الموظفين")}</div>
        <Btn color="primary" onClick={() => openModal("addLoan", { employee_id: employees[0]?.id, amount: 0, monthly_deduction: 0, reason: "" })}>➕ {T("New Loan", "قرض جديد")}</Btn>
      </div>

      {loans.length === 0
        ? <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--t3)" }}>{T("No loans recorded", "لا توجد قروض")}</div>
        : loans.map((loan, i) => {
          const emp = employees.find(e => e.id === loan.employee_id);
          const paid = loan.amount - loan.remaining;
          const pct = Math.min(100, Math.round((paid / loan.amount) * 100)) || 0;
          const months = Math.ceil(loan.remaining / loan.monthly_deduction) || 0;
          return (
            <div className="loan-card" key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{emp?.name || "Unknown"}</div>
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
                <span className={`badge ${loan.status === "active" ? "yellow" : "green"}`}>{loan.status}</span>
              </div>
              {loan.status === "active" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn size="sm" color="warning" onClick={async () => {
                    const newRem = Math.max(0, loan.remaining - loan.monthly_deduction);
                    await db("loans", "PATCH", { remaining: newRem, status: newRem <= 0 ? "settled" : "active" }, `?id=eq.${loan.id}`);
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
    </div>
  );

  // ============================================================
  // SELF SERVICE
  // ============================================================
  const renderSelfService = () => {
    const myEmp = employees[0];
    const myExcuses = excuses.filter(e => e.employee_id === myEmp?.id);
    const myLeaves = leaveReqs.filter(l => l.employee_id === myEmp?.id);
    const myLoans = loans.filter(l => l.employee_id === myEmp?.id && l.status === "active");
    const pendingEx = excuses.filter(e => e.status === "pending");
    const pendingLv = leaveReqs.filter(l => l.status === "pending");
    const pendingLn = loans.filter(l => l.status === "pending");

    return (
      <div className="fade-in">
        <div className="tab-bar">
          {[
            { id: "overview", label: T("🏠 Overview", "🏠 نظرة عامة") },
            { id: "excuse", label: T("⏰ Request Excuse", "⏰ طلب إذن") },
            { id: "leave", label: T("🏖️ Request Leave", "🏖️ طلب إجازة") },
            { id: "loanreq", label: T("💰 Request Loan", "💰 طلب قرض") },
            { id: "manage", label: T("👔 Admin Approvals", "👔 موافقات الإدارة") + ((pendingEx.length + pendingLv.length + pendingLn.length) > 0 ? ` (${pendingEx.length + pendingLv.length + pendingLn.length})` : "") },
          ].map(tab => (
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
                { icon: "📊", title: T("My Attendance", "حضوري"), desc: T("View your attendance history", "عرض سجل حضورك"), tab: null },
              ].map((card, i) => (
                <div key={i} className="ss-card" onClick={() => card.tab && setSsTab(card.tab)}>
                  <div className="ss-card-icon">{card.icon}</div>
                  <div className="ss-card-title">{card.title}</div>
                  <div className="ss-card-desc">{card.desc}</div>
                </div>
              ))}
            </div>

            {/* My active requests */}
            <div className="card-title" style={{ marginBottom: 16 }}>📋 {T("My Recent Requests", "طلباتي الأخيرة")}</div>
            {[...myExcuses.slice(0, 3), ...myLeaves.slice(0, 3)].length === 0
              ? <div className="info-box">{T("No requests yet. Use the tabs above to submit a new request.", "لا توجد طلبات بعد. استخدم التبويبات أعلاه لتقديم طلب جديد.")}</div>
              : [...myExcuses.slice(0, 3).map(e => ({ ...e, kind: "excuse" })), ...myLeaves.slice(0, 3).map(l => ({ ...l, kind: "leave" }))].map((r, i) => (
                <div className="req-card" key={i}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.kind === "excuse" ? "⏰" : "🏖️"} {r.type}</div>
                    <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{r.date || `${r.start_date} → ${r.end_date}`} · {r.reason}</div>
                  </div>
                  <span className={`badge ${r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "yellow"}`}>{r.status}</span>
                </div>
              ))}

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
                await db("excuse_requests", "POST", { ...modalData, employee_id: myEmp?.id, status: "pending" });
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
                await db("leave_requests", "POST", { ...modalData, employee_id: myEmp?.id, days, status: "pending" });
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
                await db("loans", "POST", { ...modalData, employee_id: myEmp?.id, status: "pending" });
                await loadAll(); setSaving(false); setModalData({}); setSsTab("overview");
              }}>{saving ? <span className="spinner" /> : T("📨 Submit Loan Request", "📨 إرسال طلب القرض")}</Btn>
            </div>
          </div>
        )}

        {ssTab === "manage" && (
          <div>
            {/* Pending Excuses */}
            <div className="card-title" style={{ marginBottom: 16 }}>⏰ {T("Pending Excuse Requests", "طلبات الإذن المعلقة")} ({pendingEx.length})</div>
            {pendingEx.length === 0
              ? <div className="info-box">{T("No pending excuse requests", "لا توجد طلبات إذن معلقة")}</div>
              : pendingEx.map((ex, i) => {
                const emp = employees.find(e => e.id === ex.employee_id);
                return (
                  <div className="req-card" key={i}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp?.name} — {ex.type}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{ex.date} · {ex.from_time} → {ex.to_time}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)" }}>{ex.reason}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn size="sm" color="success" onClick={async () => { await db("excuse_requests", "PATCH", { status: "approved" }, `?id=eq.${ex.id}`); loadAll(); }}>✅ {T("Approve", "موافقة")}</Btn>
                      <Btn size="sm" color="danger" onClick={async () => { await db("excuse_requests", "PATCH", { status: "rejected" }, `?id=eq.${ex.id}`); loadAll(); }}>❌ {T("Reject", "رفض")}</Btn>
                    </div>
                  </div>
                );
              })}

            {/* Pending Leaves */}
            <div className="card-title" style={{ margin: "24px 0 16px" }}>🏖️ {T("Pending Leave Requests", "طلبات الإجازة المعلقة")} ({pendingLv.length})</div>
            {pendingLv.length === 0
              ? <div className="info-box">{T("No pending leave requests", "لا توجد طلبات إجازة معلقة")}</div>
              : pendingLv.map((lv, i) => {
                const emp = employees.find(e => e.id === lv.employee_id);
                return (
                  <div className="req-card" key={i}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp?.name} — {lv.type} ({lv.days} {T("days", "أيام")})</div>
                      <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>{lv.start_date} → {lv.end_date}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)" }}>{lv.reason}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn size="sm" color="success" onClick={async () => { await db("leave_requests", "PATCH", { status: "approved" }, `?id=eq.${lv.id}`); loadAll(); }}>✅ {T("Approve", "موافقة")}</Btn>
                      <Btn size="sm" color="danger" onClick={async () => { await db("leave_requests", "PATCH", { status: "rejected" }, `?id=eq.${lv.id}`); loadAll(); }}>❌ {T("Reject", "رفض")}</Btn>
                    </div>
                  </div>
                );
              })}

            {/* Pending Loans */}
            <div className="card-title" style={{ margin: "24px 0 16px" }}>💳 {T("Pending Loan Requests", "طلبات القروض المعلقة")} ({pendingLn.length})</div>
            <div className="info-box" style={{ borderColor: "var(--info)", background: "var(--infob)" }}>
              ℹ️ {T("When you approve a loan, the employee receives the amount. The monthly deduction will be automatically applied to their payroll.", "عند الموافقة على القرض، يتلقى الموظف المبلغ. سيتم تطبيق الخصم الشهري تلقائياً على راتبه.")}
            </div>
            {pendingLn.length === 0
              ? <div className="info-box">{T("No pending loan requests", "لا توجد طلبات قروض معلقة")}</div>
              : pendingLn.map((ln, i) => {
                const emp = employees.find(e => e.id === ln.employee_id);
                return (
                  <div className="req-card" key={i}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{emp?.name} — {Number(ln.amount).toLocaleString()} EGP</div>
                      <div style={{ fontSize: 13, color: "var(--t3)", marginTop: 4 }}>📅 {T("Start", "بداية")}: {ln.start_date}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)" }}>💸 {Number(ln.monthly_deduction).toLocaleString()} EGP/{T("month", "شهر")} · ~{Math.ceil(ln.amount / ln.monthly_deduction)} {T("months", "أشهر")}</div>
                      <div style={{ fontSize: 13, color: "var(--t3)" }}>📝 {ln.reason}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <Btn size="sm" color="success" onClick={async () => {
                        await db("loans", "PATCH", { status: "active", approved_by: "Ahmed Kardous" }, `?id=eq.${ln.id}`);
                        loadAll();
                      }}>✅ {T("Approve & Activate", "موافقة وتفعيل")}</Btn>
                      <Btn size="sm" color="danger" onClick={async () => {
                        await db("loans", "PATCH", { status: "rejected" }, `?id=eq.${ln.id}`);
                        loadAll();
                      }}>❌ {T("Reject", "رفض")}</Btn>
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
  // SETTINGS
  // ============================================================
  const renderSettings = () => (
    <div className="fade-in">
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>⚙️ {T("System Settings", "إعدادات النظام")}</div>
        <div className="form-group"><label>{T("Language", "اللغة")}</label>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            <option value="en">English</option><option value="ar">العربية</option>
          </select>
        </div>
        <div className="form-group"><label>{T("Office Location", "موقع المكتب")}</label>
          <div className="info-box">📍 {T("Lat", "خط العرض")}: {OFFICE_LAT} · {T("Lng", "خط الطول")}: {OFFICE_LNG}<br />🎯 {T("Check-in radius", "نطاق تسجيل الحضور")}: {OFFICE_RADIUS_KM * 1000}m</div>
        </div>
        <div className="form-group"><label>{T("Database", "قاعدة البيانات")}</label>
          <span className={`badge ${SUPABASE_ANON_KEY ? "green" : "red"}`}>{SUPABASE_ANON_KEY ? "✅ " + T("Connected", "متصل") : "❌ " + T("No API Key", "لا يوجد مفتاح")}</span>
        </div>
        <div className="form-group"><label>{T("Version", "الإصدار")}</label><span className="badge blue">myMayz HR v3.1 — Final</span></div>
        <div style={{ marginTop: 20 }}>
          <Btn color="outline" onClick={loadAll}>🔄 {T("Refresh All Data", "تحديث كل البيانات")}</Btn>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // LAYOUT
  // ============================================================
  if (!loggedIn) return <><style>{css}</style><LoginPage lang={lang} setLang={setLang} onLogin={(r, u) => { setLoggedIn(true); }} /></>;

  const pendingBadge = excuses.filter(e => e.status === "pending").length + leaveReqs.filter(l => l.status === "pending").length + loans.filter(l => l.status === "pending").length;

  const navItems = [
    { id: "dashboard", icon: "🏠", label: T("Dashboard", "لوحة التحكم") },
    { id: "employees", icon: "👥", label: T("Employees", "الموظفون") },
    { id: "attendance", icon: "🕐", label: T("Attendance", "الحضور") },
    { id: "payroll", icon: "💰", label: T("Payroll", "الرواتب") },
    { id: "loans", icon: "💳", label: T("Loans", "القروض") },
    { id: "selfservice", icon: "🙋", label: T("Self-Service", "الخدمة الذاتية"), badge: pendingBadge || null },
    { id: "settings", icon: "⚙️", label: T("Settings", "الإعدادات") },
  ];

  const pages = { dashboard: renderDashboard, employees: renderEmployees, attendance: renderAttendance, payroll: renderPayroll, loans: renderLoans, selfservice: renderSelfService, settings: renderSettings };

  return (
    <>
      <style>{css}</style>
      <div className={`app ${ar ? "rtl" : ""}`}>
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">my<span>Mayz</span> HR</div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">AK</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">Ahmed Kardous</div>
                <div className="sidebar-user-role">Admin / HR</div>
              </div>
              <button onClick={() => setLoggedIn(false)} style={{ background: "none", border: "none", color: "var(--t2)", cursor: "pointer", fontSize: 18 }}>🚪</button>
            </div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="topbar-btn mobile-menu" style={{ display: "none" }} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
              <div className="topbar-title">{navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}</div>
            </div>
            <div className="topbar-actions">
              <button className="lang-toggle" onClick={() => setLang(ar ? "en" : "ar")}>{ar ? "English" : "العربية"}</button>
              <button className="topbar-btn notif-dot" title={T("Notifications", "الإشعارات")}>🔔</button>
            </div>
          </header>
          <div className="content">{pages[page]?.()}</div>
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
