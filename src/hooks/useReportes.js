import { useState } from "react";
import { exportarReporte } from "../services/excelService";
import { procesarPdfConRondas } from "../services/pdfService";
import { getOperarioPorMaquina } from "../constants/config";

export function useReportes(produccion, fechaTrabajo) {
  const [progreso, setProgreso] = useState(0);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [procesandoReporte, setProcesandoReporte] = useState(false);

  const simularProgreso = () => {
    setProgreso(0);
    return setInterval(() => {
      setProgreso((prev) => (prev >= 92 ? prev : prev + Math.floor(Math.random() * 7) + 2));
    }, 250);
  };

  const handlePdfClick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcesandoPdf(true);
    const idIntervalo = simularProgreso();
    try {
      const { tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales } = produccion;
      const tableroAProcesar = tipoPintura === "Vinílica" ? rondas : cargasEsmaltesAsignadas;
      const blob = await procesarPdfConRondas(file, tableroAProcesar, cargasEspeciales.filter(c => c.tipo === tipoPintura));
      setProgreso(100);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_${tipoPintura}_${new Date().getTime()}.pdf`;
      a.click();
    } catch (error) {
      alert("Error en PDF: " + error.message);
    } finally {
      clearInterval(idIntervalo);
      setTimeout(() => { setProcesandoPdf(false); setProgreso(0); }, 600);
      e.target.value = null;
    }
  };

  const handleReporteClick = async () => {
    const { rondas, cargasEsmaltesAsignadas, cargasEspeciales } = produccion;
    const cargasFinales = [];
    
    rondas.forEach((fila, fIdx) => {
      fila.forEach(celda => { 
        if (celda) {
          const idM = 101 + fIdx;
          cargasFinales.push({ ...celda, maquina: `VI-${idM}`, operario: getOperarioPorMaquina(idM, fechaTrabajo) }); 
        }
      });
    });

    cargasEsmaltesAsignadas.forEach(c => cargasFinales.push({ ...c, maquina: "ESM", operario: "Esmaltador" }));
    cargasEspeciales.forEach(esp => cargasFinales.push({ ...esp, maquina: "ESPECIAL", operario: "Lazaro" }));
    
    if (cargasFinales.length === 0) return alert("No hay cargas asignadas.");
    
    setProcesandoReporte(true); 
    const idIntervalo = simularProgreso();
    try {
      await exportarReporte(cargasFinales);
      setProgreso(100);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      clearInterval(idIntervalo);
      setTimeout(() => { setProcesandoReporte(false); setProgreso(0); }, 600);
    }
  };

  return { progreso, procesandoPdf, procesandoReporte, handlePdfClick, handleReporteClick, simularProgreso, setProgreso };
}