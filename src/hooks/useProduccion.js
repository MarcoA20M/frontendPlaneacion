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
  const [cargando, setCargando] = useState(false);

  const IGUALADORES = ["GASPAR", "ALBERTO", "PEDRO"];
  const PREPARADORES = ["GERMAN", "ALDO"];

  const normalizarCodigo = (cod) => {
    if (!cod) return "";
    const str = String(cod).trim();
    return str.replace(/^0+/, '') || "0";
  };

  const ordenarCargas = (lista) => [...lista].sort((a, b) => {
    const cubA = a.nivelCubriente || 0;
    const cubB = b.nivelCubriente || 0;
    if (cubA !== cubB) return cubA - cubB;
    return String(a.folio).localeCompare(String(b.folio), undefined, { numeric: true });
  });

  const totalLitrosActuales = producto 
    ? producto.envasados.reduce((acc, env) => acc + (cantidades[env.id] || 0) * litrosPorEnvasado(env.id), 0)
    : 0;

  const consultar = async () => {
    const limpio = codigo.trim();
    if (!limpio) return;
    try {
      const codigoLimpio = normalizarCodigo(limpio);
      const res = await buscarProducto(codigoLimpio);
      if (!res) return alert("Producto no encontrado");
      const esVinilica = res.tipoPinturaId === 2;
      if (tipoPintura === "Vinílica" && !esVinilica) return alert("Este producto no pertenece a Vinílicas");
      if (tipoPintura === "Esmalte" && esVinilica) return alert("Este producto no pertenece a Esmaltes");
      setProducto({ ...res, envasados: res.envasados || [], procesos: res.procesos || [] });
      setCantidades({});
    } catch (e) { alert("Error al conectar con el servidor"); }
  };

  const agregarCargaManual = () => {
    if (!producto || totalLitrosActuales === 0) return alert("Ingresa cantidades");
    const resumenEnvasados = producto.envasados
      .filter(env => (cantidades[env.id] || 0) > 0)
      .map(env => ({ 
        cantidad: cantidades[env.id], 
        formato: `${litrosPorEnvasado(env.id)}`.replace('.', '') 
      }));

    const nuevaCarga = {
      idTemp: Date.now() + Math.random(),
      folio: "MANUAL",
      codigoProducto: normalizarCodigo(producto.codigo),
      descripcion: producto.descripcion,
      litros: totalLitrosActuales,
      tipo: tipoPintura,
      nivelCubriente: producto.poderCubriente,
      detallesEnvasado: resumenEnvasados,
      procesos: producto.procesos || [],
      operario: ""
    };

    const esExcluido = CODIGOS_EXCLUIDOS.some(cod => normalizarCodigo(cod) === normalizarCodigo(producto.codigo));
    if (esExcluido) setCargasEspeciales(prev => ordenarCargas([...prev, nuevaCarga]));
    else setColaCargas(prev => ordenarCargas([...prev, nuevaCarga]));

    setCantidades({}); setProducto(null); setCodigo("");
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCargando(true);
    try {
      const dataRaw = await analizarExcel(file);
      const nuevasNormales = [];
      const nuevasEspeciales = [];
      for (const item of dataRaw) {
        if (!item.articulo) continue;
        const res = await buscarProducto(normalizarCodigo(item.articulo));
        if (res) {
          const tipoDetectado = res.tipoPinturaId === 2 ? "Vinílica" : "Esmalte";
          const nueva = {
            idTemp: Date.now() + Math.random(),
            folio: item.folio || "S/F",
            codigoProducto: res.codigo,
            descripcion: res.descripcion,
            litros: parseFloat(item.litros) || 0,
            tipo: tipoDetectado,
            nivelCubriente: res.poderCubriente,
            procesos: res.procesos || [],
            detallesEnvasado: item.hijas ? item.hijas.map(h => ({ 
              cantidad: h.cantidad, 
              formato: h.articulo.split('-')[0] 
            })) : [],
            operario: ""
          };
          if (CODIGOS_EXCLUIDOS.some(cod => normalizarCodigo(cod) === normalizarCodigo(res.codigo))) nuevasEspeciales.push(nueva);
          else nuevasNormales.push(nueva);
        }
      }
      setColaCargas(prev => ordenarCargas([...prev, ...nuevasNormales]));
      setCargasEspeciales(prev => ordenarCargas([...prev, ...nuevasEspeciales]));
    } catch (err) { alert("Error al procesar Excel"); }
    finally { setCargando(false); }
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

  return {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
    cargando, totalLitrosActuales,
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
  };
}