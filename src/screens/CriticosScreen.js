// src/screens/CriticosScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import MateriaPrimaProductos from "../components/MateriaPrimaProductos";
import "../styles/criticos.css";

export default function CriticosScreen() {
    const navigate = useNavigate();
    const location = useLocation(); // 🔴 IMPORTAR useLocation
    const [loading, setLoading] = useState(true);
    const [seccionActiva, setSeccionActiva] = useState("dashboard");
    const [tanques, setTanques] = useState([]);
    const [resumenDashboard, setResumenDashboard] = useState({
        totalTanques: 0,
        criticos: 0,
        alerta: 0,
        normales: 0
    });
    const [filtro, setFiltro] = useState("todos");
    const [mostrarModalCompra, setMostrarModalCompra] = useState(false);
    const [tanqueSeleccionado, setTanqueSeleccionado] = useState(null);
    const [formCompra, setFormCompra] = useState({
        cantidad: "",
        documentoReferencia: "",
        observaciones: "",
        usuario: "Admin"
    });

    // 🔴 LEER PARÁMETRO 'tab' DE LA URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'trazabilidad') {
            setSeccionActiva('trazabilidad');
        } else if (tab === 'dashboard') {
            setSeccionActiva('dashboard');
        } else if (tab === 'tanques') {
            setSeccionActiva('tanques');
        } else if (tab === 'alertas') {
            setSeccionActiva('alertas');
        }
    }, [location.search]);

    // Cargar datos desde el backend
    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [tanquesData, resumenData] = await Promise.all([
                materiaPrimaService.listarTodas(),
                materiaPrimaService.getResumenDashboard()
            ]);
            setTanques(tanquesData);
            setResumenDashboard(resumenData);
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Calcular inventario total
    const inventarioTotal = tanques.reduce((sum, t) => sum + (t.nivelActual || 0), 0);
    const capacidadTotal = tanques.reduce((sum, t) => sum + (t.capacidadMaxima || 0), 0);
    const tanquesCriticos = tanques.filter(t => t.critico);
    const tanquesAlerta = tanques.filter(t => t.alerta);

    // Registrar compra
    const handleRegistrarCompra = async () => {
        if (!formCompra.cantidad || formCompra.cantidad <= 0) {
            alert("Ingresa una cantidad válida");
            return;
        }

        try {
            await materiaPrimaService.registrarCompra({
                materiaPrimaId: tanqueSeleccionado.id,
                cantidad: parseFloat(formCompra.cantidad),
                documentoReferencia: formCompra.documentoReferencia,
                observaciones: formCompra.observaciones,
                usuario: formCompra.usuario
            });
            alert("Compra registrada correctamente");
            setMostrarModalCompra(false);
            setFormCompra({ cantidad: "", documentoReferencia: "", observaciones: "", usuario: "Admin" });
            cargarDatos();
        } catch (error) {
            console.error("Error registrando compra:", error);
            alert("Error al registrar la compra");
        }
    };

    // 🔴 Función para cambiar sección y actualizar URL
    const cambiarSeccion = (seccion) => {
        setSeccionActiva(seccion);
        navigate(`/mantenimiento/criticos?tab=${seccion}`);
    };

    if (loading) {
        return (
            <div className="criticos-container">
                <div className="loading-screen">
                    <div className="spinner-neon"></div>
                    <p>Cargando datos de materia prima...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="criticos-container">
            <div className="criticos-glass-panel">
                {/* SIDEBAR */}
                <aside className="criticos-sidebar">
                    <div className="sidebar-logo">
                        <span className="logo-icon">⚡</span>
                        <h2>Materia Prima</h2>
                    </div>

                    <nav className="sidebar-nav">
                        <div className="nav-label">PRINCIPAL</div>
                        <button
                            className={`sidebar-btn ${seccionActiva === "dashboard" ? "active" : ""}`}
                            onClick={() => cambiarSeccion("dashboard")}
                        >
                            <span className="btn-icon">📊</span>
                            Dashboard
                        </button>
                        <button
                            className={`sidebar-btn ${seccionActiva === "tanques" ? "active" : ""}`}
                            onClick={() => cambiarSeccion("tanques")}
                        >
                            <span className="btn-icon">🛢️</span>
                            Tanques
                        </button>
                        <button
                            className={`sidebar-btn ${seccionActiva === "alertas" ? "active" : ""}`}
                            onClick={() => cambiarSeccion("alertas")}
                        >
                            <span className="btn-icon">🚨</span>
                            Alertas
                            {tanquesCriticos.length > 0 && (
                                <span className="badge-alerta">{tanquesCriticos.length}</span>
                            )}
                        </button>
                        <button
                            className={`sidebar-btn ${seccionActiva === "trazabilidad" ? "active" : ""}`}
                            onClick={() => cambiarSeccion("trazabilidad")}
                        >
                            <span className="btn-icon">🔗</span>
                            Trazabilidad
                        </button>
                    </nav>

                    {/* Separador */}
                    <div className="nav-divider"></div>

                    <nav className="sidebar-nav">
                        <div className="nav-label">CONFIGURACIÓN</div>
                        <button
                            className="sidebar-btn"
                            onClick={() => navigate("/mantenimiento/formulas")}
                        >
                            <span className="btn-icon">📋</span>
                            Consultar codigos
                        </button>

                        <button
                            className="sidebar-btn"
                            onClick={() => navigate("/mantenimiento/materias-primas")}
                        >
                            <span className="btn-icon">📦</span>
                            Gestionar Materias Primas
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="stats-resumen-sidebar">
                            <div className="stat-sidebar">
                                <span className="stat-value">{inventarioTotal.toLocaleString()}</span>
                                <span className="stat-label">Total L/Kg</span>
                            </div>
                            <div className="stat-sidebar">
                                <span className="stat-value">{capacidadTotal > 0 ? ((inventarioTotal / capacidadTotal) * 100).toFixed(0) : 0}%</span>
                                <span className="stat-label">Capacidad</span>
                            </div>
                        </div>
                        <button className="btn-volver" onClick={() => navigate("/mantenimiento")}>
                            ↩ Volver
                        </button>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="criticos-main">
                    <header className="criticos-header">
                        <div className="header-titulo">
                            <h1>
                                {seccionActiva === "dashboard" && "📊 Dashboard de Materia Prima"}
                                {seccionActiva === "tanques" && "🛢️ Gestión de Tanques"}
                                {seccionActiva === "alertas" && "🚨 Alertas y Críticos"}
                                {seccionActiva === "trazabilidad" && "🔗 Trazabilidad de Materias Primas"}
                            </h1>
                            <p>
                                {seccionActiva === "trazabilidad"
                                    ? "Visualiza qué productos consumen cada materia prima y planifica tu inventario"
                                    : "Control y monitoreo de inventario de materia prima"}
                            </p>
                        </div>
                        {seccionActiva !== "trazabilidad" && (
                            <div className="header-stats">
                                <div className="stat-card-header critico">
                                    <span className="stat-num">{resumenDashboard.criticos}</span>
                                    <span className="stat-label">Críticos</span>
                                </div>
                                <div className="stat-card-header alerta">
                                    <span className="stat-num">{resumenDashboard.alerta}</span>
                                    <span className="stat-label">Alerta</span>
                                </div>
                            </div>
                        )}
                    </header>

                    <div className="criticos-workspace">
                        {/* SECCIÓN DASHBOARD */}
                        {seccionActiva === "dashboard" && (
                            <>
                                <div className="dashboard-cards">
                                    <div className="dashboard-card">
                                        <div className="card-icon">🛢️</div>
                                        <div className="card-info">
                                            <span className="card-value">{resumenDashboard.totalTanques}</span>
                                            <span className="card-label">Tanques Activos</span>
                                        </div>
                                    </div>
                                    <div className="dashboard-card">
                                        <div className="card-icon">📦</div>
                                        <div className="card-info">
                                            <span className="card-value">{inventarioTotal.toLocaleString()}</span>
                                            <span className="card-label">L/Kg Totales</span>
                                        </div>
                                    </div>
                                    <div className="dashboard-card">
                                        <div className="card-icon">⚡</div>
                                        <div className="card-info">
                                            <span className="card-value">{resumenDashboard.criticos}</span>
                                            <span className="card-label">En Estado Crítico</span>
                                        </div>
                                    </div>
                                    <div className="dashboard-card">
                                        <div className="card-icon">📈</div>
                                        <div className="card-info">
                                            <span className="card-value">{capacidadTotal > 0 ? ((inventarioTotal / capacidadTotal) * 100).toFixed(0) : 0}%</span>
                                            <span className="card-label">Ocupación</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Widget de acceso rápido a trazabilidad */}
                                <div className="dashboard-section">
                                    <h3>🔗 Acceso rápido a trazabilidad</h3>
                                    <div className="quick-access-grid">
                                        {tanques.slice(0, 3).map(mp => (
                                            <div
                                                key={mp.id}
                                                className="quick-access-card"
                                                onClick={() => cambiarSeccion("trazabilidad")}
                                            >
                                                <div className="quick-icon">🔍</div>
                                                <div className="quick-info">
                                                    <strong>{mp.nombre}</strong>
                                                    <small>Ver qué productos lo consumen</small>
                                                </div>
                                                <div className="quick-arrow">→</div>
                                            </div>
                                        ))}
                                        {tanques.length > 3 && (
                                            <div
                                                className="quick-access-card more"
                                                onClick={() => cambiarSeccion("trazabilidad")}
                                            >
                                                <div className="quick-icon">📊</div>
                                                <div className="quick-info">
                                                    <strong>Ver todas</strong>
                                                    <small>{tanques.length} materias primas en total</small>
                                                </div>
                                                <div className="quick-arrow">→</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="dashboard-section">
                                    <h3>📉 Tanques con menor nivel</h3>
                                    <div className="tanques-mini-grid">
                                        {[...tanques].sort((a, b) => a.nivelActual - b.nivelActual).slice(0, 4).map(tanque => (
                                            <div key={tanque.id} className="tanque-mini-card">
                                                <div className="tanque-mini-header">
                                                    <span className="tanque-mini-nombre">{tanque.nombre}</span>
                                                    <span className={`tanque-mini-estado ${tanque.critico ? 'critico' : tanque.alerta ? 'alerta' : 'normal'}`}>
                                                        {tanque.porcentajeLlenado?.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="tanque-mini-barra">
                                                    <div className="barra-lleno" style={{ width: `${tanque.porcentajeLlenado || 0}%`, background: (tanque.porcentajeLlenado || 0) <= 20 ? '#e74c3c' : (tanque.porcentajeLlenado || 0) <= 40 ? '#f39c12' : '#2ecc71' }}></div>
                                                </div>
                                                <div className="tanque-mini-detalle">
                                                    <span>{tanque.nivelActual?.toLocaleString()} / {tanque.capacidadMaxima?.toLocaleString()} {tanque.unidad}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* SECCIÓN TANQUES */}
                        {seccionActiva === "tanques" && (
                            <>
                                <div className="filtros-section">
                                    <div className="filtros-botones">
                                        <button className={`filtro-btn ${filtro === "todos" ? "active" : ""}`} onClick={() => setFiltro("todos")}>Todos</button>
                                        <button className={`filtro-btn ${filtro === "BASE" ? "active" : ""}`} onClick={() => setFiltro("BASE")}>Resinas Base</button>
                                        <button className={`filtro-btn ${filtro === "PIGMENTO" ? "active" : ""}`} onClick={() => setFiltro("PIGMENTO")}>Pigmentos</button>
                                        <button className={`filtro-btn ${filtro === "SOLVENTE" ? "active" : ""}`} onClick={() => setFiltro("SOLVENTE")}>Solventes</button>
                                        <button className={`filtro-btn ${filtro === "ADITIVO" ? "active" : ""}`} onClick={() => setFiltro("ADITIVO")}>Aditivos</button>
                                    </div>
                                </div>

                                <div className="tanques-grid">
                                    {tanques.filter(t => filtro === "todos" || t.tipo === filtro).map(tanque => {
                                        const estado = tanque.critico ? "critico" : tanque.alerta ? "alerta" : "normal";
                                        return (
                                            <div key={tanque.id} className={`tanque-card ${estado}`}>
                                                <div className="tanque-header">
                                                    <div className="tanque-icono" style={{ background: tanque.codigo === "RVA50" ? "#e879f9" : tanque.tipo === "BASE" ? "#9b59b6" : tanque.tipo === "PIGMENTO" ? "#e67e22" : tanque.tipo === "SOLVENTE" ? "#3498db" : "#1abc9c" }}>
                                                        {tanque.tipo === "BASE" ? "🛢️" : tanque.tipo === "PIGMENTO" ? "🎨" : tanque.tipo === "SOLVENTE" ? "💧" : "⚗️"}
                                                    </div>
                                                    <div className="tanque-info">
                                                        <h3>{tanque.nombre}</h3>
                                                        <span className="tanque-tipo">{tanque.tipo}</span>
                                                        {tanque.codigo && <span className="tanque-codigo">{tanque.codigo}</span>}
                                                    </div>
                                                    <div className="tanque-estado-badge">
                                                        {estado === "critico" && "🚨 CRÍTICO"}
                                                        {estado === "alerta" && "⚠️ ALERTA"}
                                                        {estado === "normal" && "✅ NORMAL"}
                                                    </div>
                                                </div>
                                                <div className="tanque-nivel">
                                                    <div className="nivel-barra-container">
                                                        <div className="nivel-barra" style={{ width: `${tanque.porcentajeLlenado || 0}%`, background: estado === "critico" ? "#e74c3c" : estado === "alerta" ? "#f39c12" : "#2ecc71" }} />
                                                    </div>
                                                    <div className="nivel-valores">
                                                        <span className="nivel-actual">{tanque.nivelActual?.toLocaleString()} {tanque.unidad}</span>
                                                        <span className="nivel-capacidad">/ {tanque.capacidadMaxima?.toLocaleString()} {tanque.unidad}</span>
                                                    </div>
                                                </div>
                                                <div className="tanque-stats">
                                                    <div className="stat-item"><span className="stat-icon">📊</span><span className="stat-value">{tanque.porcentajeLlenado?.toFixed(1)}%</span></div>
                                                    <div className="stat-item"><span className="stat-icon">⚠️</span><span className="stat-value">{tanque.umbralCritico?.toLocaleString()} {tanque.unidad}</span></div>
                                                </div>
                                                <div className="tanque-umbrales">
                                                    <div className="umbral-item">⚠️ Alerta: {tanque.umbralAlerta?.toLocaleString()} {tanque.unidad}</div>
                                                    <div className="umbral-item critico">🚨 Crítico: {tanque.umbralCritico?.toLocaleString()} {tanque.unidad}</div>
                                                </div>
                                                <div className="tanque-acciones">
                                                    <button
                                                        className="btn-ver-consumo"
                                                        onClick={() => {
                                                            console.log("Ver historial de", tanque.nombre);
                                                        }}
                                                    >
                                                        📋 Ver Historial
                                                    </button>
                                                    <button
                                                        className="btn-registrar-compra"
                                                        onClick={() => {
                                                            setTanqueSeleccionado(tanque);
                                                            setMostrarModalCompra(true);
                                                        }}
                                                    >
                                                        🛒 Registrar Compra
                                                    </button>
                                                    <button
                                                        className="btn-ver-trazabilidad"
                                                        onClick={() => {
                                                            cambiarSeccion("trazabilidad");
                                                        }}
                                                    >
                                                        🔗 Ver productos que consume
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* SECCIÓN ALERTAS */}
                        {seccionActiva === "alertas" && (
                            <div className="alertas-section">
                                <div className="alertas-header">
                                    <h2>🚨 Alertas de Materia Prima</h2>
                                    <span className="alertas-badge">{tanquesCriticos.length + tanquesAlerta.length} alertas activas</span>
                                </div>
                                {tanquesCriticos.length > 0 && (
                                    <div className="alertas-criticas">
                                        <h3>⚠️ CRÍTICAS - Requieren atención inmediata</h3>
                                        {tanquesCriticos.map(tanque => (
                                            <div key={tanque.id} className="alerta-card critica">
                                                <div className="alerta-icono">🚨</div>
                                                <div className="alerta-info">
                                                    <h4>{tanque.nombre}</h4>
                                                    <p>Nivel actual: <strong>{tanque.nivelActual?.toLocaleString()} {tanque.unidad}</strong> (Mínimo: {tanque.umbralCritico?.toLocaleString()} {tanque.unidad})</p>
                                                    <p>Porcentaje: <strong>{tanque.porcentajeLlenado?.toFixed(1)}%</strong></p>
                                                </div>
                                                <div className="alerta-accion">
                                                    <button className="btn-accion-urgente" onClick={() => { setTanqueSeleccionado(tanque); setMostrarModalCompra(true); }}>🛒 Solicitar compra urgente</button>
                                                    <button className="btn-accion-trazabilidad" onClick={() => cambiarSeccion("trazabilidad")}>🔗 Ver consumo</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {tanquesAlerta.length > 0 && (
                                    <div className="alertas-precaucion">
                                        <h3>⚠️ PRECAUCIÓN - Programar reabastecimiento</h3>
                                        {tanquesAlerta.map(tanque => (
                                            <div key={tanque.id} className="alerta-card precaucion">
                                                <div className="alerta-icono">⚠️</div>
                                                <div className="alerta-info">
                                                    <h4>{tanque.nombre}</h4>
                                                    <p>Nivel actual: <strong>{tanque.nivelActual?.toLocaleString()} {tanque.unidad}</strong> (Alerta: {tanque.umbralAlerta?.toLocaleString()} {tanque.unidad})</p>
                                                    <p>Porcentaje: <strong>{tanque.porcentajeLlenado?.toFixed(1)}%</strong></p>
                                                </div>
                                                <div className="alerta-accion">
                                                    <button className="btn-accion-programar" onClick={() => { setTanqueSeleccionado(tanque); setMostrarModalCompra(true); }}>📅 Programar pedido</button>
                                                    <button className="btn-accion-trazabilidad" onClick={() => cambiarSeccion("trazabilidad")}>🔗 Ver consumo</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {tanquesCriticos.length === 0 && tanquesAlerta.length === 0 && (
                                    <div className="sin-alertas">
                                        <div className="sin-alertas-icono">✅</div>
                                        <h3>No hay alertas activas</h3>
                                        <p>Todos los niveles de materia prima están en estado óptimo</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECCIÓN TRAZABILIDAD */}
                        {seccionActiva === "trazabilidad" && (
                            <MateriaPrimaProductos />
                        )}
                    </div>
                </main>
            </div>

            {/* Modal Registrar Compra */}
            {mostrarModalCompra && tanqueSeleccionado && (
                <div className="modal-overlay" onClick={() => setMostrarModalCompra(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🛒 Registrar Compra - {tanqueSeleccionado.nombre}</h3>
                            <button className="modal-close" onClick={() => setMostrarModalCompra(false)}>✖</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Cantidad ({tanqueSeleccionado.unidad})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formCompra.cantidad}
                                    onChange={(e) => setFormCompra({ ...formCompra, cantidad: e.target.value })}
                                    placeholder="Ej: 1000"
                                />
                            </div>
                            <div className="form-group">
                                <label>Documento de referencia (Factura)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formCompra.documentoReferencia}
                                    onChange={(e) => setFormCompra({ ...formCompra, documentoReferencia: e.target.value })}
                                    placeholder="Ej: FACT-001"
                                />
                            </div>
                            <div className="form-group">
                                <label>Observaciones</label>
                                <textarea
                                    className="form-input"
                                    rows="2"
                                    value={formCompra.observaciones}
                                    onChange={(e) => setFormCompra({ ...formCompra, observaciones: e.target.value })}
                                    placeholder="Notas adicionales..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cerrar" onClick={() => setMostrarModalCompra(false)}>Cancelar</button>
                            <button className="btn-registrar-compra" onClick={handleRegistrarCompra}>✓ Registrar Compra</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}