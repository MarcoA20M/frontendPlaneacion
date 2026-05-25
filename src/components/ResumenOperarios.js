import React, { useMemo } from 'react';

export default function ResumenOperarios({ 
  rondas, 
  cargasEsmaltes, 
  tipoPintura, 
  fechaTrabajo, 
  getOperarioPorMaquina, 
  onFiltrar, 
  filtroActivo 
}) {
  const resumen = useMemo(() => {
    const data = {};

    if (tipoPintura === "Vinílica") {
      rondas.forEach((fila, fIdx) => {
        const nombreCompleto = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
        // Separamos por "/" y limpiamos espacios
        const nombres = nombreCompleto.split('/').map(n => n.trim());
        
        nombres.forEach(nombre => {
          if (!data[nombre]) data[nombre] = { nombre, total: 0 };
          fila.forEach(celda => {
            if (!celda) return;
            data[nombre].total += Array.isArray(celda) ? celda.length : 1;
          });
        });
      });
    } else {
      // LÓGICA PARA ESMALTES: Separar nombres combinados
      cargasEsmaltes.forEach(carga => {
        const nombreCompleto = carga.operario || 'Área Esmaltes';
        const nombres = nombreCompleto.split('/').map(n => n.trim());

        nombres.forEach(nombre => {
          if (!data[nombre]) data[nombre] = { nombre, total: 0 };
          data[nombre].total += 1;
        });
      });
    }
    return Object.values(data);
  }, [rondas, cargasEsmaltes, tipoPintura, fechaTrabajo, getOperarioPorMaquina]);

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