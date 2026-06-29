// src/components/TanqueVisual.js
import React from 'react';
import '../styles/tanqueVisual.css';

export default function TanqueVisual({ 
    nivelActual, 
    capacidadMaxima, 
    unidad = 'L',
    nombre = '',
    codigo = '',
    tipo = 'BASE',
    umbralCritico = null,
    umbralAlerta = null
}) {
    // ===== FUNCIÓN PARA FORMATEAR NÚMEROS SIN DECIMALES =====
    const formatearNumero = (numero) => {
        if (numero === undefined || numero === null || isNaN(numero)) return '0';
        return Math.round(numero).toLocaleString('es-ES');
    };

    // Calcular porcentaje de llenado
    const porcentaje = capacidadMaxima > 0 ? (nivelActual / capacidadMaxima) * 100 : 0;
    const porcentajeLimitado = Math.min(Math.max(porcentaje, 0), 100);
    
    // Determinar color según nivel
    let colorNivel = '#10B981'; // Verde (óptimo)
    if (umbralCritico && nivelActual <= umbralCritico) {
        colorNivel = '#EF4444'; // Rojo (crítico)
    } else if (umbralAlerta && nivelActual <= umbralAlerta) {
        colorNivel = '#F59E0B'; // Amarillo (alerta)
    } else if (porcentaje > 80) {
        colorNivel = '#10B981'; // Verde (óptimo)
    } else if (porcentaje > 50) {
        colorNivel = '#3B82F6'; // Azul (normal)
    } else {
        colorNivel = '#8B5CF6'; // Púrpura (bajo)
    }

    // Determinar estado
    let estado = 'ÓPTIMO';
    let estadoIcono = '🟢';
    if (umbralCritico && nivelActual <= umbralCritico) {
        estado = 'CRÍTICO';
        estadoIcono = '🔴';
    } else if (umbralAlerta && nivelActual <= umbralAlerta) {
        estado = 'ALERTA';
        estadoIcono = '🟡';
    } else if (porcentaje < 30) {
        estado = 'BAJO';
        estadoIcono = '🟣';
    }

    // Colores por tipo
    const coloresTipo = {
        'RESINA': '#8B5CF6',
        'BASE': '#8B5CF6',
        'PIGMENTO': '#EC4899',
        'SOLVENTE': '#06B6D4',
        'ADITIVO': '#F59E0B',
        'CARGA': '#10B981'
    };
    const colorTipo = coloresTipo[tipo] || '#6B7280';

    return (
        <div className="tv-container">
            <div className="tv-header">
                <div className="tv-titulo">
                    <span className="tv-codigo">{codigo}</span>
                    <span className="tv-nombre">{nombre}</span>
                </div>
                <div className="tv-estado" style={{ borderColor: colorNivel }}>
                    <span>{estadoIcono}</span>
                    <span style={{ color: colorNivel }}>{estado}</span>
                </div>
            </div>

            <div className="tv-cuerpo">
                {/* Representación del tanque */}
                <div className="tv-grafico">
                    {/* Tapa del tanque */}
                    <div className="tv-tapa" style={{ borderColor: colorTipo }}>
                        <div className="tv-tapa-detalle"></div>
                    </div>
                    
                    {/* Cuerpo del tanque */}
                    <div className="tv-cuerpo-tanque" style={{ borderColor: colorTipo }}>
                        {/* Nivel de líquido */}
                        <div 
                            className="tv-nivel" 
                            style={{ 
                                height: `${porcentajeLimitado}%`,
                                background: `linear-gradient(to top, ${colorNivel}, ${colorNivel}dd)`,
                                boxShadow: `inset 0 0 20px ${colorNivel}44`
                            }}
                        >
                            {/* Ondas en el líquido */}
                            <div className="tv-onda"></div>
                            <div className="tv-onda tv-onda-2"></div>
                            
                            {/* Burbujas decorativas */}
                            <div className="tv-burbuja tv-burbuja-1"></div>
                            <div className="tv-burbuja tv-burbuja-2"></div>
                            <div className="tv-burbuja tv-burbuja-3"></div>
                            
                            {/* Porcentaje dentro del tanque - SIN DECIMALES */}
                            {porcentajeLimitado > 15 && (
                                <div className="tv-porcentaje-interior">
                                    {Math.round(porcentajeLimitado)}%
                                </div>
                            )}
                        </div>
                        
                        {/* Líneas de medición */}
                        <div className="tv-mediciones">
                            <div className="tv-medicion" style={{ bottom: '0%' }}>0</div>
                            <div className="tv-medicion" style={{ bottom: '25%' }}>25</div>
                            <div className="tv-medicion" style={{ bottom: '50%' }}>50</div>
                            <div className="tv-medicion" style={{ bottom: '75%' }}>75</div>
                            <div className="tv-medicion" style={{ bottom: '100%' }}>100</div>
                        </div>
                    </div>
                    
                    {/* Base del tanque */}
                    <div className="tv-base" style={{ borderColor: colorTipo }}>
                        <div className="tv-base-detalle"></div>
                    </div>
                </div>

                {/* Información del tanque */}
                <div className="tv-info">
                    <div className="tv-info-item">
                        <span className="tv-info-label">📊 Capacidad</span>
                        <span className="tv-info-valor">
                            {formatearNumero(capacidadMaxima)} {unidad}
                        </span>
                    </div>
                    <div className="tv-info-item">
                        <span className="tv-info-label">📉 Nivel Actual</span>
                        <span className="tv-info-valor" style={{ color: colorNivel }}>
                            {formatearNumero(nivelActual)} {unidad}
                        </span>
                    </div>
                    <div className="tv-info-item">
                        <span className="tv-info-label">📈 Porcentaje</span>
                        <span className="tv-info-valor" style={{ color: colorNivel }}>
                            {Math.round(porcentajeLimitado)}%
                        </span>
                    </div>
                    <div className="tv-info-item">
                        <span className="tv-info-label">📦 Tipo</span>
                        <span className="tv-info-valor">
                            <span className="tv-tipo-badge" style={{ backgroundColor: colorTipo }}>
                                {tipo || 'N/A'}
                            </span>
                        </span>
                    </div>
                    <div className="tv-info-item">
                        <span className="tv-info-label">⚡ Espacio disponible</span>
                        <span className="tv-info-valor">
                            {formatearNumero(capacidadMaxima - nivelActual)} {unidad}
                        </span>
                    </div>
                    {umbralAlerta && (
                        <div className="tv-info-item">
                            <span className="tv-info-label">🟡 Umbral Alerta</span>
                            <span className="tv-info-valor">
                                {formatearNumero(umbralAlerta)} {unidad}
                            </span>
                        </div>
                    )}
                    {umbralCritico && (
                        <div className="tv-info-item">
                            <span className="tv-info-label">🔴 Umbral Crítico</span>
                            <span className="tv-info-valor">
                                {formatearNumero(umbralCritico)} {unidad}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}