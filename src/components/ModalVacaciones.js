// src/components/ModalVacaciones.jsx
import React, { useState } from 'react';

const ModalVacaciones = ({ 
    mostrar, 
    operario, 
    onCerrar, 
    onGuardar, 
    onEliminar,
    vacacionesExistentes,
    mostrarMensaje 
}) => {
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [observaciones, setObservaciones] = useState('');

    if (!mostrar || !operario) return null;

    return (
        <div className="modal-overlay" onClick={onCerrar} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                background: '#1a1a2e',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                border: '1px solid rgba(192, 0, 255, 0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ color: '#e0e0e0', margin: 0 }}>
                        🌴 Vacaciones - {operario.nombre}
                    </h2>
                    <button onClick={onCerrar} style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '4px 8px'
                    }}>
                        ✕
                    </button>
                </div>

                <div style={{
                    background: 'rgba(192, 0, 255, 0.05)',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px'
                }}>
                    <h3 style={{ color: '#c0c0c0', fontSize: '14px', marginBottom: '12px' }}>
                        📅 Registrar Nuevas Vacaciones
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                Fecha Inicio
                            </label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#0d0d1a',
                                    border: '1px solid rgba(192, 0, 255, 0.2)',
                                    borderRadius: '6px',
                                    color: '#e0e0e0'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                                Fecha Fin
                            </label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#0d0d1a',
                                    border: '1px solid rgba(192, 0, 255, 0.2)',
                                    borderRadius: '6px',
                                    color: '#e0e0e0'
                                }}
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                            Observaciones (opcional)
                        </label>
                        <input
                            type="text"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Motivo, reemplazo, etc."
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: '#0d0d1a',
                                border: '1px solid rgba(192, 0, 255, 0.2)',
                                borderRadius: '6px',
                                color: '#e0e0e0'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => {
                            if (fechaInicio && fechaFin) {
                                onGuardar(operario.id, fechaInicio, fechaFin, observaciones);
                                setFechaInicio('');
                                setFechaFin('');
                                setObservaciones('');
                            } else {
                                mostrarMensaje("❌ Selecciona ambas fechas", "error");
                            }
                        }}
                        style={{
                            marginTop: '12px',
                            padding: '8px 20px',
                            background: 'rgba(255, 200, 0, 0.2)',
                            border: '1px solid rgba(255, 200, 0, 0.3)',
                            borderRadius: '6px',
                            color: '#ffd700',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        + Registrar Vacaciones
                    </button>
                </div>

                {vacacionesExistentes.length > 0 && (
                    <div>
                        <h3 style={{ color: '#c0c0c0', fontSize: '14px', marginBottom: '12px' }}>
                            📋 Historial de Vacaciones
                        </h3>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {vacacionesExistentes.sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio)).map((v) => {
                                const activa = v.activo && new Date(v.fechaInicio) <= new Date() && new Date(v.fechaFin) >= new Date();
                                return (
                                    <div key={v.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        background: activa ? 'rgba(255, 200, 0, 0.1)' : 'rgba(255,255,255,0.03)',
                                        borderLeft: `3px solid ${activa ? '#ffd700' : '#444'}`,
                                        marginBottom: '4px',
                                        borderRadius: '4px'
                                    }}>
                                        <div>
                                            <div style={{ color: '#e0e0e0', fontSize: '13px' }}>
                                                {new Date(v.fechaInicio).toLocaleDateString()} → {new Date(v.fechaFin).toLocaleDateString()}
                                                {activa && (
                                                    <span style={{ color: '#ffd700', marginLeft: '8px', fontWeight: 'bold' }}>
                                                        ● ACTIVO
                                                    </span>
                                                )}
                                                {!v.activo && (
                                                    <span style={{ color: '#666', marginLeft: '8px', fontSize: '11px' }}>
                                                        (finalizado)
                                                    </span>
                                                )}
                                            </div>
                                            {v.observaciones && (
                                                <div style={{ color: '#888', fontSize: '11px' }}>
                                                    📝 {v.observaciones}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onEliminar(v.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ff4444',
                                                cursor: 'pointer',
                                                padding: '4px 8px'
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '16px', color: '#666', fontSize: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    💡 Los operarios en vacaciones aparecerán con el ícono 🌴 y no serán asignados a la rotación.
                </div>
            </div>
        </div>
    );
};

export default ModalVacaciones;