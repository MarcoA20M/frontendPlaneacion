// src/services/materiaPrimaService.js
const API_URL = "http://localhost:8080/api/materias-primas";

export const materiaPrimaService = {
    // Obtener todas las materias primas
    listarTodas: async () => {
        const response = await fetch(API_URL);
        return response.json();
    },

    // Obtener por tipo
    listarPorTipo: async (tipo) => {
        const response = await fetch(`${API_URL}/tipo/${tipo}`);
        return response.json();
    },

    // Obtener críticas
    listarCriticas: async () => {
        const response = await fetch(`${API_URL}/criticas`);
        return response.json();
    },

    // Obtener resumen dashboard
    getResumenDashboard: async () => {
        const response = await fetch(`${API_URL}/dashboard/resumen`);
        return response.json();
    },

    // Registrar compra
    registrarCompra: async (data) => {
        const response = await fetch(`${API_URL}/compra`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }
};