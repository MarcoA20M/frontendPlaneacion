import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProduccion } from "../hooks/useProduccion";

// Servicios y Utils
import { getOperarioPorMaquina } from "../constants/config";
import { createProduccionHandlers } from "../utils/produccionHandlers";

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
        consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas,
        guardarProduccionEnBD,
        cargarDatosPorFecha  // Función para cargar cargas de la BD por fecha
    } = useProduccion();

    // --- ESTADOS DE UI Y CONTROL ---
    const [fechaRotacion, setFechaRotacion] = useState(new Date()); // Para rotación de personal (cambia con flechas)
    const [fechaCargaBD, setFechaCargaBD] = useState(new Date());   // Para cargar datos de la BD (cambia con date picker)
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

    // --- ESTADOS PARA PERFIL ---
    const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
    const perfilRef = useRef(null);

    const [alertasInventario, setAlertasInventario] = useState({
        "Vinílica": [],
        "Esmalte": []
    });

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
        const handleClickAfuera = (event) => {
            if (perfilRef.current && !perfilRef.current.contains(event.target)) {
                setMenuPerfilAbierto(false);
            }
        };
        document.addEventListener("mousedown", handleClickAfuera);
        return () => document.removeEventListener("mousedown", handleClickAfuera);
    }, []);

    // EFECTO PARA CARGAR DATOS DE LA BD CUANDO CAMBIA LA FECHA DEL DATE PICKER
    useEffect(() => {
        if (cargarDatosPorFecha) {
            cargarDatosPorFecha(fechaCargaBD);
        }
    }, [fechaCargaBD, cargarDatosPorFecha]);


    // EFECTO PARA ACTUALIZAR CUANDO CAMBIA LA CONFIGURACIÓN DE OPERARIOS
    useEffect(() => {
        const handleVinilicaUpdate = () => {
            // Forzar actualización de la UI cuando cambia la configuración
            setFechaRotacion(prev => new Date(prev));
        };

        window.addEventListener("vinilicaConfigUpdated", handleVinilicaUpdate);
        window.addEventListener("rotacionActualizada", handleVinilicaUpdate);

        return () => {
            window.removeEventListener("vinilicaConfigUpdated", handleVinilicaUpdate);
            window.removeEventListener("rotacionActualizada", handleVinilicaUpdate);
        };
    }, []);


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
            setAlertasInventario: (nuevasAlertas) => {
                setAlertasInventario(prev => ({
                    ...prev,
                    [tipoPintura]: nuevasAlertas
                }));
            },
            setProgreso,
            setMenuCargasAbierto,
            setMenuReporteAbierto,
            setDatosPlanificador,
            setMostrarModalPlanificador,
            setMostrarModalInventario,
            handleImportExcel,
            ordenarCargas,
            fechaTrabajo: fechaRotacion  // Pasamos la fecha de rotación para los handlers
        });
    }, [tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales, fechaRotacion, handleImportExcel, ordenarCargas]);

    // Funciones para navegar semanas de ROTACIÓN (solo cambian los nombres de los operadores)
    const semanaAnterior = () => {
        const nuevaFecha = new Date(fechaRotacion);
        nuevaFecha.setDate(nuevaFecha.getDate() - 7);
        setFechaRotacion(nuevaFecha);
    };

    const semanaSiguiente = () => {
        const nuevaFecha = new Date(fechaRotacion);
        nuevaFecha.setDate(nuevaFecha.getDate() + 7);
        setFechaRotacion(nuevaFecha);
    };

    const irAHoyRotacion = () => {
        setFechaRotacion(new Date());
    };

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
                    {/* Perfil */}
                    <div className="perfil-container" ref={perfilRef}>
                        <div
                            className={`perfil-icono ${menuPerfilAbierto ? 'active' : ''}`}
                            onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
                        >
                            <span className="avatar-letra">A</span>
                            <div className="indicador-online"></div>
                        </div>

                        {menuPerfilAbierto && (
                            <div className="perfil-dropdown">
                                <div className="perfil-header-info">
                                    <p className="usuario-nombre">Administrador</p>
                                    <p className="usuario-rol">Sistema de Producción</p>
                                </div>
                                <div className="divider-perfil"></div>
                                <button className="perfil-item" onClick={() => navigate("/ajustes")}>⚙️ Ajustes</button>
                                <button className="perfil-item" onClick={() => navigate("/mantenimiento")}>🛠️ Mantenimiento</button>
                                <button className="perfil-item" onClick={() => navigate("/configuracion")}>🔧 Configuración</button>
                                <div className="divider-perfil"></div>
                                <button className="perfil-item cerrar-sesion" onClick={() => setMenuPerfilAbierto(false)}>🚪 Cerrar Sesión</button>
                            </div>
                        )}
                    </div>

                    <div className="titulo-app">
                        <h1>Gestión de Pinturas</h1>
                        {datosPlanificador && (
                            <button className="badge-planificador-btn" onClick={() => setMostrarModalPlanificador(true)}>
                                📅
                            </button>
                        )}
                        {tipoPintura === "Vinílica" && (
                            <div className="planificador-semanal">
                                <button onClick={semanaAnterior}>◀</button>
                                <div className="fecha-actual-view">
                                    <strong>Semana: </strong> {fechaRotacion.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </div>
                                <button onClick={semanaSiguiente}>▶</button>
                                <button className="btn-hoy-reset" onClick={irAHoyRotacion}>Hoy</button>
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

                                    {alertasInventario[tipoPintura].length > 0 ? (
                                        <button
                                            className="dropdown-item"
                                            onClick={() => {
                                                setMostrarModalInventario(true);
                                                setMenuCargasAbierto(false);
                                            }}
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '5px', paddingBottom: '8px' }}
                                        >
                                            🔍 Ver Análisis ({alertasInventario[tipoPintura].length})
                                        </button>
                                    ) : (
                                        <label className="dropdown-item label-input" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '5px', paddingBottom: '8px' }}>
                                            🔍 Analizar Stock <input type="file" hidden accept=".xlsx, .xls" onChange={handlers.handleAnalizarStock} />
                                        </label>
                                    )}

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

                        <button className="exportar-btn" style={{ background: '#27ae60' }} onClick={guardarProduccionEnBD}>
                            💾 Guardar BD
                        </button>

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
                                    key={`resumen-${fechaRotacion.toISOString()}`}
                                    tipoPintura={tipoPintura}
                                    rondas={rondas}
                                    cargasEsmaltes={cargasEsmaltesAsignadas}
                                    fechaTrabajo={fechaRotacion}
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



                        {/* CALENDARIO SELECTOR DE FECHA - PARA CARGAR DATOS DE LA BD */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="calendar-picker-container" style={{
                                display: 'flex', alignItems: 'center', background: '#1e1e1e',
                                padding: '6px 12px', borderRadius: '8px', border: '1px solid #333',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                            }}>
                                <span style={{ marginRight: '8px' }}>📅</span>
                                <input
                                    type="date"
                                    value={fechaCargaBD.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        const valor = e.target.value;
                                        if (!valor) return;
                                        const nuevaFecha = new Date(valor + 'T00:00:00');
                                        setFechaCargaBD(nuevaFecha);
                                    }}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#00e5ff',
                                        fontSize: '14px', fontWeight: 'bold', outline: 'none', cursor: 'pointer'
                                    }}
                                />
                            </div>
                            <button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ FAMILIAS</button>
                        </div>
                    </div>

                    {tipoPintura === "Vinílica" ? (
                        <TableroVinilica
                            key={fechaRotacion.toISOString()}  // ← ESTO ES CRUCIAL
                            rondas={rondas}
                            fechaTrabajo={fechaRotacion}
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
                alertas={alertasInventario[tipoPintura]}
                onClose={() => setMostrarModalInventario(false)}
                onSelectCode={setCodigo}
                onAnalizarNuevo={handlers.handleAnalizarStock}
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