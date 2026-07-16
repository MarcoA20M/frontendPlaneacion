import API_URL from "../config/api";

const API_BASE_URL = `${API_URL}/familias`;

export const familiaService = {
  /**
   * Obtiene las familias filtradas por tipo (vinilica o esmalte)
   */
  getFamiliasPorTipo: async (tipo) => {
    try {
      const tipoUrl = tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const response = await fetch(`${API_BASE_URL}/tipo/${tipoUrl}`);
      
      if (!response.ok) throw new Error("Error al obtener familias");
      
      return await response.json();
    } catch (error) {
      console.error("Error en familiaService:", error);
      return [];
    }
  },

  /**
   * Obtener todas las familias
   */
  getAllFamilias: async () => {
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error("Error al obtener familias");
      return await response.json();
    } catch (error) {
      console.error("Error en getAllFamilias:", error);
      return [];
    }
  },

  /**
   * Obtener una familia por ID
   */
  getFamiliaById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Error en getFamiliaById:", error);
      return null;
    }
  },

  /**
   * Crear una nueva familia
   */
  crearFamilia: async (datos) => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear la familia");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error en crearFamilia:", error);
      throw error;
    }
  },

  /**
   * Actualizar nombre de una familia
   */
  actualizarFamilia: async (id, datos) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error en actualizarFamilia:", error);
      throw error;
    }
  },

  /**
   * Subir imagen para una familia
   */
  subirImagen: async (id, archivo) => {
    try {
      const formData = new FormData();
      formData.append('imagen', archivo);
      
      const response = await fetch(`${API_BASE_URL}/${id}/imagen`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al subir imagen");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error en subirImagen:", error);
      throw error;
    }
  },

  /**
   * Obtener URL de la imagen (para usar en el src del img)
   */
  getImagenUrl: (id) => {
    return `${API_BASE_URL}/${id}/imagen?t=${Date.now()}`; // timestamp para evitar caché
  },

  /**
   * Eliminar imagen de una familia
   */
  eliminarImagen: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}/imagen`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error("Error al eliminar imagen");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error en eliminarImagen:", error);
      throw error;
    }
  },

  /**
   * Eliminar familia completa
   */
  eliminarFamilia: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error("Error al eliminar familia");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Error en eliminarFamilia:", error);
      throw error;
    }
  }
};