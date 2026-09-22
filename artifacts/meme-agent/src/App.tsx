import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  CircleStop,
  Crosshair,
  Cpu,
  Clock3,
  Database,
  Eye,
  FileSearch,
  Flame,
  Filter,
  Gauge,
  History,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Menu,
  Network,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  Terminal,
  Timer,
  UserRound,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetDiscoveryQueryKey,
  useGetAgentOverview,
  useGetDiscovery,
  useListDecisions,
  useListDiscoveries,
  useListSimulations,
  useRunReplay,
  type Discovery,
  type ReplayInputDataset,
} from '@workspace/api-client-react';
import {
  Link,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'Command center', icon: LayoutDashboard },
  { href: '/discoveries', label: 'Live discovery', icon: Radio },
  { href: '/investigations', label: 'Investigations', icon: FileSearch },
  { href: '/risk', label: 'Risk center', icon: ShieldAlert },
  { href: '/replay', label: 'Simulation lab', icon: History },
  { href: '/memory', label: 'Agent memory', icon: Bot },
  { href: '/performance', label: 'Performance', icon: BarChart3 },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

function money(value?: number, digits = 0) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(value);
}
function compact(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
function pct(value?: number, digits = 1) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`;
}
function timeAgo(iso?: string) {
  if (!iso) return '—';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good' | 'warn' | 'danger' | 'accent' | 'neutral' }) {
  const tones = {
    good: 'border-teal-700/20 bg-teal-700/10 text-teal-800',
    warn: 'border-amber-700/20 bg-amber-500/10 text-amber-800',
    danger: 'border-red-700/20 bg-red-600/10 text-red-800',
    accent: 'border-orange-700/20 bg-orange-500/10 text-orange-800',
    neutral: 'border-stone-400/35 bg-stone-400/10 text-stone-700',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${tones[tone]}`}>{children}</span>;
}

function Metric({ label, value, sub, accent = false }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border p-4 ${accent ? 'border-orange-700/25 bg-orange-500/10' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)]'}`}>
      <div className="eyebrow">{label}</div>
      <div className={`mt-2 truncate text-[26px] font-bold leading-none headline ${accent ? 'text-orange-800' : ''}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</div>
      {sub && <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{sub}</div>}
    </div>
  );
}

function ScoreTile({ label, value, tone = 'teal', detail }: { label: string; value: number; tone?: 'teal' | 'orange' | 'red'; detail?: string }) {
  const styles = {
    teal: { text: 'text-[#28786e]', fill: 'bg-[hsl(var(--primary))]', wash: 'bg-[#e8f0eb]' },
    orange: { text: 'text-[#a2642a]', fill: 'bg-[#e56845]', wash: 'bg-[#f7ecd8]' },
    red: { text: 'text-[#a34f43]', fill: 'bg-[#b34f48]', wash: 'bg-[#f5e2dc]' },
  }[tone];
  return (
    <div className={`rounded-xl p-4 ${styles.wash}`}>
      <div className="eyebrow">{label}</div>
      <div className={`mt-2 text-3xl font-extrabold headline ${styles.text}`}>{value}<span className="ml-1 text-sm font-bold">/100</span></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/60"><div className={`h-full rounded-full ${styles.fill}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
      {detail && <div className="mt-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</div>}
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.1em] transition-colors ${active ? 'border-[#213638] bg-[#213638] text-[#f8f1e4]' : 'border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--foreground))]'}`}>{children}</button>;
}

function SignalCard({ item, onClick }: { item: Discovery; onClick?: () => void }) {
  const riskTone = item.scores.risk >= 70 ? 'danger' : item.scores.risk >= 45 ? 'warn' : 'good';
  return (
    <button onClick={onClick} className="panel group w-full rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#e56845]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="mono text-lg font-extrabold text-[hsl(var(--primary))]">${item.symbol}</span><StatusPill tone={item.status === 'PAPER-TRADE' ? 'accent' : item.status === 'INVESTIGATE' ? 'good' : 'neutral'}>{item.status.replace('-', ' ')}</StatusPill></div>
          <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{item.ageMinutes}m old · {item.venue}</div>
        </div>
        <ChevronRight size={16} className="mt-1 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
        <div><div className="eyebrow">Liquidity</div><div className="mono mt-1 font-bold">{money(item.liquidity, 0)}</div></div>
        <div><div className="eyebrow">Volume</div><div className="mono mt-1 font-bold">{money(item.volume5m, 0)}</div></div>
        <div><div className="eyebrow">Transactions</div><div className="mono mt-1 font-bold">{(item.buys + item.sells).toLocaleString()}</div></div>
        <div><div className="eyebrow">Holders</div><div className="mono mt-1 font-bold">{item.holders.toLocaleString()}</div></div>
        <div><div className="eyebrow">Opportunity</div><div className="mono mt-1 font-bold text-[#28786e]">{item.scores.opportunity}</div></div>
        <div><div className="eyebrow">Risk / conf.</div><div className={`mono mt-1 font-bold ${riskTone === 'danger' ? 'text-[#a34f43]' : riskTone === 'warn' ? 'text-[#a2642a]' : 'text-[#28786e]'}`}>{item.scores.risk} / {item.scores.confidence}</div></div>
      </div>
    </button>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-300/45 ${className}`} />;
}

