const BASE = "/api-onpe/presentacion-backend";
const ONPE_ASSETS = "https://resultadoelectoral.onpe.gob.pe/assets/img-reales";

// Diccionario de colores por partido político
const PARTY_COLORS_MAP = {
  "FUERZA POPULAR": "#F97316", // Naranja
  "ALIANZA PARA EL PROGRESO": "#2563EB", // Azul
  "RENOVACION POPULAR": "#0284C7", // Celeste
  "RENOVACIÓN POPULAR": "#0284C7",
  "AVANZA PAIS": "#1D4ED8", // Azul tren
  "AVANZA PAÍS": "#1D4ED8",
  "ACCION POPULAR": "#DC2626", // Rojo/Lampa
  "ACCIÓN POPULAR": "#DC2626",
  "PODEMOS PERU": "#B91C1C", // Rojo
  "PODEMOS PERÚ": "#B91C1C",
  "SOMOS PERU": "#059669", // Verde/Rojo
  "SOMOS PERÚ": "#059669",
  "PARTIDO MORADO": "#7C3AED", // Morado
  "PERU LIBRE": "#DC2626", // Rojo
  "PERÚ LIBRE": "#DC2626",
  "JUNTOS POR EL PERU": "#10B981", // Verde
  "JUNTOS POR EL PERÚ": "#10B981",
  "FREPAP": "#0369A1", // Azul oscuro
  "PARTIDO POLITICO INTEGRIDAD DEMOCRATICA": "#4F46E5",
  "PARTIDO POLÍTICO INTEGRIDAD DEMOCRÁTICA": "#4F46E5",
  "PARTIDO PATRIOTICO DEL PERU": "#7F1D1D",
  "PARTIDO PATRIÓTICO DEL PERÚ": "#7F1D1D",
  "PARTIDO PAIS PARA TODOS": "#0D9488",
  "PARTIDO PAÍS PARA TODOS": "#0D9488",
  "PARTIDO SICREO": "#F59E0B",
  "UNIDAD NACIONAL": "#1E3A8A", // Azul clásico
  "PARTIDO APRISTA PERUANO": "#DC2626", // Rojo estrella
  "NUEVO PERU": "#10B981", // Verde
  "NUEVO PERÚ": "#10B981",
  "PRIMERO LA GENTE": "#EC4899", // Rosa/Magenta
  "PARTIDO DEL BUEN GOBIERNO": "#EAB308", // Amarillo/Rojo
  "BUEN GOBIERNO": "#EAB308"
};

const DEFAULT_COLORS = ["#0284C7", "#059669", "#7C3AED", "#DB2777", "#64748B", "#F59E0B", "#10B981", "#14B8A6"];

export function getPartyColor(partyName) {
  if (!partyName) return "#94A3B8";
  
  const normalized = partyName.toUpperCase().trim();
  
  if (PARTY_COLORS_MAP[normalized]) {
    return PARTY_COLORS_MAP[normalized];
  }

  // Búsqueda parcial por si viene con nombre largo ej "AVANZA PAÍS - PARTIDO DE..."
  for (const [key, color] of Object.entries(PARTY_COLORS_MAP)) {
    if (normalized.includes(key)) {
      return color;
    }
  }

  // Fallback hash predecible para que el mismo partido siempre tenga el mismo color aleatorio
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

/**
 * Get candidate photo URL from DNI
 */
export function getCandidatePhotoUrl(dni) {
  return `${ONPE_ASSETS}/candidatos/${dni}.jpg`;
}

/**
 * Get party logo URL from party code
 */
export function getPartyLogoUrl(partyCode) {
  return `${ONPE_ASSETS}/partidos/${partyCode}.jpg`;
}

/**
 * Fetch presidential candidates with vote data
 */
export async function fetchCandidates() {
  const res = await fetch(
    `${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?idEleccion=10&tipoFiltro=eleccion`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();

  const items = data.data || data;

  // Filter out non-candidate entries (like blank/null votes which have no DNI)
  const candidates = items
    .filter((item) => item.dniCandidato && item.dniCandidato.trim() !== "")
    .map((item, index) => ({
      id: index + 1,
      name: item.nombreCandidato,
      party: item.nombreAgrupacionPolitica,
      partyCode: item.codigoAgrupacionPolitica,
      dni: item.dniCandidato,
      totalVotes: item.totalVotosValidos,
      validVotes: item.porcentajeVotosValidos,
      emittedVotes: item.porcentajeVotosEmitidos,
      photoUrl: getCandidatePhotoUrl(item.dniCandidato),
      logoUrl: getPartyLogoUrl(item.codigoAgrupacionPolitica),
      color: getPartyColor(item.nombreAgrupacionPolitica),
    }));

  // Sort by valid votes percentage descending
  candidates.sort((a, b) => b.validVotes - a.validVotes);

  return candidates;
}

/**
 * Fetch election totals (actas processed, etc.)
 */
export async function fetchTotals() {
  const res = await fetch(
    `${BASE}/resumen-general/totales?idEleccion=10&tipoFiltro=eleccion`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

/**
 * Fetch heatmap data (actas contabilizadas breakdown by region)
 */
export async function fetchHeatmap() {
  const res = await fetch(
    `${BASE}/resumen-general/mapa-calor?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ambito_geografico`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

/**
 * Fetch departments/ubigeos to map against the heatmap data
 */
export async function fetchUbigeos() {
  const res = await fetch(
    `${BASE}/ubigeos/departamentos?idEleccion=10&idAmbitoGeografico=1`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.data || data;
}
/**
 * Fetch presidential candidates by department (ubigeoNivel1)
 */
export async function fetchCandidatesByDepartment(ubigeoNivel1) {
  // Use the full ubigeo code as provided in heatmapData (ubigeoNivel01)
  const code = ubigeoNivel1.toString();
  
  const res = await fetch(
    `${BASE}/eleccion-presidencial/participantes-ubicacion-geografica-nombre?idEleccion=10&idAmbitoGeografico=1&tipoFiltro=ubigeo_nivel_01&ubigeoNivel1=${code}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  
  const items = data.data || data;
  
  // Return top 5
  return items
    .filter((item) => item.dniCandidato && item.dniCandidato.trim() !== "")
    .slice(0, 5)
    .map((item, index) => ({
       party: item.nombreAgrupacionPolitica,
       percentage: item.porcentajeVotosValidos,
       logoUrl: getPartyLogoUrl(item.codigoAgrupacionPolitica),
       candidateName: item.nombreCandidato
    }));
}

/**
 * Fetch tracking data (historical evolution of percentages)
 */
export async function fetchTracking() {
  const res = await fetch("https://onpe-proxy.renzonunez-af.workers.dev/api/tracking");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.cuts || [];
}
