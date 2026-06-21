// src/screens/ConsumosScreen.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import SidebarMateriaPrima from "../components/SidebarMateriaPrima";
import TanqueVisual from "../components/TanqueVisual";
import "../styles/consumos.css";

export default function ConsumosScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [consumos, setConsumos] = useState([]);
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [baseSeleccionada, setBaseSeleccionada] = useState("todos");
    const [filtroFecha, setFiltroFecha] = useState("semana");
    const [tanques, setTanques] = useState([]);
    const [resumenDashboard, setResumenDashboard] = useState({
        totalTanques: 0,
        criticos: 0,
        alerta: 0,
        normales: 0
    });
    const [sidebarDataLoaded, setSidebarDataLoaded] = useState(false);
    const [estadisticas, setEstadisticas] = useState({
        totalConsumido: 0,
        promedioDiario: 0,
        maximoDiario: 0,
        minimoDiario: 0,
        diasConConsumo: 0
    });

    // ===== ESTADOS PARA EL BUSCADOR =====
    const [busqueda, setBusqueda] = useState("");
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState([]);
    const buscadorRef = useRef(null);

    // ===== FUNCIÓN PARA FORMATEAR NÚMEROS CON COMAS =====
    const formatearNumero = (numero, decimales = 2) => {
        if (numero === undefined || numero === null || isNaN(numero)) return '0';
        return Number(numero).toLocaleString('en-US', {
            minimumFractionDigits: decimales,
            maximumFractionDigits: decimales
        });
    };

    // ===== FUNCIONES PARA OBTENER INFORMACIÓN DEL TIPO =====
    const getTipoIcono = (tipo) => {
        const iconos = {
            'RESINA': '🛢️',
            'BASE': '🛢️',
            'PIGMENTO': '🎨',
            'SOLVENTE': '💧',
            'ADITIVO': '⚗️',
            'CARGA': '📦'
        };
        return iconos[tipo] || '📌';
    };

    const getTipoColor = (tipo) => {
        const colores = {
            'RESINA': '#8B5CF6',
            'BASE': '#8B5CF6',
            'PIGMENTO': '#EC4899',
            'SOLVENTE': '#06B6D4',
            'ADITIVO': '#F59E0B',
            'CARGA': '#10B981'
        };
        return colores[tipo] || '#6B7280';
    };

    const getTipoDescripcion = (tipo) => {
        const descripciones = {
            'RESINA': 'Material base polimérico para formulaciones',
            'BASE': 'Material base polimérico para formulaciones',
            'PIGMENTO': 'Proporciona color y opacidad',
            'SOLVENTE': 'Ajusta viscosidad y facilita aplicación',
            'ADITIVO': 'Mejora propiedades específicas',
            'CARGA': 'Modifica propiedades físicas y reduce costos'
        };
        return descripciones[tipo] || 'Material para formulación';
    };

    const getEstadoNivel = (nivelActual, capacidadMaxima, umbralCritico, umbralAlerta) => {
        if (!capacidadMaxima || capacidadMaxima === 0) return { texto: 'Sin datos', color: '#6B7280', icono: '❓' };
        
        const porcentaje = (nivelActual / capacidadMaxima) * 100;
        
        if (umbralCritico && nivelActual <= umbralCritico) {
            return { texto: 'CRÍTICO', color: '#EF4444', icono: '🔴' };
        }
        if (umbralAlerta && nivelActual <= umbralAlerta) {
            return { texto: 'ALERTA', color: '#F59E0B', icono: '🟡' };
        }
        if (porcentaje > 80) {
            return { texto: 'ÓPTIMO', color: '#10B981', icono: '🟢' };
        }
        if (porcentaje > 50) {
            return { texto: 'NORMAL', color: '#3B82F6', icono: '🔵' };
        }
        return { texto: 'BAJO', color: '#8B5CF6', icono: '🟣' };
    };

    // LEER PARÁMETRO 'base' DE LA URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const baseParam = params.get('base');
        if (baseParam) {
            const existe = materiasPrimas.some(m => m.codigo === baseParam);
            if (existe) {
                setBaseSeleccionada(baseParam);
                const mp = materiasPrimas.find(m => m.codigo === baseParam);
                if (mp) {
                    setBusqueda(`${mp.codigo} - ${mp.nombre}`);
                }
            } else {
                setBaseSeleccionada(baseParam);
            }
        }
    }, [location.search, materiasPrimas]);

    // ===== FILTRAR SUGERENCIAS =====
    useEffect(() => {
        if (busqueda.trim() === "") {
            setSugerenciasFiltradas([]);
            return;
        }

        const busquedaLower = busqueda.toLowerCase().trim();
        const filtradas = materiasConConsumo.filter(mp => {
            const codigoMatch = mp.codigo.toLowerCase().includes(busquedaLower);
            const nombreMatch = mp.nombre.toLowerCase().includes(busquedaLower);
            return codigoMatch || nombreMatch;
        });

        setSugerenciasFiltradas(filtradas.slice(0, 10));
    }, [busqueda, materiasPrimas, consumos]);

    // ===== CERRAR SUGERENCIAS AL HACER CLICK FUERA =====
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buscadorRef.current && !buscadorRef.current.contains(event.target)) {
                setMostrarSugerencias(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [todasLasMP, resumenData] = await Promise.all([
                materiaPrimaService.listarTodas(),
                materiaPrimaService.getResumenDashboard()
            ]);

            setMateriasPrimas(todasLasMP);
            setTanques(todasLasMP);
            setResumenDashboard(resumenData);
            setSidebarDataLoaded(true);

            cargarConsumos();
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    const cargarConsumos = () => {
        try {
            const consumosGuardados = JSON.parse(localStorage.getItem('consumosBases') || '[]');
            setConsumos(consumosGuardados);
            calcularEstadisticas(consumosGuardados);
        } catch (error) {
            console.error("Error cargando consumos:", error);
            setConsumos([]);
        }
    };

    const calcularEstadisticas = (datos) => {
        let datosFiltrados = datos;
        if (baseSeleccionada !== 'todos') {
            datosFiltrados = datos.filter(c => c.baseCodigo === baseSeleccionada);
        }

        const hoy = new Date();
        let fechaInicio = new Date();
        if (filtroFecha === 'semana') {
            fechaInicio.setDate(hoy.getDate() - 7);
        } else if (filtroFecha === 'mes') {
            fechaInicio.setMonth(hoy.getMonth() - 1);
        } else if (filtroFecha === 'trimestre') {
            fechaInicio.setMonth(hoy.getMonth() - 3);
        }
        const fechaLimite = fechaInicio.toISOString().split('T')[0];
        datosFiltrados = datosFiltrados.filter(c => c.fecha >= fechaLimite);

        const total = datosFiltrados.reduce((sum, c) => sum + c.cantidad, 0);
        const cantidades = datosFiltrados.map(c => c.cantidad);
        const maximo = cantidades.length > 0 ? Math.max(...cantidades) : 0;
        const minimo = cantidades.length > 0 ? Math.min(...cantidades) : 0;
        
        const dias = {};
        datosFiltrados.forEach(c => {
            if (!dias[c.fecha]) dias[c.fecha] = 0;
            dias[c.fecha] += c.cantidad;
        });
        const diasArray = Object.values(dias);
        const promedio = diasArray.length > 0 ? total / diasArray.length : 0;
        const diasConConsumo = diasArray.length;

        setEstadisticas({
            totalConsumido: total,
            promedioDiario: promedio,
            maximoDiario: maximo,
            minimoDiario: minimo,
            diasConConsumo: diasConConsumo
        });
    };

    useEffect(() => {
        cargarConsumos();
    }, [baseSeleccionada, filtroFecha]);

    useEffect(() => {
        cargarDatos();
    }, []);

    const limpiarFiltroBase = () => {
        setBaseSeleccionada('todos');
        setBusqueda("");
        setMostrarSugerencias(false);
        navigate('/consumos');
    };

    const getBaseSeleccionadaNombre = () => {
        if (baseSeleccionada === 'todos') return 'Todas las materias primas';
        const mp = materiasPrimas.find(m => m.codigo === baseSeleccionada);
        if (mp) {
            return `${mp.codigo} - ${mp.nombre}`;
        }
        return baseSeleccionada;
    };

    const inventarioTotal = tanques.reduce((sum, t) => sum + (t.nivelActual || 0), 0);
    const capacidadTotal = tanques.reduce((sum, t) => sum + (t.capacidadMaxima || 0), 0);
    const tanquesCriticos = tanques.filter(t => t.critico);

    const getMateriasConConsumo = () => {
        return materiasPrimas;
    };

    const consumosPorDia = () => {
        const datos = consumos.filter(c => {
            if (baseSeleccionada !== 'todos' && c.baseCodigo !== baseSeleccionada) return false;
            return true;
        });

        const agrupados = {};
        datos.forEach(c => {
            if (!agrupados[c.fecha]) agrupados[c.fecha] = 0;
            agrupados[c.fecha] += c.cantidad;
        });

        return Object.entries(agrupados)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-14)
            .map(([fecha, cantidad]) => ({ fecha, cantidad }));
    };

    const consumosPorBase = () => {
        const agrupados = {};
        consumos.forEach(c => {
            if (!agrupados[c.baseCodigo]) agrupados[c.baseCodigo] = 0;
            agrupados[c.baseCodigo] += c.cantidad;
        });
        return Object.entries(agrupados)
            .sort((a, b) => b[1] - a[1])
            .map(([codigo, cantidad]) => ({ codigo, cantidad }));
    };

    // ===== SELECCIONAR UNA MATERIA PRIMA DEL BUSCADOR =====
    const seleccionarMateriaPrima = (mp) => {
        setBaseSeleccionada(mp.codigo);
        setBusqueda(`${mp.codigo} - ${mp.nombre}`);
        setMostrarSugerencias(false);
        navigate(`/consumos?base=${mp.codigo}`);
    };

    // ===== MANEJAR CAMBIO EN EL INPUT =====
    const handleBusquedaChange = (e) => {
        const valor = e.target.value;
        setBusqueda(valor);
        setMostrarSugerencias(true);
        
        if (valor.trim() === "") {
            setBaseSeleccionada('todos');
            navigate('/consumos');
        }
    };

    // ===== MANEJAR TECLA ENTER =====
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && sugerenciasFiltradas.length > 0) {
            seleccionarMateriaPrima(sugerenciasFiltradas[0]);
        }
        if (e.key === 'Escape') {
            setMostrarSugerencias(false);
        }
    };

    if (loading) {
        return (
            <div className="consumos-container">
                <div className="consumos-loading-screen">
                    <div className="spinner-neon"></div>
                    <p>Cargando datos de consumos...</p>
                </div>
            </div>
        );
    }

    const materiasConConsumo = getMateriasConConsumo();
    const materiaSeleccionada = materiasPrimas.find(m => m.codigo === baseSeleccionada);

    return (
        <div className="consumos-container">
            <div className="consumos-glass-panel">
                <SidebarMateriaPrima 
                    seccionActiva="consumos"
                    inventarioTotal={inventarioTotal}
                    capacidadTotal={capacidadTotal}
                    tanquesCriticos={tanquesCriticos}
                    onCambiarSeccion={null}
                    mostrarBases={true}
                />

                <main className="consumos-main">
                    <header className="consumos-header">
                        <div className="header-titulo">
                            <h1>📊 Trazabilidad de Consumos</h1>
                            <p>Monitoreo detallado del consumo de materias primas por día y producto</p>
                        </div>
                        {baseSeleccionada !== 'todos' && (
                            <div className="base-seleccionada-badge">
                                <span className="badge-icon">🎯</span>
                                <span className="badge-text">Filtrando: {getBaseSeleccionadaNombre()}</span>
                                <button className="badge-clear" onClick={limpiarFiltroBase}>
                                    ✖
                                </button>
                            </div>
                        )}
                    </header>

                    <div className="consumos-workspace">
                        <div className="consumos-filtros">
                            {/* ===== BUSCADOR DE MATERIAS PRIMAS ===== */}
                            <div className="filtro-grupo buscador-container" ref={buscadorRef}>
                                <label>🔍 Buscar Materia Prima:</label>
                                <div className="buscador-wrapper">
                                    <input
                                        type="text"
                                        className="buscador-input"
                                        placeholder="Buscar por código o nombre..."
                                        value={busqueda}
                                        onChange={handleBusquedaChange}
                                        onKeyDown={handleKeyDown}
                                        onFocus={() => setMostrarSugerencias(true)}
                                    />
                                    {busqueda && (
                                        <button 
                                            className="buscador-clear"
                                            onClick={limpiarFiltroBase}
                                            title="Limpiar búsqueda"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                
                                {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
                                    <div className="sugerencias-lista">
                                        {sugerenciasFiltradas.map((mp) => (
                                            <div
                                                key={mp.id}
                                                className="sugerencia-item"
                                                onClick={() => seleccionarMateriaPrima(mp)}
                                            >
                                                <span className="sugerencia-codigo">{mp.codigo}</span>
                                                <span className="sugerencia-nombre">{mp.nombre}</span>
                                                <span className="sugerencia-tipo">{getTipoIcono(mp.tipo)} {mp.tipo || 'N/A'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {mostrarSugerencias && busqueda.trim() !== "" && sugerenciasFiltradas.length === 0 && (
                                    <div className="sugerencias-vacio">
                                        <span>🔍</span>
                                        <p>No se encontraron materias primas</p>
                                    </div>
                                )}
                            </div>

                            <div className="filtro-grupo">
                                <label>Período:</label>
                                <div className="filtro-botones">
                                    <button 
                                        className={`filtro-periodo ${filtroFecha === 'semana' ? 'active' : ''}`}
                                        onClick={() => setFiltroFecha('semana')}
                                    >
                                        Semana
                                    </button>
                                    <button 
                                        className={`filtro-periodo ${filtroFecha === 'mes' ? 'active' : ''}`}
                                        onClick={() => setFiltroFecha('mes')}
                                    >
                                        Mes
                                    </button>
                                    <button 
                                        className={`filtro-periodo ${filtroFecha === 'trimestre' ? 'active' : ''}`}
                                        onClick={() => setFiltroFecha('trimestre')}
                                    >
                                        Trimestre
                                    </button>
                                </div>
                            </div>

                            <button 
                                className="btn-refrescar"
                                onClick={() => cargarConsumos()}
                            >
                                🔄 Refrescar
                            </button>
                        </div>

                        <div className="estadisticas-grid">
                            <div className="estadistica-card">
                                <div className="estadistica-icon">📦</div>
                                <div className="estadistica-info">
                                    <span className="estadistica-valor">{formatearNumero(estadisticas.totalConsumido)} T</span>
                                    <span className="estadistica-label">Total consumido</span>
                                </div>
                            </div>
                            <div className="estadistica-card">
                                <div className="estadistica-icon">📊</div>
                                <div className="estadistica-info">
                                    <span className="estadistica-valor">{formatearNumero(estadisticas.promedioDiario)} T</span>
                                    <span className="estadistica-label">Promedio diario</span>
                                </div>
                            </div>
                            <div className="estadistica-card">
                                <div className="estadistica-icon">📈</div>
                                <div className="estadistica-info">
                                    <span className="estadistica-valor">{formatearNumero(estadisticas.maximoDiario)} T</span>
                                    <span className="estadistica-label">Máximo diario</span>
                                </div>
                            </div>
                            <div className="estadistica-card">
                                <div className="estadistica-icon">📅</div>
                                <div className="estadistica-info">
                                    <span className="estadistica-valor">{estadisticas.diasConConsumo}</span>
                                    <span className="estadistica-label">Días con consumo</span>
                                </div>
                            </div>
                        </div>

                        {/* ===== CONSUMO POR MATERIA PRIMA ===== */}
                        <div className="consumos-por-base">
                            <h3>📊 {baseSeleccionada !== 'todos' ? `Consumo detallado de ${getBaseSeleccionadaNombre()}` : 'Consumo por materia prima'}</h3>
                            
                            {baseSeleccionada !== 'todos' && materiaSeleccionada ? (
                                <div className="base-detalle-container">
                                    {/* ===== TANQUE VISUAL CON GRÁFICA ===== */}
                                    <TanqueVisual
                                        nivelActual={materiaSeleccionada.nivelActual || 0}
                                        capacidadMaxima={materiaSeleccionada.capacidadMaxima || 0}
                                        unidad={materiaSeleccionada.unidad || 'L'}
                                        nombre={materiaSeleccionada.nombre}
                                        codigo={materiaSeleccionada.codigo}
                                        tipo={materiaSeleccionada.tipo}
                                        umbralCritico={materiaSeleccionada.umbralCritico}
                                        umbralAlerta={materiaSeleccionada.umbralAlerta}
                                    />

                                    <div className="base-detalle-header">
                                        <div className="base-detalle-info">
                                            <span className="detalle-codigo">{baseSeleccionada}</span>
                                            <span className="detalle-nombre">{getBaseSeleccionadaNombre()}</span>
                                        </div>
                                        <div className="base-detalle-total">
                                            <span>Total consumido: </span>
                                            <strong>{formatearNumero(estadisticas.totalConsumido)} T</strong>
                                        </div>
                                    </div>

                                    <div className="base-detalle-dias">
                                        <h4>📅 Consumo diario</h4>
                                        <div className="base-detalle-grid">
                                            {(() => {
                                                const consumosFiltrados = consumos
                                                    .filter(c => c.baseCodigo === baseSeleccionada)
                                                    .sort((a, b) => b.fecha.localeCompare(a.fecha))
                                                    .slice(0, 14);
                                                
                                                const dias = {};
                                                consumosFiltrados.forEach(c => {
                                                    if (!dias[c.fecha]) dias[c.fecha] = 0;
                                                    dias[c.fecha] += c.cantidad;
                                                });
                                                
                                                const datosDias = Object.entries(dias)
                                                    .sort((a, b) => a[0].localeCompare(b[0]))
                                                    .map(([fecha, cantidad]) => ({ fecha, cantidad }));
                                                
                                                if (datosDias.length === 0) {
                                                    return <div className="sin-consumos">No hay consumos registrados para esta materia prima</div>;
                                                }
                                                
                                                const max = Math.max(...datosDias.map(d => d.cantidad), 1);
                                                
                                                return datosDias.map((item, index) => {
                                                    const altura = (item.cantidad / max) * 100;
                                                    const fecha = new Date(item.fecha);
                                                    const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][fecha.getDay()];
                                                    
                                                    return (
                                                        <div key={index} className="detalle-dia-item">
                                                            <div className="detalle-dia-label">
                                                                <span className="detalle-dia-semana">{diaSemana}</span>
                                                                <span className="detalle-dia-fecha">{fecha.getDate()}</span>
                                                            </div>
                                                            <div className="detalle-dia-barra-wrapper">
                                                                <div 
                                                                    className="detalle-dia-barra"
                                                                    style={{
                                                                        height: `${Math.max(altura, 10)}%`,
                                                                        background: `linear-gradient(to top, ${getTipoColor(materiaSeleccionada.tipo)}, ${getTipoColor(materiaSeleccionada.tipo)}dd)`,
                                                                        borderRadius: '4px',
                                                                        minHeight: '10px',
                                                                        width: '100%',
                                                                        transition: 'all 0.3s ease',
                                                                        position: 'relative'
                                                                    }}
                                                                >
                                                                    <span className="detalle-dia-valor">{formatearNumero(item.cantidad, 1)}T</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="base-consumos-grid">
                                    {consumosPorBase().slice(0, 10).map(item => {
                                        const total = consumosPorBase().reduce((sum, i) => sum + i.cantidad, 0);
                                        const porcentaje = total > 0 ? (item.cantidad / total) * 100 : 0;
                                        const mp = materiasPrimas.find(m => m.codigo === item.codigo);
                                        return (
                                            <div key={item.codigo} className="base-consumo-card">
                                                <div className="base-consumo-header">
                                                    <span className="base-consumo-codigo">{item.codigo}</span>
                                                    <span className="base-consumo-cantidad">{formatearNumero(item.cantidad)} T</span>
                                                </div>
                                                <div className="base-consumo-sub">{mp?.nombre || item.codigo}</div>
                                                <div className="base-consumo-barra">
                                                    <div 
                                                        className="base-consumo-fill"
                                                        style={{ 
                                                            width: `${porcentaje}%`,
                                                            background: `linear-gradient(90deg, ${mp ? getTipoColor(mp.tipo) : '#7c3aed'}, ${mp ? getTipoColor(mp.tipo) + 'dd' : '#c000ff'})`
                                                        }}
                                                    />
                                                </div>
                                                <span className="base-consumo-porcentaje">{porcentaje.toFixed(1)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ===== TABLA DE DETALLE ===== */}
                        <div className="consumos-tabla-container">
                            <h3>📋 Detalle de consumos</h3>
                            <div className="tabla-scroll">
                                <table className="consumos-tabla">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Materia Prima</th>
                                            <th>Lote</th>
                                            <th>Producto</th>
                                            <th>Cantidad (T)</th>
                                            <th>Operario</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {consumos
                                            .filter(c => {
                                                if (baseSeleccionada !== 'todos' && c.baseCodigo !== baseSeleccionada) return false;
                                                return true;
                                            })
                                            .sort((a, b) => b.fecha.localeCompare(a.fecha))
                                            .slice(0, 50)
                                            .map((consumo, index) => {
                                                const mp = materiasPrimas.find(m => m.codigo === consumo.baseCodigo);
                                                return (
                                                    <tr key={index}>
                                                        <td>{consumo.fecha}</td>
                                                        <td>
                                                            <span className="base-tag">{consumo.baseCodigo}</span>
                                                            {mp && <span className="base-nombre-tag">{mp.nombre}</span>}
                                                        </td>
                                                        <td>
                                                            <span className="lote-tag">{consumo.lote}</span>
                                                        </td>
                                                        <td>{consumo.codigoProducto}</td>
                                                        <td>
                                                            <strong>{formatearNumero(consumo.cantidad)} T</strong>
                                                        </td>
                                                        <td>{consumo.operario || 'N/A'}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                            {consumos.length === 0 && (
                                <div className="sin-consumos">
                                    <span>📭</span>
                                    <p>No hay consumos registrados</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}