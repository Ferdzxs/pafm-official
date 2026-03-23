import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Eye, EyeOff, AlertCircle, Loader2,
  Shield, ArrowUpRight,
  CheckCircle, Lock, Mail
} from 'lucide-react'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');`

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [ready,    setReady]    = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    const { error: err } = await login(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    navigate('/dashboard')
  }

  return (
    <>
      <style>{FONTS + CSS}</style>
      <div className={`lp${ready ? ' lp--ready' : ''}`}>

        {/* ══════════ LEFT HERO ══════════ */}
        <aside className="lp-hero" aria-hidden="true">
          {/* decorative dot-grid background */}
          <div className="h-dots" />
          {/* soft blue wash top-right */}
          <div className="h-wash" />
          {/* watermark seal */}
          <div className="h-seal">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="55" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
              <circle cx="60" cy="60" r="42" stroke="currentColor" strokeWidth="1"/>
              <circle cx="60" cy="60" r="3" fill="currentColor"/>
              {Array.from({length:12}).map((_,i)=>{
                const a=(i/12)*Math.PI*2
                return <line key={i}
                  x1={60+Math.cos(a)*44} y1={60+Math.sin(a)*44}
                  x2={60+Math.cos(a)*54} y2={60+Math.sin(a)*54}
                  stroke="currentColor" strokeWidth="1.2"/>
              })}
              <text x="60" y="57" textAnchor="middle" fontSize="9" fontWeight="700"
                fill="currentColor" fontFamily="Plus Jakarta Sans,sans-serif" letterSpacing="2">PAFM</text>
              <text x="60" y="68" textAnchor="middle" fontSize="5.5"
                fill="currentColor" fontFamily="Plus Jakarta Sans,sans-serif" letterSpacing="1.5">OFFICIAL</text>
            </svg>
          </div>

          {/* wordmark */}
          <div className="h-top">
            <div className="h-wm">
              <span className="h-mono">BPM</span>
              <div>
                <div className="h-wname">PAFM System</div>
                <div className="h-wsub">Public Assets &amp; Facilities Management</div>
              </div>
            </div>
          </div>

          {/* hero body */}
          <div className="h-body">
            <div className="h-kicker">
              <span className="h-dot"/>
              Official Government Platform
            </div>
            <h1 className="h-hl">
              Managing public<br/>assets <em>with precision.</em>
            </h1>
            <p className="h-para">
              A unified platform for government staff and barangay administrators
              to coordinate services, reservations, and records — securely and efficiently.
              Water supply and drainage requests follow a digitized To-Be workflow with document validation, inspections, and treasury-ready payments.
            </p>
            <ul className="h-list">
              {[
                ['Cemetery &amp; burial services','Secure processing of interment requests'],
                ['Parks &amp; venue reservations','Streamlined booking for public facilities'],
                ['Barangay administration','Document workflows and coordination'],
                ['Utility service requests','Centralised tracking and assignment'],
              ].map(([t,d])=>(
                <li key={t} className="h-item">
                  <CheckCircle size={13} className="h-chk"/>
                  <span>
                    <strong dangerouslySetInnerHTML={{__html:t}}/>
                    <span className="h-desc"> — <span dangerouslySetInnerHTML={{__html:d}}/></span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* foot */}
          <div className="h-foot">
            <Shield size={11}/>
            <span>Protected by end-to-end encryption · ISO/IEC 27001</span>
          </div>

          {/* right-edge separator */}
          <div className="h-edge"/>
        </aside>

        {/* ══════════ RIGHT / MAIN PANEL ══════════ */}
        <main className="lp-main">

          {/* mobile-only top bar */}
          <div className="mob-bar">
            <span className="mob-mono">BPM</span>
            <div className="mob-titles">
              <span className="mob-name">PAFM System</span>
              <span className="mob-sub">Public Assets &amp; Facilities Management</span>
            </div>
          </div>

          {/* card */}
          <div className="lp-card">

            <div className="c-head">
              <div className="c-badge"><Shield size={10}/> Secure Sign-In</div>
              <h2 className="c-title">Welcome back</h2>
              <p className="c-sub">
                Enter your credentials to access your dashboard. Utility, treasury, and parks modules share one audit-friendly sign-in experience.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="c-form">

              <div className="lp-field">
                <label className="lp-lbl">
                  <Mail size={12} className="lp-lbl-i"/> Email Address
                </label>
                <input
                  type="email" className="lp-inp"
                  placeholder="you@bpm.gov.ph"
                  value={email} onChange={e=>setEmail(e.target.value)}
                  required autoFocus autoComplete="email"
                />
              </div>

              <div className="lp-field">
                <label className="lp-lbl">
                  <Lock size={12} className="lp-lbl-i"/> Password
                </label>
                <div className="lp-iw">
                  <input
                    type={showPw?'text':'password'} className="lp-inp lp-inp--pr"
                    placeholder="Enter your password"
                    value={password} onChange={e=>setPassword(e.target.value)}
                    required autoComplete="current-password"
                  />
                  <button type="button" className="lp-eye"
                    onClick={()=>setShowPw(v=>!v)} aria-label="Toggle password">
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lp-err" role="alert">
                  <AlertCircle size={13}/><span>{error}</span>
                </div>
              )}

              <button type="submit" className="lp-submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={14} className="lp-spin"/><span>Signing in…</span></>
                  : <span>Sign In to Dashboard</span>
                }
              </button>
            </form>

            <div className="lp-sep"><span/><small>or</small><span/></div>

            {/* Signup → external */}
            <a href="https://cies-bpm.netlify.app/auth"
              target="_blank" rel="noopener noreferrer"
              className="lp-cta">
              <span className="lp-cta-t">
                <span className="lp-cta-l">New citizen account</span>
                <span className="lp-cta-s">Register at the Citizen Portal</span>
              </span>
              <ArrowUpRight size={15} className="lp-cta-i"/>
            </a>

          </div>{/* /lp-card */}

          <p className="lp-legal">
            By signing in you agree to the{' '}
            <a href="#" className="lp-ll">Terms of Use</a> and{' '}
            <a href="#" className="lp-ll">Privacy Policy</a>.
          </p>

        </main>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════
   CSS — FULL WHITE LIGHT THEME
