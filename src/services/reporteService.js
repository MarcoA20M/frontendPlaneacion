// src/services/reportesService.js
const API_URL = 'http://localhost:5000';

export const reportesService = {
    // ===== Exportar Excel con rondas =====
    exportarExcel: async (rondas) => {
        try {
            const response = await fetch(`${API_URL}/exportar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rondas })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Produccion_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exportando:", error);
            alert("No se pudo conectar con el servidor de Python. Asegúrate de que Flask esté corriendo.");
            throw error;
        }
    },

    // ===== Generar reporte mensual (con hojas por mes) =====
    generarReporteMensual: async (formData) => {
        try {
            const response = await fetch(`${API_URL}/generar-reporte-mensual`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fecha = new Date().toISOString().split('T')[0];
            a.download = `Reporte_Mensual_${fecha}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            return { success: true, message: 'Reporte mensual generado correctamente' };
        } catch (error) {
            console.error('Error generando reporte mensual:', error);
            throw error;
        }
    },

    // ===== Analizar inventario =====
    analizarInventario: async (formData) => {
        try {
            const response = await fetch(`${API_URL}/analizar-inventario`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor');
            }

            return await response.json();
        } catch (error) {
            console.error('Error analizando inventario:', error);
            throw error;
        }
    },

    // ===== Procesar planificador =====
    procesarPlanificador: async (formData) => {
        try {
            const response = await fetch(`${API_URL}/procesar-planificador`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor');
            }

            return await response.json();
        } catch (error) {
            console.error('Error procesando planificador:', error);
            throw error;
        }
    },

    // ===== Generar bitácora de impresión =====
    generarBitacora: async (data) => {
        try {
            const response = await fetch(`${API_URL}/generar_bitacora_impresion`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en el servidor');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bitacora_${data.tipo || 'Produccion'}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            return { success: true };
        } catch (error) {
            console.error('Error generando bitácora:', error);
            throw error;
        }
    }
};