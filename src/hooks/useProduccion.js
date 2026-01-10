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

  // --- CONFIGURACIÓN DE PERSONAL ---
  const IGUALADORES = ["Gaspar", "Alberto", "Pedro"];
  const CODIGOS_BASES = ["BBE20", "BBE30", "BAL40", "BNE10", "BSP10"];

  const normalizarCodigo = (cod) => {
    if (!cod) return "";
    return String(cod).trim().toUpperCase().replace(/^0+/, '') || "0";
  };

  const obtenerDatosProductoSeguro = async (codOriginal) => {
    const codLimpio = normalizarCodigo(codOriginal);
    let datosFinales = null;

    try {
      try {
        datosFinales = await buscarProducto(codLimpio);
      } catch (e) { datosFinales = null; }

      if (!datosFinales && codLimpio.endsWith("M")) {
        const codBase = codLimpio.slice(0, -1);
        let datosBase = null;
        try {
          datosBase = await buscarProducto(codBase);
          if (!datosBase) datosBase = await buscarProducto("0" + codBase);
        } catch (e) { datosBase = null; }

        if (datosBase) {
          datosFinales = {
            ...datosBase,
            codigo: codLimpio,
            descripcion: datosBase.descripcion + " (Maquila)",
          };
        }
      }
    } catch (error) { console.error("Error en búsqueda"); }

    if (!datosFinales) {
      datosFinales = {
        codigo: codLimpio,
        descripcion: codLimpio.endsWith("M") ? "Maquila Desconocida" : "Producto no Registrado",
        poderCubriente: 0,
        tipoPinturaId: tipoPintura === "Vinílica" ? 2 : 1,
        envasados: [],
        procesos: []
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
            cantidad: h.cantidad,
            formato: h.articulo.split('-')[0]
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

  const ordenarCargas = (lista) => [...lista].sort((a, b) => {
    const cubA = a.nivelCubriente || 0;
    const cubB = b.nivelCubriente || 0;
    if (cubA !== cubB) return cubA - cubB;
    return String(a.folio).localeCompare(String(b.folio), undefined, { numeric: true });
  });

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
      detallesEnvasado: producto.envasados
        .filter(env => (cantidades[env.id] || 0) > 0)
        .map(env => ({ cantidad: cantidades[env.id], formato: `${litrosPorEnvasado(env.id)}`.replace('.', '') })),
      procesos: producto.procesos || [],
      operario: ""
    };
    if (CODIGOS_EXCLUIDOS.some(cod => normalizarCodigo(cod) === normalizarCodigo(producto.codigo))) setCargasEspeciales(prev => ordenarCargas([...prev, nuevaCarga]));
    else setColaCargas(prev => ordenarCargas([...prev, nuevaCarga]));
    setCantidades({}); setProducto(null); setCodigo("");
  };

  const guardarCargasEnRondas = (cargasAGuardar) => {
    const idsAsignados = [];
    
    if (tipoPintura === "Esmalte") {
      let tempAsignadasEsmaltes = [...cargasEsmaltesAsignadas];

      cargasAGuardar.forEach((carga) => {
        const listaProcesos = (carga.procesos || []).map(p => p.descripcion.toUpperCase());
        const codigoUpper = normalizarCodigo(carga.codigoProducto);
        
        // --- DETECCIÓN DE ETAPAS ---
        const esBase = CODIGOS_BASES.includes(codigoUpper) || codigoUpper.startsWith("B");
        const tieneMolienda = listaProcesos.some(d => d.includes("MOLIENDA"));
        const tienePreparado = listaProcesos.some(d => d.includes("PREPARADO") || d.includes("DISPERSION"));
        const tieneEtapaFinal = listaProcesos.some(d =>
          d.includes("IGUALACIÓN") || d.includes("IGUALACION") || d.includes("TERMINADO") || d.includes("AJUSTE")
        );

        let operariosAsignados = [];

        // 1. ASIGNACIÓN DE INICIO (Aldo, Germán o Pedro)
        if (esBase) {
          operariosAsignados.push("Aldo"); // Las bases siempre las hace Aldo
        } else if (tieneMolienda) {
          operariosAsignados.push("Germán");
        } else if (tienePreparado) {
          operariosAsignados.push("Aldo"); // Aldo también hace el preparado normal
        }

        // 2. ASIGNACIÓN FINAL (Igualadores)
        if (tieneEtapaFinal || operariosAsignados.length === 0) {
          // Si es carga larga (molienda o preparado) o es una BASE, Alberto NO iguala
          const esCargaCompleja = tieneMolienda || tienePreparado || esBase;
          const candidatos = esCargaCompleja ? ["Gaspar", "Pedro"] : IGUALADORES;

          const balance = candidatos.map(nombre => {
            const conteoActual = tempAsignadasEsmaltes.filter(c => c.operario.includes(nombre)).length;
            const handicap = (nombre === "Alberto") ? 3 : 0;
            return { nombre, total: conteoActual + handicap };
          }).sort((a, b) => a.total - b.total);

          const elegido = balance[0].nombre;
          
          if (!operariosAsignados.includes(elegido)) {
            operariosAsignados.push(elegido);
          }
        }

        const operarioFinal = operariosAsignados.join(" / ");
        tempAsignadasEsmaltes.push({ ...carga, operario: operarioFinal, maquina: "ESM" });
        idsAsignados.push(carga.idTemp);
      });

      setCargasEsmaltesAsignadas(ordenarCargas(tempAsignadasEsmaltes));

    } else {
      // --- LÓGICA DE VINÍLICAS ---
      const nuevasRondas = [...rondas.map(f => [...f])];
      const nuevasEspeciales = [...cargasEspeciales];
      
      cargasAGuardar.forEach((carga) => {
        let asignada = false;
        for (let col = 0; col < 6 && !asignada; col++) {
          for (let fila = 0; fila < 8; fila++) {
            if (!nuevasRondas[fila][col]) {
              const numM = 101 + fila;
              const esGran = [104, 108].includes(numM);
              const cumpleRegla = (carga.litros > 1600 && esGran) ||
                                  (carga.litros > 855 && carga.litros <= 1600 && (esGran || numM === 107)) ||
                                  (carga.litros <= 855 && !esGran && numM !== 107);
              if (cumpleRegla) {
                carga.operario = getOperarioPorMaquina(numM);
                nuevasRondas[fila][col] = { ...carga };
                asignada = true;
                idsAsignados.push(carga.idTemp);
                break;
              }
            }
          }
        }
        if (!asignada) { nuevasEspeciales.push(carga); idsAsignados.push(carga.idTemp); }
      });
      setRondas(nuevasRondas);
      setCargasEspeciales(ordenarCargas(nuevasEspeciales));
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
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
  };
}