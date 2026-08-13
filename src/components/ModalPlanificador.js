import React, { useState, useEffect } from 'react';
import '../styles/ModalPlanificador.css'; 

export default function ModalPlanificador({ 
    visible, 
    datos, 
    onClose, 
    onSelectCode, 
    onClear,
    onGuardarEnBD,
    guardandoBD,
    yaGuardadoEnBD
}) {
    // ⭐ ESTADO PARA LA NOTIFICACIÓN TEMPORAL
    const [notificacionGuardado, setNotificacionGuardado] = useState(null);

    // ⭐ FUNCIÓN PARA GUARDAR Y MOSTRAR NOTIFICACIÓN
    const handleGuardarConNotificacion = async () => {
        if (yaGuardadoEnBD) return;
        
        try {
            // Llamar a la función de guardado que viene por props
            await onGuardarEnBD();
            
            // ⭐ MOSTRAR NOTIFICACIÓN DE ÉXITO
            setNotificacionGuardado({
                mensaje: '✅ Guardado en BD',
                fecha: new Date().toLocaleString()
            });

            // ⭐ OCULTAR NOTIFICACIÓN DESPUÉS DE 5 SEGUNDOS
            setTimeout(() => {
                setNotificacionGuardado(null);
            }, 5000);

        } catch (error) {
            console.error('Error al guardar:', error);
            // ⭐ MOSTRAR NOTIFICACIÓN DE ERROR
            setNotificacionGuardado({
                mensaje: '❌ Error al guardar',
                fecha: new Date().toLocaleString(),
                esError: true
            });
            setTimeout(() => {
                setNotificacionGuardado(null);
            }, 5000);
        }
    };

    // ⭐ LIMPIAR NOTIFICACIÓN AL CERRAR EL MODAL
    useEffect(() => {
        if (!visible) {
            setNotificacionGuardado(null);
        }
    }, [visible]);

    if (!visible || !datos || !datos.data) return null;

    return (
        <div className="pl-modal-overlay">
            <div className="pl-modal-container">
                {/* ⭐ NOTIFICACIÓN TEMPORAL FLOTANTE */}
                {notificacionGuardado && (
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: notificacionGuardado.esError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                        color: 'white',
                        padding: '30px 50px',
                        borderRadius: '16px',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        zIndex: 99999,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        textAlign: 'center',
                        animation: 'fadeIn 0.5s ease-out',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        minWidth: '300px'
                    }}>
                        <div style={{ fontSize: '48px' }}>
                            {notificacionGuardado.esError ? '❌' : '✅'}
                        </div>
                        <div>{notificacionGuardado.mensaje}</div>
                        <div style={{ 
                            fontSize: '14px', 
                            opacity: 0.8, 
                            fontWeight: 'normal',
                            marginTop: '4px'
                        }}>
                            {notificacionGuardado.fecha}
                        </div>
                        {/* ⭐ BARRA DE PROGRESO QUE SE LLENA EN 5 SEGUNDOS */}
                        <div style={{
                            width: '100%',
                            height: '4px',
                            background: 'rgba(255,255,255,0.3)',
                            borderRadius: '2px',
                            marginTop: '8px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'white',
                                borderRadius: '2px',
                                animation: 'shrinkWidth 5s linear forwards'
                            }} />
                        </div>
                    </div>
                )}

                <div className="pl-modal-header">
                    <div className="pl-header-left">
                        <span className="pl-header-icon">📋</span>
                        <div>
                            <h2>Planificador de Producción</h2>
                            <p>
                                {datos.total} registros encontrados
                                {yaGuardadoEnBD && ' ✅ (Guardado en BD)'}
                            </p>
                        </div>
                    </div>
                    <button className="pl-btn-x" onClick={onClose}>&times;</button>
                </div>

                <div className="pl-modal-body">
                    <div className="pl-table-scroll">
                        <table className="pl-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Color</th>
                                    <th className="pl-text-center">Articulo</th>
                                    <th className="pl-text-center">Salidas</th>
                                    <th className="pl-text-center">Existencia Actual</th>
                                    <th className="pl-text-center">Alcance (Días)</th>
                                    <th className="pl-text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.data.map((item, i) => (
                                    <tr key={i} className={item.alcance === 0 ? 'pl-row-critical' : ''}>
                                        <td className="pl-col-min">{i + 1}</td>
                                        <td className="pl-col-bold">{item.color}</td>
                                        <td className="pl-col-bold">{item.articulo}</td>                                      
                                        <td className="pl-text-center">{item.salidas}</td>
                                        <td className="pl-text-center">{item.existencia}</td>
                                        <td className="pl-text-center font-bold">
                                            {item.alcance.toFixed(0)}
                                        </td>
                                        <td className="pl-text-center">
                                            <button 
                                                className="pl-btn-load"
                                                onClick={() => {
                                                    onSelectCode(item.color);
                                                    onClose();
                                                }}
                                            >
                                                Cargar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pl-modal-footer">
                    <button 
                        className="pl-btn-guardar-bd" 
                        onClick={handleGuardarConNotificacion}  // ⭐ USAR LA NUEVA FUNCIÓN
                        disabled={guardandoBD || yaGuardadoEnBD}
                        style={{
                            background: yaGuardadoEnBD ? '#6b7280' : (guardandoBD ? '#6b7280' : '#10b981'),
                            cursor: (guardandoBD || yaGuardadoEnBD) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {yaGuardadoEnBD ? '✅ Ya guardado' : (guardandoBD ? '💾 Guardando...' : '💾 Guardar en BD')}
                    </button>
                    <button className="pl-btn-clear" onClick={onClear}>Vaciar Planificador</button>
                    <button className="pl-btn-close-modal" onClick={onClose}>Cerrar</button>
                </div>
            </div>

            {/* ⭐ ESTILOS PARA LAS ANIMACIONES */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }

                @keyframes shrinkWidth {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
            `}</style>
        </div>
    );
}