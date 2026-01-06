export const API_URL = "http://localhost:5000";

// El orden en el que rotan según tu instrucción:
// Esta semana: Carlos (0), Luis (1), Pedro (2)
// Próxima semana: Pedro (el de abajo sube), Carlos, Luis
const OPERARIOS_ROTATIVOS = ["Carlos", "Luis", "Pedro"];

export const getOperarioPorMaquina = (idMaquina, fechaRef = new Date()) => {
  if (idMaquina === 107 || idMaquina === 108) return "Yunior";

  // Mapeo de máquinas a su índice base
  const grupos = {
    101: 0, 102: 0,
    103: 1, 104: 1,
    105: 2, 106: 2
  };

  const indiceBase = grupos[idMaquina];
  if (indiceBase === undefined) return "Operario V";

  // ANCLAJE: Usamos un lunes de referencia (5 de enero de 2026)
  // donde sabemos que el orden es Carlos(0), Luis(1), Pedro(2)
  const fechaAnclaje = new Date(2026, 0, 5); // Lunes 5 de Enero 2026
  const diferenciaMilis = fechaRef - fechaAnclaje;
  const semanasTranscurridas = Math.floor(diferenciaMilis / (7 * 24 * 60 * 60 * 1000));

  /**
   * Lógica: (Indice - Semanas) asegura que el de abajo suba.
   * Usamos +3 para evitar números negativos antes del modulo.
   */
  const indiceRotado = (indiceBase - semanasTranscurridas + (semanasTranscurridas * 3)) % 3;
  
  // Ajuste manual para que el de abajo (Pedro) suba la próxima semana
  const finalIdx = (indiceBase - semanasTranscurridas) % 3;
  const resultadoPositivo = finalIdx < 0 ? finalIdx + 3 : finalIdx;

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