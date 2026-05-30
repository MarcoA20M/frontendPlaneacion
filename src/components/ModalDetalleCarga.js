import React from 'react';
import '../styles/modalDetalle.css'; 

const ModalDetalleCarga = ({ 
  visible, 
  carga, 
  onClose, 
  onEliminar, 
  onMoverEspecial,
  onCambiarOperario 
}) => {
  if (!visible || !carga) return null;

  const OPERARIOS_ESMALTE = ["Aldo", "Germán", "Gaspar", "Pedro", "Alberto", "Aldo / Gaspar", "Aldo / Pedro", "Germán / Gaspar", "Germán / Pedro"];
  const esEsmalte = carga.tipo === "Esmalte";

  // Función para obtener el nombre del formato
  const getNombreFormato = (formato) => {
    const formatos = {
      0.25: "Cuarto de litro (1/4 L)",
      0.5: "Medio litro (1/2 L)",
      0.75: "Tres cuartos (3/4 L)",
      1: "Un litro (1 L)",
      4: "Cuatro litros (4 L)",
      19: "Diecinueve litros (19 L)"
    };
    return formatos[formato] || `${formato} Litros`;
  };

  // Calcular litros totales desde detallesEnvasado
  const calcularLitrosTotales = () => {
    if (carga.detallesEnvasado && carga.detallesEnvasado.length > 0) {
      return carga.detallesEnvasado.reduce((total, item) => {
        return total + (item.formato * item.cantidad);
      }, 0);
    }
    return carga.litros || 0;
  };

  const litrosTotales = calcularLitrosTotales();

  return (
    <div className="detalle-modal-overlay" onClick={onClose}>
      <div className="detalle-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="detalle-modal-header">
          <h2>Detalle de Carga</h2>
          <span style={{color: '#aaa', fontSize: '12px'}}>Vista de gestión</span>
        </div>
        
        <div className="detalle-modal-body">
          {/* FILA 1: Folio y Especificaciones */}
          <div className="info-group-row">
            <div className="info-group half">
              <label>📄 Folio de Orden</label>
              <div className="data folio">{carga.folio}</div>
            </div>
            
            <div className="info-group half">
              <label>⚙️ Especificaciones</label>
              <div className="data">
                {carga.tipo} — {carga.nivelCubriente} m²/L
              </div>
            </div>
          </div>

          {/* FILA 2: Código Producto y Operario */}
          <div className="info-group-row">
            <div className="info-group half">
              <label>🔢 Código Producto</label>
              <div className="data codigo">{carga.codigoProducto}</div>
            </div>
            
            <div className="info-group half">
              <label>👤 Operario Asignado</label>
              {esEsmalte ? (
                <select 
                  value={carga.operario} 
                  onChange={(e) => onCambiarOperario(carga.idTemp, e.target.value)}
                  className="select-operario-detalle"
                >
                  {OPERARIOS_ESMALTE.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              ) : (
                <div className="data operario">{carga.operario}</div>
              )}
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div className="info-group">
            <label>📝 Descripción Completa</label>
            <div className="data">{carga.descripcion}</div>
          </div>

          {/* SECCIÓN DE ENVASADO CON DETALLES */}
          <div className="info-group envasado-section">
            <label>📦 Envasado</label>
            <div className="envasado-info-card">
              <div className="envasado-resumen">
                <span className="total-litros">
                  Total: <strong>{litrosTotales.toFixed(2)} L</strong>
                </span>
              </div>
              
              {carga.detallesEnvasado && carga.detallesEnvasado.length > 0 ? (
                <div className="envasado-detalle-lista">
                  {carga.detallesEnvasado.map((item, idx) => (
                    <div key={idx} className="envasado-item">
                      <span className="envasado-icono">🛢️</span>
                      <div className="envasado-info">
                        <div className="envasado-formato">
                          <strong>{item.formato} L</strong>
                          <span className="formato-nombre">({getNombreFormato(item.formato)})</span>
                        </div>
                        <div className="envasado-cantidad">
                          Cantidad: {item.cantidad} bote(s)
                          <span className="subtotal">
                            → {(item.formato * item.cantidad).toFixed(2)} L
                          </span>
                        </div>
                        <div className="envasado-articulo">
                          Artículo: <code>{item.articulo || `${String(item.formato).padStart(3, '0')}-${carga.codigoProducto}`}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="envasado-simple">
                  <div className="envasado-item">
                    <span className="envasado-icono">🛢️</span>
                    <div className="envasado-info">
                      <div className="envasado-formato">
                        <strong>{carga.litros} L</strong>
                        <span className="formato-nombre">({getNombreFormato(carga.litros)})</span>
                      </div>
                      <div className="envasado-articulo">
                        Artículo: <code>{`${String(carga.litros).padStart(3, '0')}-${carga.codigoProducto}`}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
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