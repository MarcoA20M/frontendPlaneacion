// components/Nivebar.jsx - VERSIÓN MODIFICADA
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";

const Nivebar = ({
    tipoPintura,
    setTipoPintura,
    datosPlanificador,
    setMostrarModalPlanificador,
    fechaCargaBD,
    setFechaCargaBD,
    buscarCarga,
    setBuscarCarga,
    handleBuscarYAbirModal,
    setMostrarModalSinResultados,
    logoPintu,
    volverAlMenuPrincipal,
    menuPerfilAbierto,
    setMenuPerfilAbierto,
    perfilRef,
    fechaRotacion,
}) => {
    const navigate = useNavigate();
    const [menuPerfilLocal, setMenuPerfilLocal] = useState(false);
    const perfilLocalRef = useRef(null);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const handleClickAfuera = (event) => {
            if (perfilLocalRef.current && !perfilLocalRef.current.contains(event.target)) {
                setMenuPerfilLocal(false);
                if (setMenuPerfilAbierto) setMenuPerfilAbierto(false);
            }
        };
        document.addEventListener("mousedown", handleClickAfuera);
        return () => document.removeEventListener("mousedown", handleClickAfuera);
    }, [setMenuPerfilAbierto]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const termino = e.target.value;
            if (termino.trim() !== "" && termino.trim().length >= 2) {
                handleBuscarYAbirModal(termino);
            }
        }
    };

    const semanaAnterior = () => {
        console.log('⬅️ Nivebar: Click en semana anterior');
        window.dispatchEvent(new CustomEvent('navegarSemana', { 
            detail: { direccion: 'anterior' } 
        }));
    };

    const semanaSiguiente = () => {
        console.log('➡️ Nivebar: Click en semana siguiente');
        window.dispatchEvent(new CustomEvent('navegarSemana', { 
            detail: { direccion: 'siguiente' } 
        }));
    };

    const irAHoy = () => {
        console.log('📅 Nivebar: Click en Hoy');
        window.dispatchEvent(new CustomEvent('navegarSemana', { 
            detail: { direccion: 'hoy' } 
        }));
    };

    const handleToggleTheme = () => {
        toggleTheme();
        if (setMenuPerfilAbierto) {
            setMenuPerfilAbierto(false);
        } else {
            setMenuPerfilLocal(false);
        }
    };

    const isMenuPerfilOpen = menuPerfilAbierto !== undefined ? menuPerfilAbierto : menuPerfilLocal;
    const toggleMenuPerfil = () => {
        if (setMenuPerfilAbierto) {
            setMenuPerfilAbierto(!menuPerfilAbierto);
        } else {
            setMenuPerfilLocal(!menuPerfilLocal);
        }
    };

    return (
        <div className="header-panel">
            {/* Perfil del usuario */}
            <div className="perfil-container" ref={perfilRef || perfilLocalRef}>
                <div
                    className={`perfil-icono ${isMenuPerfilOpen ? 'active' : ''}`}
                    onClick={toggleMenuPerfil}
                >
                    <span className="avatar-letra">A</span>
                    <div className="indicador-online"></div>
                </div>

                {isMenuPerfilOpen && (
                    <div className="perfil-dropdown">
                        <div className="perfil-header-info">
                            <p className="usuario-nombre">Administrador</p>
                            <p className="usuario-rol">Sistema de Producción</p>
                        </div>
                        <div className="divider-perfil"></div>
                        
                        <button className="perfil-item" onClick={() => navigate("/mantenimiento")}>
                            🛠️ Mantenimiento
                        </button>
                        
                        <button className="perfil-item theme-toggle" onClick={handleToggleTheme}>
                            {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
                        </button>
                        
                        <div className="divider-perfil"></div>
                    </div>
                )}
            </div>

            {/* Logo y título */}
            <div className="titulo-app">
                <div className="logo-clickeable" onClick={volverAlMenuPrincipal} style={{ cursor: 'pointer' }}>
                    <img
                        src={logoPintu}
                        alt="Logo Pinturas"
                        className="logo-titulo"
                        style={{ height: '50px', width: 'auto', marginRight: '15px' }}
                    />
                </div>
                {datosPlanificador && (
                    <button className="badge-planificador-btn" onClick={() => setMostrarModalPlanificador(true)}>
                        📅
                    </button>
                )}
            </div>

            {/* CONTENEDOR PRINCIPAL: NIVEL SEMANAL + TIPOS + BUSCADOR */}
            <div className="nivebar-actions-container">
                {/* NIVEL SEMANAL CON CALENDARIO */}
                <div className="semana-calendar-group">
                    <div className="planificador-semanal">
                        <button onClick={semanaAnterior} className="btn-semana" title="Semana anterior">◀</button>
                        <div className="fecha-actual-view">
                            <strong>Semana: </strong> 
                            {fechaRotacion?.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </div>
                        <button onClick={semanaSiguiente} className="btn-semana" title="Semana siguiente">▶</button>
                        <button className="btn-hoy-reset" onClick={irAHoy}>Hoy</button>
                    </div>
                </div>

                {/* TIPOS DE PINTURA (Vinílica / Esmalte) */}
                <div className="selector-tipo">
                    {["Vinílica", "Esmalte"].map(t => (
                        <button
                            key={t}
                            className={tipoPintura === t ? "active" : ""}
                            onClick={() => {
                                setTipoPintura(t);
                                setBuscarCarga("");
                                if (setMostrarModalSinResultados) setMostrarModalSinResultados(false);
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* BUSCADOR SIMPLE */}
                <div className="buscador-cargas-wrapper">
                    <div className="buscador-cargas-container-compact">
                        <div className="buscador-cargas-input-compact">
                            <span className="icono-lupa-compact">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por código o folio (Enter)..."
                                value={buscarCarga}
                                onChange={(e) => setBuscarCarga(e.target.value)}
                                onKeyDown={handleKeyDown}
                                title="Busca por código o folio (presiona Enter)"
                                autoFocus
                            />
                            {buscarCarga && (
                                <button
                                    className="btn-limpiar-compact"
                                    onClick={() => {
                                        setBuscarCarga("");
                                        if (setMostrarModalSinResultados) setMostrarModalSinResultados(false);
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Nivebar;