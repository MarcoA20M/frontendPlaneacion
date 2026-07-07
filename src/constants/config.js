// src/constants/config.js

// ========== IMPORT ==========
import { operarioService } from '../services/operarioService';

// ========== URLS ==========
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
export const BACKEND_API_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080/api";

// ========== CÓDIGOS EXCLUIDOS ==========
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

export const CODIGOS_EXCLUIDOS = getCodigosExcluidos();

export const isCodigoExcluido = (codigo) => {
  const excluidos = getCodigosExcluidos();
  return excluidos.includes(codigo.toString().toUpperCase());
};

// ========== LITROS ==========
export const litrosPorEnvasado = (id) => {
    const idNum = Number(id);
    
    if (idNum === 19) return 19;
    if (idNum === 18) return 18;
    if (idNum === 4) return 4;
    if (idNum === 1) return 1;
    if (idNum === 0.75 || idNum === 750) return 0.75;
    if (idNum === 0.5 || idNum === 500) return 0.5;
    if (idNum === 0.25 || idNum === 250) return 0.25;
    if (idNum === 378) return 3.78;
    if (idNum === 946) return 0.946;
    if (idNum === 1000) return 1.0;
    
    if (idNum >= 100) return idNum / 1000;
    return idNum;
};

export const litrosATexto = (l) => {
  if (l === 0.25) return "1/4 L";
  if (l === 0.5) return "1/2 L";
  if (l === 0.75) return "3/4 L";
  if (l === 1) return "1 L";
  return `${l} L`;
};

// ============================================================
// 🔴 CACHE DE OPERARIOS (SINCRÓNICO)
// ============================================================
let operariosCache = null;
let ultimaActualizacionCache = null;
const TIEMPO_CACHE = 30000; // 30 segundos

// 🔴 Función para obtener operarios del cache o localStorage (SINCRÓNICA)
const obtenerOperariosCache = () => {
    try {
        // Si el cache es válido, usarlo
        if (operariosCache && ultimaActualizacionCache && 
            (Date.now() - ultimaActualizacionCache) < TIEMPO_CACHE) {
            return operariosCache;
        }
        
        // Intentar del localStorage
        const guardado = localStorage.getItem("operarios_vinilica");
        if (guardado) {
            const data = JSON.parse(guardado);
            if (data && Object.keys(data).length > 0) {
                operariosCache = data;
                ultimaActualizacionCache = Date.now();
                return data;
            }
        }
    } catch (error) {
        console.error("Error obteniendo operarios cache:", error);
    }
    return null;
};

// ============================================================
// 🔴 VERSIÓN SINCRÓNICA DE getOperarioPorMaquina (PARA PDF)
// ============================================================
export const getOperarioPorMaquinaSync = (idMaquina) => {
    const maquinaId = typeof idMaquina === 'string' ? parseInt(idMaquina) : idMaquina;
    
    // Fallbacks estáticos
    const fallbacks = {
        101: 'Isaac',
        102: 'Juan',
        103: 'Pedro',
        104: 'Luis',
        105: 'Carlos',
        106: 'Javier',
        107: 'Miguel',
        108: 'Roberto'
    };
    
    try {
        // Intentar obtener del cache
        const cache = obtenerOperariosCache();
        if (cache && cache[maquinaId]) {
            const operario = cache[maquinaId];
            if (typeof operario === 'object' && operario !== null) {
                return operario.nombre || operario.name || fallbacks[maquinaId] || 'Sin asignar';
            }
            return String(operario || fallbacks[maquinaId] || 'Sin asignar');
        }
        
        // Fallback estático
        return fallbacks[maquinaId] || 'Sin asignar';
    } catch (error) {
        console.error('❌ Error en getOperarioPorMaquinaSync:', error);
        return fallbacks[maquinaId] || 'Sin asignar';
    }
};

// ============================================================
// 🔴 VERSIÓN ASYNC ORIGINAL (MANTENER PARA OTROS USOS)
// ============================================================
export const getOperarioPorMaquina = async (idMaquina, fechaRef = new Date(), usarRotacion = true) => {
  const maquinaId = typeof idMaquina === 'string' ? parseInt(idMaquina) : idMaquina;
  
  const grupos = {
    101: "grupo0", 102: "grupo0",
    103: "grupo1", 104: "grupo1",
    105: "grupo2", 106: "grupo2",
    107: "grupo3", 108: "grupo3"
  };

  const grupoId = grupos[maquinaId];
  if (!grupoId) return "Operario V";

  try {
    console.log(`🔄 Obteniendo operario para máquina ${maquinaId} en fecha ${fechaRef.toISOString().split('T')[0]}`);
    
    const rotacion = await operarioService.getRotacion(fechaRef);
    const operario = rotacion[maquinaId];
    
    // Actualizar cache
    if (operario) {
        try {
            const cache = obtenerOperariosCache() || {};
            cache[maquinaId] = operario;
            operariosCache = cache;
            ultimaActualizacionCache = Date.now();
            localStorage.setItem("operarios_vinilica", JSON.stringify(cache));
        } catch (e) { /* ignorar */ }
    }
    
    return operario || "Desconocido";
    
  } catch (error) {
    console.error('❌ Error obteniendo operario:', error);
    // Fallback a versión sincrónica
    return getOperarioPorMaquinaSync(maquinaId);
  }
};

// ============================================================
// 🔴 FUNCIONES ADICIONALES
// ============================================================

export const getConfiguracionRotacionActual = async (fechaRef = new Date()) => {
  try {
    const rotacion = await operarioService.getRotacion(fechaRef);
    return rotacion;
  } catch (error) {
    console.error('❌ Error obteniendo rotación completa:', error);
    return {};
  }
};

export const getConfiguracionVinilica = async () => {
  try {
    const config = await operarioService.getConfiguracionVinilica();
    return config;
  } catch (error) {
    console.error('❌ Error obteniendo configuración vinílica:', error);
    return null;
  }
};

export const getOperariosVinilica = async () => {
  try {
    const operarios = await operarioService.getVinilica();
    return operarios;
  } catch (error) {
    console.error('❌ Error obteniendo operarios vinílica:', error);
    return [];
  }
};