// services/pdfService.js
// ✅ SIN localStorage - TODO desde BD en tiempo real

import { operarioService } from './operarioService';

// ============================================================
// 🔴 OBTENER OPERARIO ESPECIAL ACTIVO DESDE BD
// ============================================================
const getOperarioEspecialActivo = async () => {
    try {
        console.log('🔄 Obteniendo operario especial desde BD...');
        
        const response = await fetch('http://localhost:8080/api/operarios/especiales');
        
        if (!response.ok) {
            console.error('❌ Error al obtener especiales de BD:', response.status);
            return null;
        }
        
        const operarios = await response.json();
        console.log('📋 Operarios especiales desde BD:', operarios);
        
        if (!operarios || operarios.length === 0) {
            console.warn('⚠️ No hay operarios especiales en BD');
            return null;
        }
        
        // Buscar el activo
        const activo = operarios.find(op => op.activo === true);
        if (activo) {
            console.log('✅ Operario especial activo desde BD:', activo.nombre);
            return activo.nombre;
        }
        
        // Si no hay activo, usar el primero
        console.log('📌 Usando primer operario especial:', operarios[0].nombre);
        return operarios[0].nombre;
        
    } catch (error) {
        console.error('❌ Error obteniendo operario especial de BD:', error);
        return null;
    }
};

// ============================================================
// 🔴 OBTENER OPERARIO DE ROTACIÓN DESDE BD
// ============================================================
export const getOperarioDeRotacion = async (numMaquina, fechaRef = new Date()) => {
    try {
        console.log(`🔄 Buscando operario en rotación para máquina ${numMaquina}...`);
        
        const rotacion = await operarioService.getRotacion(fechaRef);
        console.log(`📊 Rotación para máquina ${numMaquina}:`, rotacion);
        
        if (!rotacion) {
            console.warn(`⚠️ No hay rotación para máquina ${numMaquina}`);
            return null;
        }
        
        if (rotacion[numMaquina]) {
            console.log(`✅ Operario directo: ${rotacion[numMaquina]}`);
            return rotacion[numMaquina];
        }
        
        const grupos = {
            101: 'grupo0', 102: 'grupo0',
            103: 'grupo1', 104: 'grupo1',
            105: 'grupo2', 106: 'grupo2',
            107: 'grupo3', 108: 'grupo3'
        };
        
        const grupoBuscado = grupos[numMaquina];
        if (grupoBuscado) {
            for (const [key, value] of Object.entries(rotacion)) {
                const keyNum = parseInt(key);
                if (grupos[keyNum] === grupoBuscado) {
                    console.log(`🔄 Operario del mismo grupo: ${value}`);
                    return value;
                }
            }
        }
        
        console.warn(`⚠️ No se encontró operario para máquina ${numMaquina}`);
        return null;
        
    } catch (error) {
        console.error(`❌ Error en getOperarioDeRotacion:`, error);
        return null;
    }
};

// ============================================================
// 🔴 OBTENER OPERARIOS DE VINÍLICAS DESDE BD
// ============================================================
const obtenerOperariosVinilica = async () => {
    try {
        console.log('🔄 Obteniendo operarios vinílicas desde BD...');
        const operarios = await operarioService.getVinilica();
        console.log('📋 Operarios vinílicas desde BD:', operarios);
        
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
        
        return operariosMap;
        
    } catch (error) {
        console.error("❌ Error obteniendo operarios vinílicas:", error);
        return {};
    }
};

// ============================================================
// 🔴 OBTENER OPERARIOS DE ESMALTES DESDE BD
// ============================================================
const obtenerOperariosEsmaltes = async () => {
    try {
        console.log('🔄 Obteniendo operarios de esmaltes desde BD...');
        const todos = await operarioService.getAll();
        console.log('📋 Todos los operarios:', todos);
        
        const esmaltes = todos.filter(op => op.area === 'esmaltes');
        console.log('✅ Operarios de esmaltes:', esmaltes);
        
        return esmaltes;
        
    } catch (error) {
        console.error('❌ Error obteniendo operarios de esmaltes:', error);
        return [];
    }
};

// ============================================================
// 🔴 FORMATEAR OPERARIO
// ============================================================
const formatearOperario = (operario) => {
    if (!operario) return null;
    
    if (typeof operario === 'string') {
        const trimmed = operario.trim();
        return trimmed || null;
    }
    
    if (typeof operario === 'object' && operario !== null) {
        const nombre = operario.nombre || operario.name || operario.Nombre || operario.Name || operario.operario;
        if (nombre && typeof nombre === 'string') {
            const trimmed = nombre.trim();
            return trimmed || null;
        }
    }
    
    return null;
};

