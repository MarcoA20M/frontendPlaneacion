import React from 'react';
import '../styles/modalInventario.css';

const ModalInventarioBajo = ({ visible, alertas, onClose, onSelectCode, onAnalizarNuevo }) => {
  if (!visible || !alertas) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-cargas inv-container">
        <header className="modal-header">
          <div className="titulo-con-contador">
            <h2>Análisis de Inventario</h2>
            <span className="badge-contador">{alertas.length} códigos en alerta</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="info-general">
          <div className="info-item">
            <span className="label">Monitoreo</span>
            <span className="value">Stock Crítico</span>
          </div>
          <div className="info-item">
            <span className="label">Actualización</span>
            <span className="value" style={{ color: '#00c0ff' }}>Tiempo Real</span>
          </div>
          <div className="info-item">
            <span className="label">Sugerencia</span>
            <span className="value" style={{ color: '#00ffcc' }}>Priorizar Pedidos</span>
          </div>
        </div>

        <div className="tabla-seccion">
          <div className="fila-carga header" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ width: '110px', textAlign: 'center', color: '#64748b', fontSize: '11px', fontWeight: '700' }}>CÓDIGO</div>
            <div className="celda g-3" style={{ textAlign: 'left', paddingLeft: '20px', color: '#64748b', fontSize: '12px' }}>DETALLES DE PRODUCTO</div>
            <div className="celda g-1" style={{ color: '#64748b', fontSize: '11px' }}>STOCK</div>
            <div className="celda g-1" style={{ color: '#64748b', fontSize: '11px' }}>SALIDAS</div>
            <div className="celda g-1" style={{ color: '#64748b', fontSize: '11px' }}>ALCANCE</div>
          </div>

          <div className="contenedor-scroll-tabla">
            {alertas.map((grupo, idx) => (
              <div key={idx} className="bloque-grupo-codigo" onClick={() => { onSelectCode(grupo.codigo); onClose(); }} style={{cursor: 'pointer'}}>
                <div className="columna-codigo-unificada">
                  <span className="codigo-resaltado-grande">{grupo.codigo}</span>
                </div>
                <div className="columna-presentaciones">
                  {grupo.presentaciones.map((p, pIdx) => (
                    <div key={pIdx} className={`sub-fila-inventario ${p.urgencia?.toLowerCase()}`}>
                      <div className="celda g-3 text-left">
                        <div className="contenedor-info-producto">
                          <span className="badge-envasado">{p.envasado}</span>
                          <span className="nombre-producto-inv">{p.nombre_completo}</span>
                        </div>
                      </div>
                      <div className="celda g-1"><span className="dato-existencia">📦 {p.existencia}</span></div>
                      <div className="celda g-1"><span className="dato-salidas">📉 {p.salidas_mes}</span></div>
                      <div className="celda g-1">
                        <div className={`badge-alcance-final ${p.urgencia?.toLowerCase()}`}>
                          {p.alcance} <small>días</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="agregar-btn secondary" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔄 Recargar Excel
            <input 
              type="file" 
              hidden 
              accept=".xlsx, .xls" 
              onChange={(e) => {
                onAnalizarNuevo(e);
                onClose();
              }} 
            />
          </label>
          <button className="btn-guardar" onClick={onClose}>Cerrar Análisis</button>
        </footer>
      </div>
    </div>
  );
};

export default ModalInventarioBajo;