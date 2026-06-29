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
import ModalResumenConsumo from "../components/ModalResumenConsumo";

// Importar la imagen
import logoPintu from "../assets/PINTU.jpg";

// Estilos
import "../styles/styles.css";
import "../styles/rondas.css";
import "../styles/esmaltes.css";
import "../styles/familias-screen.css";

// CLAVE PARA LOCALSTORAGE
const STORAGE_KEY = 'produccion_data';

export default function ProduccionScreen() {
    const navigate = useNavigate();
    const {
        codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
        cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
        rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
        cargando, totalLitrosActuales,
        generarLotesFinales,
        consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas,
        guardarProduccionEnBD,
        cargarDatosPorFecha,
        calcularConsumoGlobal
    } = useProduccion();

    // --- ESTADOS DE UI Y CONTROL ---
    const [fechaRotacion, setFechaRotacion] = useState(new Date());
    const [fechaCargaBD, setFechaCargaBD] = useState(new Date());
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
    const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
    const perfilRef = useRef(null);

    // Control de carga inicial
    const primeraCargaRef = useRef(true);
    const guardandoRef = useRef(false);
    const [cargaInicialCompletada, setCargaInicialCompletada] = useState(false);

    // 🔴 ESTADOS PARA INVENTARIO
    const [alertasInventario, setAlertasInventario] = useState({
        "Vinílica": [],
        "Esmalte": []
    });

    const [alertasRevisar, setAlertasRevisar] = useState({
        "Vinílica": [],
        "Esmalte": []
    });

    const [analizandoStock, setAnalizandoStock] = useState(false);
    const [mostrarModalInventario, setMostrarModalInventario] = useState(false);
    const [familias, setFamilias] = useState([]);
    const [mostrarModalPlanificador, setMostrarModalPlanificador] = useState(false);
    const [datosPlanificador, setDatosPlanificador] = useState(() => {
        const guardado = localStorage.getItem("planificador_data");
        return guardado ? JSON.parse(guardado) : null;
    });

    // Estados para resumen de consumo
    const [mostrarModalResumen, setMostrarModalResumen] = useState(false);
    const [resumenGlobal, setResumenGlobal] = useState([]);
    const [cargandoResumen, setCargandoResumen] = useState(false);

    // 🔴 FUNCIÓN PARA GUARDAR EN LOCALSTORAGE
    const guardarEnLocalStorage = () => {
        if (guardandoRef.current) return;
        
        // Verificar si hay datos reales
        let tieneDatos = false;
        if (Array.isArray(rondas)) {
            for (let i = 0; i < rondas.length; i++) {
                if (Array.isArray(rondas[i])) {
                    for (let j = 0; j < rondas[i].length; j++) {
                        if (rondas[i][j] !== null && rondas[i][j] !== undefined) {
                            tieneDatos = true;
                            break;
                        }
                    }
                }
                if (tieneDatos) break;
            }
        }
        if (!tieneDatos && cargasEsmaltesAsignadas.length === 0 && 
            cargasEspeciales.length === 0 && colaCargas.length === 0) {
            return;
        }

        guardandoRef.current = true;
        try {
            const dataToSave = {
                rondas,
                cargasEsmaltesAsignadas,
                cargasEspeciales,
                colaCargas,
                tipoPintura,
                fechaRotacion: fechaRotacion.toISOString(),
                fechaCargaBD: fechaCargaBD.toISOString(),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        } finally {
            guardandoRef.current = false;
        }
    };

    // 🔴 FUNCIÓN PARA CARGAR DESDE LOCALSTORAGE
    const cargarDesdeLocalStorage = () => {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            if (storedData) {
                const parsedData = JSON.parse(storedData);
                
                let tieneDatos = false;
                if (Array.isArray(parsedData.rondas)) {
                    for (let i = 0; i < parsedData.rondas.length; i++) {
                        if (Array.isArray(parsedData.rondas[i])) {
                            for (let j = 0; j < parsedData.rondas[i].length; j++) {
                                if (parsedData.rondas[i][j] !== null && parsedData.rondas[i][j] !== undefined) {
                                    tieneDatos = true;
                                    break;
                                }
                            }
                        }
                        if (tieneDatos) break;
                    }
                }
                if (!tieneDatos && parsedData.cargasEsmaltesAsignadas?.length === 0 && 
                    parsedData.cargasEspeciales?.length === 0 && parsedData.colaCargas?.length === 0) {
                    localStorage.removeItem(STORAGE_KEY);
                    return false;
                }

                if (parsedData.rondas) setRondas(parsedData.rondas);
                if (parsedData.cargasEsmaltesAsignadas) setCargasEsmaltesAsignadas(parsedData.cargasEsmaltesAsignadas);
                if (parsedData.cargasEspeciales) setCargasEspeciales(parsedData.cargasEspeciales);
                if (parsedData.colaCargas) setColaCargas(parsedData.colaCargas);
                if (parsedData.tipoPintura) setTipoPintura(parsedData.tipoPintura);
                if (parsedData.fechaRotacion) setFechaRotacion(new Date(parsedData.fechaRotacion));
                if (parsedData.fechaCargaBD) setFechaCargaBD(new Date(parsedData.fechaCargaBD));
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error cargando desde localStorage:', error);
            return false;
        }
    };

    // 🔴 FUNCIÓN PARA BORRAR LOCALSTORAGE (cuando se vacía el tablero)
    const borrarLocalStorage = () => {
        localStorage.removeItem(STORAGE_KEY);
    };

    // Función para volver al menú principal
    const volverAlMenuPrincipal = () => {
        navigate("/");
    };

    // --- Cargar Familias desde la API ---
    useEffect(() => {
        const cargarFamilias = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/familias');
                if (response.ok) {
                    const data = await response.json();
                    setFamilias(data);
                } else {
                    console.error('Error al cargar familias:', response.status);
                    setFamilias([]);
                }
            } catch (error) {
                console.error('Error de conexión al cargar familias:', error);
                setFamilias([]);
            }
        };
        cargarFamilias();
    }, []);

    // Función para ver resumen global de consumo
    const handleVerResumenGlobal = async () => {
        setCargandoResumen(true);
        setMostrarModalResumen(true);
        try {
            const resumen = await calcularConsumoGlobal();
            setResumenGlobal(resumen);
        } catch (error) {
            console.error("Error calculando resumen global:", error);
            alert("Error al calcular el resumen de consumo");
        } finally {
            setCargandoResumen(false);
        }
    };

    // Función para guardar y cerrar
    const handleGuardarYcerrar = () => {
        setMostrarModalResumen(false);
        guardarProduccionEnBD();
        setTimeout(() => guardarEnLocalStorage(), 500);
    };

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

    // 🔴 EFECTO DE CARGA INICIAL - SOLO UNA VEZ
    useEffect(() => {
        if (primeraCargaRef.current) {
            primeraCargaRef.current = false;
            
            const datosCargados = cargarDesdeLocalStorage();
            
            if (datosCargados) {
                setCargaInicialCompletada(true);
                return;
            }
            
            if (cargarDatosPorFecha) {
                cargarDatosPorFecha(fechaCargaBD)
                    .then(() => {
                        setTimeout(() => {
                            guardarEnLocalStorage();
                            setCargaInicialCompletada(true);
                        }, 500);
                    })
                    .catch(() => {
                        setCargaInicialCompletada(true);
                    });
            } else {
                setCargaInicialCompletada(true);
            }
        }
    }, []);

    // 🔴 EFECTO PARA GUARDAR AUTOMÁTICAMENTE
    useEffect(() => {
        if (cargaInicialCompletada && !guardandoRef.current) {
            const timeoutId = setTimeout(() => {
                guardarEnLocalStorage();
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales, colaCargas, tipoPintura, fechaRotacion, cargaInicialCompletada]);

    useEffect(() => {
        const handleVinilicaUpdate = () => {
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

    // 🔴 HANDLERS MODIFICADO - Sobrescribir handleVaciarTablero
    const handlers = useMemo(() => {
        const baseHandlers = createProduccionHandlers({
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
            setAlertasRevisar: (nuevasRevisar) => {
                setAlertasRevisar(prev => ({
                    ...prev,
                    [tipoPintura]: nuevasRevisar
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
            fechaTrabajo: fechaRotacion
        });

        // Sobrescribir handleVaciarTablero para que también borre localStorage y colas
        const originalVaciarTablero = baseHandlers.handleVaciarTablero;
        baseHandlers.handleVaciarTablero = () => {
            if (window.confirm('¿Estás seguro de que quieres vaciar el tablero?')) {
                // Ejecutar el comportamiento original
                originalVaciarTablero();
                // Borrar localStorage (esto borra TODOS los datos incluyendo colas)
                borrarLocalStorage();
                // Limpiar explícitamente las colas
                setColaCargas([]);
                setCargasEspeciales([]);
                setCargasEsmaltesAsignadas([]);
            }
        };

        return baseHandlers;
    }, [tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales, colaCargas, fechaRotacion, handleImportExcel, ordenarCargas]);

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

    // Calcular total de cargas y litros para mostrar en el modal
    const totalCargas = useMemo(() => {
        return [...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales].length;
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales]);

    const totalLitrosProducir = useMemo(() => {
        return [...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales]
            .reduce((sum, c) => sum + (c.litros || 0), 0).toFixed(2);
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales]);

    // Calcular cargas con su consumo individual (para la vista por carga)
    const cargasConConsumo = useMemo(() => {
        const todasLasCargas = [...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales];
        
        return todasLasCargas.map((carga, index) => {
            const folio = carga.folio || carga.lote || carga.numeroLote || `ORD-${index + 1}`;
            const codigo = carga.codigo || carga.codigoProducto || `PROD-${index + 1}`;
            const descripcion = carga.descripcion || carga.nombre || "Sin descripción";
            const litros = carga.litros || 0;
            
            let consumoTotal = carga.consumoTotal || 0;
            
            if (consumoTotal === 0 && carga.materiasPrimas && Array.isArray(carga.materiasPrimas)) {
                consumoTotal = carga.materiasPrimas.reduce((sum, mp) => sum + (mp.consumo || mp.cantidad || 0), 0);
            }
            
            const materiasPrimas = carga.materiasPrimas || [];
            
            return {
                id: carga.idTemp || carga.id || index,
                codigo: codigo,
                folio: folio,
                orden: folio,
                lote: folio,
                numeroLote: folio,
                descripcion: descripcion,
                nombre: descripcion,
                productoNombre: descripcion,
                litros: litros,
                consumoTotal: consumoTotal,
                tipo: carga.tipo || "Desconocido",
                operario: carga.operario || "N/A",
                materiasPrimas: materiasPrimas,
                fecha: carga.fecha || new Date().toLocaleDateString(),
                estado: carga.estado || "Programada"
            };
        });
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales]);

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
                                <button className="perfil-item" onClick={() => navigate("/mantenimiento")}>🛠️ Mantenimiento</button>
                                <div className="divider-perfil"></div>
                            </div>
                        )}
                    </div>

                    <div className="titulo-app">
                        <div className="logo-clickeable" onClick={volverAlMenuPrincipal} style={{ cursor: 'pointer' }}>
                            <img
                                src={logoPintu}
                                alt="Logo Pinturas"
                                className="logo-titulo"
                                style={{ height: '50px', width: 'auto', marginRight: '15px' }}
                            />
                        </div>
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
                    cantidades={cantidades}
                    totalLitrosActuales={totalLitrosActuales}
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
                                        📋 Lista Espera ({colaFiltrada.length})
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
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
                                <button
                                    className="card-op resumen-consumo-btn"
                                    onClick={handleVerResumenGlobal}
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(192, 0, 255, 0.15), rgba(128, 0, 255, 0.1))',
                                        border: '1px solid rgba(192, 0, 255, 0.3)'
                                    }}
                                >
                                    📊 Consumo ({totalCargas})
                                </button>
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
                            <button
                                className="btn-family-explorer"
                                onClick={() => navigate("/familias", {
                                    state: {
                                        familias: familias,
                                        tipoPintura: tipoPintura
                                    }
                                })}
                            >
                                🏷️ FAMILIAS
                            </button>
                        </div>
                    </div>

                    {tipoPintura === "Vinílica" ? (
                        <TableroVinilica
                            key={fechaRotacion.toISOString()}
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
                onGenerarLotes={generarLotesFinales}
                onSeleccionarCarga={(carga) => {
                    setCargaSeleccionada(carga);
                    setMostrarDetalle(true);
                    setMostrarModal(false);
                }}
            />

            <ModalInventarioBajo
                visible={mostrarModalInventario}
                alertas={alertasInventario[tipoPintura] || []}
                alertasRevisar={alertasRevisar[tipoPintura] || []}
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
                    const cargaEspecial = {
                        ...carga,
                        operario: "Lázaro",
                        maquina: "ESPECIAL",
                        tipo: tipoPintura
                    };
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
                    setCargasEspeciales(prev => ordenarCargas([...prev, cargaEspecial]));
                    setMostrarDetalle(false);
                    setMostrarEspeciales(true);
                }}
            />

            {/* Modal Resumen de Consumo Global con todas las funcionalidades */}
            <ModalResumenConsumo
                visible={mostrarModalResumen}
                cargando={cargandoResumen}
                resumenGlobal={resumenGlobal}
                cargasConConsumo={cargasConConsumo}
                totalCargas={totalCargas}
                totalLitros={totalLitrosProducir}
                onClose={() => setMostrarModalResumen(false)}
                onGuardar={handleGuardarYcerrar}
            />
        </div>
    );
}