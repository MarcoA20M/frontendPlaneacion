import React from "react";
import "../styles/modalCargas.css";

function ModalCargas({ visible, cargas, historialCargas, producto, onClose, onGuardar }) {
  if (!visible) return null;

  // --- LÓGICA DE ORDENAMIENTO DOBLE (CUBRIENTE Y LUEGO LOTE) ---
  const cargasClasificadas = [...cargas].sort((a, b) => {
    const cubrienteA = a.nivelCubriente || 0;
    const cubrienteB = b.nivelCubriente || 0;

    // 1. Primero por Cubriente
    if (cubrienteA !== cubrienteB) {
      return cubrienteA - cubrienteB;
    }

    // 2. Si son iguales, por número de Lote (Folio)
    const folioA = String(a.folio || "");
    const folioB = String(b.folio || "");
    return folioA.localeCompare(folioB, undefined, { numeric: true });
  });

  const totalLitros = cargasClasificadas.reduce((t, c) => t + c.litros, 0);

  const renderFila = (c, index) => (
    <div className="fila-carga" key={index}>
      <div className="celda">{c.codigoProducto}</div>
      <div className="celda">{c.tipoPintura}</div>
      <div className="celda folio-lote">{c.folio || "-"}</div> {/* Clase para estilo */}
      <div className="celda">{c.litros.toFixed(2)} L</div>
      <div className="celda">{c.nivelCubriente}</div> {/* Quitamos el style gris para que use tu CSS */}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-cargas">
        <div className="modal-header">
          <h2>Gestión de Cargas</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {producto && (
          <div className="info-general">
            <div className="info-item">
              <span className="label">Código</span>
              <span className="value">{producto.codigo}</span>
            </div>
            <div className="info-item">
              <span className="label">Nivel cubriente</span>
              <span className="value">{producto.poderCubriente}</span>
            </div>
            <div className="info-item">
              <span className="label">Litros totales</span>
              <span className="value">{totalLitros.toFixed(2)} L</span>
            </div>
          </div>
        )}

        {cargasClasificadas.length > 0 && (
          <>
            <h3 className="titulo-tabla">Prioridad: 1° Cubriente | 2° Lote</h3>
            <div className="tabla-cargas">
              <div className="fila-carga header">
                <div className="celda">Código</div>
                <div className="celda">Tipo</div>
                <div className="celda">Lote (Folio)</div>
                <div className="celda">Litros</div>
                <div className="celda">Cubriente</div>
              </div>
              {cargasClasificadas.map(renderFila)}
            </div>
          </>
        )}

        {/* HISTORIAL */}
        {historialCargas && historialCargas.length > 0 && (
          <>
            <h3 className="titulo-tabla">Historial de Cargas</h3>
            <div className="tabla-cargas historial">
              <div className="fila-carga header">
                <div className="celda">Código</div>
                <div className="celda">Tipo</div>
                <div className="celda">Lote (Folio)</div>
                <div className="celda">Litros</div>
                <div className="celda">Cubriente</div>
              </div>
              {historialCargas.map(renderFila)}
            </div>
          </>
        )}

        <div className="modal-footer">
          <button className="btn-guardar" onClick={() => {
            onGuardar(cargasClasificadas); 
            onClose();
          }}>
            Agregar cargas a producción
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCargas;