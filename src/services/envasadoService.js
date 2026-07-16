// src/services/envasadoService.js
import axios from "axios";
import API_URL from "../config/api";

const ENVASADOS_URL = `${API_URL}/envasados`;

export const obtenerEnvasados = async () => {
  const response = await axios.get(ENVASADOS_URL);
  return response.data;
};

export const envasadoService = {
  obtenerEnvasados,
};