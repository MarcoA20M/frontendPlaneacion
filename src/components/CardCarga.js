import React from 'react';
import '../styles/cardCarga.css'; 

const CardCarga = ({ carga }) => {
  if (!carga) return null;

  return (
    <div className="card-mini">
      <div className="badge-litros">
        {carga.litros.toFixed(1)} L
      </div>
      <div className="card-mini-body">
        <span className="mini-label">Código:</span>
        <span className="mini-codigo">{carga.codigoProducto}</span>
        
        <div className="mini-divider"></div>
        
        {/* 🟢 NUEVO: Lista de botes/envases */}
        <div className="mini-envasados">
          {carga.detallesEnvasado && carga.detallesEnvasado.map((item, idx) => (
            <div key={idx} className="envasado-linea">
              <strong>{item.formato}</strong> - {item.cantidad}
            </div>
          ))}
        </div>

        <div className="mini-divider"></div>
        <span className="mini-footer">{carga.nivelCubriente || 'N/A'}</span>
      </div>
    </div>
  );
};

export default CardCarga;