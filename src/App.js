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

  // Lógica de Contadores
  const stats = useMemo(() => {
    return {
      total: cargasEsmaltesAsignadas.length,
      directos: cargasEsmaltesAsignadas.filter(c => !(c.operario || "").includes('/')).length,
      molienda: cargasEsmaltesAsignadas.filter(c => (c.operario || "").includes('/')).length
    };
  }, [cargasEsmaltesAsignadas]);

  const handleMoverAEspecial = (carga) => {
    setColaCargas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
    setRondas(prevRondas => prevRondas.map(fila => 
      fila.map(celda => {
        if (!celda) return null;
        if (Array.isArray(celda)) {
          const nuevaCelda = celda.filter(c => c.idTemp !== carga.idTemp);
          return nuevaCelda.length === 0 ? null : (nuevaCelda.length === 1 ? nuevaCelda[0] : nuevaCelda);
        }
        return celda.idTemp === carga.idTemp ? null : celda;
      })
    ));
    setCargasEsmaltesAsignadas(prev => prev.filter(c => c.idTemp !== carga.idTemp));
    setCargasEspeciales(prev => ordenarCargas([...prev, { ...carga, operario: "Lázaro" }]));
    setMostrarDetalle(false);
  };

  const simularProgreso = () => {
    setProgreso(0);
    return setInterval(() => {
      setProgreso((prev) => (prev >= 92 ? prev : prev + Math.floor(Math.random() * 7) + 2));
    }, 250);
  };

  const handleImportExcelConProgreso = async (e) => {
    const idIntervalo = simularProgreso();
    try { 
      await handleImportExcel(e); 
      setProgreso(100); 
    } catch (error) { 
      alert("Error: " + error.message); 
    } finally { 
      clearInterval(idIntervalo); 
      setTimeout(() => setProgreso(0), 600); 
      setMenuCargasAbierto(false); 
    }
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

  const handleReporteClick = async () => {
    const cargasFinales = [];
    rondas.forEach((fila, fIdx) => {
      const op = getOperarioPorMaquina(101 + fIdx, fechaTrabajo);
      fila.forEach(celda => {
        if (!celda) return;
        if (Array.isArray(celda)) celda.forEach(c => cargasFinales.push({ ...c, maquina: `VI-${101+fIdx}`, operario: op }));
        else cargasFinales.push({ ...celda, maquina: `VI-${101+fIdx}`, operario: op });
      });
    });
    cargasEsmaltesAsignadas.forEach(c => cargasFinales.push({ ...c, maquina: "ESM", operario: c.operario || "Esmaltador" }));
    cargasEspeciales.filter(c => c.tipo === tipoPintura).forEach(esp => cargasFinales.push({ ...esp, maquina: "ESPECIAL", operario: "Lazaro" }));
    
    if (cargasFinales.length === 0) return alert("No hay cargas para reportar.");
    
    setProcesandoReporte(true);
    const idIntervalo = simularProgreso();
    try { 
      await exportarReporte(cargasFinales); 
      setProgreso(100); 
    } catch (error) { 
      alert("Error Excel: " + error.message); 
    } finally { 
      clearInterval(idIntervalo); 
      setTimeout(() => { setProcesandoReporte(false); setProgreso(0); }, 600); 
    }
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
                    <button key={t} className={tipoPintura === t ? "active" : ""} onClick={() => {setTipoPintura(t); setFiltroOperario(null); setModoEsmalte(null);}}>{t}</button>
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
                  <label className="agregar-btn btn-pdf">📄Subrayar PDF <input type="file" hidden accept=".pdf" onChange={handlePdfClick} /></label>
                  <button className="agregar-btn btn-reporte" onClick={handleReporteClick}>📊 generar Reporte</button>
                </div>
              </div>

              <div className="main-board-section">
                <div className="panel-header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <div className="header-left-side" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
                    <h2 className="tablero-titulo">TABLERO {tipoPintura.toUpperCase()}S</h2>
                    <ResumenOperarios 
                      tipoPintura={tipoPintura}
                      rondas={rondas} 
                      cargasEsmaltes={cargasEsmaltesAsignadas}
                      fechaTrabajo={fechaTrabajo} 
                      getOperarioPorMaquina={getOperarioPorMaquina}
                      onFiltrar={setFiltroOperario}
                      filtroActivo={filtroOperario}
                    />
                    
                    {/* BOTONES CON GENERAL Y CONTADORES */}
                    {tipoPintura === "Esmalte" && (
                      <div style={{ display: 'inline-flex', gap: '5px', marginLeft: '15px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                         <button 
                            className={`card-op ${modoEsmalte === null ? 'active' : ''}`}
                            onClick={() => setModoEsmalte(null)}
                            style={{ fontSize: '0.7rem' }}
                         >🌍 GENERAL ({stats.total})</button>
                         <button 
                            className={`card-op ${modoEsmalte === 'DIRECTO' ? 'active' : ''}`}
                            onClick={() => setModoEsmalte('DIRECTO')}
                            style={{ fontSize: '0.7rem' }}
                         >🚀 DIRECTOS ({stats.directos})</button>
                         <button 
                            className={`card-op ${modoEsmalte === 'MOLIENDA' ? 'active' : ''}`}
                            onClick={() => setModoEsmalte('MOLIENDA')}
                            style={{ fontSize: '0.7rem' }}
                         >⚙️ MOLIENDA ({stats.molienda})</button>
                      </div>
                    )}
                  </div>
                  <button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ FAMILIAS</button>
                </div>

                {tipoPintura === "Vinílica" ? (
                  <TableroVinilica rondas={rondas} fechaTrabajo={fechaTrabajo} handleDrop={handleDrop} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} filtroOperario={filtroOperario} />
                ) : (
                  <TableroEsmaltes 
                    cargas={cargasEsmaltesAsignadas} 
                    setCargaSeleccionada={setCargaSeleccionada} 
                    setMostrarDetalle={setMostrarDetalle}
                    filtroOperario={filtroOperario}
                    modoEsmalte={modoEsmalte}
                  />
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

      <ModalCargas visible={mostrarModal} cargas={colaFiltrada} onClose={() => setMostrarModal(false)} onEliminarCarga={(id) => setColaCargas(prev => prev.filter(c => c.idTemp !== id))} onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }} onSeleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }} />
      <ModalDetalleCarga visible={mostrarDetalle} carga={cargaSeleccionada} onClose={() => setMostrarDetalle(false)} onEliminar={() => {setColaCargas(prev => prev.filter(c => c.idTemp !== cargaSeleccionada.idTemp)); setMostrarDetalle(false);}} onMoverEspecial={handleMoverAEspecial} />
    </>
  );
}

export default function App() { return <Router><AppContent /></Router>; }