// ============================================================
// 🔴 OBTENER OPERARIO DE CARGA DESDE BD
// ============================================================
const obtenerOperarioDeCarga = async (carga, numMaquina, operariosBD, fechaRef) => {
    try {
        // 1. Intentar desde la carga
        if (carga.operario) {
            const formateado = formatearOperario(carga.operario);
            if (formateado) {
                console.log(`👤 Carga tiene operario: ${formateado}`);
                return formateado;
            }
        }
        
        // 2. Intentar desde rotación
        if (numMaquina) {
            const rotacionOp = await getOperarioDeRotacion(numMaquina, fechaRef);
            if (rotacionOp) {
                console.log(`👤 Máquina ${numMaquina} -> Rotación: ${rotacionOp}`);
                return rotacionOp;
            }
        }
        
        // 3. Intentar desde BD de vinílicas
        if (numMaquina && operariosBD && operariosBD[numMaquina]) {
            const bdNombre = formatearOperario(operariosBD[numMaquina]);
            if (bdNombre) {
                console.log(`👤 Máquina ${numMaquina} -> BD Vinílicas: ${bdNombre}`);
                return bdNombre;
            }
        }
        
        console.log(`⚠️ Sin operario para máquina ${numMaquina}`);
        return null;
        
    } catch (error) {
        console.error('❌ Error en obtenerOperarioDeCarga:', error);
        return null;
    }
};

