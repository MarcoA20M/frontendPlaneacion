// TableroVinilica.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect, useRef } from 'react';
import CardCarga from './CardCarga';
import { operarioService } from '../services/operarioService';

function TableroVinilica({ 
    rondas, 
    fechaTrabajo, 
    handleDrop, 
    setCargaSeleccionada, 
    setMostrarDetalle, 
    filtroOperario,
    onFechaRotacionChange,
    onOperariosActualizados, // 🔴 NUEVO: callback para pasar los operarios al padre
    operariosPorMaquina: operariosProps // 🔴 Renombramos para evitar conflicto
}) {
    const [operariosPorMaquina, setOperariosPorMaquina] = useState({});
    const [cargando, setCargando] = useState(true);
    const [semanas, setSemanas] = useState(0);
    const [fechaRotacion, setFechaRotacion] = useState(new Date());
    const baseCargadaRef = useRef(false);

    // 🔴 FUNCIÓN PARA NOTIFICAR AL PADRE CUANDO CAMBIEN LOS OPERARIOS
    const notificarOperariosAlPadre = (nuevosOperarios) => {
        if (onOperariosActualizados) {
            onOperariosActualizados(nuevosOperarios);
        }
    };

    // 🔴 FUNCIÓN PARA ROTAR - LLAMA AL BACKEND
    const rotar = async (nuevasSemanas) => {
        setCargando(true);
        try {
            const response = await fetch(`https://pintuplaneacion-backend.onrender.com/api/operarios/vinilica/rotar?semanas=${nuevasSemanas}`);
            const data = await response.json();
            setOperariosPorMaquina(data);
            setSemanas(nuevasSemanas);
            
            // 🔴 NOTIFICAR AL PADRE CON LOS NUEVOS OPERARIOS
            notificarOperariosAlPadre(data);
            
            // Actualizar fecha de rotación
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + (nuevasSemanas * 7));
            setFechaRotacion(fecha);
            
            // Notificar fecha al padre
            if (onFechaRotacionChange) {
                onFechaRotacionChange(fecha);
            }
        } catch (error) {
            console.error('❌ TableroVinilica: Error rotando:', error);
        } finally {
            setCargando(false);
        }
    };

    // 🔴 Cargar orden base al inicio
    useEffect(() => {
        if (!baseCargadaRef.current) {
            const cargarBase = async () => {
                setCargando(true);
                try {
                    const base = await operarioService.getBase();
                    setOperariosPorMaquina(base);
                    setFechaRotacion(new Date());
                    
                    // 🔴 NOTIFICAR AL PADRE CON LOS OPERARIOS INICIALES
                    notificarOperariosAlPadre(base);
                    
                    // Notificar fecha inicial
                    if (onFechaRotacionChange) {
                        onFechaRotacionChange(new Date());
                    }
                    
                    baseCargadaRef.current = true;
                } catch (error) {
                    console.error('❌ TableroVinilica: Error cargando base:', error);
                } finally {
                    setCargando(false);
                }
            };
            cargarBase();
        }
    }, [onFechaRotacionChange]);

    // 🔴 ESCUCHAR EVENTO DE NAVEGACIÓN DESDE NIVEBAR
    useEffect(() => {
        const handleNavegarSemana = (e) => {
            
            let nuevasSemanas = semanas;            
            switch (e.detail.direccion) {
                case 'anterior':
                    nuevasSemanas = Math.max(0, semanas - 1);
                    break;
                case 'siguiente':
                    nuevasSemanas = semanas + 1;
                    break;
                case 'hoy':
                    nuevasSemanas = 0;
                    break;
                default:
                    return;
            }
            
            rotar(nuevasSemanas);
        };

        window.addEventListener('navegarSemana', handleNavegarSemana);
        return () => window.removeEventListener('navegarSemana', handleNavegarSemana);
    }, [semanas]);

    // 🔴 Escuchar evento de rotación desde otros componentes
    useEffect(() => {
        const handleRotacionActualizada = (e) => {
            console.log('🔄 TableroVinilica: Evento rotacionActualizada recibido:', e.detail);
            if (e.detail && e.detail.semanas !== undefined) {
                rotar(e.detail.semanas);
            }
        };

        window.addEventListener('rotacionActualizada', handleRotacionActualizada);
        return () => window.removeEventListener('rotacionActualizada', handleRotacionActualizada);
    }, []);

    // 🔴 Si el padre nos pasa operariosProps, actualizar nuestro estado
    useEffect(() => {
        if (operariosProps && typeof operariosProps === 'object' && Object.keys(operariosProps).length > 0) {
            console.log('📥 TableroVinilica: Recibiendo operarios del padre:', operariosProps);
            setOperariosPorMaquina(operariosProps);
        }
    }, [operariosProps]);

    if (cargando && !baseCargadaRef.current) {
        return (
            <div className="rondas-panel">
                <div className="tabla-rondas">
                    <div className="fila-ronda header">
                        <div></div>
                        {[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
                    </div>
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Cargando operarios...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rondas-panel">
            <div className="tabla-rondas">
                <div className="fila-ronda header">
                    <div></div>
                    {[...Array(6)].map((_, i) => <div key={i}>Ronda {i + 1}</div>)}
                </div>
                {rondas.map((fila, fIdx) => {
                    const maquinaId = 101 + fIdx;
                    const nombreOp = operariosPorMaquina[maquinaId] || 'Sin asignar';
                    if (filtroOperario && nombreOp !== filtroOperario) return null;
                    return (
                        <div className="fila-ronda" key={`${fIdx}-${semanas}`}>
                            <div className="etiqueta-ronda">
                                <span className="codigo-maquina">VI-{maquinaId}</span>
                                <span className="nombre-operario">{nombreOp}</span>
                            </div>
                            {fila.map((celda, cIdx) => (
                                <div 
                                    className="celda-ronda clickable" 
                                    key={cIdx} 
                                    onDragOver={(e) => e.preventDefault()} 
                                    onDrop={(e) => handleDrop(e, fIdx, cIdx)}
                                >
                                    {celda && (
                                        Array.isArray(celda) ? (
                                            celda.map((subCarga, subIdx) => (
                                                <div 
                                                    key={subCarga.idTemp} 
                                                    draggable 
                                                    onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx, subIndex: subIdx }))} 
                                                    onClick={() => { setCargaSeleccionada(subCarga); setMostrarDetalle(true); }}
                                                >
                                                    <CardCarga carga={subCarga} isCompact={true} />
                                                </div>
                                            ))
                                        ) : (
                                            <div 
                                                draggable 
                                                onDragStart={(e) => e.dataTransfer.setData("transferData", JSON.stringify({ tipo: 'ronda', f: fIdx, c: cIdx }))} 
                                                onClick={() => { setCargaSeleccionada(celda); setMostrarDetalle(true); }}
                                            >
                                                <CardCarga carga={celda} isCompact={false} />
                                            </div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TableroVinilica;