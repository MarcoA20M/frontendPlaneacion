// components/TableroEsmaltes.jsx
import React from 'react';
import CardEsmalte from './CardEsmalte';
import '../styles/esmaltes.css';

const TableroEsmaltes = ({ 
  cargas = [], 
  setCargaSeleccionada, 
  setMostrarDetalle, 
  filtroOperario, 
  modoEsmalte 
}) => {
  
  const cargasFiltradas = cargas.filter(c => {
    const nombreCarga = c.operario || 'Área Esmaltes';
    
    const pasaNombre = filtroOperario ? nombreCarga.includes(filtroOperario) : true;
    
    let pasaModo = true;
    if (modoEsmalte === 'DIRECTO') {
      pasaModo = !nombreCarga.includes('/');
    } else if (modoEsmalte === 'MOLIENDA') {
      pasaModo = nombreCarga.includes('Germán');
    } else if (modoEsmalte === 'PREPARADO') {
      pasaModo = nombreCarga.includes('Aldo');
    }

    return pasaNombre && pasaModo;
  });

  return (
    <div className="esmaltes-full-view">
      <div className="grid-esmaltes-neon">
        {cargasFiltradas.length > 0 ? (
          cargasFiltradas.map((carga) => (
            <CardEsmalte
              key={carga.idTemp || carga.id || carga.folio}
              carga={carga}
              onClick={() => {
                setCargaSeleccionada(carga);
                setMostrarDetalle(true);
              }}
            />
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