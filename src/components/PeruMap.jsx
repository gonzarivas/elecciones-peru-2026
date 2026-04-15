import React, { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { Plus, Minus, Info, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { fetchCandidatesByDepartment } from "../api/onpe";
import { Loader2 } from "lucide-react";

const GEOURL = "/peru-departments.geojson";

// Historical voting tendency (Izquierda vs Derecha) based on 2021 regions
const politicalLeaning = {
  "TUMBES": "Derecha", "PIURA": "Derecha", "LAMBAYEQUE": "Derecha", 
  "LA LIBERTAD": "Derecha", "LIMA": "Derecha", "CALLAO": "Derecha", 
  "ICA": "Derecha", "LORETO": "Derecha", "UCAYALI": "Derecha", "AMAZONAS": "Derecha",
  "CAJAMARCA": "Izquierda", "SAN MARTIN": "Izquierda", "HUANUCO": "Izquierda", "PASCO": "Izquierda",
  "JUNIN": "Izquierda", "HUANCAVELICA": "Izquierda", "AYACUCHO": "Izquierda", "APURIMAC": "Izquierda",
  "CUSCO": "Izquierda", "PUNO": "Izquierda", "AREQUIPA": "Izquierda", "MOQUEGUA": "Izquierda",
  "TACNA": "Izquierda", "MADRE DE DIOS": "Izquierda", "ANCASH": "Izquierda"
};

const RIGHT_WING_PARTIES = [
  "AVANZA PAÍS - PARTIDO DE INTEGRACIÓN SOCIAL",
  "PARTIDO POLÍTICO INTEGRIDAD DEMOCRÁTICA",
  "UNIDAD NACIONAL",
  "PARTIDO PATRIÓTICO DEL PERÚ",
  "FUERZA POPULAR",
  "RENOVACIÓN POPULAR",
  "PARTIDO PAÍS PARA TODOS",
  "PARTIDO SICREO"
].map(p => p.toUpperCase());

// Helper strictly for matching department names handling accents
const normalizeStr = (str) =>
  str
    ? str
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";

/**
 * Maps the heatmap data 0-100% using RGB interpolation.
 * Uses Red for Izquierda and Blue for Derecha.
 */
const getFillColor = (percentage, leaning) => {
  if (percentage === undefined || percentage === null) return "#E2E8F0"; // fallback slate-200
  
  const pct = percentage / 100;
  
  // Start color for 0%: #F1F5F9 (slate-100)
  const startR = 241, startG = 245, startB = 249;
  
  // End color for 100% depends on leaning
  let endR = 30, endG = 58, endB = 138; // fallback blue
  if (leaning === "Izquierda") {
    // Red (e.g. #991B1B - red-800)
    endR = 153; endG = 27; endB = 27;
  } else if (leaning === "Derecha") {
    // Blue (e.g. #1E3A8A - blue-900)
    endR = 30; endG = 58; endB = 138;
  }
  
  const r = Math.round(startR - pct * (startR - endR));
  const g = Math.round(startG - pct * (startG - endG));
  const b = Math.round(startB - pct * (startB - endB));

  return `rgb(${r}, ${g}, ${b})`;
};

export default function PeruMap({ heatmapData = [], ubigeosData = [], totals = null }) {
  const [hoveredDept, setHoveredDept] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ coordinates: [-75, -9.5], zoom: 1 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [deptResults, setDeptResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [isButtonZooming, setIsButtonZooming] = useState(false);

  // Map Mode State
  const [mapMode, setMapMode] = useState("2021"); // "2021" o "2026"
  const [currentWinners, setCurrentWinners] = useState({});
  const [loadingWinners, setLoadingWinners] = useState(false);

  // Map Mode Effect
  React.useEffect(() => {
    if (mapMode === "2026" && Object.keys(currentWinners).length === 0 && heatmapData.length > 0) {
      const loadWinners2026 = async () => {
        setLoadingWinners(true);
        try {
          const winners = {};
          await Promise.all(heatmapData.map(async (h) => {
            const ubigeoStr = h.ubigeoNivel01.toString().padStart(6, "0");
            try {
              const results = await fetchCandidatesByDepartment(h.ubigeoNivel01);
              if (results && results.length > 0) {
                const topParty = results[0].party.toUpperCase();
                const isRight = RIGHT_WING_PARTIES.some(p => topParty === p || topParty.includes(p));
                winners[ubigeoStr] = isRight ? "Derecha" : "Izquierda";
              }
            } catch (err) {
              console.error(err);
            }
          }));
          setCurrentWinners(winners);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingWinners(false);
        }
      };
      loadWinners2026();
    }
  }, [mapMode, heatmapData, currentWinners]);

  // Fetch results when hovered department changes
  React.useEffect(() => {
    if (hoveredDept?.ubigeo) {
      const loadDeptResults = async () => {
        setLoadingResults(true);
        try {
          const results = await fetchCandidatesByDepartment(hoveredDept.ubigeo);
          setDeptResults(results);
        } catch (err) {
          console.error("Error fetching dept results:", err);
        } finally {
          setLoadingResults(false);
        }
      };
      loadDeptResults();
    } else {
      setDeptResults([]);
    }
  }, [hoveredDept?.ubigeo]);

  // We need to calculate overall totals for Izquierda vs Derecha
  const leaningStats = useMemo(() => {
    let actasTotalesIzquierda = 0;
    let actasPendientesIzquierda = 0;
    let actasTotalesDerecha = 0;
    let actasPendientesDerecha = 0;

    const ubigeoMap = {};
    ubigeosData.forEach((u) => {
      ubigeoMap[u.ubigeo] = normalizeStr(u.nombre);
    });

    heatmapData.forEach((h) => {
      const ubigeoStr = h.ubigeoNivel01.toString().padStart(6, "0");
      const deptoName = ubigeoMap[ubigeoStr];
      const leaning = (mapMode === "2026" && currentWinners[ubigeoStr]) 
        ? currentWinners[ubigeoStr] 
        : (politicalLeaning[deptoName] || "Neutro");

      // Re-calculate the absolute missing ballots based on the percentage
      // because we only get `actasContabilizadas` and `porcentajeActasContabilizadas`
      // ActasTotales = (ActasContabilizadas * 100) / Porcentaje
      if (deptoName && h.porcentajeActasContabilizadas > 0) {
        const dptTotalActas = Math.round((h.actasContabilizadas * 100) / h.porcentajeActasContabilizadas);
        const dptPendientes = dptTotalActas - h.actasContabilizadas;

        if (leaning === "Izquierda") {
          actasTotalesIzquierda += dptTotalActas;
          actasPendientesIzquierda += dptPendientes;
        } else if (leaning === "Derecha") {
          actasTotalesDerecha += dptTotalActas;
          actasPendientesDerecha += dptPendientes;
        }
      }
    });

    const totalPendientesNacional = actasPendientesIzquierda + actasPendientesDerecha;

    // Calculamos qué porcentaje del total nacional pendiente le pertenece a cada bando
    const percentPendientesIzquierda = totalPendientesNacional === 0 ? 0 : (actasPendientesIzquierda / totalPendientesNacional) * 100;
    const percentPendientesDerecha = totalPendientesNacional === 0 ? 0 : (actasPendientesDerecha / totalPendientesNacional) * 100;

    return {
      izqPendientePct: percentPendientesIzquierda,
      derPendientePct: percentPendientesDerecha,
      actasPendientesIzquierda,
      actasPendientesDerecha
    };

  }, [heatmapData, ubigeosData, mapMode, currentWinners]);

  // Pre-process API data into an easy-to-use map:
  // normalized NOMBDEP -> percentage
  const departmentData = useMemo(() => {
    // 1. Create a lookup by ubigeo string "010000" -> "AMAZONAS"
    const ubigeoMap = {};
    ubigeosData.forEach((u) => {
      ubigeoMap[u.ubigeo] = normalizeStr(u.nombre);
    });

    // 2. Map the percentage using the ubigeo Nivel 1 padded string
    const map = {};
     heatmapData.forEach((h) => {
      const ubigeoStr = h.ubigeoNivel01.toString().padStart(6, "0");
      const deptoName = ubigeoMap[ubigeoStr];
      if (deptoName) {
        map[deptoName] = {
          percentage: h.porcentajeActasContabilizadas,
          ubigeo: h.ubigeoNivel01
        };
      }
    });

    // For Lima, handle LIMA PROVINCIA (region) vs LIMA METROPOLITANA.
    // Geographical geojson usually merge them as "LIMA" or specifies. 
    // We will do a fuzzy fallback if needed.
    return map;
  }, [heatmapData, ubigeosData]);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setIsButtonZooming(true);
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.3 }));
    setTimeout(() => setIsButtonZooming(false), 300);
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setIsButtonZooming(true);
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.3 }));
    setTimeout(() => setIsButtonZooming(false), 300);
  };

  const handleZoomEnd = (position) => {
    setPosition(position);
  };

  const handleReset = () => {
    setIsButtonZooming(true);
    setPosition({ coordinates: [-75, -9.5], zoom: 1 });
    setTimeout(() => setIsButtonZooming(false), 300);
  };

  return (
    <div className="flex flex-col gap-4">
      <motion.div 
        layout
        className={cn(
          "relative w-full bg-slate-50/50 rounded-xl border border-border/50 flex flex-col items-center transition-all duration-500",
          isExpanded ? "fixed inset-0 z-[100] bg-background shadow-none rounded-none" : "h-auto md:h-[550px] shadow-sm"
        )}
      >
        {/* MAP SVG AREA */}
      <div className={cn(
        "w-full flex-1 flex items-center justify-center p-2 md:p-4",
        isExpanded ? "h-full" : "h-[450px]"
      )}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: isExpanded ? 3000 : 2200,
            center: [-75, -9.5]
          }}
          width={800}
          height={800}
          style={{ width: "100%", height: "100%", maxHeight: "100%" }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={[-75, -9.5]}
            onMoveEnd={handleZoomEnd}
            minZoom={0.8}
            maxZoom={10}
            className={isButtonZooming ? "transition-transform duration-300 ease-in-out" : ""}
          >
            <Geographies geography={GEOURL}>
              {({ geographies }) =>
                geographies.map((geo, i) => {
                  const geoName = geo.properties.NOMBDEP || geo.properties.name || "";
                  const normalizedGeoName = normalizeStr(geoName);
                  
                  // Fetch the mapped percentage
                  let percentage = departmentData[normalizedGeoName]?.percentage;
                  let ubigeo = departmentData[normalizedGeoName]?.ubigeo;
                  
                  // Fallback special logic for Callao / Lima
                  if (percentage === undefined) {
                    if (normalizedGeoName.includes("PROVINCIA CONSTITUCIONAL")) {
                      percentage = departmentData["CALLAO"]?.percentage;
                      ubigeo = departmentData["CALLAO"]?.ubigeo;
                    }
                    if (normalizedGeoName === "LIMA") {
                      percentage = departmentData["LIMA"]?.percentage;
                      ubigeo = departmentData["LIMA"]?.ubigeo;
                    }
                  }

                  const ubigeoStr = ubigeo ? ubigeo.toString().padStart(6, "0") : null;
                  const leaning = (ubigeoStr && mapMode === "2026" && currentWinners[ubigeoStr])
                    ? currentWinners[ubigeoStr]
                    : (politicalLeaning[normalizedGeoName] || "Neutro");

                  const fillColor = getFillColor(percentage, leaning);

                  return (
                    <motion.g
                      key={geo.rsmKey}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.01 }}
                    >
                      <Geography
                        geography={geo}
                        fill={fillColor}
                        stroke="#ffffff"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none", transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)" },
                          hover: { 
                            outline: "none", 
                            transition: "all 300ms", 
                            fill: leaning === "Izquierda" ? "#DC2626" : "#2563EB", 
                            strokeWidth: 2, 
                            cursor: "pointer",
                            filter: "drop-shadow(0 0 8px rgba(0,0,0,0.2))"
                          },
                          pressed: { outline: "none" },
                        }}
                        onMouseEnter={(evt) => {
                          setHoveredDept({
                            name: geoName,
                            percentage: percentage,
                            leaning: leaning,
                            ubigeo: ubigeo
                          });
                        }}
                        onMouseMove={(evt) => {
                          const container = evt.currentTarget.closest('.relative');
                          const rect = container.getBoundingClientRect();
                          setTooltipPosition({
                            x: evt.clientX - rect.left,
                            y: evt.clientY - rect.top,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredDept(null);
                        }}
                      />
                    </motion.g>
                  );
                })
              }
            </Geographies>

            {/* CALLAO Hover Helper (Exaggerated Hitbox) */}
            <Marker coordinates={[-77.10, -12.02]}>
              <circle
                r={isExpanded ? 3.5 : 5.5}
                fill={(() => {
                  const pct = departmentData["CALLAO"]?.percentage;
                  const ubigeoStr = departmentData["CALLAO"]?.ubigeo ? departmentData["CALLAO"].ubigeo.toString().padStart(6, "0") : "070000";
                  const leaning = (mapMode === "2026" && currentWinners[ubigeoStr])
                    ? currentWinners[ubigeoStr]
                    : (politicalLeaning["CALLAO"] || "Neutro");
                  return getFillColor(pct, leaning);
                })()}
                stroke="#ffffff"
                strokeWidth={1.5}
                style={{ cursor: "pointer", filter: "drop-shadow(0px 1px 3px rgba(0,0,0,0.5))" }}
                onMouseEnter={() => {
                  const pct = departmentData["CALLAO"]?.percentage;
                  const ubigeo = departmentData["CALLAO"]?.ubigeo;
                  const ubigeoStr = ubigeo ? ubigeo.toString().padStart(6, "0") : "070000";
                  const leaning = (mapMode === "2026" && currentWinners[ubigeoStr])
                    ? currentWinners[ubigeoStr]
                    : (politicalLeaning["CALLAO"] || "Neutro");
                  setHoveredDept({
                    name: "PROV. CONST. DEL CALLAO",
                    percentage: pct,
                    leaning: leaning,
                    ubigeo: ubigeo
                  });
                }}
                onMouseMove={(evt) => {
                  const container = evt.currentTarget.closest('.relative');
                  const rect = container.getBoundingClientRect();
                  setTooltipPosition({
                    x: evt.clientX - rect.left,
                    y: evt.clientY - rect.top
                  });
                }}
                onMouseLeave={() => setHoveredDept(null)}
              />
            </Marker>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* TOOLTIP */}
      {hoveredDept && (
        <div
          className="pointer-events-none absolute z-50 text-white px-4 py-2.5 rounded-lg shadow-xl transition-transform duration-200"
          style={{
            left: `${tooltipPosition.x}px`,
            top: tooltipPosition.y < 220 ? `${tooltipPosition.y + 20}px` : `${tooltipPosition.y - 12}px`,
            transform: tooltipPosition.y < 220 ? "translate(-50%, 0%)" : "translate(-50%, -100%)",
            backgroundColor: hoveredDept.leaning === "Izquierda" ? "#991B1B" : "#1E3A8A",
          }}
        >
          <div className="font-bold text-center mb-1 text-[13px] tracking-wide">{hoveredDept.name}</div>
          {hoveredDept.percentage !== undefined && (
            <div className="text-[11px] font-medium text-white/90 text-center mb-1 bg-black/20 rounded px-2 py-0.5">
              Avance en Región: {hoveredDept.percentage.toFixed(3)}%
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-1.5 border-t border-white/20 pt-1.5 mb-2">
            <span className={`w-2 h-2 rounded-full ${hoveredDept.leaning === "Izquierda" ? "bg-red-300" : "bg-blue-300"}`}></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
              Voto Mayoritario: {hoveredDept.leaning}
            </span>
          </div>

          {/* Top 5 Candidates in Tooltip */}
          <div className="mt-2 pt-2 border-t border-white/10 w-[200px]">
            {loadingResults ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            ) : deptResults.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/60 mb-1">Top 5 Candidatos</div>
                {deptResults.map((cand, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 group">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <img src={cand.logoUrl} alt="" className="w-3.5 h-3.5 rounded-sm flex-shrink-0 bg-white" />
                      <span className="text-[9px] font-medium text-white/90 truncate leading-none uppercase">
                        {cand.party}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-white">
                      {Number(cand.percentage).toFixed(3)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[9px] text-white/50 italic text-center py-1">
                Obteniendo datos...
              </div>
            )}
          </div>
          
          {/* Tooltip Arrow */}
          <div 
            className="absolute left-1/2 -ml-1.5 border-4 border-transparent"
            style={{ 
              top: tooltipPosition.y < 220 ? "auto" : "100%",
              bottom: tooltipPosition.y < 220 ? "100%" : "auto",
              marginTop: tooltipPosition.y < 220 ? "0" : "-4px",
              marginBottom: tooltipPosition.y < 220 ? "-4px" : "0",
              borderTopColor: tooltipPosition.y < 220 ? "transparent" : (hoveredDept.leaning === "Izquierda" ? "#991B1B" : "#1E3A8A"),
              borderBottomColor: tooltipPosition.y < 220 ? (hoveredDept.leaning === "Izquierda" ? "#991B1B" : "#1E3A8A") : "transparent"
            }}
          ></div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="absolute right-4 bottom-36 md:bottom-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-card hover:bg-muted border border-border w-10 h-10 rounded-md text-foreground flex items-center justify-center transition-colors"
          title={isExpanded ? "Contraer" : "Expandir"}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
        <button
          onClick={handleZoomIn}
          className="bg-card hover:bg-muted border border-border w-10 h-10 rounded-md text-foreground flex items-center justify-center transition-colors"
          title="Acercar"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-card hover:bg-muted border border-border w-10 h-10 rounded-md text-foreground flex items-center justify-center transition-colors"
          title="Alejar"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* GLOBAL TOTALS BOX */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full md:absolute md:left-4 md:bottom-4 md:w-72 z-10 bg-card/60 md:bg-card/95 backdrop-blur-md border-t md:border border-border/50 p-3 md:p-4 md:rounded-xl"
      >
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-left">
            Balance de Escrutinio
          </div>
          <div className="flex bg-slate-100 rounded-md p-0.5">
            <button 
              onClick={() => setMapMode('2021')} 
              className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors", mapMode === '2021' ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              2021
            </button>
            <button 
              onClick={() => setMapMode('2026')} 
              className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors", mapMode === '2026' ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              HOY
              {loadingWinners && <Loader2 className="w-2.5 h-2.5 animate-spin"/>}
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mb-3 text-center">
          <div className="text-2xl md:text-4xl font-black text-slate-900 leading-none tracking-tighter">
            {totals?.actasContabilizadas ? totals.actasContabilizadas.toFixed(3) : "0.000"}%
          </div>
          <p className="text-[8px] uppercase font-bold text-slate-400 mt-1 mb-2">CONSOLIDADO NACIONAL</p>
          
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner border border-slate-200/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${totals?.actasContabilizadas || 0}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <span className="text-[10px] font-extrabold text-foreground uppercase tracking-tight">Izquierda</span>
              </div>
              <div className="text-[11px] font-bold text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-100 flex flex-col items-center justify-center">
                <span>{leaningStats.izqPendientePct.toFixed(1)}% de actas</span>
                <span className="text-red-500">pendientes</span>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] font-extrabold text-foreground uppercase tracking-tight">Derecha</span>
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              </div>
              <div className="text-[11px] font-bold text-blue-600 bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex flex-col items-center justify-center">
                <span>{leaningStats.derPendientePct.toFixed(1)}% de actas</span>
                <span className="text-blue-500">pendientes</span>
              </div>
            </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground font-medium text-center italic">
          {hoveredDept && hoveredDept.percentage !== undefined
             ? `🎯 ${hoveredDept.name}: ${hoveredDept.percentage.toFixed(3)}% contab.` 
             : "Desliza sobre el mapa para ver detalle"}
        </div>
      </motion.div>
      </motion.div>

      {/* REPORTE ANALYSIS BOX */}
      <div className="w-full bg-white p-5 md:p-6 rounded-2xl border border-border mt-4">
        <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-blue-700/80 mb-3">
          <Info className="w-3.5 h-3.5" />
          Análisis de Actas Pendientes (Faltantes)
        </h4>
        <div className="text-[12px] text-slate-600 font-medium leading-[1.6] space-y-4">
          <p>
            Los porcentajes en el tablero representan qué proporción de <strong>todas las actas que faltan contabilizar hoy a nivel nacional</strong> proviene de zonas de tendencia de izquierda vs derecha. Al sumar ambos valores, el resultado es exactamente el <strong>100%</strong> de la "bolsa" de votos aún no procesados.
          </p>
          <div className="py-2.5 px-4 bg-[#F8FAFC] border-l-[3px] border-[#CBD5E1] rounded-r-md text-slate-500 text-[11px]">
            <strong>Nota de Color (Mapa):</strong> Por defecto, se usa la tendencia del <strong>2021</strong>. Al seleccionar <strong>HOY</strong>, se colorea cada región según si el partido del candidato que lidera actualmente pertenece a la <strong>Izquierda o Derecha</strong> (basado en la lista preconfigurada de partidos de derecha).
          </div>
          <p>
            Dado que la ONPE no publica el padrón total regional en esta vista, calculamos las actas absolutas esperadas usando regla de tres <em>(Contabilizadas / Porcentaje)</em> para obtener valores reales de votos pendientes, en lugar de promediar los porcentajes crudos.
          </p>
        </div>
      </div>
    </div>
  );
}
