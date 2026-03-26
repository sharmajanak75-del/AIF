import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════
// DATA CONFIG
// ═══════════════════════════════════════════════════════════

const SEBI_CATS = {
  "Cat I – VCF / Angel": {
    color: "#7c6af7",
    tag: "CAT I",
    strategies: ["Pre-IPO / Late Stage VC", "Early Stage VC", "Angel / Seed"],
  },
  "Cat II – PE / VC / Debt": {
    color: "#3b9edd",
    tag: "CAT II",
    strategies: ["Growth Equity", "Mid-Market PE / Buyout", "Secondaries", "Distressed Debt", "Real Assets"],
  },
  "Cat III – Hedge Fund": {
    color: "#e8a838",
    tag: "CAT III",
    strategies: ["Long/Short Equity", "Event Driven", "Multi-Strategy", "Long-Only"],
  },
};

const BM = {
  "Pre-IPO / Late Stage VC": {
    irr:  { poor: 12, avg: 18, good: 24 },
    tvpi: { poor: 1.5, avg: 2.0, good: 3.0 },
    dpi:  { poor: 0.3, avg: 0.7, good: 1.2 },
    rvpi: { poor: 0.5, avg: 1.0, good: 1.8 },
    pme:  { poor: 1.0, avg: 1.2, good: 1.5 },
    mWeights: { irr: 30, tvpi: 25, dpi: 15, rvpi: 15, pme: 15 },
    pmeRef: "Nifty 500 / BSE SmallCap",
    context: "DPI expectations are lower in earlier vintage years. Elevated RVPI is normal pre-exit. IRR and TVPI carry the highest weight.",
  },
  "Early Stage VC": {
    irr:  { poor: 15, avg: 22, good: 30 },
    tvpi: { poor: 1.5, avg: 2.5, good: 4.0 },
    dpi:  { poor: 0.1, avg: 0.4, good: 0.9 },
    rvpi: { poor: 0.8, avg: 1.5, good: 2.5 },
    pme:  { poor: 1.0, avg: 1.3, good: 1.8 },
    mWeights: { irr: 35, tvpi: 30, dpi: 10, rvpi: 15, pme: 10 },
    pmeRef: "Nifty 500 / BSE SmallCap",
    context: "High-risk profile. Portfolio is marked on potential. DPI expectations are lowest among all strategy types.",
  },
  "Angel / Seed": {
    irr:  { poor: 18, avg: 25, good: 35 },
    tvpi: { poor: 1.5, avg: 3.0, good: 5.0 },
    dpi:  { poor: 0.0, avg: 0.2, good: 0.6 },
    rvpi: { poor: 1.0, avg: 2.0, good: 3.5 },
    pme:  { poor: 1.0, avg: 1.5, good: 2.0 },
    mWeights: { irr: 30, tvpi: 35, dpi: 5, rvpi: 20, pme: 10 },
    pmeRef: "BSE SmallCap / BSE IPO Index",
    context: "Power law returns expected. Most DPI is deferred. TVPI is the dominant signal; portfolio markups are proxies for outcome.",
  },
  "Growth Equity": {
    irr:  { poor: 12, avg: 17, good: 22 },
    tvpi: { poor: 1.5, avg: 2.0, good: 2.5 },
    dpi:  { poor: 0.5, avg: 1.0, good: 1.5 },
    rvpi: { poor: 0.4, avg: 0.8, good: 1.2 },
    pme:  { poor: 1.0, avg: 1.2, good: 1.4 },
    mWeights: { irr: 25, tvpi: 25, dpi: 20, rvpi: 15, pme: 15 },
    pmeRef: "Nifty 500",
    context: "Balance between DPI (realised) and RVPI (unrealised). PME vs Nifty 500 is the most relevant benchmark.",
  },
  "Mid-Market PE / Buyout": {
    irr:  { poor: 14, avg: 19, good: 24 },
    tvpi: { poor: 1.5, avg: 2.0, good: 2.8 },
    dpi:  { poor: 0.5, avg: 1.0, good: 1.5 },
    rvpi: { poor: 0.3, avg: 0.6, good: 1.0 },
    pme:  { poor: 1.0, avg: 1.2, good: 1.5 },
    mWeights: { irr: 25, tvpi: 25, dpi: 25, rvpi: 10, pme: 15 },
    pmeRef: "Nifty 50 / Nifty Midcap 150",
    context: "DPI is critical — buyout funds should be returning capital. Operational value creation should be evidenced in TVPI growth.",
  },
  "Secondaries": {
    irr:  { poor: 10, avg: 15, good: 20 },
    tvpi: { poor: 1.3, avg: 1.6, good: 2.0 },
    dpi:  { poor: 0.8, avg: 1.2, good: 1.8 },
    rvpi: { poor: 0.2, avg: 0.5, good: 0.8 },
    pme:  { poor: 1.0, avg: 1.1, good: 1.3 },
    mWeights: { irr: 20, tvpi: 20, dpi: 35, rvpi: 10, pme: 15 },
    pmeRef: "Nifty 50",
    context: "Secondaries are acquired at a discount to NAV. DPI is the dominant metric — the liquidity premium must be evidenced. Lower but more predictable IRR is expected.",
  },
  "Distressed Debt": {
    irr:  { poor: 12, avg: 16, good: 20 },
    tvpi: { poor: 1.2, avg: 1.5, good: 1.9 },
    dpi:  { poor: 0.7, avg: 1.0, good: 1.5 },
    rvpi: { poor: 0.2, avg: 0.4, good: 0.8 },
    pme:  { poor: 1.0, avg: 1.1, good: 1.3 },
    mWeights: { irr: 30, tvpi: 20, dpi: 30, rvpi: 10, pme: 10 },
    pmeRef: "CRISIL Credit Index / Nifty 50",
    context: "Recovery rates and workout timelines are critical qualitative factors. IRR and DPI are co-equal primary metrics.",
  },
};
const DEFAULT_BM = BM["Growth Equity"];