═══════════════════════════════════════════════ */
const CSS = `

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ── Design tokens ── */
.lp{
  --blue:      #2563eb;
  --blue-dk:   #1d4ed8;
  --blue-lt:   #eff6ff;
  --blue-bd:   #bfdbfe;
  --ink:       #111827;
  --ink-md:    #374151;
  --ink-lt:    #6b7280;
  --ink-xlt:   #9ca3af;
  --border:    #e5e7eb;
  --border-md: #d1d5db;
  --bg:        #ffffff;
  --bg-soft:   #f9fafb;
  --bg-muted:  #f3f4f6;

  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  min-height:100dvh;
  display:grid;
  grid-template-columns:1fr;
  background:var(--bg);
  opacity:0;
  transition:opacity .5s ease;
}
.lp--ready{opacity:1}

@media(min-width:1024px){
  .lp{grid-template-columns:1.05fr 0.95fr}
}

/* ═══════════════════════════
   HERO — white with blue accents
═══════════════════════════ */
.lp-hero{
  display:none;
  position:relative;
  background:#ffffff;
  border-right:1px solid var(--border);
  flex-direction:column;
  justify-content:space-between;
  overflow:hidden;
}
@media(min-width:1024px){
  .lp-hero{display:flex;padding:3.5rem 4rem}
}
@media(min-width:1024px) and (max-width:1279px){
  .lp-hero{padding:2.5rem 3rem}
}

/* dot-grid pattern */
.h-dots{
  position:absolute;inset:0;pointer-events:none;
  background-image:radial-gradient(circle, #d1d5db 1px, transparent 1px);
  background-size:22px 22px;
  opacity:.55;
}

/* soft blue wash — top-left corner */
.h-wash{
  position:absolute;
  top:-120px;left:-120px;
  width:420px;height:420px;
  border-radius:50%;
  background:radial-gradient(circle at center,rgba(37,99,235,.07) 0%,transparent 70%);
  pointer-events:none;
}

/* watermark seal — bottom right */
.h-seal{
  position:absolute;
  bottom:-30px;right:-30px;
  width:260px;height:260px;
  color:rgba(37,99,235,.07);
  pointer-events:none;
}

/* right edge separator */
.h-edge{
  position:absolute;top:0;right:0;width:1px;height:100%;
  background:linear-gradient(to bottom,transparent,var(--border) 20%,var(--border) 80%,transparent);
}

/* ── Wordmark ── */
.h-top{position:relative;z-index:1}
.h-wm{display:flex;align-items:center;gap:.85rem}
.h-mono{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:800;font-size:.6rem;letter-spacing:.14em;
  color:#fff;
  background:var(--blue);
  padding:.5rem .65rem;border-radius:9px;line-height:1;flex-shrink:0;
  box-shadow:0 2px 8px rgba(37,99,235,.25);
}
.h-wname{font-weight:700;font-size:.85rem;color:var(--ink);letter-spacing:.01em}
.h-wsub{font-size:.66rem;color:var(--ink-lt);letter-spacing:.01em;margin-top:2px}

/* ── Hero body ── */
.h-body{
  position:relative;z-index:1;flex:1;
  display:flex;flex-direction:column;justify-content:center;
  padding:2.5rem 0;
}
.h-kicker{
  display:inline-flex;align-items:center;gap:.45rem;margin-bottom:.9rem;
  font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;
  color:var(--blue);font-weight:700;
}
.h-dot{
  display:inline-block;width:5px;height:5px;border-radius:50%;
  background:var(--blue);flex-shrink:0;
}
.h-hl{
  font-family:'Fraunces',Georgia,serif;
  font-size:clamp(1.7rem,2.8vw,2.7rem);
  font-weight:700;line-height:1.12;
  color:var(--ink);
  margin-bottom:.9rem;letter-spacing:-.025em;
}
.h-hl em{
  font-style:italic;font-weight:400;
  color:var(--blue);
}
.h-para{
  font-size:clamp(.78rem,.85vw,.88rem);
  color:var(--ink-lt);line-height:1.7;
  max-width:380px;margin-bottom:1.9rem;
}

/* feature list */
.h-list{list-style:none;display:flex;flex-direction:column;gap:.85rem}
.h-item{
  display:flex;align-items:flex-start;gap:.65rem;
  font-size:clamp(.74rem,.8vw,.82rem);
  color:var(--ink-md);line-height:1.45;
}
.h-item strong{color:var(--ink);font-weight:600}
.h-desc{color:var(--ink-xlt)}
.h-chk{color:var(--blue);flex-shrink:0;margin-top:1px}

/* compact for shorter desktops */
@media(min-width:1024px) and (max-height:720px){
  .h-body{padding:1.5rem 0}
  .h-hl{font-size:1.7rem;margin-bottom:.65rem}
  .h-para{margin-bottom:1.2rem;font-size:.78rem}
  .h-list{gap:.55rem}
  .h-item{font-size:.74rem}
}

/* ── Hero foot ── */
.h-foot{
  position:relative;z-index:1;
  display:flex;align-items:center;gap:.45rem;
  font-size:.64rem;color:var(--ink-xlt);letter-spacing:.02em;
  padding-top:1.25rem;
  border-top:1px solid var(--border);
  flex-wrap:wrap;
}

/* ═══════════════════════════
   MAIN PANEL
═══════════════════════════ */
.lp-main{
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  background:var(--bg-soft);
  min-height:100dvh;
  padding:1.5rem 1rem 2rem;
  gap:.875rem;
}
@media(min-width:480px){.lp-main{padding:2rem 1.5rem}}
@media(min-width:640px){.lp-main{padding:2.5rem 2rem}}
@media(min-width:1024px){.lp-main{padding:2.5rem 2rem;min-height:unset;background:#fff}}
@media(max-height:600px) and (orientation:landscape){
  .lp-main{padding:1rem 1.5rem;justify-content:flex-start;padding-top:1.25rem}
}

/* ── Mobile top bar ── */
.mob-bar{
  display:flex;align-items:center;gap:.75rem;
  width:100%;max-width:440px;
}
@media(min-width:1024px){.mob-bar{display:none}}
.mob-mono{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:800;font-size:.6rem;letter-spacing:.14em;
  color:#fff;background:var(--blue);
  padding:.45rem .55rem;border-radius:7px;
  line-height:1;flex-shrink:0;
  box-shadow:0 2px 6px rgba(37,99,235,.2);
}
.mob-titles{display:flex;flex-direction:column;gap:1px}
.mob-name{font-weight:700;font-size:.83rem;color:var(--ink);letter-spacing:.01em}
.mob-sub{font-size:.65rem;color:var(--ink-lt)}

/* ═══════════════════════════
   CARD
═══════════════════════════ */
.lp-card{
  width:100%;max-width:440px;
  background:#ffffff;
  border:1px solid var(--border);
  border-radius:20px;
  padding:1.75rem 1.5rem;
  box-shadow:
    0 1px 3px rgba(0,0,0,.04),
    0 4px 12px rgba(0,0,0,.05),
    0 16px 40px rgba(0,0,0,.04);
}
@media(min-width:480px){.lp-card{padding:2rem 1.75rem}}
@media(min-width:640px){.lp-card{padding:2.25rem 2rem}}
@media(max-width:359px){.lp-card{border-radius:16px;padding:1.5rem 1.25rem}}
@media(max-height:600px) and (orientation:landscape){.lp-card{padding:1.25rem 1.5rem}}

/* ── Card header ── */
.c-head{margin-bottom:1.5rem}
@media(max-height:600px) and (orientation:landscape){.c-head{margin-bottom:1rem}}
.c-badge{
  display:inline-flex;align-items:center;gap:.38rem;
  background:var(--blue-lt);border:1px solid var(--blue-bd);color:var(--blue);
  font-size:.64rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  padding:.26rem .6rem;border-radius:999px;margin-bottom:.75rem;
}
.c-title{
  font-family:'Fraunces',Georgia,serif;
  font-size:clamp(1.25rem,4vw,1.5rem);
  font-weight:700;color:var(--ink);
  letter-spacing:-.025em;margin-bottom:.3rem;
}
.c-sub{font-size:clamp(.75rem,2.5vw,.8rem);color:var(--ink-lt);line-height:1.55}

/* ── Form ── */
.c-form{display:flex;flex-direction:column;gap:1rem}
@media(max-height:600px) and (orientation:landscape){.c-form{gap:.75rem}}

.lp-field{display:flex;flex-direction:column;gap:.42rem}
.lp-lbl{
  display:flex;align-items:center;gap:.38rem;
  font-size:.72rem;font-weight:600;color:var(--ink-md);letter-spacing:.01em;
}
.lp-lbl-i{opacity:.6;flex-shrink:0}

.lp-iw{position:relative}
.lp-inp{
  width:100%;height:42px;
  padding:0 .9rem;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:clamp(.82rem,2.5vw,.85rem);
  color:var(--ink);
  background:var(--bg-soft);
  border:1.5px solid var(--border-md);
  border-radius:10px;outline:none;-webkit-appearance:none;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
@media(min-width:480px){.lp-inp{height:44px}}
.lp-inp::placeholder{color:#c9cdd6}
.lp-inp:hover:not(:focus){border-color:#b0b8c8}
.lp-inp:focus{
  background:#fff;
  border-color:var(--blue);
  box-shadow:0 0 0 3.5px rgba(37,99,235,.1);
}
.lp-inp--pr{padding-right:2.75rem}

.lp-eye{
  position:absolute;right:.75rem;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;
  color:var(--ink-xlt);display:flex;align-items:center;
  padding:0;transition:color .15s;
  min-width:32px;min-height:32px;justify-content:center;
}
.lp-eye:hover{color:var(--ink-md)}

.lp-fr{display:flex;justify-content:flex-end;margin-top:-.15rem}
.lp-forgot{
  font-size:.7rem;color:var(--blue);
  text-decoration:none;font-weight:600;
  opacity:.85;transition:opacity .15s;padding:.25rem 0;
}
.lp-forgot:hover{opacity:1;text-decoration:underline}

.lp-err{
  display:flex;align-items:flex-start;gap:.5rem;
  padding:.6rem .85rem;
  background:#fef2f2;border:1px solid #fecaca;
  border-radius:8px;font-size:clamp(.73rem,2.3vw,.78rem);
  color:#b91c1c;line-height:1.4;
}
.lp-err svg{flex-shrink:0;margin-top:1px}

/* ── Submit ── */
.lp-submit{
  height:44px;
  display:flex;align-items:center;justify-content:center;gap:.5rem;
  width:100%;
  background:var(--blue);
  color:#fff;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:700;font-size:clamp(.81rem,2.5vw,.85rem);
  letter-spacing:.01em;border:none;border-radius:10px;cursor:pointer;
  transition:background .18s,box-shadow .18s,transform .1s;
  box-shadow:0 2px 8px rgba(37,99,235,.28),0 1px 2px rgba(37,99,235,.18);
}
@media(min-width:480px){.lp-submit{height:46px}}
.lp-submit:hover:not(:disabled){
  background:var(--blue-dk);
  box-shadow:0 4px 16px rgba(37,99,235,.36);
  transform:translateY(-1px);
}
.lp-submit:active:not(:disabled){
  transform:translateY(0);
  box-shadow:0 2px 6px rgba(37,99,235,.22);
}
.lp-submit:disabled{opacity:.55;cursor:not-allowed}
.lp-spin{animation:lp-spin .7s linear infinite}
@keyframes lp-spin{to{transform:rotate(360deg)}}

/* ── Divider ── */
.lp-sep{
  display:flex;align-items:center;gap:.75rem;
  margin:1.1rem 0 .9rem;
}
@media(max-height:600px) and (orientation:landscape){.lp-sep{margin:.6rem 0 .55rem}}
.lp-sep span{flex:1;height:1px;background:var(--border)}
.lp-sep small{font-size:.68rem;color:var(--ink-xlt)}

/* ── Signup CTA ── */
.lp-cta{
  display:flex;align-items:center;justify-content:space-between;
  padding:.8rem 1rem;width:100%;
  background:var(--bg-soft);
  border:1.5px solid var(--border-md);
  border-radius:12px;text-decoration:none;cursor:pointer;
  transition:background .15s,border-color .15s,transform .1s;
}
.lp-cta:hover{
  background:var(--blue-lt);
  border-color:var(--blue-bd);
  transform:translateY(-1px);
}
.lp-cta:active{transform:translateY(0)}
.lp-cta-t{display:flex;flex-direction:column;gap:2px}
.lp-cta-l{font-size:clamp(.78rem,2.4vw,.82rem);font-weight:700;color:var(--ink)}
.lp-cta-s{font-size:clamp(.66rem,2vw,.69rem);color:var(--ink-lt)}
.lp-cta-i{color:var(--blue);flex-shrink:0;margin-left:.5rem}
.lp-cta:hover .lp-cta-l{color:var(--blue)}

/* ── Demo ── */
.demo-wrap{margin-top:.9rem}
.demo-trig{
  width:100%;display:flex;align-items:center;justify-content:space-between;
  padding:.5rem .75rem;background:none;
  border:1px dashed var(--border-md);border-radius:8px;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:clamp(.69rem,2.2vw,.72rem);
  color:var(--ink-xlt);cursor:pointer;
  transition:border-color .15s,color .15s;
  min-height:36px;
}
.demo-trig:hover{border-color:var(--ink-xlt);color:var(--ink-lt)}

.demo-panel{
  margin-top:.45rem;
  border:1px solid var(--border);border-radius:10px;overflow:hidden;
  animation:demo-in .18s ease;
  max-height:220px;overflow-y:auto;
}
@keyframes demo-in{
  from{opacity:0;transform:translateY(-4px)}
  to  {opacity:1;transform:translateY(0)}
}
.demo-row{
  width:100%;display:flex;align-items:center;gap:.7rem;
  padding:.6rem .875rem;background:none;border:none;cursor:pointer;
  border-bottom:1px solid var(--border);
  font-family:'Plus Jakarta Sans',sans-serif;text-align:left;
  transition:background .12s;min-height:44px;
}
.demo-row:last-child{border-bottom:none}
.demo-row:hover{background:var(--bg-muted)}
.demo-pip{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.demo-info{display:flex;flex-direction:column;gap:1px}
.demo-role{font-size:clamp(.73rem,2.3vw,.77rem);font-weight:600;color:var(--ink)}
.demo-em{font-size:clamp(.63rem,2vw,.67rem);color:var(--ink-lt)}

/* ── Legal ── */
.lp-legal{
  font-size:clamp(.63rem,1.9vw,.68rem);
  color:var(--ink-xlt);text-align:center;
  line-height:1.6;max-width:340px;padding:0 .5rem;
}
.lp-ll{color:var(--blue);text-decoration:none}
.lp-ll:hover{text-decoration:underline}

/* ── Tablet 768–1023 ── */
@media(min-width:768px) and (max-width:1023px){
  .lp-main{padding:3rem 2rem;gap:1.25rem}
  .lp-card{max-width:460px;padding:2.5rem 2.25rem}
  .mob-bar{max-width:460px}
}

/* ── Large desktop 1280+ ── */
@media(min-width:1280px){
  .lp-hero{padding:4rem 4.5rem}
  .lp-main{padding:3rem}
  .lp-card{max-width:420px;padding:2.5rem 2.25rem}
}

/* ── Ultra-wide 1600+ ── */
@media(min-width:1600px){
  .lp{grid-template-columns:1.2fr 0.8fr}
  .lp-hero{padding:4.5rem 5.5rem}
  .h-hl{font-size:3rem}
}

/* ── Short landscape phones ── */
@media(max-height:500px) and (orientation:landscape){
  .lp-main{
    justify-content:flex-start;
    padding:1rem 1.5rem 1.5rem;
    gap:.65rem;overflow-y:auto;
  }
  .mob-bar{display:none}
  .lp-card{padding:1.25rem 1.5rem}
  .c-head{margin-bottom:1rem}
  .c-badge{margin-bottom:.5rem}
  .c-title{font-size:1.2rem}
  .c-form{gap:.7rem}
  .lp-inp{height:38px}
  .lp-submit{height:40px}
  .lp-sep{margin:.65rem 0 .55rem}
  .demo-wrap{margin-top:.6rem}
  .lp-legal{display:none}
}
`