import { useState, useCallback, useMemo, useEffect } from "react";
import { buscarProducto } from "../services/productoService";
import { analizarExcel } from "../services/excelService";
import { getOperarioPorMaquina, CODIGOS_EXCLUIDOS, litrosPorEnvasado } from "../constants/config";
import { registrarCarga, eliminarCarga, obtenerCargasPorFecha } from "../services/cargaService";
import { formulasService } from "../services/formulasService";

// --- FUNCIÓN DE UTILIDAD: GENERACIÓN DE FOLIOS ---
const generarFolioAutomatico = (tipo, cola, rondas, esmaltes, especiales) => {
    const hoy = new Date();
    const y = hoy.getFullYear().toString().slice(-2);
    const m = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const d = hoy.getDate().toString().padStart(2, '0');
    const prefijo = `${tipo.charAt(0).toLowerCase()}${y}${m}${d}`;

    const todas = [
        ...cola,
        ...rondas.flat(2).filter(Boolean),
        ...esmaltes,
        ...especiales
    ];

    let ultimoNumero = 0;
    todas.forEach(carga => {
        if (!carga) return;
        if (carga.folio && String(carga.folio).startsWith(prefijo)) {
            const numMadre = parseInt(carga.folio.replace(prefijo, ""), 10);
            if (numMadre > ultimoNumero) ultimoNumero = numMadre;
        }
        if (carga.detallesEnvasado) {
            carga.detallesEnvasado.forEach(hija => {
                if (hija.folioIndividual && String(hija.folioIndividual).startsWith(prefijo)) {
                    const numHija = parseInt(hija.folioIndividual.replace(prefijo, ""), 10);
                    if (numHija > ultimoNumero) ultimoNumero = numHija;
                }
            });
        }
    });

    const nuevoIndice = (ultimoNumero + 1).toString().padStart(3, '0');
    return `${prefijo}${nuevoIndice}`;
};

// Función para formatear artículo
const formatearArticulo = (envasadoId) => {
    const idNum = Number(envasadoId);
    if (idNum === 0.5 || idNum === 500) return "500";
    if (idNum === 0.25 || idNum === 250) return "250";
    if (idNum === 0.75 || idNum === 750) return "750";
    if (idNum === 1) return "001";
    if (idNum === 4) return "004";
    if (idNum === 19) return "019";
    return String(idNum).padStart(3, '0');
};

export function useProduccion() {
    const [codigo, setCodigo] = useState("");
    const [producto, setProducto] = useState(null);
    const [cantidades, setCantidades] = useState({});
    const [colaCargas, setColaCargas] = useState([]);
    const [cargasEspeciales, setCargasEspeciales] = useState([]);
    const [tipoPintura, setTipoPintura] = useState("Vinílica");
    const [rondas, setRondas] = useState(Array.from({ length: 8 }, () => Array(6).fill(null)));
    const [cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas] = useState([]);
    const [cargandoExcel, setCargandoExcel] = useState(false);
    const [buscandoManual, setBuscandoManual] = useState(false);
    const [guardandoBD, setGuardandoBD] = useState(false);
    const [buscandoFecha, setBuscandoFecha] = useState(false);

    const CODIGOS_BASES = ["BBE20", "BBE30", "BAL40", "BNE10", "BSP10"];
    const IGUALADORES = ["Gaspar", "Alberto", "Pedro"];

    const normalizarCodigo = (cod) => {
        if (!cod) return "";
        return String(cod).trim().toUpperCase().replace(/^0+/, '') || "0";
    };

    const ordenarCargas = useCallback((lista) => [...lista].sort((a, b) => {
        const cubA = a.nivelCubriente || 0;
        const cubB = b.nivelCubriente || 0;
        if (cubA !== cubB) return cubA - cubB;
        return String(a.folio).localeCompare(String(b.folio), undefined, { numeric: true });
    }), []);

    const extraerLitrosDeArticulo = (articuloCompleto) => {
        if (!articuloCompleto) return 0;
        const partes = String(articuloCompleto).split('-');
        const prefijoCapacidad = partes[0].replace(/^0+/, '');
        switch (prefijoCapacidad) {
            case "19": return 19;
            case "4": return 4;
            case "1": return 1;
            case "500": return 0.5;
            case "250": return 0.25;
            default:
                const num = parseFloat(prefijoCapacidad);
                return isNaN(num) ? 0 : num;
        }
    };

    const totalLitrosActuales = useMemo(() => producto
        ? producto.envasados.reduce((acc, env) => acc + (cantidades[env.id] || 0) * litrosPorEnvasado(env.id), 0)
        : 0, [producto, cantidades]);

    // --- FUNCIÓN PARA CONSUMIR BASES ---
    const consumirBasesDeCargas = useCallback(async (cargas) => {
        if (!cargas || cargas.length === 0) {
            console.log('⚠️ No hay cargas para consumir bases');
            return null;
        }

        console.log('🚀 Consumiendo bases desde', cargas.length, 'cargas');
        
        try {
            const cargasPendientes = cargas.filter(c => c.estado !== 'Completada');
            
            if (cargasPendientes.length === 0) {
                console.log('⚠️ Todas las cargas ya están completadas');
                return null;
            }

            const resultado = await formulasService.consumirBasesDesdeCargas(cargasPendientes);
            
            console.log('✅ Bases consumidas:', resultado);
            
            if (resultado.basesConsumidas && resultado.basesConsumidas.length > 0) {
                console.log('📦 Resumen de consumo:');
                resultado.basesConsumidas.forEach(b => {
                    console.log(`  • ${b.codigo}: ${b.cantidad.toFixed(2)} L (${b.nivelAnterior.toFixed(2)} → ${b.nivelNuevo.toFixed(2)})`);
                });
            }
            
            return resultado;
        } catch (error) {
            console.error('❌ Error consumiendo bases:', error);
            throw error;
        }
    }, []);

    // --- CARGAR DATOS DE BD ---
    const cargarDatosPorFecha = useCallback(async (fechaInput) => {
        try {
            setBuscandoFecha(true);

            const nuevasRondas = Array.from({ length: 8 }, () => Array(6).fill(null));
            const nuevosEsmaltes = [];
            const nuevasEspeciales = [];

            const fechaString = typeof fechaInput === 'string'
                ? fechaInput.split('T')[0]
                : fechaInput.toISOString().split('T')[0];

            const datos = await obtenerCargasPorFecha(fechaString);
            if (!datos || datos.length === 0) {
                setRondas(nuevasRondas);
                setCargasEsmaltesAsignadas([]);
                setCargasEspeciales([]);
                return;
            }

            const mapaOperarioMaquina = {
                "Isaac": 101, "Juan": 102, "Pedro": 103, "Luis": 104,
                "Carlos": 105, "Javier": 106, "Miguel": 107, "Roberto": 108,
                "Aldo": 101, "Germán": 104, "Gaspar": 105, "Alberto": 106
            };

            const mapaCargasBD = {};

            datos.forEach(reg => {
                const folioMadre = reg.folio;

                if (!mapaCargasBD[folioMadre]) {
                    const folioLower = String(folioMadre || '').toLowerCase();
                    const esVinilica = reg.tipo === 'V' || folioLower.startsWith('v');
                    const esEspecial = CODIGOS_EXCLUIDOS.some(ex =>
                        normalizarCodigo(ex) === normalizarCodigo(reg.producto || "")
                    );

                    let maquinaGuardada = String(reg.maquina || "").replace(/\D/g, "");
                    const operarioGuardado = reg.operario || "";

                    if (!maquinaGuardada && operarioGuardado) {
                        maquinaGuardada = String(mapaOperarioMaquina[operarioGuardado] || "");
                    }

                    if (!maquinaGuardada) {
                        maquinaGuardada = "101";
                    }

                    mapaCargasBD[folioMadre] = {
                        idBD: reg.id,
                        idTemp: `${folioMadre}-${Date.now()}-${Math.random()}`,
                        folio: folioMadre,
                        codigoProducto: reg.producto || "S/C",
                        descripcion: reg.descripcion || "Sin descripción",
                        litros: 0,
                        tipo: esVinilica ? "Vinílica" : "Esmalte",
                        operario: operarioGuardado,
                        maquina: maquinaGuardada,
                        nivelCubriente: reg.poderCubriente || 0,
                        detallesEnvasado: [],
                        procesos: reg.procesos || [],
                        esEspecial: esEspecial,
                        textoMaquina: `VI-${maquinaGuardada} ${operarioGuardado}`,
                        textoOperario: operarioGuardado
                    };
                }

                const envasadoId = Number(reg.envasadoId || reg.envasado_id);
                const formatoCorrecto = formatearArticulo(envasadoId);
                const litrosUnitario = litrosPorEnvasado(envasadoId);

                mapaCargasBD[folioMadre].detallesEnvasado.push({
                    id: envasadoId,
                    cantidad: Number(reg.cantidad),
                    formato: formatoCorrecto,
                    folioIndividual: reg.folioHija || reg.folio_hija,
                    litros: litrosUnitario
                });

                mapaCargasBD[folioMadre].litros += Number(reg.cantidad) * litrosUnitario;
            });

            const cargasVinilicas = [];
            const cargasEsmaltesTemp = [];

            Object.values(mapaCargasBD).forEach(carga => {
                if (carga.esEspecial) {
                    nuevasEspeciales.push(carga);
                } else if (carga.tipo === "Vinílica") {
                    cargasVinilicas.push(carga);
                } else {
                    cargasEsmaltesTemp.push(carga);
                }
            });

            cargasVinilicas.sort((a, b) => {
                const maqA = parseInt(a.maquina) || 999;
                const maqB = parseInt(b.maquina) || 999;
                if (maqA !== maqB) return maqA - maqB;
                const numA = parseInt(a.folio?.replace(/[^0-9]/g, '') || 0);
                const numB = parseInt(b.folio?.replace(/[^0-9]/g, '') || 0);
                return numA - numB;
            });

            for (const carga of cargasVinilicas) {
                const maquinaNum = parseInt(carga.maquina);
                let filaDestino = -1;

                if (!isNaN(maquinaNum) && maquinaNum >= 101 && maquinaNum <= 108) {
                    filaDestino = maquinaNum - 101;
                }

                if (filaDestino >= 0 && filaDestino < 8) {
                    let columnaAsignada = -1;
                    for (let col = 0; col < 6; col++) {
                        if (nuevasRondas[filaDestino][col] === null) {
                            columnaAsignada = col;
                            break;
                        }
                    }

                    if (columnaAsignada !== -1) {
                        nuevasRondas[filaDestino][columnaAsignada] = carga;
                    } else {
                        let asignada = false;
                        for (let f = 0; f < 8 && !asignada; f++) {
                            for (let c = 0; c < 6 && !asignada; c++) {
                                if (nuevasRondas[f][c] === null) {
                                    nuevasRondas[f][c] = { ...carga, maquina: String(101 + f) };
                                    nuevasRondas[f][c].textoMaquina = `VI-${101 + f} ${carga.operario}`;
                                    asignada = true;
                                }
                            }
                        }
                        if (!asignada) nuevasEspeciales.push(carga);
                    }
                } else {
                    let asignada = false;
                    for (let f = 0; f < 8 && !asignada; f++) {
                        for (let c = 0; c < 6 && !asignada; c++) {
                            if (nuevasRondas[f][c] === null) {
                                nuevasRondas[f][c] = { ...carga, maquina: String(101 + f) };
                                nuevasRondas[f][c].textoMaquina = `VI-${101 + f} ${carga.operario}`;
                                asignada = true;
                            }
                        }
                    }
                    if (!asignada) nuevasEspeciales.push(carga);
                }
            }

            const esmaltesOrdenados = [...cargasEsmaltesTemp].sort((a, b) => {
                const cubA = a.nivelCubriente || 0;
                const cubB = b.nivelCubriente || 0;
                if (cubA !== cubB) return cubA - cubB;
                return String(a.folio).localeCompare(String(b.folio));
            });

            esmaltesOrdenados.forEach(carga => {
                if (!carga.operario || carga.operario === "") {
                    carga.operario = "Aldo";
                    carga.textoMaquina = `ESM-001 ${carga.operario}`;
                } else {
                    carga.textoMaquina = `ESM-001 ${carga.operario}`;
                }
                nuevosEsmaltes.push(carga);
            });

            setRondas(nuevasRondas);
            setCargasEsmaltesAsignadas(ordenarCargas(nuevosEsmaltes));
            setCargasEspeciales(ordenarCargas(nuevasEspeciales));
            setColaCargas([]);

        } catch (error) {
            console.error("Error al cargar fecha:", error);
        } finally {
            setBuscandoFecha(false);
        }
    }, [ordenarCargas]);

    useEffect(() => {
        cargarDatosPorFecha(new Date().toISOString().split('T')[0]);
    }, [cargarDatosPorFecha]);

    // --- CALCULAR CONSUMO GLOBAL ---
    const calcularConsumoGlobal = useCallback(async () => {
        const todasLasCargas = [
            ...rondas.flat().filter(Boolean),
            ...cargasEsmaltesAsignadas,
            ...cargasEspeciales
        ];
        
        if (todasLasCargas.length === 0) {
            return [];
        }
        
        const consumosPorMateria = {};
        
        for (const carga of todasLasCargas) {
            const productoId = carga.codigoProducto;
            const litrosCarga = carga.litros || 0;
            
            if (!productoId || litrosCarga === 0) continue;
            
            try {
                const formulas = await formulasService.listarPorProducto(productoId);
                
                if (formulas && formulas.length > 0) {
                    for (const formula of formulas) {
                        let materiaCodigo = "-";
                        let materiaNombre = "-";
                        let materiaTipo = "-";
                        
                        if (formula.materiaPrima) {
                            materiaCodigo = formula.materiaPrima.codigo || "-";
                            materiaNombre = formula.materiaPrima.nombre || "-";
                            materiaTipo = formula.materiaPrima.tipo || "-";
                        } else if (formula.materiaPrimaCodigo) {
                            materiaCodigo = formula.materiaPrimaCodigo;
                            materiaNombre = formula.materiaPrimaNombre || "-";
                            materiaTipo = formula.materiaPrimaTipo || "-";
                        }
                        
                        const cantidadPorLitroReal = formula.cantidadPorLitro / 800;
                        const consumoTotal = cantidadPorLitroReal * litrosCarga;
                        
                        if (!consumosPorMateria[materiaCodigo]) {
                            consumosPorMateria[materiaCodigo] = {
                                codigo: materiaCodigo,
                                nombre: materiaNombre,
                                tipo: materiaTipo,
                                consumoTotal: 0
                            };
                        }
                        consumosPorMateria[materiaCodigo].consumoTotal += consumoTotal;
                    }
                }
            } catch (error) {
                console.error(`Error obteniendo fórmula para ${productoId}:`, error);
            }
        }
        
        return Object.values(consumosPorMateria)
            .filter(c => c.consumoTotal > 0)
            .sort((a, b) => b.consumoTotal - a.consumoTotal);
    }, [rondas, cargasEsmaltesAsignadas, cargasEspeciales]);

    // --- ACCIONES DE BD - MODIFICADA PARA CONSUMIR BASES ---
// src/hooks/useProduccion.js - SOLO MODIFICAR la función guardarProduccionEnBD

const guardarProduccionEnBD = async () => {
    const todas = [...colaCargas, ...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales];
    
    if (todas.length === 0) {
        alert("No hay cargas para guardar.");
        return;
    }

    const totalLitros = todas.reduce((sum, c) => sum + (c.litros || 0), 0);

    if (!window.confirm(
        `✅ ¿Guardar producción?\n\n` +
        `Cargas a procesar: ${todas.length}\n` +
        `Total de litros: ${totalLitros.toFixed(2)} L\n\n` +
        `⚠️ Esto consumirá las bases necesarias y reducirá los niveles en los tanques.`
    )) {
        return;
    }

    try {
        setGuardandoBD(true);

        // 🔴 CONSUMIR BASES
        try {
            const resultadoConsumo = await consumirBasesDeCargas(todas);
            
            if (resultadoConsumo && resultadoConsumo.basesConsumidas.length > 0) {
                // 🔴 FILTRAR SOLO BBE20 Y BBE30
                const basesFiltradas = resultadoConsumo.basesConsumidas.filter(b => 
                    b.codigo === 'BBE20' || b.codigo === 'BBE30'
                );

                if (basesFiltradas.length > 0) {
                    let mensaje = `📦 Consumo de bases:\n\n`;
                    
                    basesFiltradas.forEach(b => {
                        // Buscar la carga que consumió esta base
                        const cargaRelacionada = todas.find(c => 
                            c.codigoProducto === b.codigoProducto || 
                            c.codigo === b.codigoProducto
                        );
                        
                        const lote = cargaRelacionada?.folio || 'S/F';
                        const producto = cargaRelacionada?.codigoProducto || cargaRelacionada?.codigo || 'S/C';
                        const tipo = cargaRelacionada?.tipo || 'Desconocido';
                        
                        mensaje += `  • ${b.codigo}: ${b.cantidad.toFixed(2)} L\n`;
                        mensaje += `    Lote: ${lote} | Producto: ${producto} | Tipo: ${tipo}\n\n`;
                    });
                    
                    alert(mensaje);
                }
            }
        } catch (error) {
            console.error('❌ Error consumiendo bases:', error);
            if (!window.confirm(`⚠️ Error al consumir bases: ${error.message}\n¿Continuar con el guardado?`)) {
                setGuardandoBD(false);
                return;
            }
        }

        // 🔴 GUARDAR EN BD
        const registrosParaBD = [];
        todas.forEach(carga => {
            if (carga.detallesEnvasado) {
                carga.detallesEnvasado.forEach(detalle => {
                    if (detalle.cantidad > 0 && detalle.id) {
                        let maquinaGuardar = "";
                        if (carga.maquina) {
                            maquinaGuardar = String(carga.maquina);
                        } else if (carga.maquinaAsignada) {
                            maquinaGuardar = String(carga.maquinaAsignada);
                        } else if (carga.textoMaquina) {
                            const match = carga.textoMaquina.match(/VI-(\d+)/);
                            if (match) maquinaGuardar = match[1];
                        }

                        registrosParaBD.push({
                            codigoProducto: String(carga.codigoProducto),
                            envasadoId: Number(detalle.id),
                            cantidad: Number(detalle.cantidad),
                            litros: Number(carga.litros),
                            tipo: carga.tipo === "Vinílica" ? "V" : "E",
                            folio: carga.folio,
                            folioHija: detalle.folioIndividual,
                            operario: carga.operario || "Sin asignar",
                            maquina: maquinaGuardar
                        });
                    }
                });
            }
        });

        console.log("📦 Registros a guardar:", registrosParaBD.length);

        await registrarCarga(registrosParaBD);

        // 🔴 ACTUALIZAR PANTALLAS
        if (window.recargarBases) {
            window.recargarBases();
        }
        if (window.recargarCriticos) {
            window.recargarCriticos();
        }

        alert("✅ Producción guardada con éxito");

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al conectar con el servidor: " + error.message);
    } finally {
        setGuardandoBD(false);
    }
};

    const handleEliminarCargaBD = async (idBD, idTemp) => {
        if (!idBD) {
            setColaCargas(prev => prev.filter(c => c.idTemp !== idTemp));
            setRondas(prev => prev.map(f => f.map(c => c?.idTemp === idTemp ? null : c)));
            setCargasEspeciales(prev => prev.filter(c => c.idTemp !== idTemp));
            setCargasEsmaltesAsignadas(prev => prev.filter(c => c.idTemp !== idTemp));
            return;
        }
        if (!window.confirm("¿Eliminar carga de la BD?")) return;
        try {
            await eliminarCarga(idBD);
            cargarDatosPorFecha(new Date().toISOString().split('T')[0]);
        } catch (error) { alert("Error al eliminar."); }
    };

    // --- LOGICA DE PRODUCTOS ---
    const enriquecerConPlanificador = useCallback((datosProducto) => {
        const planificadorRaw = localStorage.getItem("planificador_data");
        if (!planificadorRaw) return datosProducto;
        const planificador = JSON.parse(planificadorRaw);
        const codNormalizado = normalizarCodigo(datosProducto.codigo);
        const coincidencias = (planificador.data || []).filter(item => {
            const partes = String(item.articulo).split('-');
            const colorEnArticulo = partes.length > 1 ? normalizarCodigo(partes[1]) : "";
            return colorEnArticulo === codNormalizado || normalizarCodigo(item.color) === codNormalizado;
        });
        return {
            ...datosProducto,
            datosPlanificador: coincidencias,
            salidas: coincidencias[0]?.salidas || 0,
            existencia: coincidencias[0]?.existencia || 0,
            alcance: coincidencias[0]?.alcance || 0
        };
    }, []);

    const obtenerDatosProductoSeguro = useCallback(async (codOriginal) => {
        const codLimpio = normalizarCodigo(codOriginal);
        let datosFinales = null;
        try {
            try { datosFinales = await buscarProducto(codLimpio); } catch (e) { datosFinales = null; }
            if (!datosFinales && codLimpio.endsWith("M")) {
                const codBase = codLimpio.slice(0, -1);
                let datosBase = await buscarProducto(codBase);
                if (datosBase) {
                    datosFinales = { ...datosBase, codigo: codLimpio, descripcion: datosBase.descripcion + " (Maquila)" };
                }
            }
        } catch (error) { console.error(error); }
        if (!datosFinales) {
            datosFinales = {
                codigo: codLimpio,
                descripcion: codLimpio.endsWith("M") ? "Maquila Desconocida" : "Producto no Registrado",
                poderCubriente: 0,
                tipoPinturaId: tipoPintura === "Vinílica" ? 2 : 1,
                envasados: [], procesos: []
            };
        }
        return enriquecerConPlanificador(datosFinales);
    }, [tipoPintura, enriquecerConPlanificador]);

    const consultar = async () => {
        const limpio = codigo.trim();
        if (!limpio) return;
        setBuscandoManual(true);
        const res = await obtenerDatosProductoSeguro(limpio);
        setBuscandoManual(false);
        const esVinilica = res.tipoPinturaId === 2;
        if (tipoPintura === "Vinílica" && !esVinilica) return alert("Producto de ESMALTES");
        if (tipoPintura === "Esmalte" && esVinilica) return alert("Producto de VINÍLICAS");
        const nuevasCantidades = {};
        if (res.datosPlanificador && res.datosPlanificador.length > 0) {
            res.envasados.forEach(env => {
                const capSistema = litrosPorEnvasado(env.id);
                const match = res.datosPlanificador.find(d => Math.abs(extraerLitrosDeArticulo(d.articulo) - capSistema) < 0.1);
                if (match) nuevasCantidades[env.id] = Number(match.piezas || match.cantidad || 0);
            });
        }
        setProducto({ ...res, envasados: res.envasados || [], procesos: res.procesos || [] });
        setCantidades(nuevasCantidades);
    };

    const agregarCargaManual = useCallback(() => {
        if (!producto) return;
        const idsConCantidad = Object.keys(cantidades).filter(id => Number(cantidades[id]) > 0);
        if (idsConCantidad.length === 0) return alert("Ingresa cantidades");
        const nuevaCarga = {
            idTemp: Date.now() + Math.random(),
            folio: "PENDIENTE",
            esAutomatico: false,
            codigoProducto: producto.codigo,
            descripcion: producto.descripcion,
            litros: totalLitrosActuales,
            tipo: tipoPintura,
            nivelCubriente: producto.poderCubriente || 0,
            detallesEnvasado: idsConCantidad.map((envId) => {
                const litraje = litrosPorEnvasado(envId);
                return {
                    id: envId,
                    cantidad: Number(cantidades[envId]),
                    formato: formatearArticulo(litraje),
                    folioIndividual: "PENDIENTE"
                };
            }),
            procesos: producto.procesos || [],
            operario: "",
            planificador: {
                datosPlanificador: producto.datosPlanificador || [],
                salidas: producto.salidas || 0,
                existencia: producto.existencia || 0,
                alcance: producto.alcance || 0
            }
        };
        if (CODIGOS_EXCLUIDOS.some(cod => normalizarCodigo(cod) === normalizarCodigo(producto.codigo))) {
            setCargasEspeciales(prev => ordenarCargas([...prev, nuevaCarga]));
        } else {
            setColaCargas(prev => ordenarCargas([...prev, nuevaCarga]));
        }
        setCantidades({}); setProducto(null); setCodigo("");
    }, [producto, tipoPintura, totalLitrosActuales, cantidades, ordenarCargas]);

    // --- EXCEL E IMPORTACIÓN ---
    const handleImportExcel = async (e, soloRetornar = false) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!soloRetornar) setCargandoExcel(true);
        try {
            const dataRaw = await analizarExcel(file);
            const todasProcesadas = [];

            for (const item of dataRaw) {
                if (!item.articulo) continue;
                const res = await obtenerDatosProductoSeguro(item.articulo);
                const lote = String(item.folio || "").toUpperCase();
                let tipoFinal = lote.startsWith("V") ? "Vinílica" : (lote.startsWith("E") || lote.startsWith("S") ? "Esmalte" : (res.tipoPinturaId === 2 ? "Vinílica" : "Esmalte"));

                const detallesEnvasado = [];
                if (item.hijas && item.hijas.length > 0) {
                    for (const h of item.hijas) {
                        const capacidadStr = h.articulo.split('-')[0];
                        let envasadoId = null;

                        let capacidadNum;
                        if (capacidadStr === "250") capacidadNum = 0.25;
                        else if (capacidadStr === "500") capacidadNum = 0.5;
                        else if (capacidadStr === "750") capacidadNum = 0.75;
                        else if (capacidadStr === "001") capacidadNum = 1;
                        else if (capacidadStr === "004") capacidadNum = 4;
                        else if (capacidadStr === "019") capacidadNum = 19;
                        else if (capacidadStr === "018") capacidadNum = 18;
                        else capacidadNum = parseInt(capacidadStr);

                        const envasadoEncontrado = res.envasados?.find(env => {
                            const litrosEnv = litrosPorEnvasado(env.id);
                            return Math.abs(litrosEnv - capacidadNum) < 0.01;
                        });

                        envasadoId = envasadoEncontrado?.id || null;

                        detallesEnvasado.push({
                            cantidad: h.cantidad,
                            formato: capacidadStr,
                            id: envasadoId
                        });
                    }
                }

                const nueva = {
                    idTemp: Date.now() + Math.random(),
                    folio: item.folio || "S/F",
                    esAutomatico: true,
                    codigoProducto: res.codigo,
                    descripcion: res.descripcion,
                    litros: parseFloat(item.litros) || 0,
                    tipo: tipoFinal,
                    nivelCubriente: res.poderCubriente || 0,
                    procesos: res.procesos || [],
                    detallesEnvasado: detallesEnvasado,
                    operario: "",
                    maquina: "",
                    planificador: {
                        datosPlanificador: res.datosPlanificador || [],
                        salidas: res.salidas || 0,
                        existencia: res.existencia || 0,
                        alcance: res.alcance || 0
                    }
                };
                todasProcesadas.push(nueva);
            }

            if (soloRetornar) return todasProcesadas;

            const normales = todasProcesadas.filter(c => !CODIGOS_EXCLUIDOS.some(ex => normalizarCodigo(ex) === normalizarCodigo(c.codigoProducto)));
            const especiales = todasProcesadas.filter(c => CODIGOS_EXCLUIDOS.some(ex => normalizarCodigo(ex) === normalizarCodigo(c.codigoProducto)));

            setColaCargas(prev => ordenarCargas([...prev, ...normales]));
            setCargasEspeciales(prev => ordenarCargas([...prev, ...especiales]));

        } catch (err) {
            console.error(err);
            alert("Error al procesar Excel: " + err.message);
        } finally {
            if (!soloRetornar) setCargandoExcel(false);
        }
    };

    // --- PLANIFICACIÓN FINAL ---
    const generarLotesFinales = useCallback(() => {
        if (colaCargas.length === 0 && cargasEspeciales.length === 0) return;
        const procesarLista = (listaActual) => {
            const listaOrdenada = ordenarCargas([...listaActual]);
            let simulacionGlobal = [];
            const tipoLetra = tipoPintura === "Vinílica" ? "v" : "e";
            return listaOrdenada.map((carga) => {
                if (carga.esAutomatico) { simulacionGlobal.push(carga); return carga; }
                const nuevoFolioMadre = generarFolioAutomatico(tipoLetra, simulacionGlobal, rondas, cargasEsmaltesAsignadas, []);
                const cargaConFolio = { ...carga, folio: nuevoFolioMadre };
                simulacionGlobal.push(cargaConFolio);
                const nuevasHijas = (carga.detallesEnvasado || []).map(hija => {
                    const nuevoFolioHija = generarFolioAutomatico(tipoLetra, simulacionGlobal, rondas, cargasEsmaltesAsignadas, []);
                    simulacionGlobal.push({ folio: nuevoFolioHija });
                    return { ...hija, folioIndividual: nuevoFolioHija };
                });
                return { ...cargaConFolio, detallesEnvasado: nuevasHijas };
            });
        };
        setColaCargas(prev => procesarLista(prev));
        setCargasEspeciales(prev => procesarLista(prev));
        alert("Numeración completada.");
    }, [colaCargas, cargasEspeciales, tipoPintura, ordenarCargas, rondas, cargasEsmaltesAsignadas]);

    const actualizarOperarioEsmalte = (idTemp, nuevoOperario) => {
        setCargasEsmaltesAsignadas(prev => prev.map(c => c.idTemp === idTemp ? { ...c, operario: nuevoOperario } : c));
    };

    const guardarCargasEnRondas = (cargasAGuardar) => {
        const idsAsignados = [];
        if (tipoPintura === "Esmalte") {
            let tempAsignadasEsmaltes = [...cargasEsmaltesAsignadas];
            cargasAGuardar.forEach((carga) => {
                const listaProcesos = (carga.procesos || []).map(p => p.descripcion.toUpperCase());
                const codigoUpper = normalizarCodigo(carga.codigoProducto);
                const esBase = CODIGOS_BASES.includes(codigoUpper) || codigoUpper.startsWith("B");
                const tieneMolienda = listaProcesos.some(d => d.includes("MOLIENDA"));
                const tienePreparado = listaProcesos.some(d => d.includes("PREPARADO") || d.includes("DISPERSION"));
                const tieneEtapaFinal = listaProcesos.some(d => d.includes("IGUALACIÓN") || d.includes("IGUALACION") || d.includes("TERMINADO") || d.includes("AJUSTE"));
                let ops = [];
                if (esBase) ops.push("Aldo");
                else if (tieneMolienda) ops.push("Germán");
                else if (tienePreparado) ops.push("Aldo");
                if (tieneEtapaFinal || ops.length === 0) {
                    const candidatos = (tieneMolienda || tienePreparado || esBase) ? ["Gaspar", "Pedro"] : IGUALADORES;
                    const balance = candidatos.map(n => ({ n, t: tempAsignadasEsmaltes.filter(c => c.operario.includes(n)).length + (n === "Alberto" ? 3 : 0) })).sort((a, b) => a.t - b.t);
                    if (!ops.includes(balance[0].n)) ops.push(balance[0].n);
                }
                tempAsignadasEsmaltes.push({ ...carga, operario: ops.join(" / "), maquina: "ESM" });
                idsAsignados.push(carga.idTemp);
            });
            setCargasEsmaltesAsignadas(ordenarCargas(tempAsignadasEsmaltes));
        } else {
            const nuevasRondas = [...rondas.map(f => [...f])];
            const nuevasEspeciales = [...cargasEspeciales];
            cargasAGuardar.forEach((carga) => {
                let asignada = false;
                for (let col = 0; col < 6 && !asignada; col++) {
                    for (let fila = 0; fila < 8; fila++) {
                        if (!nuevasRondas[fila][col]) {
                            const numM = 101 + fila;
                            const esGran = [104, 108].includes(numM);
                            let cumpleRegla = (carga.litros > 1600) ? (esGran || numM === 107) : (carga.litros > 855) ? !esGran : (!esGran && numM !== 107);
                            if (cumpleRegla) {
                                carga.operario = getOperarioPorMaquina(numM);
                                nuevasRondas[fila][col] = { ...carga, maquina: numM };
                                asignada = true;
                                idsAsignados.push(carga.idTemp);
                                break;
                            }
                        }
                    }
                }
                if (!asignada) { nuevasEspeciales.push(carga); idsAsignados.push(carga.idTemp); }
            });
            setRondas(nuevasRondas); setCargasEspeciales(ordenarCargas(nuevasEspeciales));
        }
        setColaCargas(prev => prev.filter(c => !idsAsignados.includes(c.idTemp)));
    };

    return {
        codigo, setCodigo, producto, cantidades, setCantidades, colaCargas, setColaCargas,
        cargasEspeciales, setCargasEspeciales, tipoPintura, setTipoPintura,
        rondas, setRondas, cargasEsmaltesAsignadas, setCargasEsmaltesAsignadas,
        cargando: cargandoExcel || guardandoBD, buscandoFecha, buscandoManual, totalLitrosActuales,
        consultar, agregarCargaManual, handleImportExcel, guardarCargasEnRondas,
        ordenarCargas, actualizarOperarioEsmalte, generarLotesFinales,
        guardarProduccionEnBD, handleEliminarCargaBD, cargarDatosPorFecha,
        calcularConsumoGlobal, consumirBasesDeCargas
    };
}