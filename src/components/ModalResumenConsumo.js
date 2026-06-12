// src/components/ModalResumenConsumo.js - VERSIÓN COMPLETA CON AMBAS VISTAS
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
    const [vistaActiva, setVistaActiva] = useState("materias"); // "materias" o "cargas"
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [busqueda, setBusqueda] = useState("");
    const [detalleMateriaSeleccionada, setDetalleMateriaSeleccionada] = useState(null);
    const [materiasConConsumoReal, setMateriasConConsumoReal] = useState([]);
    const [materiasCompletas, setMateriasCompletas] = useState([]);
    const [calculando, setCalculando] = useState(false);
    const [cargasConDetalle, setCargasConDetalle] = useState([]);
    const [materiasUnicas, setMateriasUnicas] = useState([]);
    const [filaSeleccionada, setFilaSeleccionada] = useState(null);

    // Estado para controlar si mostrar solo las específicas o todas
    const [mostrarSoloEspecificas, setMostrarSoloEspecificas] = useState(true);

    // Lista de códigos de materia prima específicos en el ORDEN CORRECTO
    const codigosPermitidos = [
        'CCA10', 'CCA20', 'CCM30', 'CCM60', 'RVA50', 'RVO10',
        'RIE30', 'RAC30', 'RRN10', 'SXI10', 'SGA10', 'TTI06',
        'CCP15', 'TMB10', 'RRN20', 'AMP10', 'AEA10', 'ACO20', 'ABL10'
    ];

    const esCodigoPermitido = (codigo) => {
        if (!codigo) return false;
        return codigosPermitidos.includes(codigo.toUpperCase());
    };

    // Función para obtener nombre de materia por código
    const obtenerNombreMateria = (codigo) => {
        const nombres = {
            'CCA10': 'Carga Ácida 10',
            'CCA20': 'Carga Ácida 20',
            'CCM30': 'Carga Mineral 30',
            'CCM60': 'Carga Mineral 60',
            'RVA50': 'Resina Vinílica Ácida',
            'RVO10': 'Resina Vinílica Oleosa',
            'RIE30': 'Resina Isocianato Especial',
            'RAC30': 'Resina Acrílica',
            'RRN10': 'Resina Recubrimiento',
            'SXI10': 'Solvente Xileno',
            'SGA10': 'Solvente Glicol',
            'TTI06': 'Titanio',
            'CCP15': 'Carga Precipitada',
            'TMB10': 'Tolueno',
            'RRN20': 'Resina Recubrimiento 20',
            'AMP10': 'Aditivo Modificador',
            'AEA10': 'Aditivo Especial',
            'ACO20': 'Aditivo Cosolvente',
            'ABL10': 'Aditivo Biológico'
        };
        return nombres[codigo] || codigo;
    };

    // Función para obtener tipo de materia por código
    const obtenerTipoMateria = (codigo) => {
        if (codigo.startsWith('CCA') || codigo.startsWith('CCM') || codigo === 'CCP15') return 'CARGA';
        if (codigo.startsWith('RVA') || codigo.startsWith('RVO') || codigo.startsWith('RIE') || codigo.startsWith('RAC') || codigo.startsWith('RRN')) return 'RESINA';
        if (codigo.startsWith('SXI') || codigo.startsWith('SGA') || codigo === 'TMB10') return 'SOLVENTE';
        if (codigo === 'TTI06') return 'PIGMENTO';
        return 'ADITIVO';
    };

    // Función para extraer número de orden de un string como "V260612001"
    const extraerNumeroOrden = (ordenStr) => {
        if (!ordenStr) return 999999;
        const numeros = ordenStr.match(/\d+/g);
        if (numeros) {
            return parseInt(numeros.join(''), 10);
        }
        return ordenStr.length;
    };

    // Cargar datos para vista de materias
    useEffect(() => {
        if (visible && cargasConConsumo.length > 0) {
            recalcularConsumosReales();
            procesarCargasMatricial();
        } else if (visible && resumenGlobal.length > 0) {
            const corregidos = resumenGlobal.map(item => ({
                ...item,
                consumoTotal: item.consumoTotal * 800,
                consumoTotalOriginal: item.consumoTotal
            }));
            setMateriasCompletas(corregidos);
            const filtrados = corregidos.filter(item => esCodigoPermitido(item.codigo));
            setMateriasConConsumoReal(filtrados);
            procesarCargasMatricial();
        }
    }, [visible, cargasConConsumo, resumenGlobal]);

    // Procesar datos para la vista matricial de cargas
    const procesarCargasMatricial = async () => {
        const cargasConInfo = [];
        const mapaMaterias = new Map();

        // 🔴 Inicializar el mapa con TODAS las materias de la lista (consumo 0 por defecto)
        for (const codigo of codigosPermitidos) {
            mapaMaterias.set(codigo, {
                codigo: codigo,
                nombre: obtenerNombreMateria(codigo),
                tipo: obtenerTipoMateria(codigo),
                totalConsumo: 0
            });
        }

        for (const carga of cargasConConsumo) {
            const codigoProducto = carga.codigo || carga.codigoProducto;
            const litrosProducir = carga.litros || 0;

            // PRIORIDAD: folio > orden > numeroOrden > id
            const orden = carga.folio || carga.orden || carga.numeroOrden || `ORD-${carga.id}`;
            const lote = carga.lote || carga.folio || orden;
            const fecha = carga.fecha || new Date().toLocaleDateString();

            let consumoTotal = 0;
            const consumosPorMateria = {};

            // 🔴 Inicializar consumosPorMateria para todas las materias de la lista
            for (const codigo of codigosPermitidos) {
                consumosPorMateria[codigo] = null;
            }

            if (codigoProducto && litrosProducir > 0) {
                try {
                    const formulas = await formulasService.listarPorProducto(codigoProducto);

                    for (const formula of formulas) {
                        const mpCodigo = formula.materiaPrima?.codigo || formula.materiaPrimaCodigo;
                        const mpNombre = formula.materiaPrima?.nombre || formula.materiaPrimaNombre;
                        const mpTipo = formula.materiaPrima?.tipo || formula.materiaPrimaTipo;
                        const cantidadPorLitro = formula.cantidadPorLitro || 0;
                        const consumo = cantidadPorLitro * litrosProducir;
                        consumoTotal += consumo;

                        // Solo guardar si está en la lista permitida
                        if (codigosPermitidos.includes(mpCodigo)) {
                            consumosPorMateria[mpCodigo] = {
                                codigo: mpCodigo,
                                nombre: mpNombre,
                                tipo: mpTipo,
                                consumo: consumo,
                                cantidadPorLitro: cantidadPorLitro
                            };

                            const existing = mapaMaterias.get(mpCodigo);
                            if (existing) {
                                existing.totalConsumo += consumo;
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error obteniendo fórmulas para ${codigoProducto}:`, error);
                }
            }

            cargasConInfo.push({
                id: carga.id,
                orden: orden,
                lote: lote,
                producto: codigoProducto,
                productoNombre: carga.productoNombre || carga.nombre || carga.descripcion || "Producto",
                litros: litrosProducir,
                consumoTotal: consumoTotal.toFixed(2),
                fecha: fecha,
                estado: carga.estado || "Programada",
                consumos: consumosPorMateria,
                numeroOrden: extraerNumeroOrden(orden)
            });
        }

        // 🔴 Crear el arreglo de materias en el ORDEN específico de codigosPermitidos
        const materiasOrdenadas = [];
        for (const codigo of codigosPermitidos) {
            if (mapaMaterias.has(codigo)) {
                materiasOrdenadas.push(mapaMaterias.get(codigo));
            } else {
                // Si no existe, crear una con consumo 0
                materiasOrdenadas.push({
                    codigo: codigo,
                    nombre: obtenerNombreMateria(codigo),
                    tipo: obtenerTipoMateria(codigo),
                    totalConsumo: 0
                });
            }
        }

        setMateriasUnicas(materiasOrdenadas);
        // 🔴 ORDENAR CARGAS POR NÚMERO DE ORDEN (menor a mayor)
        const cargasOrdenadas = [...cargasConInfo].sort((a, b) => a.numeroOrden - b.numeroOrden);
        setCargasConDetalle(cargasOrdenadas);
    };

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

    // Calcular totales para la vista de cargas
    const totalLitrosGeneral = cargasConDetalle.reduce((sum, c) => sum + c.litros, 0);
    const totalCargasCount = cargasConDetalle.length;

    // Filtrar cargas por búsqueda
    const cargasFiltradas = useMemo(() => {
        if (!busqueda) return cargasConDetalle;
        const termino = busqueda.toLowerCase();
        return cargasConDetalle.filter(carga =>
            carga.orden?.toLowerCase().includes(termino) ||
            carga.lote?.toLowerCase().includes(termino) ||
            carga.producto?.toLowerCase().includes(termino) ||
            carga.productoNombre?.toLowerCase().includes(termino)
        );
    }, [cargasConDetalle, busqueda]);

    if (!visible) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-resumen-global modal-grande" onClick={(e) => e.stopPropagation()}>
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
                    ) : (!datosMostrar || datosMostrar.length === 0) && cargasConDetalle.length === 0 ? (
                        <div className="sin-consumo-global">
                            <span>📋</span>
                            <p>No hay cargas en el tablero o no tienen fórmulas definidas</p>
                        </div>
                    ) : (
                        <>
                            {/* Selector de vista */}
                            <div className="vista-selector">
                                <button
                                    className={`vista-btn ${vistaActiva === "materias" ? "active" : ""}`}
                                    onClick={() => setVistaActiva("materias")}
                                >
                                    📦 Por Materia Prima
                                </button>
                                <button
                                    className={`vista-btn ${vistaActiva === "cargas" ? "active" : ""}`}
                                    onClick={() => setVistaActiva("cargas")}
                                >
                                    📋 Por Carga / Lote
                                </button>
                            </div>

                            {vistaActiva === "materias" ? (
                                /* ========== VISTA DE MATERIAS PRIMAS (ORIGINAL) ========== */
                                <>
                                    {/* Panel de Insights con el selector integrado */}
                                    <div className="insights-panel">
                                        <div className="insights-header-row">
                                            <h4>🎯 Insights de Producción</h4>
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
                                </>
                            ) : (
                                /* ========== VISTA DE CARGAS / LOTES (MATRICIAL) ========== */
                                <>
                                    {/* Resumen de cargas */}
                                    <div className="matricial-resumen">
                                        <div className="resumen-item">
                                            <span className="resumen-icon">📋</span>
                                            <div>
                                                <span className="resumen-label">ÓRDENES</span>
                                                <span className="resumen-valor">{totalCargasCount}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-item">
                                            <span className="resumen-icon">📦</span>
                                            <div>
                                                <span className="resumen-label">LITROS TOTALES</span>
                                                <span className="resumen-valor">{totalLitrosGeneral.toLocaleString()} L</span>
                                            </div>
                                        </div>
                                        <div className="resumen-item">
                                            <span className="resumen-icon">🔬</span>
                                            <div>
                                                <span className="resumen-label">MATERIAS PRIMAS</span>
                                                <span className="resumen-valor">{materiasUnicas.length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Buscador */}
                                    <div className="matricial-buscador">
                                        <input
                                            type="text"
                                            placeholder="🔍 Buscar por orden, lote o producto..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            className="buscador-input"
                                        />
                                        {busqueda && (
                                            <button className="clear-busqueda" onClick={() => setBusqueda("")}>✖</button>
                                        )}
                                    </div>

                                    {/* Tabla Matricial */}
                                    <div className="matricial-tabla-container">
                                        <table className="matricial-tabla">
                                            <thead>
                                                <tr>
                                                    <th className="sticky-col">ORDEN</th>
                                                    <th className="sticky-col-2">CÓDIGO</th>
                                                    <th className="sticky-col-3">CANTIDAD (L)</th>
                                                    {materiasUnicas.map(materia => (
                                                        <th key={materia.codigo} title={materia.nombre}>
                                                            {materia.codigo}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cargasFiltradas.map((carga, idx) => (
                                                    <tr
                                                        key={carga.id}
                                                        className={`${carga.estado === "Completada" ? "fila-completada" : "fila-pendiente"} ${filaSeleccionada === carga.id ? "fila-seleccionada" : ""}`}
                                                        onClick={() => setFilaSeleccionada(filaSeleccionada === carga.id ? null : carga.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <td className="sticky-col">
                                                            <code>{carga.orden}</code>
                                                        </td>
                                                        <td className="sticky-col-2">
                                                            <code className="producto-codigo-solo">{carga.producto}</code>
                                                        </td>
                                                        <td className="sticky-col-3 cantidad">
                                                            {carga.litros.toLocaleString()}
                                                        </td>
                                                        {materiasUnicas.map(materia => {
                                                            const consumo = carga.consumos[materia.codigo];
                                                            const valor = consumo ? consumo.consumo.toFixed(2) : "-";
                                                            const esAlto = consumo && consumo.consumo > 100;
                                                            return (
                                                                <td key={materia.codigo} className={esAlto ? "consumo-alto" : ""}>
                                                                    {valor !== "-" ? (
                                                                        <div className="consumo-cell">
                                                                            <span>{valor}</span>
                                                                            <div className="consumo-bar" style={{ width: `${Math.min(100, (parseFloat(valor) / 800) * 100)}%` }}></div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="sin-consumo">—</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="total-row">
                                                    <td colSpan="3" className="total-label">
                                                        <strong>TOTALES:</strong>
                                                    </td>
                                                    {materiasUnicas.map(materia => {
                                                        const totalMateria = materiasUnicas.find(m => m.codigo === materia.codigo)?.totalConsumo || 0;
                                                        return (
                                                            <td key={materia.codigo} className="total-valor">
                                                                <strong>{totalMateria.toFixed(2)}</strong>
                                                                <div className="total-bar" style={{ width: `${Math.min(100, (totalMateria / totalLitrosGeneral) * 100)}%` }}></div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Leyenda */}
                                    <div className="matricial-leyenda">
                                        <div className="leyenda-item">
                                            <span className="leyenda-color consumo-alto"></span>
                                            <span>Consumo &gt; 100 L</span>
                                        </div>
                                        <div className="leyenda-item">
                                            <span className="leyenda-color barra-verde"></span>
                                            <span>Barra de consumo relativo</span>
                                        </div>
                                        <div className="leyenda-item">
                                            <span className="leyenda-bg completada"></span>
                                            <span>Carga completada</span>
                                        </div>
                                        <div className="leyenda-item">
                                            <span className="leyenda-bg pendiente"></span>
                                            <span>Carga pendiente</span>
                                        </div>
                                    </div>
                                </>
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