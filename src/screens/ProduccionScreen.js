import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProduccion } from "../hooks/useProduccion";

// Servicios y Utils
import { getOperarioPorMaquina } from "../constants/config";
import { createProduccionHandlers } from "../utils/produccionHandlers";
import { verificarCargaReciente, verificarCargaPorFolio } from '../services/cargaService';

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
import Nivebar from "../components/Nivebar";

// Importar la imagen
import logoPintu from "../assets/PINTU.jpg";

// Estilos
import "../styles/styles.css";
import "../styles/rondas.css";
import "../styles/esmaltes.css";
import "../styles/familias-screen.css";

const STORAGE_KEY = 'cargas_almacenadas';

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
        calcularConsumoGlobal,
        operariosEsmaltes,
        cargandoOperarios
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

    // --- ESTADO PARA CONTADOR DE CARGAS EN LOCALSTORAGE ---
    const [cargasEnLocalStorage, setCargasEnLocalStorage] = useState(() => {
        try {
            const datos = localStorage.getItem(STORAGE_KEY);
            return datos ? JSON.parse(datos) : [];
        } catch {
            return [];
        }
    });

    // --- ESTADO PARA MODAL DE BÚSQUEDA SIN RESULTADOS ---
    const [mostrarModalSinResultados, setMostrarModalSinResultados] = useState(false);
    const [terminoBuscado, setTerminoBuscado] = useState("");

    // --- BUSCADOR DE CARGAS ---
    const [buscarCarga, setBuscarCarga] = useState("");
    const busquedaRef = useRef(null);

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

    // 🔴🔴🔴 NUEVO: ESTADO PARA OPERARIOS DE VINÍLICAS 🔴🔴🔴
    const [operariosPorMaquina, setOperariosPorMaquina] = useState({});

    // --- EFECTO PARA ACTUALIZAR EL CONTADOR CUANDO CAMBIA EL LOCALSTORAGE ---
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === STORAGE_KEY) {
                try {
                    const datos = e.newValue ? JSON.parse(e.newValue) : [];
                    setCargasEnLocalStorage(datos);
                    console.log('Storage actualizado desde otra pestaña:', datos.length);
                } catch (error) {
                    console.error('Error al parsear datos del storage:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // --- EFECTO PARA ACTUALIZAR EL CONTADOR CUANDO SE CIERRA EL MODAL ---
    useEffect(() => {
        if (!mostrarModal) {
            // Cuando se cierra el modal, actualizar el contador
            try {
                const datos = localStorage.getItem(STORAGE_KEY);
                if (datos) {
                    const parsed = JSON.parse(datos);
                    setCargasEnLocalStorage(parsed);
                    console.log('Contador actualizado al cerrar modal:', parsed.length);
                } else {
                    setCargasEnLocalStorage([]);
                }
            } catch (error) {
                console.error('Error al leer localStorage al cerrar modal:', error);
            }
        }
    }, [mostrarModal]);

    // --- EFECTO PARA SINCRONIZAR COLA CARGAS CON LOCALSTORAGE ---
    useEffect(() => {
        try {
            const datos = localStorage.getItem(STORAGE_KEY);
            if (datos) {
                const cargasStorage = JSON.parse(datos);
                // Filtrar solo las del tipo actual
                const cargasDelTipo = cargasStorage.filter(c => c.tipo === tipoPintura);

                // Verificar si hay diferencias
                const cargasActuales = colaCargas.filter(c => c.tipo === tipoPintura);

                // Si hay cargas en storage que no están en colaCargas, agregarlas
                const nuevasCargas = cargasDelTipo.filter(c =>
                    !cargasActuales.some(ex => ex.idTemp === c.idTemp)
                );

                if (nuevasCargas.length > 0) {
                    console.log('Sincronizando colaCargas con localStorage - agregando:', nuevasCargas.length);
                    setColaCargas(prev => {
                        // Evitar duplicados
                        const existentes = prev.filter(c => c.tipo === tipoPintura);
                        const idsExistentes = new Set(existentes.map(c => c.idTemp));
                        const cargasUnicas = nuevasCargas.filter(c => !idsExistentes.has(c.idTemp));
                        return [...prev, ...cargasUnicas];
                    });
                }
            }
        } catch (error) {
            console.error('Error sincronizando colaCargas con localStorage:', error);
        }
    }, [tipoPintura, mostrarModal]);

    // --- EFECTO PARA GUARDAR COLA CARGAS EN LOCALSTORAGE ---
    useEffect(() => {
        // Guardar colaCargas en localStorage cuando cambie
        try {
            const cargasActuales = colaCargas.filter(c => c.tipo === tipoPintura);
            // Obtener cargas actuales del storage
            const storageData = localStorage.getItem(STORAGE_KEY);
            let todasLasCargas = storageData ? JSON.parse(storageData) : [];

            // Eliminar las cargas del tipo actual del storage
            todasLasCargas = todasLasCargas.filter(c => c.tipo !== tipoPintura);

            // Agregar las cargas actuales
            todasLasCargas = [...todasLasCargas, ...cargasActuales];

            // Guardar en storage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(todasLasCargas));
            setCargasEnLocalStorage(todasLasCargas);
        } catch (error) {
            console.error('Error guardando colaCargas en localStorage:', error);
        }
    }, [colaCargas, tipoPintura]);

    // 🔴🔴🔴 FUNCIÓN PARA ACTUALIZAR OPERARIOS DE VINÍLICAS 🔴🔴🔴
    const handleOperariosActualizados = (nuevosOperarios) => {
        setOperariosPorMaquina(nuevosOperarios || {});
    };

    // Función para volver al menú principal
    const volverAlMenuPrincipal = () => {
        navigate("/");
    };

    // --- FUNCIONES DE NAVEGACIÓN DEL CALENDARIO ---
    const diaAnterior = () => {
        const nuevaFecha = new Date(fechaCargaBD);
        nuevaFecha.setDate(nuevaFecha.getDate() - 1);
        setFechaCargaBD(nuevaFecha);
    };

    const diaSiguiente = () => {
        const nuevaFecha = new Date(fechaCargaBD);
        nuevaFecha.setDate(nuevaFecha.getDate() + 1);
        setFechaCargaBD(nuevaFecha);
    };

    const irAHoyCarga = () => {
        setFechaCargaBD(new Date());
    };

    // --- FUNCIONES DE NAVEGACIÓN DEL PLANIFICADOR SEMANAL ---
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

    // --- FUNCIÓN DE BÚSQUEDA Y ABRIR MODAL DIRECTAMENTE ---
    const handleBuscarYAbirModal = async (termino) => {
        if (!termino || termino.trim() === "") {
            return;
        }

        if (termino.trim().length < 2) {
            return;
        }

        // Buscar en cargas locales primero
        let todasLasCargas = [];

        if (tipoPintura === "Vinílica") {
            rondas.forEach(fila => {
                fila.forEach(celda => {
                    if (celda) {
                        if (Array.isArray(celda)) {
                            todasLasCargas = [...todasLasCargas, ...celda];
                        } else {
                            todasLasCargas.push(celda);
                        }
                    }
                });
            });
        } else {
            todasLasCargas = [...cargasEsmaltesAsignadas];
        }

        todasLasCargas = [...todasLasCargas, ...cargasEspeciales];

        const terminoLower = termino.toLowerCase().trim();
        let cargaEncontrada = todasLasCargas.find(carga => {
            return (
                (carga.codigo && carga.codigo.toLowerCase() === terminoLower) ||
                (carga.folio && carga.folio.toLowerCase() === terminoLower) ||
                (carga.lote && carga.lote.toLowerCase() === terminoLower) ||
                (carga.numeroLote && carga.numeroLote.toLowerCase() === terminoLower)
            );
        });

        // Si encuentra localmente, abrir modal de detalle
        if (cargaEncontrada) {
            setCargaSeleccionada(cargaEncontrada);
            setMostrarDetalle(true);
            setBuscarCarga("");
            return;
        }

        // Si no encuentra localmente, buscar en la BD
        try {
            // Buscar por folio
            let folioData = await verificarCargaPorFolio(termino.toUpperCase(), null);

            if (folioData) {
                const cargaBD = {
                    codigo: folioData.codigoProducto || termino.toUpperCase(),
                    folio: folioData.folio || termino.toUpperCase(),
                    descripcion: `Carga con folio ${termino.toUpperCase()}`,
                    nombre: `Carga con folio ${termino.toUpperCase()}`,
                    operario: folioData.operario || 'No asignado',
                    litros: folioData.litros || folioData.cantidad || 0,
                    total: folioData.cantidad || folioData.litros || 0,
                    tipo: tipoPintura,
                    conteoLotes: 1,
                    detallesEnvasado: folioData.detallesEnvasado || [],
                    idTemp: `bd-folio-${Date.now()}-${Math.random()}`
                };

                setCargaSeleccionada(cargaBD);
                setMostrarDetalle(true);
                setBuscarCarga("");
                return;
            }

            // Buscar por código
            const codigoBusqueda = termino.toUpperCase();
            const fechas = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                fechas.push(d.toISOString().split("T")[0]);
            }

            const promesas = fechas.map(f => {
                return fetch(`http://localhost:8080/api/cargas/fecha?fecha=${f}`)
                    .then(res => res.json())
                    .catch(() => []);
            });

            const resultados = await Promise.all(promesas);
            const todas = resultados.flat();

            const coincidencias = todas.filter(reg => {
                const regProducto = reg.producto || reg.producto_id;
                return String(regProducto) === codigoBusqueda;
            });

            if (coincidencias.length > 0) {
                const foliosUnicos = [...new Set(coincidencias.map(c => c.folioHija || c.folio_hija || c.folio).filter(Boolean))];

                const cargaBD = {
                    codigo: codigoBusqueda,
                    folio: foliosUnicos.join(', ') || 'Múltiples folios',
                    descripcion: coincidencias[0].descripcion || `Carga de ${codigoBusqueda}`,
                    nombre: coincidencias[0].descripcion || `Carga de ${codigoBusqueda}`,
                    operario: [...new Set(coincidencias.map(c => c.operario).filter(Boolean))].join(', ') || 'No asignado',
                    litros: coincidencias.reduce((acc, c) => acc + Number(c.cantidad || 0), 0),
                    total: coincidencias.reduce((acc, c) => acc + Number(c.cantidad || 0), 0),
                    tipo: tipoPintura,
                    conteoLotes: coincidencias.length,
                    detallesEnvasado: coincidencias.map(c => ({
                        formato: c.envasadoId || c.envasado_id || c.envasado || 1,
                        cantidad: Number(c.cantidad || 0)
                    })),
                    idTemp: `bd-${Date.now()}-${Math.random()}`
                };

                setCargaSeleccionada(cargaBD);
                setMostrarDetalle(true);
                setBuscarCarga("");
            } else {
                // NO HAY RESULTADOS - Mostrar modal emergente
                setTerminoBuscado(termino);
                setMostrarModalSinResultados(true);
                setBuscarCarga("");
            }
        } catch (error) {
            console.error('Error buscando en BD:', error);
            setTerminoBuscado(termino);
            setMostrarModalSinResultados(true);
            setBuscarCarga("");
        }
    };

    // --- FUNCIÓN PARA MANEJAR LA TECLA ENTER ---
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const termino = e.target.value;
            if (termino.trim() !== "" && termino.trim().length >= 2) {
                handleBuscarYAbirModal(termino);
            }
        }
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

    useEffect(() => {
        if (cargarDatosPorFecha) {
            cargarDatosPorFecha(fechaCargaBD);
        }
    }, [fechaCargaBD, cargarDatosPorFecha]);

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

    // --- CALCULAR CONTADOR DE CARGAS EN LOCALSTORAGE PARA EL TIPO ACTUAL ---
    const contarCargasEnLocalStorage = useMemo(() => {
        return cargasEnLocalStorage.filter(c => c.tipo === tipoPintura).length;
    }, [cargasEnLocalStorage, tipoPintura]);

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

    // HANDLERS
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
    }, [tipoPintura, rondas, cargasEsmaltesAsignadas, cargasEspeciales, fechaRotacion, handleImportExcel, ordenarCargas]);

    // Calcular total de cargas y litros para mostrar en el modal
    const totalCargas = useMemo(() => {
        return [...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales].length;
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales]);

    const totalLitrosProducir = useMemo(() => {
        return [...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales]
            .reduce((sum, c) => sum + (c.litros || 0), 0).toFixed(2);
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales]);

    // Calcular cargas con su consumo individual
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

    // --- MODAL DE SIN RESULTADOS ---
    const ModalSinResultados = () => {
        if (!mostrarModalSinResultados) return null;

        return (
            <div className="modal-overlay" onClick={() => setMostrarModalSinResultados(false)}>
                <div className="modal-cargas sin-resultados-modal" onClick={(e) => e.stopPropagation()}>
                    <header className="modal-header">
                        <h2 style={{ color: '#f59e0b' }}>🔍 Sin resultados</h2>
                        <button className="close-btn" onClick={() => setMostrarModalSinResultados(false)}>&times;</button>
                    </header>
                    <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔎</div>
                        <p style={{ color: '#e0e0e0', fontSize: '16px', marginBottom: '8px' }}>
                            No se encontraron cargas para
                        </p>
                        <p style={{
                            color: '#a855f7',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            background: 'rgba(168, 85, 247, 0.1)',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            display: 'inline-block',
                            marginTop: '4px'
                        }}>
                            "{terminoBuscado}"
                        </p>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '16px' }}>
                            Revisa que el código o folio sea correcto
                        </p>
                    </div>
                    <footer className="modal-footer">
                        <button
                            className="btn-guardar"
                            onClick={() => setMostrarModalSinResultados(false)}
                            style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}
                        >
                            Entendido
                        </button>
                    </footer>
                </div>
            </div>
        );
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
                {/* NIVEBAR */}
                <Nivebar
                    tipoPintura={tipoPintura}
                    setTipoPintura={setTipoPintura}
                    datosPlanificador={datosPlanificador}
                    setMostrarModalPlanificador={setMostrarModalPlanificador}
                    fechaCargaBD={fechaCargaBD}
                    setFechaCargaBD={setFechaCargaBD}
                    buscarCarga={buscarCarga}
                    setBuscarCarga={setBuscarCarga}
                    handleBuscarYAbirModal={handleBuscarYAbirModal}
                    setMostrarModalSinResultados={setMostrarModalSinResultados}
                    logoPintu={logoPintu}
                    volverAlMenuPrincipal={volverAlMenuPrincipal}
                    menuPerfilAbierto={menuPerfilAbierto}
                    setMenuPerfilAbierto={setMenuPerfilAbierto}
                    perfilRef={perfilRef}
                    fechaRotacion={fechaRotacion}
                />

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
                                📂 Gestión ({contarCargasEnLocalStorage})
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
                                        📋 Lista Espera ({contarCargasEnLocalStorage})
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
                                    operariosPorMaquina={operariosPorMaquina}
                                    operariosEsmaltes={operariosEsmaltes}
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
                                <div className="resumen-operarios2" style={{ display: 'flex', gap: '8px' }}>
                                    <button className={`card-op2 ${modoEsmalte === null ? 'active' : ''}`} onClick={() => setModoEsmalte(null)}>
                                        🌍 General ({stats.total})
                                    </button>
                                    <button className={`card-op2 ${modoEsmalte === 'DIRECTO' ? 'active' : ''}`} onClick={() => setModoEsmalte('DIRECTO')}>
                                        🚀 Directos ({stats.directos})
                                    </button>
                                    <button className={`card-op2 ${modoEsmalte === 'MOLIENDA' ? 'active' : ''}`} onClick={() => setModoEsmalte('MOLIENDA')}>
                                        ⚙️ Molienda ({stats.molienda})
                                    </button>
                                    <button className={`card-op2 ${modoEsmalte === 'PREPARADO' ? 'active' : ''}`} onClick={() => setModoEsmalte('PREPARADO')}>
                                        🧪 Preparado ({stats.preparado})
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* CALENDARIO CON FLECHAS */}
                            <div className="calendar-wrapper">
                                <div className="calendar-nav-container">
                                    <button
                                        className="calendar-nav-btn"
                                        onClick={diaAnterior}
                                        title="Día anterior"
                                        aria-label="Día anterior"
                                    >
                                        ◀
                                    </button>

                                    <input
                                        type="date"
                                        className="calendar-date-input"
                                        value={fechaCargaBD.toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            const valor = e.target.value;
                                            if (!valor) return;
                                            const nuevaFecha = new Date(valor + 'T00:00:00');
                                            setFechaCargaBD(nuevaFecha);
                                        }}
                                        title="Seleccionar fecha"
                                    />

                                    <button
                                        className="calendar-nav-btn"
                                        onClick={diaSiguiente}
                                        title="Día siguiente"
                                        aria-label="Día siguiente"
                                    >
                                        ▶
                                    </button>
                                </div>

                                <button
                                    className="btn-hoy-calendar"
                                    onClick={irAHoyCarga}
                                    title="Volver al día de hoy"
                                >
                                    📅 Hoy
                                </button>
                            </div>

                            {/* BOTÓN DE FAMILIAS */}
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
                            onOperariosActualizados={handleOperariosActualizados}
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

            {/* MODAL DE SIN RESULTADOS */}
            <ModalSinResultados />

            {/* Modales existentes */}
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
                onEliminarCarga={(id) => {
                    setColaCargas(prev => prev.filter(c => c.idTemp !== id));
                    // También limpiar localStorage si usas
                    localStorage.removeItem('cargas_almacenadas');
                }}
                onVaciarTodo={() => {
                    setColaCargas(prev => prev.filter(c => c.tipo !== tipoPintura));
                    localStorage.removeItem('cargas_almacenadas');
                }}
                onGuardar={(c) => {
                    guardarCargasEnRondas(c);
                    // LIMPIAR LA COLA DE CARGAS DESPUÉS DE GUARDAR
                    setColaCargas(prev => prev.filter(c => c.tipo !== tipoPintura));
                    // Limpiar localStorage
                    localStorage.removeItem('cargas_almacenadas');
                    setMostrarModal(false);
                }}
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

            {/* Modal Resumen de Consumo Global */}
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