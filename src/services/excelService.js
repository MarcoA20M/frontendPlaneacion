import { API_URL } from "../constants/config";

// 🔴 Función auxiliar para obtener el operario especial activo
const getOperarioEspecialActivo = () => {
    try {
        const guardado = localStorage.getItem("operarios_especiales");
        if (guardado) {
            const operarios = JSON.parse(guardado);
            const activo = operarios.find(op => op.activo === true);
            if (activo) return activo.nombre;
        }
    } catch (error) {
        console.error("Error al obtener operario especial:", error);
    }
    return "Lazaro"; // Valor por defecto
};

export const analizarExcel = async (file) => {
    const formData = new FormData();
    formData.append('excel', file);
    const response = await fetch(`${API_URL}/analyze-excel`, { method: 'POST', body: formData });
    return await response.json();
};

export const exportarReporte = async (cargas) => {
    // 🔴 Obtener el operario especial activo
    const operarioEspecial = getOperarioEspecialActivo();
    
    const response = await fetch(`${API_URL}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            cargas: cargas,
            operarioEspecial: operarioEspecial  // 🔴 Enviar operario especial al backend
        })
    });

    // Obtenemos la fecha actual en formato DD-MM-YYYY
    const fecha = new Date();
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const fechaFormateada = `${dia}-${mes}-${anio}`;

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