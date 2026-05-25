import { API_URL } from "../constants/config";

export const analizarExcel = async (file) => {
  const formData = new FormData();
  formData.append('excel', file);
  const response = await fetch(`${API_URL}/analyze-excel`, { method: 'POST', body: formData });
  return await response.json();
};

export const exportarReporte = async (cargas) => {
  const response = await fetch(`${API_URL}/generate-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cargas })
  });

  // Obtenemos la fecha actual en formato DD-MM-YYYY
  const fecha = new Date();
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();
  const fechaFormateada = `${mes}-${dia}-${anio}`;

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // AQUÍ ES DONDE CAMBIAMOS EL NOMBRE:
  link.download = `Control de la producción ${fechaFormateada}.xlsx`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};