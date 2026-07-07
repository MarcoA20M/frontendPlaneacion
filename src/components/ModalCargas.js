import React, { useState, useMemo, useEffect } from "react";
import "../styles/modalCargas.css";
import { reporteModalService } from "../services/reporteModalService";

// Clave para localStorage
const STORAGE_KEY = 'cargas_almacenadas';

function ModalCargas({
  visible,
  cargas,
  producto,
  onClose,
  onGuardar,
  onEliminarCarga,
  onSeleccionarCarga,
  onVaciarTodo,
  onGenerarLotes
}) {
  const [filtroMarca, setFiltroMarca] = useState("TODOS");
  const [familias, setFamilias] = useState([]);
  const [cargasLocales, setCargasLocales] = useState(() => {
    // Inicializar desde localStorage inmediatamente
    try {
      const datosGuardados = localStorage.getItem(STORAGE_KEY);
      if (datosGuardados) {
        const parsed = JSON.parse(datosGuardados);
        console.log('Cargando datos de localStorage en ModalCargas:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('Error al cargar datos del localStorage:', error);
    }
    return [];
  });
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [cargaAEliminar, setCargaAEliminar] = useState(null);

  // Guardar en localStorage cuando cambien las cargas locales
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cargasLocales));
      console.log('Datos guardados en localStorage desde ModalCargas:', cargasLocales.length);
    } catch (error) {
      console.error('Error al guardar en localStorage:', error);
    }
  }, [cargasLocales]);

  // Sincronizar cargas externas (cuando se agregan desde fuera)
  useEffect(() => {
    if (cargas && cargas.length > 0) {
      console.log('Recibiendo nuevas cargas en ModalCargas:', cargas.length);
      setCargasLocales(prev => {
        // Evitar duplicados por idTemp
        const nuevasCargas = cargas.filter(c => 
          !prev.some(p => p.idTemp === c.idTemp)
        );
        if (nuevasCargas.length > 0) {
          console.log('Añadiendo nuevas cargas al localStorage:', nuevasCargas.length);
          return [...prev, ...nuevasCargas];
        }
        return prev;
      });
    }
  }, [cargas]);

  // Cargar familias desde el backend
  useEffect(() => {
    const cargarFamilias = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/familias');
        if (response.ok) {
          const data = await response.json();
          setFamilias(data);
        }
      } catch (error) {
        console.error('Error al cargar familias:', error);
      }
    };
    
    if (visible) {
      cargarFamilias();
    }
  }, [visible]);

  // Función para normalizar texto (quitar acentos, mayúsculas)
  const normalizarTexto = (texto) => {
    if (!texto) return "";
    return texto
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Palabras clave por familia para mejorar coincidencias
  const palabrasClavePorFamilia = {
    "PINTURA SEÑALAMIENTO": ["TRAFICO", "TRÁFICO", "SEÑALAMIENTO"],
    "BARNIZ SPAR": ["BARNIZ", "SPAR", "BARNI-SPAR"],
    "ESMALUX": ["ESMALUX"],
    "TRANSIKAR": ["TRANSIKAR"],
    "TRANSITEX": ["TRANSITEX"],
    "ESMAFLEX": ["ESMAFLEX"],
    "PINTAMAR": ["PINTAMAR"],
    "DRYLUX": ["DRYLUX"],
    "ACAPULCO": ["ACAPULCO"],
    "SUPERVIN": ["SUPERVIN"],
    "VINET": ["VINET"],
    "CH14": ["CH14"],
    "CLASIKA": ["CLASIKA"],
    "OMAR": ["OMAR"],
    "KOLORTEX": ["KOLORTEX"],
    "AQUAMAR": ["AQUAMAR"],
    "SELLADOR ENTINTABLE": ["SELLADOR ENTINTABLE", "SELLADOR"],
    "SELLAVIN": ["SELLAVIN"]
  };

  // Función mejorada para encontrar la familia
  const encontrarFamilia = (codigoProducto, descripcion) => {
    const codigoUpper = normalizarTexto(codigoProducto);
    const descripcionUpper = normalizarTexto(descripcion);
    const textoCompleto = `${descripcionUpper} ${codigoUpper}`;
    
    // 1. Verificar si es BASE
    if (codigoUpper.includes("BBE") || codigoUpper.includes("BAL") || 
        codigoUpper.includes("BNE") || codigoUpper.includes("BSP")) {
      return "BASES";
    }
    
    // 2. Buscar por palabras clave
    for (const familia of familias) {
      const nombreFamilia = normalizarTexto(familia.nombre);
      
      // Coincidencia exacta por nombre
      if (textoCompleto.includes(nombreFamilia)) {
        return familia.nombre;
      }
      
      // Coincidencia por palabras clave
      const palabrasClave = palabrasClavePorFamilia[familia.nombre] || [];
      for (const palabra of palabrasClave) {
        if (textoCompleto.includes(normalizarTexto(palabra))) {
          return familia.nombre;
        }
      }
    }
    
    // 3. Búsqueda por coincidencia parcial (último recurso)
    for (const familia of familias) {
      const nombreFamilia = normalizarTexto(familia.nombre);
      const palabrasFamilia = nombreFamilia.split(" ");
      
      for (const palabra of palabrasFamilia) {
        if (palabra.length > 3 && textoCompleto.includes(palabra)) {
          return familia.nombre;
        }
      }
    }
    
    return "OTRAS";
  };

  // 1. Clasificación por marcas usando la tabla familias
  const { cargasClasificadas, marcasDisponibles } = useMemo(() => {
    if (!cargasLocales || cargasLocales.length === 0) return { cargasClasificadas: [], marcasDisponibles: [] };

    const procesadas = cargasLocales.map(c => {
      const marca = encontrarFamilia(c.codigoProducto, c.descripcion);
      return { ...c, marcaComercial: marca };
    });

    // Mantener orden por cubriente
    procesadas.sort((a, b) => (a.nivelCubriente || 0) - (b.nivelCubriente || 0));

    const marcasMap = {};
    procesadas.forEach(c => {
      const m = c.marcaComercial;
      if (!marcasMap[m]) marcasMap[m] = { nombre: m, count: 0 };
      marcasMap[m].count += 1;
    });

    return { cargasClasificadas: procesadas, marcasDisponibles: Object.values(marcasMap) };
  }, [cargasLocales, familias]);

  const cargasVisibles = useMemo(() => {
    return filtroMarca === "TODOS"
      ? cargasClasificadas
      : cargasClasificadas.filter(c => c.marcaComercial === filtroMarca);
  }, [filtroMarca, cargasClasificadas]);

  const hayPendientes = useMemo(() =>
    cargasClasificadas.some(c => c.folio === "PENDIENTE"),
    [cargasClasificadas]
  );

  // Función para eliminar con advertencia
  const handleEliminarConAdvertencia = (idTemp) => {
    const carga = cargasLocales.find(c => c.idTemp === idTemp);
    setCargaAEliminar(carga);
    setMostrarAdvertencia(true);
    setAccionPendiente({ tipo: 'eliminar', id: idTemp });
  };

  // Función para vaciar todo con advertencia
  const handleVaciarTodoConAdvertencia = () => {
    if (cargasLocales.length === 0) return;
    setMostrarAdvertencia(true);
    setAccionPendiente({ tipo: 'vaciar' });
  };

  // Confirmar acción después de advertencia
  const confirmarAccion = () => {
    if (accionPendiente?.tipo === 'eliminar') {
      // Eliminar carga específica
      const nuevaLista = cargasLocales.filter(c => c.idTemp !== accionPendiente.id);
      setCargasLocales(nuevaLista);
      // Llamar al callback original si existe
      if (onEliminarCarga) {
        onEliminarCarga(accionPendiente.id);
      }
    } else if (accionPendiente?.tipo === 'vaciar') {
      // Vaciar todo
      setCargasLocales([]);
      // Eliminar del localStorage
      localStorage.removeItem(STORAGE_KEY);
      // Llamar al callback original si existe
      if (onVaciarTodo) {
        onVaciarTodo();
      }
    }
    cerrarAdvertencia();
  };

  const cerrarAdvertencia = () => {
    setMostrarAdvertencia(false);
    setAccionPendiente(null);
    setCargaAEliminar(null);
  };

  const handleDescarga = (formato) => {
    if (cargasVisibles.length === 0) return;
    reporteModalService.generarReporte(cargasVisibles, formato, filtroMarca);
  };

  if (!visible) return null;

  const totalLitros = cargasClasificadas.reduce((t, c) => t + c.litros, 0);

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-cargas">
          <div className="modal-header">
            <div className="titulo-con-contador">
              <h2>Gestión de Cargas</h2>
              <span className="badge-contador">{cargasClasificadas.length} en espera</span>
            </div>

            <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={onGenerarLotes}
                disabled={!hayPendientes || cargasClasificadas.length === 0}
                style={{
                  backgroundColor: hayPendientes ? '#f39c12' : '#7f8c8d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '5px',
                  cursor: hayPendientes ? 'pointer' : 'default',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
              >
                🔢 Asignar Lotes
              </button>

              <button
                onClick={() => handleDescarga('pdf')}
                style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                📄 PDF
              </button>

              <button
                className="btn-borrar-todo"
                onClick={handleVaciarTodoConAdvertencia}
                style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                🗑️ Borrar Todo
              </button>

              <button
                className="btn-guardar-top"
                disabled={cargasClasificadas.length === 0 || hayPendientes}
                title={hayPendientes ? "Asigna los lotes antes de guardar" : "Guardar en programación"}
                onClick={() => { 
                  onGuardar(cargasClasificadas); 
                  // Limpiar localStorage después de guardar
                  localStorage.removeItem(STORAGE_KEY);
                  setCargasLocales([]);
                  onClose(); 
                }}
                style={{
                  opacity: (cargasClasificadas.length === 0 || hayPendientes) ? 0.5 : 1,
                  cursor: (cargasClasificadas.length === 0 || hayPendientes) ? 'not-allowed' : 'pointer'
                }}
              >
                Guardar Producción
              </button>
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>
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

          <div className="contenedor-marcas-grid">
            <div
              className={`marca-card ${filtroMarca === "TODOS" ? "activa" : ""}`}
              onClick={() => setFiltroMarca("TODOS")}
            >
              <div className="card-icon">🎨</div>
              <h3>TODAS</h3>
              <span>{cargasClasificadas.length} Lotes</span>
            </div>

            {marcasDisponibles.map((m) => (
              <div
                key={m.nombre}
                className={`marca-card ${filtroMarca === m.nombre ? "activa" : ""}`}
                onClick={() => setFiltroMarca(m.nombre)}
              >
                <div className="card-icon">📦</div>
                <h3>{m.nombre}</h3>
                <span>{m.count} {m.count === 1 ? 'Lote' : 'Lotes'}</span>
              </div>
            ))}
          </div>

          <div className="tabla-seccion">
            <h3 className="titulo-tabla">
              {filtroMarca === "TODOS" ? "Listado General (Ordenado por Cubriente)" : `Filtrado por: ${filtroMarca}`}
              <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '10px', color: '#888' }}>
                (Almacenadas en localStorage)
              </span>
            </h3>

            <div className="fila-carga header">
              <div className="celda nro">#</div>
              <div className="celda g-2">Código</div>
              <div className="celda g-2">Tipo</div>
              <div className="celda g-2">Lote</div>
              <div className="celda g-1">Litros</div>
              <div className="celda g-1">Cubr.</div>
              <div className="celda accion"></div>
            </div>

            <div className="contenedor-scroll-tabla">
              {cargasVisibles.length > 0 ? (
                <div className="tabla-cargas">
                  {cargasVisibles.map((c, i) => (
                    <div
                      className="fila-carga clickable-row"
                      key={c.idTemp || i}
                      onClick={() => onSeleccionarCarga(c)}
                    >
                      <div className="celda nro">{i + 1}</div>
                      <div className="celda g-2">{c.codigoProducto}</div>
                      <div className="celda g-2">{c.tipo || "N/A"}</div>
                      <div
                        className="celda g-2"
                        style={{
                          fontWeight: 'bold',
                          color: c.folio === "PENDIENTE" ? "#e67e22" : "#2ecc71"
                        }}
                      >
                        {c.folio}
                      </div>
                      <div className="celda g-1">{c.litros.toFixed(1)}</div>
                      <div className="celda g-1">{c.nivelCubriente}</div>
                      <div className="celda accion">
                        <button
                          className="btn-borrar-fila"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarConAdvertencia(c.idTemp);
                          }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sin-cargas">No hay cargas en espera.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Advertencia */}
      {mostrarAdvertencia && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-advertencia" style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            maxWidth: '500px',
            width: '90%',
            margin: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            position: 'relative',
            top: '50%',
            transform: 'translateY(-50%)'
          }}>
            <h3 style={{ color: '#e74c3c', marginBottom: '15px' }}>
              ⚠️ Confirmar Eliminación
            </h3>
            {cargaAEliminar && (
              <div style={{ 
                background: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '5px',
                marginBottom: '15px',
                fontSize: '14px'
              }}>
                <strong>Código:</strong> {cargaAEliminar.codigoProducto}<br/>
                <strong>Descripción:</strong> {cargaAEliminar.descripcion || 'Sin descripción'}<br/>
                <strong>Litros:</strong> {cargaAEliminar.litros?.toFixed(1) || '0'}
              </div>
            )}
            <p style={{ marginBottom: '20px', fontSize: '16px' }}>
              {accionPendiente?.tipo === 'eliminar' 
                ? '¿Estás seguro de que deseas eliminar esta carga? Esta acción no se puede deshacer.'
                : '¿Estás seguro de que deseas eliminar TODAS las cargas almacenadas? Esta acción no se puede deshacer.'
              }
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cerrarAdvertencia}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAccion}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ModalCargas;