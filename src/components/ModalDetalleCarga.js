import React, { useState, useEffect } from 'react';
import '../styles/modalDetalle.css'; 

const ModalDetalleCarga = ({ 
  visible, 
  carga, 
  onClose, 
  onEliminar, 
  onMoverEspecial,
  onCambiarOperario 
}) => {
  // Estado para operarios de esmaltes dinámicos
  const [operariosEsmalte, setOperariosEsmalte] = useState([]);
  const [cargandoOperarios, setCargandoOperarios] = useState(false);

  // ============================================================
  // 🔴 FUNCIÓN PARA GENERAR COMBINACIONES DESDE LOS DATOS DE BD
  // ============================================================
  const generarCombinaciones = (operarios) => {
    if (!operarios || operarios.length === 0) {
      console.warn('⚠️ No hay operarios para generar combinaciones');
      return [];
    }

    // Filtrar solo operarios de esmaltes
    const esmaltes = operarios.filter(op => op.area === 'esmaltes');
    
    if (esmaltes.length === 0) {
      console.warn('⚠️ No hay operarios de esmaltes');
      return [];
    }

    // Obtener nombres por puesto desde los datos de la BD
    const preparadores = esmaltes
      .filter(op => op.puesto?.toLowerCase() === 'preparador')
      .map(op => op.nombre);
    
    const molienda = esmaltes
      .filter(op => op.puesto?.toLowerCase() === 'molienda')
      .map(op => op.nombre);
    
    const terminados = esmaltes
      .filter(op => 
        op.puesto?.toLowerCase() === 'terminado' ||
        op.puesto?.toLowerCase() === 'igualador' ||
        op.puesto?.toLowerCase() === 'mezclador'
      )
      .map(op => op.nombre);

    console.log('📊 ModalDetalleCarga - Nombres por puesto (DESDE BD):');
    console.log('  Preparadores:', preparadores);
    console.log('  Molienda:', molienda);
    console.log('  Terminados:', terminados);

    const combinaciones = [];
    
    // 1. Operadores individuales
    const individuales = [...preparadores, ...molienda, ...terminados];
    if (individuales.length > 0) {
      combinaciones.push(...individuales);
    }
    
    // 2. Combinaciones de 2: Preparador + Terminado
    if (preparadores.length > 0 && terminados.length > 0) {
      preparadores.forEach(p => {
        terminados.forEach(t => {
          if (p !== t) {
            combinaciones.push(`${p} / ${t}`);
          }
        });
      });
    }
    
    // 3. Combinaciones de 2: Molienda + Terminado
    if (molienda.length > 0 && terminados.length > 0) {
      molienda.forEach(m => {
        terminados.forEach(t => {
          if (m !== t) {
            combinaciones.push(`${m} / ${t}`);
          }
        });
      });
    }
    
    // 4. Combinaciones de 2: Preparador + Molienda
    if (preparadores.length > 0 && molienda.length > 0) {
      preparadores.forEach(p => {
        molienda.forEach(m => {
          if (p !== m) {
            combinaciones.push(`${p} / ${m}`);
          }
        });
      });
    }
    
    // 5. Combinaciones de 3
    if (preparadores.length > 0 && molienda.length > 0 && terminados.length > 0) {
      preparadores.forEach(p => {
        molienda.forEach(m => {
          terminados.forEach(t => {
            if (p !== m && m !== t && p !== t) {
              combinaciones.push(`${p} / ${m} / ${t}`);
            }
          });
        });
      });
    }

    const combinacionesUnicas = [...new Set(combinaciones)];
    console.log('✅ Combinaciones generadas:', combinacionesUnicas);
    return combinacionesUnicas;
  };

  // ============================================================
  // 🔴 CARGAR OPERARIOS DIRECTAMENTE DESDE LA API
  // ============================================================
  const cargarOperariosEsmalte = async () => {
    setCargandoOperarios(true);
    try {
      console.log('🔄 ModalDetalleCarga: Cargando operarios desde API...');
      
      let esmaltes = [];
      
      // 1. Intentar con el endpoint específico
      try {
        const response = await fetch('http://localhost:8080/api/operarios/esmaltes');
        if (response.ok) {
          esmaltes = await response.json();
          console.log('📦 ModalDetalleCarga: Operarios desde /esmaltes:', esmaltes);
        }
      } catch (error) {
        console.warn('⚠️ ModalDetalleCarga: Error en /esmaltes', error);
      }
      
      // 2. Si no funcionó, intentar con el endpoint general
      if (!esmaltes || esmaltes.length === 0) {
        console.log('📦 ModalDetalleCarga: Intentando con /operarios...');
        try {
          const response = await fetch('http://localhost:8080/api/operarios');
          if (response.ok) {
            const todos = await response.json();
            esmaltes = todos.filter(op => op.area === 'esmaltes');
            console.log('📦 ModalDetalleCarga: Operarios desde /operarios:', esmaltes);
          }
        } catch (error) {
          console.warn('⚠️ ModalDetalleCarga: Error en /operarios', error);
        }
      }
      
      // 3. Generar combinaciones si hay datos
      if (esmaltes && esmaltes.length > 0) {
        const combinaciones = generarCombinaciones(esmaltes);
        
        if (combinaciones.length > 0) {
          setOperariosEsmalte(combinaciones);
          console.log('✅ ModalDetalleCarga: Combinaciones generadas:', combinaciones);
        } else {
          // Si no hay combinaciones, mostrar nombres individuales
          const nombres = esmaltes.map(op => op.nombre);
          setOperariosEsmalte(nombres);
          console.log('✅ ModalDetalleCarga: Usando nombres individuales:', nombres);
        }
      } else {
        // 🔴 SIN FALLBACK - mostrar mensaje
        console.warn('⚠️ ModalDetalleCarga: No se encontraron operarios en la BD');
        setOperariosEsmalte([]);
      }
      
    } catch (error) {
      console.error('❌ ModalDetalleCarga: Error cargando operarios:', error);
      setOperariosEsmalte([]);
    } finally {
      setCargandoOperarios(false);
    }
  };

  // ============================================================
  // CARGAR OPERARIOS CADA VEZ QUE EL MODAL SE ABRE
  // ============================================================
  useEffect(() => {
    if (visible) {
      cargarOperariosEsmalte();
    }
  }, [visible]);

  // ============================================================
  // ESCUCHAR EVENTOS DE ACTUALIZACIÓN DE OPERARIOS
  // ============================================================
  useEffect(() => {
    const handleOperariosUpdated = () => {
      console.log('🔄 ModalDetalleCarga: Evento de actualización recibido');
      if (visible) {
        cargarOperariosEsmalte();
      }
    };

    window.addEventListener('operariosEsmaltesUpdated', handleOperariosUpdated);
    window.addEventListener('operariosEsmaltesActualizados', handleOperariosUpdated);
    
    return () => {
      window.removeEventListener('operariosEsmaltesUpdated', handleOperariosUpdated);
      window.removeEventListener('operariosEsmaltesActualizados', handleOperariosUpdated);
    };
  }, [visible]);

  // ============================================================
  // RENDER
  // ============================================================
  if (!visible || !carga) return null;

  const esEsmalte = carga.tipo === 'Esmalte';

  const getNombreFormato = (formato) => {
    const formatos = {
      0.25: 'Cuarto de litro (1/4 L)',
      0.5: 'Medio litro (1/2 L)',
      0.75: 'Tres cuartos (3/4 L)',
      1: 'Un litro (1 L)',
      4: 'Cuatro litros (4 L)',
      19: 'Diecinueve litros (19 L)'
    };
    return formatos[formato] || `${formato} Litros`;
  };

  const calcularLitrosTotales = () => {
    if (carga.detallesEnvasado && carga.detallesEnvasado.length > 0) {
      return carga.detallesEnvasado.reduce((total, item) => {
        return total + (item.formato * item.cantidad);
      }, 0);
    }
    return carga.litros || 0;
  };

  const litrosTotales = calcularLitrosTotales();
  const operarioActual = carga.operario || (operariosEsmalte.length > 0 ? operariosEsmalte[0] : '');

  return (
    <div className="detalle-modal-overlay" onClick={onClose}>
      <div className="detalle-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="detalle-modal-header">
          <h2>Detalle de Carga</h2>
          <span style={{color: '#aaa', fontSize: '12px'}}>Vista de gestión</span>
        </div>
        
        <div className="detalle-modal-body">
          <div className="info-group-row">
            <div className="info-group half">
              <label>📄 Folio de Orden</label>
              <div className="data folio">{carga.folio}</div>
            </div>
            
            <div className="info-group half">
              <label>Nivel cubriente</label>
              <div className="data">{carga.nivelCubriente}</div>
            </div>
          </div>

          <div className="info-group-row">
            <div className="info-group half">
              <label>🔢 Código Producto</label>
              <div className="data codigo">{carga.codigoProducto}</div>
            </div>
            
            <div className="info-group half">
              <label>👤 Operario Asignado</label>
              {esEsmalte ? (
                <select 
                  value={operarioActual} 
                  onChange={(e) => {
                    console.log('🔄 Cambiando operario a:', e.target.value);
                    onCambiarOperario(carga.idTemp, e.target.value);
                  }}
                  className="select-operario-detalle"
                  disabled={cargandoOperarios}
                >
                  {cargandoOperarios ? (
                    <option value="">Cargando operarios...</option>
                  ) : operariosEsmalte.length > 0 ? (
                    operariosEsmalte.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))
                  ) : (
                    <option value="">No hay operarios disponibles</option>
                  )}
                </select>
              ) : (
                <div className="data operario">{carga.operario || 'Sin asignar'}</div>
              )}
            </div>
          </div>

          <div className="info-group">
            <label>📝 Descripción Completa</label>
            <div className="data">{carga.descripcion}</div>
          </div>

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
                          <span className="subtotal">→ {(item.formato * item.cantidad).toFixed(2)} L</span>
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