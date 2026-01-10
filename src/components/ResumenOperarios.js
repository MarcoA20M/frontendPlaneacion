import React, { useMemo } from 'react';

export default function ResumenOperarios({ rondas, fechaTrabajo, getOperarioPorMaquina, onFiltrar, filtroActivo }) {
  const resumen = useMemo(() => {
    const data = {};
    rondas.forEach((fila, fIdx) => {
      const nombre = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
      if (!data[nombre]) data[nombre] = { nombre, total: 0 };
      fila.forEach(celda => {
        if (!celda) return;
        data[nombre].total += Array.isArray(celda) ? celda.length : 1;
      });
    });
    return Object.values(data);
  }, [rondas, fechaTrabajo, getOperarioPorMaquina]);

  return (
    <div className="resumen-operarios">
      {resumen.map(op => (
        <button 
          key={op.nombre} 
          className={`card-op ${filtroActivo === op.nombre ? 'active' : ''}`}
          onClick={() => onFiltrar(filtroActivo === op.nombre ? null : op.nombre)}
        >
          <span>{op.nombre}</span>
          <span className="op-total-badge">{op.total}</span>
        </button>
      ))}

      {filtroActivo && (
        <button className="btn-limpiar-filtro" onClick={() => onFiltrar(null)}>
          ✕ Quitar Filtro
        </button>
      )}
    </div>
  );
}