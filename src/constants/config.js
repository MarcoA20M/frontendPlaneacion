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
// 🔴 CACHE DE OPERARIOS (CON MECANISMO DE FORZADO)
// ============================================================
let operariosCache = null;
let ultimaActualizacionCache = null;
const TIEMPO_CACHE = 30000; // 30 segundos

// Forzar actualización del cache
let forzarActualizacion = false;

export const forzarRecargaOperarios = () => {
    forzarActualizacion = true;
    operariosCache = null;
    ultimaActualizacionCache = null;
    localStorage.removeItem("operarios_vinilica");
    console.log('🔄 Cache de operarios forzado a recargar');
};

// Función para obtener operarios del cache o localStorage
const obtenerOperariosCache = () => {
    try {
        // Si forzamos actualización, ignorar cache
        if (forzarActualizacion) {
            forzarActualizacion = false;
            return null;
        }
        
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
// 🔴 VERSIÓN MEJORADA DE getOperarioPorMaquinaSync (SIN FALLBACKS ESTÁTICOS)
// ============================================================
export const getOperarioPorMaquinaSync = (idMaquina) => {
    const maquinaId = typeof idMaquina === 'string' ? parseInt(idMaquina) : idMaquina;
    
    try {
        // Intentar obtener del cache
        const cache = obtenerOperariosCache();
        if (cache && cache[maquinaId]) {
            const operario = cache[maquinaId];
            if (typeof operario === 'object' && operario !== null) {
                return operario.nombre || operario.name || 'Sin asignar';
            }
            return String(operario || 'Sin asignar');
        }
        
        // ✅ AHORA: Si no hay cache, mostrar "Cargando..." en lugar de fallbacks estáticos
        return 'Cargando...';
        
    } catch (error) {
        console.error('❌ Error en getOperarioPorMaquinaSync:', error);
        return 'Error';
    }
};

// ============================================================
// 🔴 VERSIÓN MEJORADA DE getOperarioPorMaquina (CON LOGS DETALLADOS)
// ============================================================
export const getOperarioPorMaquina = async (idMaquina, fechaRef = new Date(), usarRotacion = true) => {
  const maquinaId = typeof idMaquina === 'string' ? parseInt(idMaquina) : idMaquina;
  
  // Mapeo de máquinas a grupos
  const grupos = {
    101: "grupo0", 102: "grupo0",
    103: "grupo1", 104: "grupo1",
    105: "grupo2", 106: "grupo2",
    107: "grupo3", 108: "grupo3"
  };

  const grupoId = grupos[maquinaId];
  if (!grupoId) {
    console.warn(`⚠️ Máquina ${maquinaId} no tiene grupo asignado`);
    return "Operario V";
  }

  try {
    const fechaStr = fechaRef.toISOString().split('T')[0];
    console.log(`🔄 Buscando operario para máquina ${maquinaId} (grupo ${grupoId}) en fecha ${fechaStr}`);
    
    // Obtener rotación completa
    const rotacion = await operarioService.getRotacion(fechaRef);
    console.log('📊 Rotación completa recibida:', rotacion);
    
    // Buscar el operario específico
    const operario = rotacion[maquinaId];
    console.log(`🎯 Operario encontrado para máquina ${maquinaId}:`, operario);
    
    // Actualizar cache con el resultado
    if (operario) {
        try {
            const cache = obtenerOperariosCache() || {};
            cache[maquinaId] = operario;
            operariosCache = cache;
            ultimaActualizacionCache = Date.now();
            localStorage.setItem("operarios_vinilica", JSON.stringify(cache));
            console.log(`💾 Cache actualizado para máquina ${maquinaId}: ${operario}`);
        } catch (e) { 
            console.warn('⚠️ Error guardando en cache:', e);
        }
        return operario;
    }
    
    // Si no hay operario, buscar por grupo
    if (rotacion && typeof rotacion === 'object') {
        // Buscar en el grupo correspondiente
        for (const [key, value] of Object.entries(rotacion)) {
            const keyNum = parseInt(key);
            if (grupos[keyNum] === grupoId) {
                console.log(`🔍 Encontrado operario ${value} en máquina ${keyNum} del mismo grupo ${grupoId}`);
                // Guardar en cache
                const cache = obtenerOperariosCache() || {};
                cache[maquinaId] = value;
                operariosCache = cache;
                ultimaActualizacionCache = Date.now();
                localStorage.setItem("operarios_vinilica", JSON.stringify(cache));
                return value;
            }
        }
    }
    
    // Si llegamos aquí, no se encontró operario
    console.warn(`⚠️ No se encontró operario para máquina ${maquinaId}`);
    return "Sin asignar";
    
  } catch (error) {
    console.error('❌ Error obteniendo operario:', error);
    // Intentar obtener del cache como último recurso
    const cache = obtenerOperariosCache();
    if (cache && cache[maquinaId]) {
        console.log(`🔄 Usando cache para máquina ${maquinaId}: ${cache[maquinaId]}`);
        return cache[maquinaId];
    }
    return "Error";
  }
};

// ============================================================
// 🔴 FUNCIONES ADICIONALES MEJORADAS
// ============================================================

export const getConfiguracionRotacionActual = async (fechaRef = new Date()) => {
  try {
    const rotacion = await operarioService.getRotacion(fechaRef);
    console.log('📊 Configuración de rotación actual:', rotacion);
    return rotacion;
  } catch (error) {
    console.error('❌ Error obteniendo rotación completa:', error);
    return {};
  }
};

export const getConfiguracionVinilica = async () => {
  try {
    const config = await operarioService.getConfiguracionVinilica();
    console.log('⚙️ Configuración vinílica:', config);
    return config;
  } catch (error) {
    console.error('❌ Error obteniendo configuración vinílica:', error);
    return null;
  }
};

export const getOperariosVinilica = async () => {
  try {
    const operarios = await operarioService.getVinilica();
    console.log('👥 Operarios vinílica:', operarios);
    return operarios;
  } catch (error) {
    console.error('❌ Error obteniendo operarios vinílica:', error);
    return [];
  }
};

// ============================================================
// 🔴 FUNCIÓN PARA VALIDAR Y REPARAR EL CACHE
// ============================================================
export const validarYRepararCache = () => {
    try {
        const guardado = localStorage.getItem("operarios_vinilica");
        if (guardado) {
            const data = JSON.parse(guardado);
            if (data && Object.keys(data).length > 0) {
                console.log('✅ Cache válido:', data);
                operariosCache = data;
                ultimaActualizacionCache = Date.now();
                return true;
            }
        }
        console.warn('⚠️ Cache inválido o vacío, forzando recarga');
        forzarRecargaOperarios();
        return false;
    } catch (error) {
        console.error('❌ Error validando cache:', error);
        forzarRecargaOperarios();
        return false;
    }
};