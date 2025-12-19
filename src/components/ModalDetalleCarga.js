import React from 'react';
import '../styles/modalDetalle.css'; 

const ModalDetalleCarga = ({ visible, carga, onClose, onEliminar, onMoverEspecial }) => {
  if (!visible || !carga) return null;

  return (
    <div className="detalle-modal-overlay" onClick={onClose}>
      <div className="detalle-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="detalle-modal-header">
          <h2>Detalle de Carga</h2>
          <span style={{color: '#aaa', fontSize: '12px'}}>Vista de gestión</span>
        </div>
        
        <div className="detalle-modal-body">
          {/* CAMBIO AQUÍ: Sección de Folio */}
          <div className="info-group">
            <label>Folio de Orden</label>
            <div className="data" style={{color: '#007bff', fontWeight: 'bold', fontSize: '1.2rem'}}>
               {carga.folio}
            </div>
          </div>

          <div className="info-group">
            <label>Código Producto</label>
            <div className="data codigo">{carga.codigoProducto}</div>
          </div>

          <div className="info-group">
            <label>Descripción Completa</label>
            <div className="data">{carga.descripcion}</div>
          </div>

          <div className="info-group">
            <label>Volumen a Envasar</label>
            <div className="data litros">{carga.litros.toFixed(2)} L</div>
          </div>

          <div className="info-group">
            <label>Especificaciones</label>
            <div className="data">
              {carga.tipoPintura} — Cubriente: {carga.nivelCubriente}
            </div>
          </div>
          
          {carga.operario && (
            <div className="info-group">
              <label>Operario Asignado</label>
              <div className="data" style={{color: '#bc13fe', fontWeight: 'bold'}}>
                {carga.operario}
              </div>
            </div>
          )}
        </div>
        
        <div className="detalle-modal-footer">
          <div className="acciones-peligrosas">
            <button className="btn-eliminar" onClick={() => onEliminar(carga)}>
              🗑️ ELIMINAR
            </button>
            <button className="btn-especial" onClick={() => onMoverEspecial(carga)}>
              ⚠️ PASAR A ESPECIAL
            </button>
          </div>
          
          <button className="btn-cerrar-info" onClick={onClose}>
            VOLVER AL PANEL
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleCarga;