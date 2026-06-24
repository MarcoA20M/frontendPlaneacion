// src/screens/BasesScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import SidebarMateriaPrima from "../components/SidebarMateriaPrima";
import "../styles/bases.css";

export default function BasesScreen() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [bases, setBases] = useState([]);
    const [todasLasMP, setTodasLasMP] = useState([]);
    const [filtro, setFiltro] = useState("todas");
    const [busqueda, setBusqueda] = useState("");
    const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
    const [mostrarModalConsumo, setMostrarModalConsumo] = useState(false);
    const [baseSeleccionada, setBaseSeleccionada] = useState(null);
    const [consumosBase, setConsumosBase] = useState([]);
    const [cargandoConsumos, setCargandoConsumos] = useState(false);
    const [formCompra, setFormCompra] = useState({
        cantidad: "",
        documentoReferencia: "",
        observaciones: "",
        usuario: "Admin"
    });
    const [actualizando, setActualizando] = useState(false);

    // ===== CONFIGURACIÓN DE TAMAÑOS DE CARGA POR BASE =====
    const TAMANOS_CARGA = {
        'BRO40': 650,
        'BRE40': 500,
        'BAC40': 700,
        'BAL40': 700,
        'BAO40': 600,
        'BNM40': 700,
        'BVE40': 200,
        'BAE40': 250,
        'BNE30': 800,
        'BNE10': 1000,
        'BBE20': 1169,
        'BBE30': 1236,
        'BED10': 500,
        'BVE10': 150,
        'BSR10': 30,
        'BASA10': 30,
        'BSP10': 30,
        'BSN10': 30,
    };

    const CODIGOS_BASES = ['BRO40', 'BRE40', 'BAC40', 'BAL40', 'BAO40', 'BNM40', 'BVE40', 'BAE40',
        'BNE30', 'BNE10', 'BBE20', 'BBE30', 'BED10', 'BVE10'];

    const cargarBases = async () => {
        setLoading(true);
        try {
            const todas = await materiaPrimaService.listarTodas();
            setTodasLasMP(todas);

            const basesFiltradas = todas.filter(mp =>
                mp.tipo === 'BASE' && CODIGOS_BASES.includes(mp.codigo)
            );
            setBases(basesFiltradas);
        } catch (error) {
            console.error("Error cargando bases:", error);
        } finally {
            setLoading(false);
        }
    };

    const recargarBases = async () => {
        if (actualizando) return;
        setActualizando(true);
        try {
            const todas = await materiaPrimaService.listarTodas();
            setTodasLasMP(todas);
            const basesFiltradas = todas.filter(mp =>
                mp.tipo === 'BASE' && CODIGOS_BASES.includes(mp.codigo)
            );
            setBases(basesFiltradas);
        } catch (error) {
            console.error("Error recargando bases:", error);
        } finally {
            setActualizando(false);
        }
    };

    // ===== FUNCIÓN PARA CALCULAR CARGAS RECOMENDADAS (NUEVA LÓGICA) =====
// ===== FUNCIÓN PARA CALCULAR CARGAS RECOMENDADAS (CORREGIDA) =====
const calcularCargasRecomendadas = (base) => {
    const tamanoCarga = TAMANOS_CARGA[base.codigo] || 500;
    const espacioDisponible = base.capacidadMaxima - base.nivelActual;

    if (espacioDisponible <= 0) {
        return {
            cargasCompletas: 0,
            cargasParciales: 0,
            espacioDisponible: 0,
            tamanoCarga: tamanoCarga,
            mensaje: '🟢 Tanque lleno',
            recomendacion: 'No necesita cargas',
            color: '#10B981',
            nivel: 'lleno',
            icono: '🟢',
            tieneEspacio: false,
            urgencia: 'bajo'
        };
    }

    const cargasCompletas = Math.floor(espacioDisponible / tamanoCarga);
    const espacioRestante = espacioDisponible - (cargasCompletas * tamanoCarga);

    let mensaje = '';
    let recomendacion = '';
    let color = '#10B981';
    let nivel = 'suficiente';
    let icono = '🟢';
    let urgencia = 'bajo';

    if (cargasCompletas === 0) {
        // 🟢 VERDE: Poco espacio, NO necesita cargas (tanque casi lleno)
        mensaje = `🟢 ${espacioDisponible.toFixed(0)} ${base.unidad} disponible`;
        recomendacion = `No necesita cargas, tanque con espacio limitado`;
        color = '#10B981';
        nivel = 'suficiente';
        icono = '🟢';
        urgencia = 'bajo';
    } else if (cargasCompletas === 1) {
        // 🟡 AMARILLO: Espacio para 1 carga, próximo a necesitar
        mensaje = `🟡 ${espacioDisponible.toFixed(0)} ${base.unidad} disponible (1 carga)`;
        recomendacion = `Próximo a necesitar recargar`;
        color = '#F59E0B';
        nivel = 'alerta';
        icono = '🟡';
        urgencia = 'medio';
    } else if (cargasCompletas >= 2) {
        // 🔴 ROJO: Mucho espacio, necesita cargas urgentemente
        mensaje = `🔴 ${espacioDisponible.toFixed(0)} ${base.unidad} disponible (${cargasCompletas} cargas)`;
        recomendacion = `¡URGENTE! Necesita recargar`;
        color = '#EF4444';
        nivel = 'critico';
        icono = '🔴';
        urgencia = 'alto';
    } else {
        mensaje = `🟢 Tanque lleno`;
        recomendacion = 'No necesita cargas';
        color = '#10B981';
        nivel = 'lleno';
        icono = '🟢';
        urgencia = 'bajo';
    }

    return {
        cargasCompletas,
        cargasParciales: espacioRestante > 0 ? 1 : 0,
        espacioDisponible,
        tamanoCarga,
        espacioRestante,
        mensaje,
        recomendacion,
        color,
        nivel,
        icono,
        urgencia,
        tieneEspacio: cargasCompletas > 0 || espacioRestante > 0
    };
};
    const verConsumos = (base) => {
        setBaseSeleccionada(base);
        setMostrarModalConsumo(true);
        setCargandoConsumos(true);

        try {
            const consumosGuardados = JSON.parse(localStorage.getItem('consumosBases') || '[]');
            const consumosFiltrados = consumosGuardados.filter(c => c.baseCodigo === base.codigo);
            const hoy = new Date();
            const hace7Dias = new Date();
            hace7Dias.setDate(hoy.getDate() - 7);
            const fechaLimite = hace7Dias.toISOString().split('T')[0];
            const consumosSemana = consumosFiltrados.filter(c => c.fecha >= fechaLimite);

            const consumosAgrupados = {};
            consumosSemana.forEach(c => {
                const key = `${c.lote}-${c.codigoProducto}`;
                if (!consumosAgrupados[key]) {
                    consumosAgrupados[key] = {
                        lote: c.lote,
                        codigoProducto: c.codigoProducto,
                        cantidad: 0,
                        fecha: c.fecha,
                        operario: c.operario || 'N/A'
                    };
                }
                consumosAgrupados[key].cantidad += c.cantidad;
            });

            const consumosFormateados = Object.values(consumosAgrupados)
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((c, index) => ({
                    id: index + 1,
                    lote: c.lote,
                    codigoProducto: c.codigoProducto,
                    cantidad: c.cantidad,
                    fecha: c.fecha,
                    operario: c.operario
                }));

            setConsumosBase(consumosFormateados);
        } catch (error) {
            console.error("Error cargando consumos:", error);
            setConsumosBase([]);
        } finally {
            setCargandoConsumos(false);
        }
    };

    useEffect(() => {
        window.recargarBases = recargarBases;
        return () => {
            delete window.recargarBases;
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(recargarBases, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        cargarBases();
    }, []);

    const inventarioTotal = todasLasMP.reduce((sum, mp) => sum + (mp.nivelActual || 0), 0);
    const capacidadTotal = todasLasMP.reduce((sum, mp) => sum + (mp.capacidadMaxima || 0), 0);
    const todasCriticas = todasLasMP.filter(mp => mp.critico);

    const basesCriticas = bases.filter(b => (b.nivelActual / b.capacidadMaxima) * 100 <= 20);
    const basesAlerta = bases.filter(b => {
        const pct = (b.nivelActual / b.capacidadMaxima) * 100;
        return pct > 20 && pct <= 40;
    });

    // ===== BASES CON RECOMENDACIONES =====
    const basesConRecomendacion = bases.filter(base => {
        const info = calcularCargasRecomendadas(base);
        return info.tieneEspacio;
    });

    // ===== FILTRADO DE BASES =====
    const basesMostrar = bases.filter(base => {
        const termino = busqueda.toLowerCase().trim();
        if (!termino) return true;
        return base.codigo?.toLowerCase().includes(termino) ||
            base.nombre?.toLowerCase().includes(termino);
    }).filter(base => {
        const porcentaje = (base.nivelActual / base.capacidadMaxima) * 100;
        
        if (filtro === 'todas') return true;
        if (filtro === 'cargas') return true;
        
        if (filtro === 'critico') return porcentaje <= 20;
        if (filtro === 'alerta') return porcentaje > 20 && porcentaje <= 40;
        if (filtro === 'normal') return porcentaje > 40;
        return true;
    });

    // ===== OBTENER BASES PARA RECOMENDACIONES (con toda la info) =====
    const basesRecomendacionConInfo = bases
        .map(base => {
            const info = calcularCargasRecomendadas(base);
            return { ...base, ...info };
        })
        .filter(base => base.tieneEspacio)
        .sort((a, b) => {
            // Ordenar por urgencia: crítico (rojo) primero, luego alerta (amarillo), luego suficiente (verde)
            const prioridad = { 'critico': 0, 'alerta': 1, 'suficiente': 2, 'lleno': 3 };
            return prioridad[a.nivel] - prioridad[b.nivel];
        });

    const handleRegistrarCompra = async () => {
        if (!formCompra.cantidad || formCompra.cantidad <= 0) {
            alert("Ingresa una cantidad válida");
            return;
        }

        try {
            await materiaPrimaService.registrarCompra({
                materiaPrimaId: baseSeleccionada.id,
                cantidad: parseFloat(formCompra.cantidad),
                documentoReferencia: formCompra.documentoReferencia,
                observaciones: formCompra.observaciones,
                usuario: formCompra.usuario
            });
            alert("Compra registrada correctamente");
            setMostrarModalCompra(false);
            setFormCompra({ cantidad: "", documentoReferencia: "", observaciones: "", usuario: "Admin" });
            cargarBases();
        } catch (error) {
            console.error("Error registrando compra:", error);
            alert("Error al registrar la compra");
        }
    };

    const getEstado = (porcentaje) => {
        if (porcentaje <= 20) return 'critico';
        if (porcentaje <= 40) return 'alerta';
        if (porcentaje <= 70) return 'normal';
        return 'optimo';
    };

    const getIconoEstado = (porcentaje) => {
        if (porcentaje <= 20) return '🚨';
        if (porcentaje <= 40) return '⚠️';
        if (porcentaje <= 70) return '📊';
        return '✅';
    };

    // ===== DETERMINAR SI ESTAMOS EN MODO RECOMENDACIONES =====
    const esModoRecomendaciones = filtro === 'cargas';

    if (loading) {
        return (
            <div className="bases-container">
                <div className="base-loading-screen">
                    <div className="base-spinner-neon"></div>
                    <p>Cargando bases...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bases-container">
            <div className="bases-glass-panel">
                <SidebarMateriaPrima
                    seccionActiva="bases"
                    inventarioTotal={inventarioTotal}
                    capacidadTotal={capacidadTotal}
                    tanquesCriticos={todasCriticas}
                    onCambiarSeccion={null}
                    mostrarBases={true}
                />

                <main className="base-main">
                    <header className="base-header">
                        <div className="header-titulo">
                            <h1>🛢️ Bases - Niveles de Tanques</h1>
                            <p>Monitoreo de niveles de bases para esmaltes</p>
                        </div>
                        <div className="base-header-stats">
                            {actualizando && (
                                <div className="base-actualizando-badge">
                                    <span className="base-spinner-mini"></span>
                                    Actualizando...
                                </div>
                            )}
                            <div className="base-stat-card critico">
                                <span className="stat-num">{basesCriticas.length}</span>
                                <span className="stat-label">Críticos</span>
                            </div>
                            <div className="base-stat-card alerta">
                                <span className="stat-num">{basesAlerta.length}</span>
                                <span className="stat-label">Alerta</span>
                            </div>
                            <div className="base-stat-card normal">
                                <span className="stat-num">{bases.length}</span>
                                <span className="stat-label">Total</span>
                            </div>
                            <div className="base-stat-card recomendacion">
                                <span className="stat-num">{basesConRecomendacion.length}</span>
                                <span className="stat-label">Cargas</span>
                            </div>
                        </div>
                    </header>

                    <div className="bases-workspace">
                        <div className="base-header-actions">
                            <div className="base-filtros">
                                <button 
                                    className={`base-filtro-btn ${filtro === 'todas' ? 'active' : ''}`} 
                                    onClick={() => setFiltro('todas')}
                                >
                                    📊 Todas
                                </button>
                                <button 
                                    className={`base-filtro-btn ${filtro === 'critico' ? 'active' : ''}`} 
                                    onClick={() => setFiltro('critico')}
                                >
                                    🚨 Crítico
                                </button>
                                <button 
                                    className={`base-filtro-btn ${filtro === 'alerta' ? 'active' : ''}`} 
                                    onClick={() => setFiltro('alerta')}
                                >
                                    ⚠️ Alerta
                                </button>
                                <button 
                                    className={`base-filtro-btn ${filtro === 'normal' ? 'active' : ''}`} 
                                    onClick={() => setFiltro('normal')}
                                >
                                    ✅ Normal
                                </button>
                                <button 
                                    className={`base-filtro-btn ${filtro === 'cargas' ? 'active' : ''}`} 
                                    onClick={() => setFiltro('cargas')}
                                >
                                    📦 Cargas
                                </button>
                            </div>

                            <div className="base-search-box">
                                <span className="base-search-icon">🔍</span>
                                <input 
                                    type="text" 
                                    className="base-search-input" 
                                    placeholder="Buscar..." 
                                    value={busqueda} 
                                    onChange={(e) => setBusqueda(e.target.value)} 
                                />
                                {busqueda && (
                                    <button className="base-search-clear" onClick={() => setBusqueda('')}>
                                        ✖
                                    </button>
                                )}
                            </div>
                        </div>

                        {busqueda && (
                            <div className="base-resultados-info">
                                <span>
                                    {esModoRecomendaciones 
                                        ? `${basesRecomendacionConInfo.filter(b => 
                                            b.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
                                            b.nombre?.toLowerCase().includes(busqueda.toLowerCase())
                                        ).length} resultado${basesRecomendacionConInfo.length !== 1 ? 's' : ''} para "{busqueda}"`
                                        : `${basesMostrar.length} resultado${basesMostrar.length !== 1 ? 's' : ''} para "{busqueda}"`
                                    }
                                </span>
                            </div>
                        )}

                        {/* ===== MODO RECOMENDACIONES ===== */}
                        {esModoRecomendaciones ? (
                            <div className="recomendaciones-grid">
                                {basesRecomendacionConInfo.length > 0 ? (
                                    basesRecomendacionConInfo.map(base => {
                                        // Mapeo de niveles a nombres amigables para el usuario
                                        const nivelLabels = {
                                            'suficiente': 'Suficiente',
                                            'alerta': 'Próximo a necesitar',
                                            'critico': '¡Necesita recargar!',
                                            'lleno': 'Lleno'
                                        };

                                        return (
                                            <div key={base.id} className={`recomendacion-card ${base.nivel}`}>
                                                <div className="recomendacion-card-header">
                                                    <div className="recomendacion-base-info">
                                                        <span className="recomendacion-codigo">{base.codigo}</span>
                                                        <span className="recomendacion-nombre">{base.nombre}</span>
                                                    </div>
                                                    <div className="recomendacion-estado">
                                                        <span className="recomendacion-icono">{base.icono || '📦'}</span>
                                                        <span className="recomendacion-nivel" style={{ color: base.color }}>
                                                            {nivelLabels[base.nivel] || base.nivel.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="recomendacion-card-body">
                                                    <div className="recomendacion-visual">
                                                        <div className="recomendacion-barra-espacio">
                                                            <div
                                                                className="recomendacion-barra-lleno"
                                                                style={{
                                                                    width: `${(base.espacioDisponible / base.capacidadMaxima) * 100}%`,
                                                                    background: `linear-gradient(90deg, ${base.color}, ${base.color}dd)`
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="recomendacion-espacio-texto">
                                                            <span>Espacio disponible: <strong>{base.espacioDisponible.toFixed(0)} {base.unidad}</strong></span>
                                                            <span>Capacidad total: <strong>{base.capacidadMaxima.toFixed(0)} {base.unidad}</strong></span>
                                                        </div>
                                                    </div>

                                                    <div className="recomendacion-detalles">
                                                        <div className="recomendacion-item">
                                                            <span className="recomendacion-item-icon">📦</span>
                                                            <div>
                                                                <span className="recomendacion-item-label">Tamaño de carga: </span>
                                                                <span className="recomendacion-item-valor">{base.tamanoCarga} {base.unidad}</span>
                                                            </div>
                                                        </div>
                                                        <div className="recomendacion-item">
                                                            <span className="recomendacion-item-icon">🔢</span>
                                                            <div>
                                                                <span className="recomendacion-item-label">Cargas completas: </span>
                                                                <span className="recomendacion-item-valor" style={{ color: base.color }}>
                                                                    {base.cargasCompletas}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {base.espacioRestante > 0 && base.cargasCompletas === 0 && (
                                                            <div className="recomendacion-item">
                                                                <span className="recomendacion-item-icon">📊</span>
                                                                <div>
                                                                    <span className="recomendacion-item-label">Espacio parcial</span>
                                                                    <span className="recomendacion-item-valor" style={{ color: '#F59E0B' }}>
                                                                        {base.espacioRestante.toFixed(0)} {base.unidad}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="recomendacion-mensaje" style={{ color: base.color }}>
                                                        {base.mensaje}
                                                    </div>

                                                    {base.cargasCompletas > 0 && (
                                                        <button
                                                            className="recomendacion-btn-programar"
                                                            onClick={() => {
                                                                setBaseSeleccionada(base);
                                                                setFormCompra({
                                                                    ...formCompra,
                                                                    cantidad: (base.cargasCompletas * base.tamanoCarga).toString()
                                                                });
                                                                setMostrarModalCompra(true);
                                                            }}
                                                        >
                                                            📦 Programar {base.cargasCompletas} carga{base.cargasCompletas > 1 ? 's' : ''}
                                                        </button>
                                                    )}
                                                    
                                                    {base.cargasCompletas === 0 && base.nivel === 'critico' && (
                                                        <button
                                                            className="recomendacion-btn-recargar"
                                                            onClick={() => {
                                                                setBaseSeleccionada(base);
                                                                setMostrarModalCompra(true);
                                                            }}
                                                        >
                                                            🛒 Recargar tanque
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="recomendaciones-vacio">
                                        <span>🎯</span>
                                        <p>Todas las bases están llenas</p>
                                        <span className="recomendaciones-subtext">No hay espacio para programar cargas</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ===== MODO NORMAL (Todas, Crítico, Alerta, Normal) - SIN INDICADOR ===== */
                            <div className="base-grid">
                                {basesMostrar.map(base => {
                                    const porcentaje = (base.nivelActual / base.capacidadMaxima) * 100;
                                    const estado = getEstado(porcentaje);
                                    const icono = getIconoEstado(porcentaje);

                                    return (
                                        <div key={base.id} className={`base-tanque-card ${estado}`}>
                                            <div className="base-tanque-header">
                                                <div className="tanque-info">
                                                    <h3>{base.nombre}</h3>
                                                    <span className="tanque-codigo">{base.codigo}</span>
                                                </div>
                                                <div className="tanque-estado-badge">{icono} {estado.toUpperCase()}</div>
                                            </div>

                                            <div className="base-tanque-visual">
                                                <div className="base-tanque-body">
                                                    <div className="base-tanque-nivel" style={{ height: `${porcentaje}%`, transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                                                        <div className="base-onda-1"></div>
                                                        <div className="base-onda-2"></div>
                                                        <div className="base-onda-3"></div>
                                                        <div className="base-burbujas">
                                                            <div className="base-burbuja"></div>
                                                            <div className="base-burbuja"></div>
                                                            <div className="base-burbuja"></div>
                                                            <div className="base-burbuja"></div>
                                                            <div className="base-burbuja"></div>
                                                        </div>
                                                        <div className="base-superficie-brillo"></div>
                                                        <span className="base-nivel-porcentaje">{porcentaje.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="base-reflejo-izquierdo"></div>
                                                    <div className="base-reflejo-derecho"></div>
                                                </div>

                                                <div className="base-tanque-medidas">
                                                    <div className="medida-lineas">
                                                        <span className="medida-linea"></span>
                                                        <span className="medida-linea"></span>
                                                        <span className="medida-linea"></span>
                                                        <span className="medida-linea"></span>
                                                        <span className="medida-linea"></span>
                                                    </div>
                                                    <div className="medida">
                                                        <span className="medida-valor">{base.capacidadMaxima?.toFixed(0) || 0}</span>
                                                        <span className="medida-label">Máx</span>
                                                    </div>
                                                    <div className="medida actual">
                                                        <span className="medida-valor">{base.nivelActual?.toFixed(0) || 0}</span>
                                                        <span className="medida-label">Actual</span>
                                                    </div>
                                                    <div className="medida">
                                                        <span className="medida-valor">{base.umbralCritico?.toFixed(0) || 0}</span>
                                                        <span className="medida-label">Mín</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="base-tanque-detalles">
                                                <div className="detalle-item"><span className="detalle-icon">📦</span><span>{base.nivelActual?.toFixed(0)} {base.unidad}</span></div>
                                                <div className="detalle-item"><span className="detalle-icon">📍</span><span>{base.ubicacion || 'Sin ubicación'}</span></div>
                                                <div className="detalle-item"><span className="detalle-icon">⚡</span><span>Alerta: {base.umbralAlerta?.toFixed(0)} {base.unidad}</span></div>
                                            </div>

                                            <div className="base-tanque-acciones">
                                                <button className="base-btn-ver-consumo" onClick={() => verConsumos(base)}>📋 Ver Consumo</button>
                                                <button className="base-btn-registrar-compra" onClick={() => { setBaseSeleccionada(base); setMostrarModalCompra(true); }}>🛒 Recargar</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ===== MENSAJE DE SIN RESULTADOS ===== */}
                        {!esModoRecomendaciones && basesMostrar.length === 0 && (
                            <div className="base-no-bases">
                                <div className="no-bases-icon">🔍</div>
                                <h3>No se encontraron bases</h3>
                                <p>{busqueda ? <>No hay bases que coincidan con "<strong>{busqueda}</strong>"</> : <>No hay bases con los códigos configurados</>}</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {mostrarModalCompra && baseSeleccionada && (
                <div className="base-modal-overlay" onClick={() => setMostrarModalCompra(false)}>
                    <div className="base-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="base-modal-header">
                            <h3>🛒 Registrar Compra - {baseSeleccionada.nombre}</h3>
                            <button className="base-modal-close" onClick={() => setMostrarModalCompra(false)}>✖</button>
                        </div>
                        <div className="base-modal-body">
                            <div className="base-form-group">
                                <label>Cantidad ({baseSeleccionada.unidad})</label>
                                <input type="number" step="0.01" className="base-form-input" value={formCompra.cantidad} onChange={(e) => setFormCompra({ ...formCompra, cantidad: e.target.value })} placeholder="Ej: 1000" />
                            </div>
                        </div>
                        <div className="base-modal-footer">
                            <button className="base-btn-cerrar" onClick={() => setMostrarModalCompra(false)}>Cancelar</button>
                            <button className="base-btn-registrar-compra" onClick={handleRegistrarCompra}>✓ Registrar Compra</button>
                        </div>
                    </div>
                </div>
            )}

            {mostrarModalConsumo && baseSeleccionada && (
                <div className="base-modal-overlay" onClick={() => setMostrarModalConsumo(false)}>
                    <div className="base-modal-content base-modal-consumo" onClick={(e) => e.stopPropagation()}>
                        <div className="base-modal-header">
                            <h3>📋 Consumos - {baseSeleccionada.nombre} ({baseSeleccionada.codigo})</h3>
                            <button className="base-modal-close" onClick={() => setMostrarModalConsumo(false)}>✖</button>
                        </div>
                        <div className="base-modal-body">
                            {cargandoConsumos ? (
                                <div className="base-loading-consumos">
                                    <div className="base-spinner-mini"></div>
                                    <p>Cargando consumos...</p>
                                </div>
                            ) : consumosBase.length === 0 ? (
                                <div className="base-sin-consumos">
                                    <span>📭</span>
                                    <p>No hay consumos registrados para esta base</p>
                                </div>
                            ) : (
                                <div className="base-tabla-consumos">
                                    <table className="base-consumos-table">
                                        <thead>
                                            <tr><th>Lote</th><th>Código Producto</th><th>Cantidad (L)</th><th>Fecha</th><th>Operario</th></tr>
                                        </thead>
                                        <tbody>
                                            {consumosBase.map((consumo, index) => (
                                                <tr key={consumo.id || index}>
                                                    <td><span className="base-lote-badge">{consumo.lote}</span></td>
                                                    <td><span className="base-codigo-badge">{consumo.codigoProducto}</span></td>
                                                    <td><strong className="base-cantidad-consumida">{consumo.cantidad.toFixed(2)} L</strong></td>
                                                    <td>{consumo.fecha}</td>
                                                    <td>{consumo.operario || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="base-total-consumo">
                                                <td colSpan="2"><strong>Total consumido:</strong></td>
                                                <td><strong>{consumosBase.reduce((sum, c) => sum + c.cantidad, 0).toFixed(2)} L</strong></td>
                                                <td colSpan="2"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="base-modal-footer">
                            <button className="base-btn-cerrar" onClick={() => setMostrarModalConsumo(false)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}