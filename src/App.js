import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { useProduccion } from "./hooks/useProduccion";
import { exportarReporte } from "./services/excelService";
import { procesarPdfConRondas } from "./services/pdfService"; 
import { familiaService } from "./services/familiaService";
import { getOperarioPorMaquina, litrosPorEnvasado, litrosATexto } from "./constants/config";

// Componentes UI
import ModalCargas from "./components/ModalCargas";
import ModalDetalleCarga from "./components/ModalDetalleCarga";
import CardCarga from "./components/CardCarga";
import TableroEsmaltes from "./components/TableroEsmaltes";
import PanelEspeciales from "./components/PanelEspeciales";
import LoadingOverlay from "./components/LoadingOverlay";
import { VistaProductosFamilia } from "./components/ExploradorFamilias";
import { VistaFamiliasScreen } from "./components/VistaFamiliasScreen";

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

  // --- LÓGICA DE ELIMINACIÓN PARA EL MODAL DE GESTIÓN ---
  const handleEliminarCargaDeCola = (idTemp) => {
    if (window.confirm("¿Deseas eliminar esta carga de la lista de espera?")) {
      setColaCargas(prev => prev.filter(c => c.idTemp !== idTemp));
    }
  };

  const moverSemana = (offset) => {
    const nueva = new Date(fechaTrabajo);
    nueva.setDate(nueva.getDate() + (offset * 7));
    setFechaTrabajo(nueva);
  };

  const colaFiltrada = useMemo(() => {
    return colaCargas.filter(carga => carga.tipo === tipoPintura);
  }, [colaCargas, tipoPintura]);

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
      const data = await familiaService.getFamiliasPorTipo(tipoPintura);
      setFamilias(data);
      setCargandoFamilias(false);
    };
    fetchFamilias();
  }, [tipoPintura]);

  const simularProgreso = () => {
    setProgreso(0);
    return setInterval(() => {
      setProgreso((prev) => (prev >= 92 ? prev : prev + Math.floor(Math.random() * 7) + 2));
    }, 250);
  };

  const handleImportExcelConProgreso = async (e) => {
    const idIntervalo = simularProgreso();
    try { await handleImportExcel(e); setProgreso(100); } 
    catch (error) { alert("Error: " + error.message); }
    finally { clearInterval(idIntervalo); setTimeout(() => setProgreso(0), 600); setMenuCargasAbierto(false); }
  };

  const handlePdfClick = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setProcesandoPdf(true); const idIntervalo = simularProgreso();
    try {
      const tableroAProcesar = tipoPintura === "Vinílica" ? rondas : cargasEsmaltesAsignadas;
      const blob = await procesarPdfConRondas(file, tableroAProcesar, cargasEspeciales.filter(c => c.tipo === tipoPintura));
      setProgreso(100);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `Reporte_${tipoPintura}_${new Date().getTime()}.pdf`; a.click();
    } catch (error) { alert("Error en PDF: " + error.message); }
    finally { clearInterval(idIntervalo); setTimeout(() => { setProcesandoPdf(false); setProgreso(0); }, 600); e.target.value = null; }
  };

  const handleReporteClick = async () => {
    const cargasFinales = [];
    rondas.forEach((fila, fIdx) => {
      fila.forEach(celda => { 
        if (celda) {
          const idM = 101 + fIdx;
          cargasFinales.push({ 
            ...celda, 
            maquina: `VI-${idM}`, 
            operario: getOperarioPorMaquina(idM, fechaTrabajo) 
          }); 
        }
      });
    });

    cargasEsmaltesAsignadas.forEach(c => {
      cargasFinales.push({ ...c, maquina: "ESM", operario: "Esmaltador" });
    });
    
    cargasEspeciales.forEach(esp => {
      cargasFinales.push({ ...esp, maquina: "ESPECIAL", operario: "Lazaro" });
    });
    
    if (cargasFinales.length === 0) return alert("No hay cargas asignadas.");
    setProcesandoReporte(true); 
    const idIntervalo = simularProgreso();
    try { await exportarReporte(cargasFinales); setProgreso(100); } 
    catch (error) { alert("Error: " + error.message); }
    finally { clearInterval(idIntervalo); setTimeout(() => { setProcesandoReporte(false); setProgreso(0); }, 600); }
  };

  const handleDrop = (e, fDestino, cDestino) => {
    e.preventDefault();
    const dataRaw = e.dataTransfer.getData("transferData");
    if (!dataRaw) return;
    const origen = JSON.parse(dataRaw);
    let nR = [...rondas.map(f => [...f])];
    let nE = [...cargasEspeciales];
    let carga;
    const idM = 101 + fDestino;

    if (origen.tipo === 'ronda') {
      carga = nR[origen.f][origen.c];
      nR[origen.f][origen.c] = nR[fDestino][cDestino];
      nR[fDestino][cDestino] = carga;
    } else {
      carga = nE[origen.index];
      if (nR[fDestino][cDestino]) return alert("Celda ocupada");
      nR[fDestino][cDestino] = carga;
      nE.splice(origen.index, 1);
    }

    if (nR[fDestino][cDestino]) {
      nR[fDestino][cDestino].operario = getOperarioPorMaquina(idM, fechaTrabajo);
    }
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
                        <button onClick={() => moverSemana(-1)}>◀</button>
                        <div className="fecha-actual-view">
                          <strong>Semana:</strong> {fechaTrabajo.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                        <button onClick={() => moverSemana(1)}>▶</button>
                        <button className="btn-hoy-reset" onClick={() => setFechaTrabajo(new Date())}>Hoy</button>
                     </div>
                   )}
                </div>

                <div className="selector-tipo">
                  {["Vinílica", "Esmalte"].map(t => (
                    <button key={t} className={tipoPintura === t ? "active" : ""} onClick={() => setTipoPintura(t)}>{t}</button>
                  ))}
                </div>
              </div>

              <div className="busqueda-con-descripcion">
                <div className="busqueda">
                  <input placeholder="Código de producto..." value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                  <button onClick={consultar}>Buscar</button>
                </div>
                {producto && (
                  <div className="descripcion-producto">
                    <div className="nombre-producto">{producto.descripcion}</div>
                    <div className="poder-cubriente">Poder Cubriente: <span>{producto.poderCubriente || "N/A"}</span></div>
                    <div className="procesos-info">
                      <strong>Ruta:</strong>
                      <div className="lista-procesos-tags">
                        {producto.procesos?.map((p) => (
                          <div key={p.paso} className="proceso-item"><span className="paso-nro">{p.paso}</span><span className="paso-desc">{p.descripcion}</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <PanelEspeciales 
                  cargasEspeciales={cargasEspeciales.filter(c => c.tipo === tipoPintura)} 
                  mostrarEspeciales={mostrarEspeciales} setMostrarEspeciales={setMostrarEspeciales}
                  handleDragStart={(e, o) => e.dataTransfer.setData("transferData", JSON.stringify(o))}
                  seleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
                />
              </div>

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
                <div className="panel-header-actions">
                  <h2 className="tablero-titulo">TABLERO {tipoPintura.toUpperCase()}S</h2>
                  <button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ FAMILIAS</button>
                </div>

                {tipoPintura === "Vinílica" ? (
                  <div className="rondas-panel">
                    <div className="tabla-rondas">
                      <div className="fila-ronda header">
                        <div></div>{[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
                      </div>
                      {rondas.map((fila, fIdx) => (
                        <div className="fila-ronda" key={fIdx}>
                          <div className="etiqueta-ronda">
                            <span className="codigo-maquina">VI-{101 + fIdx}</span>
                            <span className="nombre-operario">{getOperarioPorMaquina(101 + fIdx, fechaTrabajo)}</span>
                          </div>
                          {fila.map((celda, cIdx) => (
                            <div className="celda-ronda clickable" key={cIdx} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, fIdx, cIdx)}>
                              {celda?.tipo === "Vinílica" && (
                                <div draggable onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx }))} onClick={() => { setCargaSeleccionada(celda); setMostrarDetalle(true); }} className="full-cell-link">
                                  <CardCarga carga={celda} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <TableroEsmaltes cargas={cargasEsmaltesAsignadas} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} />
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

      {/* MODAL DE GESTIÓN DE CARGAS INTEGRADO */}
      <ModalCargas 
        visible={mostrarModal} 
        cargas={colaFiltrada} 
        onClose={() => setMostrarModal(false)} 
        onEliminarCarga={handleEliminarCargaDeCola}
        onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }} 
      />

      <ModalDetalleCarga
        visible={mostrarDetalle} carga={cargaSeleccionada} onClose={() => setMostrarDetalle(false)}
        onEliminar={(c) => { 
          if(c.tipo === "Vinílica") { setRondas(rondas.map(f => f.map(celda => celda?.idTemp === c.idTemp ? null : celda))); } 
          else { setCargasEsmaltesAsignadas(prev => prev.filter(e => e.idTemp !== c.idTemp)); }
          setCargasEspeciales(cargasEspeciales.filter(ce => ce.idTemp !== c.idTemp)); 
          setMostrarDetalle(false); 
        }}
        onMoverEspecial={(c) => { 
          if(c.tipo === "Vinílica") { setRondas(rondas.map(f => f.map(celda => celda?.idTemp === c.idTemp ? null : celda))); } 
          else { setCargasEsmaltesAsignadas(prev => prev.filter(e => e.idTemp !== c.idTemp)); }
          setCargasEspeciales(ordenarCargas([...cargasEspeciales, { ...c, operario: "" }])); 
          setMostrarDetalle(false); 
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}