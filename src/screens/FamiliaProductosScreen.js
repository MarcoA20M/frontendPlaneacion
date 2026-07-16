// src/screens/FamiliaProductosScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { familiaService } from "../services/familiaService";
import { productoService } from "../services/productoService";
import "../styles/familia-productos.css";

// ===== FUNCIÓN PARA NORMALIZAR CÓDIGO =====
const normalizarCodigo = (cod) => {
    if (!cod) return "";
    return String(cod).trim().toUpperCase().replace(/^0+/, '') || "0";
};

// ===== FUNCIÓN PARA EXTRAER LITROS DE UN ARTÍCULO =====
const extraerLitrosDeArticulo = (articuloCompleto) => {
    if (!articuloCompleto) return 0;
    const partes = String(articuloCompleto).split('-');
    const prefijoCapacidad = partes[0].replace(/^0+/, '');
    switch (prefijoCapacidad) {
        case "19": return 19;
        case "4": return 4;
        case "1": return 1;
        case "500": return 0.5;
        case "250": return 0.25;
        default:
            const num = parseFloat(prefijoCapacidad);
            return isNaN(num) ? 0 : num;
    }
};

// ===== FUNCIÓN PARA ENRIQUECER PRODUCTO CON PLANIFICADOR =====
const enriquecerConPlanificador = (producto) => {
    try {
        const planificadorRaw = localStorage.getItem("planificador_data");
        if (!planificadorRaw) return producto;
        
        const planificador = JSON.parse(planificadorRaw);
        const codNormalizado = normalizarCodigo(producto.codigo);
        
        const coincidencias = (planificador.data || []).filter(item => {
            const partes = String(item.articulo).split('-');
            const colorEnArticulo = partes.length > 1 ? normalizarCodigo(partes[1]) : "";
            return colorEnArticulo === codNormalizado || normalizarCodigo(item.color) === codNormalizado;
        });
        
        const totalSalidas = coincidencias.reduce((sum, item) => sum + (parseInt(item.salidas) || 0), 0);
        const totalExistencia = coincidencias.reduce((sum, item) => sum + (parseInt(item.existencia) || 0), 0);
        const totalAlcance = coincidencias.reduce((sum, item) => sum + (parseInt(item.alcance) || 0), 0);
        const promedioAlcance = coincidencias.length > 0 ? Math.round(totalAlcance / coincidencias.length) : 0;
        
        return {
            ...producto,
            datosPlanificador: coincidencias,
            salidas: totalSalidas,
            existencia: totalExistencia,
            alcance: promedioAlcance,
            cantidadFormatos: coincidencias.length
        };
    } catch (error) {
        console.warn("Error enriqueciendo con planificador:", error);
        return producto;
    }
};

