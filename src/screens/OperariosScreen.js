import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { operarioService } from "../services/operarioService";
import ModalVacaciones from "../components/ModalVacaciones";
import "../styles/operarios.css";

export default function OperariosScreen() {
    const navigate = useNavigate();
    const [tabActiva, setTabActiva] = useState("vinilica");
    const [subSeccionVinilica, setSubSeccionVinilica] = useState("maquinas");
    const [subSeccionEsmaltes, setSubSeccionEsmaltes] = useState("operarios");
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    const [cargando, setCargando] = useState(false);

    // Estado para operarios de Vinílica
    const [operariosVinilica, setOperariosVinilica] = useState([]);
    
    // Envasadores Vinílica
    const [envasadores, setEnvasadores] = useState([]);
    
    // Igualadores Vinílica
    const [igualadores, setIgualadores] = useState([]);

    // Estado para asignación BASE
    const [configGruposBase, setConfigGruposBase] = useState({
        grupo0: {
            operarioId: null,
            maquinas: [101, 102],
            nombre: "Grupo 0 (VI-101, VI-102)"
        },
        grupo1: {
            operarioId: null,
            maquinas: [103, 104],
            nombre: "Grupo 1 (VI-103, VI-104)"
        },
        grupo2: {
            operarioId: null,
            maquinas: [105, 106],
            nombre: "Grupo 2 (VI-105, VI-106)"
        },
        grupo3: {
            operarioId: null,
            maquinas: [107, 108],
            nombre: "Grupo 3 (VI-107, VI-108)"
        }
    });

    // Estado para la rotación actual
    const [semanasRotadas, setSemanasRotadas] = useState(0);

    // Estado para operarios de Esmaltes
    const [otrosOperarios, setOtrosOperarios] = useState([]);
    
    // 🔴 NUEVO: Envasadores de Esmaltes
    const [envasadoresEsmaltes, setEnvasadoresEsmaltes] = useState([]);

    // Estado para operarios especiales
    const [operariosEspeciales, setOperariosEspeciales] = useState([]);

    // Estado para vacaciones
    const [vacaciones, setVacaciones] = useState([]);
    const [mostrarModalVacaciones, setMostrarModalVacaciones] = useState(false);
    const [operarioVacacionesSeleccionado, setOperarioVacacionesSeleccionado] = useState(null);

    // Puestos disponibles para Esmaltes (SOLO 3)
    const puestosEsmaltes = [
        { valor: "Preparador", label: "🧪 Preparador" },
        { valor: "Molienda", label: "⚙️ Molienda" },
        { valor: "Terminado", label: "✅ Terminado/Igualado" }
    ];

    // Flag para evitar bucles
    const [actualizandoDesdeDrag, setActualizandoDesdeDrag] = useState(false);

    // ========== FUNCIÓN PARA RECARGAR CONFIGURACIÓN ==========
    const cargarConfiguracion = async () => {
        try {
            const config = await operarioService.getConfiguracionVinilica();
            console.log("📦 Configuración recargada:", config);
            
            if (config && config.gruposBase) {
                const gruposMapeados = {};
                const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
                
                gruposOrden.forEach(grupoId => {
                    if (config.gruposBase[grupoId]) {
                        const grupoData = config.gruposBase[grupoId];
                        gruposMapeados[grupoId] = {
                            operarioId: grupoData.operarioId || null,
                            maquinas: grupoData.maquinas || [101, 102],
                            nombre: grupoData.nombre || `Grupo ${grupoId}`
                        };
                    } else {
                        gruposMapeados[grupoId] = configGruposBase[grupoId];
                    }
                });
                
                setConfigGruposBase(gruposMapeados);
                console.log("✅ Grupos actualizados:", gruposMapeados);
            }
        } catch (error) {
            console.error("Error recargando configuración:", error);
        }
    };

    // ========== CARGAR DATOS DESDE BACKEND ==========
    const cargarDatos = async () => {
        setCargando(true);
        try {
            console.log('🔄 Cargando datos de operarios...');
            
            // Cargar Vinílicas
            const vinilica = await operarioService.getVinilica();
            console.log('✅ Vinílicas cargadas:', vinilica);
            
            // 🔴 Separar Vinílicas por puesto
            const preparadores = vinilica.filter(op => op.puesto === 'Preparador');
            const envasadoresFiltrados = vinilica.filter(op => op.puesto === 'Envasador');
            const igualadoresFiltrados = vinilica.filter(op => op.puesto === 'Igualador' || op.puesto === 'Terminado');
            
            console.log('✅ Preparadores:', preparadores);
            console.log('✅ Envasadores:', envasadoresFiltrados);
            console.log('✅ Igualadores:', igualadoresFiltrados);
            
            // Cargar configuración de rotación
            const config = await operarioService.getConfiguracionVinilica();
            console.log("📦 Configuración recibida:", config);
            
            // ORDENAR LOS OPERARIOS SEGÚN LA CONFIGURACIÓN DE GRUPOS BASE
            let operariosOrdenados = [...preparadores];
            
            if (config && config.gruposBase) {
                const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
                const ordenIds = gruposOrden.map(grupoId => config.gruposBase[grupoId]?.operarioId).filter(id => id !== null && id !== undefined);
                
                if (ordenIds.length > 0) {
                    const operariosMap = new Map();
                    preparadores.forEach(op => operariosMap.set(op.id, op));
                    
                    const nuevosOperarios = [];
                    const idsUsados = new Set();
                    
                    ordenIds.forEach(id => {
                        if (operariosMap.has(id) && !idsUsados.has(id)) {
                            nuevosOperarios.push(operariosMap.get(id));
                            idsUsados.add(id);
                        }
                    });
                    
                    preparadores.forEach(op => {
                        if (!idsUsados.has(op.id)) {
                            nuevosOperarios.push(op);
                        }
                    });
                    
                    operariosOrdenados = nuevosOperarios;
                    console.log("✅ Operarios reordenados:", operariosOrdenados.map(o => o.nombre));
                }
            }
            
            setOperariosVinilica(operariosOrdenados);
            setEnvasadores(envasadoresFiltrados);
            setIgualadores(igualadoresFiltrados);

            console.log('🔄 Cargando operarios de esmaltes...');
            
            let esmaltes = [];
            
            try {
                const todos = await operarioService.getAll();
                console.log('📦 getAll() - TODOS los operarios:', todos);
                
                esmaltes = todos.filter(op => op.area === 'esmaltes');
                console.log('✅ Esmaltes filtrados por area === "esmaltes":', esmaltes);
                
                if (esmaltes.length === 0) {
                    console.log('⚠️ No se encontraron por "area", intentando por "puesto"...');
                    esmaltes = todos.filter(op => {
                        const puesto = (op.puesto || '').toLowerCase();
                        return puesto === 'molienda' || 
                               puesto === 'terminado' || 
                               puesto === 'preparador' ||
                               puesto === 'igualador';
                    });
                    console.log('✅ Esmaltes filtrados por puesto:', esmaltes);
                }
                
            } catch (error) {
                console.error('❌ Error en getAll():', error);
            }
            
            if (!esmaltes || esmaltes.length === 0) {
                console.log('🔄 Intentando con getEsmaltes()...');
                try {
                    esmaltes = await operarioService.getEsmaltes();
                    console.log('📦 getEsmaltes():', esmaltes);
                } catch (error) {
                    console.warn('⚠️ Error en getEsmaltes():', error);
                }
            }
            
            if (!esmaltes || esmaltes.length === 0) {
                console.warn('⚠️ No se encontraron operarios de esmaltes en la BD');
                esmaltes = [];
            }
            
            // 🔴 NUEVO: Separar envasadores de esmaltes
            const envasadoresEsm = esmaltes.filter(op => op.puesto === 'Envasador');
            const operariosEsm = esmaltes.filter(op => op.puesto !== 'Envasador');
            
            console.log('✅ Envasadores Esmaltes:', envasadoresEsm);
            console.log('✅ Operarios Esmaltes:', operariosEsm);
            
            const esmaltesConArea = operariosEsm.map(op => ({
                ...op,
                area: op.area || 'esmaltes'
            }));
            
            setOtrosOperarios(esmaltesConArea);
            setEnvasadoresEsmaltes(envasadoresEsm);
            console.log('✅ Estado otrosOperarios actualizado:', esmaltesConArea);

            // Cargar Especiales
            const especiales = await operarioService.getEspeciales();
            setOperariosEspeciales(especiales);
            
            // Cargar vacaciones
            const vacacionesData = await operarioService.getVacaciones();
            setVacaciones(vacacionesData);
            console.log('✅ Vacaciones cargadas:', vacacionesData);
            
            // Configurar grupos base
            if (config && config.gruposBase) {
                const gruposMapeados = {};
                const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
                
                gruposOrden.forEach(grupoId => {
                    if (config.gruposBase[grupoId]) {
                        const grupoData = config.gruposBase[grupoId];
                        gruposMapeados[grupoId] = {
                            operarioId: grupoData.operarioId || null,
                            maquinas: grupoData.maquinas || [101, 102],
                            nombre: grupoData.nombre || `Grupo ${grupoId}`
                        };
                    }
                });
                
                setConfigGruposBase(gruposMapeados);
                console.log("✅ Grupos mapeados:", gruposMapeados);
            }
            
            if (config && config.semanasRotadas !== undefined) {
                setSemanasRotadas(config.semanasRotadas);
            } else {
                setSemanasRotadas(0);
            }

            // Disparar eventos para otros componentes
            window.dispatchEvent(new CustomEvent("vinilicaConfigUpdated", {
                detail: { 
                    operarios: operariosOrdenados, 
                    grupos: config?.gruposBase, 
                    semanasRotadas: config?.semanasRotadas || 0 
                }
            }));
            
            window.dispatchEvent(new CustomEvent("operariosEspecialesUpdated", {
                detail: { operarios: especiales }
            }));

            window.dispatchEvent(new CustomEvent("operariosEsmaltesUpdated", {
                detail: { operarios: esmaltesConArea }
            }));

            console.log('✅ Todos los datos cargados correctamente');

        } catch (error) {
            console.error("❌ Error cargando datos:", error);
            mostrarMensaje("❌ Error al cargar datos del servidor", "error");
        } finally {
            setCargando(false);
        }
    };

    // Cargar datos al montar
    useEffect(() => {
        cargarDatos();
    }, []);

    // Guardar cambios en backend cuando cambien los operarios Vinílica
    useEffect(() => {
        if (operariosVinilica.length > 0 && !actualizandoDesdeDrag) {
            const ids = operariosVinilica.map(op => op.id);
            operarioService.reordenarVinilica(ids)
                .then(() => {
                    cargarConfiguracion();
                })
                .catch(err => {
                    console.error("Error guardando orden:", err);
                });
        }
    }, [operariosVinilica]);

    const mostrarMensaje = (texto, tipo = "success") => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    };

    // ========== DRAG AND DROP ==========
    const [dragIndex, setDragIndex] = useState(null);

    const handleDragStart = (e, index) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = "0.5";
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = "";
        setDragIndex(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();

        if (dragIndex === null || dragIndex === dropIndex) {
            return;
        }

        setActualizandoDesdeDrag(true);

        const nuevosOperarios = [...operariosVinilica];
        const temp = nuevosOperarios[dragIndex];
        nuevosOperarios[dragIndex] = nuevosOperarios[dropIndex];
        nuevosOperarios[dropIndex] = temp;

        setOperariosVinilica(nuevosOperarios);

        try {
            const ids = nuevosOperarios.map(op => op.id);
            await operarioService.reordenarVinilica(ids);
            
            setSemanasRotadas(0);
            await cargarConfiguracion();
            
            mostrarMensaje(`🔄 ${temp.nombre} ↔ ${nuevosOperarios[dropIndex].nombre}`, "success");
        } catch (error) {
            console.error("Error guardando orden:", error);
            mostrarMensaje("❌ Error al guardar el orden", "error");
            await cargarDatos();
        }

        setActualizandoDesdeDrag(false);
    };

    // ========== GESTIÓN DE VACACIONES ==========
    const abrirModalVacaciones = (operario) => {
        setOperarioVacacionesSeleccionado(operario);
        setMostrarModalVacaciones(true);
    };

    const cerrarModalVacaciones = () => {
        setMostrarModalVacaciones(false);
        setOperarioVacacionesSeleccionado(null);
    };

    const guardarVacaciones = async (operarioId, fechaInicio, fechaFin, observaciones) => {
        try {
            const nuevaVacacion = {
                operarioId,
                fechaInicio,
                fechaFin,
                observaciones: observaciones || "",
                activo: true
            };
            
            await operarioService.crearVacacion(nuevaVacacion);
            await cargarDatos();
            mostrarMensaje("✅ Vacaciones registradas correctamente");
            cerrarModalVacaciones();
        } catch (error) {
            console.error("Error guardando vacaciones:", error);
            mostrarMensaje("❌ Error al registrar vacaciones", "error");
        }
    };

    const eliminarVacacion = async (vacacionId) => {
        if (window.confirm("¿Confirmas eliminar este registro de vacaciones?")) {
            try {
                await operarioService.eliminarVacacion(vacacionId);
                await cargarDatos();
                mostrarMensaje("✅ Vacaciones eliminadas");
            } catch (error) {
                console.error("Error eliminando vacaciones:", error);
                mostrarMensaje("❌ Error al eliminar vacaciones", "error");
            }
        }
    };

    const estaEnVacaciones = (operarioId) => {
        const hoy = new Date();
        const vacacionActiva = vacaciones.find(v => 
            v.operarioId === operarioId && 
            v.activo &&
            new Date(v.fechaInicio) <= hoy &&
            new Date(v.fechaFin) >= hoy
        );
        return vacacionActiva || null;
    };

    const obtenerVacacionesProximas = (operarioId) => {
        const hoy = new Date();
        const proximas = vacaciones.filter(v => 
            v.operarioId === operarioId && 
            v.activo &&
            new Date(v.fechaInicio) > hoy
        );
        return proximas.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio));
    };

    // ========== CRUD OPERARIOS VINÍLICA (PREPARADORES) ==========
    const agregarOperarioVinilica = async (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (operariosVinilica.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe como preparador`, "error");
            return;
        }

        try {
            const nuevo = await operarioService.crear({
                nombre: nombre.trim(),
                puesto: "Preparador",
                area: "vinilica",
                activo: true
            });
            setOperariosVinilica([...operariosVinilica, nuevo]);
            mostrarMensaje(`✅ "${nombre}" agregado como Preparador`);
            await cargarDatos();
        } catch (error) {
            mostrarMensaje("❌ Error al agregar preparador", "error");
        }
    };

    const editarOperarioVinilica = async (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        if (operariosVinilica.some(op => op.nombre.toLowerCase() === nuevoNombre.toLowerCase() && op.id !== id)) {
            mostrarMensaje(`❌ "${nuevoNombre}" ya existe como preparador`, "error");
            return;
        }

        try {
            const operario = operariosVinilica.find(op => op.id === id);
            await operarioService.actualizar(id, { ...operario, nombre: nuevoNombre.trim() });
            setOperariosVinilica(prev => prev.map(op =>
                op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
            ));
            mostrarMensaje(`✏️ Preparador actualizado a "${nuevoNombre}"`);
        } catch (error) {
            mostrarMensaje("❌ Error al actualizar", "error");
        }
    };

    const eliminarOperarioVinilica = async (id) => {
        const operario = operariosVinilica.find(op => op.id === id);
        if (window.confirm(`¿Eliminar al preparador "${operario.nombre}"?`)) {
            try {
                await operarioService.eliminar(id);
                const nuevosOperarios = operariosVinilica.filter(op => op.id !== id);
                setOperariosVinilica(nuevosOperarios);

                const nuevosGruposBase = { ...configGruposBase };
                const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];

                gruposOrden.forEach((grupo, idx) => {
                    if (idx < nuevosOperarios.length) {
                        nuevosGruposBase[grupo] = {
                            ...nuevosGruposBase[grupo],
                            operarioId: nuevosOperarios[idx].id
                        };
                    } else if (nuevosGruposBase[grupo]?.operarioId === id) {
                        nuevosGruposBase[grupo] = {
                            ...nuevosGruposBase[grupo],
                            operarioId: null
                        };
                    }
                });

                setConfigGruposBase(nuevosGruposBase);
                setSemanasRotadas(0);
                mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
            } catch (error) {
                mostrarMensaje("❌ Error al eliminar", "error");
            }
        }
    };

    // ========== CRUD ENVASADORES VINÍLICA ==========
    const agregarEnvasador = async (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (envasadores.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe como envasador`, "error");
            return;
        }

        try {
            const nuevo = await operarioService.crear({
                nombre: nombre.trim(),
                puesto: "Envasador",
                area: "vinilica",
                activo: true
            });
            setEnvasadores([...envasadores, nuevo]);
            mostrarMensaje(`✅ "${nombre}" agregado como Envasador`);
        } catch (error) {
            mostrarMensaje("❌ Error al agregar envasador", "error");
        }
    };

    const editarEnvasador = async (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        try {
            const operario = envasadores.find(op => op.id === id);
            await operarioService.actualizar(id, { ...operario, nombre: nuevoNombre.trim() });
            setEnvasadores(prev => prev.map(op =>
                op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
            ));
            mostrarMensaje(`✏️ Envasador actualizado a "${nuevoNombre}"`);
        } catch (error) {
            mostrarMensaje("❌ Error al actualizar", "error");
        }
    };

    const eliminarEnvasador = async (id) => {
        const operario = envasadores.find(op => op.id === id);
        if (window.confirm(`¿Eliminar al envasador "${operario.nombre}"?`)) {
            try {
                await operarioService.eliminar(id);
                setEnvasadores(prev => prev.filter(op => op.id !== id));
                mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
            } catch (error) {
                mostrarMensaje("❌ Error al eliminar", "error");
            }
        }
    };

    // ========== CRUD IGUALADORES ==========
    const agregarIgualador = async (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (igualadores.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe como igualador`, "error");
            return;
        }

        try {
            const nuevo = await operarioService.crear({
                nombre: nombre.trim(),
                puesto: "Igualador",
                area: "vinilica",
                activo: true
            });
            setIgualadores([...igualadores, nuevo]);
            mostrarMensaje(`✅ "${nombre}" agregado como Igualador`);
        } catch (error) {
            mostrarMensaje("❌ Error al agregar igualador", "error");
        }
    };

    const editarIgualador = async (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        try {
            const operario = igualadores.find(op => op.id === id);
            await operarioService.actualizar(id, { ...operario, nombre: nuevoNombre.trim() });
            setIgualadores(prev => prev.map(op =>
                op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
            ));
            mostrarMensaje(`✏️ Igualador actualizado a "${nuevoNombre}"`);
        } catch (error) {
            mostrarMensaje("❌ Error al actualizar", "error");
        }
    };

    const eliminarIgualador = async (id) => {
        const operario = igualadores.find(op => op.id === id);
        if (window.confirm(`¿Eliminar al igualador "${operario.nombre}"?`)) {
            try {
                await operarioService.eliminar(id);
                setIgualadores(prev => prev.filter(op => op.id !== id));
                mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
            } catch (error) {
                mostrarMensaje("❌ Error al eliminar", "error");
            }
        }
    };

    // ========== CRUD OPERARIOS ESMALTES ==========
    const agregarOtroOperario = async (nombre, puesto, area) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (!puesto) {
            mostrarMensaje("❌ Debes seleccionar un puesto", "error");
            return;
        }

        try {
            const nuevo = await operarioService.crear({
                nombre: nombre.trim(),
                puesto: puesto,
                area: area,
                activo: true
            });
            setOtrosOperarios([...otrosOperarios, nuevo]);
            
            const esmaltesFiltrados = [...otrosOperarios, nuevo].filter(op => op.area === "esmaltes");
            window.dispatchEvent(new CustomEvent("operariosEsmaltesUpdated", {
                detail: { operarios: esmaltesFiltrados }
            }));
            
            mostrarMensaje(`✅ "${nombre}" agregado a ${area} como ${puesto}`);
        } catch (error) {
            mostrarMensaje("❌ Error al agregar", "error");
        }
    };

    const editarOtroOperario = async (id, campo, valor) => {
        try {
            const operario = otrosOperarios.find(op => op.id === id);
            const actualizado = { ...operario, [campo]: valor };
            await operarioService.actualizar(id, actualizado);
            setOtrosOperarios(prev => prev.map(op =>
                op.id === id ? { ...op, [campo]: valor } : op
            ));
            
            const esmaltesFiltrados = otrosOperarios.map(op => 
                op.id === id ? { ...op, [campo]: valor } : op
            ).filter(op => op.area === "esmaltes");
            window.dispatchEvent(new CustomEvent("operariosEsmaltesUpdated", {
                detail: { operarios: esmaltesFiltrados }
            }));
            
            mostrarMensaje(`✏️ ${campo} actualizado`);
        } catch (error) {
            mostrarMensaje("❌ Error al actualizar", "error");
        }
    };

    const eliminarOtroOperario = async (id) => {
        const operario = otrosOperarios.find(op => op.id === id);
        if (window.confirm(`¿Eliminar a "${operario.nombre}"?`)) {
            try {
                await operarioService.eliminar(id);
                setOtrosOperarios(prev => prev.filter(op => op.id !== id));
                
                const esmaltesFiltrados = otrosOperarios.filter(op => op.id !== id && op.area === "esmaltes");
                window.dispatchEvent(new CustomEvent("operariosEsmaltesUpdated", {
                    detail: { operarios: esmaltesFiltrados }
                }));
                
                mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
            } catch (error) {
                mostrarMensaje("❌ Error al eliminar", "error");
            }
        }
    };

    // ========== CRUD ENVASADORES ESMALTES ==========
    const agregarEnvasadorEsmalte = async (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (envasadoresEsmaltes.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe como envasador de esmaltes`, "error");
            return;
        }

        try {
            const nuevo = await operarioService.crear({
                nombre: nombre.trim(),
                puesto: "Envasador",
                area: "esmaltes",
                activo: true
            });
            setEnvasadoresEsmaltes([...envasadoresEsmaltes, nuevo]);
            mostrarMensaje(`✅ "${nombre}" agregado como Envasador de Esmaltes`);
        } catch (error) {
            mostrarMensaje("❌ Error al agregar envasador", "error");
        }
    };

    const editarEnvasadorEsmalte = async (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        try {
            const operario = envasadoresEsmaltes.find(op => op.id === id);
            await operarioService.actualizar(id, { ...operario, nombre: nuevoNombre.trim() });
            setEnvasadoresEsmaltes(prev => prev.map(op =>
                op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
            ));
            mostrarMensaje(`✏️ Envasador actualizado a "${nuevoNombre}"`);
        } catch (error) {
            mostrarMensaje("❌ Error al actualizar", "error");
        }
    };

    const eliminarEnvasadorEsmalte = async (id) => {
        const operario = envasadoresEsmaltes.find(op => op.id === id);
        if (window.confirm(`¿Eliminar al envasador "${operario.nombre}"?`)) {
            try {
                await operarioService.eliminar(id);
                setEnvasadoresEsmaltes(prev => prev.filter(op => op.id !== id));
                mostrarMensaje(`🗑️ "${operario.nombre}" eliminado`);
            } catch (error) {
                mostrarMensaje("❌ Error al eliminar", "error");
            }
        }
    };

    // ========== CRUD OPERARIOS ESPECIALES ==========
    const agregarOperarioEspecial = async (nombre) => {
        if (!nombre.trim()) {
            mostrarMensaje("❌ El nombre no puede estar vacío", "error");
            return;
        }
        if (operariosEspeciales.some(op => op.nombre.toLowerCase() === nombre.toLowerCase())) {
            mostrarMensaje(`❌ "${nombre}" ya existe en especiales`, "error");
            return;
        }

        try {
            const nuevo = await operarioService.crear({
                nombre: nombre.trim(),
                puesto: "Impermeabilizantes",
                area: "especial",
                activo: true
            });
            setOperariosEspeciales([...operariosEspeciales, nuevo]);
            
            window.dispatchEvent(new CustomEvent("operariosEspecialesUpdated", {
                detail: { operarios: [...operariosEspeciales, nuevo] }
            }));
            
            mostrarMensaje(`✅ "${nombre}" agregado a Operarios Especiales`);
        } catch (error) {
            mostrarMensaje("❌ Error al agregar", "error");
        }
    };

    const editarOperarioEspecial = async (id, nuevoNombre) => {
        if (!nuevoNombre.trim()) return;
        if (operariosEspeciales.some(op => op.nombre.toLowerCase() === nuevoNombre.toLowerCase() && op.id !== id)) {
            mostrarMensaje(`❌ "${nuevoNombre}" ya existe en especiales`, "error");
            return;
        }

        try {
            const operario = operariosEspeciales.find(op => op.id === id);
            await operarioService.actualizar(id, { ...operario, nombre: nuevoNombre.trim() });
            setOperariosEspeciales(prev => prev.map(op =>
                op.id === id ? { ...op, nombre: nuevoNombre.trim() } : op
            ));
            mostrarMensaje(`✏️ Nombre actualizado a "${nuevoNombre}"`);
        } catch (error) {
            mostrarMensaje("❌ Error al actualizar", "error");
        }
    };

    const eliminarOperarioEspecial = async (id) => {
        const operario = operariosEspeciales.find(op => op.id === id);
        if (window.confirm(`¿Eliminar a "${operario.nombre}" de Operarios Especiales?`)) {
            try {
                await operarioService.eliminar(id);
                setOperariosEspeciales(prev => prev.filter(op => op.id !== id));
                mostrarMensaje(`🗑️ "${operario.nombre}" eliminado de Especiales`);
            } catch (error) {
                mostrarMensaje("❌ Error al eliminar", "error");
            }
        }
    };

    const toggleActivoEspecial = async (id) => {
        try {
            const operario = await operarioService.toggleActivo(id);
            setOperariosEspeciales(prev => prev.map(op =>
                op.id === id ? operario : op
            ));
            
            window.dispatchEvent(new CustomEvent("operariosEspecialesUpdated", {
                detail: { operarios: operariosEspeciales.map(op => op.id === id ? operario : op) }
            }));
            
            mostrarMensaje(`${operario.activo ? '🟢' : '🔴'} "${operario.nombre}" ${operario.activo ? 'activado' : 'desactivado'}`);
        } catch (error) {
            mostrarMensaje("❌ Error al cambiar estado", "error");
        }
    };

    // ========== ASIGNACIÓN DE GRUPOS BASE ==========
    const asignarOperarioAGrupoBase = async (grupoId, operarioId) => {
        const operarioIdNum = parseInt(operarioId) || null;

        const nuevosGruposBase = {
            ...configGruposBase,
            [grupoId]: { ...configGruposBase[grupoId], operarioId: operarioIdNum }
        };

        setConfigGruposBase(nuevosGruposBase);

        const operario = operariosVinilica.find(op => op.id === operarioIdNum);
        mostrarMensaje(`📌 ${operario?.nombre || "Nadie"} asignado al ${configGruposBase[grupoId].nombre}`);

        const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
        const ordenDesdeSelectores = gruposOrden.map(grupo => nuevosGruposBase[grupo]?.operarioId).filter(id => id !== null);

        const operariosMap = new Map();
        operariosVinilica.forEach(op => operariosMap.set(op.id, op));

        const nuevosOperariosOrdenados = [];
        const idsUsados = new Set();

        ordenDesdeSelectores.forEach(id => {
            if (operariosMap.has(id) && !idsUsados.has(id)) {
                nuevosOperariosOrdenados.push(operariosMap.get(id));
                idsUsados.add(id);
            }
        });

        operariosVinilica.forEach(op => {
            if (!idsUsados.has(op.id)) {
                nuevosOperariosOrdenados.push(op);
            }
        });

        setOperariosVinilica(nuevosOperariosOrdenados);
        setSemanasRotadas(0);
        
        try {
            const ids = nuevosOperariosOrdenados.map(op => op.id);
            await operarioService.reordenarVinilica(ids);
        } catch (error) {
            console.error("Error guardando reorden:", error);
        }
    };

    // ========== ROTACIÓN SEMANAL ==========
    const rotarSemanal = () => {
        const nuevasSemanas = semanasRotadas + 1;
        setSemanasRotadas(nuevasSemanas);
        mostrarMensaje(`🔄 Rotación aplicada (Semana ${nuevasSemanas})`);
    };

    const resetearRotacion = () => {
        if (window.confirm("¿Resetear la rotación a la configuración inicial?")) {
            setSemanasRotadas(0);
            mostrarMensaje("🔄 Rotación reseteada");
        }
    };

    // ========== UTILIDADES ==========
    const getNombreOperario = (id) => {
        if (!id) return "Sin asignar";
        const operario = operariosVinilica.find(op => op.id === id);
        if (!operario) return "Desconocido";
        
        const vacacionActiva = estaEnVacaciones(id);
        if (vacacionActiva) {
            return `${operario.nombre} 🌴⛱️`;
        }
        return operario.nombre;
    };

    const operariosFiltrados = () => {
        if (tabActiva === "vinilica") {
            if (subSeccionVinilica === "maquinas") return operariosVinilica;
            if (subSeccionVinilica === "envasadores") return envasadores;
            if (subSeccionVinilica === "igualadores") return igualadores;
            return operariosEspeciales;
        }
        if (tabActiva === "esmaltes") {
            if (subSeccionEsmaltes === "operarios") {
                return otrosOperarios.filter(op => op.area === "esmaltes");
            } else {
                return envasadoresEsmaltes;
            }
        }
        return [];
    };

    const gruposOrden = ["grupo0", "grupo1", "grupo2", "grupo3"];
    const previewRotacion = gruposOrden.map((grupo, idx) => {
        const asignacionBase = gruposOrden.map((g, i) => {
            if (i < operariosVinilica.length) {
                return operariosVinilica[i].id;
            }
            return configGruposBase[g]?.operarioId || null;
        });

        const rotacionActual = [...asignacionBase];
        for (let i = 0; i < semanasRotadas; i++) {
            const ultimo = rotacionActual.pop();
            rotacionActual.unshift(ultimo);
        }

        const rotacionSiguiente = [...rotacionActual];
        const ultimo = rotacionSiguiente.pop();
        rotacionSiguiente.unshift(ultimo);

        const operarioActual = getNombreOperario(rotacionActual[idx]);
        const operarioSiguiente = getNombreOperario(rotacionSiguiente[idx]);

        return {
            grupo: configGruposBase[grupo]?.nombre || grupo,
            actual: operarioActual,
            siguiente: operarioSiguiente,
            estaEnVacaciones: rotacionActual[idx] ? estaEnVacaciones(rotacionActual[idx]) : null
        };
    });

    const operarioEspecialActivo = operariosEspeciales.find(op => op.activo)?.nombre || "Lazaro";

    // ========== RENDER ENVASADORES VINÍLICA ==========
    const renderEnvasadores = () => (
        <div className="op-card table-card">
            <div className="card-header-flex">
                <h3 className="op-card-title">📦 Envasadores - Vinílicas</h3>
                <span className="count-badge">{envasadores.length} Envasadores</span>
            </div>
            <div className="op-table-wrapper">
                <table className="op-table">
                    <thead>
                        <tr><th>Nombre (Editable)</th><th>Puesto</th><th>Estado</th><th className="txt-center">Acciones</th></tr>
                    </thead>
                    <tbody>
                        {envasadores.map((op) => {
                            const vacacionActiva = estaEnVacaciones(op.id);
                            return (
                                <tr key={op.id} className={vacacionActiva ? 'en-vacaciones' : ''}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input className="op-input-edit" value={op.nombre}
                                                onChange={(e) => editarEnvasador(op.id, e.target.value)}
                                                placeholder="Nombre del envasador..." style={{ flex: 1 }} />
                                            {vacacionActiva && <span className="vacation-badge">🌴 VACACIONES</span>}
                                        </div>
                                    </td>
                                    <td><span className="op-puesto-tag envasador">Envasador</span></td>
                                    <td>
                                        <button className={`status-badge ${op.activo ? 'active' : 'inactive'}`}>
                                            {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </button>
                                    </td>
                                    <td className="txt-center">
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            <button className="op-action-btn vacation" onClick={() => abrirModalVacaciones(op)}>🌴</button>
                                            <button className="op-action-btn delete" onClick={() => eliminarEnvasador(op.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="op-add-operario">
                <input type="text" id="nuevoEnvasador"
                    placeholder="Nuevo envasador..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            const input = document.getElementById('nuevoEnvasador');
                            if (input.value) { agregarEnvasador(input.value); input.value = ''; }
                        }
                    }}
                />
                <button onClick={() => {
                    const input = document.getElementById('nuevoEnvasador');
                    if (input.value) { agregarEnvasador(input.value); input.value = ''; }
                }}>+ Agregar</button>
            </div>
        </div>
    );

    // ========== RENDER IGUALADORES ==========
    const renderIgualadores = () => (
        <div className="op-card table-card">
            <div className="card-header-flex">
                <h3 className="op-card-title">🎯 Igualadores - Vinílicas</h3>
                <span className="count-badge">{igualadores.length} Igualadores</span>
            </div>
            <div className="op-table-wrapper">
                <table className="op-table">
                    <thead>
                        <tr><th>Nombre (Editable)</th><th>Puesto</th><th>Estado</th><th className="txt-center">Acciones</th></tr>
                    </thead>
                    <tbody>
                        {igualadores.map((op) => {
                            const vacacionActiva = estaEnVacaciones(op.id);
                            return (
                                <tr key={op.id} className={vacacionActiva ? 'en-vacaciones' : ''}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input className="op-input-edit" value={op.nombre}
                                                onChange={(e) => editarIgualador(op.id, e.target.value)}
                                                placeholder="Nombre del igualador..." style={{ flex: 1 }} />
                                            {vacacionActiva && <span className="vacation-badge">🌴 VACACIONES</span>}
                                        </div>
                                    </td>
                                    <td><span className="op-puesto-tag igualador">Igualador</span></td>
                                    <td>
                                        <button className={`status-badge ${op.activo ? 'active' : 'inactive'}`}>
                                            {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </button>
                                    </td>
                                    <td className="txt-center">
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            <button className="op-action-btn vacation" onClick={() => abrirModalVacaciones(op)}>🌴</button>
                                            <button className="op-action-btn delete" onClick={() => eliminarIgualador(op.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="op-add-operario">
                <input type="text" id="nuevoIgualador"
                    placeholder="Nuevo igualador..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            const input = document.getElementById('nuevoIgualador');
                            if (input.value) { agregarIgualador(input.value); input.value = ''; }
                        }
                    }}
                />
                <button onClick={() => {
                    const input = document.getElementById('nuevoIgualador');
                    if (input.value) { agregarIgualador(input.value); input.value = ''; }
                }}>+ Agregar</button>
            </div>
        </div>
    );

    // ========== RENDER ENVASADORES ESMALTES ==========
    const renderEnvasadoresEsmaltes = () => (
        <div className="op-card table-card">
            <div className="card-header-flex">
                <h3 className="op-card-title">📦 Envasadores - Esmaltes</h3>
                <span className="count-badge">{envasadoresEsmaltes.length} Envasadores</span>
            </div>
            <div className="op-table-wrapper">
                <table className="op-table">
                    <thead>
                        <tr><th>Nombre (Editable)</th><th>Puesto</th><th>Estado</th><th className="txt-center">Acciones</th></tr>
                    </thead>
                    <tbody>
                        {envasadoresEsmaltes.map((op) => {
                            const vacacionActiva = estaEnVacaciones(op.id);
                            return (
                                <tr key={op.id} className={vacacionActiva ? 'en-vacaciones' : ''}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input className="op-input-edit" value={op.nombre}
                                                onChange={(e) => editarEnvasadorEsmalte(op.id, e.target.value)}
                                                placeholder="Nombre del envasador..." style={{ flex: 1 }} />
                                            {vacacionActiva && <span className="vacation-badge">🌴 VACACIONES</span>}
                                        </div>
                                    </td>
                                    <td><span className="op-puesto-tag envasador">Envasador</span></td>
                                    <td>
                                        <button className={`status-badge ${op.activo ? 'active' : 'inactive'}`}>
                                            {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </button>
                                    </td>
                                    <td className="txt-center">
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            <button className="op-action-btn vacation" onClick={() => abrirModalVacaciones(op)}>🌴</button>
                                            <button className="op-action-btn delete" onClick={() => eliminarEnvasadorEsmalte(op.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="op-add-operario">
                <input type="text" id="nuevoEnvasadorEsm"
                    placeholder="Nuevo envasador..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            const input = document.getElementById('nuevoEnvasadorEsm');
                            if (input.value) { agregarEnvasadorEsmalte(input.value); input.value = ''; }
                        }
                    }}
                />
                <button onClick={() => {
                    const input = document.getElementById('nuevoEnvasadorEsm');
                    if (input.value) { agregarEnvasadorEsmalte(input.value); input.value = ''; }
                }}>+ Agregar</button>
            </div>
        </div>
    );

    // ========== RENDER ESPECIALES ==========
    const renderEspeciales = () => (
        <div className="op-card especiales-card">
            <div className="card-header-flex">
                <h3 className="op-card-title">🧴 Operarios Especiales (Impermeabilizantes)</h3>
                <span className="count-badge">{operariosEspeciales.filter(op => op.activo).length} Activos</span>
            </div>
            <p className="card-desc">
                <strong>📌 Estos operarios se asignan automáticamente a las cargas especiales</strong> (códigos excluidos, impermeabilizantes) 
                en los PDFs y reportes de producción. Actualmente activo: <strong className="operario-activo">{operarioEspecialActivo}</strong>
            </p>
            <div className="op-table-wrapper">
                <table className="op-table">
                    <thead><tr><th>Nombre (Editable)</th><th>Puesto</th><th>Estado</th><th className="txt-center">Acciones</th></tr></thead>
                    <tbody>
                        {operariosEspeciales.map((op) => {
                            const vacacionActiva = estaEnVacaciones(op.id);
                            return (
                                <tr key={op.id} className={vacacionActiva ? 'en-vacaciones' : ''}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input className="op-input-edit" value={op.nombre}
                                                onChange={(e) => editarOperarioEspecial(op.id, e.target.value)}
                                                placeholder="Nombre del operario especial..." style={{ flex: 1 }} />
                                            {vacacionActiva && <span className="vacation-badge">🌴 VACACIONES</span>}
                                        </div>
                                    </td>
                                    <td><span className="op-puesto-tag especial">{op.puesto}</span></td>
                                    <td>
                                        <button className={`status-badge ${op.activo ? 'active' : 'inactive'}`}
                                            onClick={() => toggleActivoEspecial(op.id)}>
                                            {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </button>
                                    </td>
                                    <td className="txt-center">
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            <button className="op-action-btn vacation" onClick={() => abrirModalVacaciones(op)}>🌴</button>
                                            <button className="op-action-btn delete" onClick={() => eliminarOperarioEspecial(op.id)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="op-add-operario">
                <input type="text" id="nuevoEspecial"
                    placeholder="Nuevo operario especial..."
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            const input = document.getElementById('nuevoEspecial');
                            if (input.value) { agregarOperarioEspecial(input.value); input.value = ''; }
                        }
                    }}
                />
                <button onClick={() => {
                    const input = document.getElementById('nuevoEspecial');
                    if (input.value) { agregarOperarioEspecial(input.value); input.value = ''; }
                }}>+ Agregar Especial</button>
            </div>
            <div className="info-box">
                <strong>🧴 Operarios Especiales:</strong> Estos operarios se asignan automáticamente a las cargas de 
                impermeabilizantes (códigos excluidos) en el PDF y reportes de producción.
                <br /><br />
                <strong>💡 Nota:</strong> Solo puede haber <strong>UN operario activo</strong> a la vez. Si activas uno, los demás se desactivarán automáticamente.
            </div>
        </div>
    );

    // ========== RENDERIZAR CONTENIDO VINÍLICA ==========
    function renderContenidoVinilica() {
        if (subSeccionVinilica === "maquinas") {
            return (
                <>
                    <div className="op-card table-card">
                        <div className="card-header-flex">
                            <h3 className="op-card-title">
                                🖱️ Preparadores (VI-101 a VI-108) 
                                <span className="drag-hint">- Arrastra para intercambiar posiciones</span>
                            </h3>
                            <div className="header-actions">
                                <span className="count-badge">{operariosVinilica.length} Preparadores</span>
                                <span className="vacaciones-badge" style={{ 
                                    background: 'rgba(255, 200, 0, 0.15)', 
                                    border: '1px solid rgba(255, 200, 0, 0.3)',
                                    color: '#ffd700',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px',
                                    marginLeft: '8px'
                                }}>
                                    🌴 {vacaciones.filter(v => v.activo).length} en vacaciones
                                </span>
                            </div>
                        </div>

                        <div className="op-table-wrapper">
                            <table className="op-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>⋮⋮</th>
                                        <th>Nombre (Editable)</th>
                                        <th>Puesto</th>
                                        <th>Estado</th>
                                        <th className="txt-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {operariosVinilica.map((op, idx) => {
                                        const vacacionActiva = estaEnVacaciones(op.id);
                                        const vacacionesProximas = obtenerVacacionesProximas(op.id);
                                        
                                        return (
                                            <tr key={op.id} draggable={true}
                                                onDragStart={(e) => handleDragStart(e, idx)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, idx)}
                                                style={{ cursor: "grab" }}
                                                className={vacacionActiva ? 'en-vacaciones' : ''}>
                                                <td className="drag-handle" style={{ textAlign: 'center', fontSize: '20px' }}>⋮⋮</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input className="op-input-edit" value={op.nombre}
                                                            onChange={(e) => editarOperarioVinilica(op.id, e.target.value)}
                                                            placeholder="Nombre del preparador..." style={{ flex: 1 }} />
                                                        {vacacionActiva && <span className="vacation-badge">🌴 VACACIONES</span>}
                                                    </div>
                                                    {vacacionesProximas.length > 0 && (
                                                        <div style={{ fontSize: '11px', color: '#ffd700', marginTop: '2px' }}>
                                                            📅 Próximas: {vacacionesProximas.map(v => 
                                                                `${new Date(v.fechaInicio).toLocaleDateString()} - ${new Date(v.fechaFin).toLocaleDateString()}`
                                                            ).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td><span className="op-puesto-tag">Preparador</span></td>
                                                <td>
                                                    <button className={`status-badge ${op.activo ? 'active' : 'inactive'}`}
                                                        style={{ fontSize: '12px', padding: '3px 10px' }}>
                                                        {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                                    </button>
                                                </td>
                                                <td className="txt-center">
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button className="op-action-btn vacation" onClick={() => abrirModalVacaciones(op)}>🌴</button>
                                                        <button className="op-action-btn delete" onClick={() => eliminarOperarioVinilica(op.id)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="op-add-operario">
                            <input type="text" id="nuevoNombre"
                                placeholder="Nuevo preparador..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        const input = document.getElementById('nuevoNombre');
                                        if (input.value) { agregarOperarioVinilica(input.value); input.value = ''; }
                                    }
                                }}
                            />
                            <button onClick={() => {
                                const nombre = document.getElementById('nuevoNombre');
                                if (nombre.value) { agregarOperarioVinilica(nombre.value); nombre.value = ''; }
                            }}>+ Agregar</button>
                        </div>

                        <div className="preview-rotacion-section">
                            <div className="preview-rotacion-title">
                                <span>🔄</span>
                                <h4>Vista Previa de Rotación Semanal</h4>
                                <span className="semanas-rotadas-badge">Semanas rotadas: {semanasRotadas}</span>
                            </div>
                            <table className="preview-rotacion-table">
                                <thead><tr><th>Grupo</th><th>Operario Actual</th><th>→ Próxima Semana</th><th>Estado</th></tr></thead>
                                <tbody>
                                    {previewRotacion.map((item, idx) => (
                                        <tr key={idx} className={item.estaEnVacaciones ? 'vacaciones-preview' : ''}>
                                            <td>{item.grupo}</td>
                                            <td>{item.actual}</td>
                                            <td className="next-week">→ {item.siguiente}</td>
                                            <td>{item.estaEnVacaciones && <span style={{ color: '#ff6b35', fontSize: '12px', fontWeight: 'bold' }}>🌴 Vacaciones</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="op-card machinery-card">
                        <div className="card-header-flex">
                            <h3 className="op-card-title">⚙️ Configuración Base y Rotación</h3>
                            <div className="rotacion-buttons">
                                <button className="btn-rotar" onClick={rotarSemanal}>🔄 Rotar Semana (+1)</button>
                                <button className="btn-reset" onClick={resetearRotacion}>🔁 Resetear Rotación</button>
                            </div>
                        </div>
                        <p className="card-desc"><strong>🔄 Sincronización automática:</strong> Los cambios aquí actualizan automáticamente el orden de la tabla.</p>
                        <div className="op-machinery-list">
                            {Object.entries(configGruposBase).map(([grupoId, grupo]) => {
                                const grupoIndex = parseInt(grupoId.replace("grupo", ""));
                                const operarioPorOrden = operariosVinilica[grupoIndex];
                                const vacacionActiva = operarioPorOrden ? estaEnVacaciones(operarioPorOrden.id) : null;
                                return (
                                    <div key={grupoId} className="op-machine-item">
                                        <div className="machine-label-group">
                                            <span className="machine-id">📌</span>
                                            <label>{grupo.nombre}</label>
                                            {operarioPorOrden && (
                                                <span className="orden-indicador">
                                                    (Posición #{grupoIndex + 1} en tabla)
                                                    {vacacionActiva && <span style={{ color: '#ff6b35', marginLeft: '8px' }}>🌴 VACACIONES</span>}
                                                </span>
                                            )}
                                        </div>
                                        <select className="op-select-custom" value={grupo.operarioId || ""}
                                            onChange={(e) => asignarOperarioAGrupoBase(grupoId, e.target.value)}>
                                            <option value="">Sin asignar (BASE)</option>
                                            {operariosVinilica.map(op => {
                                                const enVacaciones = estaEnVacaciones(op.id);
                                                return <option key={op.id} value={op.id}>{op.nombre} {enVacaciones ? '🌴' : ''}</option>;
                                            })}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            );
        } else if (subSeccionVinilica === "envasadores") {
            return renderEnvasadores();
        } else if (subSeccionVinilica === "igualadores") {
            return renderIgualadores();
        } else {
            return renderEspeciales();
        }
    }

    // ========== RENDER PRINCIPAL ==========
    if (cargando) {
        return (
            <div className="op-screen-container">
                <div className="op-glass-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <h2>Cargando operarios...</h2>
                </div>
            </div>
        );
    }

    const vacacionesDelOperario = operarioVacacionesSeleccionado 
        ? vacaciones.filter(v => v.operarioId === operarioVacacionesSeleccionado.id)
        : [];

    return (
        <div className="op-screen-container">
            <div className="op-glass-panel">
                {mensaje.texto && (
                    <div className={`op-toast ${mensaje.tipo}`}>{mensaje.texto}</div>
                )}

                <ModalVacaciones
                    mostrar={mostrarModalVacaciones}
                    operario={operarioVacacionesSeleccionado}
                    onCerrar={cerrarModalVacaciones}
                    onGuardar={guardarVacaciones}
                    onEliminar={eliminarVacacion}
                    vacacionesExistentes={vacacionesDelOperario}
                    mostrarMensaje={mostrarMensaje}
                />

                <aside className="op-sidebar">
                    <div className="op-logo">
                        <span className="op-dot"></span>
                        <h2>Personal Operativo Pintumex</h2>
                    </div>

                    <nav className="op-nav">
                        <div className="nav-label">SECCIONES</div>
                        <button className={`op-nav-btn ${tabActiva === "vinilica" ? "active" : ""}`}
                            onClick={() => { setTabActiva("vinilica"); setSubSeccionVinilica("maquinas"); }}>
                            <span className="nav-icon">💧</span> Vinílicas
                        </button>
                        <button className={`op-nav-btn ${tabActiva === "esmaltes" ? "active" : ""}`}
                            onClick={() => { setTabActiva("esmaltes"); setSubSeccionEsmaltes("operarios"); }}>
                            <span className="nav-icon">✨</span> Esmaltes
                        </button>
                    </nav>

                    {tabActiva === "vinilica" && (
                        <>
                            <div className="nav-divider"></div>
                            <nav className="op-nav">
                                <div className="nav-label">VINÍLICAS</div>
                                <button className={`op-nav-sub-btn ${subSeccionVinilica === "maquinas" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilica("maquinas")}>
                                    <span className="nav-icon">⚙️</span> Preparadores (Máquinas)
                                </button>
                                <button className={`op-nav-sub-btn ${subSeccionVinilica === "envasadores" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilica("envasadores")}>
                                    <span className="nav-icon">📦</span> Envasadores
                                </button>
                                <button className={`op-nav-sub-btn ${subSeccionVinilica === "igualadores" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilica("igualadores")}>
                                    <span className="nav-icon">🎯</span> Igualadores
                                </button>
                                <button className={`op-nav-sub-btn ${subSeccionVinilica === "especiales" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilica("especiales")}>
                                    <span className="nav-icon">🧴</span> Operarios Especiales
                                </button>
                            </nav>
                        </>
                    )}

                    {tabActiva === "esmaltes" && (
                        <>
                            <div className="nav-divider"></div>
                            <nav className="op-nav">
                                <div className="nav-label">ESMALTES</div>
                                <button className={`op-nav-sub-btn ${subSeccionEsmaltes === "operarios" ? "active" : ""}`}
                                    onClick={() => setSubSeccionEsmaltes("operarios")}>
                                    <span className="nav-icon">🧪</span> Operarios
                                </button>
                                <button className={`op-nav-sub-btn ${subSeccionEsmaltes === "envasadores" ? "active" : ""}`}
                                    onClick={() => setSubSeccionEsmaltes("envasadores")}>
                                    <span className="nav-icon">📦</span> Envasadores
                                </button>
                            </nav>
                        </>
                    )}

                    <div className="sidebar-footer">
                        <button className="op-btn-exit" onClick={() => navigate("/mantenimiento")}>
                            ↩ Regresar a Menú
                        </button>
                    </div>
                </aside>

                <main className="op-main-content">
                    <header className="op-header">
                        <div className="op-title-group">
                            <h1>
                                {tabActiva === "vinilica" 
                                    ? (subSeccionVinilica === "maquinas" 
                                        ? "⚙️ Preparadores - Máquinas Vinílicas"
                                        : subSeccionVinilica === "envasadores"
                                        ? "📦 Envasadores - Vinílicas"
                                        : subSeccionVinilica === "igualadores"
                                        ? "🎯 Igualadores - Vinílicas"
                                        : "🧴 Operarios Especiales - Impermeabilizantes")
                                    : (subSeccionEsmaltes === "operarios"
                                        ? "🧪 Operarios - Esmaltes"
                                        : "📦 Envasadores - Esmaltes")}
                            </h1>
                            <p>
                                {tabActiva === "vinilica" 
                                    ? (subSeccionVinilica === "maquinas"
                                        ? "Gestión de preparadores para máquinas VI-101 a VI-108 y rotación semanal"
                                        : subSeccionVinilica === "envasadores"
                                        ? "Gestión de envasadores para el área de vinílicas"
                                        : subSeccionVinilica === "igualadores"
                                        ? "Gestión de igualadores para el área de vinílicas"
                                        : "Gestión de operarios para cargas especiales (impermeabilizantes, códigos excluidos)")
                                    : (subSeccionEsmaltes === "operarios"
                                        ? "Gestión de personal para área de esmaltes con asignación por puesto"
                                        : "Gestión de envasadores para el área de esmaltes")}
                            </p>
                        </div>
                    </header>

                    <div className={`op-workspace ${tabActiva === 'vinilica' ? 'with-sidebar' : ''}`}>
                        {tabActiva === "vinilica" ? (
                            renderContenidoVinilica()
                        ) : (
                            subSeccionEsmaltes === "operarios" ? (
                                <div className="op-card table-card">
                                    <div className="card-header-flex">
                                        <h3 className="op-card-title">Plantilla de Trabajo - Esmaltes</h3>
                                        <span className="count-badge">{otrosOperarios.filter(op => op.area === "esmaltes").length} Operarios</span>
                                    </div>
                                    <p className="card-desc" style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                                        <strong>📌 Estos operarios se usan para la asignación automática de cargas de esmaltes.</strong><br />
                                        • <strong>🧪 Preparador:</strong> Se asigna a cargas con proceso de Preparado/Dispersión<br />
                                        • <strong>⚙️ Molienda:</strong> Se asigna a cargas con proceso de Molienda<br />
                                        • <strong>✅ Terminado/Igualado:</strong> Se asigna a cargas con etapa final (Igualación/Terminado/Ajuste)
                                    </p>
                                    <div className="op-table-wrapper">
                                        <table className="op-table">
                                            <thead>
                                                <tr>
                                                    <th>Nombre (Editable)</th>
                                                    <th>Puesto</th>
                                                    <th>Área</th>
                                                    <th>Estado</th>
                                                    <th className="txt-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {otrosOperarios.filter(op => op.area === "esmaltes").map((op) => {
                                                    const vacacionActiva = estaEnVacaciones(op.id);
                                                    return (
                                                        <tr key={op.id} className={vacacionActiva ? 'en-vacaciones' : ''}>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <input className="op-input-edit" value={op.nombre}
                                                                        onChange={(e) => editarOtroOperario(op.id, "nombre", e.target.value)}
                                                                        placeholder="Nombre del operario..." style={{ flex: 1 }} />
                                                                    {vacacionActiva && <span className="vacation-badge">🌴 VACACIONES</span>}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <select className="op-select-custom" value={op.puesto}
                                                                    onChange={(e) => editarOtroOperario(op.id, "puesto", e.target.value)}
                                                                    style={{ background: '#1a1a2e', color: '#e0e0e0', border: '1px solid rgba(192,0,255,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', width: '100%' }}>
                                                                    {puestosEsmaltes.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
                                                                </select>
                                                            </td>
                                                            <td><span className="op-puesto-tag esmalte">Esmaltes</span></td>
                                                            <td>
                                                                <button className={`status-badge ${op.activo ? 'active' : 'inactive'}`}
                                                                    style={{ fontSize: '12px', padding: '3px 10px' }}>
                                                                    {op.activo ? '✓ Activo' : '✗ Inactivo'}
                                                                </button>
                                                            </td>
                                                            <td className="txt-center">
                                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                    <button className="op-action-btn vacation" onClick={() => abrirModalVacaciones(op)}>🌴</button>
                                                                    <button className="op-action-btn delete" onClick={() => eliminarOtroOperario(op.id)}>🗑️</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="op-add-operario">
                                        <input type="text" id="nuevoNombreEsmalte" placeholder="Nuevo operario..." style={{ flex: 1 }} />
                                        <select id="nuevoPuestoEsmalte" className="op-select-custom"
                                            style={{ background: '#1a1a2e', color: '#e0e0e0', border: '1px solid rgba(192,0,255,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', width: '200px' }}>
                                            <option value="">Seleccionar puesto...</option>
                                            {puestosEsmaltes.map((p) => <option key={p.valor} value={p.valor}>{p.label}</option>)}
                                        </select>
                                        <button onClick={() => {
                                            const nombre = document.getElementById('nuevoNombreEsmalte');
                                            const puesto = document.getElementById('nuevoPuestoEsmalte');
                                            if (nombre.value && puesto.value) {
                                                agregarOtroOperario(nombre.value, puesto.value, "esmaltes");
                                                nombre.value = '';
                                                puesto.value = '';
                                            } else if (!nombre.value) {
                                                mostrarMensaje("❌ Ingresa un nombre", "error");
                                            } else if (!puesto.value) {
                                                mostrarMensaje("❌ Selecciona un puesto", "error");
                                            }
                                        }}>+ Agregar</button>
                                    </div>
                                    <div className="info-box2" style={{ marginTop: '16px' }}>
                                        <strong>✨ Los cambios se aplican automáticamente:</strong> 
                                        Al editar estos nombres y puestos, las cargas de esmaltes se asignarán con los nuevos nombres según el puesto.
                                        <br /><br />
                                        <strong>📋 Clasificación por puesto (SOLO 3):</strong>
                                        <br />
                                        • <strong>🧪 Preparador:</strong> Cargas con proceso de Preparado/Dispersión
                                        <br />
                                        • <strong>⚙️ Molienda:</strong> Cargas con proceso de Molienda
                                        <br />
                                        • <strong>✅ Terminado/Igualado:</strong> Cargas con etapa final (Igualación/Terminado/Ajuste)
                                    </div>
                                </div>
                            ) : (
                                renderEnvasadoresEsmaltes()
                            )
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}