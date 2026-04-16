import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  Users,
  BarChart3,
  ExternalLink,
  Award,
  ChevronDown,
  ChevronUp,
  Vote,
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "./lib/utils";
import { fetchCandidates, fetchTotals, fetchHeatmap, fetchUbigeos, fetchTracking } from "./api/onpe";
import PeruMap from "./components/PeruMap";
import TrackingChart from "./components/TrackingChart";
import "./index.css";

const SOURCE_URL = "https://resultadoelectoral.onpe.gob.pe/main/presidenciales";

/* ─── Avatar ─── */
function CandidateAvatar({ candidate, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const sizes = { sm: "w-9 h-9", md: "w-14 h-14", lg: "w-16 h-16" };
  if (imgError) {
    return (
      <div className={cn(sizes[size], "rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0")}
        style={{ backgroundColor: candidate.color }}>
        {candidate.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
      </div>
    );
  }
  return (
    <img src={candidate.photoUrl} alt={candidate.name} onError={() => setImgError(true)}
      className={cn(sizes[size], "rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm")} />
  );
}

/* ─── Party Logo ─── */
function PartyLogo({ candidate, size = "sm" }) {
  const [imgError, setImgError] = useState(false);
  const sizes = { sm: "w-7 h-7", md: "w-8 h-8" };
  const acronym = candidate.party
    ? candidate.party.split(" ")
        .filter(w => w.length > 2 && !["DEL","LOS","LAS","POR","PARA"].includes(w.toUpperCase()))
        .map(w => w[0]).join("").substring(0, 2).toUpperCase()
    : "?";

  if (imgError) {
    return (
      <div title={candidate.party}
        className={cn(sizes[size], "rounded-md flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0")}
        style={{ backgroundColor: candidate.color }}>
        {acronym}
      </div>
    );
  }
  return (
    <img src={candidate.logoUrl} alt={candidate.party} title={candidate.party}
      onError={() => setImgError(true)}
      className={cn(sizes[size], "rounded-md object-contain flex-shrink-0 bg-white border border-border p-0.5")} />
  );
}

/* ─── Progress Bar ─── */
function ProgressBar({ value, max, color, delay = 0, showLabel = true }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }} />
      </div>
      {showLabel && (
        <span className="text-xs font-bold min-w-[55px] text-right tabular-nums" style={{ color }}>
          {value.toFixed(3)}%
        </span>
      )}
    </div>
  );
}

/* ─── Loading ─── */
function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
          <Vote className="w-7 h-7 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Cargando datos de la ONPE…</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Error ─── */
function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-xl border border-border p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-bold mb-2">Error al cargar datos</h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
const STAT_ICON_COLORS = ["#2563EB", "#6366F1", "#D97706", "#10B981"];
const STAT_ICON_BG = ["#EFF6FF", "#EEF2FF", "#FFFBEB", "#ECFDF5"];

function StatCard({ icon: Icon, label, value, sublabel, idx = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * 0.07 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5 flex items-start justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground leading-none">{value}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>}
      </div>
      <div className="rounded-lg p-2.5 flex-shrink-0"
        style={{ backgroundColor: STAT_ICON_BG[idx % 4] }}>
        <Icon className="w-5 h-5" style={{ color: STAT_ICON_COLORS[idx % 4] }} />
      </div>
    </motion.div>
  );
}

