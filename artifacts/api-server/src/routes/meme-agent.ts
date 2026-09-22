import { Router, type IRouter } from "express";
import {
  GetAgentOverviewResponse,
  GetDiscoveryParams,
  GetDiscoveryResponse,
  ListDecisionsResponse,
  ListDiscoveriesQueryParams,
  ListDiscoveriesResponse,
  ListSimulationsResponse,
  RunReplayBody,
  RunReplayResponse,
} from "@workspace/api-zod";
import type {
  DecisionLogEntry,
  Discovery,
  ReplayResult,
  Simulation,
} from "@workspace/api-zod";

const router: IRouter = Router();

const discoveries: Discovery[] = [
  {
    id: "disc-aurora",
    symbol: "AURA",
    name: "Aurora Relay",
    mint: "AURAx7Qf3s2m5n8w4k9p1d6c",
    venue: "Jupiter route",
    discoveredAt: "2026-09-22T10:17:00.000Z",
    ageMinutes: 18,
    price: 0.0000428,
    marketCap: 428000,
    liquidity: 96200,
    volume5m: 187400,
    buys: 164,
    sells: 91,
    holders: 486,
    top10Concentration: 24.8,
    creatorRisk: "LOW",
    momentum: 78,
    status: "PAPER-TRADE",
    scores: { opportunity: 82, risk: 28, confidence: 74 },
    evidence: [
      { type: "FACT", label: "Liquidity", value: "$96.2k available", source: "Replay market feed" },
      { type: "FACT", label: "Buy pressure", value: "1.8x sell count in last 5m", source: "Transaction stream" },
      { type: "INFERENCE", label: "Momentum", value: "Sustained participation, not a single-wallet spike", source: "Deterministic scorer v0.1" },
      { type: "UNKNOWN", label: "Social velocity", value: "No verified community source connected", source: "Research layer" },
    ],
    risks: [
      { severity: "MEDIUM", label: "Thin exit depth", detail: "A 5% notional order would consume an estimated 8.4% of visible liquidity." },
    ],
    unknowns: ["No verified social/community source", "Creator wallet funding origin not enriched"],
    reasoning: "Strong early activity and balanced holders clear the fast-path filter. Paper-only because exit depth remains sensitive to slippage.",
    nextAction: "Run the next 15-minute replay window before review.",
  },
  {
    id: "disc-kite",
    symbol: "KITE",
    name: "Kite Signal",
    mint: "KITE4z3m1n8q2w6p9s5d7f0h",
    venue: "Pump.fun monitor",
    discoveredAt: "2026-09-22T10:04:00.000Z",
    ageMinutes: 31,
    price: 0.0000181,
    marketCap: 181000,
    liquidity: 41200,
    volume5m: 129600,
    buys: 119,
    sells: 112,
    holders: 233,
    top10Concentration: 47.1,
    creatorRisk: "HIGH",
    momentum: 64,
    status: "INVESTIGATE",
    scores: { opportunity: 69, risk: 67, confidence: 58 },
    evidence: [
      { type: "FACT", label: "Activity", value: "231 swaps in the last 5m", source: "Transaction stream" },
      { type: "FACT", label: "Concentration", value: "Top 10 wallets hold 47.1%", source: "Holder distribution" },
      { type: "INFERENCE", label: "Creator pattern", value: "Prior deployments show rapid liquidity withdrawal", source: "Creator history index" },
      { type: "UNKNOWN", label: "Metadata provenance", value: "Image and description not independently verified", source: "Metadata layer" },
    ],
    risks: [
      { severity: "HIGH", label: "Concentration", detail: "Top-holder concentration exceeds the deterministic review threshold." },
      { severity: "HIGH", label: "Creator history", detail: "Two related launches previously lost over 80% of visible liquidity." },
    ],
    unknowns: ["Metadata provenance", "Unresolved wallet relationship cluster"],
    reasoning: "Volume is real, but concentration and creator history block paper entry until enrichment resolves the wallet cluster.",
    nextAction: "Investigate creator-linked wallets and metadata provenance.",
  },
  {
    id: "disc-mint",
    symbol: "MINTY",
    name: "Minty Arcade",
    mint: "MINT9r2v7x4c1b8n6m3q5s0t",
    venue: "Bonk.fun monitor",
    discoveredAt: "2026-09-22T09:42:00.000Z",
    ageMinutes: 53,
    price: 0.0000064,
    marketCap: 64000,
    liquidity: 8100,
    volume5m: 38200,
    buys: 58,
    sells: 96,
    holders: 107,
    top10Concentration: 72.4,
    creatorRisk: "CRITICAL",
    momentum: 22,
    status: "IGNORE",
    scores: { opportunity: 24, risk: 93, confidence: 91 },
    evidence: [
      { type: "FACT", label: "Sell pressure", value: "96 sells vs 58 buys in the last 5m", source: "Transaction stream" },
      { type: "FACT", label: "Concentration", value: "Top 10 wallets hold 72.4%", source: "Holder distribution" },
      { type: "FACT", label: "Liquidity", value: "$8.1k visible liquidity", source: "Replay market feed" },
    ],
    risks: [
      { severity: "CRITICAL", label: "Exit risk", detail: "Visible liquidity is below the hard safety floor for paper sizing." },
      { severity: "CRITICAL", label: "Holder concentration", detail: "Concentration exceeds the non-overridable deterministic risk threshold." },
    ],
    unknowns: ["Wallet intent is unknown"],
    reasoning: "Critical deterministic risks force IGNORE. Contextual research cannot override the hard safety floor.",
    nextAction: "Do not investigate further unless new liquidity evidence arrives.",
  },
  {
    id: "disc-orbit",
    symbol: "ORBT",
    name: "Orbit Commons",
    mint: "ORBT2m8q6s1d4f9h3k7p5v0x",
    venue: "Jupiter route",
    discoveredAt: "2026-09-22T09:10:00.000Z",
    ageMinutes: 85,
    price: 0.0000932,
    marketCap: 932000,
    liquidity: 215000,
    volume5m: 244900,
    buys: 187,
    sells: 130,
    holders: 1084,
    top10Concentration: 19.3,
    creatorRisk: "LOW",
    momentum: 71,
    status: "WATCH",
    scores: { opportunity: 76, risk: 31, confidence: 61 },
    evidence: [
      { type: "FACT", label: "Liquidity", value: "$215k visible liquidity", source: "Replay market feed" },
      { type: "FACT", label: "Holder breadth", value: "1,084 holders; top 10 at 19.3%", source: "Holder distribution" },
      { type: "INFERENCE", label: "Market behavior", value: "Healthy pullbacks with buyers returning near VWAP", source: "Market behavior model" },
    ],
    risks: [
      { severity: "LOW", label: "Age", detail: "The token is still inside the first two hours of its observed life." },
    ],
    unknowns: ["Social evidence is still partial"],
    reasoning: "The strongest structural profile in the queue, but the agent keeps it on WATCH until a second observation confirms persistence.",
    nextAction: "Collect another observation and compare momentum persistence.",
  },
];

