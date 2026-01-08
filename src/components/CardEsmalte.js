import React from 'react';

const CardEsmalte = ({ carga }) => {
  // Función para asignar color según descripción
  const getStyleClass = (desc) => {
    const d = desc.toLowerCase();
    if (d.includes('brillante')) return 'borde-brillante';
    if (d.includes('mate') || d.includes('satin')) return 'borde-mate';
    if (d.includes('anti') || d.includes('primario')) return 'borde-anticorrosivo';
    return '';
  };

  return (
    <div className={`card-esmalte-v3 ${getStyleClass(carga.descripcion)}`}>
      <div className="esmalte-header">
        <span className="esmalte-badge-code">{carga.codigoProducto}</span>
        <span className="esmalte-lote-text">LOTE: {carga.folio}</span>
      </div>
      
      <div className="esmalte-body">
        <div className="esmalte-nombre">{carga.descripcion}</div>
      </div>

      <div className="esmalte-footer">
        <div className="esmalte-stat">
          <span>📦</span> {carga.litros.toFixed(1)} L
        </div>
        <div className="esmalte-stat" style={{color: '#2980b9'}}>
        </div>
      </div>
    </div>
  );
};

export default CardEsmalte;