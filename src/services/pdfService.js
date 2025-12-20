export const procesarPdfConRondas = async (file, rondas, cargasEspeciales) => {
    const formData = new FormData();
    formData.append("file", file);
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

    formData.append("cargas", JSON.stringify(todasLasCargas));

    const response = await fetch("http://localhost:5000/procesar_pdf", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error("Error al procesar el PDF");
    return await response.blob();
};