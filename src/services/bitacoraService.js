export const bitacoraService = {
  async generarPdf(rondas, fecha, tipo, getOperario) {
    // Formatear datos para el servidor
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

    const listaOperarios = Array.from({ length: 8 }, (_, i) => getOperario(101 + i, fecha));

    const response = await fetch("http://localhost:5000/generar_bitacora_impresion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rondas: rondasProcesadas,
        operarios: listaOperarios,
        fecha: fecha.toLocaleDateString('es-ES'),
        tipo
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