import React, { useState } from 'react';
import '../styles/modalInventario.css';
import { verificarCargaReciente } from '../services/cargaService';

const ModalInventarioBajo = ({ visible, alertas, onClose, onSelectCode, onAnalizarNuevo }) => {
  const [buscandoId, setBuscandoId] = useState(null);
  const [infoCarga, setInfoCarga] = useState(null); // Estado para el modal emergente

  if (!visible || !alertas) return null;

  const handleVerificarStatus = async (e, codigo, envasadoIdOriginal, nombreEnvasado) => {
    e.stopPropagation();

    let idLimpio = envasadoIdOriginal;
    if (typeof envasadoIdOriginal === 'string' && envasadoIdOriginal.includes('-')) {
      idLimpio = parseInt(envasadoIdOriginal.split('-')[0], 10);
    }

    const key = `${codigo}-${idLimpio}`;
    setBuscandoId(key);

    const data = await verificarCargaReciente(codigo, idLimpio);
    setBuscandoId(null);

    if (data) {
      setInfoCarga({ ...data, nombreEnvasado, tipo: 'ocupado' });
    } else {
      setInfoCarga({
        tipo: 'libre',
        nombreEnvasado,
        msg: `No se encontraron registros para ${nombreEnvasado} bajo el código ${codigo}.`
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-cargas inv-container">

        {/* --- MODAL EMERGENTE (INTERNAL MODAL) --- */}
        {infoCarga && (
          <div className="emergente-info-overlay">
            <div className={`emergente-info-card ${infoCarga.tipo}`}>
              <div className="emergente-header">
                <h3>{infoCarga.tipo === 'ocupado' ? '📊 PROGRAMACIÓN ENCONTRADA' : '✅ DISPONIBLE'}</h3>
                <button className="close-mini-btn" onClick={() => setInfoCarga(null)}>&times;</button>
              </div>
              <div className="emergente-body">
                {infoCarga.tipo === 'ocupado' ? (
                  <>
                    <p className="emergente-titulo-prod">{infoCarga.nombreEnvasado.toUpperCase()}</p>
                    <div className="emergente-dato"><span>Lotes detectados:</span> <strong>{infoCarga.conteoLotes || 1}</strong></div>
                    <div className="emergente-dato"><span>Cantidad Total:</span> <strong>{infoCarga.total} uds</strong></div>
                    <div className="emergente-dato"><span>Folio(s):</span> <strong className="txt-highlight">{infoCarga.folios}</strong></div>
                    <div className="emergente-dato"><span>Operario(s):</span> <strong>{infoCarga.operarios}</strong></div>
                    <div className="emergente-dato"><span>Último registro:</span> <strong>{infoCarga.fecha}</strong></div>
                    <p className="emergente-footer-aviso">⚠️ Ya existe producción registrada para esta combinación.</p>
                  </>
                ) : (
                  <div className="emergente-libre">
                    <p>{infoCarga.msg}</p>
                    <small>Historial limpio en los últimos 7 días.</small>
                  </div>
                )}
              </div>
              <button className="btn-emergente-cerrar" onClick={() => setInfoCarga(null)}>ENTENDIDO</button>
            </div>
          </div>
        )}

        <header className="modal-header">
          <div className="titulo-con-contador">
            <h2>Análisis de Inventario</h2>
            <span className="badge-contador">{alertas.length} códigos en alerta</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        

        <div className="tabla-seccion">
          <div className="fila-carga header-tabla-inv">
            <div className="col-codigo-header">CÓDIGO</div>
           <div className="celda g-3 txt-left-details descripcion-header">DESCRIPCIÓN</div>
            <div className="celda g-1 label-small stock-header">STOCK</div>
            <div className="celda g-1 label-small">SALIDAS</div>
            <div className="celda g-1 label-small">ALCANCE</div>
          </div>

          <div className="contenedor-scroll-tabla">
            {alertas.map((grupo, idx) => (
              <div key={idx} className="bloque-grupo-codigo">
                <div className="columna-codigo-unificada" onClick={() => { onSelectCode(grupo.codigo); onClose(); }}>
                  <span className="codigo-resaltado-grande">{grupo.codigo}</span>
                  <div className="hint-programar">PROGRAMAR</div>
                </div>

                <div className="columna-presentaciones">
                  {grupo.presentaciones.map((p, pIdx) => {
                    const idEnvaseOriginal = p.envasado_id || p.id_envasado || p.envasado;
                    const idParaKey = typeof idEnvaseOriginal === 'string' && idEnvaseOriginal.includes('-')
                      ? parseInt(idEnvaseOriginal.split('-')[0], 10)
                      : idEnvaseOriginal;
                    const isBuscando = buscandoId === `${grupo.codigo}-${idParaKey}`;

                    return (
                      <div
                        key={pIdx}
                        className={`sub-fila-inventario ${p.urgencia?.toLowerCase()} ${isBuscando ? 'verificando' : ''}`}
                        onClick={(e) => handleVerificarStatus(e, grupo.codigo, idEnvaseOriginal, p.envasado_nombre || p.envasado)}
                      >
                        <div className="celda g-3 text-left">
                          <div className="contenedor-info-producto">
                            <span className="badge-envasado">
                              {isBuscando ? '...' : p.envasado}
                            </span>
                            <span className="nombre-producto-inv">{p.nombre_completo}</span>
                          </div>
                        </div>

                        <div className="celda g-1">
                          <span className="dato-existencia">📦 {p.existencia}</span>
                        </div>

                        <div className="celda g-1">
                          <span className="dato-salidas">📉 {p.salidas_mes}</span>
                        </div>

                        <div className="celda g-1">
                          <div className={`badge-alcance-final ${p.urgencia?.toLowerCase()}`}>
                            {p.alcance} <small>días</small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="modal-footer footer-inv-flex">
          <label className="agregar-btn secondary label-excel-btn">
            🔄 Recargar Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={(e) => { onAnalizarNuevo(e); onClose(); }} />
          </label>
          <button className="btn-guardar" onClick={onClose}>Cerrar Análisis</button>
        </footer>
      </div>
    </div>
  );
};

export default ModalInventarioBajo;