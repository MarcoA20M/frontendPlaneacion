// src/services/operarioService.js
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/operarios';

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
    console.log(`🔄 FRONTEND: Llamando a /vinilica/rotar?semanas=${semanas}`);
    const response = await axios.get(`${API_URL}/vinilica/rotar`, {
      params: { semanas }
    });
    console.log('✅ FRONTEND: Respuesta de rotar:', response.data);
    return response.data;
  },
  
  getBase: async () => {
    console.log(`🔄 FRONTEND: Llamando a /vinilica/base`);
    const response = await axios.get(`${API_URL}/vinilica/base`);
    console.log('✅ FRONTEND: Respuesta de base:', response.data);
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
    console.log('🔄 FRONTEND: Llamando a /esmaltes');
    const response = await axios.get(`${API_URL}/esmaltes`);
    console.log('✅ FRONTEND: Respuesta de getEsmaltes():', response.data);
    return response.data;
  },
  
  getEsmaltesByPuesto: async (puesto) => {
    const response = await axios.get(`${API_URL}/esmaltes/puesto/${puesto}`);
    return response.data;
  },
  
  // 🔴 NUEVO: Obtener TODOS los operarios
  getAll: async () => {
    console.log('🔄 FRONTEND: Llamando a /operarios (todos)');
    const response = await axios.get(`${API_URL}`);
    console.log('✅ FRONTEND: Respuesta de getAll():', response.data);
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