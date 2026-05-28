// src/services/envasadoService.js
import axios from "axios";

const ENVASADOS_URL = "http://localhost:8080/api/envasados";

export const obtenerEnvasados = async () => {
  const response = await axios.get(`${ENVASADOS_URL}`);
  return response.data;
};

export const envasadoService = {
  obtenerEnvasados,
};