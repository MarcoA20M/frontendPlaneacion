// src/components/SidebarOperarios.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

    // ⭐ CERRAR SIDEBAR CON TECLA ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onToggle();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onToggle]);

    // ⭐ EVITAR SCROLL DEL BODY CUANDO EL SIDEBAR ESTÁ ABIERTO
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
            {/* ⭐ OVERLAY OSCURO DETRÁS DEL SIDEBAR */}
            {isOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={onToggle}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        zIndex: 999,
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeIn 0.3s ease',
                        WebkitBackdropFilter: 'blur(4px)' // ⭐ Para Safari
                    }}
                />
            )}

            {/* ⭐ SIDEBAR FLOTANTE (overlay) */}
            <aside 
                className={`op-sidebar ${isOpen ? 'open' : 'closed'}`}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100vh',
                    width: '280px',
                    maxWidth: '85vw', // ⭐ Para que no ocupe todo en móviles
                    backgroundColor: '#1a1a2e',
                    borderRight: '1px solid rgba(124, 58, 237, 0.3)',
                    zIndex: 1000,
                    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    overflowY: 'auto',
                    boxShadow: isOpen ? '4px 0 30px rgba(0, 0, 0, 0.5)' : 'none',
                    // ⭐ Estilos para móviles
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain'
                }}
            >
                {/* Botón para cerrar dentro del sidebar */}
                <button 
                    className="sidebar-close-btn"
                    onClick={onToggle}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(124, 58, 237, 0.2)',
                        border: 'none',
                        color: '#e0e0e0',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'all 0.2s ease',
                        zIndex: 10,
                        touchAction: 'manipulation' // ⭐ Mejor touch en móviles
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(124, 58, 237, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)';
                    }}
                >
                    ✕
                </button>

                <div className="op-logo" style={{ marginBottom: '24px' }}>
                    <span className="op-dot"></span>
                    <h2 style={{ fontSize: '18px' }}>Personal Operativo Pintumex</h2>
                </div>

                <nav className="op-nav">
                    <div className="nav-label" style={{ fontSize: '11px', letterSpacing: '1px' }}>SECCIONES</div>
                    <button 
                        className={`op-nav-btn ${tabActiva === "vinilica" ? "active" : ""}`}
                        onClick={() => { 
                            setTabActiva("vinilica"); 
                            setSubSeccionVinilica("maquinas");
                            onToggle();
                        }}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            background: tabActiva === "vinilica" ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: tabActiva === "vinilica" ? '#c084fc' : '#94a3b8',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px',
                            fontWeight: tabActiva === "vinilica" ? '600' : '400',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <span className="nav-icon">💧</span> Vinílicas
                    </button>
                    <button 
                        className={`op-nav-btn ${tabActiva === "esmaltes" ? "active" : ""}`}
                        onClick={() => { 
                            setTabActiva("esmaltes"); 
                            setSubSeccionEsmaltes("operarios");
                            onToggle();
                        }}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            marginBottom: '4px',
                            background: tabActiva === "esmaltes" ? 'rgba(124, 58, 237, 0.2)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: tabActiva === "esmaltes" ? '#c084fc' : '#94a3b8',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px',
                            fontWeight: tabActiva === "esmaltes" ? '600' : '400',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}
                    >
                        <span className="nav-icon">✨</span> Esmaltes
                    </button>
                </nav>

                {tabActiva === "vinilica" && (
                    <>
                        <div className="nav-divider" style={{ 
                            margin: '12px 0', 
                            borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}></div>
                        <nav className="op-nav">
                            <div className="nav-label" style={{ fontSize: '11px', letterSpacing: '1px' }}>VINÍLICAS</div>
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "maquinas" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("maquinas");
                                    onToggle();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: '4px',
                                    background: subSeccionVinilica === "maquinas" ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: subSeccionVinilica === "maquinas" ? '#a78bfa' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: subSeccionVinilica === "maquinas" ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingLeft: '24px'
                                }}
                            >
                                <span className="nav-icon">⚙️</span> Preparadores (Máquinas)
                            </button>
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "envasadores" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("envasadores");
                                    onToggle();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: '4px',
                                    background: subSeccionVinilica === "envasadores" ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: subSeccionVinilica === "envasadores" ? '#a78bfa' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: subSeccionVinilica === "envasadores" ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingLeft: '24px'
                                }}
                            >
                                <span className="nav-icon">📦</span> Envasadores
                            </button>
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "igualadores" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("igualadores");
                                    onToggle();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: '4px',
                                    background: subSeccionVinilica === "igualadores" ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: subSeccionVinilica === "igualadores" ? '#a78bfa' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: subSeccionVinilica === "igualadores" ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingLeft: '24px'
                                }}
                            >
                                <span className="nav-icon">🎯</span> Igualadores
                            </button>
                            <button 
                                className={`op-nav-sub-btn ${subSeccionVinilica === "especiales" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionVinilica("especiales");
                                    onToggle();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: '4px',
                                    background: subSeccionVinilica === "especiales" ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: subSeccionVinilica === "especiales" ? '#a78bfa' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: subSeccionVinilica === "especiales" ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingLeft: '24px'
                                }}
                            >
                                <span className="nav-icon">🧴</span> Operarios Especiales
                            </button>
                        </nav>
                    </>
                )}

                {tabActiva === "esmaltes" && (
                    <>
                        <div className="nav-divider" style={{ 
                            margin: '12px 0', 
                            borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}></div>
                        <nav className="op-nav">
                            <div className="nav-label" style={{ fontSize: '11px', letterSpacing: '1px' }}>ESMALTES</div>
                            <button 
                                className={`op-nav-sub-btn ${subSeccionEsmaltes === "operarios" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionEsmaltes("operarios");
                                    onToggle();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: '4px',
                                    background: subSeccionEsmaltes === "operarios" ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: subSeccionEsmaltes === "operarios" ? '#a78bfa' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: subSeccionEsmaltes === "operarios" ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingLeft: '24px'
                                }}
                            >
                                <span className="nav-icon">🧪</span> Operarios
                            </button>
                            <button 
                                className={`op-nav-sub-btn ${subSeccionEsmaltes === "envasadores" ? "active" : ""}`}
                                onClick={() => {
                                    setSubSeccionEsmaltes("envasadores");
                                    onToggle();
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    marginBottom: '4px',
                                    background: subSeccionEsmaltes === "envasadores" ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: subSeccionEsmaltes === "envasadores" ? '#a78bfa' : '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    fontWeight: subSeccionEsmaltes === "envasadores" ? '500' : '400',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    paddingLeft: '24px'
                                }}
                            >
                                <span className="nav-icon">📦</span> Envasadores
                            </button>
                        </nav>
                    </>
                )}

                <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                    <button 
                        className="op-btn-exit" 
                        onClick={() => {
                            navigate("/mantenimiento");
                            onToggle();
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            color: '#f87171',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
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