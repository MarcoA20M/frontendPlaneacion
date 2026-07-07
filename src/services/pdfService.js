// services/pdfService.js - CORRECCIÓN PARA EL FORMATO DE MÁQUINA

import { operarioService } from './operarioService';
import { getOperarioPorMaquinaSync } from '../constants/config';

// 🔴 Función auxiliar para obtener el operario especial activo
const getOperarioEspecialActivo = () => {
    try {
        const guardado = localStorage.getItem("operarios_especiales");
        if (guardado) {
            const operarios = JSON.parse(guardado);
            const activo = operarios.find(op => op.activo === true);
            if (activo) return activo.nombre;
        }
    } catch (error) {
        console.error("Error al obtener operario especial:", error);
    }
    return "Lazaro";
};




// 🔴 Función para obtener operarios de vinílicas desde BD (ASYNC)
const obtenerOperariosVinilica = async () => {
    try {
        const operarios = await operarioService.getVinilica();
        console.log('📋 Operarios Vinílicas desde BD:', operarios);
        
        let operariosMap = {};
        if (Array.isArray(operarios)) {
            operarios.forEach(op => {
                if (op.numMaquina) {
                    operariosMap[op.numMaquina] = op.nombre || 'Sin asignar';
                }
            });
        } else {
            operariosMap = operarios;
        }
        
        try {
            localStorage.setItem("operarios_vinilica", JSON.stringify(operariosMap));
        } catch (e) {
            // Ignorar
        }
        
        return operariosMap;
    } catch (error) {
        console.error("❌ Error obteniendo operarios vinílicas:", error);
        return {};
    }
};

// 🔴 Función auxiliar para formatear el operario como string
const formatearOperario = (operario) => {
    if (!operario) return 'Sin asignar';
    
    if (typeof operario === 'string') {
        return operario.trim() || 'Sin asignar';
    }
    
    if (typeof operario === 'object' && operario !== null) {
        const nombre = operario.nombre || operario.name || operario.Nombre || operario.Name;
        if (nombre && typeof nombre === 'string') {
            return nombre.trim() || 'Sin asignar';
        }
        try {
            const str = String(operario);
            if (str && str !== '[object Object]' && str !== '[object Promise]') {
                return str;
            }
        } catch (e) {
            // Ignorar
        }
    }
    
    return 'Sin asignar';
};

// 🔴 Función para obtener operario de una carga específica (SINCRÓNICA)
const obtenerOperarioDeCarga = (carga, numMaquina, operariosBD) => {
    let operarioNombre = 'Sin asignar';
    
    try {
        // 1. Intentar obtener de la carga
        if (carga.operario) {
            const formateado = formatearOperario(carga.operario);
            if (formateado !== 'Sin asignar') {
                return formateado;
            }
        }
        
        // 2. Usar BD
        if (numMaquina && operariosBD && operariosBD[numMaquina]) {
            const bdNombre = formatearOperario(operariosBD[numMaquina]);
            if (bdNombre !== 'Sin asignar') {
                console.log(`👤 Máquina ${numMaquina} -> Operario desde BD: ${bdNombre}`);
                return bdNombre;
            }
        }
        
        // 3. Fallback: usar versión sincrónica de config
        if (numMaquina) {
            const fallback = getOperarioPorMaquinaSync(numMaquina);
            const fallbackNombre = formatearOperario(fallback);
            if (fallbackNombre !== 'Sin asignar') {
                console.log(`👤 Máquina ${numMaquina} -> Operario desde fallback: ${fallbackNombre}`);
                return fallbackNombre;
            }
        }
    } catch (error) {
        console.error('❌ Error en obtenerOperarioDeCarga:', error);
    }
    
    return 'Sin asignar';
};

