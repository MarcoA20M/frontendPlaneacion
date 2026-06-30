// src/components/ModalInventarioBajo.js
import React, { useState, useEffect } from 'react';
import '../styles/modalInventario.css';
import { verificarCargaReciente, verificarCargaPorFolio } from '../services/cargaService';
import { productoService } from '../services/productoService';
import ModalDetalleCarga from './ModalDetalleCarga';

const ModalInventarioBajo = ({ visible, alertas, alertasRevisar, onClose, onSelectCode, onAnalizarNuevo }) => {
  const [buscandoId, setBuscandoId] = useState(null);
  const [infoCarga, setInfoCarga] = useState(null);
  const [infoProductos, setInfoProductos] = useState({});
  const [cargandoInfo, setCargandoInfo] = useState(false);
  const [tabActivo, setTabActivo] = useState('alertas');
  const [datosPlanificador, setDatosPlanificador] = useState(null);
  const [cargandoFolio, setCargandoFolio] = useState(false);

  // Estado para el modal de detalle
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [cargaSeleccionada, setCargaSeleccionada] = useState(null);
  // Estado para almacenar los datos de cada folio
  const [datosFolios, setDatosFolios] = useState({});

  const alertasNormales = alertas || [];
  const revisar = alertasRevisar || [];

  // Mapa de abreviaturas para procesos
  const abreviaturaProcesos = {
    'terminado': 'T',
    'molienda': 'M',
    'preparado': 'P',
    'igualacion': 'I',
    'igualación': 'I',
  };

  // Obtener información de productos
  useEffect(() => {
    const todasLasAlertas = [...alertasNormales, ...revisar];
    if (!visible || todasLasAlertas.length === 0) return;

    const obtenerInfoProductos = async () => {
      setCargandoInfo(true);

      try {
        const productos = await productoService.listarTodos();

        const mapaInfo = {};
        productos.forEach(producto => {
          if (producto.codigo) {
            let procesos = [];

            if (producto.procesos && Array.isArray(producto.procesos) && producto.procesos.length > 0) {
              procesos = producto.procesos;
            } else if (producto.ruta_produccion && Array.isArray(producto.ruta_produccion) && producto.ruta_produccion.length > 0) {
              procesos = producto.ruta_produccion;
            } else if (producto.procesos_fabricacion && Array.isArray(producto.procesos_fabricacion) && producto.procesos_fabricacion.length > 0) {
              procesos = producto.procesos_fabricacion;
            } else if (producto.ruta && Array.isArray(producto.ruta) && producto.ruta.length > 0) {
              procesos = producto.ruta;
            } else if (producto.proceso) {
              if (typeof producto.proceso === 'string') {
                procesos = [{ paso: 1, descripcion: producto.proceso }];
              } else if (typeof producto.proceso === 'object') {
                procesos = [producto.proceso];
              }
            }

            const esEsmalte =
              producto.tipo === 'esmalte' ||
              producto.tipo === 'Esmalte' ||
              producto.categoria?.toLowerCase().includes('esmalte') ||
              producto.familia?.toLowerCase().includes('esmalte') ||
              producto.tipo_producto?.toLowerCase().includes('esmalte') ||
              producto.descripcion?.toLowerCase().includes('esmalte') ||
              producto.nombre?.toLowerCase().includes('esmalte') ||
              procesos.length > 0;

            const esEsmalteFinal = esEsmalte || procesos.length > 0;

            mapaInfo[producto.codigo] = {
              poderCubriente: producto.poderCubriente || producto.poder_cubriente || 'N/A',
              esEsmalte: esEsmalteFinal,
              procesos: procesos,
              descripcion: producto.descripcion || producto.nombre || '',
              nombre: producto.nombre || producto.descripcion || ''
            };
          }
        });

        setInfoProductos(mapaInfo);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        const fallback = {};
        todasLasAlertas.forEach(grupo => {
          fallback[grupo.codigo] = {
            poderCubriente: 'N/A',
            esEsmalte: false,
            procesos: [],
            descripcion: grupo.codigo,
            nombre: grupo.codigo
          };
        });
        setInfoProductos(fallback);
      } finally {
        setCargandoInfo(false);
      }
    };

    obtenerInfoProductos();
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
      const info = getInfoProducto(codigo);
      
      setDatosPlanificador({
        salidas: datosPresentacion.salidas_mes || 0,
        existencia: datosPresentacion.existencia || 0,
        alcance: datosPresentacion.alcance || 0,
        nombreEnvasado: nombreEnvasado
      });

      // Separar los folios
      const foliosString = data.folios || 'N/A';
      const foliosArray = foliosString.split(',').map(f => f.trim());
      
      // Inicializar datos de folios vacíos, se cargarán cuando se necesiten
      const datosFoliosMap = {};
      foliosArray.forEach(folio => {
        datosFoliosMap[folio] = null; // null indica que no está cargado
      });

      setDatosFolios(datosFoliosMap);

      // Añadir más información a infoCarga para el detalle
      setInfoCarga({ 
        ...data, 
        nombreEnvasado, 
        tipo: 'ocupado', 
        codigo: codigo,
        descripcionProducto: info.descripcion || nombreEnvasado,
        nivelCubriente: info.poderCubriente || 'N/A',
        tipoProducto: info.esEsmalte ? 'Esmalte' : 'Vinílica',
        detallesEnvasado: data.detallesEnvasado || [],
        foliosArray: foliosArray
      });
    } else {
      setDatosPlanificador(null);
      setInfoCarga({
        tipo: 'libre',
        nombreEnvasado,
        msg: `No se encontraron registros para ${nombreEnvasado} bajo el código ${codigo}.`,
        codigo: codigo
      });
      setDatosFolios({});
    }
  };

  // Función para obtener datos específicos de un folio
  const obtenerDatosFolio = async (folio, codigo) => {
    setCargandoFolio(true);
    try {
      // Llamar a la API para obtener los datos específicos del folio
      const data = await verificarCargaPorFolio(folio, codigo);
      return data;
    } catch (error) {
      console.error('Error al obtener datos del folio:', error);
      return null;
    } finally {
      setCargandoFolio(false);
    }
  };

  // Función para abrir el modal de detalle con un folio específico
  const handleAbrirDetalleConFolio = async (carga, folioSeleccionado) => {
    const info = getInfoProducto(carga.codigo);
    
    // Verificar si ya tenemos los datos del folio
    let datosFolio = datosFolios[folioSeleccionado];
    
    // Si no tenemos datos, hacer la consulta a la API
    if (!datosFolio) {
      const folioData = await obtenerDatosFolio(folioSeleccionado, carga.codigo);
      if (folioData) {
        // Guardar los datos del folio
        setDatosFolios(prev => ({
          ...prev,
          [folioSeleccionado]: folioData
        }));
        datosFolio = folioData;
      }
    }

    // Si aún no hay datos, usar valores por defecto
    if (!datosFolio) {
      datosFolio = {
        cantidad: 0,
        litros: 0,
        operario: carga.operarios || 'No asignado',
        detallesEnvasado: [{ formato: 1, cantidad: 0 }]
      };
    }

    // Construir objeto con los datos específicos del folio
    const cargaParaDetalle = {
      folio: folioSeleccionado,
      foliosOriginal: carga.folios || carga.folio || 'N/A',
      codigoProducto: carga.codigo || 'N/A',
      descripcion: carga.descripcionProducto || carga.nombreEnvasado || 'Sin descripción',
      tipo: carga.tipoProducto || (carga.tipo === 'ocupado' ? 'Esmalte' : 'Vinílica'),
      operario: datosFolio.operario || 'No asignado', // Operario específico del folio
      litros: datosFolio.cantidad || datosFolio.litros || 0, // Cantidad específica del folio
      nivelCubriente: carga.nivelCubriente || info?.poderCubriente || 'N/A',
      idTemp: carga.idTemp || Date.now(),
      detallesEnvasado: datosFolio.detallesEnvasado && datosFolio.detallesEnvasado.length > 0 
        ? datosFolio.detallesEnvasado 
        : [
            {
              formato: 1,
              cantidad: datosFolio.cantidad || 0,
              articulo: `${String(1).padStart(3, '0')}-${carga.codigo}`
            }
          ],
      esMultiFolio: true,
      folioSeleccionado: folioSeleccionado,
      totalOriginal: carga.total
    };
    
    setCargaSeleccionada(cargaParaDetalle);
    setModalDetalleVisible(true);
  };

  // Función original para compatibilidad
  const handleAbrirDetalle = (carga) => {
    const foliosString = carga.folios || carga.folio || 'N/A';
    const foliosArray = foliosString.split(',').map(f => f.trim());
    handleAbrirDetalleConFolio(carga, foliosArray[0] || 'N/A');
  };

  const getInfoProducto = (codigo) => {
    return infoProductos[codigo] || {
      poderCubriente: 'N/A',
      esEsmalte: false,
      procesos: [],
      descripcion: codigo,
      nombre: codigo
    };
  };

  // Función para abreviar texto de procesos
  const abreviarProceso = (texto) => {
    if (!texto) return "N/A";

    let limpio = texto.includes(':') ? texto.split(':')[1].trim() : texto.trim();

    const textoLower = limpio.toLowerCase();
    for (const [key, value] of Object.entries(abreviaturaProcesos)) {
      if (textoLower.includes(key)) {
        return value;
      }
    }

    return limpio.charAt(0).toUpperCase();
  };

  // Función para renderizar la info del producto
  const renderInfoProducto = (codigo) => {
    const info = getInfoProducto(codigo);

    if (cargandoInfo) {
      return (
        <div className="hint-programar" style={{ color: '#64748b', opacity: 0.5 }}>
          Cargando...
        </div>
      );
    }

    if (info.procesos && info.procesos.length > 0) {
      return (
        <div className="procesos-info-mini">
          <div className="lista-procesos-tags-mini">
            {info.procesos.slice(0, 4).map((p, idx) => {
              const abrev = abreviarProceso(p.descripcion || p);
              return (
                <div key={idx} className="proceso-item-mini">
                  <span className="paso-desc-mini">{abrev}</span>
                </div>
              );
            })}
            {info.procesos.length > 4 && (
              <span className="procesos-mas-mini">+{info.procesos.length - 4}</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="poder-cubriente-display">
        <span className="poder-cubriente-numero">{info.poderCubriente}</span>
        <span className="poder-cubriente-etiqueta">Cub:</span>
      </div>
    );
  };

  // Función para calcular aumento de días de alcance
  const calcularAumentoDias = (datosCarga, planificadorData) => {
    if (!datosCarga || datosCarga.tipo !== 'ocupado') return null;

    try {
      const totalPz = datosCarga.total || 0;
      const salidasMensuales = planificadorData?.salidas || 0;
      const existenciaActual = planificadorData?.existencia || 0;
      const alcanceActual = planificadorData?.alcance || 0;

      const factorC2 = 24;
      let diasAdicionales = 0;

      if (salidasMensuales > 0 && totalPz > 0) {
        diasAdicionales = (totalPz / salidasMensuales) * factorC2;
      }

      let nuevoAlcance = alcanceActual + diasAdicionales;
      let nuevoInventario = existenciaActual + totalPz;

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

  // Renderizar el detalle de la programación
  const renderInfoCargaDetalle = () => {
    if (!infoCarga) return null;

    const calculoDias = calcularAumentoDias(infoCarga, datosPlanificador);
    const info = getInfoProducto(infoCarga.codigo);
    const tieneProcesos = info.procesos && info.procesos.length > 0;

    // Separar los folios para mostrarlos individualmente
    const foliosString = infoCarga.folios || infoCarga.folio || 'N/A';
    const foliosArray = foliosString.split(',').map(f => f.trim());

    return (
      <div className={`emergente-info-card ${infoCarga.tipo}`}>
        <div className="emergente-header">
          <h3>
            {infoCarga.tipo === 'ocupado' ? (
              tieneProcesos ? '🎨 ESMALTE' : '📊 VINÍLICA'
            ) : (
              '✅ DISPONIBLE'
            )}
          </h3>
          <button className="close-mini-btn" onClick={() => {
            setInfoCarga(null);
            setDatosFolios({});
          }}>&times;</button>
        </div>
        <div className="emergente-body">
          {infoCarga.tipo === 'ocupado' ? (
            <>
              <p className="emergente-titulo-prod">
                {infoCarga.nombreEnvasado.toUpperCase()} {info.descripcion && (
                  <span className="emergente-descripcion-prod">
                    {info.descripcion}
                  </span>
                )}
              </p>

              {tieneProcesos && (
                <div className="procesos-info-detalle">
                  <strong>Ruta:</strong>
                  <div className="lista-procesos-detalle">
                    {info.procesos.map((p, idx) => (
                      <div key={idx} className="proceso-item-detalle">
                        <span className="paso-nro-detalle">{p.paso || idx + 1}</span>
                        <span className="paso-desc-detalle">{abreviarProceso(p.descripcion || p)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="emergente-dato">
                <span>Lotes:</span>
                <strong>{infoCarga.conteoLotes || 1}</strong>
              </div>

              <div className="emergente-dato">
                <span>Cantidad Total:</span>
                <strong>{infoCarga.total} uds</strong>
              </div>

              {/* FOLIOS SEPARADOS - CADA UNO CLICKEABLE */}
              <div className="emergente-dato">
                <span>Folio(s):</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {foliosArray.map((folio, index) => {
                    const datosFolio = datosFolios[folio];
                    const cantidadFolio = datosFolio?.cantidad || 0;
                    const cargando = cargandoFolio && datosFolio === null;
                    
                    return (
                      <strong
                        key={index}
                        className="folio-clickeable"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAbrirDetalleConFolio(infoCarga, folio);
                        }}
                        title={`Haz clic para ver detalles del folio ${folio} (${cantidadFolio || 'cargando...'} uds)`}
                        style={{
                          cursor: 'pointer',
                          padding: '2px 10px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          borderRadius: '12px',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          fontSize: '13px',
                          transition: 'all 0.2s',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(59, 130, 246, 0.3)';
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(59, 130, 246, 0.15)';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        {folio}
                        {cargando ? (
                          <span style={{ fontSize: '10px', color: '#fcd34d' }}>⏳</span>
                        ) : cantidadFolio > 0 ? (
                          <span style={{ 
                            fontSize: '10px', 
                            color: '#94a3b8',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '0 4px',
                            borderRadius: '8px'
                          }}>
                            {cantidadFolio}
                          </span>
                        ) : null}
                      </strong>
                    );
                  })}
                </div>
              </div>

              <div className="emergente-dato">
                <span>Operario(s):</span>
                <strong>{infoCarga.operarios}</strong>
              </div>

              <div className="emergente-dato">
                <span>Poder cubriente:</span>
                <strong>{info.poderCubriente}</strong>
              </div>

              {calculoDias && calculoDias.totalPz > 0 && (
                <div className="emergente-calculo-dias">
                  <div className="calculo-grid">
                    <div className="calculo-item">
                      <span className="calculo-label">Piezas Prog.</span>
                      <span className="calculo-valor">{calculoDias.totalPz}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Salidas Mens.</span>
                      <span className="calculo-valor">{calculoDias.salidasMensuales}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Existencia</span>
                      <span className="calculo-valor">{calculoDias.existenciaActual}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Nuevo Inv.</span>
                      <span className="calculo-valor highlight-verde">{calculoDias.nuevoInventario}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Días Adic.</span>
                      <span className="calculo-valor highlight-verde">+{calculoDias.diasAdicionales}</span>
                    </div>

                    <div className="calculo-item">
                      <span className="calculo-label">Alcance</span>
                      <span className="calculo-valor">{calculoDias.alcanceActual} días</span>
                    </div>

                    <div className="calculo-item calculo-item-destacado" style={{ gridColumn: '1 / -1', background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.15)' }}>
                      <span className="calculo-label">Días Estimados</span>
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
        <button className="btn-emergente-cerrar" onClick={() => {
          setInfoCarga(null);
          setDatosFolios({});
        }}>ENTENDIDO</button>
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
      return (
        <div key={idx} className="bloque-grupo-codigo">
          <div className="columna-codigo-unificada" onClick={() => { onSelectCode(grupo.codigo); onClose(); }}>
            <span className="codigo-resaltado-grande">{grupo.codigo}</span>
            {renderInfoProducto(grupo.codigo)}
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

        {/* Modal de detalle de carga */}
        {modalDetalleVisible && (
          <ModalDetalleCarga
            visible={modalDetalleVisible}
            carga={cargaSeleccionada}
            onClose={() => {
              setModalDetalleVisible(false);
              setCargaSeleccionada(null);
            }}
            onEliminar={(carga) => {
              console.log('Eliminar carga:', carga);
              setModalDetalleVisible(false);
            }}
            onMoverEspecial={(carga) => {
              console.log('Mover a especial:', carga);
              setModalDetalleVisible(false);
            }}
            onCambiarOperario={(id, operario) => {
              console.log('Cambiar operario:', id, operario);
            }}
          />
        )}

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
                  🔍 Revisar
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