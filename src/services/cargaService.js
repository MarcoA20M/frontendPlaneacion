// src/services/cargaService.js
import axios from "axios";

const API_URL = "http://localhost:8080/api/cargas";

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
  
  // 🔴 IMPORTANTE: Mapear correctamente todos los campos, especialmente 'maquina'
  const datosNormalizados = response.data.map(reg => {
    // DEBUG: Ver qué viene del backend
    console.log("🔍 Registro original del backend:", {
      folio: reg.folio,
      maquina: reg.maquina,
      operario: reg.operario,
      tipo: reg.tipo
    });
    
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
      // 🔴 CLAVE: Asegurar que la máquina se captura correctamente
      maquina: reg.maquina ? String(reg.maquina) : "",
      fecha: reg.fecha,
      descripcion: reg.descripcion || "",
      poderCubriente: reg.poderCubriente || reg.nivelCubriente || 0,
      procesos: reg.procesos || []
    };
  });
  
  console.log("📦 Primer registro normalizado:", datosNormalizados[0]);
  console.log("   - maquina:", datosNormalizados[0]?.maquina);
  console.log("   - operario:", datosNormalizados[0]?.operario);
  
  return datosNormalizados;
};

export const obtenerCargasHoy = () => obtenerCargasPorFecha(new Date());

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
        conteoLotes: coincidencias.length
      };
    }

    return null;
  } catch (error) {
    console.error("Error en servicio:", error);
    return null;
  }
  
};


