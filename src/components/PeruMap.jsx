import React, { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Plus, Minus, Info, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

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
      const leaning = politicalLeaning[deptoName] || "Neutro";

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

  }, [heatmapData, ubigeosData]);

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
        map[deptoName] = h.porcentajeActasContabilizadas;
      }
    });

    // For Lima, handle LIMA PROVINCIA (region) vs LIMA METROPOLITANA.
    // Geographical geojson usually merge them as "LIMA" or specifies. 
    // We will do a fuzzy fallback if needed.
    return map;
  }, [heatmapData, ubigeosData]);

  const handleZoomIn = () => {
    if (position.zoom >= 4) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleZoomEnd = (position) => {
    setPosition(position);
  };

  const handleReset = () => {
    setPosition({ coordinates: [-75, -9.5], zoom: 1 });
  };

  return (
    <div className="flex flex-col gap-4">
      <motion.div 
        layout
        className={cn(
          "relative w-full bg-slate-50/50 rounded-xl overflow-hidden border border-border/50 flex flex-col items-center justify-center transition-all duration-500",
          isExpanded ? "fixed inset-4 z-[100] bg-background shadow-lg" : "h-[550px]"
        )}
      >
        {/* MAP SVG AREA */}
      <div className="w-full h-full flex items-center justify-center p-4">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: isExpanded ? 2400 : 1900,
          }}
          width={600}
          height={600}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleZoomEnd}
            minZoom={1}
            maxZoom={10}
          >
            <Geographies geography={GEOURL}>
              {({ geographies }) =>
                geographies.map((geo, i) => {
                  const geoName = geo.properties.NOMBDEP || geo.properties.name || "";
                  const normalizedGeoName = normalizeStr(geoName);
                  
                  // Fetch the mapped percentage
                  let percentage = departmentData[normalizedGeoName];
                  
                  const leaning = politicalLeaning[normalizedGeoName] || "Neutro";

                  // Fallback special logic for Callao / Lima
                  if (percentage === undefined) {
                    if (normalizedGeoName.includes("PROVINCIA CONSTITUCIONAL")) percentage = departmentData["CALLAO"];
                    if (normalizedGeoName === "LIMA") percentage = departmentData["LIMA"]; 
                  }

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
                            leaning: leaning
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
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* TOOLTIP */}
      {hoveredDept && (
        <div
          className="pointer-events-none absolute z-50 text-white px-4 py-2.5 rounded-lg shadow-xl"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 12}px`,
            transform: "translate(-50%, -100%)",
            backgroundColor: hoveredDept.leaning === "Izquierda" ? "#991B1B" : "#1E3A8A",
          }}
        >
          <div className="font-bold text-center mb-1 text-[13px] tracking-wide">{hoveredDept.name}</div>
          {hoveredDept.percentage !== undefined && (
            <div className="text-[11px] font-medium text-white/90 text-center mb-1 bg-black/20 rounded px-2 py-0.5">
              Avance en Región: {hoveredDept.percentage.toFixed(2)}%
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-1.5 border-t border-white/20 pt-1.5">
            <span className={`w-2 h-2 rounded-full ${hoveredDept.leaning === "Izquierda" ? "bg-red-300" : "bg-blue-300"}`}></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
              Voto Mayoritario: {hoveredDept.leaning}
            </span>
          </div>
          
          <div 
            className="absolute top-full left-1/2 -mt-1 -ml-1.5 border-4 border-transparent"
            style={{ borderTopColor: hoveredDept.leaning === "Izquierda" ? "#991B1B" : "#1E3A8A" }}
          ></div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute left-4 bottom-4 w-64 md:w-72 z-10 bg-card border border-border/50 p-4 rounded-xl"
      >
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center border-b border-border/50 pb-2">
          Balance de Escrutinio
        </div>

        {/* Global Progress Bar */}
        <div className="mb-6 text-center">
          <div className="text-4xl font-black text-slate-900 leading-none tracking-tighter">
            {totals?.actasContabilizadas ? totals.actasContabilizadas.toFixed(2) : "0.00"}%
          </div>
          <p className="text-[9px] uppercase font-bold text-slate-400 mt-2 mb-3">CONSOLIDADO NACIONAL</p>
          
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner border border-slate-200/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${totals?.actasContabilizadas || 0}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">Izquierda</span>
              </div>
              <div className="text-[11px] text-red-700 bg-red-50 p-1.5 rounded font-bold text-center border border-red-200">
                {leaningStats.izqPendientePct.toFixed(1)}% de actas pendientes
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[10px] font-bold text-foreground uppercase tracking-tight">Derecha</span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              </div>
              <div className="text-[11px] text-blue-700 bg-blue-50 p-1.5 rounded font-bold text-center border border-blue-200">
                {leaningStats.derPendientePct.toFixed(1)}% de actas pendientes
              </div>
            </div>
        </div>

        {/* Hover Hint Info */}
        <div className="text-[10px] text-muted-foreground font-medium text-center pt-2 border-t border-border/50 italic">
          {hoveredDept && hoveredDept.percentage !== undefined
             ? `🎯 ${hoveredDept.name}: ${hoveredDept.percentage.toFixed(2)}% contab.` 
             : "Desliza sobre el mapa para ver detalle"}
        </div>
      </motion.div>
      </motion.div>

      {/* MATH EXPLANATION BOX (Outside Map) */}
      <div className="w-full bg-card p-4 rounded-xl border border-border/50 mt-1">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          <Info className="w-4 h-4 text-primary" />
          Análisis de Actas Pendientes (Faltantes)
        </h4>
        <div className="text-sm text-foreground/80 leading-relaxed md:pr-12 space-y-3">
          <p>
            Los porcentajes en el tablero representan qué proporción de <strong>todas las actas que faltan contabilizar hoy a nivel nacional</strong> proviene de zonas de tendencia de izquierda vs derecha. 
            Al sumar ambos valores, el resultado es exactamente el <strong>100%</strong> de la "bolsa" de votos aún no procesados.
          </p>
          <p className="p-3 bg-slate-50 border-l-4 border-primary/30 text-xs text-muted-foreground rounded-r-md">
            <strong>Nota Histórica:</strong> La clasificación de departamentos como "Izquierda" o "Derecha" se basa en los resultados oficiales de la <strong>Segunda Vuelta Presidencial 2021</strong> (Pedro Castillo vs. Keiko Fujimori), identificando la tendencia predominante de voto en cada región.
          </p>
          <p>
            Dado que la ONPE no publica el padrón total regional en esta vista, realizamos ingeniería inversa deduciendo las actas absolutas esperadas usando regla de tres <em>(Contabilizadas / Porcentaje)</em> para obtener valores reales de votos pendientes, en lugar de promediar mal los porcentajes crudos.
          </p>
        </div>
      </div>
    </div>
  );
}
