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
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reporte_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`;
  link.click();
};