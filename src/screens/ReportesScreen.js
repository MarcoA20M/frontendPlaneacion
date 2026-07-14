// src/screens/ReportesScreen.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reportesService } from "../services/reporteService"; // 🔴 CORREGIDO: reportesService
import "../styles/reportes.css";

export default function ReportesScreen() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [reportesData, setReportesData] = useState([]);
    const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
    const [nombreArchivo, setNombreArchivo] = useState("");
    const [estadisticas, setEstadisticas] = useState(null);

    // Reportes predefinidos
    const reportesDisponibles = [
        {
            id: "produccion",
            nombre: "Reporte Mensual de Producción",
            descripcion: "Análisis completo de cargas por mes y código",
            icono: "🏭",
            color: "#9b30ff"
        },
        {
            id: "inventario",
            nombre: "Análisis de Inventario",
            descripcion: "Productos críticos y estancados",
            icono: "📦",
            color: "#ffd700"
        },
        {
            id: "planificador",
            nombre: "Planificador de Producción",
            descripcion: "Procesa el archivo del planificador",
            icono: "📋",
            color: "#00d4ff"
        },
        {
            id: "bitacora",
            nombre: "Bitácora de Impresión",
            descripcion: "Genera bitácora para impresión",
            icono: "🖨️",
            color: "#00ff88"
        }
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setArchivoSeleccionado(file);
            setNombreArchivo(file.name);
        }
    };

    // ============================================================
    // 🔴 CORREGIDO: Generar reporte mensual
    // ============================================================
    const generarReporte = async () => {
        if (!archivoSeleccionado) {
            alert("⚠️ Por favor, selecciona un archivo Excel para analizar.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', archivoSeleccionado);

            // 🔴 CORREGIDO: Usar el endpoint mensual
            await reportesService.generarReporteMensual(formData);
            
            setReportesData([{ 
                mensaje: "✅ Reporte mensual generado y descargado correctamente",
                archivo: nombreArchivo,
                fecha: new Date().toLocaleString()
            }]);

        } catch (error) {
            console.error("Error generando reporte:", error);
            alert("❌ Error al generar el reporte. Verifica el archivo.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalizarInventario = async () => {
        if (!archivoSeleccionado) {
            alert("⚠️ Por favor, selecciona un archivo Excel.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', archivoSeleccionado);

            const result = await reportesService.analizarInventario(formData);
            setEstadisticas(result);
            
            if (result.alertas && result.alertas.length > 0) {
                const datos = result.alertas.map(item => ({
                    codigo: item.codigo,
                    nombre: item.nombre_base,
                    presentaciones: item.presentaciones.length,
                    alcance_minimo: item.alcance_minimo
                }));
                setReportesData(datos);
            } else {
                setReportesData([{ mensaje: "✅ No se encontraron productos críticos" }]);
            }
        } catch (error) {
            console.error("Error analizando inventario:", error);
            alert("❌ Error al analizar el inventario.");
        } finally {
            setLoading(false);
        }
    };

    const handleProcesarPlanificador = async () => {
        if (!archivoSeleccionado) {
            alert("⚠️ Por favor, selecciona un archivo Excel.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('excel', archivoSeleccionado);

            const result = await reportesService.procesarPlanificador(formData);
            setEstadisticas(result);
            
            if (result.data && result.data.length > 0) {
                const datos = result.data.slice(0, 50).map(item => ({
                    articulo: item.articulo,
                    descripcion: item.descripcion,
                    salidas: item.salidas,
                    existencia: item.existencia,
                    alcance: item.alcance
                }));
                setReportesData(datos);
            } else {
                setReportesData([{ mensaje: "✅ Planificador procesado correctamente" }]);
            }
        } catch (error) {
            console.error("Error procesando planificador:", error);
            alert("❌ Error al procesar el planificador.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerarBitacora = async () => {
        alert("🖨️ Funcionalidad de bitácora en desarrollo");
    };

    const handleImprimir = () => {
        window.print();
    };

    return (
        <div className="reportes-container">
            <div className="orb-report orb-1"></div>
            <div className="orb-report orb-2"></div>
            <div className="orb-report orb-3"></div>

            <header className="report-header">
                <button className="btn-back-neon" onClick={() => navigate("/mantenimiento")}>
                    <span className="arrow-icon">←</span> VOLVER
                </button>
                <div className="report-header-info">
                    <h1 className="report-title">📊 Panel de Reportes</h1>
                    <p className="report-subtitle">Genera y visualiza reportes de producción y operación</p>
                </div>
            </header>

            <div className="report-content">
                <div className="report-config-panel">
                    <div className="config-file-upload">
                        <label className="config-label">📂 Seleccionar Archivo Excel</label>
                        <div className="file-upload-wrapper">
                            <input 
                                type="file" 
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="file-input"
                                id="fileInput"
                            />
                            <label htmlFor="fileInput" className="file-input-label">
                                {nombreArchivo ? (
                                    <span className="file-selected">📄 {nombreArchivo}</span>
                                ) : (
                                    <span className="file-placeholder">📤 Seleccionar archivo Excel...</span>
                                )}
                            </label>
                            {nombreArchivo && (
                                <button 
                                    className="file-clear"
                                    onClick={() => {
                                        setArchivoSeleccionado(null);
                                        setNombreArchivo("");
                                        setReportesData([]);
                                        setEstadisticas(null);
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="config-actions">
                        <button 
                            className="btn-config" 
                            onClick={generarReporte}
                            disabled={loading || !archivoSeleccionado}
                        >
                            {loading ? '⏳ Procesando...' : '📊 Generar Reporte Mensual'}
                        </button>
                        <button 
                            className="btn-config btn-export" 
                            onClick={handleAnalizarInventario}
                            disabled={loading || !archivoSeleccionado}
                        >
                            📦 Analizar Inventario
                        </button>
                        <button 
                            className="btn-config btn-export" 
                            onClick={handleProcesarPlanificador}
                            disabled={loading || !archivoSeleccionado}
                        >
                            📋 Procesar Planificador
                        </button>
                        <button 
                            className="btn-config btn-print" 
                            onClick={handleGenerarBitacora}
                            disabled={loading}
                        >
                            🖨️ Bitácora
                        </button>
                        <button className="btn-config btn-print" onClick={handleImprimir}>
                            🖨️ Imprimir
                        </button>
                    </div>
                </div>

                <div className="reportes-rapidos">
                    {reportesDisponibles.map(reporte => (
                        <div 
                            key={reporte.id}
                            className={`reporte-rapido-card`}
                            onClick={() => {
                                if (reporte.id === "produccion") generarReporte();
                                else if (reporte.id === "inventario") handleAnalizarInventario();
                                else if (reporte.id === "planificador") handleProcesarPlanificador();
                                else if (reporte.id === "bitacora") handleGenerarBitacora();
                            }}
                            style={{ '--rapido-color': reporte.color }}
                        >
                            <span className="rapido-icono">{reporte.icono}</span>
                            <div className="rapido-info">
                                <h4>{reporte.nombre}</h4>
                                <p>{reporte.descripcion}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="report-resultados">
                    <div className="resultados-header">
                        <h3>📋 Resultados del Reporte</h3>
                        {nombreArchivo && (
                            <span className="resultados-fecha">
                                📄 {nombreArchivo}
                            </span>
                        )}
                    </div>

                    {loading ? (
                        <div className="report-loading">
                            <div className="spinner-report"></div>
                            <p>Procesando archivo... Esto puede tomar unos segundos</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        {reportesData.length > 0 && Object.keys(reportesData[0]).map(key => (
                                            <th key={key}>{key.toUpperCase().replace(/_/g, ' ')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportesData.map((item, index) => (
                                        <tr key={index}>
                                            {Object.values(item).map((value, i) => (
                                                <td key={i}>{value}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && reportesData.length === 0 && (
                        <div className="report-sin-datos">
                            <span className="sin-datos-icono">📋</span>
                            <p>No hay datos para mostrar</p>
                            <small>Selecciona un archivo Excel y genera un reporte</small>
                        </div>
                    )}
                </div>

                {estadisticas && (
                    <div className="report-stats">
                        <div className="stat-card">
                            <span className="stat-icono">📊</span>
                            <div className="stat-info">
                                <span className="stat-valor">{estadisticas.total || 0}</span>
                                <span className="stat-label">Registros</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icono">📂</span>
                            <div className="stat-info">
                                <span className="stat-valor">{nombreArchivo || 'Sin archivo'}</span>
                                <span className="stat-label">Archivo</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-icono">⚡</span>
                            <div className="stat-info">
                                <span className="stat-valor">{estadisticas.status === 'success' ? '✅' : '⏳'}</span>
                                <span className="stat-label">Estado</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <footer className="report-footer">
                <p>Reportes generados desde el sistema de producción</p>
                <span className="footer-version">v2.0.4-Rev6</span>
            </footer>
        </div>
    );
}