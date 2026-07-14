// src/services/operarioService.js
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/operarios';

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
  
  // ========== ESMALTES ==========
  getEsmaltes: async () => {
    const response = await axios.get(`${API_URL}/esmaltes`);
    return response.data;
  },
  
  getEsmaltesByPuesto: async (puesto) => {
    const response = await axios.get(`${API_URL}/esmaltes/puesto/${puesto}`);
    return response.data;
  },
  
  // Obtener TODOS los operarios
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
  /**
   * Obtener todas las vacaciones
   */
  getVacaciones: async () => {
    try {
      const response = await axios.get(`${API_URL}/vacaciones`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo vacaciones:', error);
      return [];
    }
  },

  /**
   * Obtener vacaciones activas (las que están en curso)
   */
  getVacacionesActivas: async () => {
    try {
      const response = await axios.get(`${API_URL}/vacaciones/activas`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo vacaciones activas:', error);
      return [];
    }
  },

  /**
   * Obtener vacaciones de un operario específico
   */
  getVacacionesByOperario: async (operarioId) => {
    try {
      const response = await axios.get(`${API_URL}/vacaciones/operario/${operarioId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo vacaciones del operario:', error);
      return [];
    }
  },

  /**
   * Crear un nuevo registro de vacaciones
   */
  crearVacacion: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/vacaciones`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando vacación:', error);
      throw error;
    }
  },

  /**
   * Actualizar un registro de vacaciones
   */
  actualizarVacacion: async (id, data) => {
    try {
      const response = await axios.put(`${API_URL}/vacaciones/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando vacación:', error);
      throw error;
    }
  },

  /**
   * Eliminar un registro de vacaciones (soft delete o hard delete según backend)
   */
  eliminarVacacion: async (id) => {
    try {
      await axios.delete(`${API_URL}/vacaciones/${id}`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando vacación:', error);
      throw error;
    }
  },

  /**
   * Cancelar una vacación (marcar como inactiva)
   */
  cancelarVacacion: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/vacaciones/${id}/cancelar`);
      return response.data;
    } catch (error) {
      console.error('❌ Error cancelando vacación:', error);
      throw error;
    }
  },

  /**
   * Verificar si un operario está de vacaciones
   */
  estaEnVacaciones: async (operarioId) => {
    try {
      const response = await axios.get(`${API_URL}/vacaciones/verificar/${operarioId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error verificando vacaciones:', error);
      return { enVacaciones: false };
    }
  },

  // ========== CRUD GENERAL ==========
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