import React from 'react';
import CardCarga from './CardCarga';
import { getOperarioPorMaquina } from '../constants/config';

export default function TableroVinilica({ rondas, fechaTrabajo, handleDrop, setCargaSeleccionada, setMostrarDetalle, filtroOperario }) {
  return (
    <div className="rondas-panel">
      <div className="tabla-rondas">
        <div className="fila-ronda header">
          <div></div>{[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
        </div>
        {rondas.map((fila, fIdx) => {
          const nombreOp = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
          
          // Ocultar filas que no pertenecen al operario filtrado
          if (filtroOperario && nombreOp !== filtroOperario) return null;

          return (
            <div className="fila-ronda" key={fIdx}>
              <div className="etiqueta-ronda">
                <span className="codigo-maquina">VI-{101 + fIdx}</span>
                <span className="nombre-operario">{nombreOp}</span>
              </div>
              {fila.map((celda, cIdx) => (
                <div className="celda-ronda clickable" key={cIdx} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, fIdx, cIdx)}>
                  {celda && (
                    Array.isArray(celda) ? (
                      celda.map((subCarga, subIdx) => (
                        <div key={subCarga.idTemp} draggable onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx, subIndex: subIdx }))} onClick={() => { setCargaSeleccionada(subCarga); setMostrarDetalle(true); }}>
                          <CardCarga carga={subCarga} isCompact={true} />
                        </div>
                      ))
                    ) : (
                      <div draggable onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx }))} onClick={() => { setCargaSeleccionada(celda); setMostrarDetalle(true); }}>
                        <CardCarga carga={celda} isCompact={false} />
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}