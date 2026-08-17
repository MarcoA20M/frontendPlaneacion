// TableroVinilica.jsx - TU VERSIÓN ORIGINAL + CONTADOR FUNCIONANDO (SIN CAMBIOS DE DISEÑO)
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    onOperariosActualizados,
    operariosPorMaquina: operariosProps,
    operariosVinilicaCompleto = []
}) {
    const [operariosPorMaquina, setOperariosPorMaquina] = useState({});
    const [cargando, setCargando] = useState(true);
    const [semanas, setSemanas] = useState(0);
    const [fechaRotacion, setFechaRotacion] = useState(new Date());
    const [limitesRondas, setLimitesRondas] = useState({});
    const [conteoRondasPorMaquina, setConteoRondasPorMaquina] = useState({});
    const baseCargadaRef = useRef(false);
    const limitesCargadosRef = useRef(false);

    // ========== FUNCIÓN PARA OBTENER LÍMITES (MEMOIZADA CON REF) ==========
    const cargarLimites = useCallback((mapaNombreId) => {
        try {
            const limites = operarioService.obtenerTodosLosLimites();
            const resultado = {};

            if (mapaNombreId && Object.keys(mapaNombreId).length > 0) {
                Object.entries(mapaNombreId).forEach(([nombre, id]) => {
                    if (limites[id] && limites[id].limite !== undefined) {
                        resultado[nombre] = limites[id].limite;
                    } else {
                        resultado[nombre] = 2;
                    }
                });
            } else {
                const nombresOperarios = Object.values(operariosPorMaquina).filter(op => op && op !== 'Sin asignar');
                
                nombresOperarios.forEach(nombre => {
                    let encontrado = false;
                    
                    for (const [id, data] of Object.entries(limites)) {
                        if (data.nombre && data.nombre === nombre) {
                            resultado[nombre] = data.limite || 2;
                            encontrado = true;
                            break;
                        }
                    }
                    
                    if (!encontrado) {
                        for (const [id, data] of Object.entries(limites)) {
                            if (id.includes(nombre) || nombre.includes(id)) {
                                resultado[nombre] = data.limite || 2;
                                encontrado = true;
                                break;
                            }
                        }
                    }
                    
                    if (!encontrado) {
                        resultado[nombre] = 2;
                    }
                });
            }
            
            return resultado;
            
        } catch (error) {
            console.error('❌ Error obteniendo límites:', error);
            return {};
        }
    }, [operariosPorMaquina]);

    // ========== CONSTRUIR MAPA NOMBRE -> ID ==========
    const construirMapaNombreId = useCallback((operariosConIds) => {
        const mapa = {};
        if (operariosConIds && operariosConIds.length > 0) {
            operariosConIds.forEach(op => {
                if (op.nombre && op.id) {
                    mapa[op.nombre] = op.id;
                }
            });
        }
        return mapa;
    }, []);

    // ========== NOTIFICAR AL PADRE ==========
    const notificarOperariosAlPadre = (nuevosOperarios) => {
        if (onOperariosActualizados) {
            onOperariosActualizados(nuevosOperarios);
        }
    };

    // ========== ROTAR ==========
    const rotar = useCallback(async (nuevasSemanas) => {
        setCargando(true);
        try {
            const response = await fetch(`https://pintuplaneacion-backend.onrender.com/api/operarios/vinilica/rotar?semanas=${nuevasSemanas}`);
            const data = await response.json();
            setOperariosPorMaquina(data);
            setSemanas(nuevasSemanas);
            
            if (operariosVinilicaCompleto && operariosVinilicaCompleto.length > 0) {
                const mapa = construirMapaNombreId(operariosVinilicaCompleto);
                const limites = cargarLimites(mapa);
                setLimitesRondas(limites);
            }
            
            setConteoRondasPorMaquina({});
            
            notificarOperariosAlPadre(data);
            
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + (nuevasSemanas * 7));
            setFechaRotacion(fecha);
            
            if (onFechaRotacionChange) {
                onFechaRotacionChange(fecha);
            }
        } catch (error) {
            console.error('❌ TableroVinilica: Error rotando:', error);
        } finally {
            setCargando(false);
        }
    }, [operariosVinilicaCompleto, construirMapaNombreId, cargarLimites, onFechaRotacionChange]);

    // ========== VERIFICAR SI OPERARIO PUEDE TOMAR RONDA ==========
    const puedeTomarRonda = (nombreOperario, maquinaId) => {
        if (!nombreOperario || nombreOperario === 'Sin asignar') return false;
        
        const limite = limitesRondas[nombreOperario] || 2;
        const conteoActual = conteoRondasPorMaquina[maquinaId]?.conteo || 0;
        
        return conteoActual < limite;
    };

    // ========== INCREMENTAR CONTEO DE RONDAS ==========
    const incrementarConteoRondas = (maquinaId, nombreOperario) => {
        setConteoRondasPorMaquina(prev => ({
            ...prev,
            [maquinaId]: {
                operario: nombreOperario,
                conteo: (prev[maquinaId]?.conteo || 0) + 1
            }
        }));
    };

    // ========== ⭐ SOLO ESTO SE AGREGÓ (NADA MÁS) ==========
    useEffect(() => {
        const nuevoConteo = {};
        
        rondas.forEach((fila, fIdx) => {
            const maquinaId = 101 + fIdx;
            let conteo = 0;
            
            fila.forEach(celda => {
                if (celda) {
                    if (Array.isArray(celda)) {
                        conteo += celda.length;
                    } else {
                        conteo += 1;
                    }
                }
            });
            
            if (conteo > 0) {
                const operario = operariosPorMaquina[maquinaId] || 'Sin asignar';
                nuevoConteo[maquinaId] = {
                    operario: operario,
                    conteo: conteo
                };
            }
        });
        
        setConteoRondasPorMaquina(nuevoConteo);
        
    }, [rondas, operariosPorMaquina]);

    // ========== CARGAR BASE (SOLO UNA VEZ) ==========
    useEffect(() => {
        if (!baseCargadaRef.current) {
            const cargarBase = async () => {
                setCargando(true);
                try {
                    const base = await operarioService.getBase();
                    setOperariosPorMaquina(base);
                    setFechaRotacion(new Date());
                    
                    if (operariosVinilicaCompleto && operariosVinilicaCompleto.length > 0) {
                        const mapa = construirMapaNombreId(operariosVinilicaCompleto);
                        const limites = cargarLimites(mapa);
                        setLimitesRondas(limites);
                    }
                    
                    notificarOperariosAlPadre(base);
                    
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
    }, [operariosVinilicaCompleto, construirMapaNombreId, cargarLimites, onFechaRotacionChange]);

    // ========== ACTUALIZAR LÍMITES CUANDO CAMBIEN LOS OPERARIOS (SOLO UNA VEZ) ==========
    useEffect(() => {
        if (baseCargadaRef.current && operariosVinilicaCompleto && operariosVinilicaCompleto.length > 0 && !limitesCargadosRef.current) {
            const mapa = construirMapaNombreId(operariosVinilicaCompleto);
            const limites = cargarLimites(mapa);
            setLimitesRondas(limites);
            limitesCargadosRef.current = true;
        }
    }, [operariosVinilicaCompleto, construirMapaNombreId, cargarLimites]);

    // ========== ESCUCHAR EVENTOS ==========
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
    }, [semanas, rotar]);

    useEffect(() => {
        const handleRotacionActualizada = (e) => {
            if (e.detail && e.detail.semanas !== undefined) {
                rotar(e.detail.semanas);
            }
        };

        window.addEventListener('rotacionActualizada', handleRotacionActualizada);
        return () => window.removeEventListener('rotacionActualizada', handleRotacionActualizada);
    }, [rotar]);

    // ========== RECIBIR OPERARIOS DEL PADRE ==========
    useEffect(() => {
        if (operariosProps && typeof operariosProps === 'object' && Object.keys(operariosProps).length > 0) {
            setOperariosPorMaquina(operariosProps);
            
            if (!limitesCargadosRef.current && operariosVinilicaCompleto && operariosVinilicaCompleto.length > 0) {
                const mapa = construirMapaNombreId(operariosVinilicaCompleto);
                const limites = cargarLimites(mapa);
                setLimitesRondas(limites);
                limitesCargadosRef.current = true;
            }
        }
    }, [operariosProps, operariosVinilicaCompleto, construirMapaNombreId, cargarLimites]);

    // ========== HANDLE DROP MODIFICADO CON LÍMITE ==========
    const handleDropConLimite = (e, fIdx, cIdx) => {
        e.preventDefault();
        
        const maquinaId = 101 + fIdx;
        const nombreOperario = operariosPorMaquina[maquinaId];
        
        if (!puedeTomarRonda(nombreOperario, maquinaId)) {
            const limite = limitesRondas[nombreOperario] || 2;
            alert(`⚠️ ${nombreOperario} ya alcanzó su límite de ${limite} rondas`);
            return;
        }
        
        handleDrop(e, fIdx, cIdx);
        
        if (nombreOperario && nombreOperario !== 'Sin asignar') {
            incrementarConteoRondas(maquinaId, nombreOperario);
        }
    };

    // ========== RENDER ==========
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
                    
                    const limite = limitesRondas[nombreOp] || 2;
                    const conteo = conteoRondasPorMaquina[maquinaId]?.conteo || 0;
                    
                    return (
                        <div className="fila-ronda" key={`${fIdx}-${semanas}`}>
                            <div className="etiqueta-ronda">
                                <span className="codigo-maquina">VI-{maquinaId}</span>
                                <span className="nombre-operario">
                                    {nombreOp}
                                    {nombreOp !== 'Sin asignar' && (
                                        <span 
                                            className="rondas-info" 
                                            style={{
                                                display: 'inline-block',
                                                marginLeft: '8px',
                                                fontSize: '11px',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: 'rgba(192,0,255,0.1)',
                                                color: '#c084fc',
                                                border: '1px solid rgba(192,0,255,0.2)'
                                            }}
                                        >
                                            {conteo}/{limite}
                                        </span>
                                    )}
                                </span>
                            </div>
                            {fila.map((celda, cIdx) => (
                                <div 
                                    className="celda-ronda clickable" 
                                    key={cIdx} 
                                    onDragOver={(e) => e.preventDefault()} 
                                    onDrop={(e) => handleDropConLimite(e, fIdx, cIdx)}
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