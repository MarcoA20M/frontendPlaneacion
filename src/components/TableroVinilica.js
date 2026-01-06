import React from 'react';
import CardCarga from './CardCarga';
import { getOperarioPorMaquina } from '../constants/config';

export default function TableroVinilica({ produccion, fechaTrabajo, setCargaSeleccionada, setMostrarDetalle }) {
  const { rondas, setRondas, cargasEspeciales, setCargasEspeciales } = produccion;

  const handleDrop = (e, fDestino, cDestino) => {
    e.preventDefault();
    const dataRaw = e.dataTransfer.getData("transferData");
    if (!dataRaw) return;
    const origen = JSON.parse(dataRaw);
    
    let nR = [...rondas.map(f => [...f])];
    let nE = [...cargasEspeciales];
    let carga;

    if (origen.tipo === 'ronda') {
      carga = nR[origen.f][origen.c];
      nR[origen.f][origen.c] = nR[fDestino][cDestino];
      nR[fDestino][cDestino] = carga;
    } else {
      carga = nE[origen.index];
      if (nR[fDestino][cDestino]) return alert("Celda ocupada");
      nR[fDestino][cDestino] = carga;
      nE.splice(origen.index, 1);
    }

    if (nR[fDestino][cDestino]) {
      nR[fDestino][cDestino].operario = getOperarioPorMaquina(101 + fDestino, fechaTrabajo);
    }
    setRondas(nR);
    setCargasEspeciales(nE);
  };

  return (
    <div className="rondas-panel">
      <div className="tabla-rondas">
        <div className="fila-ronda header">
          <div></div>{[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
        </div>
        {rondas.map((fila, fIdx) => (
          <div className="fila-ronda" key={fIdx}>
            <div className="etiqueta-ronda">
              <span className="codigo-maquina">VI-{101 + fIdx}</span>
              <span className="nombre-operario">{getOperarioPorMaquina(101 + fIdx, fechaTrabajo)}</span>
            </div>
            {fila.map((celda, cIdx) => (
              <div 
                className="celda-ronda clickable" 
                key={cIdx} 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={(e) => handleDrop(e, fIdx, cIdx)}
              >
                {celda?.tipo === "Vinílica" && (
                  <div 
                    draggable 
                    onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx }))} 
                    onClick={() => { setCargaSeleccionada(celda); setMostrarDetalle(true); }}
                  >
                    <CardCarga carga={celda} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}