// services/pdfService.js

// 🔴 Función auxiliar para obtener el operario especial activo
const getOperarioEspecialActivo = () => {
    try {
        const guardado = localStorage.getItem("operarios_especiales");
        if (guardado) {
            const operarios = JSON.parse(guardado);
            const activo = operarios.find(op => op.activo === true);
            if (activo) return activo.nombre;
        }
    } catch (error) {
        console.error("Error al obtener operario especial:", error);
    }
    return "Lazaro"; // Valor por defecto
};

// Función existente para vinílica (con rondas)
export const procesarPdfConRondas = async (file, rondas, cargasEspeciales) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const operarioEspecial = getOperarioEspecialActivo();
    
    const todasLasCargas = [];

    rondas.forEach((fila, fIdx) => {
        fila.forEach((celda, cIdx) => {
            if (celda) {
                todasLasCargas.push({
                    folio: celda.folio,
                    ronda: cIdx + 1,
                    maquina: `VI-${101 + fIdx}`,
                    operario: celda.operario || "N/A"
                });
            }
        });
    });

    cargasEspeciales.forEach(esp => {
        todasLasCargas.push({
            folio: esp.folio,
            ronda: "ESP",
            maquina: "ESPECIAL",
            operario: esp.operario || "PENDIENTE"
        });
    });

    formData.append("cargas", JSON.stringify({
        cargas: todasLasCargas,
        operarioEspecial: operarioEspecial
    }));

    const response = await fetch("http://localhost:5000/procesar_pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error("Error al procesar el PDF");
    return await response.blob();
};

// services/pdfService.js
export const procesarPdfEsmaltes = async (file, cargasEsmaltes) => {
    const formData = new FormData();
    formData.append("file", file);
    
    // Enviar todas las cargas con su operario asignado
    const cargasSimples = cargasEsmaltes.map(carga => ({
        folio: carga.folio || carga.lote || carga.numeroLote || '?',
        codigo: carga.codigo || carga.codigoProducto || '?',
        litros: carga.litros || 0,
        operario: carga.operario || 'Área Esmaltes'  // <--- El operario que viene del frontend
    }));
    
    formData.append("cargas", JSON.stringify({
        cargas: cargasSimples
    }));

    const response = await fetch("http://localhost:5000/procesar_pdf_esmaltes", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error("Error al procesar el PDF de esmaltes");
    return await response.blob();
};

