import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useProduccion } from "./hooks/useProduccion";
import { exportarReporte } from "./services/excelService";
import { procesarPdfConRondas } from "./services/pdfService";
import { familiaService } from "./services/familiaService";
import { getOperarioPorMaquina, litrosPorEnvasado, litrosATexto } from "./constants/config";

// Componentes
import BusquedaSeccion from "./components/BusquedaSeccion";
import TableroVinilica from "./components/TableroVinilica";
import ResumenOperarios from "./components/ResumenOperarios";
import ModalCargas from "./components/ModalCargas";
import ModalDetalleCarga from "./components/ModalDetalleCarga";
import TableroEsmaltes from "./components/TableroEsmaltes";
import LoadingOverlay from "./components/LoadingOverlay";
import { VistaProductosFamilia } from "./components/ExploradorFamilias";
import { VistaFamiliasScreen } from "./components/VistaFamiliasScreen";

// Estilos
import "./styles/styles.css";
import "./styles/rondas.css";
import "./styles/esmaltes.css";
import "./styles/familias-screen.css";

function AppContent() {
  const {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
    cargando, totalLitrosActuales,
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
  } = useProduccion();

  const navigate = useNavigate();
  const [fechaTrabajo, setFechaTrabajo] = useState(new Date());
  const [filtroOperario, setFiltroOperario] = useState(null);
  const [modoEsmalte, setModoEsmalte] = useState(null);
  const [mostrarEspeciales, setMostrarEspeciales] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [cargaSeleccionada, setCargaSeleccionada] = useState(null);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [procesandoReporte, setProcesandoReporte] = useState(false);
  const [menuCargasAbierto, setMenuCargasAbierto] = useState(false);
  const [menuReporteAbierto, setMenuReporteAbierto] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [familias, setFamilias] = useState([]);
  const [cargandoFamilias, setCargandoFamilias] = useState(false);

  useEffect(() => {
    const fetchFamilias = async () => {
      setCargandoFamilias(true);
      try {
        const data = await familiaService.getFamiliasPorTipo(tipoPintura);
        setFamilias(data);
      } catch (e) { console.error(e); }
      setCargandoFamilias(false);
    };
    fetchFamilias();
  }, [tipoPintura]);

  const colaFiltrada = useMemo(() => colaCargas.filter(c => c.tipo === tipoPintura), [colaCargas, tipoPintura]);

  // --- STATS DINÁMICAS (CORREGIDAS) ---
  const stats = useMemo(() => {
    // 1. Base: Solo esmaltes
    let baseEsmaltes = cargasEsmaltesAsignadas.filter(c => c.tipo === "Esmalte");

    // 2. Si hay un filtro de operario seleccionado arriba, filtramos la base antes de contar
    if (filtroOperario) {
      baseEsmaltes = baseEsmaltes.filter(c => 
        (c.operario || "").toLowerCase().includes(filtroOperario.toLowerCase())
      );
    }

    // 3. Retornamos los conteos basados en la base (filtrada o no)
    return {
      total: baseEsmaltes.length,
      directos: baseEsmaltes.filter(c => !(c.operario || "").includes('/')).length,
      molienda: baseEsmaltes.filter(c => (c.operario || "").includes('Germán')).length,
      preparado: baseEsmaltes.filter(c => (c.operario || "").includes('Aldo')).length
    };
  }, [cargasEsmaltesAsignadas, filtroOperario]); // Escucha cambios en el filtro de arriba

  const handleMoverAEspecial = (carga) => {
    setColaCargas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
    setRondas(prevRondas => prevRondas.map(f => f.map(celda => {
      if (!celda) return null;
      if (Array.isArray(celda)) {
        const nc = celda.filter(c => c.idTemp !== carga.idTemp);
        return nc.length === 0 ? null : (nc.length === 1 ? nc[0] : nc);
      }
      return celda.idTemp === carga.idTemp ? null : celda;
    })));
    setCargasEsmaltesAsignadas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
    setCargasEspeciales(prev => ordenarCargas([...prev, { ...carga, operario: "Lázaro" }]));
    setMostrarDetalle(false);
  };

  const simularProgreso = () => {
    setProgreso(0);
    return setInterval(() => setProgreso(p => p >= 92 ? p : p + Math.floor(Math.random() * 7) + 2), 250);
  };

  const handleImportExcelConProgreso = async (e) => {
    const idInt = simularProgreso();
    try { await handleImportExcel(e); setProgreso(100); }
    catch (err) { alert(err.message); }
    finally { clearInterval(idInt); setTimeout(() => setProgreso(0), 600); setMenuCargasAbierto(false); }
  };

  const handleReporteDesdeExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcesandoReporte(true);
    const idInt = simularProgreso();
    try {
      const datosExcel = await handleImportExcel(e, true);
      if (!datosExcel || datosExcel.length === 0) {
        alert("El Excel no contiene datos válidos.");
        return;
      }
      const reporteSincronizado = datosExcel.map(item => {
        let maq = "NO ASIGNADA";
        let ope = "PENDIENTE";
        const folioBusqueda = String(item.folio).trim().toUpperCase();
        rondas.forEach((fila, fIdx) => {
          fila.forEach(celda => {
            if (!celda) return;
            const celdas = Array.isArray(celda) ? celda : [celda];
            const match = celdas.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
            if (match) {
              maq = `VI-${101 + fIdx}`;
              ope = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
            }
          });
        });
        const matchEsm = cargasEsmaltesAsignadas.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
        if (matchEsm) { maq = "ESM"; ope = matchEsm.operario; }
        const matchEsp = cargasEspeciales.find(c => String(c.folio).trim().toUpperCase() === folioBusqueda);
        if (matchEsp) { maq = "ESPECIAL"; ope = "LÁZARO"; }
        return { ...item, maquina: maq, operario: ope };
      });
      await exportarReporte(reporteSincronizado);
      setProgreso(100);
    } catch (error) {
      alert("Error al sincronizar reporte");
    } finally {
      clearInterval(idInt);
      setTimeout(() => { setProcesandoReporte(false); setProgreso(0); }, 600);
      setMenuReporteAbierto(false);
      e.target.value = null;
    }
  };

  const handleReporteClick = async () => {
    const finales = [];
    rondas.forEach((fila, fIdx) => {
      const op = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
      fila.forEach(celda => {
        if (!celda) return;
        if (Array.isArray(celda)) celda.forEach(c => finales.push({ ...c, maquina: `VI-${101 + fIdx}`, operario: op }));
        else finales.push({ ...celda, maquina: `VI-${101 + fIdx}`, operario: op });
      });
    });
    cargasEsmaltesAsignadas.forEach(c => finales.push({ ...c, maquina: "ESM", operario: c.operario || "Esmaltador" }));
    cargasEspeciales.filter(c => c.tipo === tipoPintura).forEach(esp => finales.push({ ...esp, maquina: "ESPECIAL", operario: "Lazaro" }));
    if (finales.length === 0) return alert("No hay cargas en el tablero.");
    setProcesandoReporte(true);
    const idInt = simularProgreso();
    try { await exportarReporte(finales); setProgreso(100); }
    catch (err) { alert(err.message); }
    finally { clearInterval(idInt); setTimeout(() => { setProcesandoReporte(false); setProgreso(0); }, 600); setMenuReporteAbierto(false); }
  };

  const handlePdfClick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcesandoPdf(true);
    const idIntervalo = simularProgreso();
    try {
      let tableroAProcesar = tipoPintura === "Vinílica"
        ? rondas.map((fila, fIdx) => fila.map(celda => {
          if (!celda) return null;
          const op = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
          return Array.isArray(celda) ? celda.map(c => ({ ...c, operario: op })) : { ...celda, operario: op };
        }))
        : [cargasEsmaltesAsignadas];
      const blob = await procesarPdfConRondas(file, tableroAProcesar, cargasEspeciales.filter(c => c.tipo === tipoPintura));
      setProgreso(100);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Reporte_${tipoPintura}.pdf`; a.click();
    } catch (error) { alert("Error PDF: " + error.message); }
    finally { clearInterval(idIntervalo); setTimeout(() => { setProcesandoPdf(false); setProgreso(0); }, 600); e.target.value = null; }
  };

  const handleDrop = (e, fDestino, cDestino) => {
    e.preventDefault();
    const dataRaw = e.dataTransfer.getData("transferData");
    if (!dataRaw) return;
    const origen = JSON.parse(dataRaw);
    let nR = [...rondas.map(f => [...f])];
    let nE = [...cargasEspeciales];
    let cargaEntrante;
    if (origen.tipo === 'ronda') {
      const contenido = nR[origen.f][origen.c];
      if (Array.isArray(contenido)) {
        cargaEntrante = { ...contenido[origen.subIndex] };
        contenido.splice(origen.subIndex, 1);
        nR[origen.f][origen.c] = contenido.length === 0 ? null : (contenido.length === 1 ? contenido[0] : contenido);
      } else { cargaEntrante = { ...contenido }; nR[origen.f][origen.c] = null; }
    } else { cargaEntrante = { ...nE[origen.index] }; nE.splice(origen.index, 1); }
    cargaEntrante.operario = getOperarioPorMaquina(101 + fDestino, fechaTrabajo);
    cargaEntrante.maquina = `VI-${101 + fDestino}`;
    const destinoActual = nR[fDestino][cDestino];
    nR[fDestino][cDestino] = destinoActual ? (Array.isArray(destinoActual) ? [...destinoActual, cargaEntrante] : [destinoActual, cargaEntrante]) : cargaEntrante;
    setRondas(nR); setCargasEspeciales(nE);
  };

  return (
    <>
      <LoadingOverlay cargando={cargando} procesandoPdf={procesandoPdf} procesandoReporte={procesandoReporte} progreso={progreso} />
      <Routes>
        <Route path="/" element={
          <div className="app">
            <div className="container">
              <div className="header-panel">
                <div className="titulo-app">
                  <h1>Gestión de Pinturas</h1>
                  {tipoPintura === "Vinílica" && (
                    <div className="planificador-semanal">
                      <button onClick={() => setFechaTrabajo(new Date(fechaTrabajo.setDate(fechaTrabajo.getDate() - 7)))}>◀</button>
                      <div className="fecha-actual-view"><strong>Semana:</strong> {fechaTrabajo.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
                      <button onClick={() => setFechaTrabajo(new Date(fechaTrabajo.setDate(fechaTrabajo.getDate() + 7)))}>▶</button>
                      <button className="btn-hoy-reset" onClick={() => setFechaTrabajo(new Date())}>Hoy</button>
                    </div>
                  )}
                </div>
                <div className="selector-tipo">
                  {["Vinílica", "Esmalte"].map(t => (
                    <button key={t} className={tipoPintura === t ? "active" : ""} onClick={() => { setTipoPintura(t); setFiltroOperario(null); setModoEsmalte(null); }}>{t}</button>
                  ))}
                </div>
              </div>

              <BusquedaSeccion
                codigo={codigo} setCodigo={setCodigo} consultar={consultar} producto={producto}
                cargasEspeciales={cargasEspeciales.filter(c => c.tipo === tipoPintura)}
                mostrarEspeciales={mostrarEspeciales} setMostrarEspeciales={setMostrarEspeciales}
                onSeleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
              />

              <div className="producto-panel">
                {producto && (
                  <>
                    <div className="tabla">
                      {[...producto.envasados].sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id)).map(env => (
                        <div className="fila" key={env.id}>
                          <span className="litros-text">{litrosATexto(litrosPorEnvasado(env.id))}</span>
                          <input type="number" value={cantidades[env.id] || 0} onChange={(e) => setCantidades({ ...cantidades, [env.id]: Number(e.target.value) })} />
                        </div>
                      ))}
                    </div>
                    <div className="contador-litros">Total: <span>{totalLitrosActuales.toFixed(2)} L</span></div>
                  </>
                )}
                <div className="botones-cargas">
                  <button className="agregar-btn" onClick={agregarCargaManual}>+ Agregar Carga</button>
                  <div className="dropdown-container">
                    <button className="agregar-btn secondary" onClick={() => setMenuCargasAbierto(!menuCargasAbierto)}>📂 Gestión ({colaFiltrada.length})</button>
                    {menuCargasAbierto && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item" onClick={() => { setMostrarModal(true); setMenuCargasAbierto(false); }}>📋 Lista Espera</button>
                        <label className="dropdown-item label-input">📊 Importar Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcelConProgreso} /></label>
                      </div>
                    )}
                  </div>
                  <label className="agregar-btn btn-pdf">📄 subrayar PDF <input type="file" hidden accept=".pdf" onChange={handlePdfClick} /></label>

                  <div className="dropdown-container">
                    <button className="agregar-btn btn-reporte" onClick={() => setMenuReporteAbierto(!menuReporteAbierto)}>📊 Generar Reporte</button>
                    {menuReporteAbierto && (
                      <div className="dropdown-menu">
                        <button className="dropdown-item" onClick={handleReporteClick}>🖥️ Reporte Tablero</button>
                        <label className="dropdown-item label-input">📂 Reporte desde Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handleReporteDesdeExcel} /></label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="main-board-section">
                <div className="panel-header-actions">
                  
                  {/* CONTENEDOR DE FILAS (IZQUIERDA) */}
                  <div className="header-left-side" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* FILA 1: Título y Operarios al lado */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <h2 className="tablero-titulo" style={{ margin: 0, whiteSpace: 'nowrap' }}>TABLERO {tipoPintura.toUpperCase()}S</h2>
                      
                      <ResumenOperarios
                        tipoPintura={tipoPintura} 
                        rondas={rondas} 
                        cargasEsmaltes={cargasEsmaltesAsignadas}
                        fechaTrabajo={fechaTrabajo} 
                        getOperarioPorMaquina={getOperarioPorMaquina}
                        onFiltrar={setFiltroOperario} 
                        filtroActivo={filtroOperario}
                      />
                    </div>

                    {/* FILA 2: Modos de Esmalte (Debajo de los nombres) */}
                    {tipoPintura === "Esmalte" && (
                      <div className="resumen-operarios" style={{ display: 'flex', gap: '8px', paddingLeft: '5px' }}>
                        <button className={`card-op ${modoEsmalte === null ? 'active' : ''}`} onClick={() => setModoEsmalte(null)}>
                          <span className="op-nombre">🌍 {filtroOperario ? `Ver ${filtroOperario}` : 'General'}</span>
                          <span className="op-maquina">({stats.total})</span>
                        </button>

                        <button className={`card-op ${modoEsmalte === 'DIRECTO' ? 'active' : ''}`} onClick={() => setModoEsmalte('DIRECTO')}>
                          <span className="op-nombre">🚀 Directos</span>
                          <span className="op-maquina">({stats.directos})</span>
                        </button>

                        <button className={`card-op ${modoEsmalte === 'MOLIENDA' ? 'active' : ''}`} onClick={() => setModoEsmalte('MOLIENDA')}>
                          <span className="op-nombre">⚙️ Molienda</span>
                          <span className="op-maquina">({stats.molienda})</span>
                        </button>

                        <button className={`card-op ${modoEsmalte === 'PREPARADO' ? 'active' : ''}`} onClick={() => setModoEsmalte('PREPARADO')}>
                          <span className="op-nombre">🧪 Preparado</span>
                          <span className="op-maquina">({stats.preparado})</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BOTÓN FAMILIAS (DERECHA) */}
                  <button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ FAMILIAS</button>
                </div>

                {tipoPintura === "Vinílica" ? (
                  <TableroVinilica rondas={rondas} fechaTrabajo={fechaTrabajo} handleDrop={handleDrop} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} filtroOperario={filtroOperario} />
                ) : (
                  <TableroEsmaltes cargas={cargasEsmaltesAsignadas} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} filtroOperario={filtroOperario} modoEsmalte={modoEsmalte} />
                )}
              </div>
            </div>
          </div>
        } />
        <Route path="/familias" element={<div className="familias-full-screen"><VistaFamiliasScreen familias={familias} cargando={cargandoFamilias} tipoPintura={tipoPintura} /></div>} />
        <Route path="/familia/:idFamilia" element={
          <div className="familias-full-screen">
            <div className="header-info"><button className="btn-back" onClick={() => navigate("/familias")}>← Volver</button></div>
            <VistaProductosFamilia setCodigo={setCodigo} consultar={() => { consultar(); navigate("/"); }} />
          </div>
        } />
      </Routes>

      <ModalCargas
        visible={mostrarModal} cargas={colaFiltrada} onClose={() => setMostrarModal(false)}
        onEliminarCarga={(id) => setColaCargas(prev => prev.filter(c => c.idTemp !== id))}
        onVaciarTodo={() => { if (window.confirm("¿Vaciar cola?")) setColaCargas(prev => prev.filter(c => c.tipo !== tipoPintura)); }}
        onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }}
        onSeleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
      />

      <ModalDetalleCarga
        visible={mostrarDetalle} carga={cargaSeleccionada} onClose={() => setMostrarDetalle(false)}
        onEliminar={(carga) => {
          setColaCargas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
          setRondas(prevRondas => prevRondas.map(f => f.map(celda => {
            if (!celda) return null;
            if (Array.isArray(celda)) {
              const nc = celda.filter(c => c.idTemp !== carga.idTemp);
              return nc.length === 0 ? null : (nc.length === 1 ? nc[0] : nc);
            }
            return celda.idTemp === carga.idTemp ? null : celda;
          })));
          setCargasEsmaltesAsignadas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
          setCargasEspeciales(prev => prev.filter(c => c.idTemp !== carga.idTemp));
          setMostrarDetalle(false);
        }}
        onMoverEspecial={handleMoverAEspecial}
      />
    </>
  );
}

export default function App() { return <Router><AppContent /></Router>; }