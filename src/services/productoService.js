import axios from "axios";

const API_URL = "http://localhost:8080/api/productos";

export const buscarProducto = async (codigo) => {
  const response = await axios.get(`${API_URL}/${codigo}`);
  return response.data;



  
};


export const productoService = {
  getProductosPorFamilia: async (familiaId) => {
    const res = await axios.get(`${API_URL}/familia/${familiaId}`);
    return res.data;
  }
  };