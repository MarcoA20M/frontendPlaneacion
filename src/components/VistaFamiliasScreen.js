// src/screens/VistaFamiliasScreen.js
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { familiaService } from "../services/familiaService";
import { productoService } from "../services/productoService";
import "../styles/familias-screen.css";

export function VistaFamiliasScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [familiasData, setFamiliasData] = useState([]);
  const [tipoPinturaData, setTipoPinturaData] = useState("Vinílica");
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [imagenesError, setImagenesError] = useState({});
  const [filtroVentas, setFiltroVentas] = useState("ninguno");
  
  // ===== NUEVO: Filtro de tipo de pintura =====
  const [filtroTipoPintura, setFiltroTipoPintura] = useState("todos"); // "todos", "vinilica", "esmalte"
  
  const [ventasPorFamilia, setVentasPorFamilia] = useState({});

  const obtenerImagenUrl = (familiaId) => {
    return familiaService.getImagenUrl(familiaId);
  };

  const handleImagenError = (familiaId) => {
    setImagenesError(prev => ({ ...prev, [familiaId]: true }));
  };

  // ===== FUNCIÓN PARA OBTENER VENTAS DE UNA FAMILIA =====
  const obtenerVentasDeFamilia = async (familiaId, productos) => {
    try {
      const productosFamilia = productos.filter(p => p.familiaId === familiaId);
      
      if (productosFamilia.length === 0) return 0;
      
      const planificadorRaw = localStorage.getItem("planificador_data");
      if (!planificadorRaw) return 0;
      
      const planificador = JSON.parse(planificadorRaw);
      let ventasTotal = 0;
      
      productosFamilia.forEach(producto => {
        const codNormalizado = String(producto.codigo).trim().toUpperCase().replace(/^0+/, '') || "0";
        
        const coincidencias = (planificador.data || []).filter(item => {
          const partes = String(item.articulo).split('-');
          const colorEnArticulo = partes.length > 1 ? String(partes[1]).trim().toUpperCase().replace(/^0+/, '') || "0" : "";
          return colorEnArticulo === codNormalizado || 
                 String(item.color).trim().toUpperCase().replace(/^0+/, '') || "0" === codNormalizado;
        });
        
        coincidencias.forEach(item => {
          ventasTotal += parseInt(item.salidas) || 0;
        });
      });
      
      return ventasTotal;
    } catch (error) {
      console.warn("Error obteniendo ventas de familia:", error);
      return 0;
    }
  };

  // ===== CARGAR TODOS LOS DATOS =====
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let familias = location.state?.familias;
        let tipoPintura = location.state?.tipoPintura;
        
        if (!familias || familias.length === 0) {
          const storedData = sessionStorage.getItem('familiasData');
          if (storedData) {
            try {
              const parsed = JSON.parse(storedData);
              familias = parsed.familias || [];
              tipoPintura = parsed.tipoPintura || "Vinílica";
            } catch (error) {
              console.error('Error al parsear sessionStorage:', error);
            }
          }
        }
        
        if (familias && familias.length > 0) {
          setFamiliasData(familias);
          setTipoPinturaData(tipoPintura || "Vinílica");
          
          try {
            const todosProductos = await productoService.listarTodos();
            
            const ventasMap = {};
            for (const familia of familias) {
              const ventas = await obtenerVentasDeFamilia(familia.id, todosProductos);
              ventasMap[familia.id] = ventas;
            }
            setVentasPorFamilia(ventasMap);
            
          } catch (error) {
            console.warn("Error cargando productos:", error);
          }
          
          sessionStorage.setItem('familiasData', JSON.stringify({
            familias: familias,
            tipoPintura: tipoPintura || "Vinílica"
          }));
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [location.state]);

  const generarColor = (id) => {
    const colores = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7B731', '#5D9BEC', '#FF8C94',
      '#A8E6CF', '#FFD3B6', '#FF8B94', '#C7CEE6', '#B5EAD7',
      '#FFB7B2', '#C7F9CC', '#FFD166', '#06D6A0', '#118AB2'
    ];
    return colores[id % colores.length];
  };

  const getIniciales = (nombre) => {
    if (!nombre) return "??";
    const palabras = nombre.split(' ');
    if (palabras.length === 1) {
      return palabras[0].substring(0, 2).toUpperCase();
    }
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  };

  // ===== FILTRAR Y ORDENAR FAMILIAS =====
  const familiasFiltradas = useMemo(() => {
    if (!Array.isArray(familiasData)) return [];
    
    let filtradas = familiasData;
    
    // Filtro por búsqueda
    if (busqueda) {
      filtradas = filtradas.filter(f => 
        f?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    
    // ===== NUEVO: Filtro por tipo de pintura (usando el campo 'tipo' de la familia) =====
    if (filtroTipoPintura !== "todos") {
      filtradas = filtradas.filter(f => {
        const tipoFamilia = f?.tipo?.toLowerCase() || "";
        if (filtroTipoPintura === "vinilica") {
          return tipoFamilia === "vinilica";
        } else if (filtroTipoPintura === "esmalte") {
          return tipoFamilia === "esmalte";
        }
        return true;
      });
    }
    
    // Aplicar ordenamiento por ventas
    if (filtroVentas !== "ninguno") {
      return [...filtradas].sort((a, b) => {
        const ventasA = ventasPorFamilia[a.id] || 0;
        const ventasB = ventasPorFamilia[b.id] || 0;
        
        if (filtroVentas === "mayor") {
          return ventasB - ventasA;
        } else {
          return ventasA - ventasB;
        }
      });
    }
    
    return [...filtradas].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [familiasData, busqueda, filtroVentas, ventasPorFamilia, filtroTipoPintura]);

  const handleGoBack = () => {
    if (familiasData && familiasData.length > 0) {
      sessionStorage.setItem('lastFamiliasData', JSON.stringify({
        familias: familiasData,
        tipoPintura: tipoPinturaData
      }));
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="familias-full-screen loading">
        <div className="spinner-glow"></div>
        <p>Cargando familias...</p>
      </div>
    );
  }

  if (!familiasData || familiasData.length === 0) {
    return (
      <div className="familias-full-screen loading">
        <div className="spinner-glow"></div>
        <p>No hay familias disponibles</p>
        <button className="btn-back-neon" onClick={handleGoBack} style={{ marginTop: '20px' }}>
          ← Volver al tablero
        </button>
      </div>
    );
  }

  return (
    <div className="familias-full-screen">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <header className="familias-header">
        <div className="header-info">
          <button className="btn-back-neon" onClick={handleGoBack}>
            <span className="arrow-icon">←</span> VOLVER AL TABLERO
          </button>
          <div className="title-section">
            <h1 className="glitch-text">Familias de Productos</h1>
            <p className="subtitle">{familiasFiltradas.length} familias disponibles</p>
          </div>
        </div>
        
        <div className="search-container">
          <div className="search-box-premium">
            <input 
              type="text" 
              placeholder="🔍 Buscar familia por nombre..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoComplete="off"
            />
            {busqueda && (
              <button className="clear-search" onClick={() => setBusqueda("")}>
                ✕
              </button>
            )}
          </div>
          
          {/* ===== NUEVO: Filtro de Tipo de Pintura ===== */}
          <div className="filtro-tipo-pintura">
            <span className="filtro-label">🎨 Tipo:</span>
            <button 
              className={`filtro-btn ${filtroTipoPintura === "todos" ? "active" : ""}`}
              onClick={() => setFiltroTipoPintura("todos")}
            >
              📋 Todos
            </button>
            <button 
              className={`filtro-btn ${filtroTipoPintura === "vinilica" ? "active" : ""}`}
              onClick={() => setFiltroTipoPintura("vinilica")}
            >
              🎨 Vinílica
            </button>
            <button 
              className={`filtro-btn ${filtroTipoPintura === "esmalte" ? "active" : ""}`}
              onClick={() => setFiltroTipoPintura("esmalte")}
            >
              ✨ Esmalte
            </button>
          </div>
          
          {/* Filtro de Ventas */}
          <div className="filtro-ventas-familias">
            <span className="filtro-label">📊 Ventas:</span>
            <button 
              className={`filtro-btn ${filtroVentas === "ninguno" ? "active" : ""}`}
              onClick={() => setFiltroVentas("ninguno")}
            >
              📝 Nombre
            </button>
            <button 
              className={`filtro-btn ${filtroVentas === "mayor" ? "active" : ""}`}
              onClick={() => setFiltroVentas("mayor")}
            >
              ⬇ Mayor a menor
            </button>
            <button 
              className={`filtro-btn ${filtroVentas === "menor" ? "active" : ""}`}
              onClick={() => setFiltroVentas("menor")}
            >
              ⬆ Menor a mayor
            </button>
          </div>
        </div>
      </header>

      <div className="familias-grid">
        {familiasFiltradas.length > 0 ? (
          familiasFiltradas.map((familia, index) => {
            const imagenUrl = obtenerImagenUrl(familia.id);
            const tieneError = imagenesError[familia.id];
            const colorFondo = generarColor(familia.id);
            const ventasFamilia = ventasPorFamilia[familia.id] || 0;
            
            // Obtener el tipo de pintura de la familia
            const tipoFamilia = familia.tipo || "desconocido";
            const tipoIcono = tipoFamilia === "esmalte" ? "✨" : "🎨";
            const tipoNombre = tipoFamilia === "esmalte" ? "Esmalte" : "Vinílica";
            
            return (
              <div 
                key={familia.id} 
                className="familia-card-square"
                onClick={() => {
                  sessionStorage.setItem('familiasData', JSON.stringify({
                    familias: familiasData,
                    tipoPintura: tipoPinturaData
                  }));
                  
                  navigate(`/familia/${familia.id}`, { 
                    state: { 
                      familia: familia,
                      tipoPintura: tipoPinturaData,
                      familias: familiasData,
                      returnTo: '/familias'
                    } 
                  });
                }}
                style={{ 
                  animationDelay: `${index * 0.03}s`,
                  '--card-color': colorFondo
                }}
              >
                <div className="card-shine"></div>
                <div className="card-visual">
                  {!tieneError ? (
                    <div className="card-image-container">
                      <img 
                        src={imagenUrl} 
                        alt={familia.nombre}
                        className="card-imagen"
                        onError={() => handleImagenError(familia.id)}
                      />
                      <div className="card-image-overlay"></div>
                    </div>
                  ) : (
                    <div 
                      className="card-circle"
                      style={{ background: `linear-gradient(135deg, ${colorFondo}, ${colorFondo}dd)` }}
                    >
                      <span className="card-iniciales">{getIniciales(familia.nombre)}</span>
                    </div>
                  )}
                </div>
                <div className="card-content">
                  <h3 className="familia-nombre" title={familia.nombre}>
                    {familia.nombre}
                  </h3>
                  
                  {/* Mostrar el tipo de pintura en la tarjeta */}
                  <div className="familia-tipo">
                    <span className="tipo-icono">{tipoIcono}</span>
                    <span className="tipo-nombre">{tipoNombre}</span>
                  </div>
                  
                  <div className="familia-ventas">
                    <span className="ventas-icon">📊</span>
                    <span className="ventas-cantidad">{ventasFamilia.toLocaleString()}</span>
                    <span className="ventas-label">ventas</span>
                  </div>
                  
                  <div className="card-footer">
                    <span className="familia-id">ID: {familia.id}</span>
                    <span className="ver-mas">Ver productos</span>
                  </div>
                </div>
                <div className="card-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${colorFondo}40, transparent)` }}></div>
              </div>
            );
          })
        ) : (
          <div className="no-data-premium">
            <div className="no-data-animation">🔍</div>
            <h3>No se encontraron familias</h3>
            <p>No hay resultados para la búsqueda o filtro seleccionado</p>
            <button className="btn-clear-search" onClick={() => {
              setBusqueda("");
              setFiltroTipoPintura("todos");
              setFiltroVentas("ninguno");
            }}>
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
}