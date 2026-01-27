import axios from "axios";

const API_URL = "http://localhost:8080/api/productos";
const ENVASADOS_URL = "http://localhost:8080/api/envasados"; // La ruta de tu nuevo Controller

export const buscarProducto = async (codigo) => {
  const response = await axios.get(`${API_URL}/${codigo}`);
  return response.data;
};

export const productoService = {
  getProductosPorFamilia: async (familiaId) => {
    const res = await axios.get(`${API_URL}/familia/${familiaId}`);
    return res.data;
  },

  // ESTA ES LA FUNCIÓN QUE NECESITAS LLAMAR
  getEnvasadosPorProducto: async (productoId) => {
    const res = await axios.get(`${ENVASADOS_URL}/producto/${productoId}`);
    return res.data;
  }
};