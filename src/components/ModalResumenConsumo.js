// src/components/ModalResumenConsumo.js
import React, { useState, useMemo } from "react";
import "../styles/modalCriticos.css";

const ModalResumenConsumo = ({ 
    visible, 
    cargando, 
    resumenGlobal = [], 
    cargasConConsumo = [], 
    totalCargas, 
    totalLitros, 
    onClose, 
    onGuardar 
}) => {
    const [vistaActiva, setVistaActiva] = useState("materias");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [busqueda, setBusqueda] = useState("");
    const [detalleMateriaSeleccionada, setDetalleMateriaSeleccionada] = useState(null);

    // Calcular estadísticas adicionales
    const estadisticas = useMemo(() => {
        if (!resumenGlobal || resumenGlobal.length === 0) return null;
        
        const productoMayorConsumo = [...resumenGlobal].sort((a, b) => b.consumoTotal - a.consumoTotal)[0];
        const totalMateriaPrima = resumenGlobal.reduce((sum, c) => sum + c.consumoTotal, 0);
        const eficiencia = totalLitros > 0 && totalMateriaPrima > 0 ? (totalLitros / totalMateriaPrima).toFixed(2) : 0;
        const topMaterias = [...resumenGlobal].sort((a, b) => b.consumoTotal - a.consumoTotal).slice(0, 3);
        
        return { productoMayorConsumo, totalMateriaPrima, eficiencia, topMaterias };
    }, [resumenGlobal, totalLitros]);

    // Calcular estadísticas de cargas
    const estadisticasCargas = useMemo(() => {
        if (!cargasConConsumo || cargasConConsumo.length === 0) return null;
        
        const cargaMayorLitraje = [...cargasConConsumo].sort((a, b) => b.litros - a.litros)[0];
        const cargaMayorConsumo = [...cargasConConsumo].sort((a, b) => b.consumoTotal - a.consumoTotal)[0];
        
        return { cargaMayorLitraje, cargaMayorConsumo };
    }, [cargasConConsumo]);

    // Filtrar materias primas
    const materiasFiltradas = useMemo(() => {
        if (!resumenGlobal || resumenGlobal.length === 0) return [];
        let filtradas = [...resumenGlobal];
        if (filtroTipo !== "todos") {
            filtradas = filtradas.filter(item => item.tipo?.toLowerCase() === filtroTipo);
        }
        if (busqueda) {
            filtradas = filtradas.filter(item => 
                item.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
                item.nombre?.toLowerCase().includes(busqueda.toLowerCase())
            );
        }
        return filtradas.sort((a, b) => b.consumoTotal - a.consumoTotal);
    }, [resumenGlobal, filtroTipo, busqueda]);

    // Filtrar cargas
    const cargasFiltradas = useMemo(() => {
        if (!cargasConConsumo || cargasConConsumo.length === 0) return [];
        let filtradas = [...cargasConConsumo];
        if (busqueda) {
            filtradas = filtradas.filter(carga => 
                carga.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
                carga.numeroLote?.toLowerCase().includes(busqueda.toLowerCase()) ||
                (carga.descripcion || "").toLowerCase().includes(busqueda.toLowerCase())
            );
        }
        return filtradas;
    }, [cargasConConsumo, busqueda]);

    // Obtener tipos únicos para filtros
    const tiposUnicos = useMemo(() => {
        if (!resumenGlobal || resumenGlobal.length === 0) return [];
        const tipos = new Set(resumenGlobal.map(item => item.tipo?.toLowerCase()).filter(Boolean));
        return Array.from(tipos);
    }, [resumenGlobal]);

    // Calcular total de consumo de MP de todas las cargas
    const totalConsumoMP = useMemo(() => {
        if (!cargasConConsumo || cargasConConsumo.length === 0) return 0;
        return cargasConConsumo.reduce((sum, carga) => sum + (carga.consumoTotal || 0), 0);
    }, [cargasConConsumo]);

    if (!visible) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-resumen-global" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📊 Resumen de Consumo de Materia Prima</h3>
                    <button className="modal-close" onClick={onClose}>✖</button>
                </div>
                
                <div className="modal-body">
                    {cargando ? (
                        <div className="loading-resumen">
                            <div className="spinner-neon"></div>
                            <p>Calculando consumo total...</p>
                        </div>
                    ) : (!resumenGlobal || resumenGlobal.length === 0) && (!cargasConConsumo || cargasConConsumo.length === 0) ? (
                        <div className="sin-consumo-global">
                            <span>📋</span>
                            <p>No hay cargas en el tablero o no tienen fórmulas definidas</p>
                        </div>
                    ) : (
                        <>
                            {/* Panel de Insights */}
                            <div className="insights-panel">
                                <h4>🎯 Insights de Producción</h4>
                                <div className="insights-grid">
                                    {estadisticas?.productoMayorConsumo && (
                                        <div className="insight-card">
                                            <div className="insight-icon">🏆</div>
                                            <div className="insight-info">
                                                <span className="insight-label">MP más consumida</span>
                                                <strong className="insight-value">{estadisticas.productoMayorConsumo?.codigo}</strong>
                                                <small>{estadisticas.productoMayorConsumo?.nombre}</small>
                                                <span className="insight-meta">{estadisticas.productoMayorConsumo?.consumoTotal?.toFixed(2)} L</span>
                                            </div>
                                        </div>
                                    )}
                                    {estadisticasCargas?.cargaMayorLitraje && (
                                        <div className="insight-card">
                                            <div className="insight-icon">📦</div>
                                            <div className="insight-info">
                                                <span className="insight-label">Carga más grande</span>
                                                <strong className="insight-value">{estadisticasCargas.cargaMayorLitraje?.codigo}</strong>
                                                <small>{estadisticasCargas.cargaMayorLitraje?.litros} L a producir</small>
                                                <span className="insight-meta">Lote: {estadisticasCargas.cargaMayorLitraje?.numeroLote || "N/A"}</span>
                                            </div>
                                        </div>
                                    )}
                                    {estadisticasCargas?.cargaMayorConsumo && estadisticasCargas.cargaMayorConsumo?.consumoTotal > 0 && (
                                        <div className="insight-card">
                                            <div className="insight-icon">⚡</div>
                                            <div className="insight-info">
                                                <span className="insight-label">Mayor consumo MP</span>
                                                <strong className="insight-value">{estadisticasCargas.cargaMayorConsumo?.codigo}</strong>
                                                <small>Consume {estadisticasCargas.cargaMayorConsumo?.consumoTotal?.toFixed(2)} L de MP</small>
                                                <span className="insight-meta">Para {estadisticasCargas.cargaMayorConsumo?.litros} L producidos</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="insight-card">
                                        <div className="insight-icon">📈</div>
                                        <div className="insight-info">
                                            <span className="insight-label">Eficiencia global</span>
                                            <strong className="insight-value">{estadisticas?.eficiencia || 0} L/L</strong>
                                            <small>Litros producidos / litros de MP</small>
                                            <span className="insight-meta">Total MP: {estadisticas?.totalMateriaPrima?.toFixed(2) || totalConsumoMP.toFixed(2)} L</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Top 3 Materias Primas más consumidas */}
                                {estadisticas?.topMaterias && estadisticas.topMaterias.length > 0 && (
                                    <div className="top-materias">
                                        <span className="top-label">🔥 Top 3 Materias Primas más consumidas</span>
                                        <div className="top-items">
                                            {estadisticas.topMaterias.map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="top-item clickable"
                                                    onClick={() => setDetalleMateriaSeleccionada(
                                                        detalleMateriaSeleccionada?.codigo === item.codigo ? null : item
                                                    )}
                                                >
                                                    <span className="top-rank">#{idx + 1}</span>
                                                    <code>{item.codigo}</code>
                                                    <span className="top-name">{item.nombre}</span>
                                                    <strong>{item.consumoTotal.toFixed(2)} L</strong>
                                                    <div className="top-bar" style={{ width: `${(item.consumoTotal / estadisticas.topMaterias[0].consumoTotal) * 100}%` }}></div>
                                                    <span className="expand-icon">{detalleMateriaSeleccionada?.codigo === item.codigo ? "▲" : "▼"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Selector de Vista */}
                            <div className="vista-selector">
                                <button 
                                    className={`vista-btn ${vistaActiva === "materias" ? "active" : ""}`}
                                    onClick={() => setVistaActiva("materias")}
                                >
                                    📦 Materias Primas ({resumenGlobal.length})
                                </button>
                                <button 
                                    className={`vista-btn ${vistaActiva === "cargas" ? "active" : ""}`}
                                    onClick={() => setVistaActiva("cargas")}
                                >
                                    📋 Por Carga ({cargasConConsumo?.length || 0})
                                </button>
                            </div>

                            {/* Filtros */}
                            <div className="filtros-container">
                                <div className="search-box-modal">
                                    <input 
                                        type="text" 
                                        placeholder="🔍 Buscar por código, lote o nombre..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                    />
                                    {busqueda && (
                                        <button className="clear-search" onClick={() => setBusqueda("")}>✖</button>
                                    )}
                                </div>
                                
                                {vistaActiva === "materias" && tiposUnicos.length > 0 && (
                                    <div className="filtro-tipos">
                                        <button 
                                            className={`tipo-filtro ${filtroTipo === "todos" ? "active" : ""}`}
                                            onClick={() => setFiltroTipo("todos")}
                                        >
                                            Todos
                                        </button>
                                        {tiposUnicos.map(tipo => (
                                            <button 
                                                key={tipo}
                                                className={`tipo-filtro ${filtroTipo === tipo ? "active" : ""}`}
                                                onClick={() => setFiltroTipo(tipo)}
                                            >
                                                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tabla de Materias Primas */}
                            {vistaActiva === "materias" && materiasFiltradas.length > 0 && (
                                <div className="tabla-resumen-global">
                                    <table className="tabla-consumo-global">
                                        <thead>
                                            <tr>
                                                <th>Código</th>
                                                <th>Materia Prima</th>
                                                <th>Tipo</th>
                                                <th>Consumo Total</th>
                                                <th>% del Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {materiasFiltradas.map((item, idx) => {
                                                const totalBase = estadisticas?.totalMateriaPrima || totalConsumoMP;
                                                const porcentaje = totalBase > 0 ? (item.consumoTotal / totalBase) * 100 : 0;
                                                return (
                                                    <tr key={idx} className={item.consumoTotal > 1000 ? 'alto-consumo' : ''}>
                                                        <td><code>{item.codigo || "N/A"}</code></td>
                                                        <td>{item.nombre || "Sin nombre"}</td>
                                                        <td>
                                                            <span className={`tipo-badge-global ${(item.tipo || "producto").toLowerCase()}`}>
                                                                {item.tipo || "Producto"}
                                                            </span>
                                                        </td>
                                                        <td><strong>{item.consumoTotal.toFixed(2)} L</strong></td>
                                                        <td>
                                                            <div className="barra-porcentaje">
                                                                <div className="barra-fill" style={{ width: `${porcentaje}%` }}></div>
                                                                <span>{porcentaje.toFixed(1)}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="total-row">
                                                <td colSpan="3"><strong>Total general:</strong></td>
                                                <td className="total-celda">
                                                    <strong>{(estadisticas?.totalMateriaPrima || totalConsumoMP).toFixed(2)} L</strong>
                                                </td>
                                                <td className="total-celda">100%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {/* Tabla de Cargas Individuales con Número de Lote */}
                            {vistaActiva === "cargas" && cargasFiltradas.length > 0 && (
                                <div className="tabla-resumen-global">
                                    <table className="tabla-consumo-global">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>N° Lote (Folio)</th>
                                                <th>Código</th>
                                                <th>Descripción</th>
                                                <th>Litros a Producir</th>
                                                <th>Consumo MP</th>
                                                <th>Eficiencia</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cargasFiltradas.map((carga, idx) => {
                                                const eficienciaCarga = carga.litros > 0 && carga.consumoTotal > 0 
                                                    ? (carga.litros / carga.consumoTotal).toFixed(2) 
                                                    : 0;
                                                
                                                return (
                                                    <tr key={idx} className={carga.consumoTotal > 500 ? 'alto-consumo' : ''}>
                                                        <td><strong>#{idx + 1}</strong></td>
                                                        <td>
                                                            <code className="lote-number" style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                                                {carga.numeroLote || "N/A"}
                                                            </code>
                                                        </td>
                                                        <td><code>{carga.codigo || "N/A"}</code></td>
                                                        <td>{carga.descripcion || "-"}</td>
                                                        <td><strong>{carga.litros || 0} L</strong></td>
                                                        <td>
                                                            {carga.consumoTotal > 0 ? (
                                                                <strong style={{ color: '#ff5f7e' }}>{carga.consumoTotal?.toFixed(2)} L</strong>
                                                            ) : (
                                                                <span className="sin-datos" style={{ color: '#ffca28' }}>⚠️ Sin fórmula</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`eficiencia-badge ${eficienciaCarga >= 0.8 ? 'buena' : eficienciaCarga > 0 ? 'media' : 'mala'}`}>
                                                                {eficienciaCarga > 0 ? `${eficienciaCarga} L/L` : 'N/A'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {vistaActiva === "materias" && materiasFiltradas.length === 0 && (
                                <div className="sin-consumo-global">
                                    <span>🔍</span>
                                    <p>No hay materias primas que coincidan con la búsqueda</p>
                                </div>
                            )}

                            {vistaActiva === "cargas" && cargasFiltradas.length === 0 && (
                                <div className="sin-consumo-global">
                                    <span>🔍</span>
                                    <p>No hay cargas que coincidan con la búsqueda</p>
                                </div>
                            )}

                            {/* Advertencia si hay cargas sin consumo */}
                            {cargasConConsumo.some(c => c.consumoTotal === 0) && (
                                <div className="aviso-consumo-global" style={{ borderLeftColor: '#ffca28', marginTop: '15px' }}>
                                    <span>⚠️</span>
                                    <small>Algunas cargas no tienen fórmula definida, por lo que su consumo de materia prima aparece en 0.</small>
                                </div>
                            )}

                            <div className="aviso-consumo-global">
                                <span>📌</span>
                                <small>El Consumo MP representa la cantidad total de materia prima necesaria para producir esta carga. Para que aparezca, la carga debe tener una fórmula asociada.</small>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="modal-footer">
                    <button className="btn-cerrar" onClick={onClose}>Cerrar</button>
                    <button className="btn-guardar" onClick={onGuardar}>Confirmar y Guardar</button>
                </div>
            </div>
        </div>
    );
};

export default ModalResumenConsumo;