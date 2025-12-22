const API_BASE_URL = "http://localhost:8080/api/familias";

export const familiaService = {
  /**
   * Obtiene las familias filtradas por tipo (vinilica o esmalte)
   */
  getFamiliasPorTipo: async (tipo) => {
    try {
      // Normalizamos el tipo para la URL (quitar acentos y a minúsculas)
      const tipoUrl = tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const response = await fetch(`${API_BASE_URL}/tipo/${tipoUrl}`);
      
      if (!response.ok) throw new Error("Error al obtener familias");
      
      return await response.json();
    } catch (error) {
      console.error("Error en familiaService:", error);
      return [];
    }
  }
};