const METRIC_LABELS = {
  irr:  { label: "Net IRR", unit: "%", hint: "Net IRR to LPs after fees & carry" },
  tvpi: { label: "TVPI / MoM", unit: "x", hint: "Total Value to Paid-In (realised + unrealised)" },
  dpi:  { label: "DPI", unit: "x", hint: "Distributions to Paid-In — realised only" },
  rvpi: { label: "RVPI", unit: "x", hint: "Residual Value to Paid-In — unrealised NAV" },
  pme:  { label: "PME", unit: "x", hint: "Public Market Equivalent — alpha over index" },
};

const QUAL_FACTORS = [
  {
    key: "team", label: "Team & Track Record", weight: 20, icon: "◈",
    levels: [
      "Unproven team with no prior fund management experience",
      "Limited track record or first-time fund manager",
      "Moderate experience with some realised exits",
      "Strong team with consistent exits across multiple cycles",
      "Exceptional — top-decile performers with marquee exits and brand",
    ],
  },
  {
    key: "portfolio", label: "Portfolio Construction", weight: 15, icon: "◇",
    levels: [
      "Highly concentrated with no sector discipline",
      "Limited diversification, unclear investment thesis",
      "Reasonable diversification with some thesis clarity",
      "Well-constructed portfolio with sector focus and position limits",
      "Optimal construction — deep expertise with explicit risk management",
    ],
  },
  {
    key: "fees", label: "Fee Structure", weight: 15, icon: "⟁",
    levels: [
      "High fees (>2.5% mgmt), aggressive carry >25%, no hurdle",
      "Above-market fees with weak LP alignment",
      "Market-standard fees with 8% hurdle rate",
      "LP-friendly: preferred return, catch-up, GP commitment >2%",
      "Best-in-class: co-invest rights, reduced fees at scale, clawback",
    ],
  },
  {
    key: "fundSize", label: "Fund Size vs. Strategy Fit", weight: 10, icon: "△",
    levels: [
      "Significantly oversized — material return dilution risk",
      "Somewhat large relative to the opportunity set",
      "Adequate size with some deployment execution risk",
      "Well-calibrated fund size to strategy and market",
      "Optimal size with explicit capacity discipline and LP protection",
    ],
  },
  {
    key: "vintage", label: "Vintage Year & Deployment Pace", weight: 10, icon: "◉",
    levels: [
      "Poorly timed vintage with rushed or reckless deployment",
      "Vintage headwinds, moderate deployment pace",
      "Neutral vintage with standard deployment cadence",
      "Favourable vintage entry point, disciplined deployment",
      "Excellent timing — counter-cyclical with dry powder reserves",
    ],
  },
  {
    key: "exits", label: "Exit Track Record / Liquidity History", weight: 15, icon: "→",
    levels: [
      "No exits and no clear exit pathway",
      "Limited exits, mostly secondary-driven",
      "Some strategic exits with IPO pipeline in development",
      "Strong mix of strategic, PE, and IPO exits across portfolio",
      "Consistently realised exits — diverse routes, proven DPI generation",
    ],
  },
  {
    key: "sourcing", label: "Sourcing Strategy & Proprietary Deal Flow", weight: 15, icon: "⊕",
    levels: [
      "Fully reactive — auction-driven, intermediary-dependent deal flow",
      "Mostly intermediary sourced with limited proprietary access",
      "Mix of proprietary and intermediary, early differentiation",
      "Strong proprietary pipeline with sector-specific networks",
      "Highly differentiated — founder networks, sector exclusivity, repeat backing",
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════════════════

function scoreMetric(value, bm) {
  if (value === "" || value === null || value === undefined) return null;
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v <= 0) return 0;
  if (v <= bm.poor) return (v / bm.poor) * 20;
  if (v <= bm.avg) return 20 + ((v - bm.poor) / (bm.avg - bm.poor)) * 30;
  if (v <= bm.good) return 50 + ((v - bm.avg) / (bm.good - bm.avg)) * 30;
  return Math.min(100, 80 + ((v - bm.good) / (bm.good * 0.5)) * 20);
}

function getRating(score) {
  if (score >= 80) return { label: "Excellent",  color: "#22c55e", light: "#f0fdf4", grade: "A" };
  if (score >= 65) return { label: "Good",        color: "#7c6af7", light: "#f5f3ff", grade: "B" };
  if (score >= 50) return { label: "Average",     color: "#f59e0b", light: "#fffbeb", grade: "C" };
  if (score >= 35) return { label: "Below Avg",   color: "#f97316", light: "#fff7ed", grade: "D" };
  return              { label: "Avoid",        color: "#ef4444", light: "#fef2f2", grade: "F" };
}

const STEPS = ["Classification", "Quantitative", "Qualitative", "Score"];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function AIFEvaluator() {
  const [step, setStep] = useState(0);
  const [fundName, setFundName] = useState("");
  const [sebiCat, setSebiCat] = useState("");
  const [strategy, setStrategy] = useState("");
  const [vintageYear, setVintageYear] = useState("");
  const [fundSizeInr, setFundSizeInr] = useState("");
  const [metrics, setMetrics] = useState({ irr: "", tvpi: "", dpi: "", rvpi: "", pme: "" });
  const [qual, setQual] = useState({ team: 0, portfolio: 0, fees: 0, fundSize: 0, vintage: 0, exits: 0, sourcing: 0 });

  const bm = BM[strategy] || DEFAULT_BM;

  const quant = useMemo(() => {
    const scores = {};
    let weightedSum = 0, totalWeight = 0;
    Object.keys(METRIC_LABELS).forEach((k) => {
      const s = scoreMetric(metrics[k], bm[k]);
      scores[k] = s;
      if (s !== null) {
        weightedSum += s * bm.mWeights[k];
        totalWeight += bm.mWeights[k];
      }
    });
    return { scores, overall: totalWeight > 0 ? weightedSum / totalWeight : null };
  }, [metrics, bm]);

  const qualScore = useMemo(() => {
    let sum = 0, totalW = 0;
    QUAL_FACTORS.forEach((f) => {
      if (qual[f.key] > 0) {
        sum += ((qual[f.key] - 1) / 4) * 100 * f.weight;
        totalW += f.weight;
      }
    });
    return totalW > 0 ? sum / totalW : null;
  }, [qual]);

  const finalScore = useMemo(() => {
    if (quant.overall !== null && qualScore !== null) return quant.overall * 0.6 + qualScore * 0.4;
    if (quant.overall !== null) return quant.overall;
    if (qualScore !== null) return qualScore;
    return null;
  }, [quant.overall, qualScore]);

  const rating = finalScore !== null ? getRating(finalScore) : null;

  const catColor = sebiCat ? SEBI_CATS[sebiCat].color : "#7c6af7";

  const handleReset = () => {
    setStep(0); setFundName(""); setSebiCat(""); setStrategy("");
    setVintageYear(""); setFundSizeInr("");
    setMetrics({ irr: "", tvpi: "", dpi: "", rvpi: "", pme: "" });
    setQual({ team: 0, portfolio: 0, fees: 0, fundSize: 0, vintage: 0, exits: 0, sourcing: 0 });
  };

  // ── STEP INDICATOR ──
  const StepBar = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center" }}>
          <button
            onClick={() => i <= step && setStep(i)}
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: i === step ? catColor : i < step ? catColor + "44" : "#1e293b",
              color: i === step ? "#fff" : i < step ? catColor : "#475569",
              fontSize: 11, fontWeight: 800, cursor: i <= step ? "pointer" : "default",
              transition: "all .2s", transform: i === step ? "scale(1.15)" : "scale(1)",
              fontFamily: "inherit",
              boxShadow: i === step ? `0 0 0 3px ${catColor}33` : "none",
            }}
          >{i + 1}</button>
          {i < STEPS.length - 1 && (
            <div style={{ width: 40, height: 2, background: i < step ? catColor + "66" : "#1e293b", margin: "0 2px" }} />
          )}
        </div>
      ))}
    </div>
  );

  const Label = ({ children }) => (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </p>
  );

  const Input = ({ value, onChange, placeholder, type = "text" }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 8, padding: "10px 14px",
        color: "#e2e8f0", fontSize: 13, fontFamily: "inherit",
        outline: "none",
      }}
      onFocus={e => (e.target.style.borderColor = catColor)}
      onBlur={e => (e.target.style.borderColor = "#1e293b")}
    />
  );

  // ── STEP 0: CLASSIFICATION ──
  const Step0 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <Label>Fund Name</Label>
        <Input value={fundName} onChange={e => setFundName(e.target.value)} placeholder="e.g. Acme Growth Fund III" />
      </div>
      <div>
        <Label>SEBI AIF Category</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(SEBI_CATS).map(([cat, cfg]) => (
            <button
              key={cat}
              onClick={() => { setSebiCat(cat); setStrategy(""); }}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${sebiCat === cat ? cfg.color : "#1e293b"}`,
                background: sebiCat === cat ? cfg.color + "18" : "#0f172a",
                textAlign: "left", fontFamily: "inherit", transition: "all .15s",
              }}
            >
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                padding: "2px 7px", borderRadius: 4,
                background: cfg.color + "33", color: cfg.color,
              }}>{cfg.tag}</span>
              <span style={{ fontSize: 13, color: sebiCat === cat ? "#e2e8f0" : "#64748b", fontWeight: sebiCat === cat ? 600 : 400 }}>
                {cat}
              </span>
            </button>
          ))}
        </div>
      </div>
      {sebiCat && (
        <div>
          <Label>Fund Strategy</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SEBI_CATS[sebiCat].strategies.map(s => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  border: `1.5px solid ${strategy === s ? catColor : "#1e293b"}`,
                  background: strategy === s ? catColor + "18" : "#0f172a",
                  color: strategy === s ? "#e2e8f0" : "#64748b",
                  fontSize: 12, fontWeight: strategy === s ? 600 : 400,
                  fontFamily: "inherit", textAlign: "left", transition: "all .15s",
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <Label>Vintage Year</Label>
          <Input value={vintageYear} onChange={e => setVintageYear(e.target.value)} placeholder="e.g. 2021" type="number" />
        </div>
        <div>
          <Label>Fund Size (₹ Cr)</Label>
          <Input value={fundSizeInr} onChange={e => setFundSizeInr(e.target.value)} placeholder="e.g. 1500" type="number" />
        </div>
      </div>
    </div>
  );

  // ── STEP 1: QUANTITATIVE ──
  const Step1 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Context banner */}
      <div style={{
        background: catColor + "14", border: `1px solid ${catColor}33`,
        borderRadius: 10, padding: "12px 14px",
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: catColor, marginBottom: 4, letterSpacing: "0.06em" }}>
          ▸ BENCHMARK SET — {(strategy || "STRATEGY").toUpperCase()}
        </p>
        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{bm.context}</p>
        <p style={{ fontSize: 11, color: "#64748b", marginTop: 6, margin: "6px 0 0" }}>
          PME Reference: <span style={{ color: catColor, fontWeight: 600 }}>{bm.pmeRef}</span>
        </p>
      </div>

      {Object.entries(METRIC_LABELS).map(([k, m]) => {
        const b = bm[k];
        const s = quant.scores[k];
        const r = s !== null ? getRating(s) : null;
        return (
          <div key={k} style={{
            background: "#0f172a", border: "1px solid #1e293b",
            borderRadius: 12, padding: 16,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: "0 0 2px" }}>{m.label}</p>
                <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>{m.hint}</p>
              </div>
              {r && (
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 20,
                  background: r.color + "22", color: r.color, letterSpacing: "0.05em",
                }}>{r.label.toUpperCase()}</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <input
                type="number"
                value={metrics[k]}
                onChange={e => setMetrics(prev => ({ ...prev, [k]: e.target.value }))}
                placeholder={m.unit === "%" ? "18.5" : "2.1"}
                style={{
                  width: 90, background: "#071020", border: "1px solid #1e293b",
                  borderRadius: 7, padding: "8px 10px", color: "#e2e8f0",
                  fontSize: 15, fontWeight: 700, fontFamily: "monospace", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = catColor)}
                onBlur={e => (e.target.style.borderColor = "#1e293b")}
              />
              <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{m.unit}</span>
              <div style={{ flex: 1, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                {[["Poor", b.poor, "#ef4444"], ["Avg", b.avg, "#f59e0b"], ["Good", b.good, "#22c55e"]].map(([lbl, val, col]) => (
                  <div key={lbl} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: "#475569", margin: "0 0 1px", letterSpacing: "0.08em" }}>{lbl}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: col, margin: 0, fontFamily: "monospace" }}>
                      {val}{m.unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {s !== null && (
              <div style={{ height: 3, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s}%`, background: r.color, borderRadius: 99, transition: "width .4s" }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Metric weight summary */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>METRIC WEIGHTS FOR THIS STRATEGY</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(bm.mWeights).map(([k, w]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: w * 1.5, height: 4, background: catColor, borderRadius: 99, opacity: 0.7 }} />
              <span style={{ fontSize: 10, color: "#64748b" }}>{METRIC_LABELS[k].label} {w}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── STEP 2: QUALITATIVE ──
  const Step2 = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {QUAL_FACTORS.map((f) => (
        <div key={f.key} style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 12, padding: 16, transition: "border-color .15s",
          borderColor: qual[f.key] > 0 ? catColor + "44" : "#1e293b",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: catColor, fontSize: 14, opacity: 0.7 }}>{f.icon}</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{f.label}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#475569" }}>wt {f.weight}%</span>
              {qual[f.key] > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20,
                  background: catColor + "22", color: catColor,
                }}>{qual[f.key]}/5</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: qual[f.key] > 0 ? 10 : 0 }}>
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                onClick={() => setQual(prev => ({ ...prev, [f.key]: v }))}
                style={{
                  flex: 1, height: 34, borderRadius: 7, cursor: "pointer",
                  border: `1.5px solid ${qual[f.key] === v ? catColor : qual[f.key] > v ? catColor + "44" : "#1e293b"}`,
                  background: qual[f.key] === v ? catColor : qual[f.key] > v ? catColor + "18" : "#071020",
                  color: qual[f.key] === v ? "#fff" : qual[f.key] > v ? catColor : "#475569",
                  fontSize: 12, fontWeight: 800, fontFamily: "inherit",
                  transition: "all .15s",
                }}
              >{v}</button>
            ))}
          </div>
          {qual[f.key] > 0 && (
            <p style={{
              fontSize: 11, color: "#94a3b8", background: "#071020",
              borderRadius: 7, padding: "8px 12px", margin: 0, lineHeight: 1.5,
              borderLeft: `2px solid ${catColor}`,
            }}>
              {f.levels[qual[f.key] - 1]}
            </p>
          )}
        </div>
      ))}
    </div>
  );

  // ── STEP 3: SCORE ──
  const Step3 = () => {
    if (finalScore === null) return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>◌</p>
        <p style={{ color: "#475569", fontSize: 13 }}>Enter at least some metrics or qualitative scores to generate a rating.</p>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero score */}
        <div style={{
          background: rating.color + "14", border: `1px solid ${rating.color}33`,
          borderRadius: 16, padding: "28px 20px", textAlign: "center",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.12em", marginBottom: 8 }}>OVERALL FUND RATING</p>
          <p style={{ fontSize: 56, fontWeight: 900, color: rating.color, margin: "0 0 4px", lineHeight: 1, fontFamily: "monospace" }}>
            {finalScore.toFixed(1)}
          </p>
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>out of 100</p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: rating.color, borderRadius: 999, padding: "8px 20px",
          }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{rating.grade}</span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>{rating.label.toUpperCase()}</span>
          </div>
          {(fundName || strategy) && (
            <div style={{ marginTop: 14 }}>
              {fundName && <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: "0 0 2px" }}>{fundName}</p>}
              <p style={{ fontSize: 11, color: "#475569", margin: 0 }}>
                {[sebiCat, strategy, vintageYear && `Vintage ${vintageYear}`, fundSizeInr && `₹${fundSizeInr} Cr`].filter(Boolean).join(" · ")}
              </p>
            </div>
          )}
        </div>

        {/* Score split */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Quantitative Score", value: quant.overall, sub: "60% weight · IRR, TVPI, DPI, RVPI, PME" },
            { label: "Qualitative Score", value: qualScore, sub: "40% weight · 7 structural factors" },
          ].map(({ label, value, sub }) => {
            const r = value !== null ? getRating(value) : null;
            return (
              <div key={label} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "16px 14px" }}>
                <p style={{ fontSize: 10, color: "#475569", margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.08em" }}>{label.toUpperCase()}</p>
                <p style={{ fontSize: 28, fontWeight: 900, margin: "0 0 2px", color: r ? r.color : "#334155", fontFamily: "monospace" }}>
                  {value !== null ? value.toFixed(1) : "—"}
                </p>
                <p style={{ fontSize: 10, color: "#334155", margin: 0 }}>{sub}</p>
              </div>
            );
          })}
        </div>

        {/* Metric breakdown */}
        {quant.overall !== null && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>QUANTITATIVE BREAKDOWN</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(METRIC_LABELS).map(([k, m]) => {
                const s = quant.scores[k];
                if (s === null) return null;
                const r = getRating(s);
                const entered = metrics[k];
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "#64748b", width: 70, flexShrink: 0 }}>{m.label}</span>
                    <div style={{ flex: 1, height: 6, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${s}%`, background: r.color, borderRadius: 99, transition: "width .5s" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.color, width: 28, textAlign: "right", fontFamily: "monospace" }}>{s.toFixed(0)}</span>
                    <span style={{ fontSize: 10, color: "#334155", width: 44, textAlign: "right", fontFamily: "monospace" }}>
                      {entered}{m.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Qualitative breakdown */}
        {qualScore !== null && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>QUALITATIVE BREAKDOWN</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {QUAL_FACTORS.map((f) => {
                if (qual[f.key] === 0) return null;
                const s = ((qual[f.key] - 1) / 4) * 100;
                const r = getRating(s);
                return (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: catColor, width: 12, flexShrink: 0 }}>{f.icon}</span>
                    <span style={{ fontSize: 11, color: "#64748b", width: 80, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.label.split(" & ")[0].split(" /")[0]}
                    </span>
                    <div style={{ flex: 1, height: 6, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${s}%`, background: r.color, borderRadius: 99, transition: "width .5s" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: r.color, width: 28, textAlign: "right", fontFamily: "monospace" }}>{qual[f.key]}/5</span>
                    <span style={{ fontSize: 10, color: "#334155", width: 36, textAlign: "right" }}>wt {f.weight}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Benchmark reference table */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", marginBottom: 12 }}>
            BENCHMARK REFERENCE — {(strategy || "").toUpperCase()}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["Metric", "Poor", "Average", "Good", "Weight"].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? "left" : "right",
                      color: "#475569", fontWeight: 700, padding: "0 8px 8px",
                      letterSpacing: "0.06em", fontSize: 10,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(METRIC_LABELS).map(([k, m]) => (
                  <tr key={k} style={{ borderTop: "1px solid #1e293b" }}>
                    <td style={{ padding: "8px 8px", color: "#94a3b8", fontWeight: 600 }}>{m.label}</td>
                    <td style={{ padding: "8px 8px", color: "#ef4444", textAlign: "right", fontFamily: "monospace" }}>&lt;{bm[k].poor}{m.unit}</td>
                    <td style={{ padding: "8px 8px", color: "#f59e0b", textAlign: "right", fontFamily: "monospace" }}>{bm[k].avg}{m.unit}</td>
                    <td style={{ padding: "8px 8px", color: "#22c55e", textAlign: "right", fontFamily: "monospace" }}>{bm[k].good}{m.unit}</td>
                    <td style={{ padding: "8px 8px", color: "#475569", textAlign: "right" }}>{bm.mWeights[k]}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rating legend */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { grade: "A", label: "Excellent", t: "≥80", c: "#22c55e" },
            { grade: "B", label: "Good", t: "65–79", c: "#7c6af7" },
            { grade: "C", label: "Average", t: "50–64", c: "#f59e0b" },
            { grade: "D", label: "Below Avg", t: "35–49", c: "#f97316" },
            { grade: "F", label: "Avoid", t: "<35", c: "#ef4444" },
          ].map(({ grade, label, t, c }) => (
            <div key={grade} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 8px", borderRadius: 6, background: c + "14", border: `1px solid ${c}22`,
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: c }}>{grade}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{label} ({t})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const stepComponents = [Step0, Step1, Step2, Step3];
  const CurrentStep = stepComponents[step];
  const canNext = step === 0 ? !!strategy : true;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070e1a",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      padding: "24px 16px 80px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #334155; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0f172a; } ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: catColor }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: "#334155", letterSpacing: "0.18em" }}>SEBI AIF · CAT I / II / III</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
            AIF Evaluator
          </h1>
          <p style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            Fund-agnostic scoring · Quantitative + Qualitative
          </p>
        </div>

        <StepBar />

        {/* Card */}
        <div style={{
          background: "#0b1628", border: "1px solid #1e293b",
          borderRadius: 16, padding: 20, marginBottom: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em" }}>
              {STEPS[step].toUpperCase()}
            </h2>
            <span style={{ fontSize: 10, color: "#334155" }}>{step + 1} of {STEPS.length}</span>
          </div>
          <CurrentStep />
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 10,
                border: "1.5px solid #1e293b", background: "transparent",
                color: "#64748b", fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", transition: "all .15s",
              }}
            >← Back</button>
          )}
          {step < STEPS.length - 1 && (
            <button
              onClick={() => canNext && setStep(s => s + 1)}
              style={{
                flex: 2, padding: "14px 0", borderRadius: 10, border: "none",
                background: canNext ? catColor : "#1e293b",
                color: canNext ? "#fff" : "#334155",
                fontSize: 13, fontWeight: 800, cursor: canNext ? "pointer" : "not-allowed",
                fontFamily: "inherit", transition: "all .15s",
                boxShadow: canNext ? `0 4px 20px ${catColor}44` : "none",
              }}
            >Continue →</button>
          )}
          {step === STEPS.length - 1 && (
            <button
              onClick={handleReset}
              style={{
                flex: 2, padding: "14px 0", borderRadius: 10, border: "none",
                background: "#1e293b", color: "#94a3b8",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >↺ Evaluate Another Fund</button>
          )}
        </div>
      </div>
    </div>
  );
}
