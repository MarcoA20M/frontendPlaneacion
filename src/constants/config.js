export const API_URL = "http://localhost:5000";

// Función para obtener la configuración guardada (base)
const getConfiguracionGuardada = () => {
  try {
    const operariosGuardados = localStorage.getItem("operarios_vinilica");
    const gruposBaseGuardados = localStorage.getItem("config_grupos_base_vinilica");
    
    if (operariosGuardados && gruposBaseGuardados) {
      const operarios = JSON.parse(operariosGuardados);
      const gruposBase = JSON.parse(gruposBaseGuardados);
      
      return { operarios, gruposBase };
    }
  } catch (error) {
    console.error("Error al leer configuración:", error);
  }
  
  // Configuración por defecto si no hay nada guardado
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
    }
  };
};

// Función para calcular semanas entre dos fechas
const calcularSemanasDiferencia = (fechaReferencia, fechaAnclaje) => {
  const diferenciaMilis = fechaReferencia - fechaAnclaje;
  return Math.floor(diferenciaMilis / (7 * 24 * 60 * 60 * 1000));
};

// ========== NUEVA FUNCIÓN PARA OBTENER CÓDIGOS EXCLUIDOS DINÁMICOS ==========
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
  
  // Códigos por defecto si no hay nada guardado
  return [
    "890", "912", "908", "100", "852", "852IF", "802IF", "803", "803IF",
    "812", "812IF", "813", "813IF", "820", "821", "822", "823", "824",
    "825", "826", "853", "853IF", "854IF", "862", "862IF", "863", "863IF",
    "870", "870IF", "900", "902", "904", "906", "910", "914", "916", "918",
    "920", "922", "924"
  ];
};

// Función principal - USA LA FECHA QUE RECIBE
export const getOperarioPorMaquina = (idMaquina, fechaRef = new Date()) => {
  // 1. Mapeo de máquinas a su grupo
  const grupos = {
    101: "grupo0", 102: "grupo0",
    103: "grupo1", 104: "grupo1",
    105: "grupo2", 106: "grupo2",
    107: "grupo3", 108: "grupo3"
  };

  const grupoId = grupos[idMaquina];
  if (!grupoId) return "Operario V";

  // Obtener configuración base
  const { operarios, gruposBase } = getConfiguracionGuardada();
  
  // Obtener la asignación base del grupo
  const grupoBase = gruposBase[grupoId];
  if (!grupoBase || !grupoBase.operarioId) return "Sin asignar";
  
  // Orden de los grupos para la rotación
  const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
  const idxGrupoActual = gruposOrden.indexOf(grupoId);
  
  // Obtener semanas rotadas DESDE LA FECHA DE REFERENCIA
  // Fecha anclaje base (Lunes 5 de Enero 2026)
  const fechaAnclaje = new Date(2026, 0, 5);
  const semanasRotadas = calcularSemanasDiferencia(fechaRef, fechaAnclaje);
  
  // Aplicar la rotación según las semanas calculadas
  const asignacionBase = gruposOrden.map(g => gruposBase[g]?.operarioId);
  
  // Aplicar rotación (mover hacia la derecha según semanasRotadas)
  const asignacionRotada = [...asignacionBase];
  for (let i = 0; i < semanasRotadas; i++) {
    // Rotar hacia la derecha (el último pasa al primero)
    const ultimo = asignacionRotada.pop();
    asignacionRotada.unshift(ultimo);
  }
  
  // Obtener el ID del operario para este grupo después de la rotación
  const operarioId = asignacionRotada[idxGrupoActual];
  
  // Buscar el nombre del operario
  const operario = operarios.find(op => op.id === operarioId);
  
  return operario ? operario.nombre : "Desconocido";
};

// Función para obtener la configuración actual (para el ResumenOperarios)
export const getConfiguracionRotacionActual = (fechaRef = new Date()) => {
  const { operarios, gruposBase } = getConfiguracionGuardada();
  const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
  const fechaAnclaje = new Date(2026, 0, 5);
  const semanasRotadas = calcularSemanasDiferencia(fechaRef, fechaAnclaje);
  
  const asignacionBase = gruposOrden.map(g => gruposBase[g]?.operarioId);
  
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

// EXPORTAR LA FUNCIÓN EN VEZ DE LA CONSTANTE
// Esto mantiene compatibilidad con el código existente
export const CODIGOS_EXCLUIDOS = getCodigosExcluidos();

// Función para verificar si un código está excluido (útil para búsquedas)
export const isCodigoExcluido = (codigo) => {
  const excluidos = getCodigosExcluidos();
  return excluidos.includes(codigo.toString().toUpperCase());
};

export const litrosPorEnvasado = (id) => (id >= 100 ? id / 1000 : id);
export const litrosATexto = (l) => (l === 0.25 ? "1/4 L" : l === 0.5 ? "1/2 L" : l === 0.75 ? "3/4 L" : l === 1 ? "1 L" : `${l} L`);