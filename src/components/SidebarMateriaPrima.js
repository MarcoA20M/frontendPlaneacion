// src/components/SidebarMateriaPrima.js
import React from "react";
import { useNavigate } from "react-router-dom";

export default function SidebarMateriaPrima({ 
    seccionActiva = "dashboard",
    inventarioTotal = 0,
    capacidadTotal = 0,
    tanquesCriticos = [],
    onCambiarSeccion = null,
    mostrarBases = true
}) {
    const navigate = useNavigate();

    const cambiarSeccion = (seccion) => {
        if (onCambiarSeccion) {
            onCambiarSeccion(seccion);
        } else {
            navigate(`/mantenimiento/criticos?tab=${seccion}`);
        }
    };

    // 🔴 Navegación para el botón de Consumos
    const irAConsumos = () => {
        navigate("/consumos");
    };

    return (
        <aside className="criticos-sidebar">
            <div className="sidebar-logo">
                <span className="logo-icon">⚡</span>
                <h2>Materia Prima</h2>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-label">PRINCIPAL</div>
                <button
                    className={`sidebar-btn ${seccionActiva === "dashboard" ? "active" : ""}`}
                    onClick={() => cambiarSeccion("dashboard")}
                >
                    <span className="btn-icon">📊</span>
                    Dashboard
                </button>
                <button
                    className={`sidebar-btn ${seccionActiva === "tanques" ? "active" : ""}`}
                    onClick={() => cambiarSeccion("tanques")}
                >
                    <span className="btn-icon">🛢️</span>
                    Tanques
                </button>
                <button
                    className={`sidebar-btn ${seccionActiva === "alertas" ? "active" : ""}`}
                    onClick={() => cambiarSeccion("alertas")}
                >
                    <span className="btn-icon">🚨</span>
                    Alertas
                    {tanquesCriticos.length > 0 && (
                        <span className="badge-alerta">{tanquesCriticos.length}</span>
                    )}
                </button>
                <button
                    className={`sidebar-btn ${seccionActiva === "trazabilidad" ? "active" : ""}`}
                    onClick={() => cambiarSeccion("trazabilidad")}
                >
                    <span className="btn-icon">🔗</span>
                    Trazabilidad
                </button>
                {/* 🔴 Botón de Consumos */}
                <button
                    className={`sidebar-btn ${seccionActiva === "consumos" ? "active" : ""}`}
                    onClick={irAConsumos}
                >
                    <span className="btn-icon">📊</span>
                    Consumos
                </button>
            </nav>

            <div className="nav-divider"></div>

            <nav className="sidebar-nav">
                <div className="nav-label">CONFIGURACIÓN</div>
                <button
                    className="sidebar-btn"
                    onClick={() => navigate("/mantenimiento/formulas")}
                >
                    <span className="btn-icon">📋</span>
                    Consultar codigos
                </button>

                <button
                    className="sidebar-btn"
                    onClick={() => navigate("/mantenimiento/materias-primas")}
                >
                    <span className="btn-icon">📦</span>
                    Gestionar Materias Primas
                </button>

                {mostrarBases && (
                    <button
                        className={`sidebar-btn ${seccionActiva === "bases" ? "active" : ""}`}
                        onClick={() => navigate("/bases")}
                    >
                        <span className="btn-icon">🛢️</span>
                        Bases
                    </button>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="stats-resumen-sidebar">
                    <div className="stat-sidebar">
                        <span className="stat-value">{inventarioTotal.toFixed(0)}</span>
                        <span className="stat-label">Total L/Kg</span>
                    </div>
                    <div className="stat-sidebar">
                        <span className="stat-value">{capacidadTotal > 0 ? ((inventarioTotal / capacidadTotal) * 100).toFixed(0) : 0}%</span>
                        <span className="stat-label">Capacidad</span>
                    </div>
                </div>
                <button className="btn-volver" onClick={() => navigate("/mantenimiento")}>
                    ↩ Volver
                </button>
            </div>
        </aside>
    );
}