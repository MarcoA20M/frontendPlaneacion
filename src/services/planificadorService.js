// services/planificadorService.js
// ⭐ MICROSERVICIO FLASK (procesa Excel) - EN RENDER
const API_URL = "https://pythonscriptsplaneacion.onrender.com";

// ⭐ BACKEND JAVA (guarda en BD) - EN LOCAL
const BACKEND_JAVA_URL = "http://localhost:8080";

export const planificadorService = {
    // === MICROSERVICIO FLASK: Procesar Excel ===
    cargarExcelPlanificador: async (file) => {
        const formData = new FormData();
        formData.append("excel", file);

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

    // === BACKEND JAVA: Guardar planificador ===
    guardarPlanificador: async (datos) => {
        console.log('📤 Guardando en Java, tipo:', typeof datos);
        
        try {
            let datosJson;
            if (typeof datos === 'string') {
                datosJson = datos;
            } else {
                datosJson = JSON.stringify(datos);
            }
            
            const response = await fetch(`${BACKEND_JAVA_URL}/api/planificador/guardar`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    datos: datosJson
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Error al guardar planificador");
            }

            const result = await response.json();
            console.log('✅ Guardado exitoso:', result);
            
            localStorage.setItem("planificador_data", JSON.stringify({
                datos: datos,
                fecha_actualizacion: result.fechaActualizacion || new Date().toISOString()
            }));

            return result;
        } catch (error) {
            console.error('❌ Error en guardarPlanificador:', error);
            localStorage.setItem("planificador_data", JSON.stringify({
                datos: datos,
                fecha_actualizacion: new Date().toISOString()
            }));
            throw error;
        }
    },

    // === BACKEND JAVA: Cargar planificador ===
    cargarPlanificador: async () => {
        console.log('📥 Cargando planificador desde Java...');
        
        try {
            const response = await fetch(`${BACKEND_JAVA_URL}/api/planificador/cargar`);

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'success' && data.datos) {
                    let datos = data.datos;
                    if (typeof datos === 'string') {
                        try {
                            datos = JSON.parse(datos);
                        } catch (e) {
                            console.warn('⚠️ No se pudo parsear el JSON');
                        }
                    }

                    localStorage.setItem("planificador_data", JSON.stringify({
                        datos: datos,
                        fecha_actualizacion: data.fechaActualizacion || new Date().toISOString()
                    }));

                    return datos;
                }
            }

            console.log('📥 No hay datos en la nube, usando caché local');
            return planificadorService.obtenerDeLocal();

        } catch (error) {
            console.error('❌ Error cargando planificador:', error);
            return planificadorService.obtenerDeLocal();
        }
    },

    // === BACKEND JAVA: Eliminar planificador ===
    eliminarPlanificador: async () => {
        try {
            const response = await fetch(`${BACKEND_JAVA_URL}/api/planificador/eliminar`, {
                method: "DELETE"
            });

            if (response.ok) {
                localStorage.removeItem("planificador_data");
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error eliminando planificador:', error);
            return false;
        }
    },

    // === UTILIDADES ===
    guardarEnLocal: (data) => {
        localStorage.setItem("planificador_data", JSON.stringify({
            datos: data,
            fecha_actualizacion: new Date().toISOString()
        }));
    },

    obtenerDeLocal: () => {
        const data = localStorage.getItem("planificador_data");
        if (data) {
            try {
                const parsed = JSON.parse(data);
                let datos = parsed.datos || parsed;
                if (typeof datos === 'string') {
                    try {
                        datos = JSON.parse(datos);
                    } catch {
                        // Si no se puede parsear, dejarlo como string
                    }
                }
                return datos;
            } catch {
                return null;
            }
        }
        return null;
    },

    obtenerFechaActualizacion: () => {
        const data = localStorage.getItem("planificador_data");
        if (data) {
            try {
                const parsed = JSON.parse(data);
                return parsed.fecha_actualizacion || null;
            } catch {
                return null;
            }
        }
        return null;
    }
};