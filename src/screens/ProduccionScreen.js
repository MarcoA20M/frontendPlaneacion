import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProduccion } from "../hooks/useProduccion";

// Servicios y Utils
import { getOperarioPorMaquina } from "../constants/config";
import { createProduccionHandlers } from "../utils/produccionHandlers"; // NUEVO

// Componentes
import BusquedaSeccion from "../components/BusquedaSeccion";
import TableroVinilica from "../components/TableroVinilica";
import ResumenOperarios from "../components/ResumenOperarios";
import ModalCargas from "../components/ModalCargas";
import ModalDetalleCarga from "../components/ModalDetalleCarga";
import TableroEsmaltes from "../components/TableroEsmaltes";
import LoadingOverlay from "../components/LoadingOverlay";
import ModalInventarioBajo from "../components/ModalInventarioBajo";
import ModalPlanificador from "../components/ModalPlanificador";
import InfoInventarioProducto from "../components/InfoInventarioProducto";

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
                // Importar aquí si es necesario
                // const data = await familiaService.getFamiliasPorTipo(tipoPintura);
                // setFamilias(data);
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

    // --- CREAR HANDLERS ---
    const handlers = useMemo(() => {
        return createProduccionHandlers({
            // Estados y setters
            tipoPintura,
            rondas,
            cargasEsmaltesAsignadas,
            cargasEspeciales,
            setRondas,
            setCargasEsmaltesAsignadas,
            setCargasEspeciales,
            setAnalizandoStock,
            setProcesandoPdf,
            setProcesandoReporte,
            setAlertasInventario,
            setProgreso,
            setMenuCargasAbierto,
            setMenuReporteAbierto,
            setDatosPlanificador,
            setMostrarModalPlanificador,
            setMostrarModalInventario,
            
            // Funciones
            handleImportExcel,
            ordenarCargas,
            
            // Otros
            fechaTrabajo
        });
    }, [
        tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales,
        fechaTrabajo, handleImportExcel, ordenarCargas
    ]);

    return (
        <div className="app">
            <LoadingOverlay 
                cargando={cargando} 
                procesandoPdf={procesandoPdf} 
                procesandoReporte={procesandoReporte || analizandoStock} 
                progreso={progreso} 
            />

            <div className="container">
                <div className="header-panel">
                    <div className="titulo-app">
                        <h1>Gestión de Pinturas</h1>
                        {datosPlanificador && (
                            <button className="badge-planificador-btn" onClick={() => setMostrarModalPlanificador(true)}>
                                📅
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
                            <button key={t} className={tipoPintura === t ? "active" : ""} 
                                onClick={() => { setTipoPintura(t); setFiltroOperario(null); setModoEsmalte(null); }}>
                                {t}
                            </button>
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
                        <InfoInventarioProducto
                            producto={producto}
                            cantidades={cantidades}
                            setCantidades={setCantidades}
                            totalLitrosActuales={totalLitrosActuales}
                        />
                    )}

                    <div className="botones-cargas">
                        <button className="agregar-btn" onClick={agregarCargaManual}>+ Agregar Carga</button>
                        <div className="dropdown-container">
                            <button className="agregar-btn secondary" onClick={() => setMenuCargasAbierto(!menuCargasAbierto)}>
                                📂 Gestión ({colaFiltrada.length})
                            </button>
                            {menuCargasAbierto && (
                                <div className="dropdown-menu">
                                    <label className="dropdown-item label-input" style={{ borderBottom: '2px solid #00e5ff', color: '#00e5ff', fontWeight: 'bold' }}>
                                        📅 Cargar Planificador <input type="file" hidden accept=".xlsx, .xls" onChange={handlers.handleCargarPlanificador} />
                                    </label>
                                    <label className="dropdown-item label-input" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '5px', paddingBottom: '8px' }}>
                                        🔍 Analizar Stock <input type="file" hidden accept=".xlsx, .xls" onChange={handlers.handleAnalizarStock} />
                                    </label>
                                    <button className="dropdown-item" onClick={() => { setMostrarModal(true); setMenuCargasAbierto(false); }}>
                                        📋 Lista Espera
                                    </button>
                                    <label className="dropdown-item label-input">
                                        📊 Importar Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handlers.handleImportExcelConProgreso} />
                                    </label>
                                </div>
                            )}
                        </div>
                        <label className="agregar-btn btn-pdf">
                            📄 PDF <input type="file" hidden accept=".pdf" onChange={handlers.handlePdfClick} />
                        </label>
                        <div className="dropdown-container">
                            <button className="exportar-btn" onClick={() => setMenuReporteAbierto(!menuReporteAbierto)}>
                                📊 Reportes
                            </button>
                            {menuReporteAbierto && (
                                <div className="dropdown-menu">
                                    <button className="dropdown-item" onClick={handlers.handleReporteTablero}>🖥️ Tablero</button>
                                    <button className="dropdown-item" onClick={handlers.handleImprimirBitacora}>🖨️ Bitácora</button>
                                    <label className="dropdown-item label-input">
                                        📂 Desde Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handlers.handleReporteDesdeExcel} />
                                    </label>
                                </div>
                            )}
                        </div>
                        <button className="eliminar-btn" onClick={handlers.handleVaciarTablero}>🗑️ Vaciar Tablero</button>
                    </div>
                </div>

                <div className="main-board-section">
                    <div className="panel-header-actions">
                        <div className="header-left-side" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 className="tablero-titulo">TABLERO {tipoPintura.toUpperCase()}</h2>
                                <ResumenOperarios
                                    tipoPintura={tipoPintura} 
                                    rondas={rondas} 
                                    cargasEsmaltes={cargasEsmaltesAsignadas}
                                    fechaTrabajo={fechaTrabajo} 
                                    getOperarioPorMaquina={getOperarioPorMaquina}
                                    onFiltrar={setFiltroOperario} 
                                    filtroActivo={filtroOperario}
                                />
                            </div>
                            {tipoPintura === "Esmalte" && (
                                <div className="resumen-operarios" style={{ display: 'flex', gap: '8px' }}>
                                    <button className={`card-op ${modoEsmalte === null ? 'active' : ''}`} onClick={() => setModoEsmalte(null)}>
                                        🌍 General ({stats.total})
                                    </button>
                                    <button className={`card-op ${modoEsmalte === 'DIRECTO' ? 'active' : ''}`} onClick={() => setModoEsmalte('DIRECTO')}>
                                        🚀 Directos ({stats.directos})
                                    </button>
                                    <button className={`card-op ${modoEsmalte === 'MOLIENDA' ? 'active' : ''}`} onClick={() => setModoEsmalte('MOLIENDA')}>
                                        ⚙️ Molienda ({stats.molienda})
                                    </button>
                                    <button className={`card-op ${modoEsmalte === 'PREPARADO' ? 'active' : ''}`} onClick={() => setModoEsmalte('PREPARADO')}>
                                        🧪 Preparado ({stats.preparado})
                                    </button>
                                </div>
                            )}
                        </div>
                        <button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ FAMILIAS</button>
                    </div>

                    {tipoPintura === "Vinílica" ? (
                        <TableroVinilica 
                            rondas={rondas} 
                            fechaTrabajo={fechaTrabajo} 
                            handleDrop={handlers.handleDrop} 
                            setCargaSeleccionada={setCargaSeleccionada} 
                            setMostrarDetalle={setMostrarDetalle} 
                            filtroOperario={filtroOperario} 
                        />
                    ) : (
                        <TableroEsmaltes 
                            cargas={cargasEsmaltesAsignadas} 
                            setCargaSeleccionada={setCargaSeleccionada} 
                            setMostrarDetalle={setMostrarDetalle} 
                            filtroOperario={filtroOperario} 
                            modoEsmalte={modoEsmalte} 
                        />
                    )}
                </div>
            </div>

            {/* Modales */}
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
                visible={mostrarModal} 
                cargas={colaFiltrada} 
                onClose={() => setMostrarModal(false)}
                onEliminarCarga={(id) => setColaCargas(prev => prev.filter(c => c.idTemp !== id))}
                onVaciarTodo={() => setColaCargas(prev => prev.filter(c => c.tipo !== tipoPintura))}
                onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }}
                onSeleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
            />

            <ModalInventarioBajo 
                visible={mostrarModalInventario} 
                alertas={alertasInventario} 
                onClose={() => setMostrarModalInventario(false)} 
                onSelectCode={setCodigo} 
            />

            <ModalDetalleCarga
                visible={mostrarDetalle}
                carga={cargaSeleccionada}
                onClose={() => setMostrarDetalle(false)}
                onCambiarOperario={(id, nuevoOperario) => {
                    setCargasEsmaltesAsignadas(prev =>
                        prev.map(c => c.idTemp === id ? { ...c, operario: nuevoOperario } : c)
                    );
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