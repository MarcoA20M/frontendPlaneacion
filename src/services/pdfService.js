import axios from 'axios';

export const subrayarPDF = async (archivoPDF, rondas) => {
  // 1. Aplanamos las rondas para enviar una lista simple de cargas con su info de maquina/ronda
  const cargasPlanificadas = [];
  rondas.forEach((fila, fIdx) => {
    fila.forEach((celda, cIdx) => {
      if (celda) {
        cargasPlanificadas.push({
          folio: celda.codigoProducto, // O celda.folio si tienes el campo folio
          ronda: cIdx + 1,
          maquina: `VI-${101 + fIdx}`,
          operario: celda.operario || "Asignado"
        });
      }
    });
  });

  const formData = new FormData();
  formData.append('file', archivoPDF);
  formData.append('cargas', JSON.stringify(cargasPlanificadas));

  try {
    const response = await axios.post('http://localhost:5003/procesar_pdf', formData, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Ordenes_Subrayadas.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("Error al procesar PDF:", error);
    alert("Error al subrayar el PDF. Asegúrate de que el servidor de subrayado esté activo.");
  }
};