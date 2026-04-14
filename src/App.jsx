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
} from "lucide-react";
import { cn } from "./lib/utils";
import { fetchCandidates, fetchTotals, fetchHeatmap, fetchUbigeos } from "./api/onpe";
import PeruMap from "./components/PeruMap";
import "./index.css";

/* ─── Constants ─── */
const SOURCE_URL =
  "https://resultadoelectoral.onpe.gob.pe/main/presidenciales";

/* ─── Helper Components ─── */

function Badge({ children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value, max, color, delay = 0, showLabel = true }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2.5 bg-secondary/60 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
        />
      </div>
      {showLabel && (
        <span 
          className="text-xs font-bold min-w-[45px] text-right"
          style={{ color }}
        >
          {value.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

function CandidateAvatar({ candidate, size = "md" }) {
  const [imgError, setImgError] = useState(false);
  const sizes = {
    sm: "w-10 h-10",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  if (imgError) {
    return (
      <div
        className={cn(
          sizes[size],
          "rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-lg"
        )}
        style={{ backgroundColor: candidate.color }}
      >
        {candidate.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </div>
    );
  }

  return (
    <img
      src={candidate.photoUrl}
      alt={candidate.name}
      onError={() => setImgError(true)}
      className={cn(
        sizes[size],
        "rounded-xl object-cover flex-shrink-0 shadow-lg border-2 border-border/30"
      )}
    />
  );
}

function PartyLogo({ candidate, size = "sm" }) {
  const [imgError, setImgError] = useState(false);
  const sizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
  };

  if (imgError) {
    const acronym = candidate.party
      ? candidate.party
          .split(" ")
          .filter((w) => w.length > 2 && !["DEL", "LOS", "LAS", "POR", "PARA"].includes(w.toUpperCase()))
          .map((w) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "?";

    return (
      <div
        title={candidate.party}
        className={cn(
          sizes[size],
          "rounded flex items-center justify-center text-white font-bold text-[10px] shadow-sm"
        )}
        style={{ backgroundColor: candidate.color }}
      >
        {acronym}
      </div>
    );
  }

  return (
    <img
      src={candidate.logoUrl}
      alt={candidate.party}
      title={candidate.party}
      onError={() => setImgError(true)}
      className={cn(
        sizes[size],
        "rounded object-contain flex-shrink-0"
      )}
    />
  );
}

/* ─── Stat Card ─── */

function StatCard({ icon: Icon, label, value, sublabel, colorClass }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border-x border-y border-border p-5 rounded-lg shadow-sm hover:shadow transition-shadow flex items-start justify-between"
    >
      <div className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-3xl font-black tracking-tighter text-foreground">{value}</p>
        {sublabel && (
          <p className="text-[13px] text-muted-foreground font-medium">{sublabel}</p>
        )}
      </div>
      <div className={cn("p-2.5 rounded-md", colorClass)}>
        <Icon className="w-5 h-5 flex-shrink-0" />
      </div>
    </motion.div>
  );
}

/* ─── Podium / Leader Card ─── */

function PodiumCard({ candidate, rank, delay }) {
  const isSecondRound = rank <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative rounded-xl border bg-card p-6 flex flex-col h-full cursor-default transition-all duration-200",
        isSecondRound 
          ? "border-primary/30 ring-1 ring-primary/10 shadow-md hover:shadow-lg" 
          : "border-border shadow-sm hover:shadow-md"
      )}
    >
      {isSecondRound && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl uppercase tracking-wider shadow-sm z-20">
          Clasifica a 2da Vuelta
        </div>
      )}

      {/* Rank badge + percentage */}
      <div className="flex items-center justify-between mb-4">
        <Badge className={isSecondRound ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
          #{rank}
        </Badge>
        <span
          className="text-3xl font-black tracking-tight"
          style={{ color: isSecondRound ? candidate.color : "var(--color-foreground)" }}
        >
          {candidate.validVotes.toFixed(2)}%
        </span>
      </div>

      {/* Photo + Party Logo */}
      <div className="flex items-center gap-3 mb-4">
        <CandidateAvatar candidate={candidate} size="lg" />
        <PartyLogo candidate={candidate} size="md" />
      </div>

      {/* Name */}
      <h3 className="text-base font-bold leading-tight mb-1 line-clamp-2 text-foreground">
        {candidate.name}
      </h3>
      <p className="text-xs font-semibold text-muted-foreground mb-5 line-clamp-1 uppercase tracking-wider">
        {candidate.party}
      </p>

      {/* Stats */}
      <div className="mt-auto space-y-3 pt-4 border-t border-border/60">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
            Porcentaje Obtenido
          </span>
          <ProgressBar
            value={candidate.validVotes}
            max={50}
            color={candidate.color}
            delay={delay + 0.1}
            showLabel={true}
          />
        </div>
        
        <div className="flex justify-between items-center mt-3">
          <span className="text-xs font-medium text-muted-foreground">
            Total de Votos
          </span>
          <span className="text-sm font-bold text-foreground">
            {candidate.totalVotes.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Table Row ─── */

function CandidateRow({ candidate, rank, delay, maxVotes }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.01, backgroundColor: "var(--color-secondary)" }}
      className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all cursor-default group border border-transparent hover:border-border hover:shadow-sm"
    >
      {/* Rank */}
      <div className="text-sm font-bold text-muted-foreground w-8 text-center">
        {rank}
      </div>

      {/* Photo */}
      <CandidateAvatar candidate={candidate} size="sm" />

      {/* Party logo */}
      <PartyLogo candidate={candidate} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{candidate.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {candidate.party}
        </p>
      </div>

      {/* Progress bar */}
      <div className="hidden md:block flex-1 max-w-[200px]">
        <ProgressBar
          value={candidate.validVotes}
          max={maxVotes}
          color={candidate.color}
          delay={delay}
          showLabel={false}
        />
      </div>

      {/* Stats */}
      <div className="text-right min-w-[90px]">
        <p className="text-sm font-bold" style={{ color: candidate.color }}>
          {candidate.validVotes.toFixed(2)}%
        </p>
        <p className="text-xs text-muted-foreground">
          {candidate.totalVotes.toLocaleString()} votos
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Loading State ─── */

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Vote className="w-8 h-8 text-primary" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1 -right-1"
          >
            <Loader2 className="w-5 h-5 text-primary" />
          </motion.div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Cargando Resultados</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Obteniendo datos de la ONPE...
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Error State ─── */

function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full rounded-xl border border-destructive/30 bg-card p-8 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Error al cargar datos</h2>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Main App ─── */

export default function App() {
  const [candidates, setCandidates] = useState([]);
  const [totals, setTotals] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [ubigeosData, setUbigeosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidatesData, totalsData, heatmapRaw, ubigeosRaw] = await Promise.all([
        fetchCandidates(),
        fetchTotals().catch(() => null),
        fetchHeatmap().catch(() => []),
        fetchUbigeos().catch(() => []),
      ]);
      setCandidates(candidatesData);
      setTotals(totalsData);
      setHeatmapData(heatmapRaw);
      setUbigeosData(ubigeosRaw);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err.message || "No se pudieron obtener los datos de la ONPE");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading && candidates.length === 0) return <LoadingState />;
  if (error && candidates.length === 0)
    return <ErrorState error={error} onRetry={loadData} />;

  const top3 = candidates.slice(0, 3);
  const rest = candidates.slice(3);
  const maxVotes = candidates[0]?.validVotes || 1;
  const totalVotesCast = candidates.reduce((s, c) => s + c.totalVotes, 0);

  const filteredCandidates = rest.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedCandidates = showAll
    ? filteredCandidates
    : filteredCandidates.slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 font-sans">
      {/* ── Header ── */}
      <header className="relative z-50 sticky top-0 bg-card border-b border-border shadow-sm transition-all duration-300">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-4"
          >
            {/* Top tags row */}
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 rounded flex items-center bg-emerald-100 text-emerald-700 font-bold text-[10px] tracking-widest uppercase border border-emerald-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                EN VIVO
              </div>
              <span className="text-muted-foreground/30 hidden sm:inline">•</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest hidden sm:inline-block">
                Balotaje Presidencial 2026
              </span>
            </div>

            {/* Main Title and Actions Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between w-full gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 hidden sm:flex items-center justify-center">
                  <Vote className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground leading-none">
                    Resultados ONPE
                  </h1>
                  <p className="text-muted-foreground text-sm font-medium mt-1">
                    Elecciones Generales — Participación de {candidates.length} organizaciones
                  </p>
                </div>
              </div>

              {/* Botones de acción derecha */}
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-card border border-border text-xs font-bold text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-all disabled:opacity-50"
                  title="Actualizar Datos"
                >
                  <RefreshCw
                    className={cn("w-3.5 h-3.5", loading && "animate-spin")}
                  />
                  <span>Actualizar</span>
                </button>
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-card border border-border text-xs font-bold text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-all group"
                  title="Ir a fuente original (ONPE)"
                >
                  <span>Fuente Oficial</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Full Width Progress Bar (Stacked) */}
          {totals && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 pt-6 border-t border-border/30 max-w-5xl"
            >
              <div className="flex flex-col md:flex-row md:items-end gap-x-6 gap-y-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Actas contabilizadas
                  </h3>
                <div className="mt-1 flex items-baseline">
                  <div className="text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
                    {totals.actasContabilizadas?.toFixed(3)}
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-muted-foreground ml-1 mb-1">%</span>
                </div>
                </div>
                
                <div className="mb-1 space-y-1">
                  <p className="text-lg font-bold text-foreground">
                    Total de actas: {totals.totalActas?.toLocaleString()}
                  </p>
                  <p className="text-sm text-primary font-medium">
                    {totals.actasEnviadasJee?.toFixed(3)} % de Actas para envío al JEE y {totals.actasPendientesJee?.toFixed(3)} % de Actas pendientes
                  </p>
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="h-6 w-full flex rounded-sm overflow-hidden shadow-inner bg-accent/20 border border-border/20">
                {/* Contabilizadas */}
                <motion.div
                  className="bg-primary hover:brightness-110 transition-all cursor-crosshair relative group flex items-center justify-center min-w-[2px]"
                  initial={{ width: 0 }}
                  animate={{ width: `${totals.actasContabilizadas || 0}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                   <div className="absolute opacity-0 group-hover:opacity-100 top-full mt-2 left-1/2 -translate-x-1/2 bg-popover border border-border text-popover-foreground text-xs px-2.5 py-1.5 rounded shadow-xl whitespace-nowrap pointer-events-none z-50">
                     <span className="font-bold text-primary">Contabilizadas:</span> {totals.contabilizadas?.toLocaleString()} actas
                   </div>
                </motion.div>
                
                {/* Enviadas JEE */}
                <motion.div
                  className="bg-amber-500 hover:brightness-110 transition-all cursor-crosshair relative group flex items-center justify-center min-w-[2px]"
                  initial={{ width: 0 }}
                  animate={{ width: `${totals.actasEnviadasJee || 0}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                >
                   <div className="absolute opacity-0 group-hover:opacity-100 top-full mt-2 left-1/2 -translate-x-1/2 bg-popover border border-border text-popover-foreground text-xs px-2.5 py-1.5 rounded shadow-xl whitespace-nowrap pointer-events-none z-50">
                     <span className="font-bold text-amber-500">Envío al JEE:</span> {totals.enviadasJee?.toLocaleString()} actas
                   </div>
                </motion.div>
                
                {/* Pendientes */}
                <motion.div
                  className="bg-muted hover:bg-muted/80 transition-all cursor-crosshair relative group flex items-center justify-center min-w-[2px]"
                  initial={{ width: 0 }}
                  animate={{ width: `${totals.actasPendientesJee || 0}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                >
                   <div className="absolute opacity-0 group-hover:opacity-100 top-full mt-2 left-1/2 -translate-x-1/2 bg-popover border border-border text-popover-foreground text-xs px-2.5 py-1.5 rounded shadow-xl whitespace-nowrap pointer-events-none z-50">
                     <span className="font-bold">Pendientes:</span> {totals.pendientesJee?.toLocaleString()} actas
                   </div>
                </motion.div>
              </div>
              
              {/* Actualizado info */}
              <div className="mt-4 text-xs font-bold text-primary uppercase tracking-widest">
                {lastUpdated
                  ? `ACTUALIZADO AL ${lastUpdated.toLocaleDateString("es-PE")} A LAS ${lastUpdated.toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : "ACTUALIZANDO..."}
              </div>
            </motion.div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Candidatos"
            value={candidates.length}
            sublabel="Organizaciones políticas"
            colorClass="bg-blue-100 text-blue-700"
          />
          <StatCard
            icon={BarChart3}
            label="Participación"
            value={`${totals?.participacionCiudadana?.toFixed(2) || 0}%`}
            sublabel="Electores hábiles"
            colorClass="bg-indigo-100 text-indigo-700"
          />
          <StatCard
            icon={TrendingUp}
            label="Líder"
            value={`${candidates[0]?.validVotes.toFixed(2)}%`}
            sublabel={candidates[0]?.name.split(" ").slice(-2).join(" ")}
            colorClass="bg-amber-100 text-amber-700"
          />
          <StatCard
            icon={Award}
            label="Corte"
            value="En Vivo"
            sublabel={
              lastUpdated
                ? lastUpdated.toLocaleTimeString("es-PE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"
            }
            colorClass="bg-emerald-100 text-emerald-700"
          />
        </div>

        {/* ── Top Candidates ── */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-bold">Líderes de la Contienda</h2>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg max-w-md">
              <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-primary font-medium leading-tight">
                Solo los <strong className="font-bold">2 primeros lugares</strong> clasifican a la Segunda Vuelta Electoral (Balotaje).
              </p>
            </div>
          </div>
          
          {/* Top 3 List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              {top3[0] && (
                <PodiumCard candidate={top3[0]} rank={1} delay={0.1} />
              )}
            </div>
            <div>
              {top3[1] && (
                <PodiumCard candidate={top3[1]} rank={2} delay={0.2} />
              )}
            </div>
            <div>
              {top3[2] && (
                <PodiumCard candidate={top3[2]} rank={3} delay={0.3} />
              )}
            </div>
          </div>
        </section>

        {/* ── Mapa de Avance Regional ── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-5 h-5 flex items-center justify-center text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
            </div>
            <h2 className="text-xl font-bold">Avance Regional</h2>
          </div>
          <PeruMap heatmapData={heatmapData} ubigeosData={ubigeosData} totals={totals} />
          
          {/* ── Regional Progress Ranking ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mayor Avance Regional
              </h3>
              <div className="space-y-3">
                {heatmapData
                  .sort((a, b) => b.porcentajeActasContabilizadas - a.porcentajeActasContabilizadas)
                  .slice(0, 5)
                  .map((reg, idx) => {
                    const depto = ubigeosData.find(u => u.ubigeo === reg.ubigeoNivel01.toString().padStart(6, "0"));
                    return (
                      <div key={reg.ubigeoNivel01} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                            {depto?.nombre || 'Región'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${reg.porcentajeActasContabilizadas}%` }}
                              className="h-full bg-emerald-500"
                            />
                          </div>
                          <span className="text-[11px] font-black text-emerald-700 w-12 text-right">
                            {reg.porcentajeActasContabilizadas.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
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
                      <div key={reg.ubigeoNivel01} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-muted-foreground w-4">{idx + 1}</span>
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">
                            {depto?.nombre || 'Región'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${reg.porcentajeActasContabilizadas}%` }}
                              className="h-full bg-amber-500"
                            />
                          </div>
                          <span className="text-[11px] font-black text-amber-700 w-12 text-right">
                            {reg.porcentajeActasContabilizadas.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Comparison Chart ── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">
              Comparativa de Porcentajes
            </h2>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="space-y-3">
              {candidates.slice(0, 8).map((candidate, idx) => (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="flex items-center gap-4"
                >
                  {/* Photo + Name */}
                  <div className="w-8 hidden sm:block">
                    <CandidateAvatar candidate={candidate} size="sm" />
                  </div>
                  <div className="w-24 md:w-40 text-xs text-right text-muted-foreground truncate">
                    {candidate.name.split(" ").slice(-2).join(" ")}
                  </div>
                  <div className="flex-1">
                    <div className="relative h-8 bg-secondary rounded-md overflow-hidden">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-md flex items-center justify-end pr-3"
                        style={{ backgroundColor: candidate.color }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(candidate.validVotes / maxVotes) * 100}%`,
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.5 + idx * 0.1,
                          ease: "easeOut",
                        }}
                      >
                        <span className="text-xs font-bold text-white whitespace-nowrap">
                          {candidate.validVotes.toFixed(2)}%
                        </span>
                      </motion.div>
                    </div>
                  </div>
                  <div className="w-16 text-xs font-semibold text-right">
                    {candidate.totalVotes.toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Full Ranking Table ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold">Tabla de Posiciones</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="search-candidates"
                type="text"
                placeholder="Buscar candidato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all w-[180px] md:w-[240px]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="w-8 text-center">#</div>
              <div className="w-10" />
              <div className="w-6" />
              <div className="flex-1">Candidato</div>
              <div className="hidden md:block flex-1 max-w-[200px]">
                Representación
              </div>
              <div className="min-w-[90px] text-right">Porcentaje</div>
            </div>

            {/* Top 3 highlighted */}
            <div className="border-b border-border/30">
              {top3.map((c, i) => (
                <CandidateRow
                  key={c.id}
                  candidate={c}
                  rank={i + 1}
                  delay={i * 0.08}
                  maxVotes={maxVotes}
                />
              ))}
            </div>

            {/* Rest */}
            <AnimatePresence>
              <div className="divide-y divide-border/20">
                {displayedCandidates.map((c, i) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    rank={
                      candidates.findIndex((cc) => cc.id === c.id) + 1
                    }
                    delay={0.3 + i * 0.05}
                    maxVotes={maxVotes}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Show more/less */}
            {filteredCandidates.length > 5 && (
              <button
                id="toggle-candidates"
                onClick={() => setShowAll(!showAll)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border/30"
              >
                {showAll ? (
                  <>
                    Ver menos <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Ver todos los candidatos ({filteredCandidates.length - 5}{" "}
                    más) <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* ── Bubble Distribution ── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Distribución de Votos</h2>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="flex flex-wrap gap-3 justify-center items-end">
              {candidates.slice(0, 12).map((candidate, idx) => {
                const sizePx = Math.max(48, candidate.validVotes * 5);
                return (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: idx * 0.06 }}
                    whileHover={{ scale: 1.08 }}
                    className="relative group cursor-default flex flex-col items-center gap-1"
                  >
                    <div
                      className="rounded-full overflow-hidden flex items-center justify-center shadow-lg border-2"
                      style={{
                        width: `${sizePx}px`,
                        height: `${sizePx}px`,
                        borderColor: candidate.color,
                      }}
                    >
                      <img
                        src={candidate.photoUrl}
                        alt={candidate.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentElement.style.backgroundColor =
                            candidate.color;
                          e.target.parentElement.innerHTML = `<span style="color:white;font-weight:bold;font-size:${Math.max(
                            10,
                            sizePx * 0.18
                          )}px">${candidate.validVotes.toFixed(1)}%</span>`;
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: candidate.color }}
                    >
                      {candidate.validVotes.toFixed(1)}%
                    </span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                      <p className="font-semibold">
                        {candidate.name.split(" ").slice(-2).join(" ")}
                      </p>
                      <p className="text-muted-foreground">
                        {candidate.party}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Datos en tiempo real de la{" "}
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ONPE
            </a>{" "}
            • Resultados parciales sujetos a cambios • Auto-actualización cada 2
            min
          </p>
          <p>
            {lastUpdated
              ? `Última actualización: ${lastUpdated.toLocaleString("es-PE")}`
              : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}
