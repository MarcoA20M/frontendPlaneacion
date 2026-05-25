// utils/produccionHandlers.js
import { getOperarioPorMaquina } from "../constants/config";
import { planificadorService } from "../services/planificadorService";
import { inventarioService } from "../services/inventarioService";
import { procesarPdfConRondas } from "../services/pdfService";
import { exportarReporte } from "../services/excelService";
import { bitacoraService } from "../services/bitacoraService";
import { tableroUtils } from "../utils/tableroUtils";

export const createProduccionHandlers = (dependencies) => {
    const {
        // Estados y setters del componente
        tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales,
        setRondas, setCargasEsmaltesAsignadas, setCargasEspeciales,
        setAnalizandoStock, setProcesandoPdf, setProcesandoReporte,
        setAlertasInventario, setProgreso, setMenuCargasAbierto,
        setMenuReporteAbierto, setDatosPlanificador, setMostrarModalPlanificador,
        setMostrarModalInventario,
        // Funciones del hook useProduccion
        handleImportExcel, ordenarCargas,
        // Otros estados
        fechaTrabajo
    } = dependencies;

    const simularProgreso = () => {
        setProgreso(0);
        return setInterval(() => setProgreso(p => p >= 92 ? p : p + Math.floor(Math.random() * 7) + 2), 250);
    };

    return {
        // Handler: Cargar planificador
        handleCargarPlanificador: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            setAnalizandoStock(true);
            const idInt = simularProgreso();
            
            try {
                const data = await planificadorService.cargarExcelPlanificador(file);
                setDatosPlanificador(data);
                localStorage.setItem("planificador_data", JSON.stringify(data));
                setProgreso(100);
                setTimeout(() => setMostrarModalPlanificador(true), 500);
            } catch (error) {
                alert("❌ Error al procesar planificador: " + error.message);
            } finally {
                clearInterval(idInt);
                setTimeout(() => { 
                    setAnalizandoStock(false); 
                    setProgreso(0); 
                }, 600);
                setMenuCargasAbierto(false);
                e.target.value = null;
            }
        },

        // Handler: Analizar stock
        handleAnalizarStock: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            setAnalizandoStock(true);
            setMenuCargasAbierto(false);
            const idInt = simularProgreso();
            
            try {
                const data = await inventarioService.analizarBajoInventario(file);
                setAlertasInventario(data.alertas);
                setProgreso(100);
                setTimeout(() => setMostrarModalInventario(true), 500);
            } catch (err) { 
                alert("Error con inventario: " + err.message); 
            } finally {
                clearInterval(idInt);
                setTimeout(() => { 
                    setAnalizandoStock(false); 
                    setProgreso(0); 
                }, 600);
                e.target.value = null;
            }
        },

        // Handler: Importar Excel con progreso
        handleImportExcelConProgreso: async (e) => {
            const idInt = simularProgreso();
            
            try {
                await handleImportExcel(e);
                setProgreso(100);
            } catch (err) { 
                alert(err.message); 
            } finally {
                clearInterval(idInt);
                setTimeout(() => setProgreso(0), 600);
                setMenuCargasAbierto(false);
            }
        },

        // Handler: PDF
        handlePdfClick: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            setProcesandoPdf(true);
            const idInt = simularProgreso();
            
            try {
                let tableroAProcesar = tipoPintura === "Vinílica"
                    ? rondas.map((fila, fIdx) => fila.map(celda => {
                        if (!celda) return null;
                        const op = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
                        return Array.isArray(celda) ? celda.map(c => ({ ...c, operario: op })) : { ...celda, operario: op };
                    })) : [cargasEsmaltesAsignadas];
                
                const blob = await procesarPdfConRondas(
                    file, 
                    tableroAProcesar, 
                    cargasEspeciales.filter(c => c.tipo === tipoPintura)
                );
                
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); 
                a.href = url; 
                a.download = `Reporte_${tipoPintura}.pdf`; 
                a.click();
                
                setProgreso(100);
            } catch (error) { 
                alert("Error PDF: " + error.message); 
            } finally {
                clearInterval(idInt);
                setTimeout(() => { 
                    setProcesandoPdf(false); 
                    setProgreso(0); 
                }, 600);
                e.target.value = null;
            }
        },

        // Handler: Vaciar tablero
        handleVaciarTablero: () => {
            if (window.confirm(`¿Borrar todas las cargas de ${tipoPintura.toUpperCase()}?`)) {
                if (tipoPintura === "Vinílica") { 
                    setRondas(Array.from({ length: 8 }, () => Array(6).fill(null))); 
                } else { 
                    setCargasEsmaltesAsignadas([]); 
                }
                setCargasEspeciales(prev => prev.filter(c => c.tipo !== tipoPintura));
            }
        },

        // Handler: Reporte desde Excel
        handleReporteDesdeExcel: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            setProcesandoReporte(true);
            const idInt = simularProgreso();
            
            try {
                const datosExcel = await handleImportExcel(e, true);
                if (!datosExcel || datosExcel.length === 0) return alert("Excel sin datos");
                
                const reporteSincronizado = datosExcel.map(item => {
                    let maq = "NO ASIGNADA", ope = "PENDIENTE";
                    const folioBusqueda = String(item.folio).trim().toUpperCase();
                    
                    // Buscar en rondas
                    rondas.forEach((fila, fIdx) => {
                        fila.forEach(celda => {
                            if (!celda) return;
                            const celdas = Array.isArray(celda) ? celda : [celda];
                            const match = celdas.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
                            if (match) {
                                maq = `VI-${101 + fIdx}`;
                                ope = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
                            }
                        });
                    });
                    
                    // Buscar en esmaltes
                    const matchEsm = cargasEsmaltesAsignadas.find(c => 
                        String(c.folio).trim().toUpperCase() === folioBusqueda
                    );
                    if (matchEsm) { 
                        maq = "ESM"; 
                        ope = matchEsm.operario; 
                    }
                    
                    // Buscar en especiales
                    const matchEsp = cargasEspeciales.find(c => 
                        String(c.folio).trim().toUpperCase() === folioBusqueda
                    );
                    if (matchEsp) { 
                        maq = "ESPECIAL"; 
                        ope = "LÁZARO"; 
                    }
                    
                    return { ...item, maquina: maq, operario: ope };
                });
                
                await exportarReporte(reporteSincronizado);
                setProgreso(100);
            } catch (error) { 
                alert("Error al sincronizar reporte: " + error.message); 
            } finally {
                clearInterval(idInt);
                setTimeout(() => { 
                    setProcesandoReporte(false); 
                    setProgreso(0); 
                }, 600);
                setMenuReporteAbierto(false);
                e.target.value = null;
            }
        },

        // Handler: Imprimir bitácora
        handleImprimirBitacora: async () => {
            try {
                await bitacoraService.generarPdf(rondas, fechaTrabajo, tipoPintura, getOperarioPorMaquina);
            } catch (e) { 
                alert("Error: " + e.message); 
            } finally { 
                setMenuReporteAbierto(false); 
            }
        },

        // Handler: Reporte del tablero
        handleReporteTablero: async () => {
            try {
                const finales = tableroUtils.prepararDatosReporte(
                    rondas, 
                    cargasEsmaltesAsignadas, 
                    cargasEspeciales, 
                    tipoPintura, 
                    fechaTrabajo, 
                    getOperarioPorMaquina
                );
                await exportarReporte(finales);
                setMenuReporteAbierto(false);
            } catch (error) {
                alert("Error al generar reporte: " + error.message);
            }
        },

        // Handler: Drop en tablero
        handleDrop: (e, fDest, cDest) => {
            e.preventDefault();
            const dataRaw = e.dataTransfer.getData("transferData");
            if (!dataRaw) return;
            
            const origen = JSON.parse(dataRaw);
            let nR = [...rondas.map(f => [...f])];
            let nE = [...cargasEspeciales];
            let cargaEntrante;
            
            if (origen.tipo === 'ronda') {
                const contenido = nR[origen.f][origen.c];
                if (Array.isArray(contenido)) {
                    cargaEntrante = { ...contenido[origen.subIndex] };
                    contenido.splice(origen.subIndex, 1);
                    nR[origen.f][origen.c] = contenido.length === 0 ? null : 
                        (contenido.length === 1 ? contenido[0] : contenido);
                } else { 
                    cargaEntrante = { ...contenido }; 
                    nR[origen.f][origen.c] = null; 
                }
            } else { 
                cargaEntrante = { ...nE[origen.index] }; 
                nE.splice(origen.index, 1); 
            }
            
            cargaEntrante.operario = getOperarioPorMaquina(101 + fDest, fechaTrabajo);
            cargaEntrante.maquina = `VI-${101 + fDest}`;
            
            const destinoActual = nR[fDest][cDest];
            nR[fDest][cDest] = destinoActual ? 
                (Array.isArray(destinoActual) ? [...destinoActual, cargaEntrante] : [destinoActual, cargaEntrante]) 
                : cargaEntrante;
            
            setRondas(nR); 
            setCargasEspeciales(nE);
        }
    };
};