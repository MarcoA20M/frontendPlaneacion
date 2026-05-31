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

export const procesarPdfConRondas = async (file, rondas, cargasEspeciales) => {
    const formData = new FormData();
    formData.append("file", file);
    
    // 🔴 Obtener el operario especial activo
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

    // 🔴 Enviar tanto las cargas como el operario especial
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