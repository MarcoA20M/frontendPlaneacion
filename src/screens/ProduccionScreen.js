import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProduccion } from "../hooks/useProduccion";

// Servicios y Utils
import { exportarReporte } from "../services/excelService";
import { procesarPdfConRondas } from "../services/pdfService";
import { familiaService } from "../services/familiaService";
import { inventarioService } from "../services/inventarioService";
import { bitacoraService } from "../services/bitacoraService";
import { planificadorService } from "../services/planificadorService";
import { tableroUtils } from "../utils/tableroUtils";
import { getOperarioPorMaquina, litrosPorEnvasado, litrosATexto } from "../constants/config";

// Componentes
import BusquedaSeccion from "../components/BusquedaSeccion";
import TableroVinilica from "../components/TableroVinilica";
import ResumenOperarios from "../components/ResumenOperarios";
import ModalCargas from "../components/ModalCargas";
import ModalDetalleCarga from "../components/ModalDetalleCarga";
import TableroEsmaltes from "../components/TableroEsmaltes";
import LoadingOverlay from "../components/LoadingOverlay";
import ModalInventarioBajo from "../components/ModalInventarioBajo";
// --- NUEVA IMPORTACIÓN ---
import ModalPlanificador from "../components/ModalPlanificador";

// Estilos
import "../styles/styles.css";
import "../styles/rondas.css";
import "../styles/esmaltes.css";
import "../styles/familias-screen.css";

