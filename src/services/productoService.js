import axios from "axios";

const API_URL = "http://localhost:8080/api/productos";
const ENVASADOS_URL = "http://localhost:8080/api/envasados";

export const buscarProducto = async (codigo) => {
  const response = await axios.get(`${API_URL}/${codigo}`);
  return response.data;
};

// ✅ NUEVO - Crear producto
export const crearProducto = async (producto) => {
  const response = await axios.post(`${API_URL}`, producto);
  return response.data;
};

// Actualizar producto - recibe el código original en la URL
export const actualizarProducto = async (codigoActual, producto) => {
  const response = await axios.put(`${API_URL}/${codigoActual}`, producto);
  return response.data;
};

export const productoService = {
  getProductosPorFamilia: async (familiaId) => {
    const res = await axios.get(`${API_URL}/familia/${familiaId}`);
    return res.data;
  },

  getEnvasadosPorProducto: async (productoId) => {
    const res = await axios.get(`${ENVASADOS_URL}/producto/${productoId}`);
    return res.data;
  },

  // ✅ Agregar al service
  crearProducto: crearProducto,
  actualizarProducto: actualizarProducto
};