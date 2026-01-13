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

  const CODIGOS_BASES = ["BBE20", "BBE30", "BAL40", "BNE10", "BSP10"];
  const IGUALADORES = ["Gaspar", "Alberto", "Pedro"];

  const normalizarCodigo = (cod) => {
    if (!cod) return "";
    return String(cod).trim().toUpperCase().replace(/^0+/, '') || "0";
  };

  // --- CORRECCIÓN: Lógica de litros incluyendo el 500 (0.5) ---
  const extraerLitrosDeArticulo = (articuloCompleto) => {
    if (!articuloCompleto) return 0;
    const partes = String(articuloCompleto).split('-');
    const prefijoCapacidad = partes[0].replace(/^0+/, ''); 

    switch (prefijoCapacidad) {
      case "19": return 19;
      case "4":  return 4;
      case "1":  return 1;
      case "500": return 0.5; // Corregido a 0.5 exacto
      default:
        const num = parseFloat(prefijoCapacidad);
        return isNaN(num) ? 0 : num;
    }
  };

  const ordenarCargas = (lista) => [...lista].sort((a, b) => {
    const cubA = a.nivelCubriente || 0;
    const cubB = b.nivelCubriente || 0;
    if (cubA !== cubB) return cubA - cubB;
    return String(a.folio).localeCompare(String(b.folio), undefined, { numeric: true });
  });

  const enriquecerConPlanificador = (datosProducto) => {
    const planificadorRaw = localStorage.getItem("planificador_data");
    if (!planificadorRaw) return datosProducto;

    const planificador = JSON.parse(planificadorRaw);
    const codNormalizado = normalizarCodigo(datosProducto.codigo);

    const coincidencias = (planificador.data || []).filter(item => {
        const partes = String(item.articulo).split('-');
        const colorEnArticulo = partes.length > 1 ? normalizarCodigo(partes[1]) : "";
        return colorEnArticulo === codNormalizado || normalizarCodigo(item.color) === codNormalizado;
    });

    return {
      ...datosProducto,
      datosPlanificador: coincidencias,
      salidas: coincidencias[0]?.salidas || 0,
      existencia: coincidencias[0]?.existencia || 0,
      alcance: coincidencias[0]?.alcance || 0
    };
  };

  const obtenerDatosProductoSeguro = async (codOriginal) => {
    const codLimpio = normalizarCodigo(codOriginal);
    let datosFinales = null;
    try {
      try { datosFinales = await buscarProducto(codLimpio); } catch (e) { datosFinales = null; }
      if (!datosFinales && codLimpio.endsWith("M")) {
        const codBase = codLimpio.slice(0, -1);
        let datosBase = await buscarProducto(codBase);
        if (datosBase) {
          datosFinales = { ...datosBase, codigo: codLimpio, descripcion: datosBase.descripcion + " (Maquila)" };
        }
      }
    } catch (error) { console.error(error); }

    if (!datosFinales) {
      datosFinales = {
        codigo: codLimpio,
        descripcion: codLimpio.endsWith("M") ? "Maquila Desconocida" : "Producto no Registrado",
        poderCubriente: 0,
        tipoPinturaId: tipoPintura === "Vinílica" ? 2 : 1,
        envasados: [], procesos: []
      };
    }
    return enriquecerConPlanificador(datosFinales);
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
    
    const nuevasCantidades = {};
    if (res.datosPlanificador && res.datosPlanificador.length > 0) {
      res.envasados.forEach(env => {
        const capSistema = litrosPorEnvasado(env.id);
        const match = res.datosPlanificador.find(d => {
            const capPlanificador = extraerLitrosDeArticulo(d.articulo);
            return Math.abs(capPlanificador - capSistema) < 0.1;
        });
        if (match) nuevasCantidades[env.id] = Number(match.piezas || match.cantidad || 0);
      });
    }
    setProducto({ ...res, envasados: res.envasados || [], procesos: res.procesos || [] });
    setCantidades(nuevasCantidades);
  };

  const totalLitrosActuales = producto 
    ? producto.envasados.reduce((acc, env) => acc + (cantidades[env.id] || 0) * litrosPorEnvasado(env.id), 0) 
    : 0;

  const handleImportExcel = async (e, soloRetornar = false) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!soloRetornar) setCargandoExcel(true);
    try {
      const dataRaw = await analizarExcel(file);
      const todasProcesadas = [];
      for (const item of dataRaw) {
        if (!item.articulo) continue;
        const res = await obtenerDatosProductoSeguro(item.articulo);
        const lote = String(item.folio || "").toUpperCase();
        let tipoFinal = lote.startsWith("V") ? "Vinílica" : (lote.startsWith("E") || lote.startsWith("S") ? "Esmalte" : (res.tipoPinturaId === 2 ? "Vinílica" : "Esmalte"));
        const nueva = {
          idTemp: Date.now() + Math.random(),
          folio: item.folio || "S/F",
          codigoProducto: res.codigo,
          descripcion: res.descripcion,
          litros: parseFloat(item.litros) || 0,
          tipo: tipoFinal,
          nivelCubriente: res.poderCubriente || 0,
          procesos: res.procesos || [],
          detallesEnvasado: item.hijas ? item.hijas.map(h => ({ cantidad: h.cantidad, formato: h.articulo.split('-')[0] })) : [],
          operario: "",
          planificador: { datosPlanificador: res.datosPlanificador || [], salidas: res.salidas || 0, existencia: res.existencia || 0, alcance: res.alcance || 0 }
        };
        todasProcesadas.push(nueva);
      }
      if (soloRetornar) return todasProcesadas;
      setColaCargas(prev => ordenarCargas([...prev, ...todasProcesadas.filter(c => !CODIGOS_EXCLUIDOS.some(ex => normalizarCodigo(ex) === normalizarCodigo(c.codigoProducto)))]));
      setCargasEspeciales(prev => ordenarCargas([...prev, ...todasProcesadas.filter(c => CODIGOS_EXCLUIDOS.some(ex => normalizarCodigo(ex) === normalizarCodigo(c.codigoProducto)))]));
    } catch (err) { alert("Error al procesar Excel"); }
    finally { if (!soloRetornar) setCargandoExcel(false); }
  };

  const agregarCargaManual = () => {
    if (!producto) return;
    const nuevaCarga = {
      idTemp: Date.now() + Math.random(),
      folio: "MANUAL",
      codigoProducto: producto.codigo,
      descripcion: producto.descripcion,
      litros: totalLitrosActuales || 0,
      tipo: tipoPintura,
      nivelCubriente: producto.poderCubriente,
      detallesEnvasado: producto.envasados.filter(env => (cantidades[env.id] || 0) > 0).map(env => ({ cantidad: cantidades[env.id], formato: `${litrosPorEnvasado(env.id)}`.replace('.', '') })),
      procesos: producto.procesos || [],
      operario: "",
      planificador: { datosPlanificador: producto.datosPlanificador || [], salidas: producto.salidas || 0, existencia: producto.existencia || 0, alcance: producto.alcance || 0 }
    };
    if (CODIGOS_EXCLUIDOS.some(cod => normalizarCodigo(cod) === normalizarCodigo(producto.codigo))) setCargasEspeciales(prev => ordenarCargas([...prev, nuevaCarga]));
    else setColaCargas(prev => ordenarCargas([...prev, nuevaCarga]));
    setCantidades({}); setProducto(null); setCodigo("");
  };


