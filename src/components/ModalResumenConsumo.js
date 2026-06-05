// src/components/ModalResumenConsumo.js - VERSIÓN CON SELECTOR INTEGRADO EN INSIGHTS
import React, { useState, useMemo, useEffect } from "react";
import { formulasService } from "../services/formulasService";
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
    const [materiasConConsumoReal, setMateriasConConsumoReal] = useState([]);
    const [materiasCompletas, setMateriasCompletas] = useState([]);
    const [calculando, setCalculando] = useState(false);

    // Estado para controlar si mostrar solo las específicas o todas
    const [mostrarSoloEspecificas, setMostrarSoloEspecificas] = useState(true);

    // Lista de códigos de materia prima específicos
    const codigosPermitidos = [
        'CCA10', 'CCA20', 'CCM30', 'CCM60', 'RVA50', 'RVO10',
        'RIE30', 'RAC30', 'RRN10', 'SXI10', 'SGA10', 'TT06',
        'CCP15', 'TMB10', 'RRN20', 'AMP10', 'AEA10', 'ACO20', 'ABL10'
    ];

    const esCodigoPermitido = (codigo) => {
        if (!codigo) return false;
        return codigosPermitidos.includes(codigo.toUpperCase());
    };

    useEffect(() => {
        if (visible && cargasConConsumo.length > 0) {
            recalcularConsumosReales();
        } else if (visible && resumenGlobal.length > 0) {
            const corregidos = resumenGlobal.map(item => ({
                ...item,
                consumoTotal: item.consumoTotal * 800,
                consumoTotalOriginal: item.consumoTotal
            }));
            setMateriasCompletas(corregidos);
            const filtrados = corregidos.filter(item => esCodigoPermitido(item.codigo));
            setMateriasConConsumoReal(filtrados);
        }
    }, [visible, cargasConConsumo, resumenGlobal]);

    const recalcularConsumosReales = async () => {
        setCalculando(true);
        try {
            const mapaMaterias = new Map();
            const mapaMateriasCompletas = new Map();

            for (const carga of cargasConConsumo) {
                const codigoProducto = carga.codigo;
                const litrosProducir = carga.litros || 0;

                if (!codigoProducto || litrosProducir === 0) continue;

                try {
                    const formulas = await formulasService.listarPorProducto(codigoProducto);

                    for (const formula of formulas) {
                        const mpId = formula.materiaPrima?.id || formula.materiaPrimaId;
                        const mpCodigo = formula.materiaPrima?.codigo || formula.materiaPrimaCodigo;
                        const mpNombre = formula.materiaPrima?.nombre || formula.materiaPrimaNombre;
                        const mpTipo = formula.materiaPrima?.tipo || formula.materiaPrimaTipo;
                        const cantidadPorLitro = formula.cantidadPorLitro;

                        const consumo = cantidadPorLitro * litrosProducir;

                        // Todas las materias
                        if (mapaMateriasCompletas.has(mpId)) {
                            const existente = mapaMateriasCompletas.get(mpId);
                            existente.consumoTotal += consumo;
                        } else {
                            mapaMateriasCompletas.set(mpId, {
                                id: mpId,
                                codigo: mpCodigo,
                                nombre: mpNombre,
                                tipo: mpTipo,
                                consumoTotal: consumo
                            });
                        }

                        // Solo específicas
                        if (esCodigoPermitido(mpCodigo)) {
                            if (mapaMaterias.has(mpId)) {
                                const existente = mapaMaterias.get(mpId);
                                existente.consumoTotal += consumo;
                            } else {
                                mapaMaterias.set(mpId, {
                                    id: mpId,
                                    codigo: mpCodigo,
                                    nombre: mpNombre,
                                    tipo: mpTipo,
                                    consumoTotal: consumo
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error al obtener fórmulas para ${codigoProducto}:`, error);
                }
            }

            const resultadoCompletas = Array.from(mapaMateriasCompletas.values()).sort((a, b) => b.consumoTotal - a.consumoTotal);
            const resultadoEspecificas = Array.from(mapaMaterias.values()).sort((a, b) => b.consumoTotal - a.consumoTotal);

            setMateriasCompletas(resultadoCompletas);
            setMateriasConConsumoReal(resultadoEspecificas);
        } catch (error) {
            console.error("Error recalculando consumos:", error);
            const filtrado = resumenGlobal.filter(item => esCodigoPermitido(item.codigo));
            setMateriasConConsumoReal(filtrado);
            setMateriasCompletas(resumenGlobal);
        } finally {
            setCalculando(false);
        }
    };

    const datosMostrar = mostrarSoloEspecificas ? materiasConConsumoReal : materiasCompletas;

    const estadisticas = useMemo(() => {
        if (!datosMostrar || datosMostrar.length === 0) return null;

        const productoMayorConsumo = [...datosMostrar].sort((a, b) => b.consumoTotal - a.consumoTotal)[0];
        const totalMateriaPrima = datosMostrar.reduce((sum, c) => sum + c.consumoTotal, 0);
        const eficiencia = totalLitros > 0 && totalMateriaPrima > 0 ? (totalLitros / totalMateriaPrima).toFixed(2) : 0;
        const topMaterias = [...datosMostrar].sort((a, b) => b.consumoTotal - a.consumoTotal).slice(0, 3);

        return { productoMayorConsumo, totalMateriaPrima, eficiencia, topMaterias };
    }, [datosMostrar, totalLitros]);

    const materiasFiltradas = useMemo(() => {
        if (!datosMostrar || datosMostrar.length === 0) return [];
        let filtradas = [...datosMostrar];
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
    }, [datosMostrar, filtroTipo, busqueda]);

    if (!visible) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-resumen-global" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📊 Resumen de Consumo de Materia Prima</h3>
                    <button className="modal-close" onClick={onClose}>✖</button>
                </div>

                <div className="modal-body">
                    {cargando || calculando ? (
                        <div className="loading-resumen">
                            <div className="spinner-neon"></div>
                            <p>Calculando consumo total...</p>
                        </div>
                    ) : (!datosMostrar || datosMostrar.length === 0) ? (
                        <div className="sin-consumo-global">
                            <span>📋</span>
                            <p>No hay cargas en el tablero o no tienen fórmulas definidas</p>
                        </div>
                    ) : (
                        <>
                            {/* Panel de Insights CON EL SELECTOR INTEGRADO */}
                            <div className="insights-panel">
                                <div className="insights-header-row">
                                    <h4>🎯 Insights de Producción</h4>
                                    {/* 🔴 SELECTOR INTEGRADO - más compacto */}
                                    <div className="insights-toggle">
                                        <button
                                            className={`insight-toggle-btn ${mostrarSoloEspecificas ? 'active' : ''}`}
                                            onClick={() => setMostrarSoloEspecificas(true)}
                                            title="Mostrar solo las 19 materias primas principales"
                                        >
                                            📌 {materiasConConsumoReal.length}
                                        </button>
                                        <button
                                            className={`insight-toggle-btn ${!mostrarSoloEspecificas ? 'active' : ''}`}
                                            onClick={() => setMostrarSoloEspecificas(false)}
                                            title="Mostrar todas las materias primas"
                                        >
                                            📦 {materiasCompletas.length}
                                        </button>
                                    </div>
                                </div>
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
                                    <div className="insight-card">
                                        <div className="insight-icon">📈</div>
                                        <div className="insight-info">
                                            <span className="insight-label">Eficiencia global</span>
                                            <strong className="insight-value">{estadisticas?.eficiencia || 0} L/L</strong>
                                            <small>Litros producidos / litros de MP</small>
                                            <span className="insight-meta">Total MP: {estadisticas?.totalMateriaPrima?.toFixed(2)} L</span>
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

                            {/* Filtros */}
                            <div className="filtros-container">
                                <div className="search-box-modal">
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar por código o nombre..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                    />
                                    {busqueda && (
                                        <button className="clear-search" onClick={() => setBusqueda("")}>✖</button>
                                    )}
                                </div>

                                <div className="filtro-tipos">
                                    <button
                                        className={`tipo-filtro ${filtroTipo === "todos" ? "active" : ""}`}
                                        onClick={() => setFiltroTipo("todos")}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        className={`tipo-filtro ${filtroTipo === "base" ? "active" : ""}`}
                                        onClick={() => setFiltroTipo("base")}
                                    >
                                        Base
                                    </button>
                                    <button
                                        className={`tipo-filtro ${filtroTipo === "pigmento" ? "active" : ""}`}
                                        onClick={() => setFiltroTipo("pigmento")}
                                    >
                                        Pigmento
                                    </button>
                                    <button
                                        className={`tipo-filtro ${filtroTipo === "solvente" ? "active" : ""}`}
                                        onClick={() => setFiltroTipo("solvente")}
                                    >
                                        Solvente
                                    </button>
                                    <button
                                        className={`tipo-filtro ${filtroTipo === "aditivo" ? "active" : ""}`}
                                        onClick={() => setFiltroTipo("aditivo")}
                                    >
                                        Aditivo
                                    </button>
                                </div>
                            </div>

                            {/* Tabla de Materias Primas */}
                            {materiasFiltradas.length > 0 && (
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
                                                const totalBase = estadisticas?.totalMateriaPrima || materiasFiltradas.reduce((sum, c) => sum + c.consumoTotal, 0);
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
                                                    <strong>{(estadisticas?.totalMateriaPrima || materiasFiltradas.reduce((sum, c) => sum + c.consumoTotal, 0)).toFixed(2)} L</strong>
                                                </td>
                                                <td className="total-celda">100%</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {materiasFiltradas.length === 0 && (
                                <div className="sin-consumo-global">
                                    <span>🔍</span>
                                    <p>No hay materias primas que coincidan con la búsqueda</p>
                                </div>
                            )}

                            <div className="aviso-consumo-global">
                                <span>📌</span>
                                <small>El Consumo MP representa la cantidad total de materia prima necesaria para producir todas las cargas del tablero.</small>
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