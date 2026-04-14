const BASE = "/api-onpe/presentacion-backend";
const ONPE_ASSETS = "https://resultadoelectoral.onpe.gob.pe/assets/img-reales";

// Color palette for parties - mapped by position for visual variety
const PARTY_COLORS = [
  "#DC2626", // red
  "#F59E0B", // amber
  "#F97316", // orange
  "#0369A1", // sky
  "#1E3A5F", // navy
  "#B91C1C", // dark red
  "#059669", // emerald
  "#7C3AED", // violet
  "#2563EB", // blue
  "#10B981", // green
  "#6366F1", // indigo
  "#EC4899", // pink
  "#14B8A6", // teal
  "#8B5CF6", // purple
  "#EF4444", // red-500
  "#D97706", // amber-600
  "#0284C7", // sky-600
  "#4F46E5", // indigo-600
  "#DB2777", // pink-600
  "#0D9488", // teal-600
];

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
      color: PARTY_COLORS[index % PARTY_COLORS.length],
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