const actualizarOperarioEsmalte = (idTemp, nuevoOperario) => {
    setCargasEsmaltesAsignadas(prev => 
        prev.map(c => c.idTemp === idTemp ? { ...c, operario: nuevoOperario } : c)
    );
};

  
  // --- RESTAURADO: Lógica de Operarios para Vinílicas y Esmaltes ---
  const guardarCargasEnRondas = (cargasAGuardar) => {
    const idsAsignados = [];
    if (tipoPintura === "Esmalte") {
      let tempAsignadasEsmaltes = [...cargasEsmaltesAsignadas];
      cargasAGuardar.forEach((carga) => {
        const listaProcesos = (carga.procesos || []).map(p => p.descripcion.toUpperCase());
        const codigoUpper = normalizarCodigo(carga.codigoProducto);
        
        const esBase = CODIGOS_BASES.includes(codigoUpper) || codigoUpper.startsWith("B");
        const tieneMolienda = listaProcesos.some(d => d.includes("MOLIENDA"));
        const tienePreparado = listaProcesos.some(d => d.includes("PREPARADO") || d.includes("DISPERSION"));
        const tieneEtapaFinal = listaProcesos.some(d => d.includes("IGUALACIÓN") || d.includes("IGUALACION") || d.includes("TERMINADO") || d.includes("AJUSTE"));
        
        let ops = [];
        if (esBase) ops.push("Aldo"); 
        else if (tieneMolienda) ops.push("Germán"); 
        else if (tienePreparado) ops.push("Aldo");

        if (tieneEtapaFinal || ops.length === 0) {
          const candidatos = (tieneMolienda || tienePreparado || esBase) ? ["Gaspar", "Pedro"] : IGUALADORES;
          const balance = candidatos.map(n => ({ n, t: tempAsignadasEsmaltes.filter(c => c.operario.includes(n)).length + (n === "Alberto" ? 3 : 0) })).sort((a, b) => a.t - b.t);
          if (!ops.includes(balance[0].n)) ops.push(balance[0].n);
        }
        tempAsignadasEsmaltes.push({ ...carga, operario: ops.join(" / "), maquina: "ESM" });
        idsAsignados.push(carga.idTemp);
      });
      setCargasEsmaltesAsignadas(ordenarCargas(tempAsignadasEsmaltes));
    } else {
      const nuevasRondas = [...rondas.map(f => [...f])];
      const nuevasEspeciales = [...cargasEspeciales];
      cargasAGuardar.forEach((carga) => {
        let asignada = false;
        for (let col = 0; col < 6 && !asignada; col++) {
          for (let fila = 0; fila < 8; fila++) {
            if (!nuevasRondas[fila][col]) {
              const numM = 101 + fila;
              const esGran = [104, 108].includes(numM);
              const cumpleRegla = (carga.litros > 1600 && esGran) || (carga.litros > 855 && carga.litros <= 1600 && (esGran || numM === 107)) || (carga.litros <= 855 && !esGran && numM !== 107);
              if (cumpleRegla) {
                carga.operario = getOperarioPorMaquina(numM);
                nuevasRondas[fila][col] = { ...carga }; asignada = true; idsAsignados.push(carga.idTemp); break;
              }
            }
          }
        }
        if (!asignada) { nuevasEspeciales.push(carga); idsAsignados.push(carga.idTemp); }
      });
      setRondas(nuevasRondas); setCargasEspeciales(ordenarCargas(nuevasEspeciales));
    }
    setColaCargas(prev => prev.filter(c => !idsAsignados.includes(c.idTemp)));
  };

  return {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
    cargando: cargandoExcel, buscandoManual, totalLitrosActuales,
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas,
    actualizarOperarioEsmalte
  };
}