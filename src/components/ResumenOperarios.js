import React, { useState, useEffect, useRef } from 'react';

function ResumenOperarios({ 
  rondas, 
  cargasEsmaltes, 
  tipoPintura, 
  fechaTrabajo, 
  getOperarioPorMaquina, 
  onFiltrar, 
  filtroActivo,
  operariosPorMaquina = {},
  operariosEsmaltes = []
}) {
  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [key, setKey] = useState(0);
  const [datosCargados, setDatosCargados] = useState(false);

  const dividirNombres = (nombreCompleto) => {
    if (!nombreCompleto) return ['Sin asignar'];
    const nombreStr = String(nombreCompleto);
    if (!nombreStr.includes('/')) {
      const limpio = nombreStr.trim();
      return limpio ? [limpio] : ['Sin asignar'];
    }
    const partes = nombreStr.split('/').map(n => n.trim()).filter(n => n.length > 0);
    return partes.length > 0 ? partes : ['Sin asignar'];
  };

  const obtenerOperarioDeMaquina = (maquinaId) => {
    if (operariosPorMaquina && operariosPorMaquina[maquinaId]) {
      return operariosPorMaquina[maquinaId];
    }
    return null;
  };

  const obtenerTodosLosOperarios = () => {
    const maquinas = [101, 102, 103, 104, 105, 106, 107, 108];
    const operarios = [];
    const vistos = new Set();
    
    maquinas.forEach(maquinaId => {
      const nombre = obtenerOperarioDeMaquina(maquinaId);
      if (nombre && !vistos.has(nombre)) {
        vistos.add(nombre);
        operarios.push(nombre);
      }
    });
    
    return operarios;
  };

  const cargarDatos = () => {
    console.log('🔄 ResumenOperarios: Cargando datos...', { tipoPintura, operariosEsmaltes: operariosEsmaltes.length });
    
    if (tipoPintura === "Vinílica") {
      if (!operariosPorMaquina || typeof operariosPorMaquina !== 'object' || Object.keys(operariosPorMaquina).length === 0) {
        console.log('⏳ ResumenOperarios: Esperando datos de vinílicas...');
        if (!datosCargados) {
          setCargando(true);
        }
        return;
      }
    }
    
    if (tipoPintura === "Esmalte") {
      if (!operariosEsmaltes || operariosEsmaltes.length === 0) {
        console.log('⏳ ResumenOperarios: Esperando datos de esmaltes...');
        if (!datosCargados) {
          setCargando(true);
        }
        return;
      }
    }

    console.log('✅ ResumenOperarios: Procesando datos...');
    setCargando(true);
    setError(null);
    const data = {};

    try {
      if (tipoPintura === "Vinílica") {
        const todosLosOperarios = obtenerTodosLosOperarios();
        console.log('📊 Operarios Vinílicos en orden:', todosLosOperarios);
        
        if (todosLosOperarios.length === 0) {
          setResumen([]);
          setCargando(false);
          setDatosCargados(true);
          return;
        }
        
        todosLosOperarios.forEach(nombre => {
          data[nombre] = { nombre, total: 0 };
        });
        
        const maquinas = [101, 102, 103, 104, 105, 106, 107, 108];
        
        maquinas.forEach((maquinaId, idx) => {
          const nombreCompleto = obtenerOperarioDeMaquina(maquinaId) || 'Sin asignar';
          const nombres = dividirNombres(nombreCompleto);
          const fila = rondas[idx] || [];
          
          nombres.forEach(nombre => {
            if (!nombre || nombre === 'Sin asignar') return;
            if (!data[nombre]) {
              data[nombre] = { nombre, total: 0 };
            }
            
            fila.forEach(celda => {
              if (celda) {
                data[nombre].total += Array.isArray(celda) ? celda.filter(c => c).length : 1;
              }
            });
          });
        });
        
        const orden = todosLosOperarios;
        let resultado = [];
        
        orden.forEach(nombre => {
          if (data[nombre]) {
            resultado.push(data[nombre]);
          } else {
            resultado.push({ nombre, total: 0 });
          }
        });
        
        console.log('📊 Resumen FINAL Vinílicas:', resultado.map(r => `${r.nombre}: ${r.total}`));
        setResumen(resultado);
        setDatosCargados(true);
        
      } else {
        // ============================================================
        // 🔴 ESMALTES - Usar operarios desde la BD
        // ============================================================
        console.log('📊 Procesando ESMALTES con operarios:', operariosEsmaltes);
        
        operariosEsmaltes.forEach(op => {
          const nombre = op.nombre;
          data[nombre] = { 
            nombre, 
            total: 0,
            puesto: op.puesto
          };
        });
        
        cargasEsmaltes.forEach(carga => {
          const nombreCompleto = carga.operario || '';
          const nombres = dividirNombres(nombreCompleto);
          
          nombres.forEach(nombre => {
            if (!nombre || nombre === 'Sin asignar') return;
            
            if (data[nombre]) {
              data[nombre].total += 1;
            } else {
              if (!data[nombre]) {
                data[nombre] = { nombre, total: 0 };
              }
              data[nombre].total += 1;
            }
          });
        });
        
        const resultado = Object.values(data)
          .sort((a, b) => {
            if (a.total > 0 && b.total > 0) {
              return a.nombre.localeCompare(b.nombre);
            }
            if (a.total > 0) return -1;
            if (b.total > 0) return 1;
            return a.nombre.localeCompare(b.nombre);
          });
        
        console.log('📊 Resumen FINAL Esmaltes:', resultado.map(r => `${r.nombre}: ${r.total}`));
        setResumen(resultado);
        setDatosCargados(true);
      }
      
      setCargando(false);
    } catch (error) {
      console.error('❌ Error:', error);
      setError(error.message);
      setCargando(false);
    }
  };

  // 🔴 Cuando cambian los operarios de vinílicas
  useEffect(() => {
    if (tipoPintura === "Vinílica" && operariosPorMaquina && Object.keys(operariosPorMaquina).length > 0) {
      console.log('🔄 ResumenOperarios: operariosPorMaquina cambió');
      cargarDatos();
    }
  }, [operariosPorMaquina]);

  // 🔴 Cuando cambian los operarios de esmaltes
  useEffect(() => {
    if (tipoPintura === "Esmalte" && operariosEsmaltes && operariosEsmaltes.length > 0) {
      console.log('🔄 ResumenOperarios: operariosEsmaltes cambió, recargando...');
      cargarDatos();
    }
  }, [operariosEsmaltes]);

  // 🔴 Cuando cambia el tipo de pintura
  useEffect(() => {
    console.log('🔄 ResumenOperarios: tipoPintura cambió a', tipoPintura);
    // Forzar recarga con un nuevo key
    setKey(prev => prev + 1);
    if (tipoPintura === "Esmalte" && operariosEsmaltes && operariosEsmaltes.length > 0) {
      cargarDatos();
    } else if (tipoPintura === "Vinílica" && operariosPorMaquina && Object.keys(operariosPorMaquina).length > 0) {
      cargarDatos();
    }
  }, [tipoPintura]);

  // 🔴 Cuando cambian las rondas (vinílicas)
  useEffect(() => {
    if (datosCargados && tipoPintura === "Vinílica") {
      cargarDatos();
    }
  }, [rondas]);

  // 🔴 Cuando cambian las cargas de esmaltes
  useEffect(() => {
    if (datosCargados && tipoPintura === "Esmalte") {
      cargarDatos();
    }
  }, [cargasEsmaltes]);

  // ESCUCHAR EVENTOS
  useEffect(() => {
    const handleRotacionActualizada = (e) => {
      console.log('🔄 ResumenOperarios: Rotación actualizada');
      setKey(prev => prev + 1);
      if (operariosPorMaquina && Object.keys(operariosPorMaquina).length > 0) {
        cargarDatos();
      }
    };

    window.addEventListener('rotacionActualizada', handleRotacionActualizada);
    
    const handleNavegarSemana = (e) => {
      console.log('🔄 ResumenOperarios: Navegación de semana');
      setTimeout(() => {
        if (operariosPorMaquina && Object.keys(operariosPorMaquina).length > 0) {
          cargarDatos();
        }
      }, 100);
    };
    
    window.addEventListener('navegarSemana', handleNavegarSemana);

    return () => {
      window.removeEventListener('rotacionActualizada', handleRotacionActualizada);
      window.removeEventListener('navegarSemana', handleNavegarSemana);
    };
  }, []);

  // Carga inicial
  useEffect(() => {
    if (tipoPintura === "Vinílica" && operariosPorMaquina && Object.keys(operariosPorMaquina).length > 0) {
      cargarDatos();
    }
    if (tipoPintura === "Esmalte" && operariosEsmaltes && operariosEsmaltes.length > 0) {
      cargarDatos();
    }
  }, []);

  if (error) {
    return <div className="resumen-operarios"><span style={{ color: '#ff6b6b' }}>⚠️ Error: {error}</span></div>;
  }

  if (cargando && !datosCargados) {
    return <div className="resumen-operarios"><span>Cargando operarios...</span></div>;
  }

  if (resumen.length === 0 && datosCargados) {
    return <div className="resumen-operarios"><span>No hay operarios</span></div>;
  }

  if (resumen.length === 0) {
    return <div className="resumen-operarios"><span>Cargando operarios...</span></div>;
  }

  return (
    <div className="resumen-operarios" key={key}>
      {resumen.map(op => (
        <button 
          key={op.nombre} 
          className={`card-op ${filtroActivo === op.nombre ? 'active' : ''}`}
          onClick={() => onFiltrar(filtroActivo === op.nombre ? null : op.nombre)}
        >
          <span>{op.nombre}</span>
          <span className="op-total-badge">{op.total}</span>
        </button>
      ))}
      {filtroActivo && (
        <button className="btn-limpiar-filtro" onClick={() => onFiltrar(null)}>
          ✕ Quitar Filtro
        </button>
      )}
    </div>
  );
}

export default ResumenOperarios;