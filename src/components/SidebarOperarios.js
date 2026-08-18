// src/components/SidebarOperarios.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "../styles/sidebar-overlay.css";


function SidebarOperarios({ 
    tabActiva, 
    setTabActiva, 
    subSeccionVinilica, 
    setSubSeccionVinilica, 
    subSeccionEsmaltes, 
    setSubSeccionEsmaltes,
    isOpen,
    onToggle
}) {
    const navigate = useNavigate();

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onToggle();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onToggle]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <>
            {/* ⭐ OVERLAY - SOLO EN MÓVIL O CUANDO ESTÁ ABIERTO */}
            {isOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={onToggle}
                />
            )}

            {/* ⭐ SIDEBAR */}
            <aside className={`op-sidebar-overlay ${isOpen ? 'open' : 'closed'}`}>
                {/* Botón para cerrar - SOLO EN MÓVIL */}
                <button 
                    className="sidebar-close-btn"
                    onClick={onToggle}
                >
                    ✕
                </button>

                <div className="op-logo">
                    <span className="op-dot"></span>
                    <h2>Personal Operativo Pintumex</h2>
                </div>

                <nav className="op-nav">
                    <div className="nav-label">SECCIONES</div>
                    
                    <button 
                        className={`op-nav-btn ${tabActiva === "vinilica" ? "active" : ""}`}
                        onClick={() => { 
                            setTabActiva("vinilica"); 
                            setSubSeccionVinilica("maquinas");
                            // ⭐ SOLO CERRAR EN MÓVIL
                            if (window.innerWidth <= 768) {
                                onToggle();
                            }
                        }}
                    >
                        <span className="nav-icon">💧</span> Vinílicas
                    </button>
                    
                    <button 
                        className={`op-nav-btn ${tabActiva === "esmaltes" ? "active" : ""}`}
                        onClick={() => { 
                            setTabActiva("esmaltes"); 
                            setSubSeccionEsmaltes("operarios");
                            if (window.innerWidth <= 768) {
                                onToggle();
                            }
                        }}
                    >
                        <span className="nav-icon">✨</span> Esmaltes
                    </button>
                </nav>

                {tabActiva === "vinilica" && (
                    <>
                        <div className="nav-divider"></div>
                        <nav className="op-nav">
                            <div className="nav-label">VINÍLICAS</div>
                            
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "maquinas" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("maquinas");
                                    if (window.innerWidth <= 768) {
                                        onToggle();
                                    }
                                }}
                            >
                                <span className="nav-icon">⚙️</span> Preparadores (Máquinas)
                            </button>
                            
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "envasadores" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("envasadores");
                                    if (window.innerWidth <= 768) {
                                        onToggle();
                                    }
                                }}
                            >
                                <span className="nav-icon">📦</span> Envasadores
                            </button>
                            
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "igualadores" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("igualadores");
                                    if (window.innerWidth <= 768) {
                                        onToggle();
                                    }
                                }}
                            >
                                <span className="nav-icon">🎯</span> Igualadores
                            </button>
                            
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "especiales" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("especiales");
                                    if (window.innerWidth <= 768) {
                                        onToggle();
                                    }
                                }}
                            >
                                <span className="nav-icon">🧴</span> Operarios Especiales
                            </button>
                        </nav>
                    </>
                )}

                {tabActiva === "esmaltes" && (
                    <>
                        <div className="nav-divider"></div>
                        <nav className="op-nav">
                            <div className="nav-label">ESMALTES</div>
                            
                            <button 
                                className={`op-nav-sub-btn ${subSeccionEsmaltes === "operarios" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionEsmaltes("operarios");
                                    if (window.innerWidth <= 768) {
                                        onToggle();
                                    }
                                }}
                            >
                                <span className="nav-icon">🧪</span> Operarios
                            </button>
                            
                            <button 
                                className={`op-nav-sub-btn ${subSeccionEsmaltes === "envasadores" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionEsmaltes("envasadores");
                                    if (window.innerWidth <= 768) {
                                        onToggle();
                                    }
                                }}
                            >
                                <span className="nav-icon">📦</span> Envasadores
                            </button>
                        </nav>
                    </>
                )}

                <div className="sidebar-footer">
                    <button 
                        className="op-btn-exit" 
                        onClick={() => {
                            navigate("/mantenimiento");
                            if (window.innerWidth <= 768) {
                                onToggle();
                            }
                        }}
                    >
                        ↩ Regresar a Menú
                    </button>
                </div>
            </aside>
        </>
    );
}

export default SidebarOperarios;