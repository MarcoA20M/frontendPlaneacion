import { useState } from "react";
import { buscarProducto } from "../services/productoService";
import { analizarExcel } from "../services/excelService";
import { getOperarioPorMaquina, CODIGOS_EXCLUIDOS, litrosPorEnvasado } from "../constants/config";

export function useProduccion() {
  const [codigo, setCodigo] = useState("");
  const [producto, setProducto] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [colaCargas, setColaCargas] = useState([]); 
  const [cargasEspeciales, setCargasEspeciales] = useState([]);
  const [tipoPintura, setTipoPintura] = useState("Vinílica");
  const [rondas, setRondas] = useState(Array.from({ length: 8 }, () => Array(6).fill(null)));
  const [cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas] = useState([]);
  
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [buscandoManual, setBuscandoManual] = useState(false);

  const IGUALADORES = ["GASPAR", "ALBERTO", "PEDRO"];
  const PREPARADORES = ["GERMAN", "ALDO"];

  const normalizarCodigo = (cod) => {
    if (!cod) return "";
    return String(cod).trim().toUpperCase().replace(/^0+/, '') || "0";
  };

  const obtenerDatosProductoSeguro = async (codOriginal) => {
    const codLimpio = normalizarCodigo(codOriginal);
    let datosFinales = null;

    try {
      datosFinales = await buscarProducto(codLimpio);
      if (!datosFinales && codLimpio.endsWith("M")) {
        const codBase = codLimpio.slice(0, -1);
        let datosBase = await buscarProducto(codBase) || await buscarProducto("0" + codBase);
        if (datosBase) {
          datosFinales = { 
            ...datosBase, 
            codigo: codLimpio, 
            descripcion: datosBase.descripcion + " (MAQUILA)" 
          };
        }
      }
    } catch (e) { datosFinales = null; }

    if (!datosFinales) {
      datosFinales = {
        codigo: codLimpio,
        descripcion: codLimpio.endsWith("M") ? "MAQUILA DESCONOCIDA" : "NO REGISTRADO",
        poderCubriente: 0,
        tipoPinturaId: tipoPintura === "Vinílica" ? 2 : 1,
        envasados: [], procesos: []
      };
    }
    return datosFinales;
  };

  const consultar = async () => {
    const limpio = codigo.trim();
    if (!limpio) return;
    setBuscandoManual(true);
    const res = await obtenerDatosProductoSeguro(limpio);
    setBuscandoManual(false);

    const esVinilica = res.tipoPinturaId === 2;
    if (tipoPintura === "Vinílica" && !esVinilica) return alert("Producto de ESMALTES");
    if (tipoPintura === "Esmalte" && esVinilica) return alert("Producto de VINÍLICAS");

    setProducto({ ...res, envasados: res.envasados || [], procesos: res.procesos || [] });
    setCantidades({});
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargandoExcel(true);
    try {
      const dataRaw = await analizarExcel(file);
      const nuevasNormales = [];
      const nuevasEspeciales = [];

      for (const item of dataRaw) {
        if (!item.articulo) continue;
        const res = await obtenerDatosProductoSeguro(item.articulo);
        const lote = String(item.folio || "").toUpperCase();
        
        let tipoFinal = "";
        if (lote.startsWith("V")) tipoFinal = "Vinílica";
        else if (lote.startsWith("E") || lote.startsWith("S")) tipoFinal = "Esmalte";
        else tipoFinal = res.tipoPinturaId === 2 ? "Vinílica" : "Esmalte";

        const nueva = {
          idTemp: Date.now() + Math.random(),
          folio: item.folio || "S/F",
          codigoProducto: res.codigo,
          descripcion: res.descripcion,
          litros: parseFloat(item.litros) || 0,
          tipo: tipoFinal,
          nivelCubriente: res.poderCubriente || 0,
          procesos: res.procesos || [],
          detallesEnvasado: item.hijas ? item.hijas.map(h => ({ 
            cantidad: h.cantidad, formato: h.articulo.split('-')[0] 
          })) : [],
          operario: ""
        };

        if (CODIGOS_EXCLUIDOS.some(cod => normalizarCodigo(cod) === normalizarCodigo(res.codigo))) {
          nuevasEspeciales.push(nueva);
        } else {
          nuevasNormales.push(nueva);
        }
      }
      setColaCargas(prev => [...prev, ...nuevasNormales]);
      setCargasEspeciales(prev => [...prev, ...nuevasEspeciales]);
    } catch (err) { alert("Error al procesar Excel"); }
    finally { setCargandoExcel(false); }
  };

  const guardarCargasEnRondas = (cargasAGuardar) => {
    const idsAsignados = [];
    
    if (tipoPintura === "Esmalte") {
      let tempAsignadasEsmaltes = [...cargasEsmaltesAsignadas];
      cargasAGuardar.forEach((carga) => {
        const listaProcesos = (carga.procesos || []).map(p => p.descripcion.toUpperCase());
        const requiereIgualacion = listaProcesos.some(desc => desc.includes("IGUALACION") || desc.includes("TERMINACION"));
        const grupoCandidatos = requiereIgualacion ? IGUALADORES : PREPARADORES;
        const balance = grupoCandidatos.map(nombre => ({
          nombre, total: tempAsignadasEsmaltes.filter(c => c.operario === nombre).length + (nombre === "ALBERTO" ? 2 : 0)
        })).sort((a, b) => a.total - b.total);
        tempAsignadasEsmaltes.push({ ...carga, operario: balance[0].nombre, maquina: "ESM" });
        idsAsignados.push(carga.idTemp);
      });
      setCargasEsmaltesAsignadas([...tempAsignadasEsmaltes].sort((a,b) => (a.nivelCubriente||0)-(b.nivelCubriente||0)));
    } else {
      const nuevasRondas = [...rondas.map(f => [...f])];
      const nuevasEspeciales = [...cargasEspeciales];

      // --- LÓGICA DE FUSIÓN DE CÓDIGOS HERMANOS (3000 + 3000M) ---
      const gruposMap = new Map();
      cargasAGuardar.forEach(carga => {
        const base = carga.codigoProducto.endsWith("M") ? carga.codigoProducto.slice(0, -1) : carga.codigoProducto;
        if (!gruposMap.has(base)) {
          gruposMap.set(base, { ...carga, idOriginales: [carga.idTemp] });
        } else {
          const existente = gruposMap.get(base);
          existente.litros += carga.litros;
          existente.folio += ` / ${carga.folio}`;
          existente.idOriginales.push(carga.idTemp);
        }
      });

      const gruposAFusionar = Array.from(gruposMap.values());

      gruposAFusionar.forEach((cargaAgrupada) => {
        let asignada = false;
        for (let col = 0; col < 6 && !asignada; col++) {
          for (let fila = 0; fila < 8; fila++) {
            if (!nuevasRondas[fila][col]) {
              const numM = 101 + fila;
              const esGran = [104, 108].includes(numM);
              const l = cargaAgrupada.litros;
              const cumpleRegla = (l > 1600 && esGran) || 
                                  (l > 855 && l <= 1600 && (esGran || numM === 107)) || 
                                  (l <= 855 && !esGran && numM !== 107);
              if (cumpleRegla) {
                cargaAgrupada.operario = getOperarioPorMaquina(numM);
                nuevasRondas[fila][col] = { ...cargaAgrupada };
                asignada = true;
                cargaAgrupada.idOriginales.forEach(id => idsAsignados.push(id));
                break;
              }
            }
          }
        }
        if (!asignada) { 
          nuevasEspeciales.push(cargaAgrupada);
          cargaAgrupada.idOriginales.forEach(id => idsAsignados.push(id));
        }
      });
      setRondas(nuevasRondas);
      setCargasEspeciales([...nuevasEspeciales].sort((a,b) => (a.nivelCubriente||0)-(b.nivelCubriente||0)));
    }
    setColaCargas(prev => prev.filter(c => !idsAsignados.includes(c.idTemp)));
  };

  const totalLitrosActuales = producto 
    ? producto.envasados.reduce((acc, env) => acc + (cantidades[env.id] || 0) * litrosPorEnvasado(env.id), 0)
    : 0;

  return {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
    cargando: cargandoExcel, buscandoManual, totalLitrosActuales,
    consultar, handleImportExcel, guardarCargasEnRondas
  };
}