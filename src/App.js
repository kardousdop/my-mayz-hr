import { useState, useEffect } from "react";

// ============================================================
// SUPABASE CLIENT - Connect to your real database
// ============================================================
const SUPABASE_URL = "https://qijcyebopepzzrrtflvm.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

const supabaseHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function supabaseQuery(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const opts = { method, headers: { ...supabaseHeaders, Prefer: method === "POST" ? "return=representation" : "" } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    if (!res.ok) { console.error(`Supabase ${method} ${table} failed:`, res.status); return null; }
    return method === "DELETE" ? true : await res.json();
  } catch (e) { console.error("Supabase error:", e); return null; }
}

// FaceIO removed — using browser camera instead

// ============================================================
// GPS HELPER - Real browser Geolocation API
// ============================================================
function getGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = "Unknown GPS error";
        switch (error.code) {
          case 1: msg = "Location permission denied. Please allow location access."; break;
          case 2: msg = "Location unavailable. Check your device settings."; break;
          case 3: msg = "Location request timed out. Try again."; break;
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// ============================================================
// TRANSLATIONS (English + Arabic)
// ============================================================
const T = {
  en: {
    appName: "myMayz HR",
    tagline: "Smart HR Automation Platform",
    login: "Sign In",
    logout: "Sign Out",
    email: "Email",
    password: "Password",
    employee: "Employee",
    manager: "Manager",
    admin: "Admin",
    role: "Role",
    welcome: "Welcome back",
    dashboard: "Dashboard",
    employees: "Employee Affairs",
    orgChart: "Org Structure",
    attendance: "Attendance",
    payroll: "Payroll",
    selfService: "Self-Service",
    settings: "Settings",
    reports: "Reports",
    totalEmployees: "Total Employees",
    presentToday: "Present Today",
    onLeave: "On Leave",
    pendingRequests: "Pending Requests",
    avgAttendance: "Avg Attendance",
    payrollDue: "Payroll Due",
    search: "Search employees...",
    addEmployee: "Add Employee",
    name: "Name",
    empNumber: "Employee #",
    department: "Department",
    position: "Position",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    actions: "Actions",
    view: "View",
    edit: "Edit",
    delete: "Delete",
    clockIn: "Clock In",
    clockOut: "Clock Out",
    gpsLocation: "GPS Location",
    faceRecognition: "Face Recognition",
    locationVerified: "Location Verified",
    faceVerified: "Face Verified",
    todayHours: "Today's Hours",
    weeklyHours: "Weekly Hours",
    overtime: "Overtime",
    lateArrivals: "Late Arrivals",
    earlyDepartures: "Early Departures",
    absences: "Absences",
    attendanceLog: "Attendance Log",
    date: "Date",
    checkIn: "Check In",
    checkOut: "Check Out",
    hoursWorked: "Hours Worked",
    baseSalary: "Base Salary",
    allowances: "Allowances",
    deductions: "Deductions",
    netSalary: "Net Salary",
    totalPayroll: "Total Payroll",
    processPayroll: "Process Payroll",
    downloadPayslip: "Download Payslip",
    leaveBalance: "Leave Balance",
    requestLeave: "Request Leave",
    leaveType: "Leave Type",
    startDate: "Start Date",
    endDate: "End Date",
    reason: "Reason",
    submit: "Submit",
    cancel: "Cancel",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    annualLeave: "Annual Leave",
    sickLeave: "Sick Leave",
    personalLeave: "Personal Leave",
    myRequests: "My Requests",
    myPayslips: "My Payslips",
    myAttendance: "My Attendance",
    notifications: "Notifications",
    profile: "Profile",
    ceo: "CEO",
    cto: "CTO",
    cfo: "CFO",
    hrDirector: "HR Director",
    engineering: "Engineering",
    finance: "Finance",
    humanResources: "Human Resources",
    marketing: "Marketing",
    operations: "Operations",
    selectLanguage: "Language",
    maritalStatus: "Marital Status",
    bankInfo: "Bank Information",
    documents: "Documents",
    passport: "Passport",
    certificate: "Certificate",
    contract: "Contract",
    uploadDoc: "Upload Document",
    experienceCert: "Experience Certificate",
    addressedLetter: "Addressed Letter",
    modifyHours: "Modify Work Hours",
    surveys: "Surveys & Feedback",
    companyAnnouncements: "Company Announcements",
    monthly: "Monthly",
    weekly: "Weekly",
    daily: "Daily",
    generateReport: "Generate Report",
    attendanceReport: "Attendance Report",
    payrollReport: "Payroll Report",
    employeeReport: "Employee Report",
    processing: "Processing...",
    success: "Success!",
    clockedInAt: "Clocked in at",
    clockedOutAt: "Clocked out at",
    verifying: "Verifying...",
    scanFace: "Scan Face",
    detectingLocation: "Detecting Location...",
    locationDetected: "Location Detected",
    automationHub: "Automation Hub",
    makeIntegration: "Make.com Integration",
    zapierIntegration: "Zapier Integration",
    apiWebhooks: "API & Webhooks",
    fingerprintDevice: "Fingerprint Device",
    smartCard: "Smart Card",
    mobileApp: "Mobile App",
    attendanceMethods: "Attendance Methods",
    save: "Save",
    close: "Close",
    leaveRequest: "Leave Request",
    remaining: "remaining",
    days: "days",
    used: "used",
    of: "of",
    taxDeductions: "Tax Deductions",
    insurance: "Insurance",
    incentives: "Incentives",
    bonuses: "Bonuses",
    bankTransfer: "Bank Transfer",
    gpsError: "GPS Error",
    faceError: "Face Recognition Error",
    loginError: "Login failed. Check your email and password.",
    locationAt: "Location",
    tryAgain: "Try Again",
    skipFace: "Skip Face (Admin)",
  },
  ar: {
    appName: "myMayz HR",
    tagline: "منصة أتمتة الموارد البشرية الذكية",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    employee: "موظف",
    manager: "مدير",
    admin: "مشرف",
    role: "الدور",
    welcome: "مرحباً بعودتك",
    dashboard: "لوحة التحكم",
    employees: "شؤون الموظفين",
    orgChart: "الهيكل التنظيمي",
    attendance: "الحضور والانصراف",
    payroll: "الرواتب",
    selfService: "الخدمة الذاتية",
    settings: "الإعدادات",
    reports: "التقارير",
    totalEmployees: "إجمالي الموظفين",
    presentToday: "الحاضرون اليوم",
    onLeave: "في إجازة",
    pendingRequests: "طلبات معلقة",
    avgAttendance: "متوسط الحضور",
    payrollDue: "موعد الرواتب",
    search: "البحث عن موظفين...",
    addEmployee: "إضافة موظف",
    name: "الاسم",
    empNumber: "رقم الموظف",
    department: "القسم",
    position: "المنصب",
    status: "الحالة",
    active: "نشط",
    inactive: "غير نشط",
    actions: "الإجراءات",
    view: "عرض",
    edit: "تعديل",
    delete: "حذف",
    clockIn: "تسجيل حضور",
    clockOut: "تسجيل انصراف",
    gpsLocation: "موقع GPS",
    faceRecognition: "التعرف على الوجه",
    locationVerified: "تم التحقق من الموقع",
    faceVerified: "تم التحقق من الوجه",
    todayHours: "ساعات اليوم",
    weeklyHours: "ساعات الأسبوع",
    overtime: "العمل الإضافي",
    lateArrivals: "التأخيرات",
    earlyDepartures: "المغادرة المبكرة",
    absences: "الغيابات",
    attendanceLog: "سجل الحضور",
    date: "التاريخ",
    checkIn: "وقت الحضور",
    checkOut: "وقت الانصراف",
    hoursWorked: "ساعات العمل",
    baseSalary: "الراتب الأساسي",
    allowances: "البدلات",
    deductions: "الخصومات",
    netSalary: "صافي الراتب",
    totalPayroll: "إجمالي الرواتب",
    processPayroll: "معالجة الرواتب",
    downloadPayslip: "تحميل كشف الراتب",
    leaveBalance: "رصيد الإجازات",
    requestLeave: "طلب إجازة",
    leaveType: "نوع الإجازة",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    reason: "السبب",
    submit: "إرسال",
    cancel: "إلغاء",
    pending: "معلق",
    approved: "موافق عليه",
    rejected: "مرفوض",
    annualLeave: "إجازة سنوية",
    sickLeave: "إجازة مرضية",
    personalLeave: "إجازة شخصية",
    myRequests: "طلباتي",
    myPayslips: "كشوف رواتبي",
    myAttendance: "حضوري",
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    ceo: "الرئيس التنفيذي",
    cto: "المدير التقني",
    cfo: "المدير المالي",
    hrDirector: "مدير الموارد البشرية",
    engineering: "الهندسة",
    finance: "المالية",
    humanResources: "الموارد البشرية",
    marketing: "التسويق",
    operations: "العمليات",
    selectLanguage: "اللغة",
    maritalStatus: "الحالة الاجتماعية",
    bankInfo: "المعلومات البنكية",
    documents: "المستندات",
    passport: "جواز السفر",
    certificate: "الشهادة",
    contract: "العقد",
    uploadDoc: "رفع مستند",
    experienceCert: "شهادة خبرة",
    addressedLetter: "خطاب موجه",
    modifyHours: "تعديل ساعات العمل",
    surveys: "الاستبيانات والملاحظات",
    companyAnnouncements: "إعلانات الشركة",
    monthly: "شهري",
    weekly: "أسبوعي",
    daily: "يومي",
    generateReport: "إنشاء تقرير",
    attendanceReport: "تقرير الحضور",
    payrollReport: "تقرير الرواتب",
    employeeReport: "تقرير الموظفين",
    processing: "جاري المعالجة...",
    success: "تم بنجاح!",
    clockedInAt: "تم تسجيل الحضور في",
    clockedOutAt: "تم تسجيل الانصراف في",
    verifying: "جاري التحقق...",
    scanFace: "مسح الوجه",
    detectingLocation: "جاري تحديد الموقع...",
    locationDetected: "تم تحديد الموقع",
    automationHub: "مركز الأتمتة",
    makeIntegration: "تكامل Make.com",
    zapierIntegration: "تكامل Zapier",
    apiWebhooks: "واجهات API",
    fingerprintDevice: "جهاز البصمة",
    smartCard: "البطاقة الذكية",
    mobileApp: "تطبيق الجوال",
    attendanceMethods: "طرق الحضور",
    save: "حفظ",
    close: "إغلاق",
    leaveRequest: "طلب إجازة",
    remaining: "متبقي",
    days: "يوم",
    used: "مستخدم",
    of: "من",
    taxDeductions: "خصم الضرائب",
    insurance: "التأمين",
    incentives: "الحوافز",
    bonuses: "المكافآت",
    bankTransfer: "تحويل بنكي",
    gpsError: "خطأ في GPS",
    faceError: "خطأ في التعرف على الوجه",
    loginError: "فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.",
    locationAt: "الموقع",
    tryAgain: "حاول مرة أخرى",
    skipFace: "تخطي الوجه (مشرف)",
  },
};

// Fallback employees if Supabase has no data or key is missing
const fallbackEmployees = [
  { id: "EMP001", name: "Ahmed Kardous", nameAr: "أحمد كردوس", dept: "Management", deptAr: "الإدارة", position: "CEO / HR Manager", positionAr: "الرئيس التنفيذي / مدير الموارد البشرية", status: "active", salary: 25000, avatar: "AK", email: "hello@mymayz.com" },
];

const attendanceLogs = [
  { date: "2026-03-26", empId: "EMP001", checkIn: "08:02", checkOut: "17:05", hours: "9:03", status: "present", lat: 30.0444, lng: 31.2357 },
  { date: "2026-03-25", empId: "EMP001", checkIn: "08:15", checkOut: "17:00", hours: "8:45", status: "late" },
  { date: "2026-03-24", empId: "EMP001", checkIn: "07:58", checkOut: "17:30", hours: "9:32", status: "present" },
  { date: "2026-03-23", empId: "EMP001", checkIn: "08:00", checkOut: "16:30", hours: "8:30", status: "early-departure" },
  { date: "2026-03-22", empId: "EMP001", checkIn: null, checkOut: null, hours: "0:00", status: "absent" },
];

const orgData = {
  name: "CEO", nameAr: "الرئيس التنفيذي", person: "Ahmed Kardous", personAr: "أحمد كردوس",
  children: [
    {
      name: "CTO", nameAr: "المدير التقني", person: "TBD", personAr: "لم يحدد بعد",
      children: [
        { name: "Engineering", nameAr: "الهندسة", person: "—", personAr: "—" },
        { name: "QA", nameAr: "ضمان الجودة", person: "—", personAr: "—" },
      ],
    },
    {
      name: "CFO", nameAr: "المدير المالي", person: "TBD", personAr: "لم يحدد بعد",
      children: [
        { name: "Finance", nameAr: "المالية", person: "—", personAr: "—" },
        { name: "Accounting", nameAr: "المحاسبة", person: "—", personAr: "—" },
      ],
    },
    {
      name: "HR Director", nameAr: "مدير الموارد البشرية", person: "Ahmed Kardous", personAr: "أحمد كردوس",
      children: [
        { name: "Recruitment", nameAr: "التوظيف", person: "—", personAr: "—" },
        { name: "Training", nameAr: "التدريب", person: "—", personAr: "—" },
      ],
    },
  ],
};

// ============================================================
// CSS (unchanged except branding color tweak)
// ============================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg-primary: #0a0e1a; --bg-secondary: #111827; --bg-card: #1a2035; --bg-card-hover: #1f2847;
    --border: #2a3454; --border-light: #374068;
    --text-primary: #f0f2f8; --text-secondary: #8b95b0; --text-muted: #5a6580;
    --accent: #6366f1; --accent-hover: #818cf8; --accent-glow: rgba(99,102,241,0.15);
    --success: #10b981; --success-bg: rgba(16,185,129,0.12);
    --warning: #f59e0b; --warning-bg: rgba(245,158,11,0.12);
    --danger: #ef4444; --danger-bg: rgba(239,68,68,0.12);
    --info: #3b82f6; --info-bg: rgba(59,130,246,0.12);
    --sidebar-width: 260px; --radius: 12px; --radius-sm: 8px; --radius-lg: 16px;
    --shadow: 0 4px 24px rgba(0,0,0,0.3);
    --font-en: 'DM Sans', sans-serif; --font-ar: 'IBM Plex Sans Arabic', sans-serif;
  }
  body, #root { font-family: var(--font-en); background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; }
  [dir="rtl"] body, [dir="rtl"] #root, .rtl { font-family: var(--font-ar); }
  .app { display: flex; min-height: 100vh; direction: ltr; }
  .app.rtl { direction: rtl; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: var(--bg-secondary); } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0a0e1a 0%, #1a1040 50%, #0a0e1a 100%); position: relative; overflow: hidden; }
  .login-page::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 40%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(16,185,129,0.06) 0%, transparent 50%); animation: loginGlow 15s ease-in-out infinite; }
  @keyframes loginGlow { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
  .login-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 48px; width: 420px; max-width: 90vw; position: relative; z-index: 1; box-shadow: 0 8px 48px rgba(0,0,0,0.5); }
  .login-logo { font-size: 28px; font-weight: 700; text-align: center; margin-bottom: 8px; }
  .login-logo span { color: var(--accent); }
  .login-tagline { text-align: center; color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; }
  .login-field { margin-bottom: 20px; }
  .login-field label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
  .login-field input, .login-field select { width: 100%; padding: 12px 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; outline: none; transition: border-color 0.2s; font-family: inherit; }
  .login-field input:focus, .login-field select:focus { border-color: var(--accent); }
  .login-btn { width: 100%; padding: 14px; background: var(--accent); color: white; border: none; border-radius: var(--radius-sm); font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; margin-top: 8px; }
  .login-btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
  .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .login-error { background: var(--danger-bg); color: var(--danger); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 16px; text-align: center; }
  .login-lang { display: flex; justify-content: center; gap: 16px; margin-top: 24px; }
  .login-lang button { background: none; border: 1px solid var(--border); color: var(--text-secondary); padding: 6px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; transition: all 0.2s; font-family: inherit; }
  .login-lang button.active { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
  .sidebar { width: var(--sidebar-width); background: var(--bg-secondary); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; z-index: 100; transition: transform 0.3s; }
  .rtl .sidebar { border-right: none; border-left: 1px solid var(--border); }
  .sidebar-header { padding: 24px 20px 16px; border-bottom: 1px solid var(--border); }
  .sidebar-logo { font-size: 20px; font-weight: 700; }
  .sidebar-logo span { color: var(--accent); }
  .sidebar-nav { flex: 1; padding: 12px 8px; overflow-y: auto; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-sm); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; font-size: 14px; font-weight: 500; margin-bottom: 2px; text-decoration: none; border: none; background: none; width: 100%; font-family: inherit; }
  .nav-item:hover { background: var(--bg-card); color: var(--text-primary); }
  .nav-item.active { background: var(--accent-glow); color: var(--accent); }
  .nav-item svg { width: 20px; height: 20px; flex-shrink: 0; }
  .nav-badge { margin-left: auto; background: var(--danger); color: white; font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
  .rtl .nav-badge { margin-left: 0; margin-right: auto; }
  .sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
  .sidebar-user { display: flex; align-items: center; gap: 12px; }
  .sidebar-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: white; flex-shrink: 0; }
  .sidebar-user-info { flex: 1; min-width: 0; }
  .sidebar-user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-user-role { font-size: 11px; color: var(--text-muted); }
  .main { flex: 1; margin-left: var(--sidebar-width); min-height: 100vh; }
  .rtl .main { margin-left: 0; margin-right: var(--sidebar-width); }
  .topbar { height: 64px; background: var(--bg-secondary); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 28px; position: sticky; top: 0; z-index: 50; }
  .topbar-title { font-size: 18px; font-weight: 600; }
  .topbar-actions { display: flex; align-items: center; gap: 12px; }
  .topbar-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px; transition: all 0.15s; font-family: inherit; }
  .topbar-btn:hover { border-color: var(--accent); color: var(--accent); }
  .topbar-btn svg { width: 16px; height: 16px; }
  .lang-toggle { background: var(--accent-glow); border: 1px solid var(--accent); color: var(--accent); padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: all 0.2s; }
  .lang-toggle:hover { background: var(--accent); color: white; }
  .content { padding: 28px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: all 0.2s; cursor: default; }
  .stat-card:hover { border-color: var(--border-light); transform: translateY(-2px); box-shadow: var(--shadow); }
  .stat-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; font-size: 18px; }
  .stat-icon.blue { background: var(--info-bg); color: var(--info); }
  .stat-icon.green { background: var(--success-bg); color: var(--success); }
  .stat-icon.yellow { background: var(--warning-bg); color: var(--warning); }
  .stat-icon.red { background: var(--danger-bg); color: var(--danger); }
  .stat-icon.purple { background: var(--accent-glow); color: var(--accent); }
  .stat-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
  .stat-label { font-size: 13px; color: var(--text-secondary); }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 20px; }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .card-title { font-size: 16px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 12px; color: var(--text-muted); font-weight: 600; padding: 12px 16px; border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.5px; }
  .rtl th { text-align: right; }
  td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid var(--border); color: var(--text-secondary); }
  tr:hover td { background: var(--bg-card-hover); }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge.green { background: var(--success-bg); color: var(--success); }
  .badge.red { background: var(--danger-bg); color: var(--danger); }
  .badge.yellow { background: var(--warning-bg); color: var(--warning); }
  .badge.blue { background: var(--info-bg); color: var(--info); }
  .badge.purple { background: var(--accent-glow); color: var(--accent); }
  .btn { padding: 10px 20px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: none; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
  .btn-outline:hover { border-color: var(--accent); color: var(--accent); }
  .btn-success { background: var(--success); color: white; }
  .btn-danger { background: var(--danger); color: white; }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .emp-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent-glow); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .emp-row { display: flex; align-items: center; gap: 12px; }
  .clock-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .clock-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px; text-align: center; position: relative; overflow: hidden; }
  .clock-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .clock-card.in::before { background: var(--success); }
  .clock-card.out::before { background: var(--danger); }
  .clock-time { font-size: 48px; font-weight: 700; margin: 16px 0 8px; font-variant-numeric: tabular-nums; }
  .clock-date { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
  .clock-btn { padding: 16px 48px; border-radius: var(--radius); font-size: 16px; font-weight: 700; cursor: pointer; border: none; color: white; transition: all 0.2s; font-family: inherit; }
  .clock-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .clock-btn.in { background: var(--success); }
  .clock-btn.in:hover:not(:disabled) { background: #0d9d6e; transform: scale(1.02); }
  .clock-btn.out { background: var(--danger); }
  .clock-btn.out:hover:not(:disabled) { background: #dc2626; transform: scale(1.02); }
  .verify-steps { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
  .verify-step { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-secondary); border-radius: var(--radius-sm); font-size: 13px; }
  .verify-step.error { background: var(--danger-bg); color: var(--danger); }
  .verify-step.success { background: var(--success-bg); }
  .verify-icon { font-size: 18px; }
  .verify-icon.done { color: var(--success); }
  .verify-icon.wait { color: var(--text-muted); }
  .verify-icon.err { color: var(--danger); }
  .gps-coords { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
  .org-tree { display: flex; flex-direction: column; align-items: center; padding: 20px; overflow-x: auto; }
  .org-node { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 24px; text-align: center; min-width: 160px; transition: all 0.2s; }
  .org-node:hover { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
  .org-node-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
  .org-node-person { font-size: 12px; color: var(--text-muted); }
  .org-children { display: flex; gap: 16px; margin-top: 16px; position: relative; }
  .org-connector { display: flex; flex-direction: column; align-items: center; }
  .org-line { width: 1px; height: 16px; background: var(--border); }
  .payroll-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .payroll-item { background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 16px; text-align: center; }
  .payroll-item-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
  .payroll-item-value { font-size: 22px; font-weight: 700; }
  .payroll-item-value.green { color: var(--success); }
  .payroll-item-value.red { color: var(--danger); }
  .ss-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .ss-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; cursor: pointer; transition: all 0.2s; }
  .ss-card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .ss-card-icon { font-size: 28px; margin-bottom: 12px; }
  .ss-card-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
  .ss-card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
  .leave-balances { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .leave-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .leave-type { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
  .leave-bar-bg { height: 8px; background: var(--bg-secondary); border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
  .leave-bar { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
  .leave-bar.green { background: var(--success); } .leave-bar.yellow { background: var(--warning); } .leave-bar.blue { background: var(--info); }
  .leave-info { font-size: 12px; color: var(--text-muted); }
  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
  .modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 32px; width: 500px; max-width: 100%; max-height: 80vh; overflow-y: auto; }
  .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 14px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.2s; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--accent); }
  .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
  .auto-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .auto-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; transition: all 0.2s; }
  .auto-card:hover { border-color: var(--accent); }
  .auto-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .auto-card-logo { width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 20px; }
  .auto-card-title { font-size: 15px; font-weight: 600; }
  .auto-card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
  .auto-status { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; font-size: 12px; }
  .auto-dot { width: 8px; height: 8px; border-radius: 50%; }
  .auto-dot.green { background: var(--success); } .auto-dot.yellow { background: var(--warning); }
  .search-bar { position: relative; margin-bottom: 20px; }
  .search-bar input { width: 100%; padding: 12px 16px 12px 44px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; outline: none; font-family: inherit; }
  .rtl .search-bar input { padding: 12px 44px 12px 16px; }
  .search-bar input:focus { border-color: var(--accent); }
  .search-bar svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--text-muted); }
  .rtl .search-bar svg { left: auto; right: 14px; }
  .notif-dot { position: relative; }
  .notif-dot::after { content: ''; position: absolute; top: -2px; right: -2px; width: 8px; height: 8px; background: var(--danger); border-radius: 50%; border: 2px solid var(--bg-secondary); }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse { animation: pulse 1.5s ease-in-out infinite; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .stagger-1 { animation: slideUp 0.4s ease 0.05s both; } .stagger-2 { animation: slideUp 0.4s ease 0.1s both; }
  .stagger-3 { animation: slideUp 0.4s ease 0.15s both; } .stagger-4 { animation: slideUp 0.4s ease 0.2s both; }
  .stagger-5 { animation: slideUp 0.4s ease 0.25s both; } .stagger-6 { animation: slideUp 0.4s ease 0.3s both; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid var(--text-muted); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); } .rtl .sidebar { transform: translateX(100%); }
    .sidebar.open { transform: translateX(0); }
    .main { margin-left: 0 !important; margin-right: 0 !important; }
    .clock-section { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: 1fr 1fr; }
    .content { padding: 16px; } .topbar { padding: 0 16px; }
    .mobile-menu { display: block !important; }
  }
`;

// ============================================================
// ICONS
// ============================================================
const Icons = {
  Dashboard: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  OrgChart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="2" y="14" width="6" height="4" rx="1"/><rect x="9" y="14" width="6" height="4" rx="1"/><rect x="16" y="14" width="6" height="4" rx="1"/><line x1="12" y1="6" x2="12" y2="14"/><line x1="5" y1="14" x2="5" y2="10"/><line x1="12" y1="10" x2="5" y2="10"/><line x1="19" y1="14" x2="19" y2="10"/><line x1="12" y1="10" x2="19" y2="10"/></svg>,
  Clock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Dollar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  SelfService: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Bell: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Menu: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Logout: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Automation: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  MapPin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Camera: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  File: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Report: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
};

// ============================================================
// COMPONENTS
// ============================================================
function LoginPage({ lang, setLang, onLogin }) {
  const t = T[lang];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      // Try Supabase Auth
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        onLogin("admin", data.user, data.access_token);
        return;
      }
    } catch (e) { console.warn("Supabase auth error:", e); }

    // Fallback: accept known demo credentials
    if ((email === "hello@mymayz.com" && password === "Ghalia@0902") ||
        (email === "admin@peopleflow.com" && password === "demo123")) {
      onLogin("admin", { email, id: "demo" }, null);
    } else {
      setError(t.loginError);
    }
    setLoading(false);
  };

  return (
    <div className={`login-page ${lang === "ar" ? "rtl" : ""}`} style={{ fontFamily: lang === "ar" ? "var(--font-ar)" : "var(--font-en)" }}>
      <div className="login-card fade-in">
        <div className="login-logo">my<span>Mayz</span> HR</div>
        <div className="login-tagline">{t.tagline}</div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-field">
          <label>{t.email}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hello@mymayz.com" />
        </div>
        <div className="login-field">
          <label>{t.password}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
        <button className="login-btn" onClick={handleSubmit} disabled={loading || !email || !password}>
          {loading ? <><span className="spinner" /> {t.processing}</> : t.login}
        </button>
        <div className="login-lang">
          <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>English</button>
          <button className={lang === "ar" ? "active" : ""} onClick={() => setLang("ar")}>العربية</button>
        </div>
      </div>
    </div>
  );
}

function OrgChartNode({ node, lang }) {
  return (
    <div className="org-connector">
      <div className="org-node">
        <div className="org-node-title">{lang === "ar" ? node.nameAr : node.name}</div>
        <div className="org-node-person">{lang === "ar" ? node.personAr : node.person}</div>
      </div>
      {node.children && (
        <>
          <div className="org-line" />
          <div className="org-children">
            {node.children.map((child, i) => <OrgChartNode key={i} node={child} lang={lang} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Modal({ show, onClose, title, children }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function HRApp() {
  const [lang, setLang] = useState("en");
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState("admin");
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  // Attendance state
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [gpsVerified, setGpsVerified] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [verifying, setVerifying] = useState(null); // null | "gps" | "face" | "saving"
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState(fallbackEmployees);
  const [dbAttendanceLogs, setDbAttendanceLogs] = useState(attendanceLogs);

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [pendingClockTime, setPendingClockTime] = useState(null);

  // Camera photo capture
  const capturePhoto = () => new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(stream => {
        video.srcObject = stream;
        video.play();
        setTimeout(() => {
          canvas.width = 320;
          canvas.height = 240;
          canvas.getContext("2d").drawImage(video, 0, 0, 320, 240);
          stream.getTracks().forEach(t => t.stop());
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        }, 1500);
      })
      .catch(err => reject(err));
  });



  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load employees from Supabase on login
  useEffect(() => {
    if (loggedIn && SUPABASE_ANON_KEY) {
      supabaseQuery("employees", "GET", null, "?select=*").then(data => {
        if (data && data.length > 0) {
          const mapped = data.map(e => ({
            id: e.employee_id || e.id,
            name: e.name || e.full_name || "Unknown",
            nameAr: e.name_ar || e.name || "",
            dept: e.department || "General",
            deptAr: e.department_ar || e.department || "",
            position: e.position || e.role || "",
            positionAr: e.position_ar || e.position || "",
            status: e.status || "active",
            salary: e.salary || 0,
            avatar: (e.name || "U").substring(0, 2).toUpperCase(),
            email: e.email || "",
          }));
          setEmployees(mapped);
        }
      });
      // Load attendance logs
      supabaseQuery("attendance", "GET", null, "?select=*&order=date.desc&limit=10").then(data => {
        if (data && data.length > 0) {
          const mapped = data.map(a => ({
            date: a.date,
            empId: a.employee_id,
            checkIn: a.check_in ? new Date(a.check_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : null,
            checkOut: a.check_out ? new Date(a.check_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : null,
            hours: a.hours_worked || "0:00",
            status: a.status || "present",
            lat: a.gps_lat,
            lng: a.gps_lng,
          }));
          setDbAttendanceLogs(mapped);
        }
      });
    }
  }, [loggedIn]);

  const handleLogin = (r, user, token) => {
    setRole(r);
    setCurrentUser(user);
    setAuthToken(token);
    setLoggedIn(true);
  };
  const handleLogout = () => {
    setLoggedIn(false);
    setPage("dashboard");
    setClockedIn(false);
    setGpsVerified(false);
    setFaceVerified(false);
    setGpsLocation(null);
    setGpsError("");
    setFaceError("");
    setVerifying(null);
  };

  // ============================================================
  // REAL CLOCK IN — GPS → Camera Photo → Save to Supabase
  // ============================================================
  const handleClockIn = async () => {
    setGpsError("");
    setFaceError("");
    setGpsVerified(false);
    setFaceVerified(false);
    setGpsLocation(null);
    setCapturedPhoto(null);

    // STEP 1: Real GPS
    setVerifying("gps");
    let loc;
    try {
      loc = await getGPSLocation();
      setGpsLocation(loc);
      setGpsVerified(true);
    } catch (err) {
      setGpsError(err.message);
      setVerifying(null);
      return;
    }

    // STEP 2: Camera photo
    setVerifying("face");
    try {
      const photoBase64 = await capturePhoto();
      setCapturedPhoto(photoBase64);
      setFaceVerified(true);
    } catch (err) {
      setFaceError(err.message || "Camera access denied. Please allow camera and try again.");
      setVerifying(null);
      return;
    }

    // STEP 3: Save to Supabase
    setVerifying("saving");
    const clockTime = new Date();

    // Determine location label
    const officeLat = 29.9921;
    const officeLng = 31.0316;
    const distKm = Math.sqrt(Math.pow(loc.lat - officeLat, 2) + Math.pow(loc.lng - officeLng, 2)) * 111;
    const locationLabel = distKm < 0.5 ? "Office" : null;
    setLocationLabel(locationLabel);

    if (!locationLabel) {
      setShowLocationModal(true);
      setVerifying(null);
      setPendingClockTime(clockTime);
      return;
    }

    await saveAttendance(clockTime, loc, locationLabel);
  };

  const saveAttendance = async (clockTime, loc, locationLabel) => {
    setVerifying("saving");
    if (SUPABASE_ANON_KEY) {
      await supabaseQuery("attendance", "POST", {
        employee_id: currentUser?.id || "EMP001",
        date: clockTime.toISOString().split("T")[0],
        check_in: clockTime.toISOString(),
        gps_lat: loc?.lat || gpsLocation?.lat || null,
        gps_lng: loc?.lng || gpsLocation?.lng || null,
        face_photo: capturedPhoto || null,
        location_label: locationLabel,
        status: clockTime.getHours() >= 8 && clockTime.getMinutes() > 15 ? "late" : "present",
      });
    }
    setClockedIn(true);
    setClockInTime(clockTime);
    setVerifying(null);
  };



  const handleClockOut = async () => {
    const clockTime = new Date();
    if (SUPABASE_ANON_KEY && clockInTime) {
      const today = clockTime.toISOString().split("T")[0];
      // Update today's attendance record with check_out
      await supabaseQuery(
        "attendance",
        "PATCH",
        { check_out: clockTime.toISOString() },
        `?employee_id=eq.${currentUser?.id || "EMP001"}&date=eq.${today}`
      );
    }
    setClockedIn(false);
    setClockInTime(null);
    setGpsVerified(false);
    setFaceVerified(false);
    setGpsLocation(null);
    setVerifying(null);
  };

  const t = T[lang];
  const isRTL = lang === "ar";

  const timeStr = now.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const filteredEmployees = employees.filter(emp => {
    const n = lang === "ar" ? emp.nameAr : emp.name;
    return n.toLowerCase().includes(searchQuery.toLowerCase()) || emp.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!loggedIn) return (
    <>
      <style>{css}</style>
      <LoginPage lang={lang} setLang={setLang} onLogin={handleLogin} />
    </>
  );

  const navItems = [
    { id: "dashboard", icon: <Icons.Dashboard />, label: t.dashboard },
    { id: "employees", icon: <Icons.Users />, label: t.employees },
    { id: "orgchart", icon: <Icons.OrgChart />, label: t.orgChart },
    { id: "attendance", icon: <Icons.Clock />, label: t.attendance },
    { id: "payroll", icon: <Icons.Dollar />, label: t.payroll },
    { id: "selfservice", icon: <Icons.SelfService />, label: t.selfService, badge: 3 },
    { id: "automation", icon: <Icons.Automation />, label: t.automationHub },
    { id: "reports", icon: <Icons.Report />, label: t.reports },
    { id: "settings", icon: <Icons.Settings />, label: t.settings },
  ];

  // ============================================================
  // RENDER FUNCTIONS (same UI, now with real data)
  // ============================================================
  const renderDashboard = () => (
    <div className="fade-in">
      <div className="stats-grid">
        {[
          { icon: "👥", color: "blue", value: String(employees.length), label: t.totalEmployees, cls: "stagger-1" },
          { icon: "✅", color: "green", value: String(employees.filter(e => e.status === "active").length), label: t.presentToday, cls: "stagger-2" },
          { icon: "🏖️", color: "yellow", value: "0", label: t.onLeave, cls: "stagger-3" },
          { icon: "📋", color: "red", value: "0", label: t.pendingRequests, cls: "stagger-4" },
          { icon: "📊", color: "purple", value: "—", label: t.avgAttendance, cls: "stagger-5" },
          { icon: "💰", color: "green", value: "Mar 28", label: t.payrollDue, cls: "stagger-6" },
        ].map((s, i) => (
          <div className={`stat-card ${s.cls}`} key={i}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">{t.attendanceLog} - {t.daily}</div></div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>{t.name}</th><th>{t.department}</th><th>{t.checkIn}</th><th>{t.checkOut}</th><th>{t.status}</th></tr></thead>
            <tbody>
              {employees.slice(0, 5).map((emp, i) => (
                <tr key={i}>
                  <td><div className="emp-row"><div className="emp-avatar">{emp.avatar}</div><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{isRTL ? emp.nameAr : emp.name}</span></div></td>
                  <td>{isRTL ? emp.deptAr : emp.dept}</td>
                  <td>{clockedIn && i === 0 ? clockInTime?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</td>
                  <td>—</td>
                  <td><span className={`badge ${emp.status === "active" ? "green" : "yellow"}`}>{emp.status === "active" ? t.active : t.onLeave}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderEmployees = () => (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Icons.Search />
          <input placeholder={t.search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <button className="btn btn-primary">{t.addEmployee}</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>{t.empNumber}</th><th>{t.name}</th><th>{t.department}</th><th>{t.position}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead>
            <tbody>
              {filteredEmployees.map((emp, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>{emp.id}</td>
                  <td><div className="emp-row"><div className="emp-avatar">{emp.avatar}</div><div><div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{isRTL ? emp.nameAr : emp.name}</div><div style={{ fontSize: 12, color: "var(--text-muted)" }}>{emp.email || `${emp.id}@mymayz.com`}</div></div></div></td>
                  <td>{isRTL ? emp.deptAr : emp.dept}</td>
                  <td>{isRTL ? emp.positionAr : emp.position}</td>
                  <td><span className={`badge ${emp.status === "active" ? "green" : "red"}`}>{emp.status === "active" ? t.active : t.inactive}</span></td>
                  <td><div style={{ display: "flex", gap: 8 }}><button className="btn btn-outline btn-sm">{t.view}</button><button className="btn btn-outline btn-sm">{t.edit}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderOrgChart = () => (
    <div className="fade-in"><div className="card"><div className="card-header"><div className="card-title">{t.orgChart}</div></div><div className="org-tree"><OrgChartNode node={orgData} lang={lang} /></div></div></div>
  );

  // ============================================================
  // ATTENDANCE — Now with REAL GPS + FaceIO + error states
  // ============================================================
  const renderAttendance = () => (
    <div className="fade-in">
      <div className="clock-section">
        <div className="clock-card in">
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{t.clockIn}</div>
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
          {!clockedIn ? (
            <button className="clock-btn in" onClick={handleClockIn} disabled={!!verifying}>
              {verifying ? <><span className="spinner" /> {t.verifying}</> : t.clockIn}
            </button>
          ) : (
            <div style={{ color: "var(--success)", fontWeight: 600, fontSize: 16 }}>
              ✓ {t.clockedInAt} {clockInTime?.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          <div className="verify-steps">
            {/* GPS Step */}
            <div className={`verify-step ${gpsError ? "error" : gpsVerified ? "success" : ""}`}>
              <span className={`verify-icon ${gpsVerified ? "done" : gpsError ? "err" : "wait"}`}>
                {gpsVerified ? "✓" : gpsError ? "✗" : verifying === "gps" ? <span className="spinner" /> : "○"}
              </span>
              <Icons.MapPin />
              <div>
                <span>{gpsVerified ? t.locationVerified : gpsError ? t.gpsError : verifying === "gps" ? t.detectingLocation : t.gpsLocation}</span>
                {gpsVerified && gpsLocation && (
                  <div className="gps-coords">{gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)} (±{Math.round(gpsLocation.accuracy)}m)</div>
                )}
                {gpsError && <div className="gps-coords" style={{ color: "var(--danger)" }}>{gpsError}</div>}
              </div>
            </div>
            {/* Face/Camera Step */}
            <div className={`verify-step ${faceError ? "error" : faceVerified ? "success" : ""}`}>
              <span className={`verify-icon ${faceVerified ? "done" : faceError ? "err" : "wait"}`}>
                {faceVerified ? "✓" : faceError ? "✗" : verifying === "face" ? <span className="spinner" /> : "○"}
              </span>
              <Icons.Camera />
              <div style={{ flex: 1 }}>
                <span>{faceVerified ? "Photo Captured ✓" : faceError ? t.faceError : verifying === "face" ? "Opening camera..." : "Face Photo"}</span>
                {faceError && <div className="gps-coords" style={{ color: "var(--danger)" }}>{faceError}</div>}
                {capturedPhoto && <img src={capturedPhoto} alt="captured" style={{ width: 60, height: 45, borderRadius: 6, marginTop: 6, objectFit: "cover" }} />}
              </div>
            </div>
          </div>
          {(gpsError || faceError) && !clockedIn && (
            <button className="btn btn-outline" style={{ marginTop: 16, width: "100%" }} onClick={handleClockIn}>
              {t.tryAgain}
            </button>
          )}
        </div>

        <div className="clock-card out">
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{t.clockOut}</div>
          <div className="clock-time">{timeStr}</div>
          <div className="clock-date">{dateStr}</div>
          <button className="clock-btn out" onClick={handleClockOut} disabled={!clockedIn}>
            {t.clockOut}
          </button>
        </div>
      </div>

      {/* Location Modal — shown when employee is outside office */}
      <Modal show={showLocationModal} onClose={() => {}} title="📍 Where are you working from?">
        <p style={{ color: "var(--text-secondary)", marginBottom: 16, fontSize: 14 }}>
          You are outside the office. Please select or enter your work location.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {["Home", "Out of Office", "Client Site", "Other"].map(loc => (
            <button key={loc} className={`btn ${customLocation === loc ? "btn-primary" : "btn-outline"}`}
              onClick={() => setCustomLocation(loc)}>{loc}</button>
          ))}
        </div>
        {customLocation === "Other" && (
          <div className="form-group">
            <input placeholder="Enter location name..." value={customLocation === "Other" ? "" : customLocation}
              onChange={e => setCustomLocation(e.target.value)} />
          </div>
        )}
        <div className="form-actions">
          <button className="btn btn-primary" disabled={!customLocation}
            onClick={async () => {
              setShowLocationModal(false);
              await saveAttendance(pendingClockTime, gpsLocation, customLocation);
            }}>
            Confirm & Clock In
          </button>
        </div>
      </Modal>

      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {[
          { label: t.todayHours, value: clockedIn ? "Working..." : "0:00" },
          { label: t.weeklyHours, value: "—" },
          { label: t.overtime, value: "—" },
          { label: t.lateArrivals, value: "—" },
          { label: t.earlyDepartures, value: "—" },
          { label: t.absences, value: "—" },
        ].map((s, i) => (
          <div className="stat-card" key={i}><div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">{t.attendanceLog}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t.attendanceMethods}: GPS | {t.faceRecognition} | {t.fingerprintDevice}</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>{t.date}</th><th>{t.checkIn}</th><th>{t.checkOut}</th><th>{t.hoursWorked}</th><th>{t.status}</th></tr></thead>
            <tbody>
              {dbAttendanceLogs.map((log, i) => (
                <tr key={i}>
                  <td>{log.date}</td><td>{log.checkIn || "—"}</td><td>{log.checkOut || "—"}</td><td>{log.hours}</td>
                  <td><span className={`badge ${log.status === "present" ? "green" : log.status === "late" ? "yellow" : log.status === "absent" ? "red" : "blue"}`}>{log.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPayroll = () => (
    <div className="fade-in">
      <div className="payroll-summary">
        {[{ label: t.totalPayroll, value: `EGP ${employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}`, cls: "" }, { label: t.baseSalary, value: `EGP ${employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}`, cls: "" }, { label: t.allowances, value: `EGP ${Math.round(employees.reduce((s, e) => s + (e.salary || 0), 0) * 0.2).toLocaleString()}`, cls: "green" }, { label: t.deductions, value: `EGP ${Math.round(employees.reduce((s, e) => s + (e.salary || 0), 0) * 0.08).toLocaleString()}`, cls: "red" }].map((p, i) => (
          <div className="payroll-item" key={i}><div className="payroll-item-label">{p.label}</div><div className={`payroll-item-value ${p.cls}`}>{p.value}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">{t.payroll}</div><button className="btn btn-primary">{t.processPayroll}</button></div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>{t.name}</th><th>{t.baseSalary}</th><th>{t.allowances}</th><th>{t.deductions}</th><th>{t.netSalary}</th><th>{t.actions}</th></tr></thead>
            <tbody>{employees.map((emp, i) => { const a = Math.round((emp.salary||0)*0.2), d = Math.round((emp.salary||0)*0.08), n = (emp.salary||0)+a-d; return (
              <tr key={i}><td><div className="emp-row"><div className="emp-avatar">{emp.avatar}</div><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{isRTL ? emp.nameAr : emp.name}</span></div></td><td>EGP {(emp.salary||0).toLocaleString()}</td><td style={{ color: "var(--success)" }}>+EGP {a.toLocaleString()}</td><td style={{ color: "var(--danger)" }}>-EGP {d.toLocaleString()}</td><td style={{ fontWeight: 700, color: "var(--text-primary)" }}>EGP {n.toLocaleString()}</td><td><button className="btn btn-outline btn-sm">{t.downloadPayslip}</button></td></tr>
            ); })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSelfService = () => (
    <div className="fade-in">
      <div className="leave-balances">
        {[{ type: t.annualLeave, used: 0, total: 21, color: "green" }, { type: t.sickLeave, used: 0, total: 15, color: "yellow" }, { type: t.personalLeave, used: 0, total: 5, color: "blue" }].map((leave, i) => (
          <div className="leave-card" key={i}><div className="leave-type">{leave.type}</div><div className="leave-bar-bg"><div className={`leave-bar ${leave.color}`} style={{ width: `${(leave.used / leave.total) * 100}%` }} /></div><div className="leave-info">{leave.used} {t.used} {t.of} {leave.total} {t.days} — {leave.total - leave.used} {t.remaining}</div></div>
        ))}
      </div>
      <div style={{ marginBottom: 20 }}><button className="btn btn-primary" onClick={() => setShowLeaveModal(true)}>{t.requestLeave}</button></div>
      <div className="ss-grid">
        {[{ icon: "📋", title: t.myRequests, desc: lang === "ar" ? "تتبع وإدارة جميع طلباتك" : "Track & manage all your requests" }, { icon: "💰", title: t.myPayslips, desc: lang === "ar" ? "عرض وتحميل كشوف الرواتب" : "View & download salary slips" }, { icon: "⏰", title: t.myAttendance, desc: lang === "ar" ? "مراجعة سجل الحضور والانصراف" : "Review attendance history & hours" }, { icon: "📄", title: t.experienceCert, desc: lang === "ar" ? "طلب شهادة خبرة رسمية" : "Request official experience certificate" }, { icon: "✉️", title: t.addressedLetter, desc: lang === "ar" ? "طلب خطابات رسمية" : "Request official addressed letters" }, { icon: "🔔", title: t.notifications, desc: lang === "ar" ? "الإعلانات والإشعارات المهمة" : "Important announcements & alerts" }, { icon: "📝", title: t.surveys, desc: lang === "ar" ? "المشاركة في الاستبيانات" : "Participate in employee surveys" }, { icon: "👤", title: t.profile, desc: lang === "ar" ? "تحديث بياناتك الشخصية" : "Update your personal information" }, { icon: "📑", title: t.documents, desc: lang === "ar" ? "رفع وإدارة المستندات" : "Upload & manage documents" }].map((item, i) => (
          <div className="ss-card" key={i}><div className="ss-card-icon">{item.icon}</div><div className="ss-card-title">{item.title}</div><div className="ss-card-desc">{item.desc}</div></div>
        ))}
      </div>
      <Modal show={showLeaveModal} onClose={() => setShowLeaveModal(false)} title={t.leaveRequest}>
        <div className="form-group"><label>{t.leaveType}</label><select><option>{t.annualLeave}</option><option>{t.sickLeave}</option><option>{t.personalLeave}</option></select></div>
        <div className="form-group"><label>{t.startDate}</label><input type="date" /></div>
        <div className="form-group"><label>{t.endDate}</label><input type="date" /></div>
        <div className="form-group"><label>{t.reason}</label><textarea rows={3} /></div>
        <div className="form-actions"><button className="btn btn-outline" onClick={() => setShowLeaveModal(false)}>{t.cancel}</button><button className="btn btn-primary" onClick={() => setShowLeaveModal(false)}>{t.submit}</button></div>
      </Modal>
    </div>
  );

  const renderAutomation = () => (
    <div className="fade-in">
      <div className="auto-grid">
        {[{ logo: "⚡", title: "Make.com", bg: "var(--accent-glow)", desc: lang === "ar" ? "أتمتة كاملة للعمليات: إشعارات الحضور، معالجة الإجازات، ربط مع أنظمة ERP والمحاسبة" : "Full workflow automation: attendance alerts, leave processing, ERP & accounting integration", status: lang === "ar" ? "متصل" : "Connected", dot: "green" }, { logo: "🔗", title: "Zapier", bg: "var(--warning-bg)", desc: lang === "ar" ? "ربط مع أكثر من 5000 تطبيق: Slack، Google Sheets، البريد الإلكتروني، وأكثر" : "Connect with 5000+ apps: Slack, Google Sheets, Email, and more", status: lang === "ar" ? "متصل" : "Connected", dot: "green" }, { logo: "🔌", title: t.apiWebhooks, bg: "var(--info-bg)", desc: lang === "ar" ? "واجهات REST API وWebhooks للتكامل المخصص مع أي نظام خارجي" : "REST APIs & Webhooks for custom integration with any external system", status: lang === "ar" ? "نشط" : "Active", dot: "green" }, { logo: "👆", title: t.fingerprintDevice, bg: "var(--success-bg)", desc: lang === "ar" ? "تكامل مع أجهزة البصمة ZKTeco وHikvision للحضور والانصراف" : "Integration with ZKTeco & Hikvision fingerprint devices for attendance", status: lang === "ar" ? "مهيأ" : "Configured", dot: "green" }, { logo: "📱", title: t.mobileApp, bg: "var(--accent-glow)", desc: lang === "ar" ? "تطبيق جوال مع GPS والتعرف على الوجه لتسجيل الحضور عن بعد" : "Mobile app with GPS & face recognition for remote attendance", status: lang === "ar" ? "متوفر" : "Available", dot: "green" }, { logo: "💳", title: t.smartCard, bg: "var(--warning-bg)", desc: lang === "ar" ? "تكامل مع بطاقات RFID الذكية للدخول والحضور" : "RFID smart card integration for access control & attendance", status: lang === "ar" ? "قيد الإعداد" : "Setup Required", dot: "yellow" }].map((auto, i) => (
          <div className="auto-card" key={i}><div className="auto-card-header"><div className="auto-card-logo" style={{ background: auto.bg }}>{auto.logo}</div><div className="auto-card-title">{auto.title}</div></div><div className="auto-card-desc">{auto.desc}</div><div className="auto-status"><span className={`auto-dot ${auto.dot}`} /><span style={{ color: auto.dot === "green" ? "var(--success)" : "var(--warning)" }}>{auto.status}</span></div></div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>{lang === "ar" ? "سيناريوهات الأتمتة النشطة" : "Active Automation Scenarios"}</div>
        <div style={{ overflowX: "auto" }}>
          <table><thead><tr><th>{lang === "ar" ? "السيناريو" : "Scenario"}</th><th>{lang === "ar" ? "المنصة" : "Platform"}</th><th>{lang === "ar" ? "المشغل" : "Trigger"}</th><th>{t.status}</th></tr></thead>
            <tbody>{[{ scenario: lang === "ar" ? "إشعار تأخير الحضور" : "Late Attendance Alert", platform: "Make.com", trigger: lang === "ar" ? "بعد 08:15 صباحاً" : "After 08:15 AM" }, { scenario: lang === "ar" ? "معالجة طلب الإجازة" : "Leave Request Processing", platform: "Make.com", trigger: lang === "ar" ? "طلب إجازة جديد" : "New leave request" }, { scenario: lang === "ar" ? "إنشاء كشف الراتب" : "Payslip Generation", platform: "Zapier", trigger: lang === "ar" ? "نهاية الشهر" : "End of month" }, { scenario: lang === "ar" ? "رسالة ترحيب بالموظف الجديد" : "New Employee Welcome", platform: "Make.com", trigger: lang === "ar" ? "إضافة موظف جديد" : "New employee added" }, { scenario: lang === "ar" ? "تقرير الحضور الأسبوعي" : "Weekly Attendance Report", platform: "Zapier", trigger: lang === "ar" ? "كل يوم أحد" : "Every Sunday" }].map((s, i) => (
              <tr key={i}><td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{s.scenario}</td><td><span className="badge purple">{s.platform}</span></td><td>{s.trigger}</td><td><span className="badge green">{t.active}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="fade-in"><div className="ss-grid">{[{ icon: "📊", title: t.attendanceReport, desc: lang === "ar" ? "تقارير تفصيلية عن الحضور والانصراف والتأخيرات" : "Detailed attendance, punctuality & absence reports" }, { icon: "💵", title: t.payrollReport, desc: lang === "ar" ? "تقارير الرواتب والبدلات والخصومات" : "Salary, allowances & deductions reports" }, { icon: "👥", title: t.employeeReport, desc: lang === "ar" ? "تقارير عن توزيع الموظفين والأقسام" : "Employee distribution & department reports" }].map((r, i) => (
      <div className="ss-card" key={i}><div className="ss-card-icon">{r.icon}</div><div className="ss-card-title">{r.title}</div><div className="ss-card-desc">{r.desc}</div><button className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>{t.generateReport}</button></div>
    ))}</div></div>
  );

  const renderSettings = () => (
    <div className="fade-in">
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>{t.settings}</div>
        <div className="form-group"><label>{t.selectLanguage}</label><select value={lang} onChange={e => setLang(e.target.value)}><option value="en">English</option><option value="ar">العربية</option></select></div>
        <div className="form-group"><label>{t.attendanceMethods}</label><div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>{[t.faceRecognition, t.gpsLocation, t.fingerprintDevice, t.mobileApp, t.smartCard].map((m, i) => (<span key={i} className="badge blue" style={{ padding: "8px 16px" }}>{m}</span>))}</div></div>
        <div className="form-group" style={{ marginTop: 20 }}>
          <label>FaceIO Status</label>
          <div style={{ marginTop: 8 }}><span className="badge green">Public ID: {FACEIO_PUBLIC_ID}</span></div>
        </div>
        <div className="form-group">
          <label>Supabase Status</label>
          <div style={{ marginTop: 8 }}><span className={`badge ${SUPABASE_ANON_KEY ? "green" : "yellow"}`}>{SUPABASE_ANON_KEY ? "Connected" : "No API Key — using fallback data"}</span></div>
        </div>
      </div>
    </div>
  );

  const pages = { dashboard: renderDashboard, employees: renderEmployees, orgchart: renderOrgChart, attendance: renderAttendance, payroll: renderPayroll, selfservice: renderSelfService, automation: renderAutomation, reports: renderReports, settings: renderSettings };
  const pageTitle = navItems.find(n => n.id === page)?.label || t.dashboard;

  return (
    <>
      <style>{css}</style>
      <div className={`app ${isRTL ? "rtl" : ""}`} style={{ fontFamily: isRTL ? "var(--font-ar)" : "var(--font-en)" }}>
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header"><div className="sidebar-logo">my<span>Mayz</span> HR</div></div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setSidebarOpen(false); }}>
                {item.icon}<span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">AK</div>
              <div className="sidebar-user-info"><div className="sidebar-user-name">Ahmed Kardous</div><div className="sidebar-user-role">{t[role]}</div></div>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}><Icons.Logout /></button>
            </div>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="topbar-btn mobile-menu" style={{ display: "none" }} onClick={() => setSidebarOpen(!sidebarOpen)}><Icons.Menu /></button>
              <div className="topbar-title">{pageTitle}</div>
            </div>
            <div className="topbar-actions">
              <button className="lang-toggle" onClick={() => setLang(lang === "en" ? "ar" : "en")}>{lang === "en" ? "العربية" : "English"}</button>
              <button className="topbar-btn notif-dot"><Icons.Bell /></button>
            </div>
          </header>
          <div className="content">{pages[page]?.()}</div>
        </div>
      </div>
    </>
  );
}
