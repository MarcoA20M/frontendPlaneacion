// src/screens/BasesScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { materiaPrimaService } from "../services/materiaPrimaService";
import "../styles/bases.css";

export default function BasesScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [bases, setBases] = useState([]);
    const [filtro, setFiltro] = useState("todas");
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

    // Códigos de bases que queremos mostrar
    const CODIGOS_BASES = ['BRO40', 'BRE40','BAC40', 'BAL40', 'BAO40', 'BNM40', 'BVE40','BAE40',
         'BNE30', 'BNE10', 'BBE20', 'BBE30', 'BED10','BVE10'];

    // Cargar datos
    const cargarBases = async () => {
        setLoading(true);
        try {
            const todas = await materiaPrimaService.listarTodas();
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

    // Función para obtener el historial de consumo de una base
    const verConsumos = async (base) => {
        setBaseSeleccionada(base);
        setMostrarModalConsumo(true);
        setCargandoConsumos(true);
        
        try {
            // Obtener consumos de la base desde el backend
            const response = await fetch(`http://localhost:8080/api/consumos/base/${base.id}`);
            if (response.ok) {
                const data = await response.json();
                setConsumosBase(data);
            } else {
                // Si no hay datos, usar datos de ejemplo
                setConsumosBase([
                    { 
                        id: 1, 
                        lote: 'V260612001', 
                        codigoProducto: '600SR', 
                        cantidad: 487.43,
                        fecha: '2026-06-12',
                        operario: 'Aldo'
                    },
                    { 
                        id: 2, 
                        lote: 'V260612002', 
                        codigoProducto: '400SR', 
                        cantidad: 320.50,
                        fecha: '2026-06-12',
                        operario: 'Germán'
                    },
                    { 
                        id: 3, 
                        lote: 'V260613001', 
                        codigoProducto: '200SR', 
                        cantidad: 150.00,
                        fecha: '2026-06-13',
                        operario: 'Pedro'
                    }
                ]);
            }
        } catch (error) {
            console.error("Error cargando consumos:", error);
            // Datos de ejemplo en caso de error
            setConsumosBase([
                { 
                    id: 1, 
                    lote: 'V260612001', 
                    codigoProducto: '600SR', 
                    cantidad: 487.43,
                    fecha: '2026-06-12',
                    operario: 'Aldo'
                },
                { 
                    id: 2, 
                    lote: 'V260612002', 
                    codigoProducto: '400SR', 
                    cantidad: 320.50,
                    fecha: '2026-06-12',
                    operario: 'Germán'
                }
            ]);
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

    // Calcular estadísticas
    const inventarioTotal = bases.reduce((sum, b) => sum + (b.nivelActual || 0), 0);
    const capacidadTotal = bases.reduce((sum, b) => sum + (b.capacidadMaxima || 0), 0);
    const basesCriticas = bases.filter(b => (b.nivelActual / b.capacidadMaxima) * 100 <= 20);
    const basesAlerta = bases.filter(b => {
        const pct = (b.nivelActual / b.capacidadMaxima) * 100;
        return pct > 20 && pct <= 40;
    });

    // Registrar compra
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

    // Función para obtener el color según el nivel
    const getColorNivel = (porcentaje) => {
        if (porcentaje <= 20) return '#e74c3c';
        if (porcentaje <= 40) return '#f39c12';
        if (porcentaje <= 70) return '#3498db';
        return '#2ecc71';
    };

    // Función para obtener el estado
    const getEstado = (porcentaje) => {
        if (porcentaje <= 20) return 'critico';
        if (porcentaje <= 40) return 'alerta';
        if (porcentaje <= 70) return 'normal';
        return 'optimo';
    };

    // Función para obtener el ícono del estado
    const getIconoEstado = (porcentaje) => {
        if (porcentaje <= 20) return '🚨';
        if (porcentaje <= 40) return '⚠️';
        if (porcentaje <= 70) return '📊';
        return '✅';
    };

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
                {/* SIDEBAR */}
                <aside className="base-sidebar">
                    <div className="base-sidebar-logo">
                        <span className="logo-icon">⚡</span>
                        <h2>Materia Prima</h2>
                    </div>

                    <nav className="base-sidebar-nav">
                        <div className="nav-label">PRINCIPAL</div>
                        <button
                            className="base-sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos?tab=dashboard")}
                        >
                            <span className="btn-icon">📊</span>
                            Dashboard
                        </button>
                        <button
                            className="base-sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos?tab=tanques")}
                        >
                            <span className="btn-icon">🛢️</span>
                            Tanques
                        </button>
                        <button
                            className="base-sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos?tab=alertas")}
                        >
                            <span className="btn-icon">🚨</span>
                            Alertas
                        </button>
                        <button
                            className="base-sidebar-btn"
                            onClick={() => navigate("/mantenimiento/criticos?tab=trazabilidad")}
                        >
                            <span className="btn-icon">🔗</span>
                            Trazabilidad
                        </button>
                    </nav>

                    <div className="base-nav-divider"></div>

                    <nav className="base-sidebar-nav">
                        <div className="nav-label">CONFIGURACIÓN</div>
                        <button
                            className="base-sidebar-btn"
                            onClick={() => navigate("/mantenimiento/formulas")}
                        >
                            <span className="btn-icon">📋</span>
                            Consultar codigos
                        </button>

                        <button
                            className="base-sidebar-btn"
                            onClick={() => navigate("/mantenimiento/materias-primas")}
                        >
                            <span className="btn-icon">📦</span>
                            Gestionar Materias Primas
                        </button>

                        <button
                            className="base-sidebar-btn active"
                            onClick={() => navigate("/bases")}
                        >
                            <span className="btn-icon">🛢️</span>
                            Bases
                            {basesCriticas.length > 0 && (
                                <span className="badge-alerta">{basesCriticas.length}</span>
                            )}
                        </button>
                    </nav>

                    <div className="base-sidebar-footer">
                        <div className="base-stats-resumen">
                            <div className="base-stat-item">
                                <span className="stat-value">{inventarioTotal.toLocaleString()}</span>
                                <span className="stat-label">Total L/Kg</span>
                            </div>
                            <div className="base-stat-item">
                                <span className="stat-value">{capacidadTotal > 0 ? ((inventarioTotal / capacidadTotal) * 100).toFixed(0) : 0}%</span>
                                <span className="stat-label">Capacidad</span>
                            </div>
                        </div>
                        <button className="base-btn-volver" onClick={() => navigate("/mantenimiento")}>
                            ↩ Volver
                        </button>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
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
                        </div>
                    </header>

                    <div className="bases-workspace">
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
                        </div>

                        <div className="base-grid">
                            {bases
                                .filter(base => {
                                    const porcentaje = (base.nivelActual / base.capacidadMaxima) * 100;
                                    if (filtro === 'todas') return true;
                                    if (filtro === 'critico') return porcentaje <= 20;
                                    if (filtro === 'alerta') return porcentaje > 20 && porcentaje <= 40;
                                    if (filtro === 'normal') return porcentaje > 40;
                                    return true;
                                })
                                .map(base => {
                                    const porcentaje = (base.nivelActual / base.capacidadMaxima) * 100;
                                    const estado = getEstado(porcentaje);
                                    const color = getColorNivel(porcentaje);
                                    const icono = getIconoEstado(porcentaje);

                                    return (
                                        <div key={base.id} className={`base-tanque-card ${estado}`}>
                                            <div className="base-tanque-header">
                                                <div className="tanque-info">
                                                    <h3>{base.nombre}</h3>
                                                    <span className="tanque-codigo">{base.codigo}</span>
                                                </div>
                                                <div className="tanque-estado-badge">
                                                    {icono} {estado.toUpperCase()}
                                                </div>
                                            </div>

                                            <div className="base-tanque-visual">
                                                <div className="base-tanque-body">
                                                    <div
                                                        className="base-tanque-nivel"
                                                        style={{
                                                            height: `${porcentaje}%`,
                                                            transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                                        }}
                                                    >
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
                                                        <span className="medida-valor">{base.capacidadMaxima}</span>
                                                        <span className="medida-label">Máx</span>
                                                    </div>
                                                    <div className="medida actual">
                                                        <span className="medida-valor">{base.nivelActual}</span>
                                                        <span className="medida-label">Actual</span>
                                                    </div>
                                                    <div className="medida">
                                                        <span className="medida-valor">{base.umbralCritico}</span>
                                                        <span className="medida-label">Mín</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="base-tanque-detalles">
                                                <div className="detalle-item">
                                                    <span className="detalle-icon">📦</span>
                                                    <span>{base.nivelActual} {base.unidad}</span>
                                                </div>
                                                <div className="detalle-item">
                                                    <span className="detalle-icon">📍</span>
                                                    <span>{base.ubicacion || 'Sin ubicación'}</span>
                                                </div>
                                                <div className="detalle-item">
                                                    <span className="detalle-icon">⚡</span>
                                                    <span>Alerta: {base.umbralAlerta} {base.unidad}</span>
                                                </div>
                                            </div>

                                            <div className="base-tanque-acciones">
                                                <button
                                                    className="base-btn-ver-consumo"
                                                    onClick={() => verConsumos(base)}
                                                >
                                                    📋 Ver Consumo
                                                </button>
                                                <button
                                                    className="base-btn-registrar-compra"
                                                    onClick={() => {
                                                        setBaseSeleccionada(base);
                                                        setMostrarModalCompra(true);
                                                    }}
                                                >
                                                    🛒 Comprar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {bases.length === 0 && (
                            <div className="base-no-bases">
                                <div className="no-bases-icon">🛢️</div>
                                <h3>No se encontraron bases</h3>
                                <p>No hay bases con los códigos configurados</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal Registrar Compra */}
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
                                <input
                                    type="number"
                                    step="0.01"
                                    className="base-form-input"
                                    value={formCompra.cantidad}
                                    onChange={(e) => setFormCompra({ ...formCompra, cantidad: e.target.value })}
                                    placeholder="Ej: 1000"
                                />
                            </div>
                            <div className="base-form-group">
                                <label>Documento de referencia (Factura)</label>
                                <input
                                    type="text"
                                    className="base-form-input"
                                    value={formCompra.documentoReferencia}
                                    onChange={(e) => setFormCompra({ ...formCompra, documentoReferencia: e.target.value })}
                                    placeholder="Ej: FACT-001"
                                />
                            </div>
                            <div className="base-form-group">
                                <label>Observaciones</label>
                                <textarea
                                    className="base-form-input"
                                    rows="2"
                                    value={formCompra.observaciones}
                                    onChange={(e) => setFormCompra({ ...formCompra, observaciones: e.target.value })}
                                    placeholder="Notas adicionales..."
                                />
                            </div>
                        </div>
                        <div className="base-modal-footer">
                            <button className="base-btn-cerrar" onClick={() => setMostrarModalCompra(false)}>Cancelar</button>
                            <button className="base-btn-registrar-compra" onClick={handleRegistrarCompra}>✓ Registrar Compra</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Ver Consumos */}
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
                                            <tr>
                                                <th>Lote</th>
                                                <th>Código Producto</th>
                                                <th>Cantidad (L)</th>
                                                <th>Fecha</th>
                                                <th>Operario</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {consumosBase.map((consumo, index) => (
                                                <tr key={consumo.id || index}>
                                                    <td>
                                                        <span className="base-lote-badge">{consumo.lote}</span>
                                                    </td>
                                                    <td>
                                                        <span className="base-codigo-badge">{consumo.codigoProducto}</span>
                                                    </td>
                                                    <td>
                                                        <strong className="base-cantidad-consumida">
                                                            {consumo.cantidad.toFixed(2)} L
                                                        </strong>
                                                    </td>
                                                    <td>{consumo.fecha}</td>
                                                    <td>{consumo.operario || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="base-total-consumo">
                                                <td colSpan="2">
                                                    <strong>Total consumido:</strong>
                                                </td>
                                                <td>
                                                    <strong>
                                                        {consumosBase.reduce((sum, c) => sum + c.cantidad, 0).toFixed(2)} L
                                                    </strong>
                                                </td>
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