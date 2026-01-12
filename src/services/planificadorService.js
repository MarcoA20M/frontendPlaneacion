const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const planificadorService = {
    cargarExcelPlanificador: async (file) => {
        const formData = new FormData();
        formData.append("excel", file); // Nombre que espera el backend

        const response = await fetch(`${API_URL}/procesar-planificador`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al procesar el archivo");
        }
        return await response.json();
    },

    guardarEnLocal: (data) => localStorage.setItem("planificador_data", JSON.stringify(data)),
    obtenerDeLocal: () => JSON.parse(localStorage.getItem("planificador_data") || "null")
};