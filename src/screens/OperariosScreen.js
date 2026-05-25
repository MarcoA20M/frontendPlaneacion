import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/operarios.css";

export default function OperariosScreen() {
    const navigate = useNavigate();
    const [tabActiva, setTabActiva] = useState("vinilica");
    
    // Estado inicial de personal
    const [personal, setPersonal] = useState([
        { id: 1, nombre: "Aldo", puesto: "Preparador", area: "vinilica" },
        { id: 2, nombre: "Germán", puesto: "Molienda", area: "esmaltes" },
        { id: 3, nombre: "Javier", puesto: "Ayudante", area: "vinilica" },
        { id: 4, nombre: "Ricardo", puesto: "Preparador", area: "vinilica" },
        { id: 5, nombre: "Beto", puesto: "Mezclador", area: "esmaltes" }
    ]);

    // Estado para el acomodo de máquinas (Cargado de LocalStorage si existe)
    const [configMaquinas, setConfigMaquinas] = useState(() => {
        const guardado = localStorage.getItem("config_maquinas_preparado");
        return guardado ? JSON.parse(guardado) : {
            maquina1: "Aldo",
            maquina2: "Javier",
            maquina3: "Sin Asignar"
        };
    });

    // Guardar configuración de máquinas automáticamente
    useEffect(() => {
        localStorage.setItem("config_maquinas_preparado", JSON.stringify(configMaquinas));
    }, [configMaquinas]);

    const handleEditNombre = (id, nuevoNombre) => {
        setPersonal(prev => prev.map(p => p.id === id ? { ...p, nombre: nuevoNombre } : p));
    };

    const operariosFiltrados = personal.filter(p => p.area === tabActiva);

    return (
        <div className="op-screen-container">
            <div className="op-glass-panel">
                
                {/* --- SIDEBAR LATERAL --- */}
                <aside className="op-sidebar">
                    <div className="op-logo">
                        <span className="op-dot"></span>
                        <h2>RECURSOS HUMANOS</h2>
                    </div>
                    
                    <nav className="op-nav">
                        <div className="nav-label">SECCIONES</div>
                        <button 
                            className={`op-nav-btn ${tabActiva === "vinilica" ? "active" : ""}`}
                            onClick={() => setTabActiva("vinilica")}
                        >
                            <span className="nav-icon">💧</span> Vinílicas
                        </button>
                        <button 
                            className={`op-nav-btn ${tabActiva === "esmaltes" ? "active" : ""}`}
                            onClick={() => setTabActiva("esmaltes")}
                        >
                            <span className="nav-icon">✨</span> Esmaltes
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <button className="op-btn-exit" onClick={() => navigate("/mantenimiento")}>
                            ↩ Regresar a Menú
                        </button>
                    </div>
                </aside>

                {/* --- CONTENIDO PRINCIPAL --- */}
                <main className="op-main-content">
                    <header className="op-header">
                        <div className="op-title-group">
                            <h1>Panel de Operarios: {tabActiva.toUpperCase()}</h1>
                            <p>Gestión de personal activo y asignación estratégica de puestos</p>
                        </div>
                        <div className="op-header-actions">
                            <button className="op-btn-add">+ Registrar Nuevo</button>
                        </div>
                    </header>

                    <div className={`op-workspace ${tabActiva === 'vinilica' ? 'with-sidebar' : ''}`}>
                        
                        {/* TABLA DE PERSONAL */}
                        <div className="op-card table-card">
                            <div className="card-header-flex">
                                <h3 className="op-card-title">Plantilla de Trabajo</h3>
                                <span className="count-badge">{operariosFiltrados.length} Operarios</span>
                            </div>
                            
                            <div className="op-table-wrapper">
                                <table className="op-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre (Editable)</th>
                                            <th>Puesto Funcional</th>
                                            <th className="txt-center">Eliminar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {operariosFiltrados.map(op => (
                                            <tr key={op.id} className="row-hover">
                                                <td>
                                                    <input 
                                                        className="op-input-edit"
                                                        value={op.nombre}
                                                        onChange={(e) => handleEditNombre(op.id, e.target.value)}
                                                        placeholder="Nombre del operario..."
                                                    />
                                                </td>
                                                <td><span className="op-puesto-tag">{op.puesto}</span></td>
                                                <td className="txt-center">
                                                    <button className="op-action-btn delete" title="Quitar de la lista">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ACOMODO DE MÁQUINAS (Panel Condicional) */}
                        {tabActiva === "vinilica" && (
                            <div className="op-card machinery-card">
                                <h3 className="op-card-title">Acomodo en Preparado</h3>
                                <p className="card-desc">Asigna operarios de Vinílica a las máquinas para el turno actual.</p>
                                
                                <div className="op-machinery-list">
                                    {[1, 2, 3].map(num => (
                                        <div key={num} className="op-machine-item">
                                            <div className="machine-label-group">
                                                <span className="machine-id">M{num}</span>
                                                <label>ESTACIÓN DE PREPARADO #{num}</label>
                                            </div>
                                            <select 
                                                className="op-select-custom"
                                                value={configMaquinas[`maquina${num}`]}
                                                onChange={(e) => setConfigMaquinas({...configMaquinas, [`maquina${num}`]: e.target.value})}
                                            >
                                                <option value="Sin Asignar">Sin Asignar</option>
                                                {personal.filter(p => p.area === "vinilica").map(p => (
                                                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                    <div className="info-box">
                                        ℹ️ Esta distribución se reflejará en el Tablero de Producción.
                                    </div>
                                    <button className="op-btn-save" onClick={() => alert("Distribución guardada correctamente")}>
                                        Confirmar Distribución
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}