export default function ProduccionScreen() {
    const navigate = useNavigate();
    const {
        codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
        cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
        rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
        cargando, totalLitrosActuales,
        consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
    } = useProduccion();

    // --- ESTADOS DE UI Y CONTROL ---
    const [fechaTrabajo, setFechaTrabajo] = useState(new Date());
    const [filtroOperario, setFiltroOperario] = useState(null);
    const [modoEsmalte, setModoEsmalte] = useState(null);
    const [mostrarEspeciales, setMostrarEspeciales] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarDetalle, setMostrarDetalle] = useState(false);
    const [cargaSeleccionada, setCargaSeleccionada] = useState(null);
    const [procesandoPdf, setProcesandoPdf] = useState(false);
    const [procesandoReporte, setProcesandoReporte] = useState(false);
    const [menuCargasAbierto, setMenuCargasAbierto] = useState(false);
    const [menuReporteAbierto, setMenuReporteAbierto] = useState(false);
    const [progreso, setProgreso] = useState(0);
    const [alertasInventario, setAlertasInventario] = useState([]);
    const [analizandoStock, setAnalizandoStock] = useState(false);
    const [mostrarModalInventario, setMostrarModalInventario] = useState(false);
    const [familias, setFamilias] = useState([]);

    // --- ESTADO PARA EL PLANIFICADOR ---
    const [mostrarModalPlanificador, setMostrarModalPlanificador] = useState(false);
    const [datosPlanificador, setDatosPlanificador] = useState(() => {
        const guardado = localStorage.getItem("planificador_data");
        return guardado ? JSON.parse(guardado) : null;
    });

    // --- EFECTOS ---
    useEffect(() => {
        const fetchFamilias = async () => {
            try {
                const data = await familiaService.getFamiliasPorTipo(tipoPintura);
                setFamilias(data);
            } catch (e) { console.error("Error cargando familias:", e); }
        };
        fetchFamilias();
    }, [tipoPintura]);

    const colaFiltrada = useMemo(() => colaCargas.filter(c => c.tipo === tipoPintura), [colaCargas, tipoPintura]);

    const stats = useMemo(() => {
        let baseEsmaltes = cargasEsmaltesAsignadas.filter(c => c.tipo === "Esmalte");
        if (filtroOperario) {
            baseEsmaltes = baseEsmaltes.filter(c =>
                (c.operario || "").toLowerCase().includes(filtroOperario.toLowerCase())
            );
        }
        return {
            total: baseEsmaltes.length,
            directos: baseEsmaltes.filter(c => !(c.operario || "").includes('/')).length,
            molienda: baseEsmaltes.filter(c => (c.operario || "").toLowerCase().includes('germán')).length,
            preparado: baseEsmaltes.filter(c => (c.operario || "").toLowerCase().includes('aldo')).length
        };
    }, [cargasEsmaltesAsignadas, filtroOperario]);

    const simularProgreso = () => {
        setProgreso(0);
        return setInterval(() => setProgreso(p => p >= 92 ? p : p + Math.floor(Math.random() * 7) + 2), 250);
    };

    // --- LOGICA PLANIFICADOR ---
    const handleCargarPlanificador = async (e) => {
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
            setTimeout(() => { setAnalizandoStock(false); setProgreso(0); }, 600);
            setMenuCargasAbierto(false);
            e.target.value = null;
        }
    };

    // --- MANEJADORES DE REPORTES Y PDF ---
    const handleImprimirBitacora = async () => {
        try {
            await bitacoraService.generarPdf(rondas, fechaTrabajo, tipoPintura, getOperarioPorMaquina);
        } catch (e) { alert("Error: " + e.message); } finally { setMenuReporteAbierto(false); }
    };

    const handleReporteDesdeExcel = async (e) => {
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
                const matchEsm = cargasEsmaltesAsignadas.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
                if (matchEsm) { maq = "ESM"; ope = matchEsm.operario; }
                const matchEsp = cargasEspeciales.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
                if (matchEsp) { maq = "ESPECIAL"; ope = "LÁZARO"; }
                return { ...item, maquina: maq, operario: ope };
            });
            await exportarReporte(reporteSincronizado);
            setProgreso(100);
        } catch (error) { alert("Error al sincronizar reporte"); }
        finally { clearInterval(idInt); setTimeout(() => { setProcesandoReporte(false); setProgreso(0); }, 600); setMenuReporteAbierto(false); e.target.value = null; }
    };

    const handlePdfClick = async (e) => {
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
            const blob = await procesarPdfConRondas(file, tableroAProcesar, cargasEspeciales.filter(c => c.tipo === tipoPintura));
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `Reporte_${tipoPintura}.pdf`; a.click();
            setProgreso(100);
        } catch (error) { alert("Error PDF: " + error.message); }
        finally { clearInterval(idInt); setTimeout(() => { setProcesandoPdf(false); setProgreso(0); }, 600); e.target.value = null; }
    };

    const handleVaciarTablero = () => {
        if (window.confirm(`¿Borrar todas las cargas de ${tipoPintura.toUpperCase()}?`)) {
            if (tipoPintura === "Vinílica") { setRondas(Array.from({ length: 8 }, () => Array(6).fill(null))); }
            else { setCargasEsmaltesAsignadas([]); }
            setCargasEspeciales(prev => prev.filter(c => c.tipo !== tipoPintura));
        }
    };

    const handleDrop = (e, fDest, cDest) => {
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
                nR[origen.f][origen.c] = contenido.length === 0 ? null : (contenido.length === 1 ? contenido[0] : contenido);
            } else { cargaEntrante = { ...contenido }; nR[origen.f][origen.c] = null; }
        } else { cargaEntrante = { ...nE[origen.index] }; nE.splice(origen.index, 1); }
        cargaEntrante.operario = getOperarioPorMaquina(101 + fDest, fechaTrabajo);
        cargaEntrante.maquina = `VI-${101 + fDest}`;
        const destinoActual = nR[fDest][cDest];
        nR[fDest][cDest] = destinoActual ? (Array.isArray(destinoActual) ? [...destinoActual, cargaEntrante] : [destinoActual, cargaEntrante]) : cargaEntrante;
        setRondas(nR); setCargasEspeciales(nE);
    };

    return (
        <div className="app">
            <LoadingOverlay cargando={cargando} procesandoPdf={procesandoPdf} procesandoReporte={procesandoReporte || analizandoStock} progreso={progreso} />

            <div className="container">
                <div className="header-panel">
                    <div className="titulo-app">
                        <h1>Gestión de Pinturas</h1>
                        {datosPlanificador && (
                            <button className="badge-planificador-btn" onClick={() => setMostrarModalPlanificador(true)}>
                                📅 Planificador Activo ({datosPlanificador.total})
                            </button>
                        )}
                        {tipoPintura === "Vinílica" && (
                            <div className="planificador-semanal">
                                <button onClick={() => setFechaTrabajo(new Date(fechaTrabajo.setDate(fechaTrabajo.getDate() - 7)))}>◀</button>
                                <div className="fecha-actual-view"><strong>Semana:</strong> {fechaTrabajo.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                                <button onClick={() => setFechaTrabajo(new Date(fechaTrabajo.setDate(fechaTrabajo.getDate() + 7)))}>▶</button>
                                <button className="btn-hoy-reset" onClick={() => setFechaTrabajo(new Date())}>Hoy</button>
                            </div>
                        )}
                    </div>
                    <div className="selector-tipo">
                        {["Vinílica", "Esmalte"].map(t => (
                            <button key={t} className={tipoPintura === t ? "active" : ""} onClick={() => { setTipoPintura(t); setFiltroOperario(null); setModoEsmalte(null); }}>{t}</button>
                        ))}
                    </div>
                </div>

                <BusquedaSeccion
                    codigo={codigo} setCodigo={setCodigo} consultar={consultar} producto={producto}
                    cargasEspeciales={cargasEspeciales.filter(c => c.tipo === tipoPintura)}
                    mostrarEspeciales={mostrarEspeciales} setMostrarEspeciales={setMostrarEspeciales}
                    onSeleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
                />

                <div className="producto-panel">
                    {producto && (
                        <div className="layout-dinamico-produccion">
                            <div className="envasado-column">
                                <div className="tabla">
                                    {[...producto.envasados].sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id)).map(env => (
                                        <div className="fila" key={env.id}>
                                            <span className="litros-text">{litrosATexto(litrosPorEnvasado(env.id))}</span>
                                            <input
                                                type="number"
                                                value={cantidades[env.id] || 0}
                                                onChange={(e) => setCantidades({ ...cantidades, [env.id]: Number(e.target.value) })}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="contador-litros">Total: <span>{totalLitrosActuales.toFixed(2)} L</span></div>
                            </div>

                            {/* --- Cambia esta sección dentro de la columna de inventario --- */}
                            <div className="inventario-column">
                                <table className="tabla-inventario-tecnica">
                                    <thead>
                                        <tr>
                                            <th>TIPO ENVASE</th>
                                            <th>PZ A PRODUCIR</th>
                                            <th>CAJA CERRADA</th>
                                            <th>SALIDAS</th>
                                            <th>EXISTENCIA</th>
                                            <th>ALCANCE (DÍAS)</th>
                                            <th>NUEVO INV.</th>
                                            <th>DÍAS EST.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {producto && producto.envasados && producto.envasados.length > 0 ? (
                                            [...producto.envasados]
                                                .sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id))
                                                .map(env => {
                                                    const id = env.id;
                                                    const pz = cantidades[id] || 0;
                                                    const capacidadSistema = Number(litrosPorEnvasado(id));

                                                    // --- LÓGICA DE EXTRACCIÓN DEL PLANIFICADOR ---
                                                    const extraerLitrosDeArticulo = (art) => {
                                                        if (!art) return 0;
                                                        const prefijo = String(art).split('-')[0].replace(/^0+/, '');
                                                        return parseFloat(prefijo) || 0;
                                                    };

                                                    // Buscamos el match exacto por litros entre el envasado y el planificador
                                                    const infoPlanificador = producto.datosPlanificador?.find(item => {
                                                        const litrosPlan = extraerLitrosDeArticulo(item.articulo);
                                                        return Math.abs(litrosPlan - capacidadSistema) < 0.1;
                                                    });

                                                    // Cálculos dinámicos
                                                    const salidas = infoPlanificador ? parseFloat(infoPlanificador.salidas) : 0;
                                                    const existencia = infoPlanificador ? parseFloat(infoPlanificador.existencia) : 0;
                                                    const alcanceActual = infoPlanificador ? infoPlanificador.alcance : 0;

                                                    // Lógica de cajas
                                                    const divisorCaja = (capacidadSistema >= 3 && capacidadSistema <= 5) ? 2 : (capacidadSistema <= 1 ? 6 : 1);
                                                    const cajaCerrada = pz > 0 ? (pz / divisorCaja).toFixed(1) : 0;

                                                    const nuevoInv = existencia + Number(pz);
                                                    const diasEst = salidas > 0 ? (nuevoInv / salidas).toFixed(1) : "---";

                                                    return (
                                                        <tr key={id}>
                                                            <td style={{ color: '#00e5ff', fontWeight: 'bold' }}>
                                                                {litrosATexto(capacidadSistema)}
                                                            </td>
                                                            <td style={{ color: pz > 0 ? '#fff' : '#555' }}>{pz}</td>
                                                            <td style={{ opacity: 0.7 }}>{cajaCerrada}</td>
                                                            <td>{salidas.toFixed(1)}</td>
                                                            <td>{existencia}</td>
                                                            <td style={{
                                                                color: alcanceActual < 3 ? '#ff5252' : '#ffca28',
                                                                fontWeight: 'bold'
                                                            }}>{alcanceActual}</td>
                                                            <td style={{ backgroundColor: 'rgba(0, 229, 255, 0.05)' }}>{nuevoInv}</td>
                                                            <td style={{
                                                                color: diasEst < 5 ? '#ff5252' : '#00ff88',
                                                                fontWeight: 'bold'
                                                            }}>{diasEst}</td>
                                                        </tr>
                                                    );
                                                })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" style={{ color: '#666', padding: '15px', textAlign: 'center' }}>
                                                    Busque un producto para ver el análisis de stock...
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="botones-cargas">
                        <button className="agregar-btn" onClick={agregarCargaManual}>+ Agregar Carga</button>
                        <div className="dropdown-container">
                            <button className="agregar-btn secondary" onClick={() => setMenuCargasAbierto(!menuCargasAbierto)}>📂 Gestión ({colaFiltrada.length})</button>
                            {menuCargasAbierto && (
                                <div className="dropdown-menu">
                                    <label className="dropdown-item label-input" style={{ borderBottom: '2px solid #00e5ff', color: '#00e5ff', fontWeight: 'bold' }}>
                                        📅 Cargar Planificador <input type="file" hidden accept=".xlsx, .xls" onChange={handleCargarPlanificador} />
                                    </label>
                                    <label className="dropdown-item label-input" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '5px', paddingBottom: '8px' }}>
                                        🔍 Analizar Stock <input type="file" hidden accept=".xlsx, .xls" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            setAnalizandoStock(true); setMenuCargasAbierto(false);
                                            const idInt = simularProgreso();
                                            try {
                                                const data = await inventarioService.analizarBajoInventario(file);
                                                setAlertasInventario(data.alertas); setProgreso(100);
                                                setTimeout(() => setMostrarModalInventario(true), 500);
                                            } catch (err) { alert("Error con inventario"); }
                                            finally { clearInterval(idInt); setTimeout(() => { setAnalizandoStock(false); setProgreso(0); }, 600); e.target.value = null; }
                                        }} />
                                    </label>
                                    <button className="dropdown-item" onClick={() => { setMostrarModal(true); setMenuCargasAbierto(false); }}>📋 Lista Espera</button>
                                    <label className="dropdown-item label-input">📊 Importar Excel <input type="file" hidden accept=".xlsx, .xls" onChange={async (e) => {
                                        const idInt = simularProgreso();
                                        try { await handleImportExcel(e); setProgreso(100); } catch (err) { alert(err.message); }
                                        finally { clearInterval(idInt); setTimeout(() => setProgreso(0), 600); setMenuCargasAbierto(false); }
                                    }} /></label>
                                </div>
                            )}
                        </div>
                        <label className="agregar-btn btn-pdf">📄 PDF <input type="file" hidden accept=".pdf" onChange={handlePdfClick} /></label>
                        <div className="dropdown-container">
                            <button className="exportar-btn" onClick={() => setMenuReporteAbierto(!menuReporteAbierto)}>📊 Reportes</button>
                            {menuReporteAbierto && (
                                <div className="dropdown-menu">
                                    <button className="dropdown-item" onClick={async () => {
                                        const finales = tableroUtils.prepararDatosReporte(rondas, cargasEsmaltesAsignadas, cargasEspeciales, tipoPintura, fechaTrabajo, getOperarioPorMaquina);
                                        await exportarReporte(finales); setMenuReporteAbierto(false);
                                    }}>🖥️ Tablero</button>
                                    <button className="dropdown-item" onClick={handleImprimirBitacora}>🖨️ Bitácora</button>
                                    <label className="dropdown-item label-input">📂 Desde Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handleReporteDesdeExcel} /></label>
                                </div>
                            )}
                        </div>
                        <button className="eliminar-btn" onClick={handleVaciarTablero}>🗑️ Vaciar Tablero</button>
                    </div>
                </div>

                <div className="main-board-section">
                    <div className="panel-header-actions">
                        <div className="header-left-side" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 className="tablero-titulo">TABLERO {tipoPintura.toUpperCase()}</h2>
                                <ResumenOperarios
                                    tipoPintura={tipoPintura} rondas={rondas} cargasEsmaltes={cargasEsmaltesAsignadas}
                                    fechaTrabajo={fechaTrabajo} getOperarioPorMaquina={getOperarioPorMaquina}
                                    onFiltrar={setFiltroOperario} filtroActivo={filtroOperario}
                                />
                            </div>
                            {tipoPintura === "Esmalte" && (
                                <div className="resumen-operarios" style={{ display: 'flex', gap: '8px' }}>
                                    <button className={`card-op ${modoEsmalte === null ? 'active' : ''}`} onClick={() => setModoEsmalte(null)}>🌍 General ({stats.total})</button>
                                    <button className={`card-op ${modoEsmalte === 'DIRECTO' ? 'active' : ''}`} onClick={() => setModoEsmalte('DIRECTO')}>🚀 Directos ({stats.directos})</button>
                                    <button className={`card-op ${modoEsmalte === 'MOLIENDA' ? 'active' : ''}`} onClick={() => setModoEsmalte('MOLIENDA')}>⚙️ Molienda ({stats.molienda})</button>
                                    <button className={`card-op ${modoEsmalte === 'PREPARADO' ? 'active' : ''}`} onClick={() => setModoEsmalte('PREPARADO')}>🧪 Preparado ({stats.preparado})</button>
                                </div>
                            )}
                        </div>
                        <button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ FAMILIAS</button>
                    </div>

                    {tipoPintura === "Vinílica" ? (
                        <TableroVinilica rondas={rondas} fechaTrabajo={fechaTrabajo} handleDrop={handleDrop} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} filtroOperario={filtroOperario} />
                    ) : (
                        <TableroEsmaltes cargas={cargasEsmaltesAsignadas} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} filtroOperario={filtroOperario} modoEsmalte={modoEsmalte} />
                    )}
                </div>
            </div>

            {/* --- INTEGRACIÓN DEL NUEVO COMPONENTE MODULARIZADO --- */}
            <ModalPlanificador
                visible={mostrarModalPlanificador}
                datos={datosPlanificador}
                onClose={() => setMostrarModalPlanificador(false)}
                onSelectCode={(codigo) => {
                    setCodigo(codigo);
                    setMostrarModalPlanificador(false);
                }}
                onClear={() => {
                    if (window.confirm("¿Borrar memoria del planificador?")) {
                        setDatosPlanificador(null);
                        localStorage.removeItem("planificador_data");
                        setMostrarModalPlanificador(false);
                    }
                }}
            />

            <ModalCargas
                visible={mostrarModal} cargas={colaFiltrada} onClose={() => setMostrarModal(false)}
                onEliminarCarga={(id) => setColaCargas(prev => prev.filter(c => c.idTemp !== id))}
                onVaciarTodo={() => setColaCargas(prev => prev.filter(c => c.tipo !== tipoPintura))}
                onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }}
                onSeleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
            />

            <ModalInventarioBajo visible={mostrarModalInventario} alertas={alertasInventario} onClose={() => setMostrarModalInventario(false)} onSelectCode={setCodigo} />

            <ModalDetalleCarga
                visible={mostrarDetalle}
                carga={cargaSeleccionada}
                onClose={() => setMostrarDetalle(false)}

                // --- NUEVA LÓGICA DE CAMBIO DE OPERARIO ---
                onCambiarOperario={(id, nuevoOperario) => {
                    // 1. Actualizamos en el estado de Esmaltes
                    setCargasEsmaltesAsignadas(prev =>
                        prev.map(c => c.idTemp === id ? { ...c, operario: nuevoOperario } : c)
                    );
                    // 2. También actualizamos la carga seleccionada para que el modal cambie visualmente
                    setCargaSeleccionada(prev => ({ ...prev, operario: nuevoOperario }));
                }}

                onEliminar={(c) => {
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
                    setMostrarDetalle(false);
                }}

                onMoverEspecial={(carga) => {
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
                    setMostrarDetalle(false);
                }}
            />


        </div>
    );
}