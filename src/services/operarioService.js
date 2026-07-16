// src/services/operarioService.js
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/operarios`;

export const operarioService = {

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
  
  // 🔴 NUEVO: Obtener TODOS los operarios
  getAll: async () => {
    const response = await axios.get(`${API_URL}`);
    return response.data;
  },
  
  // ========== ESPECIALES ==========
  getEspeciales: async () => {
    const response = await axios.get(`${API_URL}/especiales`);
    return response.data;
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