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
export const litrosPorEnvasado = (id) => (id >= 100 ? id / 1000 : id);

export const litrosATexto = (l) => {
  if (l === 0.25) return "1/4 L";
  if (l === 0.5) return "1/2 L";
  if (l === 0.75) return "3/4 L";
  if (l === 1) return "1 L";
  return `${l} L`;
};

// ========== 🔴 ROTACIÓN VINÍLICA (USANDO operarioService) ==========

/**
 * Obtiene el operario asignado a una máquina para una fecha específica
 * SIEMPRE va al backend, NO usa cache
 */
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
    // Obtener rotación desde el backend usando el servicio
    console.log(`🔄 Obteniendo operario para máquina ${maquinaId} en fecha ${fechaRef.toISOString().split('T')[0]}`);
    
    const rotacion = await operarioService.getRotacion(fechaRef);
    
    // Buscar el operario para esta máquina
    const operario = rotacion[maquinaId];
    return operario || "Desconocido";
    
  } catch (error) {
    console.error('❌ Error obteniendo operario:', error);
    return "Error";
  }
};

/**
 * Obtiene la configuración completa de rotación para todas las máquinas
 */
export const getConfiguracionRotacionActual = async (fechaRef = new Date()) => {
  try {
    const rotacion = await operarioService.getRotacion(fechaRef);
    return rotacion;
  } catch (error) {
    console.error('❌ Error obteniendo rotación completa:', error);
    return {};
  }
};

/**
 * Obtiene la configuración base de vinílica (operarios + grupos)
 */
export const getConfiguracionVinilica = async () => {
  try {
    const config = await operarioService.getConfiguracionVinilica();
    return config;
  } catch (error) {
    console.error('❌ Error obteniendo configuración vinílica:', error);
    return null;
  }
};

/**
 * Obtiene la lista de operarios de vinílica en orden
 */
export const getOperariosVinilica = async () => {
  try {
    const operarios = await operarioService.getVinilica();
    return operarios;
  } catch (error) {
    console.error('❌ Error obteniendo operarios vinílica:', error);
    return [];
  }
};