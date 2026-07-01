export const bitacoraService = {
  async generarPdf(rondas, fecha, tipo, getOperario, cargasEspeciales = []) {
    // Procesar rondas normales (8 máquinas VI-101 a VI-108)
    const rondasProcesadas = rondas.map(fila => 
      fila.map(celda => {
        if (!celda) return null;
        const items = Array.isArray(celda) ? celda : [celda];
        return items.map(item => ({
          ...item,
          cubriente: item.cubriente || item.producto?.cubriente || ""
        }));
      })
    );

    // 8 operarios (VI-101 a VI-108)
    const listaOperarios = Array.from({ length: 8 }, (_, i) => getOperario(101 + i, fecha));

    // Filtrar cargas especiales del tipo actual
    const especialesFiltradas = cargasEspeciales.filter(c => c.tipo === tipo);

    // Asegurar que las cargas especiales tengan la estructura correcta
    const especialesFormateadas = especialesFiltradas.map(carga => {
      // Si tiene detallesEnvasado, asegurar que sea un array
      if (carga.detallesEnvasado && !Array.isArray(carga.detallesEnvasado)) {
        carga.detallesEnvasado = [carga.detallesEnvasado];
      }
      
      // Si no tiene detallesEnvasado pero tiene envasado, convertirlo
      if (!carga.detallesEnvasado && carga.envasado) {
        const parts = carga.envasado.split('-');
        carga.detallesEnvasado = [{
          formato: parts[0] || '',
          cantidad: parts[1] || ''
        }];
      }
      
      return carga;
    });

    const response = await fetch("http://localhost:5000/generar_bitacora_impresion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rondas: rondasProcesadas,
        operarios: listaOperarios,
        fecha: fecha.toLocaleDateString('es-ES'),
        tipo,
        cargasEspeciales: especialesFormateadas
      })
    });

    if (!response.ok) throw new Error("Error al generar el PDF");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bitacora_${tipo}_${fecha.toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};