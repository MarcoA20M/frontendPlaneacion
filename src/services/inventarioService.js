export const inventarioService = {
  analizarBajoInventario: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/analizar-inventario", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error en el servidor de análisis");
      
      return await response.json();
    } catch (error) {
      console.error("Error microservicio Python:", error);
      throw error;
    }
  }
};