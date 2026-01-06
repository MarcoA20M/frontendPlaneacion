import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/familias-screen.css";

export function VistaFamiliasScreen({ familias, cargando, tipoPintura }) {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");

  // Filtrar familias en tiempo real
  const familiasFiltradas = familias.filter(f => 
    f.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) {
    return (
      <div className="familias-full-screen loading">
        <div className="spinner-glow"></div>
        <p>Sincronizando Catálogo...</p>
      </div>
    );
  }

  return (
    <div className="familias-full-screen">
      {/* Elementos decorativos de fondo */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <header className="familias-header">
        <div className="header-info">
          <button className="btn-back-neon" onClick={() => navigate("/")}>
            <span className="arrow-icon">←</span> TABLERO PRINCIPAL
          </button>
          <h1 className="glitch-text">Explorador de Familias</h1>
          <p className="subtitle">Gestión de inventario para {tipoPintura}</p>
        </div>
        
        <div className="header-controls">
          <div className="search-box-premium">
            <input 
              type="text" 
              placeholder="Buscar categoría..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="badge-tipo-neon">{tipoPintura}</div>
        </div>
      </header>

      <div className="familias-grid">
        {familiasFiltradas.length > 0 ? (
          familiasFiltradas.map((familia) => (
            <div 
              key={familia.id} 
              className="familia-card-glass"
              onClick={() => navigate(`/familia/${familia.id}`)}
            >
              <div className="card-shine"></div>
              <div className="card-icon-wrapper">
                <span className="icon-main">🎨</span>
              </div>
              <div className="card-body">
                <h3>{familia.nombre || "Sin Nombre"}</h3>
                <div className="stats">
                  <span className="count">{familia.totalProductos || 0}</span>
                  <span className="label">Productos</span>
                </div>
              </div>
              <div className="card-action">
                <span>VER</span>
                <div className="circle-arrow">→</div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-data-premium">
            <p>No se encontraron categorías que coincidan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
