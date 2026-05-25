export const tableroUtils = {
  // Sincroniza datos de Excel con lo que hay actualmente en el tablero
  sincronizarConTablero(datosExcel, rondas, esmaltes, especiales, fecha, getOperario) {
    return datosExcel.map(item => {
      let maq = "NO ASIGNADA";
      let ope = "PENDIENTE";
      const folioBusqueda = String(item.folio).trim().toUpperCase();

      // Buscar en Vinílicas
      rondas.forEach((fila, fIdx) => {
        fila.forEach(celda => {
          if (!celda) return;
          const celdas = Array.isArray(celda) ? celda : [celda];
          if (celdas.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda)) {
            maq = `VI-${101 + fIdx}`;
            ope = getOperario(101 + fIdx, fecha);
          }
        });
      });

      // Buscar en Esmaltes
      if (esmaltes.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda)) {
        const match = esmaltes.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
        maq = "ESM"; ope = match.operario;
      }

      // Buscar en Especiales
      if (especiales.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda)) {
        maq = "ESPECIAL"; ope = "LÁZARO";
      }

      return { ...item, maquina: maq, operario: ope };
    });
  },

  // Prepara la lista plana para el reporte final
  prepararDatosReporte(rondas, esmaltes, especiales, tipo, fecha, getOperario) {
    const finales = [];
    rondas.forEach((fila, fIdx) => {
      const op = getOperario(101 + fIdx, fecha);
      fila.forEach(celda => {
        if (!celda) return;
        const celdas = Array.isArray(celda) ? celda : [celda];
        celdas.forEach(c => finales.push({ ...c, maquina: `VI-${101 + fIdx}`, operario: op }));
      });
    });
    esmaltes.forEach(c => finales.push({ ...c, maquina: "ESM", operario: c.operario || "Esmaltador" }));
    especiales.filter(c => c.tipo === tipo).forEach(esp => finales.push({ ...esp, maquina: "ESPECIAL", operario: "Lázaro" }));
    return finales;
  }
};