import React from 'react';
import '../styles/esmaltes.css';

// Cambiamos 'rondas' por 'cargas' y le damos un valor por defecto [] para evitar errores
const TableroEsmaltes = ({ cargas = [], setCargaSeleccionada, setMostrarDetalle }) => {
  
  // Función para limpiar "Estado: ", "Proceso: ", etc.
  const limpiarTexto = (texto) => {
    if (!texto) return "N/A";
    return texto.includes(':') ? texto.split(':')[1].trim().toUpperCase() : texto.toUpperCase();
  };

  return (
    <div className="esmaltes-full-view">
      <div className="esmaltes-header-neon">
        <div className="title-group">
          <h2>TABLERO DE ESMALTES</h2>
          <p className="mini-label">Cargas de alta viscosidad en proceso</p>
        </div>
      </div>

      <div className="grid-esmaltes-neon">
        {cargas.length > 0 ? (
          cargas.map((carga) => (
            <div 
              key={carga.idTemp} 
              className="card-esmalte-neon"
              onClick={() => {
                setCargaSeleccionada(carga);
                setMostrarDetalle(true);
              }}
            >
              {/* LOTE MOVIDO AL LADO DEL CÍRCULO (ARRIBA DERECHA) */}
              <div style={{ position: 'absolute', top: '10px', right: '60px', textAlign: 'right' }}>
                <span className="mini-label">Lote</span>
                <span className="val-neon" style={{ display: 'block', fontSize: '0.9rem' }}>{carga.folio}</span>
              </div>

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
                  <div className="stat-box" style={{ width: '100%' }}>
                    <span className="mini-label">Procesos</span>
                    {/* PROCESOS CORRIDOS (ROW) */}
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
                            {/* Separador entre procesos excepto el último */}
                            {idx < carga.procesos.length - 1 && (
                              <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 5px' }}></span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="val-neon">N/A</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mini-footer">
                {carga.operario || 'Área Esmaltes'}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-neon">
            <div className="scanner-line"></div>
            <p>SISTEMA LISTO - ESPERANDO CARGAS DE ESMALTE</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableroEsmaltes;