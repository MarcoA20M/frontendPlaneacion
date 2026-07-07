// services/bitacoraService.js - VERSIÓN CORREGIDA

export const bitacoraService = {
  async generarPdf(rondas, fecha, tipo, getOperario, cargasEspeciales = []) {
    // ============================================================
    // 🔴 1. OBTENER OPERARIOS - RESOLVIENDO PROMESAS
    // ============================================================
    
    // 8 operarios (VI-101 a VI-108)
    const listaOperarios = [];
    
    for (let i = 0; i < 8; i++) {
      const numMaquina = 101 + i;
      try {
        let operario = getOperario(numMaquina, fecha);
        
        // 🔴 Si es una Promise, esperar a que resuelva
        if (operario && typeof operario.then === 'function') {
          operario = await operario;
        }
        
        // 🔴 Si es un objeto, extraer el nombre
        if (typeof operario === 'object' && operario !== null) {
          operario = operario.nombre || operario.name || operario.Nombre || operario.Name || 'Sin asignar';
        }
        
        listaOperarios.push(String(operario || 'Sin asignar'));
      } catch (error) {
        console.error(`❌ Error obteniendo operario para máquina ${numMaquina}:`, error);
        listaOperarios.push('Sin asignar');
      }
    }
    
    console.log('📋 Operarios para bitácora:', listaOperarios);

    // ============================================================
    // 🔴 2. PROCESAR RONDAS
    // ============================================================
    
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

    // ============================================================
    // 🔴 3. FILTRAR CARGAS ESPECIALES
    // ============================================================
    
    const especialesFiltradas = cargasEspeciales.filter(c => c.tipo === tipo);

    const especialesFormateadas = especialesFiltradas.map(carga => {
      if (carga.detallesEnvasado && !Array.isArray(carga.detallesEnvasado)) {
        carga.detallesEnvasado = [carga.detallesEnvasado];
      }
      
      if (!carga.detallesEnvasado && carga.envasado) {
        const parts = carga.envasado.split('-');
        carga.detallesEnvasado = [{
          formato: parts[0] || '',
          cantidad: parts[1] || ''
        }];
      }
      
      return carga;
    });

    // ============================================================
    // 🔴 4. ENVIAR AL BACKEND
    // ============================================================

    const response = await fetch("http://localhost:5000/generar_bitacora_impresion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rondas: rondasProcesadas,
        operarios: listaOperarios,  // 🔴 Ahora es una lista de strings
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