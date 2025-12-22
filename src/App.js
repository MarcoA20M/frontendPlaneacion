import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from "react-router-dom";
import { useProduccion } from "./hooks/useProduccion";
import { exportarReporte } from "./services/excelService";
import { procesarPdfConRondas } from "./services/pdfService"; 
import { familiaService } from "./services/familiaService";
import { OPERARIOS, litrosPorEnvasado, litrosATexto } from "./constants/config";

// Componentes UI
import ModalCargas from "./components/ModalCargas";
import ModalDetalleCarga from "./components/ModalDetalleCarga";
import CardCarga from "./components/CardCarga";
import TableroEsmaltes from "./components/TableroEsmaltes";
import PanelEspeciales from "./components/PanelEspeciales";
import LoadingOverlay from "./components/LoadingOverlay";
import { VistaFamilias, VistaProductosFamilia } from "./components/ExploradorFamilias";

// Estilos
import "./styles/styles.css";
import "./styles/rondas.css";
import "./styles/esmaltes.css";

function AppContent() {
  const {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas,
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargando, totalLitrosActuales,
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
  } = useProduccion();

  const navigate = useNavigate();

  // Estados de UI y Familias
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
      const blob = await procesarPdfConRondas(file, rondas, cargasEspeciales);
      setProgreso(100);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `Reporte_Produccion_${new Date().getTime()}.pdf`; a.click();
    } catch (error) { alert("Error en PDF: " + error.message); }
    finally { clearInterval(idIntervalo); setTimeout(() => { setProcesandoPdf(false); setProgreso(0); }, 600); e.target.value = null; }
  };

  const handleReporteClick = async () => {
    const cargasFinales = [];
    rondas.forEach((fila, fIdx) => {
      fila.forEach(celda => { if (celda) cargasFinales.push({ ...celda, maquina: `VI-${101 + fIdx}`, operario: OPERARIOS[101 + fIdx] }); });
    });
    cargasEspeciales.forEach(esp => cargasFinales.push({ ...esp, maquina: "ESPECIAL", operario: "Lazaro" }));
    if (cargasFinales.length === 0) return alert("No hay cargas para el reporte.");
    setProcesandoReporte(true); const idIntervalo = simularProgreso();
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
    if (nR[fDestino][cDestino]) nR[fDestino][cDestino].operario = OPERARIOS[101 + fDestino];
    setRondas(nR); setCargasEspeciales(nE);
  };

  return (
    <div className="app">
      <LoadingOverlay 
        cargando={cargando} 
        procesandoPdf={procesandoPdf} 
        procesandoReporte={procesandoReporte} 
        progreso={progreso} 
      />

      <div className="container">
        <div className="header-panel">
          <h1>Gestión de Pinturas</h1>
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
              <div className="poder-cubriente">Poder Cubriente: <span>{producto.poderCubriente}</span></div>
            </div>
          )}
          <PanelEspeciales 
            cargasEspeciales={cargasEspeciales} mostrarEspeciales={mostrarEspeciales} setMostrarEspeciales={setMostrarEspeciales}
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
              <button className="agregar-btn secondary" onClick={() => setMenuCargasAbierto(!menuCargasAbierto)}>
                📂 Gestión de Cargas ({colaCargas.length}) {menuCargasAbierto ? '▴' : '▾'}
              </button>
              {menuCargasAbierto && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => { setMostrarModal(true); setMenuCargasAbierto(false); }}>📋 Lista de Espera</button>
                  <label className="dropdown-item label-input">📊 Importar Excel <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcelConProgreso} /></label>
                </div>
              )}
            </div>
            <label className="agregar-btn" style={{ backgroundColor: '#6f42c1', cursor: 'pointer' }}>
              📄 Subrayar PDF <input type="file" hidden accept=".pdf" onChange={handlePdfClick} />
            </label>
            <button className="agregar-btn" style={{ backgroundColor: '#17a2b8' }} onClick={handleReporteClick}>
              📊 Generar Reporte 
            </button>
          </div>
        </div>

        <div className="main-board-section">
          <div className="panel-header-actions">
            <h2 className="tablero-titulo">TABLERO {tipoPintura.toUpperCase()}S</h2>
            <Routes>
              <Route path="/" element={<button className="btn-family-explorer" onClick={() => navigate("/familias")}>🏷️ VER FAMILIAS</button>} />
              <Route path="/*" element={<button className="btn-family-explorer active" onClick={() => navigate("/")}>🏷️ CERRAR CATÁLOGO</button>} />
            </Routes>
          </div>

          <Routes>
            <Route path="/familias" element={<VistaFamilias cargandoFamilias={cargandoFamilias} familias={familias} />} />
            <Route path="/familia/:idFamilia" element={<VistaProductosFamilia setCodigo={setCodigo} consultar={consultar} />} />
            <Route path="/" element={
              tipoPintura === "Vinílica" ? (
                <div className="rondas-panel">
                  <div className="tabla-rondas">
                    <div className="fila-ronda header">
                      <div></div>{[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
                    </div>
                    {rondas.map((fila, fIdx) => (
                      <div className="fila-ronda" key={fIdx}>
                        <div className="etiqueta-ronda">
                          <span className="codigo-maquina">VI-{101 + fIdx}</span>
                          <span className="nombre-operario">{OPERARIOS[101 + fIdx]}</span>
                        </div>
                        {fila.map((celda, cIdx) => (
                          <div className="celda-ronda clickable" key={cIdx} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, fIdx, cIdx)}>
                            {celda && celda.tipo === "Vinílica" && (
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
                <TableroEsmaltes rondas={rondas} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} />
              )
            } />
          </Routes>
        </div>

        <ModalCargas visible={mostrarModal} cargas={colaCargas} onClose={() => setMostrarModal(false)} onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }} />
        <ModalDetalleCarga
          visible={mostrarDetalle} carga={cargaSeleccionada} onClose={() => setMostrarDetalle(false)}
          onEliminar={(c) => { setRondas(rondas.map(f => f.map(celda => celda === c ? null : celda))); setCargasEspeciales(cargasEspeciales.filter(ce => ce !== c)); setMostrarDetalle(false); }}
          onMoverEspecial={(c) => { setRondas(rondas.map(f => f.map(celda => celda === c ? null : celda))); setCargasEspeciales(ordenarCargas([...cargasEspeciales, { ...c, operario: "" }])); setMostrarDetalle(false); }}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}