import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/mantenimiento.css";

export default function MantenimientoScreen() {
    const navigate = useNavigate();
    const [estadoServidores] = useState("OPTIMO");

    const herramientas = [
        {
            id: 1,
            titulo: "Operarios",
            desc: "Administrar y controlar actividades de personal operativo",
            icono: "👥",
            accion: "Consultar",
            path: "/mantenimiento/operarios" // Ruta destino
        },

        {
            id: 2,
            titulo: "Control de códigos",
            desc: "Agrega, Actualizar o Eliminar pinturas",
            icono: "🔑",
            accion: "Consultar",
            path: "/mantenimiento/codigos"
        },
        {
            id: 3,
            titulo: "Administrar Críticos",
            desc: "Administración de consumos de materias primas",
            icono: "⚡",
            accion: "Consultar",
            path: "/mantenimiento/criticos"
        },
        {
            id: 4,
            titulo: "Reportes",
            desc: "Control de reportes de producción",
            icono: "📊",
            accion: "Consultar",
            path: "/mantenimiento/reportes"
        }
       
    ];

    return (
        <div className="mantenimiento-app">
            <div className="mantenimiento-container">
                <header className="mant-header">
                    <button className="btn-back" onClick={() => navigate("/")}>← Volver</button>
                    <div className="mant-titulo-seccion">
                        <h1>SISTEMA DE MANTENIMIENTO</h1>
                        <span className="badge-estado">{estadoServidores}</span>
                    </div>
                </header>

                <div className="mant-grid">
                    <div className="mant-main-panel">
                        <h2 className="sub-titulo-neon">Acciones de Núcleo</h2>
                        <div className="herramientas-grid">
                            {herramientas.map(h => (
                                <div key={h.id} className="card-herramienta">
                                    <div className="h-icono">{h.icono}</div>
                                    <div className="h-info">
                                        <h3>{h.titulo}</h3>
                                        <p>{h.desc}</p>
                                    </div>
                                    {/* Evento de navegación añadido aquí */}
                                    <button
                                        className="h-btn-accion"
                                        onClick={() => navigate(h.path)}
                                    >
                                        {h.accion}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mant-side-panel">
                        <h2 className="sub-titulo-neon">Registro de Actividad</h2>
                        <div className="consola-logs">
                            <div className="log-line"><span className="log-time">[14:20]</span> DB: Conexión establecida.</div>
                            <div className="log-line success"><span className="log-time">[14:22]</span> SYS: Panel de control listo.</div>
                            <div className="log-line info"><span className="log-time">[Ahora]</span> Esperando selección de módulo...</div>
                            <div className="cursor-terminal">_</div>
                        </div>
                    </div>
                </div>

                <footer className="mant-footer">
                    <p>Versión del Sistema: <strong>2.0.4-Rev6</strong></p>
                    <button className="btn-pánico">REINICIAR SERVICIOS</button>
                </footer>
            </div>
        </div>
    );
}   