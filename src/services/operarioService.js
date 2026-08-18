// src/services/operarioService.js
import axios from 'axios';

const API_URL = "https://pintuplaneacion-backend.onrender.com/api/operarios";

// ========== CLAVE PARA LÍMITES EN LOCALSTORAGE ==========
const LIMITES_STORAGE_KEY = 'limites_rondas_operarios';

export const operarioService = {
  // ========== VINÍLICA ==========
  getVinilica: async () => {
    const response = await axios.get(`${API_URL}/vinilica`);
    return response.data;
  },
  
  getConfiguracionVinilica: async () => {
    const response = await axios.get(`${API_URL}/vinilica/configuracion`);
    return response.data;
  },
  
  rotar: async (semanas) => {
    const response = await axios.get(`${API_URL}/vinilica/rotar`, {
      params: { semanas }
    });
    return response.data;
  },
  
  getBase: async () => {
    const response = await axios.get(`${API_URL}/vinilica/base`);
    return response.data;
  },
  
  getRotacionPorSemanas: async (semanas, sinRotacion = false) => {
    return operarioService.rotar(semanas);
  },
  
  getRotacion: async (fecha) => {
    return operarioService.getBase();
  },
  
  reordenarVinilica: async (ids) => {
    const response = await axios.put(`${API_URL}/vinilica/reordenar`, ids, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  // ========== LÍMITE DE RONDAS (LOCALSTORAGE) ==========
  
  // Guardar límite de rondas para un operario
  guardarLimiteRondas: (operarioId, limiteRondas) => {
    try {
      const limites = operarioService.obtenerTodosLosLimites();
      const limiteFinal = Math.max(0, Math.min(6, parseInt(limiteRondas) || 2));
      limites[operarioId] = {
        limite: limiteFinal,
        actualizado: new Date().toISOString()
      };
      localStorage.setItem(LIMITES_STORAGE_KEY, JSON.stringify(limites));
      return limites[operarioId];
    } catch (error) {
      console.error('Error guardando límite de rondas:', error);
      return null;
    }
  },

  // Obtener todos los límites guardados
  obtenerTodosLosLimites: () => {
    try {
      const data = localStorage.getItem(LIMITES_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error obteniendo límites:', error);
      return {};
    }
  },

  // Obtener límite de un operario específico
  obtenerLimiteRondas: (operarioId) => {
    const limites = operarioService.obtenerTodosLosLimites();
    return limites[operarioId]?.limite || 2;
  },

  // Eliminar límite de un operario
  eliminarLimiteRondas: (operarioId) => {
    try {
      const limites = operarioService.obtenerTodosLosLimites();
      delete limites[operarioId];
      localStorage.setItem(LIMITES_STORAGE_KEY, JSON.stringify(limites));
      return true;
    } catch (error) {
      console.error('Error eliminando límite:', error);
      return false;
    }
  },

  // Obtener límites para todos los operarios de una lista
  obtenerLimitesParaOperarios: (operarioIds) => {
    const limites = operarioService.obtenerTodosLosLimites();
    const resultado = {};
    operarioIds.forEach(id => {
      resultado[id] = limites[id]?.limite || 2;
    });
    return resultado;
  },

  // ========== ESMALTES ==========
  getEsmaltes: async () => {
    const response = await axios.get(`${API_URL}/esmaltes`);
    return response.data;
  },
  
  getEsmaltesByPuesto: async (puesto) => {
    const response = await axios.get(`${API_URL}/esmaltes/puesto/${puesto}`);
    return response.data;
  },
  
  getAll: async () => {
    const response = await axios.get(`${API_URL}`);
    return response.data;
  },
  
  // ========== ESPECIALES ==========
  getEspeciales: async () => {
    const response = await axios.get(`${API_URL}/especiales`);
    return response.data;
  },
  
  // ========== VACACIONES ==========
  getVacaciones: async () => {
    const response = await axios.get(`${API_URL}/vacaciones`);
    return response.data;
  },

  crearVacacion: async (vacacion) => {
    const response = await axios.post(`${API_URL}/vacaciones`, vacacion);
    return response.data;
  },

  eliminarVacacion: async (id) => {
    await axios.delete(`${API_URL}/vacaciones/${id}`);
  },
  
  // ========== CRUD ==========
  crear: async (operario) => {
    const response = await axios.post(API_URL, operario);
    return response.data;
  },
  
  actualizar: async (id, operario) => {
    const response = await axios.put(`${API_URL}/${id}`, operario);
    return response.data;
  },
  
  eliminar: async (id) => {
    await axios.delete(`${API_URL}/${id}`);
  },
  
  toggleActivo: async (id) => {
    const response = await axios.patch(`${API_URL}/${id}/toggle`);
    return response.data;
  }
};

export default operarioService;




