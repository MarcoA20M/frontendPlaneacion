import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { familiaService } from "../services/familiaService";
import "../styles/familias-screen.css";

export function VistaFamiliasScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // RECUPERAR DATOS: Priorizar location.state, luego sessionStorage
  const [familiasData, setFamiliasData] = useState([]);
  const [tipoPinturaData, setTipoPinturaData] = useState("Vinílica");
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [imagenesError, setImagenesError] = useState({});

  // Función para obtener la URL de la imagen desde el backend
  const obtenerImagenUrl = (familiaId) => {
    return familiaService.getImagenUrl(familiaId);
  };

  // Manejar error de carga de imagen
  const handleImagenError = (familiaId) => {
    setImagenesError(prev => ({ ...prev, [familiaId]: true }));
  };

  // Cargar datos al montar el componente o cuando cambie location.state
  useEffect(() => {
    const loadData = () => {
      let familias = location.state?.familias;
      let tipoPintura = location.state?.tipoPintura;
      
      if (!familias || familias.length === 0) {
        const storedData = sessionStorage.getItem('familiasData');
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            familias = parsed.familias || [];
            tipoPintura = parsed.tipoPintura || "Vinílica";
            console.log('✅ Datos recuperados de sessionStorage');
          } catch (error) {
            console.error('Error al parsear sessionStorage:', error);
          }
        }
      }
      
      if (familias && familias.length > 0) {
        setFamiliasData(familias);
        setTipoPinturaData(tipoPintura || "Vinílica");
        sessionStorage.setItem('familiasData', JSON.stringify({
          familias: familias,
          tipoPintura: tipoPintura || "Vinílica"
        }));
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [location.state]);

  // Generar colores basados en el ID (fallback si no hay imagen)
  const generarColor = (id) => {
    const colores = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7B731', '#5D9BEC', '#FF8C94',
      '#A8E6CF', '#FFD3B6', '#FF8B94', '#C7CEE6', '#B5EAD7',
      '#FFB7B2', '#C7F9CC', '#FFD166', '#06D6A0', '#118AB2'
    ];
    return colores[id % colores.length];
  };

  // Obtener iniciales
  const getIniciales = (nombre) => {
    if (!nombre) return "??";
    const palabras = nombre.split(' ');
    if (palabras.length === 1) {
      return palabras[0].substring(0, 2).toUpperCase();
    }
    return (palabras[0][0] + palabras[1][0]).toUpperCase();
  };

  // Filtrar familias
  const familiasFiltradas = useMemo(() => {
    if (!Array.isArray(familiasData)) return [];
    if (!busqueda) return familiasData;
    return familiasData.filter(f => 
      f?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [familiasData, busqueda]);

  // Función para regresar al tablero principal
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
        </div>
      </header>

      <div className="familias-grid">
        {familiasFiltradas.length > 0 ? (
          familiasFiltradas.map((familia, index) => {
            // OBTENER URL DE IMAGEN DESDE EL BACKEND
            const imagenUrl = obtenerImagenUrl(familia.id);
            const tieneError = imagenesError[familia.id];
            const colorFondo = generarColor(familia.id);
            
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
            <p>No hay resultados para "{busqueda}"</p>
            <button className="btn-clear-search" onClick={() => setBusqueda("")}>
              Limpiar búsqueda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}