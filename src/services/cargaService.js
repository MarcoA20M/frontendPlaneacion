import axios from "axios";

const API_URL = "http://localhost:8080/api/cargas";

// ✅ REGISTRAR: Envía la lista de cargas y recibe los lotes generados
export const registrarCarga = (cargas) =>
  axios.post(API_URL, cargas).then((res) => res.data);

// ✅ ELIMINAR: Llama al reacomodo en el Backend
export const eliminarCarga = (id) =>
  axios.delete(`${API_URL}/${id}`).then((res) => res.data);

// ✅ CONSULTAR POR FECHA: Trae lo guardado en una fecha específica
// Si no se envía fecha, por defecto intenta traer lo de hoy
export const obtenerCargasPorFecha = (fechaInput) => {
  let fechaFormateada;

  if (fechaInput instanceof Date) {
    // Extraer componentes locales manualmente
    const year = fechaInput.getFullYear();
    const month = String(fechaInput.getMonth() + 1).padStart(2, '0');
    const day = String(fechaInput.getDate()).padStart(2, '0');
    fechaFormateada = `${year}-${month}-${day}`;
  } else {
    // Si ya es un string "YYYY-MM-DD", lo usamos directo
    fechaFormateada = fechaInput.split('T')[0];
  }
  
  return axios.get(`${API_URL}/fecha`, {
    params: { fecha: fechaFormateada }
  }).then((res) => res.data);
};

// Mantenemos obtenerCargasHoy como un alias por si lo usas en otro lado
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

    console.log("--- DEBUG BASE DE DATOS ---");
    console.log("Total registros traídos:", todas.length);
    console.log("Buscando Producto:", codigo, "| Envasado ID:", envasadoId);

   const coincidencias = todas.filter((reg) => {
  // Obtenemos los valores de la BD
  const regProducto = reg.producto || reg.producto_id;
  const regEnvasado = reg.envasado || reg.envasado_id;
  
  // Comparamos convirtiendo a Número para evitar el problema de "004" vs "4"
  const match = Number(regProducto) === Number(codigo) && 
                Number(regEnvasado) === Number(envasadoId);
  
  return match;
});

    if (coincidencias.length > 0) {
      console.log("✅ Coincidencias encontradas:", coincidencias);
      return {
        existe: true,
        fecha: coincidencias[0].fecha,
        // Usamos folioHija (camelCase) como viste en tu consola
        folios: coincidencias.map((c) => c.folioHija || c.folio_hija || c.folio).join(", "),
        operarios: [...new Set(coincidencias.map((c) => c.operario))].join(", "),
        total: coincidencias.reduce((acc, curr) => acc + Number(curr.cantidad || 0), 0),
        conteoLotes: coincidencias.length
      };
    }

    console.log("❌ No hubo coincidencias exactas.");
    return null;
  } catch (error) {
    console.error("Error en servicio:", error);
    return null;
  }
};