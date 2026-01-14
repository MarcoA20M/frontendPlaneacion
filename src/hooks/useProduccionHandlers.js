// hooks/useProduccionHandlers.js
import { useCallback } from "react";
import { getOperarioPorMaquina } from "../constants/config";
import { planificadorService } from "../services/planificadorService";
import { inventarioService } from "../services/inventarioService";
import { procesarPdfConRondas } from "../services/pdfService";
import { exportarReporte } from "../services/excelService";
import { bitacoraService } from "../services/bitacoraService";
import { tableroUtils } from "../utils/tableroUtils";

export const useProduccionHandlers = (produccion, ui) => {
    // Extraer TODAS las funciones setter necesarias de producción
    const {
        tipoPintura, 
        rondas, 
        cargasEsmaltesAsignadas, 
        cargasEspeciales, 
        handleImportExcel,
        setRondas,
        setCargasEsmaltesAsignadas,
        setCargasEspeciales, // AGREGAR ESTO
        ordenarCargas // Si se usa en ModalDetalleCarga
    } = produccion;

    const {
        fechaTrabajo,
        setProgreso,
        setAlertasInventario,
        setAnalizandoStock,
        setMostrarModalInventario,
        setMenuCargasAbierto,
        setProcesandoPdf,
        setProcesandoReporte,
        setMenuReporteAbierto,
        setDatosPlanificador,
        setMostrarModalPlanificador
    } = ui;

    // Función auxiliar para simular progreso
    const simularProgreso = useCallback(() => {
        setProgreso(0);
        return setInterval(() => setProgreso(p => p >= 92 ? p : p + Math.floor(Math.random() * 7) + 2), 250);
    }, [setProgreso]);

    // Handler: Cargar planificador
    const handleCargarPlanificador = useCallback(async (e) => {
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
    }, [simularProgreso, setAnalizandoStock, setProgreso, setMenuCargasAbierto, setDatosPlanificador, setMostrarModalPlanificador]);

    // Handler: Analizar stock
    const handleAnalizarStock = useCallback(async (e) => {
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
    }, [simularProgreso, setAnalizandoStock, setMenuCargasAbierto, setAlertasInventario, setProgreso, setMostrarModalInventario]);

    // Handler: Importar Excel con progreso
    const handleImportExcelConProgreso = useCallback(async (e) => {
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
    }, [simularProgreso, handleImportExcel, setProgreso, setMenuCargasAbierto]);

    // Handler: PDF
    const handlePdfClick = useCallback(async (e) => {
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
    }, [tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales, fechaTrabajo, simularProgreso, setProcesandoPdf, setProgreso]);

    // Handler: Vaciar tablero
    const handleVaciarTablero = useCallback(() => {
        if (window.confirm(`¿Borrar todas las cargas de ${tipoPintura.toUpperCase()}?`)) {
            if (tipoPintura === "Vinílica") { 
                setRondas(Array.from({ length: 8 }, () => Array(6).fill(null))); 
            } else { 
                setCargasEsmaltesAsignadas([]); 
            }
            setCargasEspeciales(prev => prev.filter(c => c.tipo !== tipoPintura));
        }
    }, [tipoPintura, setRondas, setCargasEsmaltesAsignadas, setCargasEspeciales]);

    // Handler: Reporte desde Excel
    const handleReporteDesdeExcel = useCallback(async (e) => {
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
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales, fechaTrabajo, simularProgreso, handleImportExcel, setProcesandoReporte, setProgreso, setMenuReporteAbierto]);

    // Handler: Imprimir bitácora
    const handleImprimirBitacora = useCallback(async () => {
        try {
            await bitacoraService.generarPdf(rondas, fechaTrabajo, tipoPintura, getOperarioPorMaquina);
        } catch (e) { 
            alert("Error: " + e.message); 
        } finally { 
            setMenuReporteAbierto(false); 
        }
    }, [rondas, fechaTrabajo, tipoPintura, setMenuReporteAbierto]);

    // Handler: Reporte del tablero
    const handleReporteTablero = useCallback(async () => {
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
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales, tipoPintura, fechaTrabajo, setMenuReporteAbierto]);

    // Handler: Drop en tablero
    const handleDrop = useCallback((e, fDest, cDest) => {
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
    }, [rondas, cargasEspeciales, fechaTrabajo, setRondas, setCargasEspeciales]);

    // Handler para ModalDetalleCarga - Mover a especial
    const handleMoverEspecial = useCallback((carga) => {
        // Esta función debe ser usada en ModalDetalleCarga
        // Necesitas también setColaCargas y setCargasEsmaltesAsignadas
        const { setColaCargas, setCargasEsmaltesAsignadas } = produccion;
        
        setColaCargas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
        setRondas(prevRondas => prevRondas.map(f => f.map(celda => {
            if (!celda) return null;
            if (Array.isArray(celda)) {
                const nc = celda.filter(c => c.idTemp !== carga.idTemp);
                return nc.length === 0 ? null : (nc.length === 1 ? nc[0] : nc);
            }
            return celda.idTemp === carga.idTemp ? null : celda;
        })));
        setCargasEsmaltesAsignadas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
        setCargasEspeciales(prev => ordenarCargas([...prev, { ...carga, operario: "Lázaro", maquina: "ESPECIAL" }]));
    }, [setRondas, setCargasEsmaltesAsignadas, setCargasEspeciales, ordenarCargas, produccion]);

    // Handler para ModalDetalleCarga - Eliminar carga
    const handleEliminarCarga = useCallback((c) => {
        const { setColaCargas } = produccion;
        
        setColaCargas(prev => prev.filter(item => item.idTemp !== c.idTemp));
        setRondas(prev => prev.map(f => f.map(celda => {
            if (!celda) return null;
            if (Array.isArray(celda)) {
                const nc = celda.filter(i => i.idTemp !== c.idTemp);
                return nc.length === 0 ? null : (nc.length === 1 ? nc[0] : nc);
            }
            return celda.idTemp === c.idTemp ? null : celda;
        })));
        setCargasEsmaltesAsignadas(prev => prev.filter(item => item.idTemp !== c.idTemp));
        setCargasEspeciales(prev => prev.filter(item => item.idTemp !== c.idTemp));
    }, [setRondas, setCargasEsmaltesAsignadas, setCargasEspeciales, produccion]);

    // Handler para ModalDetalleCarga - Cambiar operario
    const handleCambiarOperario = useCallback((id, nuevoOperario) => {
        setCargasEsmaltesAsignadas(prev =>
            prev.map(c => c.idTemp === id ? { ...c, operario: nuevoOperario } : c)
        );
    }, [setCargasEsmaltesAsignadas]);

    return {
        // Handlers principales
        handleCargarPlanificador,
        handleAnalizarStock,
        handleImportExcelConProgreso,
        handlePdfClick,
        handleVaciarTablero,
        handleReporteDesdeExcel,
        handleImprimirBitacora,
        handleReporteTablero,
        handleDrop,
        
        // Handlers para ModalDetalleCarga
        handleMoverEspecial,
        handleEliminarCarga,
        handleCambiarOperario,
        
        // Función auxiliar
        simularProgreso
    };
};