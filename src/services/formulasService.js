// src/services/formulasService.js
const API_URL = "http://localhost:8080/api/formulas";

export const formulasService = {
    // Listar fórmulas de un producto
    listarPorProducto: async (productoId) => {
        const response = await fetch(`${API_URL}/producto/${productoId}`);
        if (!response.ok) throw new Error("Error al cargar fórmulas");
        return response.json();
    },

    // Crear nueva fórmula (solo cantidadPorLitro)
    crear: async (data) => {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productoId: data.productoId,
                materiaPrimaId: data.materiaPrimaId,
                cantidadPorLitro: data.cantidadPorLitro
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al crear fórmula");
        }
        return response.json();
    },

    // Actualizar fórmula
    actualizar: async (id, data) => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productoId: data.productoId,
                materiaPrimaId: data.materiaPrimaId,
                cantidadPorLitro: data.cantidadPorLitro
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Error al actualizar fórmula");
        }
        return response.json();
    },

    // Eliminar fórmula
    eliminar: async (id) => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Error al eliminar fórmula");
        return response.json();
    }
};