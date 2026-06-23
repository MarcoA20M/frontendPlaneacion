import React, { useState, useEffect } from 'react';
import '../styles/modalInventario.css';
import { verificarCargaReciente } from '../services/cargaService';
import { productoService } from '../services/productoService';

const ModalInventarioBajo = ({ visible, alertas, alertasRevisar, onClose, onSelectCode, onAnalizarNuevo }) => {
  const [buscandoId, setBuscandoId] = useState(null);
  const [infoCarga, setInfoCarga] = useState(null);
  const [poderesCubrientes, setPoderesCubrientes] = useState({});
  const [cargandoPoderes, setCargandoPoderes] = useState(false);
  const [tabActivo, setTabActivo] = useState('alertas');
  const [datosPlanificador, setDatosPlanificador] = useState(null);

  const alertasNormales = alertas || [];
  const revisar = alertasRevisar || [];

  // ===== OBTENER PODER CUBRIENTE =====
  useEffect(() => {
    const todasLasAlertas = [...alertasNormales, ...revisar];
    if (!visible || todasLasAlertas.length === 0) return;

    const obtenerPoderesCubrientes = async () => {
      setCargandoPoderes(true);
      
      try {
        const productos = await productoService.listarTodos();
        
        const mapaPoderes = {};
        productos.forEach(producto => {
          if (producto.codigo) {
            mapaPoderes[producto.codigo] = producto.poderCubriente || producto.poder_cubriente || 'N/A';
          }
        });
        
        setPoderesCubrientes(mapaPoderes);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        const fallback = {};
        todasLasAlertas.forEach(grupo => {
          fallback[grupo.codigo] = 'N/A';
        });
        setPoderesCubrientes(fallback);
      } finally {
        setCargandoPoderes(false);
      }
    };

    obtenerPoderesCubrientes();
  }, [visible, alertasNormales, revisar]);

  if (!visible) return null;

  // Si no hay alertas
  if (alertasNormales.length === 0 && revisar.length === 0) {
    return (
      <div className="modal-overlay">
        <div className="modal-cargas inv-container">
          <header className="modal-header">
            <div className="titulo-con-contador">
              <h2>Análisis de Inventario</h2>
              <span className="badge-contador">0 alertas</span>
            </div>
            <button className="close-btn" onClick={onClose}>&times;</button>
          </header>
          <div className="sin-alertas">
            <p>✅ No hay alertas de inventario en este momento</p>
          </div>
          <footer className="modal-footer footer-inv-flex">
            <button className="btn-guardar" onClick={onClose}>Cerrar</button>
          </footer>
        </div>
      </div>
    );
  }

  const handleVerificarStatus = async (e, codigo, envasadoIdOriginal, nombreEnvasado, datosPresentacion = {}) => {
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
      // Guardar los datos del planificador junto con la info de carga
      setDatosPlanificador({
        salidas: datosPresentacion.salidas_mes || 0,
        existencia: datosPresentacion.existencia || 0,
        alcance: datosPresentacion.alcance || 0,
        nombreEnvasado: nombreEnvasado
      });
      
      setInfoCarga({ ...data, nombreEnvasado, tipo: 'ocupado' });
    } else {
      setDatosPlanificador(null);
      setInfoCarga({
        tipo: 'libre',
        nombreEnvasado,
        msg: `No se encontraron registros para ${nombreEnvasado} bajo el código ${codigo}.`
      });
    }
  };

  const getPoderCubriente = (codigo) => {
    return poderesCubrientes[codigo] || 'N/A';
  };

  // ===== FUNCIÓN PARA CALCULAR AUMENTO DE DÍAS DE ALCANCE =====
  const calcularAumentoDias = (datosCarga, planificadorData) => {
    if (!datosCarga || datosCarga.tipo !== 'ocupado') return null;

    try {
      // Obtener la cantidad total de piezas programadas (pz)
      const totalPz = datosCarga.total || 0;
      
      // Obtener los datos del planificador
      const salidasMensuales = planificadorData?.salidas || 0;
      const existenciaActual = planificadorData?.existencia || 0;
      const alcanceActual = planificadorData?.alcance || 0;
      
      // Factor de conversión: 24 días = 1 mes
      const factorC2 = 24;
      
      // Calcular días adicionales de alcance
      // Días adicionales = (Piezas programadas / Salidas mensuales) * 24
      let diasAdicionales = 0;
      
      if (salidasMensuales > 0 && totalPz > 0) {
        diasAdicionales = (totalPz / salidasMensuales) * factorC2;
      }
      
      // Calcular nuevo alcance
      let nuevoAlcance = alcanceActual + diasAdicionales;
      
      // Calcular nuevo inventario
      let nuevoInventario = existenciaActual + totalPz;
      
      // Calcular días estimados con el nuevo inventario
      let diasEstimados = 0;
      if (salidasMensuales > 0 && nuevoInventario > 0) {
        diasEstimados = (nuevoInventario / salidasMensuales) * factorC2;
      }
      
      return {
        totalPz: totalPz,
        salidasMensuales: Math.round(salidasMensuales),
        existenciaActual: Math.round(existenciaActual),
        nuevoInventario: Math.round(nuevoInventario),
        diasAdicionales: Math.round(diasAdicionales * 10) / 10,
        alcanceActual: Math.round(alcanceActual),
        nuevoAlcance: Math.round(nuevoAlcance * 10) / 10,
        diasEstimados: Math.round(diasEstimados * 10) / 10,
        incrementoPorcentaje: alcanceActual > 0 ? Math.round((diasAdicionales / alcanceActual) * 100) : 0
      };
    } catch (error) {
      console.error('Error calculando aumento de días:', error);
      return null;
    }
  };

  // Renderizar el detalle de la programación con el cálculo de días
  const renderInfoCargaDetalle = () => {
    if (!infoCarga) return null;

    const calculoDias = calcularAumentoDias(infoCarga, datosPlanificador);

    return (
      <div className={`emergente-info-card ${infoCarga.tipo}`}>
        <div className="emergente-header">
          <h3>{infoCarga.tipo === 'ocupado' ? '📊 PROGRAMACIÓN ENCONTRADA' : '✅ DISPONIBLE'}</h3>
          <button className="close-mini-btn" onClick={() => setInfoCarga(null)}>&times;</button>
        </div>
        <div className="emergente-body">
          {infoCarga.tipo === 'ocupado' ? (
            <>
              <p className="emergente-titulo-prod">{infoCarga.nombreEnvasado.toUpperCase()}</p>
              
              <div className="emergente-dato">
                <span>Lotes detectados:</span> 
                <strong>{infoCarga.conteoLotes || 1}</strong>
              </div>
              
              <div className="emergente-dato">
                <span>Cantidad Total:</span> 
                <strong>{infoCarga.total} uds</strong>
              </div>
              
              <div className="emergente-dato">
                <span>Folio(s):</span> 
                <strong className="txt-highlight">{infoCarga.folios}</strong>
              </div>
              
              <div className="emergente-dato">
                <span>Operario(s):</span> 
                <strong>{infoCarga.operarios}</strong>
              </div>
              
              <div className="emergente-dato">
                <span>Último registro:</span> 
                <strong>{infoCarga.fecha}</strong>
              </div>

              {/* ===== SECCIÓN DE CÁLCULO DE DÍAS DE ALCANCE ===== */}
              {calculoDias && calculoDias.totalPz > 0 && (
                <div className="emergente-calculo-dias">
                
                  
                  <div className="calculo-grid">
                    <div className="calculo-item">
                      <span className="calculo-label">Piezas Programadas</span>
                      <span className="calculo-valor">{calculoDias.totalPz}</span>
                    </div>
                    
                    <div className="calculo-item">
                      <span className="calculo-label">Salidas Mensuales</span>
                      <span className="calculo-valor">{calculoDias.salidasMensuales}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Existencia Actual</span>
                      <span className="calculo-valor">{calculoDias.existenciaActual}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Nuevo Inventario</span>
                      <span className="calculo-valor highlight-verde">{calculoDias.nuevoInventario}</span>
                    </div>
                    
                    <div className="calculo-item">
                      <span className="calculo-label">Días Adicionales</span>
                      <span className="calculo-valor highlight-verde">+{calculoDias.diasAdicionales} días</span>
                    </div>
                    
                    <div className="calculo-item">
                      <span className="calculo-label">Alcance Actual</span>
                      <span className="calculo-valor">{calculoDias.alcanceActual} días</span>
                    </div>
                    
  

                    <div className="calculo-item calculo-item-destacado" style={{ gridColumn: '1 / -1', background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.15)' }}>
                      <span className="calculo-label">Días Estimados (con nuevo inventario)</span>
                      <span className="calculo-valor" style={{ color: '#4ade80', fontSize: '15px' }}>
                        {calculoDias.diasEstimados} días
                      </span>
                    </div>
                  </div>

                 
                </div>
              )}
              
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
    );
  };

  // Función para renderizar las alertas
  const renderAlertasLista = (listaAlertas) => {
    if (!listaAlertas || listaAlertas.length === 0) {
      return (
        <div className="seccion-vacia">
          <p>No hay elementos para mostrar</p>
        </div>
      );
    }

    return listaAlertas.map((grupo, idx) => {
      const poderCubriente = getPoderCubriente(grupo.codigo);
      
      return (
        <div key={idx} className="bloque-grupo-codigo">
          <div className="columna-codigo-unificada" onClick={() => { onSelectCode(grupo.codigo); onClose(); }}>
            <span className="codigo-resaltado-grande">{grupo.codigo}</span>
            {cargandoPoderes ? (
              <div className="hint-programar" style={{ color: '#64748b', opacity: 0.5 }}>
                Cargando...
              </div>
            ) : (
              <div className="poder-cubriente-display">
                <span className="poder-cubriente-numero">{poderCubriente}</span>
                <span className="poder-cubriente-etiqueta">Cubriente: </span>
              </div>
            )}
          </div>

          <div className="columna-presentaciones">
            {grupo.presentaciones && grupo.presentaciones.length > 0 ? (
              grupo.presentaciones.map((p, pIdx) => {
                const idEnvaseOriginal = p.envasado_id || p.id_envasado || p.envasado;
                const idParaKey = typeof idEnvaseOriginal === 'string' && idEnvaseOriginal.includes('-')
                  ? parseInt(idEnvaseOriginal.split('-')[0], 10)
                  : idEnvaseOriginal;
                const isBuscando = buscandoId === `${grupo.codigo}-${idParaKey}`;

                return (
                  <div
                    key={pIdx}
                    className={`sub-fila-inventario ${p.urgencia?.toLowerCase()} ${isBuscando ? 'verificando' : ''}`}
                    onClick={(e) => handleVerificarStatus(e, grupo.codigo, idEnvaseOriginal, p.envasado_nombre || p.envasado, p)}
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
                      <span className="dato-existencia">📉{p.salidas_mes}</span>
                    </div>

                    <div className="celda g-1">
                      <span className="dato-salidas">📦 {p.existencia}</span>
                    </div>

                    <div className="celda g-1">
                      <div className={`badge-alcance-final ${p.urgencia?.toLowerCase()}`}>
                        {p.alcance} <small>días</small>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="sin-presentaciones">
                <p style={{ color: '#64748b', padding: '12px', textAlign: 'center', fontSize: '0.85rem' }}>
                  No hay presentaciones disponibles
                </p>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-cargas inv-container">

        {infoCarga && (
          <div className="emergente-info-overlay">
            {renderInfoCargaDetalle()}
          </div>
        )}

        <header className="modal-header">
          <div className="titulo-con-contador">
            <h2>Análisis de Inventario</h2>
            <div className="tabs-container-header">
              {alertasNormales.length > 0 && (
                <button 
                  className={`tab-btn-header ${tabActivo === 'alertas' ? 'active' : ''}`}
                  onClick={() => setTabActivo('alertas')}
                >
                  ⚠️ Alertas
                  <span className="tab-badge-header">{alertasNormales.length}</span>
                </button>
              )}
              {revisar.length > 0 && (
                <button 
                  className={`tab-btn-header revisar-tab-header ${tabActivo === 'revisar' ? 'active' : ''}`}
                  onClick={() => setTabActivo('revisar')}
                >
                  🔍 Para Revisar
                  <span className="tab-badge-header">{revisar.length}</span>
                </button>
              )}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="tabla-seccion">
          <div className="fila-carga header-tabla-inv">
            <div className="col-codigo-header">CÓDIGO</div>
            <div className="celda g-3 txt-left-details descripcion-header">DESCRIPCIÓN</div>
            <div className="celda g-1 label-small stock-header">SALIDAS</div>
            <div className="celda g-1 label-small">STOCK</div>
            <div className="celda g-1 label-small">ALCANCE</div>
          </div>

          <div className="contenedor-scroll-tabla">
            {tabActivo === 'alertas' && alertasNormales.length > 0 && (
              renderAlertasLista(alertasNormales)
            )}

            {tabActivo === 'revisar' && revisar.length > 0 && (
              renderAlertasLista(revisar)
            )}
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