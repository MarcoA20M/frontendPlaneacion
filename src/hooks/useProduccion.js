import { useState } from "react";
import { buscarProducto } from "../services/productoService";
import { analizarExcel } from "../services/excelService";
import { OPERARIOS, CODIGOS_EXCLUIDOS, litrosPorEnvasado } from "../constants/config";

export function useProduccion() {
  const [codigo, setCodigo] = useState("");
  const [producto, setProducto] = useState(null);
  const [cantidades, setCantidades] = useState({});
  const [colaCargas, setColaCargas] = useState([]);
  const [cargasEspeciales, setCargasEspeciales] = useState([]);
  const [tipoPintura, setTipoPintura] = useState("Vinílica");
  const [rondas, setRondas] = useState(Array.from({ length: 8 }, () => Array(6).fill(null)));
  const [cargando, setCargando] = useState(false);

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
    if (!codigo.trim()) return;
    try {
      const res = await buscarProducto(codigo.trim());
      if (!res) return alert("Producto no encontrado");
      if (tipoPintura === "Vinílica" && res.tipoPinturaId !== 2) return alert("Este producto no pertenece a Vinílicas");
      if (tipoPintura === "Esmalte" && res.tipoPinturaId === 2) return alert("Este producto no pertenece a Esmaltes");
      
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
      tipo: tipoPintura,
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
        const res = await buscarProducto(item.articulo.trim());
        const esVinilicaValida = tipoPintura === "Vinílica" && res?.tipoPinturaId === 2;
        const esEsmalteValido = tipoPintura === "Esmalte" && res?.tipoPinturaId !== 2;

        if (res && (esVinilicaValida || esEsmalteValido)) {
          const nueva = {
            folio: item.folio || "S/F",
            codigoProducto: res.codigo,
            descripcion: res.descripcion,
            litros: parseFloat(item.litros) || 0,
            tipo: tipoPintura,
            nivelCubriente: res.poderCubriente,
            detallesEnvasado: item.hijas.map(h => ({ cantidad: h.cantidad, formato: h.articulo.split('-')[0] })),
            operario: ""
          };
          if (CODIGOS_EXCLUIDOS.includes(String(res.codigo))) nuevasEspeciales.push(nueva);
          else nuevasNormales.push(nueva);
        }
      }
      setColaCargas(ordenarCargas([...colaCargas, ...nuevasNormales]));
      setCargasEspeciales(ordenarCargas([...cargasEspeciales, ...nuevasEspeciales]));
    } catch (err) { alert("Error al procesar Excel"); }
    finally { setCargando(false); e.target.value = null; }
  };

  const guardarCargasEnRondas = (cargasAGuardar) => {
    const nuevasRondas = [...rondas.map(f => [...f])];
    const nuevasEspeciales = [...cargasEspeciales];

    cargasAGuardar.forEach((carga) => {
      let asignada = false;

      if (CODIGOS_EXCLUIDOS.includes(String(carga.codigoProducto))) {
        nuevasEspeciales.push(carga);
        return;
      }

      if (carga.tipo === "Esmalte") {
        for (let col = 0; col < 6 && !asignada; col++) {
          for (let fila = 0; fila < 8 && !asignada; fila++) {
            if (!nuevasRondas[fila][col]) {
              // CORRECCIÓN: Asignar operario de la fila para el reporte
              carga.operario = OPERARIOS[101 + fila];
              nuevasRondas[fila][col] = carga;
              asignada = true;
            }
          }
        }
      } 
      else {
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
              nuevasRondas[fila][col] = carga;
              asignada = true;
            }
          }
        }
      }

      if (!asignada) nuevasEspeciales.push(carga);
    });

    setRondas(nuevasRondas);
    setCargasEspeciales(ordenarCargas(nuevasEspeciales));
    setColaCargas([]);
  };

  return {
    codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, 
    cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
    rondas, setRondas, cargando, totalLitrosActuales,
    consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas, ordenarCargas
  };
}