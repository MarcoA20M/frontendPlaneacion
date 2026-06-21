// services/inventarioService.js
export const inventarioService = {
  analizarBajoInventario: async (file) => {
    console.log('🔵 === INICIO analizarBajoInventario ===');
    console.log('🔵 Archivo recibido:', file?.name);
    console.log('🔵 Tamaño del archivo:', file?.size);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const url = "http://localhost:5000/analizar-inventario";
      console.log('🔵 Enviando petición a:', url);
      
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      console.log('🔵 Status de respuesta:', response.status);
      console.log('🔵 Response ok?', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', errorText);
        throw new Error(`Error en el servidor de análisis: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Datos recibidos:', data);
      console.log('✅ Alertas:', data.alertas?.length || 0);
      console.log('✅ Revisar:', data.revisar?.length || 0);
      
      return data;
    } catch (error) {
      console.error("❌ Error microservicio Python:", error);
      console.error("❌ Detalles del error:", error.message);
      throw error;
    }
  }
};