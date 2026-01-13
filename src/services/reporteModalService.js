
export const reporteModalService = {
  
  generarReporte: async (cargasVisibles, formato, filtroMarca) => {
    try {
      const response = await fetch('http://localhost:5000/generar-reporte-modal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cargas: cargasVisibles,
          formato: formato, // 'excel' o 'pdf'
          familia: filtroMarca
        })
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      // Procesar la respuesta como blob (archivo binario)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Crear link temporal para forzar la descarga
      const link = document.createElement('a');
      link.href = url;
      
      // Definir extensión según el formato
      const extension = formato === 'excel' ? 'xlsx' : 'pdf';
      link.download = `Reporte_${filtroMarca}_${new Date().getTime()}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      
      // Limpieza
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error("Error en reporteModalService:", error);
      return { success: false, error: error.message };
    }
  }
};