/* ─── Podium Card ─── */
function PodiumCard({ candidate, rank, delay, top3 }) {
  const isSecondRound = rank <= 2;
  const rankColors = { 1: "#2563EB", 2: "#2563EB", 3: "#94A3B8" };
  const pctColor = isSecondRound ? candidate.color : "#0F172A";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay }}
      className={cn(
        "relative bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col h-full",
        isSecondRound ? "border-blue-200 shadow-blue-500/5" : "border-slate-200"
      )}>

      {/* Top accent bar */}
      <div className="w-full flex justify-center pt-3 pb-0 px-4">
        {isSecondRound ? (
          <span className="inline-flex items-center bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full leading-none">
            Clasifica a 2da Vuelta
          </span>
        ) : (
          <span className="inline-flex items-center bg-slate-50 border border-slate-200 text-slate-400 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full leading-none">
            No pasa a 2da Vuelta
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Row: rank + percentage */}
        <div className="flex items-start justify-between mb-4">
          <span className="inline-flex items-center bg-slate-100 text-slate-500 text-[11px] font-bold px-2 py-0.5 rounded">
            #{rank}
          </span>
          <span className="text-2xl md:text-3xl font-black tabular-nums leading-none" style={{ color: pctColor }}>
            {candidate.validVotes.toFixed(3)}%
          </span>
        </div>

        {/* Photo + party + name */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <CandidateAvatar candidate={candidate} size="md" />
            <div className="absolute -bottom-1 -right-1">
              <PartyLogo candidate={candidate} size="sm" />
            </div>
          </div>
          <div className="min-w-0 pt-1">
            <h3 className="text-sm font-bold leading-tight text-foreground uppercase">
              {candidate.name}
            </h3>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">
              {candidate.party}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-auto pt-3 border-t border-border">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Porcentaje obtenido
          </p>
          <ProgressBar value={candidate.validVotes} max={50} color={candidate.color} delay={delay + 0.1} />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-muted-foreground font-medium">Total de Votos</span>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {candidate.totalVotes.toLocaleString()}
            </span>
          </div>

          {/* Brechas de Votos */}
          {rank === 1 && top3?.[1] && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-50 border-dashed">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Ventaja vs 2°</span>
              <span className="text-[11px] font-black tabular-nums text-emerald-600">
                +{(candidate.totalVotes - top3[1].totalVotes).toLocaleString()}
              </span>
            </div>
          )}
          {rank === 2 && top3 && (
            <div className="space-y-1 mt-1.5 pt-1.5 border-t border-slate-50 border-dashed">
              {top3[0] && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Brecha vs 1°</span>
                  <span className="text-[11px] font-black tabular-nums text-red-600">
                    -{(top3[0].totalVotes - candidate.totalVotes).toLocaleString()}
                  </span>
                </div>
              )}
              {top3[2] && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Ventaja vs 3°</span>
                  <span className="text-[11px] font-black tabular-nums text-emerald-600">
                    +{(candidate.totalVotes - top3[2].totalVotes).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
          {rank === 3 && top3?.[1] && (
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-50 border-dashed">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Brecha vs 2°</span>
              <span className="text-[11px] font-black tabular-nums text-red-600">
                -{(top3[1].totalVotes - candidate.totalVotes).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Table Row ─── */
function CandidateRow({ candidate, rank, delay, maxVotes }) {
  const isTop2 = rank <= 2;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay }}
      className={cn("flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 transition-colors hover:bg-slate-50",
        isTop2 && "bg-blue-50/40 hover:bg-blue-50/70")}>
      <div className="w-7 flex justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-muted-foreground tabular-nums">#{rank}</span>
      </div>
      <CandidateAvatar candidate={candidate} size="sm" />
      <PartyLogo candidate={candidate} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground">{candidate.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{candidate.party}</p>
      </div>
      <div className="hidden md:block flex-1 max-w-[200px]">
        <ProgressBar value={candidate.validVotes} max={maxVotes} color={candidate.color} delay={delay} showLabel={false} />
      </div>
      <div className="text-right min-w-[90px]">
        <p className="text-sm font-bold tabular-nums" style={{ color: candidate.color }}>
          {candidate.validVotes.toFixed(3)}%
        </p>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {candidate.totalVotes.toLocaleString()} votos
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ icon: Icon, title, iconColor = "#D97706", children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2.5">
        <Icon className="w-[18px] h-[18px]" style={{ color: iconColor }} />
        <h2 className="text-lg md:text-xl font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [totals, setTotals] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [ubigeosData, setUbigeosData] = useState([]);
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidatesData, totalsData, heatmapRaw, ubigeosRaw /*, trackingRaw*/] = await Promise.all([
        fetchCandidates(),
        fetchTotals().catch(() => null),
        fetchHeatmap().catch(() => []),
        fetchUbigeos().catch(() => []),
        // fetchTracking().catch(() => []),
      ]);
      setCandidates(candidatesData);
      setTotals(totalsData);
      setHeatmapData(heatmapRaw);
      setUbigeosData(ubigeosRaw);
      // setTrackingData(trackingRaw);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "No se pudieron obtener los datos de la ONPE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading && candidates.length === 0) return <LoadingState />;
  if (error && candidates.length === 0) return <ErrorState error={error} onRetry={loadData} />;

  const top3 = candidates.slice(0, 3);
  const rest = candidates.slice(3);
  const maxVotes = candidates[0]?.validVotes || 1;

  const filteredCandidates = rest.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.party.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const displayedCandidates = showAll ? filteredCandidates : filteredCandidates.slice(0, 5);

  const contabilizadasPct = totals?.actasContabilizadas || 0;
  const enviadasJeePct = totals?.actasEnviadasJee || 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ════ HEADER ════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Badges row */}
          <div className="flex items-center gap-2 pt-3 pb-2">
            <span className="inline-flex items-center gap-1.5 border border-emerald-300 text-emerald-600 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-dot" />
              En Vivo
            </span>
            <span className="inline-flex items-center bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              Balotaje Presidencial 2026
            </span>
          </div>

          {/* Title row */}
          <div className="flex items-start md:items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 hidden sm:flex items-center justify-center flex-shrink-0">
                <Vote className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                  Resultados ONPE
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Elecciones Generales — Participación de {candidates.length} organizaciones
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={loadData} disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-slate-50 transition-colors disabled:opacity-50">
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-white text-sm font-semibold text-foreground hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fuente Oficial</span>
              </a>
            </div>
          </div>

          {/* Progress section */}
          {totals && (
            <div className="border-t border-border pt-3 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                Actas Contabilizadas
              </p>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2 mb-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black tracking-tighter text-foreground tabular-nums leading-none">
                    {contabilizadasPct.toFixed(3)}
                  </span>
                  <span className="text-2xl font-bold text-muted-foreground">%</span>
                </div>
                <div className="sm:ml-4">
                  <p className="text-sm font-bold text-foreground">
                    Total de actas: {totals.totalActas?.toLocaleString()}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {enviadasJeePct.toFixed(3)}% de Actas para envío al JEE y {totals.actasPendientesJee?.toFixed(3)}% de Actas pendientes
                  </p>
                </div>
              </div>

              {/* Composite progress bar */}
              <div className="h-3 w-full flex rounded-full overflow-hidden bg-slate-100">
                <motion.div style={{ backgroundColor: "#2563EB" }}
                  initial={{ width: 0 }} animate={{ width: `${contabilizadasPct}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }} />
                <motion.div style={{ backgroundColor: "#F59E0B" }}
                  initial={{ width: 0 }} animate={{ width: `${enviadasJeePct}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} />
              </div>

              {lastUpdated && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-2">
                  Actualizado al {lastUpdated.toLocaleDateString("es-PE")} a las {lastUpdated.toLocaleTimeString("es-PE")}
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ════ MAIN ════ */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8 md:space-y-10">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={Users} label="Candidatos" value={candidates.length}
            sublabel="Organizaciones políticas" idx={0} />
          <StatCard icon={Activity} label="Participación"
            value={`${totals?.participacionCiudadana?.toFixed(3) || "0.000"}%`}
            sublabel="Electores hábiles" idx={1} />
          <StatCard icon={TrendingUp} label="Líder"
            value={`${candidates[0]?.validVotes.toFixed(3)}%`}
            sublabel={candidates[0]?.name.split(" ").slice(-2).join(" ")} idx={2} />
          <StatCard icon={Award} label="Corte" value="En Vivo"
            sublabel={lastUpdated ? lastUpdated.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "—"}
            idx={3} />
        </div>

        {/* ── Top Candidates ── */}
        <section>
          <SectionHeader icon={Trophy} title="Líderes de la Contienda" iconColor="#D97706">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#E2E8F6] border border-[#BFC9E7] shadow-[0_1px_3px_rgba(0,0,0,0.05)] rounded-[10px] max-w-sm">
              <AlertTriangle className="w-[14px] h-[14px] text-[#1D4ED8] flex-shrink-0" />
              <p className="text-[12px] text-[#1D4ED8] font-medium leading-[1.35]">
                Solo los <strong className="font-bold">2 primeros lugares</strong> clasifican a la Segunda Vuelta Electoral (Balotaje).
              </p>
            </div>
          </SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {top3[0] && <PodiumCard candidate={top3[0]} rank={1} delay={0.1} top3={top3} />}
            {top3[1] && <PodiumCard candidate={top3[1]} rank={2} delay={0.2} top3={top3} />}
            {top3[2] && <PodiumCard candidate={top3[2]} rank={3} delay={0.3} top3={top3} />}
          </div>
        </section>

        {/* ── Mapa Regional ── */}
        <section>
          <SectionHeader icon={BarChart3} title="Avance Regional" iconColor="#2563EB" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <PeruMap heatmapData={heatmapData} ubigeosData={ubigeosData} totals={totals} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot" />
                Mayor Avance Regional
              </h3>
              <div className="space-y-3">
                {heatmapData
                  .sort((a, b) => b.porcentajeActasContabilizadas - a.porcentajeActasContabilizadas)
                  .slice(0, 5)
                  .map((reg, idx) => {
                    const depto = ubigeosData.find(u => u.ubigeo === reg.ubigeoNivel01.toString().padStart(6, "0"));
                    return (
                      <div key={reg.ubigeoNivel01} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground w-4 text-right tabular-nums">{idx + 1}</span>
                        <span className="text-xs font-semibold text-foreground uppercase w-28 truncate">
                          {depto?.nombre || "Región"}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }}
                            animate={{ width: `${reg.porcentajeActasContabilizadas}%` }}
                            transition={{ duration: 1, delay: idx * 0.05 }}
                            className="h-full bg-emerald-500 rounded-full" />
                        </div>
                        <span className="text-[11px] font-bold text-emerald-600 w-16 text-right tabular-nums">
                          {reg.porcentajeActasContabilizadas.toFixed(3)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Menor Avance Regional
              </h3>
              <div className="space-y-3">
                {heatmapData
                  .filter(r => r.porcentajeActasContabilizadas > 0)
                  .sort((a, b) => a.porcentajeActasContabilizadas - b.porcentajeActasContabilizadas)
                  .slice(0, 5)
                  .map((reg, idx) => {
                    const depto = ubigeosData.find(u => u.ubigeo === reg.ubigeoNivel01.toString().padStart(6, "0"));
                    return (
                      <div key={reg.ubigeoNivel01} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground w-4 text-right tabular-nums">{idx + 1}</span>
                        <span className="text-xs font-semibold text-foreground uppercase w-28 truncate">
                          {depto?.nombre || "Región"}
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }}
                            animate={{ width: `${reg.porcentajeActasContabilizadas}%` }}
                            transition={{ duration: 1, delay: idx * 0.05 }}
                            className="h-full bg-amber-400 rounded-full" />
                        </div>
                        <span className="text-[11px] font-bold text-amber-600 w-16 text-right tabular-nums">
                          {reg.porcentajeActasContabilizadas.toFixed(3)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Comparison Chart ── */}
        <section>
          <SectionHeader icon={BarChart3} title="Comparativa de Porcentajes" iconColor="#6366F1" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-6">
            <div className="space-y-3">
              {candidates.slice(0, 8).map((candidate, idx) => (
                <motion.div key={candidate.id}
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.06 }}
                  className="flex items-center gap-3 md:gap-4">
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">#{idx + 1}</span>
                    <CandidateAvatar candidate={candidate} size="sm" />
                  </div>
                  <div className="w-28 md:w-40 text-xs text-right text-muted-foreground truncate font-medium">
                    {candidate.name.split(" ").slice(-2).join(" ")}
                  </div>
                  <div className="flex-1">
                    <div className="relative h-7 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-lg flex items-center justify-end pr-2.5"
                        style={{ backgroundColor: candidate.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(candidate.validVotes / maxVotes) * 100}%` }}
                        transition={{ duration: 1, delay: 0.4 + idx * 0.08, ease: "easeOut" }}>
                        <span className="text-[11px] font-bold text-white whitespace-nowrap tabular-nums">
                          {candidate.validVotes.toFixed(3)}%
                        </span>
                      </motion.div>
                    </div>
                  </div>
                  <div className="w-16 text-xs font-semibold text-right tabular-nums text-muted-foreground">
                    {candidate.totalVotes.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tracking Evolution Chart ── */}
        {/* <section>
          <SectionHeader icon={TrendingUp} title="Evolución del Conteo" iconColor="#F59E0B" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 w-full">
            <TrackingChart data={trackingData} />
          </div>
        </section> */}

        {/* ── Full Table ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <SectionHeader icon={TrendingUp} title="Tabla de Posiciones" iconColor="#2563EB" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input id="search-candidates" type="text" placeholder="Buscar candidato o partido…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-lg bg-white border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all w-full md:w-[260px]" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-slate-50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="w-7 text-center">#</div>
              <div className="w-9" /><div className="w-6" />
              <div className="flex-1">Candidato</div>
              <div className="hidden md:block flex-1 max-w-[200px]">Representación</div>
              <div className="min-w-[90px] text-right">Porcentaje</div>
            </div>

            <div className="border-b border-border">
              {top3.map((c, i) => (
                <CandidateRow key={c.id} candidate={c} rank={i + 1} delay={i * 0.07} maxVotes={maxVotes} />
              ))}
            </div>

            <AnimatePresence>
              <div className="divide-y divide-border/60">
                {displayedCandidates.map((c, i) => (
                  <CandidateRow key={c.id} candidate={c}
                    rank={candidates.findIndex(cc => cc.id === c.id) + 1}
                    delay={0.2 + i * 0.04} maxVotes={maxVotes} />
                ))}
              </div>
            </AnimatePresence>

            {filteredCandidates.length > 5 && (
              <button id="toggle-candidates" onClick={() => setShowAll(!showAll)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-primary hover:bg-blue-50 transition-colors border-t border-border">
                {showAll
                  ? <><ChevronUp className="w-4 h-4" /> Ver menos</>
                  : <><ChevronDown className="w-4 h-4" /> Ver todos ({filteredCandidates.length - 5} más)</>}
              </button>
            )}
          </div>
        </section>

        {/* ── Bubble Distribution ── */}
        <section>
          <SectionHeader icon={BarChart3} title="Distribución de Votos" iconColor="#6366F1" />
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 md:p-7">
            <p className="text-[11px] text-muted-foreground mb-6 text-center">
              Tamaño proporcional al porcentaje de votos válidos obtenidos
            </p>
            <div className="flex flex-wrap gap-4 md:gap-5 justify-center items-end">
              {candidates.slice(0, 12).map((candidate, idx) => {
                const multiplier = typeof window !== "undefined" && window.innerWidth < 768 ? 4 : 5;
                const sizePx = Math.max(40, candidate.validVotes * multiplier);
                return (
                  <motion.div key={candidate.id}
                    initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, delay: idx * 0.06 }}
                    whileHover={{ scale: 1.07, y: -3 }}
                    className="relative group cursor-default flex flex-col items-center gap-1.5">
                    <div className="rounded-full overflow-hidden flex items-center justify-center border-2"
                      style={{ width: `${sizePx}px`, height: `${sizePx}px`, borderColor: candidate.color }}>
                      <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover"
                        onError={e => {
                          e.target.style.display = "none";
                          e.target.parentElement.style.backgroundColor = candidate.color;
                          e.target.parentElement.innerHTML = `<span style="color:white;font-weight:900;font-size:${Math.max(10, sizePx * 0.2)}px">${candidate.validVotes.toFixed(1)}%</span>`;
                        }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: candidate.color }}>
                      {candidate.validVotes.toFixed(1)}%
                    </span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-md">
                      <p className="font-bold text-foreground">{candidate.name.split(" ").slice(-2).join(" ")}</p>
                      <p className="text-muted-foreground text-[10px]">{candidate.party}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-border bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Datos en tiempo real de la{" "}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">ONPE</a>
            {" "}• Resultados parciales sujetos a cambios • Auto-actualización cada 2 min
          </p>
          <p>{lastUpdated ? `Última actualización: ${lastUpdated.toLocaleString("es-PE")}` : ""}</p>
        </div>
      </footer>
    </div>
  );
}
