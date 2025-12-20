import { useState, useEffect } from "react";
import { useProduccion } from "./hooks/useProduccion";
import { exportarReporte } from "./services/excelService";
import { procesarPdfConRondas } from "./services/pdfService"; 
import { OPERARIOS, litrosPorEnvasado, litrosATexto } from "./constants/config";

// Componentes UI
import ModalCargas from "./components/ModalCargas";
import ModalDetalleCarga from "./components/ModalDetalleCarga";
import CardCarga from "./components/CardCarga";
import TableroEsmaltes from "./components/TableroEsmaltes";
import PanelEspeciales from "./components/PanelEspeciales";

// Estilos
import "./styles/styles.css";
import "./styles/rondas.css";
import "./styles/esmaltes.css";

function App() {
  const {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas,
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargando, totalLitrosActuales,
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
  } = useProduccion();

  // Estados locales de UI
  const [mostrarEspeciales, setMostrarEspeciales] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [cargaSeleccionada, setCargaSeleccionada] = useState(null);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [menuCargasAbierto, setMenuCargasAbierto] = useState(false);
  
  // Estado para el porcentaje
  const [progreso, setProgreso] = useState(0);

  // --- LÓGICA DE PROGRESO SIMULADO ---
  const simularProgreso = () => {
    setProgreso(0);
    return setInterval(() => {
      setProgreso((prev) => {
        if (prev >= 92) return prev; // Se detiene cerca del final hasta que responda el server
        return prev + Math.floor(Math.random() * 7) + 2; // Incrementos aleatorios para naturalidad
      });
    }, 250);
  };

  // --- HANDLERS ---
  const handleImportExcelConProgreso = async (e) => {
    const idIntervalo = simularProgreso();
    try {
      // Nota: handleImportExcel ya gestiona el estado 'cargando' internamente en tu hook
      await handleImportExcel(e);
      setProgreso(100);
    } catch (error) {
      alert("Error al importar: " + error.message);
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
      const blob = await procesarPdfConRondas(file, rondas, cargasEspeciales);
      setProgreso(100);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.body.appendChild(document.createElement('a'));
      a.href = url;
      a.download = `Reporte_Produccion_${new Date().getTime()}.pdf`;
      a.click();
      a.remove();
    } catch (error) { 
      alert("Error en PDF: " + error.message); 
    } finally { 
      clearInterval(idIntervalo);
      setTimeout(() => {
        setProcesandoPdf(false);
        setProgreso(0);
      }, 600);
      e.target.value = null; 
    }
  };

  const handleReporteClick = () => {
    const cargasFinales = [];
    rondas.forEach((fila, fIdx) => {
      fila.forEach(celda => {
        if (celda) cargasFinales.push({ ...celda, maquina: `VI-${101 + fIdx}`, operario: OPERARIOS[101 + fIdx] });
      });
    });
    cargasEspeciales.forEach(esp => cargasFinales.push({ ...esp, maquina: "ESPECIAL", operario: "PENDIENTE" }));
    if (cargasFinales.length === 0) return alert("No hay cargas para el reporte.");
    exportarReporte(cargasFinales);
  };

  const handleDrop = (e, fDestino, cDestino) => {
    e.preventDefault();
    const dataRaw = e.dataTransfer.getData("transferData");
    if (!dataRaw) return;
    const origen = JSON.parse(dataRaw);
    let nuevasRondas = [...rondas.map(f => [...f])];
    let nuevasEspeciales = [...cargasEspeciales];
    let cargaAMover;

    if (origen.tipo === 'ronda') {
      cargaAMover = nuevasRondas[origen.f][origen.c];
      if (origen.f === fDestino && origen.c === cDestino) return;
      nuevasRondas[origen.f][origen.c] = nuevasRondas[fDestino][cDestino];
      nuevasRondas[fDestino][cDestino] = cargaAMover;
    } else {
      cargaAMover = nuevasEspeciales[origen.index];
      if (nuevasRondas[fDestino][cDestino]) return alert("Celda ocupada");
      nuevasRondas[fDestino][cDestino] = cargaAMover;
      nuevasEspeciales.splice(origen.index, 1);
    }
    if (nuevasRondas[fDestino][cDestino]) nuevasRondas[fDestino][cDestino].operario = OPERARIOS[101 + fDestino];
    setRondas(nuevasRondas);
    setCargasEspeciales(nuevasEspeciales);
  };

  return (
    <div className="app">
      {/* OVERLAY CON PORCENTAJE Y BARRA */}
      {(cargando || procesandoPdf) && (
        <div className="loading-overlay">
          <div className="overlay-content">
            <div className="spinner-large"></div>
            <h3>{cargando ? "Analizando Excel..." : "Generando PDF..."}</h3>
            
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progreso}%` }}></div>
            </div>
            
            <div className="percentage-display">{progreso}%</div>
            <p>Procesando datos en el servidor de Python</p>
          </div>
        </div>
      )}

      <div className="container">
        {/* HEADER */}
        <div className="header-panel">
          <h1>Gestión de Pinturas</h1>
          <div className="selector-tipo">
            {["Vinílica", "Esmalte"].map(t => (
              <button key={t} className={tipoPintura === t ? "active" : ""} onClick={() => setTipoPintura(t)}>{t}</button>
            ))}
          </div>
        </div>

        {/* BUSQUEDA Y ESPECIALES */}
        <div className="busqueda-con-descripcion">
          <div className="busqueda">
            <input placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <button onClick={consultar}>Buscar</button>
          </div>

          {producto && (
            <div className="descripcion-producto">
              <div className="nombre-producto">{producto.descripcion}</div>
              <div className="poder-cubriente">Poder Cubriente: <span>{producto.poderCubriente}</span></div>
            </div>
          )}

          <PanelEspeciales 
            cargasEspeciales={cargasEspeciales}
            mostrarEspeciales={mostrarEspeciales}
            setMostrarEspeciales={setMostrarEspeciales}
            handleDragStart={(e, o) => e.dataTransfer.setData("transferData", JSON.stringify(o))}
            seleccionarCarga={(c) => { setCargaSeleccionada(c); setMostrarDetalle(true); }}
          />
        </div>

        {/* PANEL PRINCIPAL */}
        <div className="producto-panel">
          {producto && (
            <>
              <div className="tabla">
                {[...producto.envasados]
                  .sort((a, b) => litrosPorEnvasado(a.id) - litrosPorEnvasado(b.id))
                  .map(env => (
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
                  <button className="dropdown-item" onClick={() => { setMostrarModal(true); setMenuCargasAbierto(false); }}>📋 Ver Lista de Espera</button>
                  <label className="dropdown-item label-input" style={{ cursor: 'pointer' }}>
                    {cargando ? "⌛ Procesando..." : "📊 Importar Excel"}
                    <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcelConProgreso} disabled={cargando} />
                  </label>
                </div>
              )}
            </div>

            <label className="agregar-btn" style={{ backgroundColor: '#6f42c1', cursor: procesandoPdf ? 'not-allowed' : 'pointer', textAlign: 'center' }}>
              {procesandoPdf ? "⌛ Procesando..." : "📄 Generar PDF"}
              <input type="file" hidden accept=".pdf" onChange={handlePdfClick} disabled={procesandoPdf} />
            </label>

            <button className="agregar-btn" style={{ backgroundColor: '#17a2b8' }} onClick={handleReporteClick}>📊 Reporte Final</button>
          </div>
        </div>

        {/* RONDAS */}
        {tipoPintura === "Vinílica" ? (
          <div className="rondas-panel">
            <h2>RONDAS DE PRODUCCIÓN</h2>
            <div className="tabla-rondas">
              <div className="fila-ronda header">
                <div></div>
                {[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
              </div>
              {rondas.map((fila, fIdx) => (
                <div className="fila-ronda" key={fIdx}>
                  <div className="etiqueta-ronda">
                    <span className="codigo-maquina">VI-{101 + fIdx}</span>
                    <span className="nombre-operario">{OPERARIOS[101 + fIdx]}</span>
                  </div>
                  {fila.map((celda, cIdx) => (
                    <div className="celda-ronda clickable" key={cIdx} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, fIdx, cIdx)}>
                      {celda && (
                        <div draggable onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx }))} onClick={() => { setCargaSeleccionada(celda); setMostrarDetalle(true); }} style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <CardCarga carga={celda} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : <TableroEsmaltes rondas={rondas} setCargaSeleccionada={setCargaSeleccionada} setMostrarDetalle={setMostrarDetalle} />}

        <ModalCargas visible={mostrarModal} cargas={colaCargas} onClose={() => setMostrarModal(false)} onGuardar={(c) => { guardarCargasEnRondas(c); setMostrarModal(false); }} />
        <ModalDetalleCarga
          visible={mostrarDetalle}
          carga={cargaSeleccionada}
          onClose={() => setMostrarDetalle(false)}
          onEliminar={(c) => {
            setRondas(rondas.map(f => f.map(celda => celda === c ? null : celda)));
            setCargasEspeciales(cargasEspeciales.filter(ce => ce !== c));
            setMostrarDetalle(false);
          }}
          onMoverEspecial={(c) => {
            setRondas(rondas.map(f => f.map(celda => celda === c ? null : celda)));
            setCargasEspeciales(ordenarCargas([...cargasEspeciales, { ...c, operario: "" }]));
            setMostrarDetalle(false);
          }}
        />
      </div>
    </div>
  );
}

export default App;