import axios from "axios";
import API_URL_BASE from "../config/api";

const API_URL = `${API_URL_BASE}/cargas`;

export const registrarCarga = (cargas) =>
  axios.post(API_URL, cargas).then((res) => res.data);

export const eliminarCarga = (id) =>
  axios.delete(`${API_URL}/${id}`).then((res) => res.data);

export const obtenerCargasPorFecha = async (fechaInput) => {
  let fechaFormateada;

  if (fechaInput instanceof Date) {
    const year = fechaInput.getFullYear();
    const month = String(fechaInput.getMonth() + 1).padStart(2, '0');
    const day = String(fechaInput.getDate()).padStart(2, '0');
    fechaFormateada = `${year}-${month}-${day}`;
  } else {
    fechaFormateada = fechaInput.split('T')[0];
  }
  
  const response = await axios.get(`${API_URL}/fecha`, {
    params: { fecha: fechaFormateada }
  });
  
  const datosNormalizados = response.data.map(reg => {
    return {
      id: reg.id,
      producto: reg.producto || reg.producto_id,
      producto_id: reg.producto_id || reg.producto,
      envasadoId: reg.envasadoId || reg.envasado_id || reg.envasado,
      envasado_id: reg.envasado_id || reg.envasadoId,
      cantidad: reg.cantidad,
      litros: reg.litros,
      tipo: reg.tipo,
      folio: reg.folio,
      folioHija: reg.folioHija || reg.folio_hija,
      operario: reg.operario || "",
      maquina: reg.maquina ? String(reg.maquina) : "",
      fecha: reg.fecha,
      descripcion: reg.descripcion || "",
      poderCubriente: reg.poderCubriente || reg.nivelCubriente || 0,
      procesos: reg.procesos || [],
      // Guardar el envasado original para obtener el formato
      envasado: reg.envasado || reg.envasado_id
    };
  });
  
  return datosNormalizados;
};

export const obtenerCargasHoy = () => obtenerCargasPorFecha(new Date());

// Función para obtener el formato desde el envasado_id
const obtenerFormatoDesdeEnvasado = (envasadoId) => {
  // Mapeo de envasado_id a formato en litros
  // Ajusta estos valores según tu base de datos
  const formatoMap = {
    '1': 0.25,
    '2': 0.5,
    '3': 0.75,
    '4': 1,
    '5': 4,
    '6': 19,
    // Si usas números directamente
    '0.25': 0.25,
    '0.5': 0.5,
    '0.75': 0.75,
    '1': 1,
    '4': 4,
    '19': 19
  };
  
  return formatoMap[envasadoId] || 1; // 1L por defecto
};

export const verificarCargaReciente = async (codigo, envasadoId) => {
  const fechas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    fechas.push(d.toISOString().split("T")[0]);
  }

  try {
    const promesas = fechas.map((f) => obtenerCargasPorFecha(f));
    const resultados = await Promise.all(promesas);
    const todas = resultados.flat();

    const coincidencias = todas.filter((reg) => {
      const regProducto = reg.producto || reg.producto_id;
      const regEnvasado = reg.envasadoId || reg.envasado_id;
      
      const match = Number(regProducto) === Number(codigo) && 
                    Number(regEnvasado) === Number(envasadoId);
      
      return match;
    });

    if (coincidencias.length > 0) {
      return {
        existe: true,
        fecha: coincidencias[0].fecha,
        folios: coincidencias.map((c) => c.folioHija || c.folio_hija || c.folio).join(", "),
        operarios: [...new Set(coincidencias.map((c) => c.operario))].join(", "),
        total: coincidencias.reduce((acc, curr) => acc + Number(curr.cantidad || 0), 0),
        conteoLotes: coincidencias.length,
        // Guardar todos los registros para poder consultar individualmente
        registros: coincidencias
      };
    }

    return null;
  } catch (error) {
    console.error("Error en servicio:", error);
    return null;
  }
};

// NUEVA FUNCIÓN: Obtener datos específicos de un folio individual con formato
export const verificarCargaPorFolio = async (folio, codigo) => {
  try {
    // Buscar en los últimos 7 días
    const fechas = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      fechas.push(d.toISOString().split("T")[0]);
    }

    const promesas = fechas.map((f) => obtenerCargasPorFecha(f));
    const resultados = await Promise.all(promesas);
    const todas = resultados.flat();

    // Buscar el registro específico por folio y código de producto
    const registro = todas.find((reg) => {
      const folioRegistro = reg.folioHija || reg.folio_hija || reg.folio;
      const regProducto = reg.producto || reg.producto_id;
      return folioRegistro === folio && Number(regProducto) === Number(codigo);
    });

    if (registro) {
      // Obtener el formato del envasado
      const envasadoId = registro.envasadoId || registro.envasado_id || registro.envasado;
      const formato = obtenerFormatoDesdeEnvasado(envasadoId);
      const cantidad = Number(registro.cantidad || 0);
      
      return {
        folio: registro.folioHija || registro.folio_hija || registro.folio,
        codigoProducto: registro.producto || registro.producto_id,
        cantidad: cantidad,
        litros: formato * cantidad, // Calcular litros totales
        formato: formato,
        operario: registro.operario || "No asignado",
        maquina: registro.maquina || "",
        fecha: registro.fecha,
        tipo: registro.tipo,
        envasadoId: envasadoId,
        detallesEnvasado: [
          {
            formato: formato,
            cantidad: cantidad,
            articulo: `${String(formato).padStart(3, '0')}-${registro.producto || registro.producto_id}`
          }
        ]
      };
    }

    return null;
  } catch (error) {
    console.error("Error en verificarCargaPorFolio:", error);
    return null;
  }
};