export const exportarExcel = async (rondas) => {
    try {
        const response = await fetch('http://localhost:5000/exportar', {
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
    } catch (error) {
        console.error("Error exportando:", error);
        alert("No se pudo conectar con el servidor de Python. Asegúrate de que Flask esté corriendo.");
    }
};