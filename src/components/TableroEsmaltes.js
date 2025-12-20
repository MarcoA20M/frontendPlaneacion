import React from 'react';
import '../styles/esmaltes.css';

const TableroEsmaltes = ({ rondas, setCargaSeleccionada, setMostrarDetalle }) => {
  // FILTRO: Solo cargas que tengan tipo "Esmalte"
  const cargasEsmaltes = rondas.flat().filter(carga => 
    carga !== null && carga.tipo === "Esmalte"
  );

  return (
    <div className="esmaltes-full-view">
      <div className="esmaltes-header-neon">
        <div className="title-group">
          <h2>TABLERO DE ESMALTES</h2>
          <p className="mini-label">Cargas de alta viscosidad en proceso</p>
        </div>
      </div>

      <div className="grid-esmaltes-neon">
        {cargasEsmaltes.map((carga, index) => (
          <div 
            key={`${carga.folio}-${index}`} 
            className="card-esmalte-neon"
            onClick={() => {
              setCargaSeleccionada(carga);
              setMostrarDetalle(true);
            }}
          >
            <div className="badge-litros">
              <span className="badge-val">{carga.litros?.toFixed(0)}</span>
              <span className="badge-unit">LTS</span>
            </div>

            <div className="card-mini-body">
              <span className="mini-label">ESMALTE ACTIVO</span>
              <h3 className="mini-codigo">{carga.codigoProducto}</h3>
              <p className="descripcion-text">{carga.descripcion}</p>
              
              <div className="mini-divider"></div>
              
              <div className="info-grid-interna">
                <div className="stat-box">
                  <span className="mini-label">Cubriente</span>
                  <span className="val-neon">{carga.nivelCubriente || 'N/A'}</span>
                </div>
                <div className="stat-box">
                  <span className="mini-label">Lote</span>
                  <span className="val-neon">#{carga.folio}</span>
                </div>
              </div>
            </div>

            <div className="mini-footer">
              Operario: {carga.operario || 'Sin asignar'}
            </div>
          </div>
        ))}

        {cargasEsmaltes.length === 0 && (
          <div className="empty-state-neon">
            <p>NO HAY CARGAS DE ESMALTE EN PROCESO</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableroEsmaltes;