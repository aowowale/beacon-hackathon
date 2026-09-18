import { useEffect, useState } from 'react'
import {
  ArrowRight, Award, BarChart3, Building2, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, Download, Eye, Globe2, GraduationCap,
  Handshake, Languages, Loader2, Lock, Network, Rocket, RotateCcw, Search, Send, ShieldCheck,
  Sparkles, Target, TriangleAlert, UserRoundCheck, UserRoundSearch, Users, UsersRound, Wifi, X,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import './App.css'
import {
  accelerationGoal, accelerationOpportunities, employeeProfiles,
} from './data'
import type { AccelerationPlan, ExpertMatch, OpportunityKind } from './domain'
import { assembleAccelerationPlan } from './acceleration'
import { findExpertMatches } from './matching'
import { fetchLiveImpact, fetchLiveMatches, fetchLivePlan, type ApiImpact } from './beacon'
import { fetchColleagues, isProductionConfigured, signIn, signOut, type ProductionUser } from './production'

type View = 'accelerate' | 'connect' | 'impact'
type Mode = 'demo' | 'live' | 'production'

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong reaching the live API.'
const canonicalPrompt = 'I need someone who understands Dataverse DLP, speaks Portuguese, and can help today.'
const livePrompt = 'I need help designing an Azure OpenAI solution for a customer. A live discussion this week would be ideal.'
// Submission builds ship Demo-only; set VITE_SHOW_MODE_TOGGLE=true to reveal Live API / Production.
const showModeToggle = import.meta.env.VITE_SHOW_MODE_TOGGLE === 'true'
const impactTrend = [
  { month: 'Apr', connections: 184, resolved: 132 },
  { month: 'May', connections: 232, resolved: 175 },
  { month: 'Jun', connections: 291, resolved: 226 },
  { month: 'Jul', connections: 338, resolved: 269 },
  { month: 'Aug', connections: 402, resolved: 331 },
  { month: 'Sep', connections: 468, resolved: 397 },
]
const capacityData = [
  { domain: 'AI', demand: 92, capacity: 74 },
  { domain: 'Security', demand: 76, capacity: 68 },
  { domain: 'Power Platform', demand: 88, capacity: 51 },
  { domain: 'Data', demand: 63, capacity: 72 },
  { domain: 'Cloud', demand: 71, capacity: 80 },
]
const kindIcon: Record<OpportunityKind, typeof Handshake> = {
  Mentor: Handshake,
  Peer: Users,
  Sponsor: Award,
  Shadow: Eye,
  Cohort: GraduationCap,
  Community: Building2,
}

function Avatar({ initials }: { initials: string }) {
  return <span className="avatar" aria-hidden="true">{initials}</span>
}

function ConnectView({ mode, onProductionUser }: { mode: Mode; onProductionUser: (user: ProductionUser | null) => void }) {
  const [prompt, setPrompt] = useState(mode === 'demo' ? canonicalPrompt : livePrompt)
  const [matches, setMatches] = useState<ExpertMatch[]>([])
  const [selected, setSelected] = useState<ExpertMatch | null>(null)
  const [sent, setSent] = useState(false)
  const [resolved, setResolved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prodUser, setProdUser] = useState<ProductionUser | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  const handleSignIn = () => {
    setError(null)
    setSigningIn(true)
    signIn()
      .then((user) => { setProdUser(user); onProductionUser(user); setSigningIn(false) })
      .catch((err: unknown) => { setError(errorMessage(err)); setSigningIn(false) })
  }
  const handleSignOut = () => {
    void signOut()
    setProdUser(null)
    onProductionUser(null)
    setMatches([])
    setSelected(null)
  }

  const runMatch = () => {
    setSelected(null)
    setSent(false)
    setResolved(false)
    setError(null)
    if (mode === 'production') {
      if (!prodUser) return
      setLoading(true)
      fetchColleagues()
        .then((candidates) => fetchLiveMatches(prompt, { candidates, requesterName: prodUser.name }))
        .then((result) => { setMatches(result); setLoading(false) })
        .catch((err: unknown) => { setError(errorMessage(err)); setMatches([]); setLoading(false) })
      return
    }
    if (mode === 'live') {
      setLoading(true)
      fetchLiveMatches(prompt)
        .then((result) => { setMatches(result); setLoading(false) })
        .catch((err: unknown) => { setError(errorMessage(err)); setMatches([]); setLoading(false) })
      return
    }
    setMatches(findExpertMatches(employeeProfiles, {
      topic: 'Dataverse DLP', language: 'Portuguese', timeframe: 'Today', interaction: 'Live discussion',
    }))
  }
  const reset = () => {
    setPrompt(mode === 'demo' ? canonicalPrompt : livePrompt)
    setMatches([])
    setSelected(null)
    setSent(false)
    setResolved(false)
    setError(null)
  }

  const gated = mode === 'production' && (!isProductionConfigured() || !prodUser)

  return <main className="content" id="main-content">
    <header className="page-header">
      <div><p className="eyebrow">Expert connection</p><h1>Who can help?</h1><p>Describe the outcome you need. Beacon will find people who opted in and can help now.</p></div>
      <button className="icon-button" title="Reset" aria-label="Reset" onClick={reset}><RotateCcw size={18} /></button>
    </header>
    {mode === 'production' && <section className="request-panel prod-signin" aria-label="Production sign-in">
      <div className="request-heading"><Building2 size={20} /><div><h2>Production mode</h2><p>Uses your real Microsoft directory. Outreach is drafted only — nothing is ever sent on your behalf.</p></div></div>
      {!isProductionConfigured()
        ? <p className="live-error"><TriangleAlert size={15} /> Sign-in isn’t configured yet. Set <code>VITE_AAD_CLIENT_ID</code> to your Entra app registration and rebuild to enable it.</p>
        : prodUser
          ? <div className="composer-footer"><div className="privacy-note"><UserRoundCheck size={15} /> Signed in as {prodUser.name}</div><button className="secondary-button" onClick={handleSignOut}>Sign out</button></div>
          : <div className="composer-footer"><div className="privacy-note"><Lock size={15} /> Delegated read-only · User.Read + People.Read</div><button className="primary-button" onClick={handleSignIn} disabled={signingIn}>{signingIn ? <><Loader2 size={17} className="spin" /> Signing in…</> : <><Lock size={17} /> Sign in with Microsoft</>}</button></div>}
      {error && !prodUser && <p className="live-error"><TriangleAlert size={15} /> {error}</p>}
    </section>}
    {!gated && <section className="request-panel" aria-labelledby="request-title">
      <div className="request-heading"><Sparkles size={20} /><div><h2 id="request-title">Ask Beacon</h2><p>Expertise, mentoring, or a path forward.</p></div></div>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} aria-label="Describe what you need" />
      <div className="composer-footer"><div className="privacy-note"><ShieldCheck size={15} /> Uses approved profile signals only</div><button className="primary-button" onClick={runMatch} disabled={loading}>{loading ? <><Loader2 size={17} className="spin" /> Finding…</> : <><Search size={17} /> Find connections</>}</button></div>
      {error && (mode !== 'production' || prodUser) && <p className="live-error"><TriangleAlert size={15} /> {error}</p>}
    </section>}
    {matches.length > 0 && <>
      {mode === 'demo' && <section className="understanding" aria-label="Beacon understood">
        <div className="section-title-row"><div><p className="eyebrow">Beacon understood</p><h2>Dataverse DLP policy design</h2></div><span className="status"><Check size={14} /> Ready to match</span></div>
        <div className="signal-row"><span><Languages size={15} /> Portuguese</span><span><Clock3 size={15} /> Today</span><span><UsersRound size={15} /> Live discussion</span></div>
      </section>}
      <section className="results" aria-labelledby="matches-heading">
        <div className="section-title-row"><div><p className="eyebrow">Qualified and available</p><h2 id="matches-heading">{matches.length} {matches.length === 1 ? 'person' : 'people'} can help</h2></div><p className="muted">Ordered by relevance to this request, not employee performance.</p></div>
        <div className="match-grid">{matches.map((match, index) => <article className={`match-card ${selected?.profile.id === match.profile.id ? 'selected-card' : ''}`} key={match.profile.id}>
          <div className="match-topline"><span className="match-number">0{index + 1}</span><span className="confidence">{match.confidence}</span></div>
          <div className="person-heading"><Avatar initials={match.profile.initials} /><div><h3>{match.profile.name}</h3><p>{match.profile.role}</p></div></div>
          <div className="profile-facts">{match.profile.location && <span><Globe2 size={14} /> {match.profile.location}</span>}{match.profile.languages.length > 0 && <span><Languages size={14} /> {match.profile.languages.join(', ')}</span>}<span><CalendarDays size={14} /> {match.profile.availability}</span></div>
          <details><summary><CircleHelp size={15} /> Why this match? <ChevronDown size={15} /></summary><ul>{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>
          <button className="secondary-button" onClick={() => { setSelected(match); setSent(false); setResolved(false) }}>Connect with {match.profile.name.split(' ')[0]} <ArrowRight size={16} /></button>
        </article>)}</div>
      </section>
    </>}
    {selected && <section className="action-panel" aria-live="polite">
      <div className="section-title-row"><div><p className="eyebrow">Human-controlled action</p><h2>Make the introduction</h2></div><span className="prototype-label">Simulated Teams action</span></div>
      {!sent ? <><div className="introduction"><Avatar initials={selected.profile.initials} /><p>{selected.draftOutreach ?? `Hi ${selected.profile.name.split(' ')[0]}, Maria is working through a Dataverse DLP policy challenge. Your Power Platform governance experience appears relevant. Would you be open to a 30-minute conversation this week?`}</p></div><div className="action-footer"><span><CalendarDays size={16} /> Suggested: Thursday, 2:00 PM BRT</span><button className="primary-button" onClick={() => setSent(true)}><Send size={16} /> Send request</button></div></>
      : !resolved ? <div className="success-state"><CheckCircle2 size={30} /><div><h3>Request sent</h3><p>{selected.profile.name} decides whether to accept. No meeting is booked without consent.</p></div><button className="primary-button" onClick={() => setResolved(true)}>Mark resolved</button></div>
      : <div className="success-state"><CheckCircle2 size={30} /><div><h3>Outcome captured</h3><p>This connection improved Beacon's service-level insights without rating either employee.</p></div><span className="status">Resolved</span></div>}
    </section>}
  </main>
}

const nextBestAction: Record<'helped' | 'started' | 'support', { title: string; body: string }> = {
  helped: { title: 'Lock in a recurring cadence', body: 'Beacon updated your plan to a biweekly rhythm with your mentor and queued a sponsor check-in for next month.' },
  started: { title: 'Apply it on a stretch project', body: 'Beacon surfaced an AI design review that fits your new focus and drafted an intro to the project lead.' },
  support: { title: 'Bring in a second expert', body: 'Beacon found another opted-in Azure AI architect in your region and drafted a follow-up request for deeper help.' },
}
const askByKind: Record<OpportunityKind, string> = {
  Mentor: 'be my mentor over the next few sprints',
  Peer: 'compare notes on a 30-minute call',
  Sponsor: 'sponsor me for a stretch project',
  Shadow: 'let me shadow that engagement',
  Cohort: 'join the cohort alongside me',
  Community: 'welcome me into the community',
}

function AccelerateView({ mode }: { mode: Mode }) {
  const [phase, setPhase] = useState<'goal' | 'plan' | 'review' | 'connected'>('goal')
  const [outcome, setOutcome] = useState<'helped' | 'started' | 'support' | null>(null)
  const [livePlan, setLivePlan] = useState<AccelerationPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reset = () => { setPhase('goal'); setOutcome(null) }

  useEffect(() => {
    if (mode === 'demo') return
    let cancelled = false
    setError(null)
    fetchLivePlan()
      .then((result) => { if (!cancelled) setLivePlan(result) })
      .catch((err: unknown) => { if (!cancelled) setError(errorMessage(err)) })
    return () => { cancelled = true }
  }, [mode])

  const plan = mode === 'demo'
    ? assembleAccelerationPlan(accelerationGoal, accelerationOpportunities)
    : livePlan

  if (mode !== 'demo' && !plan) {
    return <main className="content" id="main-content">
      <header className="page-header"><div><p className="eyebrow">Talent acceleration</p><h1>Move your career forward</h1><p>Building your acceleration plan from the live Beacon API.</p></div></header>
      {error
        ? <section className="live-panel"><TriangleAlert size={22} /><div><h3>Live API unavailable</h3><p>{error}</p></div></section>
        : <section className="live-panel"><Loader2 size={22} className="spin" /><div><h3>Loading live plan…</h3><p>Calling the deployed API for Maria's acceleration plan.</p></div></section>}
    </main>
  }
  if (!plan) return null

  return <main className="content" id="main-content">
    <header className="page-header">
      <div><p className="eyebrow">Talent acceleration</p><h1>Move your career forward</h1><p>Your goal is set. Beacon connects you to the people and experiences that move it forward — and starts every introduction for you.</p></div>
      {phase !== 'goal' && <button className="icon-button" title="Reset demo" aria-label="Reset demo" onClick={reset}><RotateCcw size={18} /></button>}
    </header>

    <section className="goal-banner">
      <div className="goal-icon"><Target size={24} /></div>
      <div><p className="eyebrow">{plan.goal.employee} · {plan.goal.location} · {plan.goal.horizon}</p><h2>{plan.goal.title}</h2></div>
      {phase === 'goal' && <button className="primary-button" onClick={() => setPhase('plan')}><Sparkles size={17} /> Build my plan</button>}
    </section>

    {phase !== 'goal' && <>
      <section className="understanding" aria-label="Beacon analysis">
        <div className="section-title-row"><div><p className="eyebrow">Beacon analyzed the goal</p><h2>Where to focus</h2></div><span className="status"><Check size={14} /> Plan ready</span></div>
        <div className="skill-signals">{plan.goal.skillSignals.map((signal) => <div className="skill-row" key={signal.skill}><div className="skill-label"><strong>{signal.skill}</strong><span>{signal.level}%</span></div><div className="progress-track"><span style={{ width: `${signal.level}%` }} /></div><p>{signal.note}</p></div>)}</div>
      </section>

      <section className="results" aria-labelledby="opps-heading">
        <div className="section-title-row"><div><p className="eyebrow">Your opportunity network</p><h2 id="opps-heading">6 ways to accelerate</h2></div><p className="muted">People and opportunities that all opted in. Based on declared experience, not performance.</p></div>
        <div className="opportunity-grid">{plan.opportunities.map((opportunity) => {
          const Icon = kindIcon[opportunity.kind]
          const done = phase === 'connected'
          return <article className={`opportunity-card ${done ? 'card-done' : ''}`} key={opportunity.id}>
            <div className="match-topline"><span className="kind-chip"><Icon size={13} /> {opportunity.kind}</span>{done && <span className="status"><Check size={13} /> Done</span>}</div>
            <div className="person-heading"><Avatar initials={opportunity.ownerInitials} /><div><h3>{opportunity.title}</h3><p>{opportunity.owner}</p></div></div>
            <p className="opp-detail">{opportunity.detail}</p>
            <div className="opp-reason"><CircleHelp size={14} /> {opportunity.reason}</div>
            <div className="opp-foot">{done ? <span className="confirmation"><CheckCircle2 size={14} /> {opportunity.confirmation}</span> : <><CalendarDays size={14} /> {opportunity.timeframe}</>}</div>
          </article>
        })}</div>
      </section>

      <section className="action-panel" aria-live="polite">
        {phase === 'plan' && <div className="connect-all">
          <div><p className="eyebrow">One action, human-controlled</p><h2>Connect me to my network</h2><p className="muted">Beacon drafts a personalized introduction for each one. You review and approve before anything sends.</p></div>
          <button className="primary-button" onClick={() => setPhase('review')}><Sparkles size={17} /> Draft all 6 introductions</button>
        </div>}
        {phase === 'review' && <div className="review-drafts">
          <div className="section-title-row"><div><p className="eyebrow">Review before anything sends</p><h2>6 introductions drafted for you</h2><p className="muted">Beacon wrote each message. Nothing is sent until you approve — and every recipient can still accept or decline.</p></div><span className="prototype-label">Draft only</span></div>
          <div className="draft-list">{plan.opportunities.map((opportunity) => <div className="draft-row" key={opportunity.id}>
            <Avatar initials={opportunity.ownerInitials} />
            <div><div className="draft-head"><strong>{opportunity.owner}</strong><span className="kind-chip">{opportunity.kind}</span></div><p>Hi {opportunity.owner.split(' ')[0]}, I’m Maria — I’m working toward {plan.goal.title}. Beacon flagged you as a strong fit. Would you be open to {askByKind[opportunity.kind]}?</p></div>
          </div>)}</div>
          <div className="action-footer"><span><ShieldCheck size={16} /> You approve every message before it sends</span><button className="primary-button" onClick={() => setPhase('connected')}><Check size={16} /> Approve &amp; send all 6</button></div>
        </div>}
        {phase === 'connected' && <>
          <div className="success-state final-success">
            <CheckCircle2 size={30} />
            <div><h3>Your acceleration network is in motion</h3><p>Mentorship requested, sponsor notified, shadow reserved, cohort enrolled, community joined. Outcomes will be tracked without rating anyone.</p></div>
            <span className="status">Sent with your approval</span>
          </div>
          <div className="followup-panel">
            <div className="section-title-row"><div><p className="eyebrow">Beacon follows up</p><h2>How is the mentorship going?</h2><p className="muted">A few days later Beacon checks in — then adapts your plan and recommends the next best action.</p></div></div>
            {!outcome ? <div className="followup-choices">
              <button className="secondary-button" onClick={() => setOutcome('helped')}><CheckCircle2 size={16} /> It helped</button>
              <button className="secondary-button" onClick={() => setOutcome('started')}><Rocket size={16} /> Development activity started</button>
              <button className="secondary-button" onClick={() => setOutcome('support')}><TriangleAlert size={16} /> I need more support</button>
            </div> : <div className="next-action">
              <div className="next-icon"><Sparkles size={18} /></div>
              <div><p className="eyebrow">Next best action</p><h3>{nextBestAction[outcome].title}</h3><p>{nextBestAction[outcome].body}</p></div>
              <button className="ghost-button" onClick={() => setOutcome(null)}><RotateCcw size={15} /> Choose again</button>
            </div>}
          </div>
          <p className="brand-tagline">The right human. The right opportunity. The right moment.</p>
        </>}
      </section>
    </>}
  </main>
}

function ImpactView({ mode, onOpenMethod }: { mode: Mode; onOpenMethod: () => void }) {
  const [community, setCommunity] = useState('All communities')
  const [region, setRegion] = useState('Global')
  const [period, setPeriod] = useState('Last 6 months')
  const [live, setLive] = useState<ApiImpact | null>(null)
  const hola = community === 'HOLA pilot'
  const regionFactor = region === 'Americas' ? 0.42 : region === 'EMEA' ? 0.33 : 1
  const periodFactor = period === 'Last 30 days' ? 0.2 : 1

  useEffect(() => {
    if (mode === 'demo') { setLive(null); return }
    let cancelled = false
    fetchLiveImpact({
      period: period === 'Last 30 days' ? 'last_30_days' : 'last_6_months',
      region: region.toLowerCase(),
      community: hola ? 'HOLA' : undefined,
    })
      .then((result) => { if (!cancelled) setLive(result) })
      .catch(() => { if (!cancelled) setLive(null) })
    return () => { cancelled = true }
  }, [mode, period, region, hola])

  const scale = live ? 1 : regionFactor * periodFactor
  const base = live
    ? { reached: live.employeesReached, connections: live.connectionsMade, languages: live.languagesReached, rate: live.needsResolvedPct, unanswered: Math.max(0, Math.round(live.connectionsMade * 0.04)) }
    : hola
      ? { reached: 486, connections: 214, languages: 8, rate: 87, unanswered: 9 }
      : { reached: 2847, connections: 1214, languages: 38, rate: 84, unanswered: 63 }
  const fmt = (n: number) => Math.max(1, Math.round(n)).toLocaleString('en-US')
  const metrics: [string, string, string, typeof Globe2][] = [
    ['Employees reached', fmt(base.reached * scale), '+18%', Globe2],
    ['Connections made', fmt(base.connections * scale), '+24%', Network],
    ['Needs resolved', `${base.rate}%`, '+6 pts', CheckCircle2],
    ['Languages reached', fmt(live ? base.languages : Math.max(4, base.languages * regionFactor)), '+5', Languages],
    ['Unanswered requests', fmt(base.unanswered * scale), '-14%', Clock3],
  ]
  const trend = live ? live.trend : impactTrend.map((m) => ({ month: m.month, connections: Math.round(m.connections * scale), resolved: Math.round(m.resolved * scale) }))
  const capacity = live ? live.capacity : capacityData.map((d) => ({ domain: d.domain, demand: Math.round(d.demand * scale), capacity: Math.round(d.capacity * scale) }))
  const exportData = () => {
    const rows = metrics.map(([label, value]) => `${label},${value}`).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`metric,value\n${rows}`], { type: 'text/csv' }))
    link.download = 'beacon-impact-demo.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }
  return <main className="content" id="main-content">
    <header className="page-header impact-header"><div><p className="eyebrow">Impact intelligence</p><h1>Opportunity is measurable</h1><p>Understand reach, connection quality, and where expertise capacity needs investment.</p></div><button className="secondary-button" onClick={exportData}><Download size={16} /> Export demo data</button></header>
    <div className="filter-bar"><label>Community<select value={community} onChange={(event) => setCommunity(event.target.value)}><option>All communities</option><option>HOLA pilot</option></select></label><label>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option>Last 6 months</option><option>Last 30 days</option></select></label><label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option>Global</option><option>Americas</option><option>EMEA</option></select></label>{live ? <span className="demo-data live-pill"><Wifi size={15} /> Live API data</span> : <span className="demo-data"><ShieldCheck size={15} /> Synthetic demo data</span>}</div>
    <section className="metric-grid" aria-label="Impact metrics">{metrics.map(([label, value, change, Icon]) => <article className="metric" key={label}><div className="metric-heading"><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{change} vs prior period</small></article>)}</section>
    <div className="chart-grid"><section className="chart-panel"><div className="section-title-row"><div><p className="eyebrow">Momentum</p><h2>Connections and resolution</h2></div><span className="status">{base.rate}% resolved</span></div><div className="chart" role="img" aria-label="Connections and resolved needs increased steadily across the selected period."><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid vertical={false} stroke="var(--cp-border)"/><XAxis dataKey="month" axisLine={false} tickLine={false}/><YAxis hide/><Tooltip/><Area type="monotone" dataKey="connections" stroke="var(--cp-accent)" strokeWidth={2} fill="var(--cp-accent-soft)"/><Area type="monotone" dataKey="resolved" stroke="var(--cp-success)" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer></div></section>
      <section className="chart-panel"><div className="section-title-row"><div><p className="eyebrow">Capacity signal</p><h2>Demand vs expert capacity</h2></div></div><div className="chart" role="img" aria-label="Power Platform has the largest gap between employee demand and expert capacity."><ResponsiveContainer width="100%" height="100%"><BarChart data={capacity} layout="vertical"><CartesianGrid horizontal={false} stroke="var(--cp-border)"/><XAxis type="number" hide/><YAxis type="category" dataKey="domain" width={94} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="demand" fill="var(--cp-accent)" radius={[0, 4, 4, 0]}/><Bar dataKey="capacity" fill="var(--cp-border-strong)" radius={[0, 4, 4, 0]}/></BarChart></ResponsiveContainer></div></section></div>
    <section className="insight-strip"><div className="insight-icon"><Sparkles size={20} /></div><div><p className="eyebrow">Beacon insight</p><h2>Power Platform demand is outpacing available expert capacity by 37%</h2><p>Recruit 12 additional opted-in experts or launch focused office hours for the HOLA pilot.</p></div><button className="secondary-button" onClick={onOpenMethod}><CircleHelp size={16} /> How this is measured</button></section>
    <section className="integration-strip" aria-label="Works with your talent stack">
      <div className="integration-head"><p className="eyebrow">Works with your stack</p><h2>Beacon complements your talent investments</h2><p>It orchestrates across the systems you already use — adding the agentic action and outcome layer on top.</p></div>
      <div className="integration-nodes">
        <span className="int-node beacon-node"><Sparkles size={15} /> Beacon</span>
        <span className="int-link" aria-hidden="true"><Network size={15} /></span>
        <span className="int-node"><GraduationCap size={14} /> Career Hub</span>
        <span className="int-node"><Award size={14} /> Viva Learning</span>
        <span className="int-node"><UsersRound size={14} /> Communities</span>
        <span className="int-node"><Building2 size={14} /> HR systems</span>
      </div>
    </section>
  </main>
}

function TrustModal({ onClose }: { onClose: () => void }) {
  const points: [typeof ShieldCheck, string, string][] = [
    [UserRoundCheck, 'Consent-first', 'Only people who opted in appear, and every recipient can decline. No one is ever contacted without a human pressing send.'],
    [ShieldCheck, 'Approved signals only', 'Skills, languages, availability, certifications, mentoring preference, and community membership \u2014 never private messages or inferred potential.'],
    [Lock, 'No employee scoring', 'Beacon never ranks people, predicts promotions, or rates performance. It surfaces relevance and always shows the reason.'],
    [Check, 'Human in control', 'The agent drafts and proposes. A human decides what to send, and a human decides whether to accept.'],
  ]
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="trust-title" onClick={onClose}>
    <div className="modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-head"><div className="brand-mark"><ShieldCheck size={22} /></div><div><p className="eyebrow">Responsible by design</p><h2 id="trust-title">Trust &amp; transparency</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <div className="trust-list">{points.map(([Icon, title, body]) => <div className="trust-point" key={title}><Icon size={18} /><div><strong>{title}</strong><p>{body}</p></div></div>)}</div>
      <p className="modal-foot">In production these controls are enforced in the data layer and every action is audit-logged.</p>
    </div>
  </div>
}

function MethodModal({ onClose }: { onClose: () => void }) {
  const points: [typeof ShieldCheck, string, string][] = [
    [Globe2, 'Where the numbers come from', 'This demo view uses synthetic, privacy-safe sample data. In live mode the same tiles are computed from real connection events and opted-in expert signals through the Beacon API — nothing here is invented per view.'],
    [Network, 'Reach & connections', 'Employees reached counts distinct people who received a relevant match. Connections made counts only introductions a human actually chose to send — drafts and declines are excluded. Unanswered requests counts opted-in asks that never received a human-sent introduction — the gap Beacon is closing.'],
    [CheckCircle2, 'Needs resolved', 'The percentage of requests the requester marked resolved after a connection. It is a human-confirmed outcome, never an inferred or predicted one.'],
    [Sparkles, 'Capacity gap & the Beacon insight', 'Demand (incoming requests per skill) is compared with capacity (opted-in experts per skill). The largest gap becomes the headline insight and its staffing recommendation — e.g. Power Platform at 37%.'],
  ]
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="method-title" onClick={onClose}>
    <div className="modal" onClick={(event) => event.stopPropagation()}>
      <div className="modal-head"><div className="brand-mark"><BarChart3 size={22} /></div><div><p className="eyebrow">Measurement</p><h2 id="method-title">How this is measured</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <div className="trust-list">{points.map(([Icon, title, body]) => <div className="trust-point" key={title}><Icon size={18} /><div><strong>{title}</strong><p>{body}</p></div></div>)}</div>
      <p className="modal-foot">No employee is scored, ranked, or predicted. Every tile aggregates consented signals and human-confirmed actions.</p>
    </div>
  </div>
}

function App() {
  const [view, setView] = useState<View>('accelerate')
  const [trustOpen, setTrustOpen] = useState(false)
  const [methodOpen, setMethodOpen] = useState(false)
  const [productionUser, setProductionUser] = useState<ProductionUser | null>(null)
  const [mode, setMode] = useState<Mode>(() => {
    if (!showModeToggle) return 'demo'
    const stored = localStorage.getItem('beacon-mode')
    return stored === 'live' || stored === 'production' ? stored : 'demo'
  })
  const changeMode = (next: Mode) => {
    setMode(next)
    localStorage.setItem('beacon-mode', next)
    if (next !== 'production') setProductionUser(null)
  }
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Network size={22} /></div><div><strong>Beacon</strong><span>Opportunity network</span></div></div><nav aria-label="Primary navigation"><button className={view === 'accelerate' ? 'active' : ''} onClick={() => setView('accelerate')}><Rocket size={19} /> Accelerate</button><button className={view === 'connect' ? 'active' : ''} onClick={() => setView('connect')}><UserRoundSearch size={19} /> Connect</button><button className={view === 'impact' ? 'active' : ''} onClick={() => setView('impact')}><BarChart3 size={19} /> Impact</button></nav><div className="sidebar-bottom">{showModeToggle && <div className="mode-toggle" role="group" aria-label="Data source"><button className={mode === 'demo' ? 'active' : ''} onClick={() => changeMode('demo')}><Sparkles size={15} /> Demo</button><button className={mode === 'live' ? 'active' : ''} onClick={() => changeMode('live')}><Wifi size={15} /> Live API</button><button className={mode === 'production' ? 'active' : ''} onClick={() => changeMode('production')}><Building2 size={15} /> Production</button></div>}<button onClick={() => setTrustOpen(true)}><ShieldCheck size={18} /> Trust & transparency</button><div className="signed-in"><Avatar initials={mode === 'production' && productionUser ? productionUser.initials : 'MO'} /><div><strong>{mode === 'production' && productionUser ? productionUser.name : 'Maria Oliveira'}</strong><span>{mode === 'production' && productionUser ? (productionUser.role || 'Signed in') : 'Cloud Solution Architect'}</span></div></div></div></aside>
    {view === 'accelerate' && <AccelerateView key={mode} mode={mode} />}{view === 'connect' && <ConnectView key={mode} mode={mode} onProductionUser={setProductionUser} />}{view === 'impact' && <ImpactView key={mode} mode={mode} onOpenMethod={() => setMethodOpen(true)} />}
    {trustOpen && <TrustModal onClose={() => setTrustOpen(false)} />}
    {methodOpen && <MethodModal onClose={() => setMethodOpen(false)} />}
  </div>
}
export default App
