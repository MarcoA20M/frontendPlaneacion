// components/CardEsmalte.jsx
import React from 'react';
import '../styles/esmaltes.css';

const CardEsmalte = ({ carga, onClick }) => {
  const limpiarTexto = (texto) => {
    if (!texto) return "N/A";
    return texto.includes(':') ? texto.split(':')[1].trim() : texto.trim();
  };

  // 🔴 FUNCIÓN PARA RENDERIZAR ENVASADOS COMO LISTA
  const renderizarEnvasados = (detalles) => {
    if (!detalles || detalles.length === 0) {
      return <span className="val-neon" style={{ fontSize: '10px' }}>N/A</span>;
    }
    
    return detalles.map((d, index) => {
      const formato = d.formato || d.Formato || '';
      const cantidad = d.cantidad || d.Cantidad || '';
      let texto = '';
      if (formato && cantidad) {
        texto = `${formato} - ${cantidad}`;
      } else if (formato) {
        texto = formato;
      } else if (cantidad) {
        texto = cantidad;
      } else {
        texto = '?';
      }
      
      return (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span className="val-neon" style={{ fontSize: '10px' }}>
            • {texto}
          </span>
        </div>
      );
    });
  };

  return (
    <div 
      className="card-esmalte-neon"
      onClick={onClick}
    >
      <div style={{ position: 'absolute', top: '10px', right: '60px', textAlign: 'right' }}>
        <span className="mini-label">Lote</span>
        <span className="val-neon" style={{ display: 'block', fontSize: '0.9rem' }}>
          {carga.folio || carga.lote || 'S/F'}
        </span>
      </div>

      <div className="badge-litros">
        <span className="badge-val">{carga.litros?.toFixed(0) || '0'}</span>
        <span className="badge-unit">LTS</span>
      </div>

      <div className="card-mini-body">
        <h3 className="mini-codigo2">{carga.codigoProducto || carga.codigo || 'S/C'}</h3>
        <p className="descripcion-text">{carga.descripcion || carga.nombre || 'Sin descripción'}</p>
        
        <div className="mini-divider"></div>
        
        <div className="info-grid-interna">
          {/* 🔴 ENVASADOS - LISTA VERTICAL */}
          <div className="stat-box" style={{ width: '100%' }}>
            <span className="mini-label">Envasados</span>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2px', 
              marginTop: '4px',
              paddingLeft: '4px'
            }}>
              {renderizarEnvasados(carga.detallesEnvasado)}
            </div>
          </div>
          
          {/* 🔴 PROCESOS */}
          <div className="stat-box" style={{ width: '100%', marginTop: '6px' }}>
            <span className="mini-label">Procesos</span>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: '8px', 
              marginTop: '5px' 
            }}>
              {carga.procesos && carga.procesos.length > 0 ? (
                carga.procesos.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="val-neon" style={{ fontSize: '9.5px' }}>
                      {p.paso}. {limpiarTexto(p.descripcion)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="val-neon">N/A</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mini-footer" style={{ textTransform: 'none' }}>
        {carga.operario || 'Área Esmaltes'}
      </div>
    </div>
  );
};

export default CardEsmalte;