import { useState, useCallback, useMemo, useEffect } from "react";
import { buscarProducto } from "../services/productoService";
import { analizarExcel } from "../services/excelService";
import { getOperarioPorMaquina, CODIGOS_EXCLUIDOS, litrosPorEnvasado } from "../constants/config";
import { registrarCarga, eliminarCarga, obtenerCargasPorFecha } from "../services/cargaService";

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

    // --- FUNCIÓN CRÍTICA CORREGIDA: CARGAR DATOS DE BD ---
    const cargarDatosPorFecha = useCallback(async (fechaInput) => {
        try {
            setBuscandoFecha(true);
            setRondas(Array.from({ length: 8 }, () => Array(6).fill(null)));
            setCargasEsmaltesAsignadas([]);
            setColaCargas([]);
            setCargasEspeciales([]);

            const fechaString = typeof fechaInput === 'string'
                ? fechaInput.split('T')[0]
                : fechaInput.toISOString().split('T')[0];

            const datos = await obtenerCargasPorFecha(fechaString);
            if (!datos || datos.length === 0) return;

            const nuevasRondas = Array.from({ length: 8 }, () => Array(6).fill(null));
            const nuevosEsmaltes = [];
            const nuevasEspeciales = [];
            const mapaCargasBD = {};

            datos.forEach(reg => {
                // 1. Agrupación por Folio Madre
                if (!mapaCargasBD[reg.folio]) {
                    const folioLower = String(reg.folio || '').toLowerCase();
                    const esVinilica = reg.tipo === 'V' || folioLower.startsWith('v');

                    mapaCargasBD[reg.folio] = {
                        id: reg.id,
                        idTemp: reg.id + "-" + Math.random(),
                        folio: reg.folio,
                        codigoProducto: reg.producto || "S/C",
                        descripcion: reg.descripcion || "Recuperado",
                        litros: Number(reg.litros),
                        tipo: esVinilica ? "Vinílica" : "Esmalte",
                        operario: reg.operario,
                        maquina: String(reg.maquina || "").replace(/\D/g, ""),
                        nivelCubriente: reg.poderCubriente || 0,
                        detallesEnvasado: [],
                        procesos: reg.procesos || []
                    };
                }

                // 2. LÓGICA DIRECTA: Usamos el ID de la base de datos como formato (1, 500, 19, etc.)
                mapaCargasBD[reg.folio].detallesEnvasado.push({
                    id: reg.envasadoId,
                    cantidad: reg.cantidad,
                    formato: String(reg.envasadoId || ""), 
                    folioIndividual: reg.folioHija
                });
            });

            // Acomodo en el tablero
            Object.values(mapaCargasBD).forEach(carga => {
                if (carga.tipo === "Vinílica") {
                    const m = parseInt(carga.maquina);
                    let fila = m - 101;
                    let asignada = false;

                    if (fila >= 0 && fila < 8) {
                        const col = nuevasRondas[fila].indexOf(null);
                        if (col !== -1) {
                            nuevasRondas[fila][col] = carga;
                            asignada = true;
                        }
                    }

                    if (!asignada) {
                        for (let f = 0; f < 8; f++) {
                            const c = nuevasRondas[f].indexOf(null);
                            if (c !== -1) {
                                nuevasRondas[f][c] = { ...carga, maquina: 101 + f };
                                asignada = true;
                                break;
                            }
                        }
                    }
                    if (!asignada) nuevasEspeciales.push(carga);
                } else {
                    nuevosEsmaltes.push(carga);
                }
            });

            setRondas(nuevasRondas);
            setCargasEsmaltesAsignadas(nuevosEsmaltes);
            setCargasEspeciales(nuevasEspeciales);
        } catch (error) {
            console.error("Error al cargar fecha:", error);
        } finally {
            setBuscandoFecha(false);
        }
    }, []);

    useEffect(() => {
        cargarDatosPorFecha(new Date().toISOString().split('T')[0]);
    }, [cargarDatosPorFecha]);

    // --- FUNCIONES DE NORMALIZACIÓN Y CÁLCULO ---
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

    // --- ACCIONES DE BD ---
    const guardarProduccionEnBD = async () => {
        const todas = [...colaCargas, ...rondas.flat().filter(Boolean), ...cargasEsmaltesAsignadas, ...cargasEspeciales];
        if (todas.length === 0) return alert("No hay cargas para guardar.");
        
        const registrosParaBD = [];
        todas.forEach(carga => {
            if (carga.detallesEnvasado) {
                carga.detallesEnvasado.forEach(detalle => {
                    if (detalle.cantidad > 0 && detalle.id) {
                        registrosParaBD.push({
                            codigoProducto: String(carga.codigoProducto),
                            envasadoId: Number(detalle.id),
                            cantidad: Number(detalle.cantidad),
                            litros: Number(carga.litros),
                            tipo: carga.tipo === "Vinílica" ? "V" : "E",
                            folio: carga.folio,
                            folioHija: detalle.folioIndividual,
                            operario: carga.operario || "Sin asignar",
                            maquina: String(carga.maquina || "")
                        });
                    }
                });
            }
        });
        try {
            setGuardandoBD(true);
            await registrarCarga(registrosParaBD);
            alert("Guardado con éxito");
        } catch (error) { alert("Error al conectar con el servidor."); }
        finally { setGuardandoBD(false); }
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
                    formato: litraje === 0.5 ? "500" : litraje === 0.25 ? "250" : `${litraje}`.replace('.', ''),
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
                const nueva = {
                    idTemp: Date.now() + Math.random(),
                    folio: item.folio || "S/F",
                    esAutomatico: true,
                    codigoProducto: res.codigo,
                    descripcion: res.descripcion,
                    litros: parseFloat(item.litros) || 0,
                    tipo: (item.folio || "").startsWith("V") ? "Vinílica" : "Esmalte",
                    nivelCubriente: res.poderCubriente || 0,
                    procesos: res.procesos || [],
                    detallesEnvasado: item.hijas ? item.hijas.map(h => {
                        const capacidadStr = h.articulo.split('-')[0].replace(/^0+/, '');
                        const envasadoReal = res.envasados.find(env => Math.abs(litrosPorEnvasado(env.id) - parseFloat(capacidadStr)) < 0.1);
                        return {
                            id: envasadoReal ? envasadoReal.id : null,
                            cantidad: Number(h.cantidad),
                            formato: capacidadStr,
                            folioIndividual: h.folio || item.folio || "S/F"
                        };
                    }) : [],
                    operario: "",
                    maquina: "",
                    planificador: { datosPlanificador: res.datosPlanificador || [], salidas: res.salidas || 0, existencia: res.existencia || 0, alcance: res.alcance || 0 }
                };
                todasProcesadas.push(nueva);
            }
            if (soloRetornar) return todasProcesadas;
            const normales = todasProcesadas.filter(c => !CODIGOS_EXCLUIDOS.some(ex => normalizarCodigo(ex) === normalizarCodigo(c.codigoProducto)));
            const especiales = todasProcesadas.filter(c => CODIGOS_EXCLUIDOS.some(ex => normalizarCodigo(ex) === normalizarCodigo(c.codigoProducto)));
            setColaCargas(prev => ordenarCargas([...prev, ...normales]));
            setCargasEspeciales(prev => ordenarCargas([...prev, ...especiales]));
        } catch (err) { alert("Error al procesar Excel"); }
        finally { if (!soloRetornar) setCargandoExcel(false); }
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
        guardarProduccionEnBD, handleEliminarCargaBD, cargarDatosPorFecha
    };
}