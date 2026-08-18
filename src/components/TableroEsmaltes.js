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
    // ⭐ EXCLUIR ENVASADORES: Si el operario es un envasador, NO se muestra
    // Los envasadores se manejan en la sección de Envasadores de Operarios
    const operario = c.operario || 'Área Esmaltes';
    
    // Lista de envasadores (puedes obtenerla de una constante o del servicio)
    const envasadores = ['Sandro', 'Agustín', 'Antonio', 'Ezequiel', 'Alejandro', 'Israel'];
    
    // Si el operario está en la lista de envasadores, excluirlo
    if (envasadores.includes(operario)) {
      return false;
    }
    
    // ⭐ FILTRO POR NOMBRE
    const pasaNombre = filtroOperario ? operario.includes(filtroOperario) : true;
    
    // ⭐ FILTRO POR MODO
    let pasaModo = true;
    if (modoEsmalte === 'DIRECTO') {
      pasaModo = !operario.includes('/');
    } else if (modoEsmalte === 'MOLIENDA') {
      pasaModo = operario.toLowerCase().includes('germán');
    } else if (modoEsmalte === 'PREPARADO') {
      pasaModo = operario.toLowerCase().includes('aldo');
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