// ============================================================
// 🔴 FUNCIÓN PRINCIPAL: PDF CON RONDAS
// ============================================================
export const procesarPdfConRondas = async (file, rondas, cargasEspeciales = []) => {
    try {
        console.log('🚀 Iniciando procesarPdfConRondas...');
        console.log('📦 Cargas especiales recibidas:', cargasEspeciales);
        
        const formData = new FormData();
        formData.append("file", file);
        
        // 🔴 OBTENER OPERARIO ESPECIAL DESDE BD
        const operarioEspecial = await getOperarioEspecialActivo();
        console.log('👤 Operario especial desde BD:', operarioEspecial);
        
        // 🔴 OBTENER OPERARIOS VINÍLICAS DESDE BD
        const operariosBD = await obtenerOperariosVinilica();
        console.log('📋 Operarios vinílicas desde BD:', operariosBD);
        
        const todasLasCargas = [];
        const fechaRef = new Date();

        // ============================================================
        // 🔴 PROCESAR RONDAS
        // ============================================================
        if (rondas && Array.isArray(rondas)) {
            for (let fIdx = 0; fIdx < rondas.length; fIdx++) {
                const fila = rondas[fIdx];
                if (!fila || !Array.isArray(fila)) continue;
                
                const numMaquina = 101 + fIdx;
                
                for (let cIdx = 0; cIdx < fila.length; cIdx++) {
                    const celda = fila[cIdx];
                    if (!celda) continue;

                    const procesarCarga = async (carga) => {
                        if (!carga) return null;
                        
                        try {
                            const operarioNombre = await obtenerOperarioDeCarga(carga, numMaquina, operariosBD, fechaRef);
                            const operarioFinal = operarioNombre || 'Sin asignar';
                            
                            const folio = carga.folio || carga.lote || carga.numeroLote || 
                                        `V${String(numMaquina).padStart(3, '0')}${String(cIdx + 1).padStart(2, '0')}`;

                            return {
                                ...carga,
                                folio: folio,
                                ronda: cIdx + 1,
                                maquina: `VI-${numMaquina}`,
                                operario: operarioFinal,
                                textoMaquina: `VI-${numMaquina} ${operarioFinal}`,
                                textoOperario: operarioFinal,
                                codigoProducto: carga.codigoProducto || carga.codigo || 'S/C',
                                litros: carga.litros || 0,
                                detallesEnvasado: carga.detallesEnvasado || [],
                                nivelCubriente: carga.nivelCubriente || 0
                            };
                        } catch (error) {
                            console.error('❌ Error procesando carga:', error);
                            return null;
                        }
                    };

                    if (Array.isArray(celda)) {
                        for (const c of celda) {
                            const procesada = await procesarCarga(c);
                            if (procesada) todasLasCargas.push(procesada);
                        }
                    } else {
                        const procesada = await procesarCarga(celda);
                        if (procesada) todasLasCargas.push(procesada);
                    }
                }
            }
        }

        // ============================================================
        // 🔴 PROCESAR CARGAS ESPECIALES
        // ============================================================
        if (cargasEspeciales && Array.isArray(cargasEspeciales)) {
            console.log('🔄 Procesando cargas especiales...');
            
            for (let index = 0; index < cargasEspeciales.length; index++) {
                const esp = cargasEspeciales[index];
                if (!esp) continue;
                
                try {
                    console.log(`📦 Carga especial ${index}:`, esp);
                    
                    let operarioFinal = null;
                    
                    // 1. Intentar desde esp.operario
                    if (esp.operario) {
                        const formateado = formatearOperario(esp.operario);
                        if (formateado) {
                            operarioFinal = formateado;
                            console.log(`✅ Carga ${index} tiene operario propio: ${operarioFinal}`);
                        }
                    }
                    
                    // 2. Intentar desde esp.nombreOperario
                    if (!operarioFinal && esp.nombreOperario) {
                        const formateado = formatearOperario(esp.nombreOperario);
                        if (formateado) {
                            operarioFinal = formateado;
                            console.log(`✅ Carga ${index} tiene nombreOperario: ${operarioFinal}`);
                        }
                    }
                    
                    // 3. Intentar desde esp.operarioEspecial
                    if (!operarioFinal && esp.operarioEspecial) {
                        const formateado = formatearOperario(esp.operarioEspecial);
                        if (formateado) {
                            operarioFinal = formateado;
                            console.log(`✅ Carga ${index} tiene operarioEspecial: ${operarioFinal}`);
                        }
                    }
                    
                    // 4. Usar operario especial de BD
                    if (!operarioFinal && operarioEspecial) {
                        operarioFinal = operarioEspecial;
                        console.log(`🔄 Carga ${index} usando operario especial de BD: ${operarioFinal}`);
                    }
                    
                    // 5. Si nada funciona, Sin asignar
                    if (!operarioFinal) {
                        operarioFinal = 'Sin asignar';
                        console.log(`⚠️ Carga ${index} sin operario`);
                    }
                    
                    const cargaEspecial = {
                        ...esp,
                        folio: esp.folio || esp.lote || esp.numeroLote || `ESP-${index + 1}`,
                        ronda: 'ESP',
                        maquina: 'ESPECIAL',
                        operario: operarioFinal,
                        textoMaquina: `ESPECIAL ${operarioFinal}`,
                        textoOperario: operarioFinal,
                        codigoProducto: esp.codigoProducto || esp.codigo || 'S/C',
                        litros: esp.litros || 0
                    };
                    
                    console.log(`✅ Carga especial ${index} procesada:`, {
                        folio: cargaEspecial.folio,
                        operario: cargaEspecial.operario
                    });
                    
                    todasLasCargas.push(cargaEspecial);
                    
                } catch (error) {
                    console.error(`❌ Error procesando carga especial ${index}:`, error);
                }
            }
        }

        // ============================================================
        // 🔴 VERIFICACIÓN FINAL
        // ============================================================
        todasLasCargas.forEach((c, index) => {
            if (!c.operario || typeof c.operario !== 'string') {
                console.warn(`⚠️ Carga ${index} sin operario válido`);
                c.operario = 'Sin asignar';
                c.textoOperario = 'Sin asignar';
            }
        });

        console.log('📤 Cargas finales:', todasLasCargas.map(c => ({
            folio: c.folio,
            maquina: c.maquina,
            operario: c.operario
        })));

        // ============================================================
        // 🔴 ENVIAR AL BACKEND
        // ============================================================
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
        
        // 🔴 OBTENER OPERARIOS DE ESMALTES DESDE BD
        const operariosEsmaltes = await obtenerOperariosEsmaltes();
        console.log('👥 Operarios de esmaltes desde BD:', operariosEsmaltes);
        
        const formData = new FormData();
        formData.append("file", file);
        
        const cargasSimples = cargasEsmaltes.map(carga => {
            if (!carga) return null;
            
            try {
                let operarioNombre = null;
                
                // Si la carga tiene operario, usarlo
                if (carga.operario) {
                    const formateado = formatearOperario(carga.operario);
                    if (formateado) {
                        operarioNombre = formateado;
                    }
                }
                
                // Si no tiene, buscar por puesto
                if (!operarioNombre && carga.puesto) {
                    const operario = operariosEsmaltes.find(op => 
                        op.puesto && op.puesto.toLowerCase() === carga.puesto.toLowerCase()
                    );
                    if (operario) {
                        operarioNombre = operario.nombre;
                        console.log(`👤 Operario por puesto "${carga.puesto}": ${operarioNombre}`);
                    }
                }
                
                // Si no tiene, usar el primero disponible
                if (!operarioNombre && operariosEsmaltes.length > 0) {
                    operarioNombre = operariosEsmaltes[0].nombre;
                    console.log(`📌 Usando primer operario de esmaltes: ${operarioNombre}`);
                }
                
                if (!operarioNombre) {
                    operarioNombre = 'Sin asignar';
                }
                
                return {
                    folio: carga.folio || carga.lote || carga.numeroLote || '?',
                    codigo: carga.codigo || carga.codigoProducto || '?',
                    litros: carga.litros || 0,
                    operario: String(operarioNombre),
                    detallesEnvasado: carga.detallesEnvasado || []
                };
            } catch (error) {
                console.error('❌ Error formateando carga de esmalte:', error);
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

// ============================================================
// 🔴 EXPORTAR FUNCIÓN PARA OBTENER OPERARIO ESPECIAL
// ============================================================
export const getOperarioEspecialActivoExport = async () => {
    return await getOperarioEspecialActivo();
};