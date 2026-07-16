import axios from "axios";
import API_URL from "../config/api"; // ajusta la ruta si tu config está en otro lugar

const PRODUCTOS_URL = `${API_URL}/productos`;
const ENVASADOS_URL = `${API_URL}/envasados`;

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