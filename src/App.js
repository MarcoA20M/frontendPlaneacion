import { useState } from "react";
import { buscarProducto } from "./services/productoService";
import ModalCargas from "./components/ModalCargas";
import ModalDetalleCarga from "./components/ModalDetalleCarga";
import CardCarga from "./components/CardCarga";

// Importación de constantes y utilidades
import { API_URL, OPERARIOS, CODIGOS_EXCLUIDOS, litrosPorEnvasado, litrosATexto } from "./constants/config";

// Importación de estilos (Asegúrate de que las rutas sean correctas)
import "./styles/styles.css";
import "./styles/rondas.css";

function App() {
  // --- ESTADOS ---
  const [codigo, setCodigo] = useState("");
  const [producto, setProducto] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [colaCargas, setColaCargas] = useState([]);
  const [cargasEspeciales, setCargasEspeciales] = useState([]);
  const [mostrarEspeciales, setMostrarEspeciales] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [cargaSeleccionada, setCargaSeleccionada] = useState(null);
  const [tipoPintura, setTipoPintura] = useState("Vinílica");
  const [rondas, setRondas] = useState(Array.from({ length: 8 }, () => Array(6).fill(null)));
  const [cargando, setCargando] = useState(false);

  // --- CÁLCULOS ---
  const totalLitrosActuales = producto 
    ? producto.envasados.reduce((acc, env) => acc + (cantidades[env.id] || 0) * litrosPorEnvasado(env.id), 0)
    : 0;

  const ordenarCargas = (lista) => {
    return [...lista].sort((a, b) => {
      const cubA = a.nivelCubriente || 0;
      const cubB = b.nivelCubriente || 0;
      if (cubA !== cubB) return cubA - cubB;
      return String(a.folio).localeCompare(String(b.folio), undefined, { numeric: true });
    });
  };

  // --- FUNCIONES DE ACCIÓN ---
  const consultar = async () => {
    if (!codigo.trim()) return;
    try {
      const res = await buscarProducto(codigo.trim());
      if (!res) return alert("Producto no encontrado");
      if (tipoPintura === "Vinílica" && res.tipoPinturaId !== 2) return alert("No es Vinílica");
      setProducto({ ...res, envasados: res.envasados || [] });
      setCantidades({});
    } catch (e) { alert("Error de red"); }
  };

  const agregarCargaManual = () => {
    if (!producto || totalLitrosActuales === 0) return alert("Ingresa cantidades");
    
    const resumenEnvasados = producto.envasados
      .filter(env => cantidades[env.id] > 0)
      .map(env => ({ 
        cantidad: cantidades[env.id], 
        formato: `${litrosPorEnvasado(env.id)}`.replace('.', '') 
      }));
    
    const nuevaCarga = {
      folio: "MANUAL",
      codigoProducto: producto.codigo,
      descripcion: producto.descripcion,
      litros: totalLitrosActuales,
      tipoPintura,
      nivelCubriente: producto.poderCubriente,
      detallesEnvasado: resumenEnvasados,
      operario: ""
    };

    if (CODIGOS_EXCLUIDOS.includes(String(producto.codigo))) {
      setCargasEspeciales(ordenarCargas([...cargasEspeciales, nuevaCarga]));
    } else {
      setColaCargas(ordenarCargas([...colaCargas, nuevaCarga]));
    }
    setCantidades({}); 
    alert("Carga agregada.");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('excel', file);

    try {
      setCargando(true);
      const response = await fetch(`${API_URL}/analyze-excel`, { method: 'POST', body: formData });
      const dataRaw = await response.json(); 
      
      const nuevasNormales = [];
      const nuevasEspeciales = [];

      for (const item of dataRaw) {
        try {
          const res = await buscarProducto(item.articulo.trim());
          if (res && (tipoPintura !== "Vinílica" || res.tipoPinturaId === 2)) {
            const nueva = {
              folio: item.folio || "S/F",
              codigoProducto: res.codigo,
              descripcion: res.descripcion,
              litros: parseFloat(item.litros) || 0,
              tipoPintura,
              nivelCubriente: res.poderCubriente,
              detallesEnvasado: item.hijas.map(h => ({ cantidad: h.cantidad, formato: h.articulo.split('-')[0] })),
              operario: ""
            };
            if (CODIGOS_EXCLUIDOS.includes(String(res.codigo))) nuevasEspeciales.push(nueva);
            else nuevasNormales.push(nueva);
          }
        } catch (err) { console.error("Error en fila", err); }
      }
      setColaCargas(ordenarCargas([...colaCargas, ...nuevasNormales]));
      setCargasEspeciales(ordenarCargas([...cargasEspeciales, ...nuevasEspeciales]));
    } catch (err) { alert("Error al procesar Excel"); }
    finally { setCargando(false); e.target.value = null; }
  };

  const handleGenerarReporte = async () => {
    try {
      const cargasFinales = [];
      rondas.forEach((fila, fIdx) => {
        fila.forEach(celda => {
          if (celda) cargasFinales.push({ ...celda, maquina: `VI-${101 + fIdx}`, operario: OPERARIOS[101 + fIdx] });
        });
      });
      cargasEspeciales.forEach(esp => cargasFinales.push({ ...esp, maquina: "ESPECIAL", operario: "PENDIENTE" }));

      if (cargasFinales.length === 0) return alert("No hay cargas para el reporte.");

      const response = await fetch(`${API_URL}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargas: cargasFinales })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `Reporte_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`;
      link.click();
    } catch (err) { alert("Error al generar el reporte."); }
  };

  // --- LÓGICA DRAG & DROP ---
  const handleDragStart = (e, origen) => e.dataTransfer.setData("transferData", JSON.stringify(origen));
  const onDragOver = (e) => e.preventDefault(); 

  const handleDrop = (e, fDestino, cDestino) => {
    e.preventDefault();
    const dataRaw = e.dataTransfer.getData("transferData");
    if (!dataRaw) return;
    const origen = JSON.parse(dataRaw);

    let nuevasRondas = [...rondas.map(f => [...f])];
    let nuevasEspeciales = [...cargasEspeciales];
    let cargaAMover = null;

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

  const guardarCargasEnRondas = (cargasAGuardar) => {
    const nuevasRondas = [...rondas.map(f => [...f])];
    const nuevasEspeciales = [...cargasEspeciales];

    cargasAGuardar.forEach((carga) => {
      if (CODIGOS_EXCLUIDOS.includes(String(carga.codigoProducto))) {
        nuevasEspeciales.push(carga); return;
      }

      let asignada = false;
      for (let col = 0; col < 6 && !asignada; col++) {
        for (let fila = 0; fila < 8 && !asignada; fila++) {
          if (nuevasRondas[fila][col]) continue;
          const numM = 101 + fila;
          if (numM === 107 && carga.litros > 1600) continue;
          const esGran = [104, 108].includes(numM);
          
          if ((carga.litros > 1600 && esGran) || 
              (carga.litros > 855 && carga.litros <= 1600 && (esGran || numM === 107)) || 
              (carga.litros <= 855 && !esGran && numM !== 107)) {
            carga.operario = OPERARIOS[numM];
            nuevasRondas[fila][col] = carga; asignada = true;
          }
        }
      }
      if (!asignada) nuevasEspeciales.push(carga);
    });

    setRondas(nuevasRondas);
    setCargasEspeciales(ordenarCargas(nuevasEspeciales));
    setColaCargas([]);
    setMostrarModal(false);
  };

  return (
    <div className="app">
      <div className="container">
        {/* HEADER */}
        <div className="header-panel">
          <h1>Gestión de Pinturas</h1>
          <div className="selector-tipo">
            <button className={tipoPintura === "Vinílica" ? "active" : ""} onClick={() => setTipoPintura("Vinílica")}>Vinílica</button>
            <button className={tipoPintura === "Esmalte" ? "active" : ""} onClick={() => setTipoPintura("Esmalte")}>Esmalte</button>
          </div>
        </div>

        {/* BÚSQUEDA Y ESPECIALES */}
        <div className="busqueda-con-descripcion">
          <div className="busqueda">
            <input placeholder="Código" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            <button onClick={consultar}>Buscar</button>
          </div>
          
          {producto && (
            <div className="descripcion-producto">
              <div className="info-principal">
                <div className="nombre-producto">{producto.descripcion}</div>
                <div className="poder-cubriente">Poder Cubriente: <span>{producto.poderCubriente}</span></div>
              </div>
            </div>
          )}

          {cargasEspeciales.length > 0 && (
            <div className="contenedor-especiales-premium">
              <div className="header-especial" onClick={() => setMostrarEspeciales(!mostrarEspeciales)}>
                <div className="titulo-especial"><span className="alarma-dot"></span> ESPECIALES PENDIENTES ({cargasEspeciales.length})</div>
                <button className="toggle-view-btn">{mostrarEspeciales ? 'OCULTAR' : 'VER'}</button>
              </div>
              {mostrarEspeciales && (
                <div className="grid-especial-premium">
                  {cargasEspeciales.map((c, i) => (
                    <div key={i} className="card-especial-v2" draggable onDragStart={(e) => handleDragStart(e, { tipo: 'especial', index: i })} 
                         onClick={() => { setCargaSeleccionada(c); setMostrarDetalle(true); }}>
                      <div className="card-header-ex">
                        <span className="code-badge">{c.codigoProducto}</span>
                        <span className="litros-badge" style={{color: '#0056b3'}}>Lote: {c.folio}</span>
                      </div>
                      <div className="card-body-ex">{c.descripcion}</div>
                      <div className="card-footer-ex">Cubriente: <strong>{c.nivelCubriente}</strong> | {c.litros.toFixed(1)} L</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* PANEL DE PRODUCTO Y BOTONES PRINCIPALES */}
        <div className="producto-panel">
          {producto && (
            <>
              <div className="tabla">
                {[...producto.envasados].sort((a,b)=>litrosPorEnvasado(a.id)-litrosPorEnvasado(b.id)).map(env => (
                  <div className="fila" key={env.id}>
                    <span className="litros-text">{litrosATexto(litrosPorEnvasado(env.id))}</span>
                    <input type="number" value={cantidades[env.id] || 0} onChange={(e) => setCantidades({...cantidades, [env.id]: Number(e.target.value)})} />
                  </div>
                ))}
              </div>
              <div className="contador-litros">Total: <span>{totalLitrosActuales.toFixed(2)} L</span></div>
            </>
          )}

          <div className="botones-cargas">
            <button className="agregar-btn" onClick={agregarCargaManual}>Agregar carga</button>
            <button className="agregar-btn secondary" onClick={() => setMostrarModal(true)}>Lista ({colaCargas.length})</button>
            <label className="agregar-btn" style={{backgroundColor: '#28a745', cursor: 'pointer', textAlign: 'center'}}>
               {cargando ? "Procesando..." : "📁 Analizar Excel"}
               <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
            </label>
            <button className="agregar-btn" style={{backgroundColor: '#17a2b8'}} onClick={handleGenerarReporte}>📊 Reporte Excel</button>
          </div>
        </div>

        {/* RONDAS */}
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
                  <span className="codigo-maquina">VI-{101+fIdx}</span>
                  <span className="nombre-operario">{OPERARIOS[101+fIdx]}</span>
                </div>
                {fila.map((celda, cIdx) => (
                  <div className="celda-ronda clickable" key={cIdx} onDragOver={onDragOver} onDrop={(e) => handleDrop(e, fIdx, cIdx)}>
                    {celda && (
                      <div draggable onDragStart={(e) => handleDragStart(e, { tipo: 'ronda', f: fIdx, c: cIdx })} 
                           onClick={() => { setCargaSeleccionada(celda); setMostrarDetalle(true); }} 
                           style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CardCarga carga={celda} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* MODALES */}
        <ModalCargas visible={mostrarModal} cargas={colaCargas} onClose={() => setMostrarModal(false)} onGuardar={guardarCargasEnRondas} />
        <ModalDetalleCarga visible={mostrarDetalle} carga={cargaSeleccionada} onClose={() => setMostrarDetalle(false)} 
          onEliminar={(c) => {
            setRondas(rondas.map(f => f.map(celda => celda === c ? null : celda)));
            setCargasEspeciales(cargasEspeciales.filter(ce => ce !== c));
          }}
          onMoverEspecial={(c) => {
            setRondas(rondas.map(f => f.map(celda => celda === c ? null : celda)));
            setCargasEspeciales(ordenarCargas([...cargasEspeciales, {...c, operario: ""}]));
            setMostrarDetalle(false);
          }} 
        />
      </div>
    </div>
  );
}

export default App;