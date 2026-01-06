import React from "react";
import "../styles/modalCargas.css";

function ModalCargas({ visible, cargas, historialCargas, producto, onClose, onGuardar, onEliminarCarga }) {
  if (!visible) return null;

  const cargasClasificadas = [...cargas].sort((a, b) => {
    const cubrienteA = a.nivelCubriente || 0;
    const cubrienteB = b.nivelCubriente || 0;
    if (cubrienteA !== cubrienteB) return cubrienteA - cubrienteB;
    const folioA = String(a.folio || "");
    const folioB = String(b.folio || "");
    return folioA.localeCompare(folioB, undefined, { numeric: true });
  });

  const totalLitros = cargasClasificadas.reduce((t, c) => t + c.litros, 0);

  const renderFila = (c, index, esHistorial = false) => (
    <div className="fila-carga" key={c.idTemp || index}>
      <div className="celda nro">{index + 1}</div>
      <div className="celda g-2">{c.codigoProducto}</div>
      <div className="celda g-2">{c.tipo || "N/A"}</div>
      <div className="celda g-2 folio-lote">{c.folio || "-"}</div>
      <div className="celda g-1">{c.litros.toFixed(2)} L</div>
      <div className="celda g-1">{c.nivelCubriente}</div>
      <div className="celda accion">
        {!esHistorial && (
          <button className="btn-borrar-fila" onClick={() => onEliminarCarga(c.idTemp)}>✕</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-cargas">
        <div className="modal-header">
          <div className="titulo-con-contador">
            <h2>Gestión de Cargas</h2>
            <span className="badge-contador">{cargasClasificadas.length} en espera</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {producto && (
          <div className="info-general">
            <div className="info-item">
              <span className="label">Código</span>
              <span className="value">{producto.codigo}</span>
            </div>
            <div className="info-item">
              <span className="label">Cubriente</span>
              <span className="value">{producto.poderCubriente}</span>
            </div>
            <div className="info-item">
              <span className="label">Total Litros</span>
              <span className="value">{totalLitros.toFixed(2)} L</span>
            </div>
          </div>
        )}

        {/* EL BOTÓN AHORA ESTÁ AQUÍ ARRIBA */}
        <div className="modal-footer" style={{ marginBottom: '20px', marginTop: '0px' }}>
          <button 
            className="btn-guardar" 
            style={{ width: '100%' }} /* Lo hacemos ancho completo para que sea fácil de clickear */
            disabled={cargasClasificadas.length === 0}
            onClick={() => { onGuardar(cargasClasificadas); onClose(); }}
          >
            Agregar a producción ({cargasClasificadas.length} cargas)
          </button>
        </div>

        {cargasClasificadas.length > 0 ? (
          <div className="tabla-container">
            <h3 className="titulo-tabla">Prioridad: 1° Cubriente | 2° Lote</h3>
            <div className="tabla-cargas">
              <div className="fila-carga header">
                <div className="celda nro">#</div>
                <div className="celda g-2">Código</div>
                <div className="celda g-2">Tipo</div>
                <div className="celda g-2">Lote (Folio)</div>
                <div className="celda g-1">Litros</div>
                <div className="celda g-1">Cubr.</div>
                <div className="celda accion"></div>
              </div>
              {cargasClasificadas.map((c, i) => renderFila(c, i, false))}
            </div>
          </div>
        ) : (
          <div className="sin-cargas">No hay cargas en la cola de espera.</div>
        )}
      </div>
    </div>
  );
}

export default ModalCargas;