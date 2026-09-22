import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  FileSearch,
  Filter,
  Gauge,
  History,
  LayoutDashboard,
  Menu,
  Network,
  Pause,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Terminal,
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
  { href: '/', label: 'Cockpit', icon: LayoutDashboard },
  { href: '/discoveries', label: 'Discoveries', icon: FileSearch },
  { href: '/replay', label: 'Replay lab', icon: History },
  { href: '/decisions', label: 'Decision log', icon: BookOpen },
  { href: '/simulations', label: 'Simulations', icon: BarChart3 },
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
  if (overview.isLoading) return <DashboardSkeleton />;
  if (overview.isError || !overview.data) return <QueryError onRetry={() => overview.refetch()} />;
  const data = overview.data;
  return <div className="reveal">
    <PageHeading kicker="Live agent loop / 08:42 UTC" title="See the signal before the story." detail="A decision surface for meme-market research. Watch what entered the funnel, why it survived, and where uncertainty still compounds." action={<StatusPill tone={data.status === 'RUNNING' ? 'good' : 'warn'}><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />Agent {data.status}</StatusPill>} />
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Discoveries" value={data.discoveries} sub={`${data.investigate} under investigation`} accent />
      <Metric label="Paper-trade queue" value={data.paperTrade} sub="Awaiting review gate" />
      <Metric label="Decisions today" value={data.decisionsToday} sub={`Loop stage: ${data.loopStage}`} />
      <Metric label="Loop latency" value={`${data.latencyMs}ms`} sub={`Last event ${timeAgo(data.lastEventAt)}`} />
    </section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="panel rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between"><div><div className="eyebrow">Current agent loop</div><h2 className="mt-1 text-xl font-bold">Evidence accumulation</h2></div><div className="flex items-center gap-2"><StatusPill tone="accent">{data.mode.replace('-', ' ')}</StatusPill><Link href="/discoveries" data-testid="link-open-discoveries" className="rounded-lg border border-[hsl(var(--border))] p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"><ChevronRight size={16} /></Link></div></div>
        <div className="mt-8 flex items-center gap-1">
          {['Discover', 'Investigate', 'Score', 'Decide'].map((stage, index) => <div key={stage} className="flex flex-1 items-center gap-1"><div className={`h-2 flex-1 rounded-full ${index < 2 ? 'bg-[hsl(var(--primary))]' : index === 2 ? 'bg-[#f5b44c]' : 'bg-stone-300'}`} /><span className="hidden text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] lg:block">{stage}</span></div>)}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#e9f0e8] p-4"><div className="eyebrow text-[#39756d]">Now processing</div><div className="mt-3 text-lg font-bold">{data.loopStage}</div><div className="mt-1 text-xs text-[#53726f]">streaming observations</div></div>
          <div className="rounded-xl bg-[#f7ecd8] p-4"><div className="eyebrow text-[#a2642a]">Decision posture</div><div className="mt-3 text-lg font-bold">Cautious</div><div className="mt-1 text-xs text-[#94704b]">risk weighted · paper</div></div>
          <div className="rounded-xl bg-[#f5e2dc] p-4"><div className="eyebrow text-[#a34f43]">Open unknowns</div><div className="mt-3 text-lg font-bold">Contained</div><div className="mt-1 text-xs text-[#95655e]">critical blocks active</div></div>
        </div>
      </div>
      <div className="panel rounded-2xl p-5 md:p-6">
        <div className="eyebrow">Paper performance</div><h2 className="mt-1 text-xl font-bold">Equity curve</h2>
        <div className="mt-5 flex items-end justify-between"><div><div className="text-3xl font-extrabold headline">{money(data.performance.equity)}</div><div className="mt-1 flex items-center gap-1 text-sm font-bold text-[#28786e]"><ArrowUpRight size={15} />{pct(data.performance.returnPct)} all time</div></div><div className="text-right"><div className="eyebrow">Max DD</div><div className="mono mt-1 text-sm font-bold text-[#a34f43]">{pct(-Math.abs(data.performance.maxDrawdown))}</div></div></div>
        <div className="mt-7 flex h-24 items-end gap-1.5 border-b border-dashed border-[hsl(var(--border))] pb-0">{[30, 38, 34, 47, 42, 54, 51, 65, 58, 72, 69, 88, 81, 95, 91, 100].map((height, i) => <div key={i} className={`flex-1 rounded-t-sm ${i > 11 ? 'bg-[hsl(var(--primary))]' : 'bg-[#c8ddd5]'}`} style={{ height: `${height}%` }} />)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><div className="eyebrow">Win rate</div><div className="mono mt-1 font-bold">{pct(data.performance.winRate)}</div></div><div><div className="eyebrow">Paper trades</div><div className="mono mt-1 font-bold">{data.performance.paperTrades}</div></div><div><div className="eyebrow">False pos.</div><div className="mono mt-1 font-bold">{pct(data.performance.falsePositiveRate)}</div></div></div>
      </div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <div className="panel rounded-2xl p-5"><div className="flex items-center justify-between"><div><div className="eyebrow">Source health</div><h2 className="mt-1 text-lg font-bold">Inputs you can trust</h2></div><Network size={18} className="text-[hsl(var(--primary))]" /></div><div className="mt-5 space-y-3">{data.sourceHealth.map((source) => <div key={source.name} className="flex items-center justify-between border-b border-[hsl(var(--border)/.7)] pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-2.5"><span className={`h-2 w-2 rounded-full ${source.status === 'HEALTHY' ? 'bg-[hsl(var(--primary))]' : source.status === 'DEGRADED' ? 'bg-[#d49a3e]' : 'bg-[#b34f48]'}`} /><span className="text-sm font-semibold">{source.name}</span></div><span className="mono text-xs text-[hsl(var(--muted-foreground))]">{source.latencyMs}ms</span></div>)}</div></div>
      <div className="rounded-2xl bg-[#213638] p-6 text-[#f5efe3] shadow-[5px_5px_0_#e56845]"><div className="flex items-start justify-between"><div><div className="eyebrow text-[#a6cbc1]">Operating principle 04</div><h2 className="mt-3 max-w-md text-2xl font-extrabold leading-tight">A fast answer is not the same as a good answer.</h2></div><Sparkles size={22} className="text-[#f5b44c]" /></div><p className="mt-5 max-w-lg text-sm leading-relaxed text-[#c8d6cf]">Meme Agent keeps evidence, inference, and unknowns in separate lanes so conviction cannot silently outrun the data.</p><Link href="/decisions" data-testid="link-read-decisions" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#f5b44c]">Inspect decision log <ArrowUpRight size={14} /></Link></div>
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
  if (!id) return <div className="panel flex min-h-[520px] flex-col items-center justify-center rounded-2xl p-8 text-center"><FileSearch size={30} className="text-[hsl(var(--primary))]" /><h2 className="mt-4 text-lg font-bold">Select a discovery</h2><p className="mt-2 max-w-xs text-sm text-[hsl(var(--muted-foreground))]">Choose a token from the queue to inspect its evidence trail and unresolved risks.</p></div>;
  if (detail.isLoading) return <div className="panel rounded-2xl p-6"><Skeleton className="h-8 w-1/2" /><Skeleton className="mt-5 h-32 w-full" /><Skeleton className="mt-4 h-48 w-full" /></div>;
  if (detail.isError || !detail.data) return <QueryError onRetry={() => detail.refetch()} />;
  const item = detail.data;
  return <div className="panel rounded-2xl p-5 md:p-6">
    <div className="flex items-start justify-between gap-4"><div><div className="eyebrow">Investigation / {item.id}</div><h2 className="headline mt-2 text-2xl font-extrabold"><span className="text-[hsl(var(--primary))]">${item.symbol}</span> {item.name}</h2><div className="mono mt-2 truncate text-[10px] text-[hsl(var(--muted-foreground))]">{item.mint}</div></div><StatusPill tone={item.status === 'PAPER-TRADE' ? 'accent' : 'good'}>{item.status}</StatusPill></div>
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Price" value={money(item.price, 6)} /><Metric label="Liquidity" value={compact(item.liquidity)} /><Metric label="5m volume" value={compact(item.volume5m)} /><Metric label="Momentum" value={item.momentum} /></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.8fr]"><div><div className="eyebrow">Scoring model</div><div className="mt-4 space-y-4"><ScoreBar label="Opportunity" value={item.scores.opportunity} /><ScoreBar label="Confidence" value={item.scores.confidence} /><ScoreBar label="Risk load" value={item.scores.risk} color="red" /></div><div className="mt-6 rounded-xl bg-[#f7ecd8] p-4"><div className="eyebrow text-[#a2642a]">Agent reasoning</div><p className="mt-2 text-sm leading-relaxed">{item.reasoning}</p><div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#a2642a]"><Zap size={13} /> Next: {item.nextAction}</div></div></div><div><div className="eyebrow">Risk register</div><div className="mt-3 space-y-2">{item.risks.length ? item.risks.map((risk, i) => <div key={`${risk.label}-${i}`} className={`rounded-lg border p-3 ${risk.severity === 'CRITICAL' ? 'border-red-700/25 bg-red-600/10' : 'border-amber-700/20 bg-amber-500/10'}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{risk.label}</span><StatusPill tone={risk.severity === 'CRITICAL' ? 'danger' : 'warn'}>{risk.severity}</StatusPill></div><p className="mt-1.5 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{risk.detail}</p>{risk.severity === 'CRITICAL' && <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-800"><ShieldAlert size={12} /> Critical risks cannot be overridden</div>}</div>) : <div className="rounded-lg border border-dashed p-4 text-xs text-[hsl(var(--muted-foreground))]">No elevated risks recorded.</div>}</div></div></div>
    <div className="mt-6 border-t border-[hsl(var(--border))] pt-5"><div className="eyebrow">Evidence trail</div><div className="mt-3 grid gap-2 sm:grid-cols-2">{item.evidence.map((evidence, i) => <div key={`${evidence.label}-${i}`} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/.4)] p-3"><div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-extrabold tracking-[.12em] ${evidence.type === 'FACT' ? 'text-[hsl(var(--primary))]' : evidence.type === 'INFERENCE' ? 'text-[#aa682d]' : 'text-[#a34f43]'}`}>{evidence.type}</span><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{evidence.source}</span></div><div className="mt-2 text-sm font-semibold">{evidence.label}</div><div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{evidence.value}</div></div>)}</div>{item.unknowns.length > 0 && <div className="mt-4 flex gap-3 rounded-lg border border-dashed border-[#d49a3e]/50 bg-[#f7ecd8]/50 p-3"><CircleHelp size={15} className="mt-0.5 shrink-0 text-[#a2642a]" /><div><div className="text-xs font-bold text-[#8b5c2a]">Unknowns remain</div><div className="mt-1 text-xs leading-relaxed text-[#806b51]">{item.unknowns.join(' · ')}</div></div></div>}</div>
  </div>;
}

function Discoveries() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const discoveries = useListDiscoveries({ search: search || undefined, status: status as 'ALL' | 'IGNORE' | 'WATCH' | 'INVESTIGATE' | 'PAPER-TRADE' | 'REVIEW' });
  const items = discoveries.data ?? [];
  return <div className="reveal"><PageHeading kicker="Signal intake / discovery queue" title="Investigate the edge." detail="Search the agent's candidate stream, then inspect the evidence trail before a paper decision enters the log." action={<StatusPill tone="good"><Activity size={12} /> {items.length} candidates</StatusPill>} /><div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" /><input value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-discovery-search" placeholder="Search symbol, name, mint…" className="h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--primary))]" /></div><div className="flex items-center gap-2"><Filter size={15} className="text-[hsl(var(--muted-foreground))]" /><select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-discovery-status" className="h-11 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.8)] px-3 text-sm font-semibold outline-none"><option value="ALL">All statuses</option><option value="INVESTIGATE">Investigate</option><option value="WATCH">Watch</option><option value="PAPER-TRADE">Paper-trade</option><option value="REVIEW">Review</option><option value="IGNORE">Ignore</option></select></div></div><div className="grid gap-5 xl:grid-cols-[minmax(360px,.75fr)_1.25fr]">{discoveries.isLoading ? <div className="panel rounded-2xl p-4 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div> : discoveries.isError ? <QueryError onRetry={() => discoveries.refetch()} /> : items.length === 0 ? <EmptyState title="No discoveries match" detail="Try clearing the search or widening the queue filter." /> : <div className="panel max-h-[760px] overflow-auto rounded-2xl">{items.map((item) => <DiscoveryRow key={item.id} item={item} selected={selectedId === item.id} onClick={() => setSelectedId(item.id)} />)}</div>}<DiscoveryDetail id={selectedId} /></div></div>;
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

function Router() {
  return <RoutedErrorBoundary><Shell><Switch><Route path="/" component={Dashboard} /><Route path="/discoveries" component={Discoveries} /><Route path="/replay" component={Replay} /><Route path="/decisions" component={Decisions} /><Route path="/simulations" component={Simulations} /><Route component={NotFound} /></Switch></Shell></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;