export default function FamiliaProductosScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [familia, setFamilia] = useState(null);
    const [productos, setProductos] = useState([]);
    const [productosFiltrados, setProductosFiltrados] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [imagenFamilia, setImagenFamilia] = useState(null);
    
    // ===== ESTADO PARA FILTRO DE VENTAS =====
    const [filtroVentas, setFiltroVentas] = useState("ninguno"); // "ninguno", "mayor", "menor"
    
    // ===== NUEVO: ESTADO PARA FILTRO DE PROCESOS =====
    const [procesoSeleccionado, setProcesoSeleccionado] = useState("todos");
    const [procesosDisponibles, setProcesosDisponibles] = useState([]);

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const familiaData = location.state?.familia;
            
            if (!familiaData) {
                navigate("/familias");
                return;
            }
            
            setFamilia(familiaData);
            
            const imgUrl = familiaService.getImagenUrl(familiaData.id);
            setImagenFamilia(imgUrl);
            
            const todosProductos = await productoService.listarTodos();
            const productosFiltradosFamilia = todosProductos.filter(p => p.familiaId === familiaData.id);
            
            const productosEnriquecidos = productosFiltradosFamilia.map(p => enriquecerConPlanificador(p));
            
            setProductos(productosEnriquecidos);
            
            // ===== NUEVO: Extraer procesos únicos =====
            const procesosUnicos = new Set();
            productosEnriquecidos.forEach(producto => {
                if (producto.procesos && producto.procesos.length > 0) {
                    producto.procesos.forEach(proceso => {
                        if (proceso.descripcion) {
                            procesosUnicos.add(proceso.descripcion);
                        }
                    });
                }
            });
            setProcesosDisponibles(["todos", ...Array.from(procesosUnicos)]);
            
            const ordenados = ordenarPorVentas(productosEnriquecidos, filtroVentas);
            setProductosFiltrados(ordenados);
            
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
        }
    };

    // ===== FUNCIÓN PARA ORDENAR SOLO POR VENTAS =====
    const ordenarPorVentas = (lista, filtro) => {
        const copia = [...lista];
        
        if (filtro === "mayor") {
            return copia.sort((a, b) => (b.salidas || 0) - (a.salidas || 0));
        } else if (filtro === "menor") {
            return copia.sort((a, b) => (a.salidas || 0) - (b.salidas || 0));
        } else {
            return copia.sort((a, b) => (a.descripcion || a.nombre || "").localeCompare(b.descripcion || b.nombre || ""));
        }
    };

    // ===== NUEVO: Filtrar por búsqueda + proceso =====
    const aplicarFiltros = (lista, termino, proceso) => {
        let resultado = lista;
        
        // Filtro por búsqueda
        if (termino !== "") {
            resultado = resultado.filter(p => 
                p.descripcion?.toLowerCase().includes(termino) ||
                p.nombre?.toLowerCase().includes(termino) ||
                p.codigo?.toLowerCase().includes(termino)
            );
        }
        
        // Filtro por proceso
        if (proceso !== "todos") {
            resultado = resultado.filter(p => 
                p.procesos?.some(proc => proc.descripcion === proceso) || false
            );
        }
        
        return resultado;
    };

    const handleVolver = () => {
        navigate("/familias");
    };

    const handleBusqueda = (e) => {
        const termino = e.target.value.toLowerCase();
        setBusqueda(termino);
        
        const filtrados = aplicarFiltros(productos, termino, procesoSeleccionado);
        const ordenados = ordenarPorVentas(filtrados, filtroVentas);
        setProductosFiltrados(ordenados);
    };

    // ===== NUEVO: Cambiar filtro de proceso =====
    const handleFiltroProceso = (proceso) => {
        setProcesoSeleccionado(proceso);
        const filtrados = aplicarFiltros(productos, busqueda, proceso);
        const ordenados = ordenarPorVentas(filtrados, filtroVentas);
        setProductosFiltrados(ordenados);
    };

    const handleFiltroVentas = (tipo) => {
        setFiltroVentas(tipo);
        const filtrados = aplicarFiltros(productos, busqueda, procesoSeleccionado);
        const ordenados = ordenarPorVentas(filtrados, tipo);
        setProductosFiltrados(ordenados);
    };

    const handleVerProducto = (producto) => {
        navigate("/producto-detalle", { 
            state: { 
                producto: producto,
                familia: familia,
                imagenFamilia: imagenFamilia
            } 
        });
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

            {/* Buscador + Filtros */}
           {/* Buscador + Filtros - DISEÑO MEJORADO */}
<div className="fp-search-wrapper">
    <div className="fp-search-filters-row">
        {/* Buscador a la izquierda */}
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
                    const filtrados = aplicarFiltros(productos, "", procesoSeleccionado);
                    const ordenados = ordenarPorVentas(filtrados, filtroVentas);
                    setProductosFiltrados(ordenados);
                }}>✕</button>
            )}
        </div>

        {/* Filtro de Procesos a la derecha */}
        {procesosDisponibles.length > 1 && (
            <div className="fp-filtro-procesos">
                <span className="fp-filtro-label">🔹 Proceso:</span>
                {procesosDisponibles.map((proceso) => (
                    <button
                        key={proceso}
                        className={`fp-filtro-btn ${procesoSeleccionado === proceso ? "active" : ""}`}
                        onClick={() => handleFiltroProceso(proceso)}
                    >
                        {proceso === "todos" ? "📦 Todos" : proceso}
                    </button>
                ))}
            </div>
        )}
    </div>

    {/* Filtro de Ventas (abajo) */}
    <div className="fp-filtro-ventas">
        <span className="fp-filtro-label">📊 Ventas:</span>
        <button 
            className={`fp-filtro-btn ${filtroVentas === "ninguno" ? "active" : ""}`}
            onClick={() => handleFiltroVentas("ninguno")}
        >
            📝 Nombre
        </button>
        <button 
            className={`fp-filtro-btn ${filtroVentas === "mayor" ? "active" : ""}`}
            onClick={() => handleFiltroVentas("mayor")}
        >
            ⬇ Mayor a menor
        </button>
        <button 
            className={`fp-filtro-btn ${filtroVentas === "menor" ? "active" : ""}`}
            onClick={() => handleFiltroVentas("menor")}
        >
            ⬆ Menor a mayor
        </button>
    </div>
</div>

{/* Grid de productos */}
<div className="fp-grid">
    {productosFiltrados.length > 0 ? (
        productosFiltrados.map((producto, index) => (
            <div 
                key={producto.id} 
                className="fp-card"
                onClick={() => handleVerProducto(producto)}
                style={{ animationDelay: `${index * 0.05}s` }}
            >
                {/* === ICONO CON IMAGEN DE LA FAMILIA === */}
                <div className="fp-card-icon">
                    {imagenFamilia ? (
                        <img 
                            src={imagenFamilia} 
                            alt={familia?.nombre} 
                            className="fp-card-img" 
                        />
                    ) : (
                        <span className="fp-card-emoji">🎨</span>
                    )}
                </div>
                
                <div className="fp-card-content">
                    <h3 className="fp-card-title">{producto.descripcion || producto.nombre}</h3>
                    <div className="fp-card-details">
                        <span className="fp-card-code">Código: {producto.codigo}</span>
                        <span className="fp-card-type">
                            {producto.tipoPinturaId === 1 ? "Esmalte" : "Vinílica"}
                        </span>
                    </div>
                    
                    {/* Mostrar procesos del producto */}
                    {producto.procesos && producto.procesos.length > 0 && (
                        <div className="fp-card-procesos">
                            {producto.procesos.map((proc, idx) => (
                                <span key={idx} className="fp-proceso-badge">
                                    {proc.descripcion}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    <div className="fp-card-metrics">
                        <span className="fp-metric" title="Ventas mensuales">
                            📊 {producto.salidas || 0}
                        </span>
                        <span className="fp-metric" title="Stock actual">
                            📦 {producto.existencia || 0}
                        </span>
                        <span className="fp-metric" title="Días de alcance">
                            📈 {producto.alcance || 0}d
                        </span>
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
            <p>
                {procesoSeleccionado !== "todos"
                    ? `No hay productos con el proceso "${procesoSeleccionado}"`
                    : `No hay resultados para "${busqueda}"`}
            </p>
        </div>
    )}
</div>
        </div>
    );
}