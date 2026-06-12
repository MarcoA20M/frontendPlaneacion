// src/screens/FamiliaProductosScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { familiaService } from "../services/familiaService";
import { productoService } from "../services/productoService";
import { formulasService } from "../services/formulasService";
import { materiaPrimaService } from "../services/materiaPrimaService";
import "../styles/familia-productos.css";

export default function FamiliaProductosScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [familia, setFamilia] = useState(null);
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [imagenFamilia, setImagenFamilia] = useState(null);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    // Datos del producto seleccionado
    const [productoDetalle, setProductoDetalle] = useState(null);
    const [formulasProducto, setFormulasProducto] = useState([]);
    const [ventasMensuales, setVentasMensuales] = useState(0);
    const [programaciones, setProgramaciones] = useState([]);
    const [consumoCritico, setConsumoCritico] = useState([]);
    const [stockActual, setStockActual] = useState(0);
    
    const MATERIAS_IMPORTANTES = [
        "CCA10", "CCA20", "CCM30", "CCM60", "RVA50", "RVO10",
        "RIE30", "RAC30", "RRN10", "SXI10", "SGA10", "TTI06",
        "CCP15", "RRN20", "AMP10", "AEA10", "ACO20", "ABL10", "TMB10"
    ];

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const familiaData = location.state?.familia;
            const tipoPintura = location.state?.tipoPintura;
            
            if (!familiaData) {
                navigate("/familias");
                return;
            }
            
            setFamilia(familiaData);
            
            // Cargar imagen de familia
            const imgUrl = familiaService.getImagenUrl(familiaData.id);
            setImagenFamilia(imgUrl);
            
            // Cargar productos de esta familia
            const todosProductos = await productoService.listarTodos();
            const productosFiltradosFamilia = todosProductos.filter(p => p.familiaId === familiaData.id);
            setProductos(productosFiltradosFamilia);
            setProductosFiltrados(productosFiltradosFamilia);
            
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const cargarDetalleProducto = async (producto) => {
        setProductoSeleccionado(producto);
        setShowModal(true);
        
        try {
            // Cargar fórmulas del producto
            const formulas = await formulasService.listarPorProducto(producto.codigo);
            setFormulasProducto(formulas);
            
            // Cargar materias primas para enriquecer
            const materiasPrimas = await materiaPrimaService.listarTodas();
            const formulasEnriquecidas = formulas.map(formula => {
                const materia = materiasPrimas.find(mp => mp.id === formula.materiaPrimaId);
                return { ...formula, materiaPrima: materia };
            });
            
            // Datos simulados (después conectar con API real)
            const ventas = Math.floor(Math.random() * 20000) + 5000;
            setVentasMensuales(ventas);
            
            const stock = Math.floor(Math.random() * 30000) + 8000;
            setStockActual(stock);
            
            const programacionesSimuladas = [
                { id: 1, fecha: "2024-06-15", cantidad: 5000, estado: "Completada", lote: "LOT-001" },
                { id: 2, fecha: "2024-06-22", cantidad: 8000, estado: "En curso", lote: "LOT-002" },
                { id: 3, fecha: "2024-06-29", cantidad: 6000, estado: "Programada", lote: "LOT-003" }
            ];
            setProgramaciones(programacionesSimuladas);
            
            // Calcular consumo crítico
            const cargaEstandar = 800;
            const criticas = formulasEnriquecidas
                .filter(f => MATERIAS_IMPORTANTES.includes(f.materiaPrima?.codigo))
                .map(f => ({
                    nombre: f.materiaPrima?.nombre,
                    codigo: f.materiaPrima?.codigo,
                    consumo: ((f.cantidadPorLitro || 0) * cargaEstandar).toFixed(2)
                }));
            setConsumoCritico(criticas);
            
        } catch (error) {
            console.error("Error cargando detalle:", error);
        }
    };
    
    const handleVolver = () => {
        navigate("/familias");
    };
    
    const handleBusqueda = (e) => {
        const termino = e.target.value.toLowerCase();
        setBusqueda(termino);
        if (termino === "") {
            setProductosFiltrados(productos);
        } else {
            const filtrados = productos.filter(p => 
                p.descripcion?.toLowerCase().includes(termino) ||
                p.nombre?.toLowerCase().includes(termino) ||
                p.codigo?.toLowerCase().includes(termino)
            );
            setProductosFiltrados(filtrados);
        }
    };
    
    const calcularDiasStock = () => {
        if (ventasMensuales === 0) return 0;
        return Math.floor((stockActual / ventasMensuales) * 30);
    };
    
    if (loading) {
        return (
            <div className="familia-productos-container loading">
                <div className="spinner-glow"></div>
                <p>Cargando productos de la familia...</p>
            </div>
        );
    }
    
    return (
        <div className="familia-productos-container">
            <div className="orb-fp orb-fp-1"></div>
            <div className="orb-fp orb-fp-2"></div>
            
            {/* Header */}
            <header className="fp-header">
                <button className="btn-back-neon" onClick={handleVolver}>
                    <span className="arrow-icon">←</span> VOLVER A FAMILIAS
                </button>
                <div className="fp-header-info">
                    <div className="fp-header-imagen">
                        {imagenFamilia ? (
                            <img src={imagenFamilia} alt={familia?.nombre} className="fp-header-img" />
                        ) : (
                            <div className="fp-header-placeholder">📦</div>
                        )}
                    </div>
                    <div className="fp-header-text">
                        <h1 className="fp-title">{familia?.nombre}</h1>
                        <p className="fp-subtitle">{productos.length} productos en esta familia</p>
                    </div>
                </div>
            </header>
            
            {/* Buscador */}
            <div className="fp-search">
                <input 
                    type="text" 
                    placeholder="🔍 Buscar producto por nombre o código..." 
                    value={busqueda}
                    onChange={handleBusqueda}
                    className="fp-search-input"
                />
                {busqueda && (
                    <button className="fp-clear-search" onClick={() => {
                        setBusqueda("");
                        setProductosFiltrados(productos);
                    }}>✕</button>
                )}
            </div>
            
            {/* Grid de productos */}
            <div className="fp-grid">
                {productosFiltrados.length > 0 ? (
                    productosFiltrados.map((producto, index) => (
                        <div 
                            key={producto.id} 
                            className="fp-card"
                            onClick={() => cargarDetalleProducto(producto)}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="fp-card-icon">🎨</div>
                            <div className="fp-card-content">
                                <h3 className="fp-card-title">{producto.descripcion || producto.nombre}</h3>
                                <div className="fp-card-details">
                                    <span className="fp-card-code">Código: {producto.codigo}</span>
                                    <span className="fp-card-type">{producto.tipoPinturaId === 1 ? "Esmalte" : "Vinílica"}</span>
                                </div>
                                <div className="fp-card-footer">
                                    <span className="fp-card-ver">Ver detalles →</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="fp-no-results">
                        <span className="fp-no-icon">🔍</span>
                        <h3>No se encontraron productos</h3>
                        <p>No hay resultados para "{busqueda}"</p>
                    </div>
                )}
            </div>
            
            {/* Modal de detalle del producto */}
            {showModal && productoSeleccionado && (
                <div className="fp-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="fp-modal-header">
                            <h2>{productoSeleccionado.descripcion || productoSeleccionado.nombre}</h2>
                            <button className="fp-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        
                        <div className="fp-modal-body">
                            {/* Información básica */}
                            <div className="fp-modal-info">
                                <div className="fp-info-item">
                                    <span className="fp-info-label">Código:</span>
                                    <span className="fp-info-value">{productoSeleccionado.codigo}</span>
                                </div>
                                <div className="fp-info-item">
                                    <span className="fp-info-label">Tipo:</span>
                                    <span className="fp-info-value">{productoSeleccionado.tipoPinturaId === 1 ? "Esmalte" : "Vinílica"}</span>
                                </div>
                                <div className="fp-info-item">
                                    <span className="fp-info-label">Familia:</span>
                                    <span className="fp-info-value">{familia?.nombre}</span>
                                </div>
                                <div className="fp-info-item">
                                    <span className="fp-info-label">ID:</span>
                                    <span className="fp-info-value">{productoSeleccionado.id}</span>
                                </div>
                            </div>
                            
                            {/* Métricas */}
                            <div className="fp-modal-metrics">
                                <div className="fp-metric">
                                    <span className="fp-metric-icon">💰</span>
                                    <div>
                                        <span className="fp-metric-label">Ventas mensuales</span>
                                        <span className="fp-metric-value">{ventasMensuales.toLocaleString()} L</span>
                                    </div>
                                </div>
                                <div className="fp-metric">
                                    <span className="fp-metric-icon">📦</span>
                                    <div>
                                        <span className="fp-metric-label">Stock actual</span>
                                        <span className="fp-metric-value">{stockActual.toLocaleString()} L</span>
                                    </div>
                                </div>
                                <div className="fp-metric">
                                    <span className="fp-metric-icon">⏰</span>
                                    <div>
                                        <span className="fp-metric-label">Días de stock</span>
                                        <span className="fp-metric-value">{calcularDiasStock()} días</span>
                                    </div>
                                </div>
                                <div className="fp-metric">
                                    <span className="fp-metric-icon">🔬</span>
                                    <div>
                                        <span className="fp-metric-label">Materias primas</span>
                                        <span className="fp-metric-value">{formulasProducto.length}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Materias primas críticas */}
                            {consumoCritico.length > 0 && (
                                <div className="fp-modal-section">
                                    <h3>⚠️ Materias primas con mayor consumo</h3>
                                    <div className="fp-criticas">
                                        {consumoCritico.map((mp, idx) => (
                                            <div key={idx} className="fp-critica">
                                                <span className="fp-critica-nombre">{mp.nombre}</span>
                                                <span className="fp-critica-codigo">{mp.codigo}</span>
                                                <span className="fp-critica-consumo">{mp.consumo} L (800L)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Programaciones */}
                            <div className="fp-modal-section">
                                <h3>📅 Programaciones recientes</h3>
                                <div className="fp-programaciones">
                                    {programaciones.map(prog => (
                                        <div key={prog.id} className="fp-programacion">
                                            <span className="fp-prog-fecha">{prog.fecha}</span>
                                            <span className="fp-prog-lote">{prog.lote}</span>
                                            <span className="fp-prog-cantidad">{prog.cantidad.toLocaleString()} L</span>
                                            <span className={`fp-prog-estado ${prog.estado === "Completada" ? "completada" : prog.estado === "En curso" ? "en-curso" : "programada"}`}>
                                                {prog.estado}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Botón para ver fórmula completa */}
                            <div className="fp-modal-footer">
                                <button 
                                    className="fp-btn-formula"
                                    onClick={() => {
                                        setShowModal(false);
                                        navigate(`/mantenimiento/formulas?producto=${productoSeleccionado.codigo}`);
                                    }}
                                >
                                    Ver fórmula completa →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}