// ============================================================
// 🔴 FUNCIÓN PRINCIPAL: PDF VINÍLICAS (CON RONDAS)
// ============================================================
export const procesarPdfConRondas = async (file, rondas, cargasEspeciales = []) => {
    try {
        console.log('🚀 Iniciando procesarPdfConRondas...');
        
        // Obtener operarios de BD
        const operariosBD = await obtenerOperariosVinilica();
        console.log('📋 Operarios BD para PDF:', operariosBD);

        const formData = new FormData();
        formData.append("file", file);
        
        const operarioEspecial = getOperarioEspecialActivo();
        console.log('👤 Operario especial:', operarioEspecial);

        const todasLasCargas = [];

        // 🔴 PROCESAR RONDAS
        if (rondas && Array.isArray(rondas)) {
            rondas.forEach((fila, fIdx) => {
                if (!fila || !Array.isArray(fila)) return;
                
                const numMaquina = 101 + fIdx;
                
                fila.forEach((celda, cIdx) => {
                    if (!celda) return;

                    const procesarCarga = (carga) => {
                        if (!carga) return null;
                        
                        try {
                            const operarioNombre = obtenerOperarioDeCarga(carga, numMaquina, operariosBD);
                            const operarioFinal = String(operarioNombre || 'Sin asignar');
                            
                            const folio = carga.folio || carga.lote || carga.numeroLote || 
                                         `V${String(numMaquina).padStart(3, '0')}${String(cIdx + 1).padStart(2, '0')}`;

                            // 🔴🔴🔴 FORMATO CORRECTO DE MÁQUINA: "VI-101"
                            const maquinaFormateada = `VI-${numMaquina}`;

                            return {
                                ...carga,
                                folio: folio,
                                ronda: cIdx + 1,
                                maquina: maquinaFormateada,  // 🔴 AHORA ES "VI-101"
                                operario: operarioFinal,
                                textoMaquina: `VI-${numMaquina} ${operarioFinal}`,
                                textoOperario: operarioFinal,
                                codigoProducto: carga.codigoProducto || carga.codigo || 'S/C',
                                litros: carga.litros || 0,
                                detallesEnvasado: carga.detallesEnvasado || [],
                                nivelCubriente: carga.nivelCubriente || 0
                            };
                        } catch (error) {
                            console.error('❌ Error procesando carga:', error, carga);
                            return null;
                        }
                    };

                    if (Array.isArray(celda)) {
                        celda.forEach(c => {
                            const procesada = procesarCarga(c);
                            if (procesada) todasLasCargas.push(procesada);
                        });
                    } else {
                        const procesada = procesarCarga(celda);
                        if (procesada) todasLasCargas.push(procesada);
                    }
                });
            });
        }

        // 🔴 PROCESAR CARGAS ESPECIALES
        if (cargasEspeciales && Array.isArray(cargasEspeciales)) {
            cargasEspeciales.forEach(esp => {
                if (!esp) return;
                
                try {
                    let operarioNombre = formatearOperario(esp.operario);
                    if (operarioNombre === 'Sin asignar') {
                        operarioNombre = operarioEspecial;
                    }
                    
                    const operarioFinal = String(operarioNombre || 'Lazaro');
                    
                    todasLasCargas.push({
                        ...esp,
                        folio: esp.folio || esp.lote || esp.numeroLote || 'ESPECIAL',
                        ronda: 'ESP',
                        maquina: 'ESPECIAL',  // 🔴 Las especiales quedan como "ESPECIAL"
                        operario: operarioFinal,
                        textoMaquina: `ESPECIAL ${operarioFinal}`,
                        textoOperario: operarioFinal,
                        codigoProducto: esp.codigoProducto || esp.codigo || 'S/C',
                        litros: esp.litros || 0
                    });
                } catch (error) {
                    console.error('❌ Error procesando carga especial:', error, esp);
                }
            });
        }

        // 🔴 VERIFICACIÓN FINAL
        todasLasCargas.forEach((c, index) => {
            if (!c.operario || typeof c.operario !== 'string') {
                console.warn(`⚠️ Carga ${index} tiene operario inválido:`, c.operario);
                c.operario = 'Sin asignar';
                c.textoOperario = 'Sin asignar';
            }
            // Asegurar que maquina tenga el formato correcto
            if (c.maquina && c.maquina !== 'ESPECIAL' && !c.maquina.startsWith('VI-')) {
                const num = c.maquina.replace(/\D/g, '');
                if (num) {
                    c.maquina = `VI-${num}`;
                }
            }
        });

        console.log('📤 Cargas finales para PDF:', todasLasCargas.map(c => ({
            folio: c.folio,
            maquina: c.maquina,
            operario: c.operario,
            tipoOperario: typeof c.operario
        })));

        // 🔴 ENVIAR AL BACKEND
        formData.append("cargas", JSON.stringify({
            cargas: todasLasCargas,
            operarioEspecial: operarioEspecial
        }));

        console.log('📤 Enviando al backend...');

        const response = await fetch("http://localhost:5000/procesar_pdf", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al procesar el PDF: ${response.status} - ${errorText}`);
        }
        
        console.log('✅ PDF procesado exitosamente');
        return await response.blob();

    } catch (error) {
        console.error('❌ Error en procesarPdfConRondas:', error);
        throw error;
    }
};

// ============================================================
// 🔴 FUNCIÓN PARA ESMALTES
// ============================================================
export const procesarPdfEsmaltes = async (file, cargasEsmaltes) => {
    try {
        console.log('🚀 Iniciando procesarPdfEsmaltes...');
        
        const formData = new FormData();
        formData.append("file", file);
        
        const cargasSimples = cargasEsmaltes.map(carga => {
            if (!carga) return null;
            
            try {
                let operarioNombre = 'Sin asignar';
                if (carga.operario) {
                    operarioNombre = formatearOperario(carga.operario);
                }
                
                return {
                    folio: carga.folio || carga.lote || carga.numeroLote || '?',
                    codigo: carga.codigo || carga.codigoProducto || '?',
                    litros: carga.litros || 0,
                    operario: String(operarioNombre || 'Área Esmaltes'),
                    detallesEnvasado: carga.detallesEnvasado || []
                };
            } catch (error) {
                console.error('❌ Error formateando carga de esmalte:', error, carga);
                return null;
            }
        }).filter(Boolean);
        
        formData.append("cargas", JSON.stringify({
            cargas: cargasSimples
        }));

        const response = await fetch("http://localhost:5000/procesar_pdf_esmaltes", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al procesar el PDF de esmaltes: ${response.status} - ${errorText}`);
        }
        
        console.log('✅ PDF de esmaltes procesado exitosamente');
        return await response.blob();
    } catch (error) {
        console.error('❌ Error en procesarPdfEsmaltes:', error);
        throw error;
    }
};