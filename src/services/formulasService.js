// src/services/formulasService.js
import API_URL from "../config/api";

const API_BASE_URL = `${API_URL}/formulas`;

export const formulasService = {
    // Listar fórmulas de un producto
    listarPorProducto: async (productoId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/producto/${productoId}`);
            if (!response.ok) throw new Error("Error al cargar fórmulas");
            return await response.json();
        } catch (error) {
            console.error("Error en listarPorProducto:", error);
            return [];
        }
    },

    // Crear nueva fórmula (solo cantidadPorLitro)
    crear: async (data) => {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productoId: data.productoId,
                    materiaPrimaId: data.materiaPrimaId,
                    cantidadPorLitro: data.cantidadPorLitro
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Error al crear fórmula");
            }
            return await response.json();
        } catch (error) {
            console.error("Error en crear:", error);
            throw error;
        }
    },

    // Actualizar fórmula
    actualizar: async (id, data) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productoId: data.productoId,
                    materiaPrimaId: data.materiaPrimaId,
                    cantidadPorLitro: data.cantidadPorLitro
                })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Error al actualizar fórmula");
            }
            return await response.json();
        } catch (error) {
            console.error("Error en actualizar:", error);
            throw error;
        }
    },

    // Obtener productos que consumen una materia prima
    getProductosQueConsumen: async (materiaPrimaId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/materia-prima/${materiaPrimaId}`);
            if (!response.ok) throw new Error("Error al cargar productos relacionados");
            return await response.json();
        } catch (error) {
            console.error("Error en getProductosQueConsumen:", error);
            return [];
        }
    },

    // Calcular consumo mensual
    calcularConsumoMensual: (formulas, produccionMensual = 1000) => {
        return formulas.reduce((total, formula) => {
            return total + (formula.cantidadPorLitro * produccionMensual);
        }, 0);
    },

    // Eliminar fórmula
    eliminar: async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error("Error al eliminar fórmula");
            return await response.json();
        } catch (error) {
            console.error("Error en eliminar:", error);
            throw error;
        }
    },

    // Consumir bases desde cargas
    consumirBasesDesdeCargas: async (cargas) => {
        console.log('🚀 Consumiendo bases desde cargas:', cargas);
        
        const resultados = [];
        const errores = [];

        // ✅ Usamos import dinámico o import estático al inicio
        const { materiaPrimaService } = await import('./materiaPrimaService');

        for (const carga of cargas) {
            const codigoProducto = carga.codigo || carga.codigoProducto;
            const litros = parseFloat(carga.litros) || 0;
            const folio = carga.folio || carga.lote || 'S/F';
            
            console.log(`📦 Procesando: ${codigoProducto} - ${litros} L - Folio: ${folio}`);

            if (!codigoProducto || litros <= 0) {
                console.warn(`⚠️ Carga inválida:`, carga);
                errores.push(`Carga inválida: ${JSON.stringify(carga)}`);
                continue;
            }

            try {
                const formulas = await formulasService.listarPorProducto(codigoProducto);
                console.log(`📋 Fórmulas para ${codigoProducto}:`, formulas);

                const basesEnFormula = formulas.filter(f => {
                    const tipo = f.materiaPrima?.tipo || f.materiaPrimaTipo || '';
                    return tipo.toUpperCase() === 'BASE';
                });

                console.log(`🔍 Bases encontradas:`, basesEnFormula);

                if (basesEnFormula.length === 0) {
                    console.warn(`⚠️ Producto ${codigoProducto} sin bases en fórmula`);
                    errores.push(`Producto ${codigoProducto} sin bases`);
                    continue;
                }

                const todasLasMP = await materiaPrimaService.listarTodas();
                console.log(`📦 Materias primas disponibles:`, todasLasMP.map(m => `${m.codigo}: ${m.nivelActual}`));

                for (const formula of basesEnFormula) {
                    const mpCodigo = formula.materiaPrima?.codigo || formula.materiaPrimaCodigo;
                    const mpId = formula.materiaPrima?.id || formula.materiaPrimaId;
                    const cantidadPorLitro = parseFloat(formula.cantidadPorLitro) || 0;
                    const cantidadConsumida = cantidadPorLitro * litros;

                    console.log(`🔸 Base ${mpCodigo}: ${cantidadPorLitro} L/Litro → ${cantidadConsumida} L consumidos`);

                    const mpActual = todasLasMP.find(m => m.id === mpId || m.codigo === mpCodigo);
                    
                    if (!mpActual) {
                        console.error(`❌ Base ${mpCodigo} no encontrada (ID: ${mpId})`);
                        errores.push(`Base ${mpCodigo} no encontrada`);
                        continue;
                    }

                    console.log(`📊 Nivel actual de ${mpCodigo}: ${mpActual.nivelActual} L`);

                    const nivelActual = parseFloat(mpActual.nivelActual) || 0;
                    const nuevoNivel = Math.max(0, nivelActual - cantidadConsumida);

                    console.log(`📊 Nuevo nivel de ${mpCodigo}: ${nuevoNivel} L (${nivelActual} - ${cantidadConsumida})`);

                    // ✅ Usamos la URL base en lugar de hardcodeada
                    const response = await fetch(`${API_URL}/materias-primas/${mpActual.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            codigo: mpActual.codigo,
                            nombre: mpActual.nombre,
                            tipo: mpActual.tipo,
                            capacidadMaxima: mpActual.capacidadMaxima,
                            nivelActual: nuevoNivel,
                            unidad: mpActual.unidad,
                            umbralCritico: mpActual.umbralCritico,
                            umbralAlerta: mpActual.umbralAlerta,
                            costoPorUnidad: mpActual.costoPorUnidad,
                            ubicacion: mpActual.ubicacion
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error(`❌ Error actualizando ${mpCodigo}:`, errorText);
                        errores.push(`Error actualizando ${mpCodigo}`);
                    } else {
                        console.log(`✅ ${mpCodigo} actualizado: ${nivelActual} → ${nuevoNivel}`);
                        resultados.push({
                            codigo: mpCodigo,
                            nombre: mpActual.nombre,
                            cantidad: cantidadConsumida,
                            nivelAnterior: nivelActual,
                            nivelNuevo: nuevoNivel,
                            codigoProducto: codigoProducto,
                            folio: folio
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Error procesando carga ${codigoProducto}:`, error);
                errores.push(`Error en ${codigoProducto}: ${error.message}`);
            }
        }

        if (errores.length > 0) {
            if (resultados.length > 0) {
                console.warn('⚠️ Algunas cargas tuvieron errores:', errores);
                return {
                    success: true,
                    basesConsumidas: resultados,
                    errores: errores,
                    totalCargas: cargas.length
                };
            }
            throw new Error(`Errores: ${errores.join(', ')}`);
        }

        console.log('✅ Resultados finales:', resultados);

        return {
            success: true,
            basesConsumidas: resultados,
            totalCargas: cargas.length
        };
    }
};

export default formulasService;