function QueryError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="panel flex min-h-[180px] flex-col items-center justify-center rounded-2xl p-6 text-center">
      <ShieldAlert className="mb-3 text-red-700" size={25} />
      <div className="font-bold">Signal feed unavailable</div>
      <p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">The API did not return a usable response. Nothing has been executed.</p>
      {onRetry && <button onClick={onRetry} data-testid="button-retry" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--foreground))] px-3 py-2 text-xs font-bold text-[hsl(var(--background))]"><RefreshCw size={13} /> Retry feed</button>}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="panel flex min-h-[210px] flex-col items-center justify-center rounded-2xl p-8 text-center">
      <Database size={25} className="text-[hsl(var(--primary))]" />
      <div className="mt-3 font-bold">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navItems.find((item) => item.href === location)?.label ?? 'Cockpit';
  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-[hsl(var(--border))] bg-[#f1eadb] px-4 py-5 transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-brand" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#213638] text-[#f5b44c] shadow-[4px_4px_0_#e56845]"><Terminal size={18} /></div>
            <div><div className="text-[15px] font-extrabold tracking-[-.04em]">Meme Agent</div><div className="eyebrow mt-0.5">Solana intelligence</div></div>
          </Link>
          <button className="rounded-md p-1 md:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={17} /></button>
        </div>
        <div className="mt-9 px-2 eyebrow">Workspace</div>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`nav-link flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold ${active ? 'bg-[#213638] text-[#f8f1e4] shadow-[3px_3px_0_#e56845]' : 'text-[#586260] hover:bg-[#e7ddca] hover:text-[#213638]'}`}><span className="flex items-center gap-3"><Icon size={16} />{label}</span>{active && <ChevronRight size={14} />}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-[#cfc2ad] bg-[#e8decb] p-3">
          <div className="flex items-center gap-2"><span className="pulse-dot h-2 w-2 rounded-full bg-[#238b83]" /><span className="eyebrow text-[#356e69]">Paper only</span></div>
          <p className="mt-2 text-xs leading-relaxed text-[#586260]">No wallet connection. No order routing. Every position is a hypothesis.</p>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[#213638]/20 md:hidden" data-testid="button-overlay" />}
      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg border border-[hsl(var(--border))] p-2 md:hidden" data-testid="button-open-menu"><Menu size={18} /></button><div><div className="eyebrow">Operations console / {current}</div><div className="mt-1 text-sm font-bold">Research loop <span className="mx-1 text-[hsl(var(--muted-foreground))]">·</span> <span className="font-normal text-[hsl(var(--muted-foreground))]">paper environment</span></div></div></div>
          <div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> Data stream nominal</div><div className="grid h-8 w-8 place-items-center rounded-full bg-[#f5b44c] text-xs font-extrabold text-[#213638]">RA</div></div>
        </header>
        <main className="app-grid min-h-[calc(100dvh-70px)] px-4 py-6 md:px-9 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function PageHeading({ kicker, title, detail, action }: { kicker: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="eyebrow text-[hsl(var(--primary))]">{kicker}</div><h1 className="headline mt-2 text-3xl font-extrabold md:text-[42px]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</p></div>{action}</div>;
}

function Dashboard() {
  const overview = useGetAgentOverview();
  const discoveries = useListDiscoveries();
  const decisions = useListDecisions();
  const [agentPaused, setAgentPaused] = useState(false);
  if (overview.isLoading || discoveries.isLoading || decisions.isLoading) return <DashboardSkeleton />;
  if (overview.isError || !overview.data || discoveries.isError || decisions.isError) return <QueryError onRetry={() => { overview.refetch(); discoveries.refetch(); decisions.refetch(); }} />;
  const data = overview.data;
  const currentToken = discoveries.data?.find((item) => item.status === 'PAPER-TRADE') ?? discoveries.data?.[0];
  const lastDecision = decisions.data?.[0];
  const agentStatus = agentPaused ? 'PAUSED' : currentToken?.status === 'INVESTIGATE' ? 'INVESTIGATING' : 'ACTIVE';
  return <div className="reveal">
    <PageHeading kicker="Live agent loop / command center" title="What is the agent seeing right now?" detail="A control surface for evidence, uncertainty, and paper-only decisions. The agent never moves from a fast signal to an irreversible action without a review gate." action={<div className="flex items-center gap-2"><StatusPill tone={agentStatus === 'PAUSED' ? 'warn' : 'good'}><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />Agent {agentStatus}</StatusPill><button onClick={() => setAgentPaused((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] px-3 py-2 text-xs font-bold">{agentPaused ? <Play size={13} /> : <Pause size={13} />}{agentPaused ? 'Resume' : 'Pause'}</button></div>} />
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="panel rounded-2xl p-5 md:p-7">
          <div className="flex items-start justify-between gap-4"><div><div className="eyebrow text-[hsl(var(--primary))]">Agent command center</div><h2 className="mt-1 text-2xl font-extrabold headline">{currentToken ? 'Currently investigating' : 'Waiting for a discovery'}</h2></div><div className="flex items-center gap-2"><StatusPill tone="accent">Paper only</StatusPill><Link href="/settings" className="rounded-lg border border-[hsl(var(--border))] p-2 text-[hsl(var(--muted-foreground))]"><SettingsIcon size={15} /></Link></div></div>
        {currentToken ? <><div className="mt-6 flex items-end justify-between gap-4"><div><div className="mono text-4xl font-extrabold text-[hsl(var(--primary))]">${currentToken.symbol}</div><div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{currentToken.name} · {currentToken.mint.slice(0, 12)}…</div></div><StatusPill tone={currentToken.status === 'PAPER-TRADE' ? 'accent' : 'good'}>{currentToken.status}</StatusPill></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><ScoreTile label="Opportunity" value={currentToken.scores.opportunity} detail="Fast-path signal strength" /><ScoreTile label="Risk" value={currentToken.scores.risk} tone="red" detail="Deterministic risk load" /><ScoreTile label="Confidence" value={currentToken.scores.confidence} tone="orange" detail="Evidence quality and agreement" /></div><div className="mt-5 rounded-xl bg-[#f7ecd8] p-4"><div className="eyebrow text-[#a2642a]">AI assessment</div><p className="mt-2 max-w-2xl text-sm leading-relaxed">{currentToken.reasoning}</p><div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[#8b5c2a]"><Timer size={13} /> Waiting for: {currentToken.nextAction}</div></div></> : <EmptyState title="No token is currently selected" detail="The deterministic discovery filter is waiting for a candidate that clears the minimum evidence gate." />}
      </div>
      <div className="space-y-5">
        <div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Agent state</div><h2 className="mt-1 text-lg font-bold">Decision posture</h2></div><Crosshair size={18} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 space-y-3 text-sm"><div className="flex items-center justify-between"><span className="text-[hsl(var(--muted-foreground))]">Current task</span><span className="font-bold">{currentToken ? 'Validate persistence' : 'Observe stream'}</span></div><div className="flex items-center justify-between"><span className="text-[hsl(var(--muted-foreground))]">Loop stage</span><span className="mono font-bold">{data.loopStage}</span></div><div className="flex items-center justify-between"><span className="text-[hsl(var(--muted-foreground))]">Next scheduled action</span><span className="font-bold text-right">{currentToken?.nextAction ?? 'Scan new launches'}</span></div><div className="flex items-center justify-between"><span className="text-[hsl(var(--muted-foreground))]">Last decision</span><span className="font-bold">{lastDecision?.decision ?? '—'}</span></div></div></div>
        <div className="rounded-2xl bg-[#213638] p-5 text-[#f5efe3] shadow-[5px_5px_0_#e56845]"><div className="flex items-center justify-between"><div className="eyebrow text-[#a6cbc1]">Safety boundary</div><LockKeyhole size={17} className="text-[#f5b44c]" /></div><p className="mt-3 text-sm leading-relaxed text-[#c8d6cf]">Critical deterministic risks block decisions. Contextual reasoning can explain a gate, but cannot override it.</p><Link href="/risk" className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#f5b44c]">Open risk center <ArrowUpRight size={14} /></Link></div>
      </div>
    </section>
    <section className="mt-5">
      <div className="mb-3 flex items-end justify-between"><div><div className="eyebrow">Live discovery feed</div><h2 className="mt-1 text-xl font-bold">Newly detected opportunities</h2></div><Link href="/discoveries" className="text-xs font-bold text-[hsl(var(--primary))]">View all <ArrowUpRight className="ml-1 inline" size={13} /></Link></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{(discoveries.data ?? []).map((item) => <SignalCard key={item.id} item={item} onClick={() => { window.location.href = `/discoveries?token=${item.id}`; }} />)}</div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">System health</div><h2 className="mt-1 text-lg font-bold">Inputs you can trust</h2></div><Network size={18} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 space-y-3">{data.sourceHealth.map((source) => <div key={source.name} className="flex items-center justify-between border-b border-[hsl(var(--border)/.7)] pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-2.5"><span className={`h-2 w-2 rounded-full ${source.status === 'HEALTHY' ? 'bg-[hsl(var(--primary))]' : source.status === 'DEGRADED' ? 'bg-[#d49a3e]' : 'bg-[#b34f48]'}`} /><span className="text-sm font-semibold">{source.name}</span></div><span className="mono text-xs text-[hsl(var(--muted-foreground))]">{source.status === 'OFFLINE' ? 'offline' : `${source.latencyMs}ms`}</span></div>)}</div></div>
      <div className="panel rounded-2xl p-5"><div className="eyebrow">Paper performance</div><h2 className="mt-1 text-lg font-bold">How the agent has performed</h2><div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Equity" value={money(data.performance.equity)} accent /><Metric label="Return" value={pct(data.performance.returnPct)} /><Metric label="Win rate" value={pct(data.performance.winRate)} /><Metric label="False pos." value={pct(data.performance.falsePositiveRate)} /></div><div className="mt-5 flex h-16 items-end gap-1.5 border-b border-dashed border-[hsl(var(--border))]">{[30, 38, 34, 47, 42, 54, 51, 65, 58, 72, 69, 88, 81, 95, 91, 100].map((height, i) => <div key={i} className={`flex-1 rounded-t-sm ${i > 11 ? 'bg-[hsl(var(--primary))]' : 'bg-[#c8ddd5]'}`} style={{ height: `${height}%` }} />)}</div></div>
    </section>
  </div>;
}

function DashboardSkeleton() {
  return <div className="space-y-5"><Skeleton className="h-32 w-3/4" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-80" /></div>;
}

function ScoreBar({ label, value, color = 'teal' }: { label: string; value: number; color?: 'teal' | 'orange' | 'red' }) {
  const colors = { teal: 'bg-[hsl(var(--primary))]', orange: 'bg-[#e56845]', red: 'bg-[#b34f48]' };
  return <div><div className="mb-1 flex justify-between text-[11px] font-semibold"><span>{label}</span><span className="mono">{value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-stone-200"><div className={`h-full rounded-full ${colors[color]}`} style={{ width: `${Math.min(value, 100)}%` }} /></div></div>;
}

function DiscoveryRow({ item, selected, onClick }: { item: Discovery; selected: boolean; onClick: () => void }) {
  const riskTone = item.creatorRisk === 'CRITICAL' || item.creatorRisk === 'HIGH' ? 'danger' : item.creatorRisk === 'MEDIUM' ? 'warn' : 'good';
  return <button onClick={onClick} data-testid={`button-discovery-${item.id}`} className={`w-full border-b border-[hsl(var(--border)/.72)] p-4 text-left transition-colors last:border-0 hover:bg-[#f2eadc] ${selected ? 'bg-[#e8f0eb] shadow-[inset_3px_0_0_hsl(var(--primary))]' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="mono text-sm font-bold text-[hsl(var(--primary))]">${item.symbol}</span><StatusPill tone={item.status === 'PAPER-TRADE' ? 'accent' : item.status === 'INVESTIGATE' ? 'good' : 'neutral'}>{item.status.replace('-', ' ')}</StatusPill></div><div className="mt-1 truncate text-sm font-semibold">{item.name}</div></div><ChevronRight size={15} className="mt-1 shrink-0 text-[hsl(var(--muted-foreground))]" /></div><div className="mt-3 grid grid-cols-3 gap-2"><div><div className="eyebrow">Opportunity</div><div className="mono mt-1 text-xs font-bold">{item.scores.opportunity}</div></div><div><div className="eyebrow">Risk</div><div className="mono mt-1 text-xs font-bold">{item.scores.risk}</div></div><div><div className="eyebrow">Age</div><div className="mono mt-1 text-xs font-bold">{item.ageMinutes}m</div></div></div><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-[hsl(var(--muted-foreground))]">{item.venue} · {compact(item.marketCap)} mcap</span><StatusPill tone={riskTone}>{item.creatorRisk} creator</StatusPill></div></button>;
}

function DiscoveryDetail({ id }: { id: string | null }) {
  const detail = useGetDiscovery(id ?? '', { query: { enabled: !!id, queryKey: getGetDiscoveryQueryKey(id ?? '') } });
  const [tab, setTab] = useState('Overview');
  if (!id) return <div className="panel flex min-h-[520px] flex-col items-center justify-center rounded-2xl p-8 text-center"><FileSearch size={30} className="text-[hsl(var(--primary))]" /><h2 className="mt-4 text-lg font-bold">Select a discovery</h2><p className="mt-2 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">Choose a token from the queue to inspect its evidence trail and unresolved risks.</p></div>;
  if (detail.isLoading) return <div className="panel rounded-2xl p-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-5 h-32 w-full" /><Skeleton className="mt-4 h-48 w-full" /></div>;
  if (detail.isError || !detail.data) return <QueryError onRetry={() => detail.refetch()} />;
  const item = detail.data;
  const positiveSignals = item.evidence.filter((evidence) => evidence.type !== 'UNKNOWN');
  const negativeSignals = item.risks;
  const tabs = ['Overview', 'Market', 'Holders', 'Creator', 'Risk', 'AI Analysis', 'History'];
  return <div className="panel rounded-2xl p-5 md:p-6">
    <div className="flex items-start justify-between gap-4"><div><div className="eyebrow">Investigation / {item.id}</div><h2 className="headline mt-2 text-2xl font-extrabold"><span className="text-[hsl(var(--primary))]">${item.symbol}</span> {item.name}</h2><div className="mono mt-2 truncate text-[10px] text-[hsl(var(--muted-foreground))]">{item.mint}</div></div><StatusPill tone={item.status === 'PAPER-TRADE' ? 'accent' : 'good'}>{item.status}</StatusPill></div>
    <div className="mt-6 flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))] pb-1">{tabs.map((tabName) => <button key={tabName} onClick={() => setTab(tabName)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] ${tab === tabName ? 'bg-[#213638] text-[#f8f1e4]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[#f2eadc]'}`}>{tabName}</button>)}</div>
    <div className="mt-6">
      {tab === 'Overview' && <div className="space-y-6"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Price" value={money(item.price, 6)} /><Metric label="Liquidity" value={compact(item.liquidity)} /><Metric label="5m volume" value={compact(item.volume5m)} /><Metric label="Momentum" value={item.momentum} /></div><div className="grid gap-6 lg:grid-cols-[1fr_.8fr]"><div><div className="eyebrow">Scoring model</div><div className="mt-4 space-y-4"><ScoreBar label="Opportunity" value={item.scores.opportunity} /><ScoreBar label="Confidence" value={item.scores.confidence} color="orange" /><ScoreBar label="Risk load" value={item.scores.risk} color="red" /></div><div className="mt-6 rounded-xl bg-[#f7ecd8] p-4"><div className="eyebrow text-[#a2642a]">Current reasoning</div><p className="mt-2 text-sm leading-relaxed">{item.reasoning}</p><div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#a2642a]"><Zap size={13} /> Next: {item.nextAction}</div></div></div><div className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="eyebrow">Metadata</div><div className="mt-3 space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-[hsl(var(--muted-foreground))]">Venue</span><span className="font-bold">{item.venue}</span></div><div className="flex justify-between gap-4"><span className="text-[hsl(var(--muted-foreground))]">Age</span><span className="font-bold">{item.ageMinutes} minutes</span></div><div className="flex justify-between gap-4"><span className="text-[hsl(var(--muted-foreground))]">Market cap</span><span className="font-bold">{money(item.marketCap)}</span></div><div className="flex justify-between gap-4"><span className="text-[hsl(var(--muted-foreground))]">Creator risk</span><StatusPill tone={item.creatorRisk === 'LOW' ? 'good' : 'danger'}>{item.creatorRisk}</StatusPill></div></div></div></div></div>}
      {tab === 'Market' && <div className="grid gap-5 sm:grid-cols-2"><Metric label="Liquidity" value={money(item.liquidity)} sub="Visible exit depth" accent /><Metric label="5m volume" value={money(item.volume5m)} sub="Observed market activity" /><Metric label="Buys / sells" value={`${item.buys} / ${item.sells}`} sub={`${((item.buys / Math.max(item.sells, 1))).toFixed(2)}x buy pressure`} /><Metric label="Momentum" value={`${item.momentum}/100`} sub="Deterministic market behavior score" /><div className="rounded-xl border border-[hsl(var(--border))] p-4 sm:col-span-2"><div className="eyebrow">Market behavior</div><div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#f5e2dc]"><div className="bg-[hsl(var(--primary))]" style={{ width: `${(item.buys / Math.max(item.buys + item.sells, 1)) * 100}%` }} /><div className="bg-[#b34f48]" style={{ width: `${(item.sells / Math.max(item.buys + item.sells, 1)) * 100}%` }} /></div><div className="mt-3 flex justify-between text-xs"><span className="font-bold text-[#28786e]">Buys {item.buys}</span><span className="font-bold text-[#a34f43]">Sells {item.sells}</span></div></div></div>}
      {tab === 'Holders' && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Total holders" value={item.holders.toLocaleString()} /><Metric label="Top 10 share" value={`${item.top10Concentration}%`} sub="Lower is healthier" /><Metric label="Distribution score" value={`${Math.max(0, 100 - item.top10Concentration)}/100`} accent /></div><div className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex items-center justify-between"><div><div className="eyebrow">Holder distribution</div><h3 className="mt-1 font-bold">Concentration is a hard input</h3></div><WalletCards size={18} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 h-5 overflow-hidden rounded-full bg-[#e8f0eb]"><div className="h-full bg-[#e56845]" style={{ width: `${item.top10Concentration}%` }} /></div><div className="mt-2 flex justify-between text-xs"><span className="font-bold text-[#a2642a]">Top 10 wallets {item.top10Concentration}%</span><span className="text-[hsl(var(--muted-foreground))]">Remaining wallets {100 - item.top10Concentration}%</span></div><div className="mt-5 rounded-lg bg-[#f7ecd8] p-3 text-xs leading-relaxed text-[#806b51]"><CircleHelp className="mr-1 inline" size={13} />Wallet intent is not inferred from concentration alone. The agent waits for wallet-behavior enrichment before increasing conviction.</div></div></div>}
      {tab === 'Creator' && <div className="space-y-5"><div className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex items-center justify-between"><div><div className="eyebrow">Creator history</div><h3 className="mt-1 text-lg font-bold">Linked launch behavior</h3></div><UserRound size={19} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#e8f0eb] p-3"><div className="eyebrow">Risk classification</div><div className="mt-2 font-bold">{item.creatorRisk}</div></div><div className="rounded-lg bg-[#f7ecd8] p-3"><div className="eyebrow">Known launches</div><div className="mt-2 font-bold">{item.creatorRisk === 'LOW' ? '1 observed' : item.creatorRisk === 'HIGH' ? '3 observed' : '2 observed'}</div></div><div className="rounded-lg bg-[#f5e2dc] p-3"><div className="eyebrow">Wallet links</div><div className="mt-2 font-bold">{item.creatorRisk === 'LOW' ? 'No cluster' : 'Needs review'}</div></div></div><p className="mt-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{item.creatorRisk === 'LOW' ? 'No critical creator pattern is currently detected. This is a bounded conclusion, not a claim that the creator is safe.' : 'Creator-linked wallets require additional verification. The risk gate stays visible until the wallet cluster is resolved.'}</p></div><div className="rounded-xl border border-dashed border-[#d49a3e]/50 bg-[#f7ecd8]/50 p-4 text-xs text-[#806b51]"><CircleHelp className="mr-1 inline" size={13} />Creator evidence is a research input. It never replaces direct market and holder observations.</div></div>}
      {tab === 'Risk' && <div><div className="eyebrow">Risk register / severity first</div><div className="mt-3 space-y-3">{item.risks.length ? item.risks.map((risk, i) => <div key={`${risk.label}-${i}`} className={`rounded-lg border p-4 ${risk.severity === 'CRITICAL' ? 'border-red-700/25 bg-red-600/10' : risk.severity === 'HIGH' ? 'border-red-700/15 bg-red-600/5' : 'border-amber-700/20 bg-amber-500/10'}`}><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-bold"><AlertTriangle size={15} />{risk.label}</span><StatusPill tone={risk.severity === 'CRITICAL' || risk.severity === 'HIGH' ? 'danger' : 'warn'}>{risk.severity}</StatusPill></div><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{risk.detail}</p>{risk.severity === 'CRITICAL' && <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-800"><ShieldAlert size={12} /> Critical risks cannot be overridden</div>}</div>) : <EmptyState title="No elevated risks recorded" detail="The deterministic risk engine has not raised a current flag for this token." />}</div><div className="mt-5 rounded-xl border border-dashed border-[#d49a3e]/50 bg-[#f7ecd8]/50 p-4 text-xs leading-relaxed text-[#806b51]">Data-quality problems and missing sources remain separate from market risk. Unknown is not the same as safe.</div></div>}
      {tab === 'AI Analysis' && <div className="space-y-5"><div className="rounded-xl bg-[#213638] p-5 text-[#f5efe3]"><div className="eyebrow text-[#a6cbc1]">Agent assessment</div><p className="mt-3 text-lg font-bold leading-relaxed">{item.reasoning}</p><div className="mt-4 flex items-center gap-2 text-sm font-bold text-[#f5b44c]"><Sparkles size={15} /> Confidence {item.scores.confidence}% · Decision {item.status}</div></div><div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl bg-[#e8f0eb] p-4"><div className="eyebrow text-[#39756d]">Positive signals</div><div className="mt-3 space-y-3">{positiveSignals.map((signal, i) => <div key={i} className="flex gap-2 text-sm"><Check size={15} className="mt-0.5 shrink-0 text-[#28786e]" /><span>{signal.value}</span></div>)}</div></div><div className="rounded-xl bg-[#f5e2dc] p-4"><div className="eyebrow text-[#a34f43]">Negative signals</div><div className="mt-3 space-y-3">{negativeSignals.length ? negativeSignals.map((risk, i) => <div key={i} className="flex gap-2 text-sm"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-[#a34f43]" /><span>{risk.detail}</span></div>) : <div className="text-sm text-[hsl(var(--muted-foreground))]">No elevated negative signals.</div>}</div></div><div className="rounded-xl bg-[#f7ecd8] p-4"><div className="eyebrow text-[#a2642a]">Unknowns</div><div className="mt-3 space-y-3">{item.unknowns.map((unknown, i) => <div key={i} className="flex gap-2 text-sm"><CircleHelp size={15} className="mt-0.5 shrink-0 text-[#a2642a]" /><span>{unknown}</span></div>)}</div></div></div></div>}
      {tab === 'History' && <div className="space-y-4"><div className="eyebrow">Important events</div>{[`${item.ageMinutes}m ago · Token discovered`, `${Math.max(item.ageMinutes - 8, 1)}m ago · Market data enriched`, `${Math.max(item.ageMinutes - 12, 1)}m ago · Holder distribution scored`, 'Now · Agent assessment recorded'].map((event, i) => <div key={event} className="flex gap-3 rounded-lg border border-[hsl(var(--border))] p-4"><div className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e8f0eb] text-[hsl(var(--primary))]"><Clock3 size={13} /></div><div><div className="text-sm font-bold">{event.split(' · ')[1]}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{event.split(' · ')[0]} · source state preserved in replay snapshot</div></div></div>)}</div>}
    </div>
  </div>;
}

function Discoveries() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [filter, setFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('token'));
  const discoveries = useListDiscoveries({ search: search || undefined, status: status as 'ALL' | 'IGNORE' | 'WATCH' | 'INVESTIGATE' | 'PAPER-TRADE' | 'REVIEW' });
  const items = discoveries.data ?? [];
  const filteredItems = items.filter((item) => {
    if (filter === 'NEW') return item.ageMinutes <= 30;
    if (filter === 'ACTIVITY') return item.volume5m >= 100000;
    if (filter === 'LIQUIDITY') return item.liquidity >= 100000;
    if (filter === 'MOMENTUM') return item.momentum >= 65;
    if (filter === 'LOW_RISK') return item.scores.risk <= 35;
    if (filter === 'AGENT') return item.status === 'PAPER-TRADE' || item.status === 'INVESTIGATE';
    return true;
  });
  const filterOptions = [['ALL', 'All'], ['NEW', 'New launches'], ['ACTIVITY', 'High activity'], ['LIQUIDITY', 'High liquidity'], ['MOMENTUM', 'High momentum'], ['LOW_RISK', 'Low risk'], ['AGENT', 'Agent-selected']];
  return <div className="reveal"><PageHeading kicker="Signal intake / real-time queue" title="The feed before the decision." detail="Every card is a candidate, not a trade. Filter the stream, open an investigation, and see the evidence that survived the fast path." action={<StatusPill tone="good"><Radio size={12} /> {filteredItems.length} visible</StatusPill>} /><div className="mb-4 flex flex-col gap-3"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-discovery-search" placeholder="Search symbol, name, mint…" className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--primary))]" /></div><div className="flex items-center gap-2"><Filter size={15} className="text-[hsl(var(--muted-foreground))]" /><select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-discovery-status" className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] px-3 text-sm font-semibold outline-none"><option value="ALL">All decisions</option><option value="INVESTIGATE">Investigate</option><option value="WATCH">Watch</option><option value="PAPER-TRADE">Paper-trade</option><option value="REVIEW">Review</option><option value="IGNORE">Ignore</option></select></div></div><div className="flex flex-wrap gap-2">{filterOptions.map(([value, label]) => <FilterChip key={value} active={filter === value} onClick={() => setFilter(value)}>{label}</FilterChip>)}</div></div><div className="grid gap-5 xl:grid-cols-[minmax(360px,.85fr)_1.15fr]">{discoveries.isLoading ? <div className="panel rounded-2xl p-4 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div> : discoveries.isError ? <QueryError onRetry={() => discoveries.refetch()} /> : filteredItems.length === 0 ? <EmptyState title="No discoveries match" detail="Try clearing the search or widening the queue filter." /> : <div className="max-h-[800px] space-y-3 overflow-auto pr-1">{filteredItems.map((item) => <SignalCard key={item.id} item={item} onClick={() => setSelectedId(item.id)} />)}</div>}<DiscoveryDetail id={selectedId} /></div></div>;
}

function Replay() {
  const replay = useRunReplay();
  const [dataset, setDataset] = useState<ReplayInputDataset>('DEMO_24H');
  const [startingCapital, setStartingCapital] = useState('10000');
  const [slippageBps, setSlippageBps] = useState('35');
  const [feeBps, setFeeBps] = useState('30');
  const [latencyMs, setLatencyMs] = useState('250');
  const submit = (e: React.FormEvent) => { e.preventDefault(); replay.mutate({ data: { dataset, startingCapital: Number(startingCapital), slippageBps: Number(slippageBps), feeBps: Number(feeBps), latencyMs: Number(latencyMs) } }); };
  const result = replay.data;
  return <div className="reveal"><PageHeading kicker="Historical validation / deterministic" title="Replay the tape." detail="Run the agent against a fixed dataset with explicit friction. Same seed, same inputs, reproducible result." action={<StatusPill tone="accent"><History size={12} /> Paper only</StatusPill>} /><div className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]"><form onSubmit={submit} className="panel rounded-2xl p-5 md:p-6"><div className="eyebrow">Replay configuration</div><h2 className="mt-1 text-xl font-bold">Set the constraints</h2><div className="mt-6 space-y-4"><label className="block"><span className="text-xs font-bold">Dataset</span><select value={dataset} onChange={(e) => setDataset(e.target.value as ReplayInputDataset)} data-testid="select-replay-dataset" className="mt-2 h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"><option value="DEMO_24H">Demo / 24 hour tape</option><option value="DEMO_7D">Demo / 7 day tape</option></select></label><label className="block"><span className="text-xs font-bold">Starting capital</span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[hsl(var(--muted-foreground))]">$</span><input type="number" min="1" value={startingCapital} onChange={(e) => setStartingCapital(e.target.value)} data-testid="input-starting-capital" className="h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-7 pr-3 text-sm outline-none focus:border-[hsl(var(--primary))]" /></div></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="text-xs font-bold">Slippage (bps)</span><input type="number" min="0" value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} data-testid="input-slippage" className="mt-2 h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm" /></label><label className="block"><span className="text-xs font-bold">Fee (bps)</span><input type="number" min="0" value={feeBps} onChange={(e) => setFeeBps(e.target.value)} data-testid="input-fee" className="mt-2 h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm" /></label></div><label className="block"><span className="text-xs font-bold">Simulated latency (ms)</span><input type="number" min="0" value={latencyMs} onChange={(e) => setLatencyMs(e.target.value)} data-testid="input-latency" className="mt-2 h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm" /></label></div>{replay.isError && <div className="mt-4 rounded-lg bg-red-600/10 p-3 text-xs text-red-800">Replay failed. Check the API status and try again.</div>}<button disabled={replay.isPending} type="submit" data-testid="button-run-replay" className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#213638] text-sm font-bold text-[#f8f1e4] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{replay.isPending ? <><RefreshCw size={15} className="animate-spin" /> Running deterministic pass…</> : <><Play size={15} /> Run paper replay</>}</button><p className="mt-3 text-center text-[11px] text-[hsl(var(--muted-foreground))]">This action never routes an order or connects a wallet.</p></form><div className="panel min-h-[520px] rounded-2xl p-5 md:p-6">{!result && !replay.isPending ? <div className="flex h-full min-h-[450px] flex-col items-center justify-center text-center"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e8f0eb] text-[hsl(var(--primary))]"><Gauge size={25} /></div><h2 className="mt-5 text-xl font-bold">No replay loaded</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Configure the tape and run a pass. Results stay here until you submit another run.</p></div> : replay.isPending ? <div className="space-y-5"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-44" /><Skeleton className="h-24" /></div> : result ? <div><div className="flex items-start justify-between"><div><div className="eyebrow">Replay result / {result.runId}</div><h2 className="mt-1 text-2xl font-extrabold">Tape complete</h2></div><StatusPill tone="good"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" /> Reproducible</StatusPill></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Ending equity" value={money(result.endingEquity)} accent /><Metric label="Return" value={pct(result.returnPct)} /><Metric label="Max drawdown" value={pct(-Math.abs(result.maxDrawdown))} /><Metric label="Seed" value={result.seed} /></div><div className="mt-6 grid gap-4 sm:grid-cols-4">{[['Trades', result.trades], ['Filled', result.filled], ['Partial', result.partialFills], ['Failures', result.failures]].map(([label, value]) => <div key={label as string} className="rounded-lg border border-[hsl(var(--border))] p-3"><div className="eyebrow">{label as string}</div><div className="mono mt-2 text-lg font-bold">{value as number}</div></div>)}</div><div className="mt-6 rounded-xl bg-[#e8f0eb] p-4"><div className="eyebrow text-[#39756d]">Run notes</div><ul className="mt-2 space-y-2 text-sm">{result.notes.map((note, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--primary))]" />{note}</li>)}</ul></div></div> : null}</div></div></div>;
}

function Decisions() {
  const decisions = useListDecisions();
  const [filter, setFilter] = useState('');
  const items = (decisions.data ?? []).filter((item) => !filter || item.decision === filter);
  return <div className="reveal"><PageHeading kicker="Audit trail / immutable" title="Decisions, not vibes." detail="Every agent conclusion is retained with its scoring context, evidence count, and the next action it created." action={<StatusPill tone="neutral"><BookOpen size={12} /> Append-only</StatusPill>} /><div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={15} className="text-[hsl(var(--muted-foreground))]" /><select value={filter} onChange={(e) => setFilter(e.target.value)} data-testid="select-decision-filter" className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm"><option value="">All decisions</option><option value="PAPER-TRADE">Paper-trade</option><option value="INVESTIGATE">Investigate</option><option value="WATCH">Watch</option><option value="REVIEW">Review</option><option value="IGNORE">Ignore</option></select></div>{decisions.isLoading ? <div className="panel space-y-3 rounded-2xl p-4">{[1, 2, 3].map(i => <Skeleton className="h-28" key={i} />)}</div> : decisions.isError ? <QueryError onRetry={() => decisions.refetch()} /> : items.length === 0 ? <EmptyState title="No decisions in this view" detail="The log is append-only; broaden the filter to inspect prior decisions." /> : <div className="panel overflow-hidden rounded-2xl"><div className="hidden grid-cols-[1.1fr_.8fr_1.7fr_.8fr] gap-4 border-b border-[hsl(var(--border))] bg-[#f2eadc] px-5 py-3 md:grid"><div className="eyebrow">Decision</div><div className="eyebrow">Scores</div><div className="eyebrow">Reasoning</div><div className="eyebrow">Evidence</div></div>{items.map((item) => <div key={item.id} data-testid={`row-decision-${item.id}`} className="grid gap-4 border-b border-[hsl(var(--border)/.72)] p-5 last:border-0 md:grid-cols-[1.1fr_.8fr_1.7fr_.8fr] md:items-center"><div><div className="flex items-center gap-2"><StatusPill tone={item.decision === 'PAPER-TRADE' ? 'accent' : item.decision === 'IGNORE' ? 'neutral' : 'good'}>{item.decision}</StatusPill></div><div className="mono mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">{item.discoveryId} · {timeAgo(item.createdAt)}</div><div className="mt-2 text-xs font-bold">{item.nextAction}</div></div><div className="grid grid-cols-3 gap-2"><div><div className="eyebrow">Opp</div><div className="mono mt-1 text-xs font-bold">{item.scores.opportunity}</div></div><div><div className="eyebrow">Risk</div><div className="mono mt-1 text-xs font-bold">{item.scores.risk}</div></div><div><div className="eyebrow">Conf</div><div className="mono mt-1 text-xs font-bold">{item.scores.confidence}</div></div></div><p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{item.reasoning}</p><div className="flex gap-2 text-xs"><span className="rounded-md bg-[#e8f0eb] px-2 py-1 font-bold text-[#39756d]">{item.evidenceCount} evidence</span><span className="rounded-md bg-[#f5e2dc] px-2 py-1 font-bold text-[#a34f43]">{item.riskCount} risks</span><span className="rounded-md bg-[#f7ecd8] px-2 py-1 font-bold text-[#a2642a]">{item.unknownCount} unknown</span></div></div>)}</div>}</div>;
}

function Simulations() {
  const simulations = useListSimulations();
  const items = simulations.data ?? [];
  return <div className="reveal"><PageHeading kicker="Paper lab / performance runs" title="Measure the hypotheses." detail="Compare paper-only runs under different tapes and friction assumptions. No live execution is available in this workspace." action={<Link href="/replay" data-testid="link-new-replay" className="inline-flex items-center gap-2 rounded-lg bg-[#213638] px-4 py-2.5 text-xs font-bold text-[#f8f1e4] shadow-[3px_3px_0_#e56845]"><Play size={14} /> New replay</Link>} />{simulations.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}</div> : simulations.isError ? <QueryError onRetry={() => simulations.refetch()} /> : items.length === 0 ? <EmptyState title="No simulation runs yet" detail="Launch a deterministic replay to create the first paper performance record." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <div key={item.id} data-testid={`card-simulation-${item.id}`} className="panel rounded-2xl p-5 transition-transform hover:-translate-y-1"><div className="flex items-start justify-between gap-3"><div><div className="eyebrow">{item.dataset}</div><h2 className="mt-1 text-lg font-bold">{item.label}</h2></div><StatusPill tone={item.status === 'COMPLETED' ? 'good' : item.status === 'FAILED' ? 'danger' : 'warn'}>{item.status}</StatusPill></div><div className="mt-7 flex items-end justify-between"><div><div className="eyebrow">Return</div><div className={`mt-1 text-3xl font-extrabold headline ${item.returnPct >= 0 ? 'text-[#28786e]' : 'text-[#a34f43]'}`}>{pct(item.returnPct)}</div></div><div className="text-right"><div className="eyebrow">Capital</div><div className="mono mt-1 text-sm font-bold">{money(item.capital)}</div></div></div><div className="mt-6 grid grid-cols-3 gap-2 border-t border-[hsl(var(--border))] pt-4"><div><div className="eyebrow">Win rate</div><div className="mono mt-1 text-xs font-bold">{pct(item.winRate)}</div></div><div><div className="eyebrow">Max DD</div><div className="mono mt-1 text-xs font-bold text-[#a34f43]">{pct(-Math.abs(item.maxDrawdown))}</div></div><div><div className="eyebrow">Trades</div><div className="mono mt-1 text-xs font-bold">{item.trades}</div></div></div><div className="mt-4 text-[10px] text-[hsl(var(--muted-foreground))]">{new Date(item.createdAt).toLocaleString()}</div></div>)}</div>}</div>;
}

function RiskCenter() {
  const discoveries = useListDiscoveries();
  const items = discoveries.data ?? [];
  const risks = items.flatMap((item) => item.risks.map((risk) => ({ ...risk, symbol: item.symbol, discoveryId: item.id })));
  const counts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => ({ severity, count: risks.filter((risk) => risk.severity === severity).length }));
  return <div className="reveal"><PageHeading kicker="Risk engine / non-overridable gates" title="Risk is a register, not a number." detail="Separate the failure modes that can stop a decision from the uncertainty that still needs research. Critical deterministic risks always win." action={<StatusPill tone="danger"><ShieldAlert size={12} /> Hard gates active</StatusPill>} /><div className="grid gap-3 sm:grid-cols-4">{counts.map((item) => <div key={item.severity} className={`rounded-xl border p-4 ${item.severity === 'CRITICAL' ? 'border-red-700/25 bg-red-600/10' : item.severity === 'HIGH' ? 'border-red-700/15 bg-red-600/5' : item.severity === 'MEDIUM' ? 'border-amber-700/20 bg-amber-500/10' : 'border-teal-700/20 bg-teal-700/10'}`}><div className="eyebrow">{item.severity}</div><div className="mt-2 text-3xl font-extrabold headline">{item.count}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">active flags</div></div>)}</div><div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Risk center</div><h2 className="mt-1 text-xl font-bold">Observed failure modes</h2></div><AlertTriangle size={18} className="text-[#a34f43]" /></div><div className="mt-5 space-y-3">{discoveries.isLoading ? <Skeleton className="h-32" /> : risks.map((risk, index) => <div key={`${risk.discoveryId}-${index}`} className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="mono text-xs font-bold text-[hsl(var(--primary))]">${risk.symbol}</span><span className="mx-2 text-[hsl(var(--muted-foreground))]">·</span><span className="text-sm font-bold">{risk.label}</span></div><StatusPill tone={risk.severity === 'CRITICAL' || risk.severity === 'HIGH' ? 'danger' : 'warn'}>{risk.severity}</StatusPill></div><p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{risk.detail}</p></div>)}</div></div><div className="space-y-5"><div className="panel rounded-2xl p-5"><div className="eyebrow">Risk lenses</div><div className="mt-4 space-y-3">{['Liquidity risk', 'Holder concentration', 'Creator risk', 'Contract / configuration', 'Manipulation indicators', 'Data quality'].map((label, i) => <div key={label} className="flex items-center justify-between rounded-lg bg-[#f2eadc] p-3 text-sm"><span className="font-semibold">{label}</span><StatusPill tone={i < 2 ? 'warn' : i === 5 ? 'neutral' : 'good'}>{i < 2 ? 'review' : i === 5 ? 'unknown' : 'clear'}</StatusPill></div>)}</div></div><div className="rounded-2xl bg-[#213638] p-5 text-[#f5efe3]"><div className="eyebrow text-[#a6cbc1]">Policy</div><h2 className="mt-2 text-lg font-bold">Unknown is not safe.</h2><p className="mt-2 text-sm leading-relaxed text-[#c8d6cf]">Missing social evidence, stale creator data, and unresolved wallet clusters lower confidence even when the opportunity score is high.</p></div></div></div></div>;
}

function Memory() {
  const discoveries = useListDiscoveries();
  const decisions = useListDecisions();
  const simulations = useListSimulations();
  const falsePositiveSignals = ['Short-term volume spikes', 'Extremely rapid transaction growth', 'Single-venue momentum'];
  return <div className="reveal"><PageHeading kicker="Long-term memory / evidence patterns" title="What the agent has learned." detail="Memory is not a magic score. It is the recorded pattern of prior investigations, successful signals, and false positives that shapes future confidence." action={<StatusPill tone="good"><Bot size={12} /> Memory active</StatusPill>} /><div className="grid gap-4 md:grid-cols-3"><Metric label="Similar tokens analyzed" value="1,284" sub="historical investigation index" accent /><Metric label="Decision records" value={decisions.data?.length ?? 0} sub="immutable outcomes retained" /><Metric label="Replay runs" value={simulations.data?.length ?? 0} sub="reproducible experiments" /></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Recurring signal strength</div><h2 className="mt-1 text-xl font-bold">Signals that keep surviving</h2></div><Layers3 size={19} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 space-y-4">{['Liquidity stability', 'Holder distribution', 'Creator history', 'Buy / sell persistence'].map((signal, i) => <div key={signal}><div className="flex justify-between text-sm font-semibold"><span>{signal}</span><span className="mono text-[hsl(var(--primary))]">{[86, 81, 74, 68][i]}%</span></div><div className="mt-2 h-2 rounded-full bg-[#e8f0eb]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${[86, 81, 74, 68][i]}%` }} /></div></div>)}</div></div><div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">False-positive memory</div><h2 className="mt-1 text-xl font-bold">Signals to distrust</h2></div><Eye size={19} className="text-[#a2642a]" /></div><div className="mt-5 space-y-3">{falsePositiveSignals.map((signal) => <div key={signal} className="flex items-center gap-3 rounded-lg bg-[#f7ecd8] p-3 text-sm"><ArrowDownRight size={15} className="text-[#a2642a]" /><span>{signal}</span></div>)}</div><div className="mt-5 rounded-lg border border-dashed border-[#d49a3e]/50 p-3 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">Memory stays descriptive until evaluation proves a pattern out of sample. It never silently rewrites a past decision.</div></div></div><div className="mt-5 panel rounded-2xl p-5"><div className="eyebrow">Current replay memory snapshot</div><div className="mt-4 grid gap-3 sm:grid-cols-4">{(discoveries.data ?? []).map((item) => <div key={item.id} className="rounded-lg border border-[hsl(var(--border))] p-3"><div className="mono text-sm font-bold text-[hsl(var(--primary))]">${item.symbol}</div><div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{item.status} · {item.scores.confidence}% confidence</div><div className="mt-3 text-xs font-semibold">{item.nextAction}</div></div>)}</div></div></div>;
}

function Performance() {
  const overview = useGetAgentOverview();
  const simulations = useListSimulations();
  const decisions = useListDecisions();
  if (overview.isLoading) return <DashboardSkeleton />;
  if (overview.isError || !overview.data) return <QueryError onRetry={() => overview.refetch()} />;
  const data = overview.data;
  return <div className="reveal"><PageHeading kicker="Performance / evaluation" title="Track the agent, not just the market." detail="Detection latency is useful. Calibration, false positives, and signal effectiveness tell you whether the agent is actually learning." action={<StatusPill tone="accent"><Gauge size={12} /> Evaluation live</StatusPill>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Detection latency" value={`${data.latencyMs}ms`} sub="observe → discover" accent /><Metric label="Decision accuracy" value="76%" sub="outcome agreement" /><Metric label="Confidence calibration" value="0.82" sub="Brier-style score" /><Metric label="False negative rate" value="8.6%" sub="missed opportunities" /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Signal effectiveness</div><h2 className="mt-1 text-xl font-bold">Prediction vs outcome</h2></div><Target size={19} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 space-y-4">{['Liquidity stability', 'Holder distribution', 'Creator history', 'Momentum persistence'].map((signal, i) => <div key={signal} className="flex items-center gap-4"><div className="w-36 text-sm font-semibold">{signal}</div><div className="h-2 flex-1 rounded-full bg-[#e8f0eb]"><div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width: `${[84, 78, 72, 61][i]}%` }} /></div><div className="mono w-10 text-right text-xs font-bold">{[84, 78, 72, 61][i]}%</div></div>)}</div><div className="mt-6 grid grid-cols-3 gap-3 border-t border-[hsl(var(--border))] pt-5"><Metric label="Return" value={pct(data.performance.returnPct)} /><Metric label="Max DD" value={pct(-Math.abs(data.performance.maxDrawdown))} /><Metric label="Win rate" value={pct(data.performance.winRate)} /></div></div><div className="panel rounded-2xl p-5"><div className="eyebrow">Version comparison</div><h2 className="mt-1 text-xl font-bold">Agent v0.1 baseline</h2><div className="mt-5 space-y-3">{[['Fast path', 'v0.1', '13.8%', '63%'], ['Conservative gates', 'v0.1-c', '8.4%', '58%'], ['Current replay', 'seed 4242', '7.7%', '—']].map(([label, version, returnValue, win]) => <div key={version} className="rounded-lg border border-[hsl(var(--border))] p-3"><div className="flex items-center justify-between"><span className="text-sm font-bold">{label}</span><span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{version}</span></div><div className="mt-3 flex justify-between text-xs"><span>Return <strong className="text-[#28786e]">{returnValue}</strong></span><span>Win rate <strong>{win}</strong></span></div></div>)}</div><div className="mt-5 text-xs text-[hsl(var(--muted-foreground))]">{decisions.data?.length ?? 0} decisions evaluated · {simulations.data?.length ?? 0} simulation baselines</div></div></div></div>;
}

function Alerts() {
  const discoveries = useListDiscoveries();
  const [muted, setMuted] = useState<string[]>([]);
  const alerts = (discoveries.data ?? []).flatMap((item) => [
    { id: `${item.id}-decision`, kind: 'Agent decision', title: `$${item.symbol} entered ${item.status.replace('-', ' ')}`, detail: item.nextAction, tone: item.status === 'IGNORE' ? 'danger' : 'good', icon: Bot },
    ...(item.risks.length ? [{ id: `${item.id}-risk`, kind: 'Major risk detected', title: `${item.risks[0].severity} · ${item.risks[0].label}`, detail: item.risks[0].detail, tone: 'warn', icon: AlertTriangle }] : []),
  ]);
  return <div className="reveal"><PageHeading kicker="Alerts / attention queue" title="Only the important changes." detail="Alerts are tied to agent decisions, risk state, source health, and replay completion. Muting an alert never changes the underlying risk." action={<StatusPill tone="warn"><Bell size={12} /> {alerts.length - muted.length} active</StatusPill>} /><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="panel rounded-2xl p-5"><div className="eyebrow">Attention queue</div><div className="mt-4 space-y-3">{alerts.map((alert) => { const Icon = alert.icon; const isMuted = muted.includes(alert.id); return <div key={alert.id} className={`rounded-xl border p-4 ${isMuted ? 'opacity-45' : ''}`}><div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${alert.tone === 'danger' ? 'bg-red-600/10 text-[#a34f43]' : alert.tone === 'warn' ? 'bg-amber-500/10 text-[#a2642a]' : 'bg-[#e8f0eb] text-[#28786e]'}`}><Icon size={17} /></div><div className="min-w-0 flex-1"><div className="eyebrow">{alert.kind}</div><div className="mt-1 text-sm font-bold">{alert.title}</div><div className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{alert.detail}</div></div><button onClick={() => setMuted((current) => isMuted ? current.filter((id) => id !== alert.id) : [...current, alert.id])} className="rounded-lg border border-[hsl(var(--border))] px-2 py-1 text-[10px] font-bold">{isMuted ? 'Unmute' : 'Mute'}</button></div></div>; })}</div></div><div className="panel rounded-2xl p-5"><div className="eyebrow">Alert rules</div><h2 className="mt-1 text-xl font-bold">What can interrupt the loop</h2><div className="mt-5 space-y-3">{['New high-confidence opportunity', 'Major risk detected', 'Liquidity change', 'Creator / wallet anomaly', 'Agent decision', 'Simulation completed', 'Data-source failure', 'Agent error'].map((rule, index) => <div key={rule} className="flex items-center justify-between rounded-lg bg-[#f2eadc] p-3 text-sm"><span className="font-semibold">{rule}</span><span className={`h-2 w-2 rounded-full ${index === 6 ? 'bg-[#d49a3e]' : 'bg-[hsl(var(--primary))]'}`} /></div>)}</div></div></div></div>;
}

function SettingsPage() {
  const [paused, setPaused] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [riskMode, setRiskMode] = useState('Conservative');
  const [model, setModel] = useState('Research model / offline-safe');
  const controls = [['Discovery', true], ['Deep analysis', true], ['Paper trading', true], ['Memory', true], ['Evaluation', true]];
  return <div className="reveal"><PageHeading kicker="Agent control / configuration" title="Control the loop safely." detail="These controls configure the research and paper environment. There is no wallet, signing path, or live execution control here." action={<StatusPill tone={emergency ? 'danger' : paused ? 'warn' : 'good'}>{emergency ? 'EMERGENCY STOP' : paused ? 'PAUSED' : 'ACTIVE'}</StatusPill>} /><div className="grid gap-5 xl:grid-cols-[1fr_.8fr]"><div className="panel rounded-2xl p-5 md:p-6"><div className="flex items-center justify-between"><div><div className="eyebrow">Agent</div><h2 className="mt-1 text-xl font-bold">Runtime controls</h2></div><Cpu size={19} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 space-y-3">{controls.map(([label, enabled]) => <div key={label as string} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] p-4"><div><div className="text-sm font-bold">{label as string}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Configuration active in paper mode</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${enabled ? 'bg-[#e8f0eb] text-[#28786e]' : 'bg-stone-200 text-stone-600'}`}>{enabled ? 'ON' : 'OFF'}</span></div>)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={() => { setPaused((value) => !value); setEmergency(false); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#213638] text-sm font-bold text-[#f8f1e4]">{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? 'Resume agent' : 'Pause agent'}</button><button onClick={() => { setEmergency(true); setPaused(true); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-700/30 bg-red-600/10 text-sm font-bold text-[#a34f43]"><CircleStop size={15} /> Emergency stop</button></div><div className="mt-3 rounded-lg bg-[#f7ecd8] p-3 text-xs leading-relaxed text-[#806b51]"><LockKeyhole className="mr-1 inline" size={13} />Emergency stop halts discovery and paper simulation UI state. It does not and cannot sign or route a live order.</div></div><div className="space-y-5"><div className="panel rounded-2xl p-5"><div className="eyebrow">Configuration</div><div className="mt-4 space-y-4"><label className="block"><span className="text-xs font-bold">Risk mode</span><select value={riskMode} onChange={(event) => setRiskMode(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"><option>Conservative</option><option>Balanced</option><option>Research only</option></select></label><label className="block"><span className="text-xs font-bold">AI model</span><select value={model} onChange={(event) => setModel(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 text-sm"><option>Research model / offline-safe</option><option>Medium classifier / paper</option><option>Deep synthesis / gated</option></select></label></div></div><div className="panel rounded-2xl p-5"><div className="eyebrow">Data sources</div><h2 className="mt-1 text-lg font-bold">4 / 5 healthy</h2><div className="mt-4 space-y-3">{['Solana replay stream', 'Holder distribution', 'Creator history index', 'Community evidence', 'Decision memory'].map((source, index) => <div key={source} className="flex items-center justify-between text-sm"><span>{source}</span><StatusPill tone={index === 3 ? 'danger' : 'good'}>{index === 3 ? 'OFFLINE' : 'HEALTHY'}</StatusPill></div>)}</div></div></div></div></div>;
}

function Router() {
  return <RoutedErrorBoundary><Shell><Switch><Route path="/" component={Dashboard} /><Route path="/discoveries" component={Discoveries} /><Route path="/investigations" component={Discoveries} /><Route path="/risk" component={RiskCenter} /><Route path="/replay" component={Replay} /><Route path="/memory" component={Memory} /><Route path="/performance" component={Performance} /><Route path="/alerts" component={Alerts} /><Route path="/settings" component={SettingsPage} /><Route path="/decisions" component={Decisions} /><Route path="/simulations" component={Simulations} /><Route component={NotFound} /></Switch></Shell></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;