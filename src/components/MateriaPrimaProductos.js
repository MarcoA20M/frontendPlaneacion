// src/components/MateriaPrimaProductos.js
import React, { useState, useEffect } from "react";
import { materiaPrimaService } from "../services/materiaPrimaService";
import { formulasService } from "../services/formulasService";
import { familiaService } from "../services/familiaService";
import "../styles/trazabilidad.css";

export default function MateriaPrimaProductos() {
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [selectedMP, setSelectedMP] = useState(null);
    const [productosRelacionados, setProductosRelacionados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingProductos, setLoadingProductos] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [produccionMensual, setProduccionMensual] = useState(1000);
    const [productosDisponibles, setProductosDisponibles] = useState([]);
    const [todasLasFormulas, setTodasLasFormulas] = useState([]);

    const [filtroNombreProducto, setFiltroNombreProducto] = useState("");

    const [imagenFamiliaProducto, setImagenFamiliaProducto] = useState(null);
    const [familiaProducto, setFamiliaProducto] = useState(null);

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        setLoading(true);
        try {
            const mpData = await materiaPrimaService.listarTodas();
            setMateriasPrimas(mpData);

            const productosResponse = await fetch("http://localhost:8080/api/productos");
            let productos = [];
            if (productosResponse.ok) {
                productos = await productosResponse.json();
                setProductosDisponibles(productos);
            }

            const formulasPorProducto = await cargarTodasLasFormulas(productos);
            setTodasLasFormulas(formulasPorProducto);

        } catch (error) {
            console.error("Error cargando datos iniciales:", error);
        } finally {
            setLoading(false);
        }
    };

    const cargarImagenFamiliaProducto = async (producto) => {
        if (!producto || !producto.familiaId) {
            setImagenFamiliaProducto(null);
            setFamiliaProducto(null);
            return;
        }

        try {
            const familiaResponse = await fetch(`http://localhost:8080/api/familias/${producto.familiaId}`);
            if (familiaResponse.ok) {
                const familia = await familiaResponse.json();
                setFamiliaProducto(familia);
            }

            const imgUrl = familiaService.getImagenUrl(producto.familiaId);
            setImagenFamiliaProducto(imgUrl);
        } catch (error) {
            console.error("Error cargando imagen de familia:", error);
            setImagenFamiliaProducto(null);
            setFamiliaProducto(null);
        }
    };

    const cargarTodasLasFormulas = async (productos) => {
        const todasLasFormulas = [];

        if (!productos || productos.length === 0) return todasLasFormulas;

        for (const producto of productos) {
            try {
                const formulas = await formulasService.listarPorProducto(producto.codigo);
                if (formulas && formulas.length > 0) {
                    formulas.forEach(formula => {
                        todasLasFormulas.push({
                            ...formula,
                            productoId: producto.codigo,
                            productoNombre: producto.descripcion,
                            productoCodigo: producto.codigo,
                            familiaId: producto.familiaId
                        });
                    });
                }
            } catch (error) {
                console.error(`Error cargando fórmulas para ${producto.codigo}:`, error);
            }
        }

        return todasLasFormulas;
    };

    const handleSelectMP = async (mp) => {
        setSelectedMP(mp);
        setLoadingProductos(true);
        setFiltroNombreProducto("");

        try {
            const productosQueUsan = [];

            for (const formula of todasLasFormulas) {
                const usaMP = formula.materiaPrima?.id === mp.id ||
                    formula.materiaPrimaId === mp.id ||
                    formula.materiaPrimaCodigo === mp.codigo;

                if (usaMP) {
                    const producto = productosDisponibles.find(p => p.codigo === formula.productoId);

                    productosQueUsan.push({
                        ...formula,
                        producto: producto || {
                            codigo: formula.productoId,
                            descripcion: formula.productoNombre || "Producto",
                            familiaId: formula.familiaId
                        },
                        cantidadPorLitro: formula.cantidadPorLitro || 0,
                        consumoMensual: (formula.cantidadPorLitro || 0) * produccionMensual
                    });
                }
            }

            setProductosRelacionados(productosQueUsan);

        } catch (error) {
            console.error("Error cargando productos relacionados:", error);
            setProductosRelacionados([]);
        } finally {
            setLoadingProductos(false);
        }
    };

    const handleSelectMPAlternativo = async (mp) => {
        setSelectedMP(mp);
        setLoadingProductos(true);
        setFiltroNombreProducto("");

        try {
            const response = await fetch(`http://localhost:8080/api/formulas/materia-prima/${mp.id}`);

            if (response.ok) {
                const formulas = await response.json();
                const productosConDetalles = await Promise.all(
                    formulas.map(async (formula) => {
                        const productoResponse = await fetch(`http://localhost:8080/api/productos/${formula.productoId}`);
                        const producto = productoResponse.ok ? await productoResponse.json() : null;

                        return {
                            ...formula,
                            producto: producto,
                            cantidadPorLitro: formula.cantidadPorLitro || 0,
                            consumoMensual: (formula.cantidadPorLitro || 0) * produccionMensual
                        };
                    })
                );
                setProductosRelacionados(productosConDetalles);
            } else {
                await handleSelectMP(mp);
            }
        } catch (error) {
            console.error("Error en endpoint directo, usando método alternativo:", error);
            await handleSelectMP(mp);
        } finally {
            setLoadingProductos(false);
        }
    };

    const handleVerProducto = async (producto) => {
        await cargarImagenFamiliaProducto(producto);
        window.location.href = `/mantenimiento/formulas?producto=${producto.codigo}`;
    };

    const obtenerNombresUnicos = () => {
        const nombres = productosRelacionados.map(p => {
            const descripcion = p.producto?.descripcion || p.productoNombre;
            if (descripcion) {
                const palabras = descripcion.split(' ');
                for (const palabra of palabras) {
                    if (palabra === palabra.toUpperCase() && palabra.length > 2) {
                        return palabra;
                    }
                }
                return descripcion.split(' ')[0].toUpperCase();
            }
            return null;
        }).filter(Boolean);

        const unicos = [...new Set(nombres)].sort();
        return unicos;
    };

    const productosFiltrados = filtroNombreProducto
        ? productosRelacionados.filter(p => {
            const descripcion = p.producto?.descripcion || p.productoNombre;
            return descripcion?.toUpperCase().includes(filtroNombreProducto.toUpperCase());
        })
        : productosRelacionados;

    const resetearFiltro = () => {
        setFiltroNombreProducto("");
    };

    const getTipoIcon = (tipo) => {
        const iconos = {
            'CARGA': '📦',
            'PIGMENTO': '🎨',
            'SOLVENTE': '💧',
            'RESINA': '🛢️',
            'ADITIVO': '⚗️'
        };
        return iconos[tipo] || '📦';
    };

    const getEstadoColor = (mp) => {
        if (mp.critico) return 'critico';
        if (mp.alerta) return 'alerta';
        return 'normal';
    };

    const calcularDiasStock = () => {
        if (!selectedMP || productosFiltrados.length === 0) return 0;
        const consumoDiario = productosFiltrados.reduce((sum, p) => sum + (p.consumoMensual || 0), 0) / 30;
        if (consumoDiario === 0) return 999;
        return Math.floor(selectedMP.nivelActual / consumoDiario);
    };

    const filteredMP = materiasPrimas.filter(mp => {
        const matchesSearch = mp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mp.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTipo = filtroTipo === "todos" || mp.tipo === filtroTipo;
        return matchesSearch && matchesTipo;
    });

    if (loading) {
        return (
            <div className="trazabilidad-container">
                <div className="loading-content">
                    <div className="spinner-neon"></div>
                    <p>Cargando materias primas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="trazabilidad-container">

            <div className="trazabilidad-layout">
                {/* Panel izquierdo */}
                <div className="mp-list-panel">
                    <div className="filtros-superiores">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="🔍 Buscar materia prima..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="tipo-filtros">
                            <button
                                className={`tipo-filtro-btn ${filtroTipo === "todos" ? "active" : ""}`}
                                onClick={() => setFiltroTipo("todos")}
                            >
                                Todos
                            </button>
                            <button
                                className={`tipo-filtro-btn ${filtroTipo === "CARGA" ? "active" : ""}`}
                                onClick={() => setFiltroTipo("CARGA")}
                            >
                                📦 Carga
                            </button>
                            <button
                                className={`tipo-filtro-btn ${filtroTipo === "PIGMENTO" ? "active" : ""}`}
                                onClick={() => setFiltroTipo("PIGMENTO")}
                            >
                                🎨 Pigmento
                            </button>

                             <button
                                className={`tipo-filtro-btn ${filtroTipo === "RESINA" ? "active" : ""}`}
                                onClick={() => setFiltroTipo("RESINA")}
                            >
                                🛢️ Resina
                            </button>
                            <button
                                className={`tipo-filtro-btn ${filtroTipo === "SOLVENTE" ? "active" : ""}`}
                                onClick={() => setFiltroTipo("SOLVENTE")}
                            >
                                💧 Solvente
                            </button>
                            <button
                                className={`tipo-filtro-btn ${filtroTipo === "ADITIVO" ? "active" : ""}`}
                                onClick={() => setFiltroTipo("ADITIVO")}
                            >
                                ⚗️ Aditivo
                            </button>
                        </div>
                    </div>

                    <div className="mp-list">
                        {filteredMP.length > 0 ? (
                            filteredMP.map(mp => (
                                <div
                                    key={mp.id}
                                    className={`mp-item ${selectedMP?.id === mp.id ? 'active' : ''} ${getEstadoColor(mp)}`}
                                    onClick={() => handleSelectMPAlternativo(mp)}
                                >
                                    <div className="mp-icon">
                                        {getTipoIcon(mp.tipo)}
                                    </div>
                                    <div className="mp-info">
                                        <div className="mp-name">{mp.nombre}</div>
                                        <div className="mp-details">
                                            <span className="mp-code">{mp.codigo || 'Sin código'}</span>
                                            <span className="mp-type">{mp.tipo}</span>
                                        </div>
                                        <div className="mp-stock">
                                            <div className="stock-bar-container">
                                                <div
                                                    className="stock-bar"
                                                    style={{ width: `${Math.min(100, mp.porcentajeLlenado || 0)}%` }}
                                                />
                                            </div>
                                            <span className="stock-text">
                                                {mp.nivelActual?.toLocaleString()} / {mp.capacidadMaxima?.toLocaleString()} {mp.unidad}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mp-status">
                                        {mp.critico && <span className="badge-critico">🚨 CRÍTICO</span>}
                                        {mp.alerta && !mp.critico && <span className="badge-alerta">⚠️ ALERTA</span>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                <p>🔍 No se encontraron materias primas</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel derecho - CON HEADER STICKY */}
                <div className="productos-panel">
                    {selectedMP ? (
                        <>
                            {/* HEADER STICKY - se queda fijo mientras scrollea */}
                            <div className="productos-header-sticky">
                                <div className="mp-detalle-header">
                                    <div className="mp-header-row">
                                        <div className="mp-titulo">
                                            <span className="mp-icon-large">{getTipoIcon(selectedMP.tipo)}</span>
                                            <div>
                                                <h3>{selectedMP.nombre}</h3>
                                                <div className="mp-meta">
                                                    <span className="meta-code">{selectedMP.codigo}</span>
                                                    <span className="meta-type">{selectedMP.tipo}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* FILTRO CON BOTONES */}
                                        {productosRelacionados.length > 0 && (
                                            <div className="filtro-lateral">
                                                <div className="filtro-lateral-label">
                                                    <span>🔍 Filtrar por nombre</span>
                                                </div>
                                                <div className="filtro-lateral-botones">
                                                    <button
                                                        className={`filtro-lateral-boton ${filtroNombreProducto === "" ? "active" : ""}`}
                                                        onClick={resetearFiltro}
                                                    >
                                                        Todos ({productosRelacionados.length})
                                                    </button>
                                                    {obtenerNombresUnicos().map(nombre => {
                                                        const cantidad = productosRelacionados.filter(p => {
                                                            const descripcion = p.producto?.descripcion || p.productoNombre;
                                                            return descripcion?.toUpperCase().includes(nombre);
                                                        }).length;
                                                        return (
                                                            <button
                                                                key={nombre}
                                                                className={`filtro-lateral-boton ${filtroNombreProducto === nombre ? "active" : ""}`}
                                                                onClick={() => setFiltroNombreProducto(nombre)}
                                                            >
                                                                {nombre} ({cantidad})
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {filtroNombreProducto && (
                                                    <div className="filtro-lateral-info">
                                                        Mostrando <span>{productosFiltrados.length}</span> de {productosRelacionados.length} productos
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mp-stock-detalle">
                                        <div className="stock-info">
                                            <span className="stock-label">Stock actual:</span>
                                            <strong className={`stock-value ${getEstadoColor(selectedMP)}`}>
                                                {selectedMP.nivelActual?.toLocaleString()} {selectedMP.unidad}
                                            </strong>
                                        </div>
                                        <div className="umbrales">
                                            <span>⚠️ Alerta: {selectedMP.umbralAlerta?.toLocaleString()} {selectedMP.unidad}</span>
                                            <span>🚨 Crítico: {selectedMP.umbralCritico?.toLocaleString()} {selectedMP.unidad}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CONTENIDO SCROLLABLE */}
                            <div className="productos-scrollable">
                                <div className="productos-consumo">
                                    <div className="section-header">
                                        <h4>📋 Productos que consumen esta materia prima</h4>
                                        <div className="produccion-control">
                                            <label>Producción mensual (L):</label>
                                            <input
                                                type="number"
                                                value={produccionMensual}
                                                onChange={(e) => setProduccionMensual(Number(e.target.value))}
                                                className="produccion-input"
                                            />
                                        </div>
                                    </div>

                                    {loadingProductos ? (
                                        <div className="loading-productos">
                                            <div className="spinner-small"></div>
                                            <p>Buscando productos relacionados...</p>
                                        </div>
                                    ) : productosFiltrados.length > 0 ? (
                                        <>
                                            <div className="productos-grid">
                                                {productosFiltrados.map((relacion, idx) => {
                                                    const consumoMensual = (relacion.cantidadPorLitro || 0) * produccionMensual;
                                                    const porcentajeStock = selectedMP.nivelActual > 0
                                                        ? (consumoMensual / selectedMP.nivelActual) * 100
                                                        : 0;

                                                    return (
                                                        <div key={idx} className="producto-card">
                                                            <div className="producto-header">
                                                                {relacion.producto?.familiaId ? (
                                                                    <div className="producto-imagen-familia">
                                                                        <img
                                                                            src={familiaService.getImagenUrl(relacion.producto.familiaId)}
                                                                            alt={relacion.producto?.descripcion || 'Producto'}
                                                                            className="producto-familia-img"
                                                                            onError={(e) => {
                                                                                e.target.style.display = 'none';
                                                                                e.target.parentElement.innerHTML = '<span class="producto-icono-fallback">📦</span>';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="producto-icono">📦</div>
                                                                )}
                                                                <div className="producto-info-principal">
                                                                    <h5>{relacion.producto?.descripcion || relacion.productoNombre || 'Producto'}</h5>
                                                                    <span className="producto-codigo">{relacion.producto?.codigo || relacion.productoId}</span>
                                                                </div>
                                                                <div className="producto-badge">
                                                                    {((relacion.cantidadPorLitro || 0) * 100 / 800).toFixed(1)}% de la fórmula
                                                                </div>
                                                            </div>

                                                            <div className="producto-detalles">
                                                                <div className="detalle-grupo">
                                                                    <div className="detalle-item">
                                                                        <span className="detalle-icon">📊</span>
                                                                        <div>
                                                                            <span className="detalle-label">Cantidad por litro:</span>
                                                                            <strong>{(relacion.cantidadPorLitro || 0).toFixed(3)} {selectedMP.unidad}/L</strong>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="impacto-bar">
                                                                    <div className="impacto-label">Impacto en stock mensual:</div>
                                                                    <div className="impacto-bar-container">
                                                                        <div
                                                                            className="impacto-bar-fill"
                                                                            style={{ width: `${Math.min(100, porcentajeStock)}%` }}
                                                                        />
                                                                    </div>
                                                                    <div className="impacto-text">
                                                                        Consume el {porcentajeStock.toFixed(1)}% del stock actual
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="producto-actions">
                                                                <button
                                                                    className="btn-ver-formula"
                                                                    onClick={() => handleVerProducto(relacion.producto)}
                                                                >
                                                                    Ver fórmula completa →
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="resumen-consumo">
                                                <h4>📊 Resumen de impacto en inventario</h4>
                                                <div className="resumen-grid">
                                                    <div className="resumen-card">
                                                        <div className="resumen-icon">🏭</div>
                                                        <div className="resumen-info">
                                                            <span className="resumen-label">Total productos</span>
                                                            <span className="resumen-number">{productosFiltrados.length}</span>
                                                        </div>
                                                    </div>
                                                    <div className="resumen-card">
                                                        <div className="resumen-icon">📦</div>
                                                        <div className="resumen-info">
                                                            <span className="resumen-label">Consumo mensual total</span>
                                                            <span className="resumen-number">
                                                                {productosFiltrados.reduce((sum, p) => sum + ((p.cantidadPorLitro || 0) * produccionMensual), 0).toLocaleString()} {selectedMP.unidad}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="resumen-card">
                                                        <div className="resumen-icon">⏰</div>
                                                        <div className="resumen-info">
                                                            <span className="resumen-label">Días de stock restante</span>
                                                            <span className={`resumen-number ${calcularDiasStock() < 30 ? 'warning' : ''}`}>
                                                                {calcularDiasStock()} días
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="no-productos">
                                            <div className="no-data-icon">🔍</div>
                                            <h3>No hay productos que coincidan con "{filtroNombreProducto}"</h3>
                                            <p>Esta materia prima no está siendo utilizada en ninguna fórmula con ese nombre</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">
                            <div className="no-selection-icon">🔗</div>
                            <h3>Selecciona una materia prima</h3>
                            <p>Elige cualquier materia prima del panel izquierdo para ver:</p>
                            <ul className="feature-list">
                                <li>✓ Qué productos la consumen</li>
                                <li>✓ Cantidad utilizada por fórmula</li>
                                <li>✓ Consumo mensual estimado</li>
                                <li>✓ Impacto en tu inventario</li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}