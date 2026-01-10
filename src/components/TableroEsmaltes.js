import React from 'react';
import '../styles/esmaltes.css';

const TableroEsmaltes = ({ cargas = [], setCargaSeleccionada, setMostrarDetalle, filtroOperario, modoEsmalte }) => {
  
  const limpiarTexto = (texto) => {
    if (!texto) return "N/A";
    return texto.includes(':') ? texto.split(':')[1].trim() : texto.trim();
  };

  // FILTRADO COMBINADO: Nombre + Modo (Directo/Molienda)
  const cargasFiltradas = cargas.filter(c => {
    const nombreCarga = c.operario || 'Área Esmaltes';
    
    // Filtro 1: Por nombre individual
    const pasaNombre = filtroOperario ? nombreCarga.includes(filtroOperario) : true;
    
    // Filtro 2: Por modo (Molienda tiene '/', Directo no)
    let pasaModo = true;
    if (modoEsmalte === 'DIRECTO') {
      pasaModo = !nombreCarga.includes('/');
    } else if (modoEsmalte === 'MOLIENDA') {
      pasaModo = nombreCarga.includes('/');
    }

    return pasaNombre && pasaModo;
  });

  return (
    <div className="esmaltes-full-view">
      <div className="grid-esmaltes-neon">
        {cargasFiltradas.length > 0 ? (
          cargasFiltradas.map((carga) => (
            <div 
              key={carga.idTemp} 
              className="card-esmalte-neon"
              onClick={() => {
                setCargaSeleccionada(carga);
                setMostrarDetalle(true);
              }}
            >
              {/* DISEÑO ORIGINAL RESTAURADO */}
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
                <h3 className="mini-codigo2">{carga.codigoProducto}</h3>
                <p className="descripcion-text">{carga.descripcion}</p>
                
                <div className="mini-divider"></div>
                
                <div className="info-grid-interna">
                  <div className="stat-box" style={{ width: '100%' }}>
                    <span className="mini-label">Procesos</span>
                    <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
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
          ))
        ) : (
          <div className="empty-state-neon">
            <p>{filtroOperario || modoEsmalte ? 'SIN COINCIDENCIAS' : 'SISTEMA LISTO'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableroEsmaltes;