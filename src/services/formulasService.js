// src/services/formulasService.js
const API_URL = "http://localhost:8080/api/formulas";

export const formulasService = {
    // Listar fórmulas de un producto
    listarPorProducto: async (productoId) => {
        const response = await fetch(`${API_URL}/producto/${productoId}`);
        if (!response.ok) throw new Error("Error al cargar fórmulas");
        return response.json();
    },

    // Crear nueva fórmula (solo cantidadPorLitro)
    crear: async (data) => {
        const response = await fetch(API_URL, {
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
        return response.json();
    },

    // Actualizar fórmula
    actualizar: async (id, data) => {
        const response = await fetch(`${API_URL}/${id}`, {
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
        return response.json();
    },

    getProductosQueConsumen: async (materiaPrimaId) => {
        try {
            const response = await fetch(`http://localhost:8080/api/formulas/materia-prima/${materiaPrimaId}`);
            if (!response.ok) throw new Error("Error al cargar productos relacionados");
            return response.json();
        } catch (error) {
            console.error("Error obteniendo productos que consumen:", error);
            return [];
        }
    },

    calcularConsumoMensual: (formulas, produccionMensual = 1000) => {
        return formulas.reduce((total, formula) => {
            return total + (formula.cantidadPorLitro * produccionMensual);
        }, 0);
    },

    // Eliminar fórmula
    eliminar: async (id) => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error("Error al eliminar fórmula");
        return response.json();
    },

    // 🟢 CONSUMIR BASES - Versión corregida
    consumirBasesDesdeCargas: async (cargas) => {
        console.log('🚀 Consumiendo bases desde cargas:', cargas);
        
        const resultados = [];
        const errores = [];

        // 🔴 Importar dinámicamente el materiaPrimaService para evitar dependencia circular
        const { materiaPrimaService } = await import('./materiaPrimaService');

        for (const carga of cargas) {
            const codigoProducto = carga.codigo || carga.codigoProducto;
            const litros = parseFloat(carga.litros) || 0;
            
            console.log(`📦 Procesando: ${codigoProducto} - ${litros} L`);

            if (!codigoProducto || litros <= 0) {
                console.warn(`⚠️ Carga inválida:`, carga);
                errores.push(`Carga inválida: ${JSON.stringify(carga)}`);
                continue;
            }

            try {
                // 1. Obtener la fórmula del producto
                const formulas = await formulasService.listarPorProducto(codigoProducto);
                console.log(`📋 Fórmulas para ${codigoProducto}:`, formulas);

                // 2. Filtrar solo bases
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

                // 3. Obtener todas las materias primas usando el servicio
                const todasLasMP = await materiaPrimaService.listarTodas();
                console.log(`📦 Materias primas disponibles:`, todasLasMP.map(m => `${m.codigo}: ${m.nivelActual}`));

                // 4. Procesar cada base
                for (const formula of basesEnFormula) {
                    const mpCodigo = formula.materiaPrima?.codigo || formula.materiaPrimaCodigo;
                    const mpId = formula.materiaPrima?.id || formula.materiaPrimaId;
                    const cantidadPorLitro = parseFloat(formula.cantidadPorLitro) || 0;
                    const cantidadConsumida = cantidadPorLitro * litros;

                    console.log(`🔸 Base ${mpCodigo}: ${cantidadPorLitro} L/Litro → ${cantidadConsumida} L consumidos`);

                    // 5. Encontrar la materia prima actual
                    const mpActual = todasLasMP.find(m => m.id === mpId || m.codigo === mpCodigo);
                    
                    if (!mpActual) {
                        console.error(`❌ Base ${mpCodigo} no encontrada (ID: ${mpId})`);
                        errores.push(`Base ${mpCodigo} no encontrada`);
                        continue;
                    }

                    console.log(`📊 Nivel actual de ${mpCodigo}: ${mpActual.nivelActual} L`);

                    // 6. Calcular nuevo nivel
                    const nivelActual = parseFloat(mpActual.nivelActual) || 0;
                    const nuevoNivel = Math.max(0, nivelActual - cantidadConsumida);

                    console.log(`📊 Nuevo nivel de ${mpCodigo}: ${nuevoNivel} L (${nivelActual} - ${cantidadConsumida})`);

                    // 7. 🔴 USAR EL PUT EXISTENTE
                    const response = await fetch(`http://localhost:8080/api/materias-primas/${mpActual.id}`, {
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
                            nivelNuevo: nuevoNivel
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Error procesando carga ${codigoProducto}:`, error);
                errores.push(`Error en ${codigoProducto}: ${error.message}`);
            }
        }

        if (errores.length > 0) {
            // Si hay errores pero también resultados, mostramos ambos
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