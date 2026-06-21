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
        <div className="tanque-visual-container">
            <div className="tanque-visual-header">
                <div className="tanque-visual-titulo">
                    <span className="tanque-visual-codigo">{codigo}</span>
                    <span className="tanque-visual-nombre">{nombre}</span>
                </div>
                <div className="tanque-visual-estado" style={{ borderColor: colorNivel }}>
                    <span>{estadoIcono}</span>
                    <span style={{ color: colorNivel }}>{estado}</span>
                </div>
            </div>

            <div className="tanque-visual-cuerpo">
                {/* Representación del tanque */}
                <div className="tanque-visual-grafico">
                    {/* Tapa del tanque */}
                    <div className="tanque-tapa" style={{ borderColor: colorTipo }}>
                        <div className="tanque-tapa-detalle"></div>
                    </div>
                    
                    {/* Cuerpo del tanque */}
                    <div className="tanque-cuerpo" style={{ borderColor: colorTipo }}>
                        {/* Nivel de líquido */}
                        <div 
                            className="tanque-nivel" 
                            style={{ 
                                height: `${porcentajeLimitado}%`,
                                background: `linear-gradient(to top, ${colorNivel}, ${colorNivel}dd)`,
                                boxShadow: `inset 0 0 20px ${colorNivel}44`
                            }}
                        >
                            {/* Ondas en el líquido */}
                            <div className="tanque-onda"></div>
                            <div className="tanque-onda tanque-onda-2"></div>
                            
                            {/* Burbujas decorativas */}
                            <div className="burbuja burbuja-1"></div>
                            <div className="burbuja burbuja-2"></div>
                            <div className="burbuja burbuja-3"></div>
                            
                            {/* Porcentaje dentro del tanque */}
                            {porcentajeLimitado > 15 && (
                                <div className="tanque-porcentaje-interior">
                                    {porcentajeLimitado.toFixed(0)}%
                                </div>
                            )}
                        </div>
                        
                        {/* Líneas de medición */}
                        <div className="tanque-mediciones">
                            <div className="medicion" style={{ bottom: '0%' }}>0</div>
                            <div className="medicion" style={{ bottom: '25%' }}>25</div>
                            <div className="medicion" style={{ bottom: '50%' }}>50</div>
                            <div className="medicion" style={{ bottom: '75%' }}>75</div>
                            <div className="medicion" style={{ bottom: '100%' }}>100</div>
                        </div>
                    </div>
                    
                    {/* Base del tanque */}
                    <div className="tanque-base" style={{ borderColor: colorTipo }}>
                        <div className="tanque-base-detalle"></div>
                    </div>
                </div>

                {/* Información del tanque */}
                <div className="tanque-visual-info">
                    <div className="tanque-info-item">
                        <span className="tanque-info-label">📊 Capacidad</span>
                        <span className="tanque-info-valor">
                            {new Intl.NumberFormat('es-ES').format(capacidadMaxima)} {unidad}
                        </span>
                    </div>
                    <div className="tanque-info-item">
                        <span className="tanque-info-label">📉 Nivel Actual</span>
                        <span className="tanque-info-valor" style={{ color: colorNivel }}>
                            {new Intl.NumberFormat('es-ES').format(nivelActual)} {unidad}
                        </span>
                    </div>
                    <div className="tanque-info-item">
                        <span className="tanque-info-label">📈 Porcentaje</span>
                        <span className="tanque-info-valor" style={{ color: colorNivel }}>
                            {porcentajeLimitado.toFixed(1)}%
                        </span>
                    </div>
                    <div className="tanque-info-item">
                        <span className="tanque-info-label">📦 Tipo</span>
                        <span className="tanque-info-valor">
                            <span className="tipo-badge" style={{ backgroundColor: colorTipo }}>
                                {tipo || 'N/A'}
                            </span>
                        </span>
                    </div>
                    <div className="tanque-info-item">
                        <span className="tanque-info-label">⚡ Espacio disponible</span>
                        <span className="tanque-info-valor">
                            {new Intl.NumberFormat('es-ES').format(capacidadMaxima - nivelActual)} {unidad}
                        </span>
                    </div>
                    {umbralAlerta && (
                        <div className="tanque-info-item">
                            <span className="tanque-info-label">🟡 Umbral Alerta</span>
                            <span className="tanque-info-valor">
                                {new Intl.NumberFormat('es-ES').format(umbralAlerta)} {unidad}
                            </span>
                        </div>
                    )}
                    {umbralCritico && (
                        <div className="tanque-info-item">
                            <span className="tanque-info-label">🔴 Umbral Crítico</span>
                            <span className="tanque-info-valor">
                                {new Intl.NumberFormat('es-ES').format(umbralCritico)} {unidad}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}