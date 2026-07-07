import React, { useState, useMemo, useEffect } from "react";
import "../styles/modalCargas.css";
import { reporteModalService } from "../services/reporteModalService";

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
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState(null);
  const [cargaAEliminar, setCargaAEliminar] = useState(null);

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
    if (!cargas) return { cargasClasificadas: [], marcasDisponibles: [] };

    const procesadas = cargas.map(c => {
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
  }, [cargas, familias]);

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
    const carga = cargas.find(c => c.idTemp === idTemp);
    setCargaAEliminar(carga);
    setMostrarAdvertencia(true);
    setAccionPendiente({ tipo: 'eliminar', id: idTemp });
  };

  // Función para vaciar todo con advertencia
  const handleVaciarTodoConAdvertencia = () => {
    if (cargas.length === 0) return;
    setCargaAEliminar(null);
    setMostrarAdvertencia(true);
    setAccionPendiente({ tipo: 'vaciar' });
  };

  // Confirmar acción después de advertencia
  const confirmarAccion = () => {
    if (accionPendiente?.tipo === 'eliminar') {
      // Eliminar carga específica
      onEliminarCarga(accionPendiente.id);
    } else if (accionPendiente?.tipo === 'vaciar') {
      // Vaciar todo
      onVaciarTodo();
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
                className="btn-asignar-lotes"
                onClick={onGenerarLotes}
                disabled={!hayPendientes || cargasClasificadas.length === 0}
              >
                <span className="icono">🔢</span> Asignar Lotes
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
                onClick={() => { onGuardar(cargasClasificadas); onClose(); }}
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
                <div className="sin-cargas">No hay datos para esta familia.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Advertencia - Estilo Críticos */}
      {mostrarAdvertencia && (
        <div className="modal-advertencia-overlay" onClick={cerrarAdvertencia}>
          <div className="modal-advertencia" onClick={(e) => e.stopPropagation()}>
            {/* Ícono de advertencia con pulso */}
            <div className="icono-advertencia icono-pulso">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#e879f9" strokeWidth="2" strokeOpacity="0.8"/>
                <path d="M12 8V12" stroke="#e879f9" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1.5" fill="#e879f9"/>
              </svg>
            </div>

            {/* Título */}
            <h3>⚠️ Confirmar Eliminación</h3>
            
            {/* Subtítulo */}
            <p className="subtitulo">
              Esta acción no se puede deshacer
            </p>

            {/* Información de la carga (si es eliminación individual) */}
            {cargaAEliminar && (
              <div className="carga-info">
                <div className="info-row">
                  <span className="label">Código</span>
                  <span className="value destacado">{cargaAEliminar.codigoProducto || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Descripción</span>
                  <span className="value">{cargaAEliminar.descripcion || 'Sin descripción'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Litros</span>
                  <span className="value">{cargaAEliminar.litros?.toFixed(1) || '0'} L</span>
                </div>
                {cargaAEliminar.folio && (
                  <div className="info-row">
                    <span className="label">Folio</span>
                    <span className="value">{cargaAEliminar.folio}</span>
                  </div>
                )}
              </div>
            )}

            {/* Mensaje */}
            <p className="mensaje">
              {accionPendiente?.tipo === 'eliminar' ? (
                <>
                  ¿Estás seguro de que deseas eliminar <strong>esta carga</strong>?
                  <span className="texto-secundario">Todos los datos asociados se perderán permanentemente.</span>
                </>
              ) : (
                <>
                  ¿Estás seguro de que deseas eliminar <strong>TODAS las cargas</strong>?
                  <span className="texto-secundario">
                    Esta acción eliminará <strong style={{ color: '#e879f9' }}>{cargas.length}</strong> cargas de forma permanente.
                  </span>
                </>
              )}
            </p>

            {/* Botones */}
            <div className="botones">
              <button
                className="btn-cancelar"
                onClick={cerrarAdvertencia}
              >
                Cancelar
              </button>
              <button
                className="btn-eliminar"
                onClick={confirmarAccion}
              >
                {accionPendiente?.tipo === 'eliminar' ? '🗑️ Eliminar Carga' : '🗑️ Eliminar Todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ModalCargas;