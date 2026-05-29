import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { productoService } from "../services/productoService";

export const VistaFamilias = ({ cargandoFamilias, familias }) => {
  const navigate = useNavigate();

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

  if (cargandoFamilias) {
    return (
      <div className="familias-glass-panel">
        <div className="loading-container-premium">
          <div className="spinner-glow"></div>
          <p>Cargando líneas de producción...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="familias-glass-panel">
      <div className="scanner-line"></div>
      <div className="panel-header-premium">
        <div className="header-top">
          <button className="btn-back-premium" onClick={() => navigate("/")}>
            <span className="arrow-icon">←</span> VOLVER
          </button>
          <div>
            <h2 className="panel-title-glow">Líneas de Producción</h2>
            <p className="panel-subtitle">{familias?.length || 0} familias disponibles</p>
          </div>
        </div>
      </div>
      
      <div className="familias-grid-cuadros">
        {familias?.map((f, index) => (
          <div 
            key={f.id} 
            className="familia-cuadro-premium"
            onClick={() => navigate(`/familia/${f.id}`, {
              state: {
                familia: f,
                familias: familias
              }
            })}
            style={{ 
              animationDelay: `${index * 0.03}s`,
              '--card-color': generarColor(f.id)
            }}
          >
            <div className="cuadro-shine"></div>
            <div className="cuadro-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${generarColor(f.id)}60, transparent)` }}></div>
            
            <div className="cuadro-visual">
              <div 
                className="cuadro-circle"
                style={{ background: `linear-gradient(135deg, ${generarColor(f.id)}, ${generarColor(f.id)}dd)` }}
              >
                <span className="cuadro-iniciales">{getIniciales(f.nombre)}</span>
              </div>
            </div>
            
            <div className="cuadro-contenido">
              <h3 className="cuadro-nombre" title={f.nombre}>
                {f.nombre}
              </h3>
              <div className="cuadro-footer">
                <span className="cuadro-badge">{f.totalCargas || 0} cargas</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VistaProductosFamilia = ({ setCodigo, consultar, familias, tipoPintura }) => {
  const { idFamilia } = useParams();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();

  // Obtener la familia actual
  const familiaActual = familias?.find(f => f.id === parseInt(idFamilia));

  useEffect(() => {
    setLoading(true);
    productoService.getProductosPorFamilia(idFamilia).then(data => {
      setProductos(data);
      setLoading(false);
    });
  }, [idFamilia]);

  const seleccionar = (producto) => {
    if (setCodigo) setCodigo(producto.id);
    navigate("/");
    setTimeout(() => {
      if (consultar) consultar();
    }, 150);
  };

  const productosFiltrados = productos.filter(p => 
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.id?.toString().toLowerCase().includes(busqueda.toLowerCase())
  );

  const generarColorProducto = (id) => {
    const colores = ['#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colores[id % colores.length];
  };

  if (loading) {
    return (
      <div className="familias-glass-panel">
        <div className="loading-container-premium">
          <div className="spinner-glow"></div>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="familias-glass-panel productos-panel">
      <div className="scanner-line"></div>
      
      <div className="panel-header-premium">
        <div className="header-top">
          
          
          {familiaActual && (
            <div className="familia-info-badge">
              <span className="familia-badge-name">{familiaActual.nombre}</span>
              <span className="familia-badge-id">ID: {familiaActual.id}</span>
            </div>
          )}
          
          <div className="search-container-premium">
            <div className="search-box-premium">
              <input 
                type="text" 
                placeholder="🔍 Buscar por código o descripción..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                autoComplete="off"
              />
              {busqueda && (
                <button className="clear-search-premium" onClick={() => setBusqueda("")}>
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="productos-grid-cuadros">
        {productosFiltrados.length > 0 ? (
          productosFiltrados.map((p, index) => (
            <div 
              key={p.id} 
              className="producto-cuadro-premium"
              onClick={() => seleccionar(p)}
              style={{ 
                animationDelay: `${index * 0.02}s`,
                '--producto-color': generarColorProducto(p.id)
              }}
            >
              <div className="cuadro-shine"></div>
              <div className="producto-cuadro-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${generarColorProducto(p.id)}60, transparent)` }}></div>
              
              <div className="producto-cuadro-visual">
                <div className="producto-cuadro-icono">
                  <span className="producto-id">{p.id}</span>
                </div>
              </div>
              
              <div className="producto-cuadro-contenido">
                <p className="producto-descripcion-corta" title={p.descripcion}>
                  {p.descripcion?.length > 35 ? p.descripcion.substring(0, 32) + '...' : p.descripcion}
                </p>
                
                <div className="producto-propiedades">
                  {p.poderCubriente && (
                    <div className="producto-propiedad">
                      <span className="propiedad-etiqueta">PC:</span>
                      <span className="propiedad-valor">{p.poderCubriente}</span>
                    </div>
                  )}
                  {p.codigo && (
                    <div className="producto-propiedad">
                      <span className="propiedad-etiqueta">Cód:</span>
                      <span className="propiedad-valor">{p.codigo}</span>
                    </div>
                  )}
                </div>
                
                {/* Mostrar el código de pintura si existe */}
                {p.codigoPintura && (
                  <div className="producto-codigo-pintura">
                    <span className="codigo-label">🎨 Pintura:</span>
                    <span className="codigo-value">{p.codigoPintura}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="no-data-premium">
            <div className="no-data-animation">🔍</div>
            <h3>No se encontraron productos</h3>
            <p>No hay resultados para "{busqueda}"</p>
            {busqueda && (
              <button className="btn-clear-search-premium" onClick={() => setBusqueda("")}>
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};