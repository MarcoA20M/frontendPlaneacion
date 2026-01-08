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
      // 1. Intentar búsqueda directa
      try {
        datosFinales = await buscarProducto(codLimpio);
      } catch (e) { datosFinales = null; }

      // 2. Si no existe y es Maquila (termina en M), buscamos el base para heredar PODER CUBRIENTE
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
            descripcion: datosBase.descripcion + " (MAQUILA)",
            // Mantenemos el poderCubriente y procesos del padre
          };
        }
      }
    } catch (error) { console.error("Error en búsqueda"); }

    if (!datosFinales) {
      datosFinales = {
        codigo: codLimpio,
        descripcion: codLimpio.endsWith("M") ? "MAQUILA DESCONOCIDA" : "PRODUCTO NO REGISTRADO",
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
        
        // 1. Buscamos los datos técnicos (incluye poder cubriente heredado de M)
        const res = await obtenerDatosProductoSeguro(item.articulo);
        
        // 2. Determinamos el tipo por el lote (V, E, S)
        const lote = String(item.folio || "").toUpperCase();
        let tipoFinal = "";
        if (lote.startsWith("V")) tipoFinal = "Vinílica";
        else if (lote.startsWith("E") || lote.startsWith("S")) tipoFinal = "Esmalte";
        else tipoFinal = res.tipoPinturaId === 2 ? "Vinílica" : "Esmalte";

        // 3. Creamos la carga asegurando que "nivelCubriente" venga de la BD
        const nueva = {
          idTemp: Date.now() + Math.random(),
          folio: item.folio || "S/F",
          codigoProducto: res.codigo,
          descripcion: res.descripcion,
          litros: parseFloat(item.litros) || 0,
          tipo: tipoFinal,
          nivelCubriente: res.poderCubriente || 0, // AQUI RECUPERAMOS EL PODER CUBRIENTE
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
      setColaCargas(prev => [...prev, ...nuevasNormales]); // Ordenaremos al final
      setCargasEspeciales(prev => [...prev, ...nuevasEspeciales]);
    } catch (err) { alert("Error al procesar Excel"); }
    finally { setCargandoExcel(false); }
  };

  // ... (Resto de funciones: agregarCargaManual, guardarCargasEnRondas, ordenarCargas se mantienen igual)
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
        const requiereIgualacion = listaProcesos.some(desc => desc.includes("IGUALACION") || desc.includes("TERMINACION"));
        const grupoCandidatos = requiereIgualacion ? IGUALADORES : PREPARADORES;
        const balance = grupoCandidatos.map(nombre => ({
          nombre, total: tempAsignadasEsmaltes.filter(c => c.operario === nombre).length + (nombre === "ALBERTO" ? 2 : 0)
        })).sort((a, b) => a.total - b.total);
        tempAsignadasEsmaltes.push({ ...carga, operario: balance[0].nombre, maquina: "ESM" });
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