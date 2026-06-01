export const API_URL = "http://localhost:5000";

// Función para obtener la configuración guardada (base)
const getConfiguracionGuardada = () => {
  try {
    const operariosGuardados = localStorage.getItem("operarios_vinilica");
    const gruposBaseGuardados = localStorage.getItem("config_grupos_base_vinilica");
    const semanasRotadasGuardadas = localStorage.getItem("semanas_rotadas_vinilica");
    
    if (operariosGuardados && gruposBaseGuardados) {
      const operarios = JSON.parse(operariosGuardados);
      const gruposBase = JSON.parse(gruposBaseGuardados);
      const semanasRotadas = semanasRotadasGuardadas ? parseInt(semanasRotadasGuardadas) : 0;
      
      return { operarios, gruposBase, semanasRotadas };
    }
  } catch (error) {
    console.error("Error al leer configuración:", error);
  }
  
  // Configuración por defecto
  return {
    operarios: [
      { id: 1, nombre: "Pedro" },
      { id: 2, nombre: "Carlos" },
      { id: 3, nombre: "Yunior" },
      { id: 4, nombre: "Luis" }
    ],
    gruposBase: {
      grupo0: { operarioId: 1, maquinas: [101, 102] },
      grupo1: { operarioId: 2, maquinas: [103, 104] },
      grupo2: { operarioId: 3, maquinas: [105, 106] },
      grupo3: { operarioId: 4, maquinas: [107, 108] }
    },
    semanasRotadas: 0
  };
};

// Función para calcular semanas entre dos fechas
const calcularSemanasDiferencia = (fechaReferencia, fechaAnclaje) => {
  const diferenciaMilis = fechaReferencia - fechaAnclaje;
  return Math.floor(diferenciaMilis / (7 * 24 * 60 * 60 * 1000));
};

export const getCodigosExcluidos = () => {
  try {
    const guardados = localStorage.getItem("codigos_excluidos");
    if (guardados) {
      const codigos = JSON.parse(guardados);
      if (Array.isArray(codigos) && codigos.length > 0) {
        return codigos;
      }
    }
  } catch (error) {
    console.error("Error al leer códigos excluidos:", error);
  }
  
  return [
    "890", "912", "908", "100", "852", "852IF", "802IF", "803", "803IF",
    "812", "812IF", "813", "813IF", "820", "821", "822", "823", "824",
    "825", "826", "853", "853IF", "854IF", "862", "862IF", "863", "863IF",
    "870", "870IF", "900", "902", "904", "906", "910", "914", "916", "918",
    "920", "922", "924"
  ];
};

/**
 * Obtiene el operario asignado a una máquina para una fecha específica
 * AHORA respeta el orden de la tabla (operariosVinilica)
 */
export const getOperarioPorMaquina = (idMaquina, fechaRef = new Date()) => {
  const maquinaId = typeof idMaquina === 'string' ? parseInt(idMaquina) : idMaquina;
  
  // Mapeo de máquinas a su grupo
  const grupos = {
    101: "grupo0", 102: "grupo0",
    103: "grupo1", 104: "grupo1",
    105: "grupo2", 106: "grupo2",
    107: "grupo3", 108: "grupo3"
  };

  const grupoId = grupos[maquinaId];
  if (!grupoId) return "Operario V";

  // Obtener configuración
  const { operarios, gruposBase, semanasRotadas: semanasGuardadas } = getConfiguracionGuardada();
  
  // Obtener el índice del grupo
  const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
  const idxGrupoActual = gruposOrden.indexOf(grupoId);
  
  // 🔴 IMPORTANTE: Usar el orden de la tabla (operarios) como base para la rotación
  // El orden en la tabla determina la asignación base de los grupos
  const asignacionBase = gruposOrden.map((_, idx) => {
    // Si hay un operario en esa posición de la tabla, usarlo
    if (idx < operarios.length) {
      return operarios[idx].id;
    }
    // Si no, usar lo que esté en gruposBase
    return gruposBase[gruposOrden[idx]]?.operarioId || null;
  });
  
  // Calcular semanas rotadas desde la fecha de anclaje
  const fechaAnclaje = new Date(2026, 0, 6);
  const semanasCalculadas = calcularSemanasDiferencia(fechaRef, fechaAnclaje);
  
  // Usar las semanas guardadas si la fecha es "hoy" (o si quieres priorizar el botón)
  // Esto permite que el botón "Rotar Semana" funcione junto con la fecha
  const usarSemanasGuardadas = fechaRef.toDateString() === new Date().toDateString();
  const semanasRotadas = usarSemanasGuardadas ? semanasGuardadas : semanasCalculadas;
  
  console.log(`getOperarioPorMaquina - Máquina: ${maquinaId}, Fecha: ${fechaRef.toLocaleDateString()}, Semanas: ${semanasRotadas}`);
  
  // Aplicar rotación
  const asignacionRotada = [...asignacionBase];
  for (let i = 0; i < semanasRotadas; i++) {
    const ultimo = asignacionRotada.pop();
    asignacionRotada.unshift(ultimo);
  }
  
  const operarioId = asignacionRotada[idxGrupoActual];
  const operario = operarios.find(op => op.id === operarioId);
  
  return operario ? operario.nombre : "Desconocido";
};

/**
 * Obtiene la configuración completa de rotación para una fecha específica
 */
export const getConfiguracionRotacionActual = (fechaRef = new Date()) => {
  const { operarios, gruposBase, semanasRotadas: semanasGuardadas } = getConfiguracionGuardada();
  const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
  
  // Base de asignación desde el orden de la tabla
  const asignacionBase = gruposOrden.map((_, idx) => {
    if (idx < operarios.length) {
      return operarios[idx].id;
    }
    return gruposBase[gruposOrden[idx]]?.operarioId || null;
  });
  
  const fechaAnclaje = new Date(2026, 0, 5);
  const semanasCalculadas = calcularSemanasDiferencia(fechaRef, fechaAnclaje);
  const usarSemanasGuardadas = fechaRef.toDateString() === new Date().toDateString();
  const semanasRotadas = usarSemanasGuardadas ? semanasGuardadas : semanasCalculadas;
  
  // Aplicar rotación
  const asignacionRotada = [...asignacionBase];
  for (let i = 0; i < semanasRotadas; i++) {
    const ultimo = asignacionRotada.pop();
    asignacionRotada.unshift(ultimo);
  }
  
  // Crear mapeo de máquina a operario
  const mapeo = {};
  for (const [maquina, grupoId] of Object.entries({
    101: "grupo0", 102: "grupo0",
    103: "grupo1", 104: "grupo1",
    105: "grupo2", 106: "grupo2",
    107: "grupo3", 108: "grupo3"
  })) {
    const idx = gruposOrden.indexOf(grupoId);
    const operarioId = asignacionRotada[idx];
    const operario = operarios.find(op => op.id === operarioId);
    mapeo[maquina] = operario ? operario.nombre : "Desconocido";
  }
  
  return mapeo;
};

export const CODIGOS_EXCLUIDOS = getCodigosExcluidos();

export const isCodigoExcluido = (codigo) => {
  const excluidos = getCodigosExcluidos();
  return excluidos.includes(codigo.toString().toUpperCase());
};

export const litrosPorEnvasado = (id) => (id >= 100 ? id / 1000 : id);

export const litrosATexto = (l) => {
  if (l === 0.25) return "1/4 L";
  if (l === 0.5) return "1/2 L";
  if (l === 0.75) return "3/4 L";
  if (l === 1) return "1 L";
  return `${l} L`;
};