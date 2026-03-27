# myMayz HR System 👥
### Smart HR Automation Platform | منصة أتمتة الموارد البشرية الذكية

**Live:** https://my-mayz-hr.vercel.app

---

## Features (All Working)

| Module | Features |
|--------|----------|
| **Employee Affairs** | Directory, profiles, documents, search |
| **Org Structure** | Interactive hierarchy chart |
| **Attendance** | 🔴 Real GPS + 🔴 Real FaceIO + Supabase save |
| **Payroll** | Salary, allowances, deductions, payslips |
| **Self-Service** | Leave requests, certificates, notifications |
| **Automation Hub** | Make.com, Zapier, API integrations |
| **Reports** | Attendance, payroll, employee reports |

## Tech Stack

- **Frontend:** React 18 (CRA)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Face Recognition:** FaceIO (Public ID: fioa9051)
- **GPS:** Browser Geolocation API
- **Hosting:** Vercel
- **Automation:** Make.com + Zapier
- **Languages:** English + Arabic (RTL)

---

## Quick Start

```bash
npm install
npm start
```

## Deploy to Vercel

### Option A: GitHub (Recommended)
1. Push this repo to GitHub
2. In Vercel → Import from GitHub
3. Add environment variables (see below)
4. Deploy

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

## Environment Variables (Add in Vercel)

| Variable | Value |
|----------|-------|
| `REACT_APP_SUPABASE_URL` | `https://qijcyebopepzzrrtflvm.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | Your anon key from Supabase dashboard |
| `REACT_APP_FACEIO_PUBLIC_ID` | `fioa9051` |

---

## Login

- **Email:** hello@mymayz.com
- **Password:** Ghalia@0902
