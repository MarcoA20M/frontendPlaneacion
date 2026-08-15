// services/productoService.js
import axios from "axios";
// ⭐ IMPORTAR DESDE CONFIG.JS
import { BACKEND_API_URL } from "../constants/config";

// ⭐ CONSTRUIR URLS CON BACKEND_API_URL
const PRODUCTOS_URL = `${BACKEND_API_URL}/productos`;
const ENVASADOS_URL = `${BACKEND_API_URL}/envasados`;

// ===============================
// PRODUCTOS
// ===============================

export const buscarProducto = async (codigo) => {
  const response = await axios.get(`${PRODUCTOS_URL}/${codigo}`);
  return response.data;
};

export const crearProducto = async (producto) => {
  const response = await axios.post(PRODUCTOS_URL, producto);
  return response.data;
};

export const actualizarProducto = async (codigoActual, producto) => {
  const response = await axios.put(`${PRODUCTOS_URL}/${codigoActual}`, producto);
  return response.data;
};

// Listar todos los productos
export const listarProductos = async () => {
  const response = await axios.get(PRODUCTOS_URL);
  return response.data;
};

// ===============================
// SERVICE OBJECT
// ===============================

export const productoService = {
  getProductosPorFamilia: async (familiaId) => {
    const res = await axios.get(`${PRODUCTOS_URL}/familia/${familiaId}`);
    return res.data;
  },

  getEnvasadosPorProducto: async (productoId) => {
    const res = await axios.get(`${ENVASADOS_URL}/producto/${productoId}`);
    return res.data;
  },

  crearProducto: crearProducto,

  actualizarProducto: actualizarProducto,

  listarTodos: async () => {
    const response = await axios.get(PRODUCTOS_URL);
    return response.data;
  }
};

export default productoService;