const decisionLog: DecisionLogEntry[] = discoveries.map((discovery, index) => ({
  id: `decision-${index + 1}`,
  createdAt: discovery.discoveredAt,
  discoveryId: discovery.id,
  decision: discovery.status,
  scores: discovery.scores,
  reasoning: discovery.reasoning,
  evidenceCount: discovery.evidence.length,
  riskCount: discovery.risks.length,
  unknownCount: discovery.unknowns.length,
  nextAction: discovery.nextAction,
  outcome:
    discovery.status === "PAPER-TRADE"
      ? "Open paper position; awaiting replay window"
      : discovery.status === "IGNORE"
        ? "Blocked by critical deterministic risk"
        : "Awaiting next observation",
  predictionAccuracy:
    discovery.status === "IGNORE"
      ? 0.91
      : discovery.status === "PAPER-TRADE"
        ? 0.74
        : 0.61,
  signalPerformance:
    discovery.status === "PAPER-TRADE"
      ? 0.084
      : discovery.status === "WATCH"
        ? 0.052
        : 0,
}));

const simulations: Simulation[] = [
  {
    id: "sim-24h-baseline",
    label: "Baseline fast-path",
    dataset: "DEMO_24H",
    status: "COMPLETED",
    returnPct: 8.4,
    maxDrawdown: 5.7,
    winRate: 58,
    trades: 19,
    capital: 10000,
    createdAt: "2026-09-22T08:15:00.000Z",
  },
  {
    id: "sim-7d-conservative",
    label: "Conservative risk gates",
    dataset: "DEMO_7D",
    status: "COMPLETED",
    returnPct: 13.8,
    maxDrawdown: 7.2,
    winRate: 63,
    trades: 47,
    capital: 10000,
    createdAt: "2026-09-21T21:20:00.000Z",
  },
];

