import axios from "axios";

const API_URL = "http://localhost:8080/api/cargas";

export const registrarCarga = (cargas) =>
  axios.post(API_URL, cargas).then((res) => res.data);
