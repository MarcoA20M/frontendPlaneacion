// src/screens/FamiliaProductosScreen.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { familiaService } from "../services/familiaService";
import { productoService } from "../services/productoService";
import "../styles/familia-productos.css";

// ===== FUNCIÓN PARA NORMALIZAR CÓDIGO (copiada de useProduccion) =====
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
        
        // Buscar coincidencias en el planificador
        const coincidencias = (planificador.data || []).filter(item => {
            const partes = String(item.articulo).split('-');
            const colorEnArticulo = partes.length > 1 ? normalizarCodigo(partes[1]) : "";
            return colorEnArticulo === codNormalizado || normalizarCodigo(item.color) === codNormalizado;
        });
        
        return {
            ...producto,
            datosPlanificador: coincidencias,
            salidas: coincidencias[0]?.salidas || 0,
            existencia: coincidencias[0]?.existencia || 0,
            alcance: coincidencias[0]?.alcance || 0
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
            
            // Cargar imagen de familia
            const imgUrl = familiaService.getImagenUrl(familiaData.id);
            setImagenFamilia(imgUrl);
            
            // Cargar productos de esta familia
            const todosProductos = await productoService.listarTodos();
            const productosFiltradosFamilia = todosProductos.filter(p => p.familiaId === familiaData.id);
            
            // 🔴 ENRIQUECER CADA PRODUCTO CON EL PLANIFICADOR
            const productosEnriquecidos = productosFiltradosFamilia.map(p => enriquecerConPlanificador(p));
            
            setProductos(productosEnriquecidos);
            setProductosFiltrados(productosEnriquecidos);
            
        } catch (error) {
            console.error("Error cargando datos:", error);
        } finally {
            setLoading(false);
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

    const handleVerProducto = (producto) => {
        // 🔴 EL PRODUCTO YA VIENE ENRIQUECIDO CON EL PLANIFICADOR
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
                            onClick={() => handleVerProducto(producto)}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="fp-card-icon">🎨</div>
                            <div className="fp-card-content">
                                <h3 className="fp-card-title">{producto.descripcion || producto.nombre}</h3>
                                <div className="fp-card-details">
                                    <span className="fp-card-code">Código: {producto.codigo}</span>
                                    <span className="fp-card-type">
                                        {producto.tipoPinturaId === 1 ? "Esmalte" : "Vinílica"}
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
                        <p>No hay resultados para "{busqueda}"</p>
                    </div>
                )}
            </div>
        </div>
    );
}