const replayResults: ReplayResult[] = [];

router.get("/agent/overview", (_req, res) => {
  const overview = GetAgentOverviewResponse.parse({
    mode: "PAPER",
    status: "RUNNING",
    loopStage: "ANALYZE",
    lastEventAt: "2026-09-22T10:34:22.000Z",
    latencyMs: 184,
    discoveries: discoveries.length,
    investigate: discoveries.filter((item) => item.status === "INVESTIGATE").length,
    paperTrade: discoveries.filter((item) => item.status === "PAPER-TRADE").length,
    decisionsToday: decisionLog.length,
    sourceHealth: [
      { name: "Solana replay stream", status: "HEALTHY", latencyMs: 184, lastChecked: "2026-09-22T10:34:20.000Z" },
      { name: "Holder distribution", status: "HEALTHY", latencyMs: 241, lastChecked: "2026-09-22T10:34:19.000Z" },
      { name: "Creator history index", status: "DEGRADED", latencyMs: 924, lastChecked: "2026-09-22T10:33:58.000Z" },
      { name: "Community evidence", status: "OFFLINE", latencyMs: 0, lastChecked: "2026-09-22T10:28:44.000Z" },
    ],
    performance: {
      equity: 11384,
      returnPct: 13.8,
      winRate: 63,
      maxDrawdown: 7.2,
      paperTrades: simulations.reduce((total, item) => total + item.trades, 0),
      falsePositiveRate: 11.4,
    },
  });
  res.json(overview);
});

router.get("/agent/discoveries", (req, res) => {
  const query = ListDiscoveriesQueryParams.parse(req.query);
  const search = query.search?.toLowerCase();
  const filtered = discoveries.filter((item) => {
    const statusMatches = query.status === "ALL" || item.status === query.status;
    const searchMatches =
      !search ||
      item.symbol.toLowerCase().includes(search) ||
      item.name.toLowerCase().includes(search) ||
      item.mint.toLowerCase().includes(search);
    return statusMatches && searchMatches;
  });
  res.json(ListDiscoveriesResponse.parse(filtered));
});

router.get("/agent/discoveries/:discoveryId", (req, res) => {
  const params = GetDiscoveryParams.parse(req.params);
  const discovery = discoveries.find((item) => item.id === params.discoveryId);
  if (!discovery) {
    res.status(404).json({ error: "Discovery not found" });
    return;
  }
  res.json(GetDiscoveryResponse.parse(discovery));
});

router.post("/agent/replay", (req, res) => {
  const input = RunReplayBody.parse(req.body);
  const datasetMultiplier = input.dataset === "DEMO_7D" ? 1.58 : 1;
  const friction = (input.slippageBps + input.feeBps) / 10000;
  const trades = input.dataset === "DEMO_7D" ? 47 : 19;
  const filled = trades - Math.floor(trades * 0.05);
  const partialFills = Math.max(1, Math.floor(trades * 0.11));
  const failures = Math.max(1, Math.floor(trades * (input.latencyMs > 500 ? 0.12 : 0.04)));
  const grossReturn = input.dataset === "DEMO_7D" ? 0.138 : 0.084;
  const returnPct = Number((grossReturn * datasetMultiplier * 100 - friction * 100 - input.latencyMs / 1000).toFixed(2));
  const endingEquity = Number((input.startingCapital * (1 + returnPct / 100)).toFixed(2));
  const result: ReplayResult = {
    runId: `replay-${replayResults.length + 1}`,
    dataset: input.dataset,
    startedAt: "2026-09-22T10:34:22.000Z",
    completedAt: "2026-09-22T10:34:24.000Z",
    seed: 4242,
    trades,
    filled,
    partialFills,
    failures,
    endingEquity,
    returnPct,
    maxDrawdown: Number((input.dataset === "DEMO_7D" ? 7.2 : 5.7 + friction * 100).toFixed(2)),
    notes: [
      "Deterministic replay seed: 4242",
      "No private keys or live execution paths are enabled",
      `Latency budget applied: ${input.latencyMs}ms`,
      "Critical deterministic risk gates were not overridden",
    ],
  };
  replayResults.push(Object.freeze(result));
  res.json(RunReplayResponse.parse(result));
});

router.get("/agent/decisions", (_req, res) => {
  res.json(ListDecisionsResponse.parse(decisionLog));
});

router.get("/agent/simulations", (_req, res) => {
  res.json(ListSimulationsResponse.parse(simulations));
});

export default router;