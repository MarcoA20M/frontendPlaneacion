// src/services/materiaPrimaService.js
import API_URL from "../config/api";

// ✅ Usando la misma URL base que los otros servicios
const API_BASE_URL = `${API_URL}/materias-primas`;

export const materiaPrimaService = {
    // Obtener todas las materias primas
    listarTodas: async () => {
        try {
            const response = await fetch(API_BASE_URL);
            if (!response.ok) throw new Error("Error al obtener materias primas");
            return await response.json();
        } catch (error) {
            console.error("Error en listarTodas:", error);
            return [];
        }
    },

    // Obtener por tipo
    listarPorTipo: async (tipo) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tipo/${tipo}`);
            if (!response.ok) throw new Error("Error al obtener materias primas por tipo");
            return await response.json();
        } catch (error) {
            console.error("Error en listarPorTipo:", error);
            return [];
        }
    },

    // Obtener críticas
    listarCriticas: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/criticas`);
            if (!response.ok) throw new Error("Error al obtener materias primas críticas");
            return await response.json();
        } catch (error) {
            console.error("Error en listarCriticas:", error);
            return [];
        }
    },

    // Obtener resumen dashboard
    getResumenDashboard: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard/resumen`);
            if (!response.ok) throw new Error("Error al obtener resumen dashboard");
            return await response.json();
        } catch (error) {
            console.error("Error en getResumenDashboard:", error);
            return null;
        }
    },

    // Registrar compra
    registrarCompra: async (data) => {
        try {
            const response = await fetch(`${API_BASE_URL}/compra`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Error al registrar compra");
            }
            return await response.json();
        } catch (error) {
            console.error("Error en registrarCompra:", error);
            throw error;
        }
    }
};