export const API_URL = "http://localhost:5000";

// Ahora son 4 operarios en la lista
const OPERARIOS_ROTATIVOS = ["Carlos", "Luis", "Pedro", "Yunior"];

export const getOperarioPorMaquina = (idMaquina, fechaRef = new Date()) => {
  
  // 1. Mapeo de máquinas a su índice base (ahora tenemos 4 grupos)
  const grupos = {
    101: 0, 102: 0, // Grupo 0
    103: 1, 104: 1, // Grupo 1
    105: 2, 106: 2, // Grupo 2
    107: 3, 108: 3  // Grupo 3 (Yunior entra aquí como base)
  };

  const indiceBase = grupos[idMaquina];
  if (indiceBase === undefined) return "Operario V";

  // 2. ANCLAJE: Lunes 5 de Enero 2026
  const fechaAnclaje = new Date(2026, 0, 5); 
  
  // Calculamos semanas transcurridas
  const diferenciaMilis = fechaRef - fechaAnclaje;
  const semanasTranscurridas = Math.floor(diferenciaMilis / (7 * 24 * 60 * 60 * 1000));

  /**
   * 3. Lógica de Rotación para 4 personas:
   * (IndiceBase - Semanas) % 4
   * Esto hace que el operario de la posición 3 suba a la 2, el de la 2 a la 1, etc.
   */
  const numOperarios = OPERARIOS_ROTATIVOS.length;
  const finalIdx = (indiceBase - semanasTranscurridas) % numOperarios;
  
  // Asegurar que el resultado sea un índice positivo dentro del array
  const resultadoPositivo = finalIdx < 0 ? finalIdx + numOperarios : finalIdx;

  return OPERARIOS_ROTATIVOS[resultadoPositivo];
};

export const CODIGOS_EXCLUIDOS = [
  "890", "912", "908", "100", "852", "852IF", "802IF", "803", "803IF", 
  "812", "812IF", "813", "813IF", "820", "821", "822", "823", "824",
  "825", "826", "853", "853IF", "854IF", "862", "862IF", "863", "863IF",
  "870","870IF", "900", "902", "904", "906", "910", "914", "916", "918", "920", "922", "924"
];

export const litrosPorEnvasado = (id) => (id >= 100 ? id / 1000 : id);
export const litrosATexto = (l) => (l === 0.25 ? "1/4 L" : l === 0.5 ? "1/2 L" : l === 0.75 ? "3/4 L" : l === 1 ? "1 L" : `${l} L`);