import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buscarProducto, crearProducto, actualizarProducto } from "../services/productoService";
import { familiaService } from "../services/familiaService";
import { obtenerEnvasados } from "../services/envasadoService";
import "../styles/codigos.css";

export default function CodigosScreen() {
    const navigate = useNavigate();

    // Estado para la pestaña activa en la barra lateral
    const [seccionActiva, setSeccionActiva] = useState("vinilicas");

    // Estado para el submenú de Vinílicas
    const [subSeccionVinilicas, setSubSeccionVinilicas] = useState("excluidos");

    // Estados para Códigos Excluidos (Vinílicas)
    const [codigos, setCodigos] = useState([]);
    const [nuevoCodigo, setNuevoCodigo] = useState("");
    const [editandoId, setEditandoId] = useState(null);
    const [editandoValor, setEditandoValor] = useState("");
    const [filtro, setFiltro] = useState("");
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    const [loading, setLoading] = useState(false);

    // Estados para Envasados disponibles
    const [envasadosDisponibles, setEnvasadosDisponibles] = useState([]);
    const [cargandoEnvasados, setCargandoEnvasados] = useState(false);

    // Estados para Familias
    const [familias, setFamilias] = useState([]);
    const [cargandoFamilias, setCargandoFamilias] = useState(false);

    // Estados para PRODUCTOS (nuevos productos)
    const [productos, setProductos] = useState(() => {
        const guardados = localStorage.getItem("productos_vinilica");
        return guardados ? JSON.parse(guardados) : [];
    });

    // Estado para saber si estamos editando un producto de API
    const [modoEdicionAPI, setModoEdicionAPI] = useState(false);
    const [productoEditandoId, setProductoEditandoId] = useState(null);
    const [productoOriginal, setProductoOriginal] = useState(null);

    // Estado del formulario de producto (unificado)
    const [formProducto, setFormProducto] = useState({
        codigo: "",
        descripcion: "",
        poderCubriente: "",
        tipoPinturaId: 2,
        familiaId: null,
        color: "BLANCO",
        envasadosProducto: [],
        envasadosSeleccionados: []
    });

    // Estado para nuevo envase (modo edición API)
    const [nuevoEnvase, setNuevoEnvase] = useState({ litros: "", articulo: "" });
    const [mostrarFormNuevoEnvase, setMostrarFormNuevoEnvase] = useState(false);

    const [editandoProducto, setEditandoProducto] = useState(null);
    const [filtroProductos, setFiltroProductos] = useState("");
    const [codigoBusqueda, setCodigoBusqueda] = useState("");

    // Estados para Códigos Especiales (Esmaltes)
    const [codigosEspeciales, setCodigosEspeciales] = useState(() => {
        const guardados = localStorage.getItem("codigos_especiales");
        return guardados ? JSON.parse(guardados) : [
            { id: 1, codigo: "ESP-001", descripcion: "Pedido Especial Cliente A", activo: true },
            { id: 2, codigo: "ESP-002", descripcion: "Muestra Especial", activo: true },
            { id: 3, codigo: "ESP-003", descripcion: "Urgente Producción", activo: true },
        ];
    });

    const [nuevoEspecial, setNuevoEspecial] = useState({ codigo: "", descripcion: "" });
    const [editandoEspecial, setEditandoEspecial] = useState(null);
    const [filtroEspeciales, setFiltroEspeciales] = useState("");

    // ========== CÓDIGOS EXCLUIDOS (VINÍLICAS) ==========
    useEffect(() => {
        const cargarCodigos = () => {
            const guardados = localStorage.getItem("codigos_excluidos");
            if (guardados) {
                setCodigos(JSON.parse(guardados));
            } else {
                const codigosDefault = [
                    "890", "912", "908", "100", "852", "852IF", "802IF", "803", "803IF",
                    "812", "812IF", "813", "813IF", "820", "821", "822", "823", "824",
                    "825", "826", "853", "853IF", "854IF", "862", "862IF", "863", "863IF",
                    "870", "870IF", "900", "902", "904", "906", "910", "914", "916", "918",
                    "920", "922", "924"
                ];
                setCodigos(codigosDefault);
                localStorage.setItem("codigos_excluidos", JSON.stringify(codigosDefault));
            }
        };
        cargarCodigos();
    }, []);

    // ========== CARGAR ENVASADOS DISPONIBLES ==========
    useEffect(() => {
        const cargarEnvasados = async () => {
            setCargandoEnvasados(true);
            try {
                const data = await obtenerEnvasados();
                setEnvasadosDisponibles(data);
                console.log("📦 Envasados disponibles:", data);
            } catch (error) {
                console.error("Error cargando envasados:", error);
            } finally {
                setCargandoEnvasados(false);
            }
        };
        cargarEnvasados();
    }, []);

    // ========== CARGAR FAMILIAS SEGÚN SECCIÓN ACTIVA ==========
    useEffect(() => {
        const cargarFamilias = async () => {
            setCargandoFamilias(true);
            try {
                let tipo = "";
                if (seccionActiva === "vinilicas") {
                    tipo = "vinilica";
                } else if (seccionActiva === "esmaltes") {
                    tipo = "esmalte";
                }
                if (tipo) {
                    const data = await familiaService.getFamiliasPorTipo(tipo);
                    setFamilias(data);
                }
            } finally {
                setCargandoFamilias(false);
            }
        };
        cargarFamilias();
    }, [seccionActiva]);

    useEffect(() => {
        if (codigos.length > 0) {
            localStorage.setItem("codigos_excluidos", JSON.stringify(codigos));
            window.dispatchEvent(new CustomEvent("codigosExcluidosUpdated", {
                detail: { codigos }
            }));
        }
    }, [codigos]);

    // ========== PRODUCTOS (VINÍLICAS - LOCAL) ==========
    useEffect(() => {
        if (productos.length > 0) {
            localStorage.setItem("productos_vinilica", JSON.stringify(productos));
        }
    }, [productos]);

    // ========== CÓDIGOS ESPECIALES (ESMALTES) ==========
    useEffect(() => {
        if (codigosEspeciales.length > 0) {
            localStorage.setItem("codigos_especiales", JSON.stringify(codigosEspeciales));
            window.dispatchEvent(new CustomEvent("codigosEspecialesUpdated", {
                detail: { codigosEspeciales }
            }));
        }
    }, [codigosEspeciales]);

    const mostrarMensaje = (texto, tipo = "success") => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    };

    // Función para formatear litros a string de 3 dígitos
    const formatearLitros = (litros) => {
        if (litros === 0.5) return "050";
        if (litros === 0.25) return "025";
        if (litros === 0.75) return "075";
        const str = litros.toString();
        return str.padStart(3, '0');
    };

    // Función para generar artículo
    const generarArticulo = (litros, codigoProducto) => {
        const litrosStr = formatearLitros(litros);
        return `${litrosStr}-${codigoProducto}`;
    };

    // ========== FUNCIÓN PARA BUSCAR PRODUCTO EN API Y CARGAR EN FORMULARIO ==========
    const buscarYCargarProducto = async () => {
        if (!codigoBusqueda.trim()) {
            mostrarMensaje("Ingresa un código para buscar", "error");
            return;
        }

        setLoading(true);
        console.log("🔍 Buscando producto en API:", codigoBusqueda);

        try {
            const producto = await buscarProducto(codigoBusqueda.trim());
            console.log("✅ Producto encontrado:", producto);

            setProductoEditandoId(producto.codigo);
            setProductoOriginal(producto);

            const envasadosAPI = producto.envasados || [];
            const envasadosFormateados = envasadosAPI.map(env => {
                const articuloParts = env.articulo.split('-');
                let litros = parseInt(articuloParts[0]);
                if (litros === 500) litros = 0.5;
                if (litros === 250) litros = 0.25;
                if (litros === 750) litros = 0.75;
                return {
                    litros: litros,
                    cantidad: 1,
                    articulo: env.articulo,
                    id: env.id
                };
            }).sort((a, b) => a.litros - b.litros);

            setFormProducto({
                codigo: producto.codigo,
                descripcion: producto.descripcion,
                poderCubriente: producto.poderCubriente || "",
                tipoPinturaId: producto.tipoPinturaId || 2,
                familiaId: producto.familiaId,
                color: producto.color || "BLANCO",
                envasadosProducto: envasadosFormateados,
                envasadosSeleccionados: []
            });

            setModoEdicionAPI(true);
            setCodigoBusqueda("");
            setMostrarFormNuevoEnvase(false);

            mostrarMensaje(`Producto "${producto.codigo}" cargado para editar`, "success");
        } catch (error) {
            console.error("❌ Error buscando producto:", error);
            mostrarMensaje(`No se encontró el producto "${codigoBusqueda}"`, "error");
        } finally {
            setLoading(false);
        }
    };

    // ========== AGREGAR NUEVO ENVASE ==========
    const agregarEnvase = () => {
        if (!nuevoEnvase.litros || nuevoEnvase.litros <= 0) {
            mostrarMensaje("Ingresa una cantidad de litros válida", "error");
            return;
        }

        const litros = parseFloat(nuevoEnvase.litros);
        const articulo = nuevoEnvase.articulo.trim() || generarArticulo(litros, formProducto.codigo);

        const yaExiste = [...formProducto.envasadosProducto, ...formProducto.envasadosSeleccionados]
            .some(e => e.litros === litros);
        
        if (yaExiste) {
            mostrarMensaje(`Ya existe un envase de ${litros} litros`, "error");
            return;
        }

        const envasadoEncontrado = envasadosDisponibles.find(e => e.id === litros);
        if (!envasadoEncontrado) {
            mostrarMensaje(`No existe un envase de ${litros} litros en el catálogo`, "error");
            return;
        }

        const nuevoEnvaseObj = {
            litros: litros,
            cantidad: 1,
            articulo: articulo,
            id: envasadoEncontrado.id,
            esNuevo: true
        };

        setFormProducto({
            ...formProducto,
            envasadosSeleccionados: [...formProducto.envasadosSeleccionados, nuevoEnvaseObj]
        });
        setNuevoEnvase({ litros: "", articulo: "" });
        setMostrarFormNuevoEnvase(false);
        mostrarMensaje(`Envase de ${litros} litros agregado`, "success");
    };

    // ========== ELIMINAR ENVASE EXISTENTE ==========
    const eliminarEnvaseExistente = (litros) => {
        if (window.confirm(`¿Eliminar el envase de ${litros} litros?`)) {
            const nuevosEnvasadosProducto = formProducto.envasadosProducto.filter(e => e.litros !== litros);
            setFormProducto({ ...formProducto, envasadosProducto: nuevosEnvasadosProducto });
            mostrarMensaje(`Envase de ${litros} litros eliminado del producto`, "success");
        }
    };

    // ========== ELIMINAR ENVASE SELECCIONADO ==========
    const eliminarEnvaseSeleccionado = (litros) => {
        const nuevosSeleccionados = formProducto.envasadosSeleccionados.filter(e => e.litros !== litros);
        setFormProducto({ ...formProducto, envasadosSeleccionados: nuevosSeleccionados });
        mostrarMensaje(`Envase de ${litros} litros removido`, "success");
    };

    // ========== GUARDAR PRODUCTO EN API ==========
    const guardarProductoEnAPI = async () => {
        if (!formProducto.codigo.trim()) {
            mostrarMensaje("Ingresa un código de producto válido", "error");
            return;
        }
        if (!formProducto.descripcion.trim()) {
            mostrarMensaje("Ingresa una descripción del producto", "error");
            return;
        }

        setLoading(true);

        try {
            const codigo = formProducto.codigo.trim().toUpperCase();
            const familiaId = formProducto.familiaId;

            const todosLosEnvasados = [...formProducto.envasadosProducto, ...formProducto.envasadosSeleccionados];

            if (todosLosEnvasados.length === 0) {
                mostrarMensaje("El producto debe tener al menos un envase", "error");
                setLoading(false);
                return;
            }

            let poder = formProducto.poderCubriente;
            if (poder === "" || poder === undefined) {
                poder = null;
            } else {
                poder = parseInt(poder);
                if (isNaN(poder)) poder = null;
            }

            const envasadosParaAPI = todosLosEnvasados.map(envase => ({
                envasadoId: envase.id,
                articulo: envase.articulo || `${String(envase.id).padStart(3, '0')}-${codigo}`,
                descripcion: `${formProducto.descripcion} BOTE ${envase.litros} L`
            }));

            const productoParaAPI = {
                codigo: codigo,
                descripcion: formProducto.descripcion,
                poderCubriente: poder,
                tipoPinturaId: 2,
                familiaId: familiaId,
                color: formProducto.color,
                envasados: envasadosParaAPI
            };

            let resultado;
            if (modoEdicionAPI && productoEditandoId) {
                resultado = await actualizarProducto(codigo, productoParaAPI);
                mostrarMensaje(`✅ Producto "${codigo}" actualizado`, "success");
            } else {
                resultado = await crearProducto(productoParaAPI);
                mostrarMensaje(`✅ Producto "${codigo}" creado en la API`, "success");
            }

            limpiarFormulario();
        } catch (error) {
            console.error("❌ Error guardando producto:", error);
            const mensajeError = error.response?.data?.error || error.response?.data?.message || error.message;
            mostrarMensaje(`❌ ${mensajeError}`, "error");
        } finally {
            setLoading(false);
        }
    };

    // ========== LIMPIAR FORMULARIO ==========
    const limpiarFormulario = () => {
        setFormProducto({
            codigo: "",
            descripcion: "",
            poderCubriente: "",
            tipoPinturaId: 2,
            familiaId: null,
            color: "BLANCO",
            envasadosProducto: [],
            envasadosSeleccionados: []
        });
        setModoEdicionAPI(false);
        setProductoEditandoId(null);
        setProductoOriginal(null);
        setMostrarFormNuevoEnvase(false);
        setNuevoEnvase({ litros: "", articulo: "" });
    };

    // ========== CRUD CÓDIGOS EXCLUIDOS ==========
    const agregarCodigo = () => {
        if (!nuevoCodigo.trim()) {
            mostrarMensaje("Ingresa un código válido", "error");
            return;
        }

        const codigoUpper = nuevoCodigo.trim().toUpperCase();

        if (codigos.includes(codigoUpper)) {
            mostrarMensaje(`El código "${codigoUpper}" ya existe`, "error");
            return;
        }

        setCodigos([...codigos, codigoUpper]);
        setNuevoCodigo("");
        mostrarMensaje(`Código "${codigoUpper}" agregado correctamente`);
    };

    const eliminarCodigo = (codigo) => {
        if (window.confirm(`¿Eliminar el código "${codigo}" de la lista de excluidos?`)) {
            setCodigos(codigos.filter(c => c !== codigo));
            mostrarMensaje(`Código "${codigo}" eliminado`);
        }
    };

    const iniciarEdicion = (codigo) => {
        setEditandoId(codigo);
        setEditandoValor(codigo);
    };

    const guardarEdicion = () => {
        if (!editandoValor.trim()) {
            mostrarMensaje("El código no puede estar vacío", "error");
            return;
        }

        const nuevoValor = editandoValor.trim().toUpperCase();
        const indice = codigos.indexOf(editandoId);

        if (indice !== -1) {
            if (codigos.includes(nuevoValor) && nuevoValor !== editandoId) {
                mostrarMensaje(`El código "${nuevoValor}" ya existe`, "error");
                return;
            }

            const nuevosCodigos = [...codigos];
            nuevosCodigos[indice] = nuevoValor;
            setCodigos(nuevosCodigos);
            mostrarMensaje(`Código actualizado a "${nuevoValor}"`);
        }

        setEditandoId(null);
        setEditandoValor("");
    };

    const cancelarEdicion = () => {
        setEditandoId(null);
        setEditandoValor("");
    };

    const codigosFiltrados = codigos.filter(codigo =>
        codigo.toLowerCase().includes(filtro.toLowerCase())
    );

    const iniciarEdicionProducto = (producto) => {
        setEditandoProducto({ ...producto });
    };

    const guardarEdicionProducto = () => {
        if (!editandoProducto.codigo.trim()) {
            mostrarMensaje("El código no puede estar vacío", "error");
            return;
        }

        const codigoUpper = editandoProducto.codigo.trim().toUpperCase();

        if (productos.some(p => p.codigo === codigoUpper && p.id !== editandoProducto.id)) {
            mostrarMensaje(`El producto "${codigoUpper}" ya existe`, "error");
            return;
        }

        setProductos(productos.map(p =>
            p.id === editandoProducto.id
                ? { ...p, codigo: codigoUpper, descripcion: editandoProducto.descripcion, envasados: editandoProducto.envasados }
                : p
        ));
        setEditandoProducto(null);
        mostrarMensaje(`Producto actualizado correctamente`);
    };

    const productosFiltrados = productos.filter(producto =>
        producto.codigo.toLowerCase().includes(filtroProductos.toLowerCase()) ||
        producto.descripcion.toLowerCase().includes(filtroProductos.toLowerCase())
    );

    // ========== CRUD CÓDIGOS ESPECIALES ==========
    const agregarEspecial = () => {
        if (!nuevoEspecial.codigo.trim()) {
            mostrarMensaje("Ingresa un código especial válido", "error");
            return;
        }

        const codigoUpper = nuevoEspecial.codigo.trim().toUpperCase();

        if (codigosEspeciales.some(c => c.codigo === codigoUpper)) {
            mostrarMensaje(`El código especial "${codigoUpper}" ya existe`, "error");
            return;
        }

        const nuevoId = Math.max(...codigosEspeciales.map(c => c.id), 0) + 1;
        setCodigosEspeciales([...codigosEspeciales, {
            id: nuevoId,
            codigo: codigoUpper,
            descripcion: nuevoEspecial.descripcion || "Sin descripción",
            activo: true
        }]);
        setNuevoEspecial({ codigo: "", descripcion: "" });
        mostrarMensaje(`Código especial "${codigoUpper}" agregado correctamente`);
    };

    const eliminarEspecial = (id) => {
        const especial = codigosEspeciales.find(c => c.id === id);
        if (window.confirm(`¿Eliminar el código especial "${especial.codigo}"?`)) {
            setCodigosEspeciales(codigosEspeciales.filter(c => c.id !== id));
            mostrarMensaje(`Código especial "${especial.codigo}" eliminado`);
        }
    };

    const iniciarEdicionEspecial = (especial) => {
        setEditandoEspecial({ ...especial });
    };

    const guardarEdicionEspecial = () => {
        if (!editandoEspecial.codigo.trim()) {
            mostrarMensaje("El código no puede estar vacío", "error");
            return;
        }

        const codigoUpper = editandoEspecial.codigo.trim().toUpperCase();

        if (codigosEspeciales.some(c => c.codigo === codigoUpper && c.id !== editandoEspecial.id)) {
            mostrarMensaje(`El código especial "${codigoUpper}" ya existe`, "error");
            return;
        }

        setCodigosEspeciales(codigosEspeciales.map(c =>
            c.id === editandoEspecial.id
                ? { ...c, codigo: codigoUpper, descripcion: editandoEspecial.descripcion }
                : c
        ));
        setEditandoEspecial(null);
        mostrarMensaje(`Código especial actualizado correctamente`);
    };

    const cancelarEdicionEspecial = () => {
        setEditandoEspecial(null);
    };

    const codigosEspecialesFiltrados = codigosEspeciales.filter(esp =>
        esp.codigo.toLowerCase().includes(filtroEspeciales.toLowerCase()) ||
        esp.descripcion.toLowerCase().includes(filtroEspeciales.toLowerCase())
    );

    const toggleActivoEspecial = (id) => {
        setCodigosEspeciales(codigosEspeciales.map(c =>
            c.id === id ? { ...c, activo: !c.activo } : c
        ));
        const especial = codigosEspeciales.find(c => c.id === id);
        mostrarMensaje(`Código especial "${especial.codigo}" ${especial.activo ? 'desactivado' : 'activado'}`);
    };

    // Función para obtener el título según la subsección
    const getTituloVinilicas = () => {
        switch (subSeccionVinilicas) {
            case "productos": return "📦 Gestión de Productos";
            case "excluidos": return "🚫 Códigos Excluidos";
            default: return "Gestión Vinílicas";
        }
    };

    const getDescripcionVinilicas = () => {
        switch (subSeccionVinilicas) {
            case "productos": return "Busca productos de la API, edita envasados y guarda cambios localmente";
            case "excluidos": return "Administra los códigos que NO deben aparecer en producción";
            default: return "";
        }
    };

    // ========== RENDERIZADO PRINCIPAL ==========
    const renderContenido = () => {
        if (seccionActiva === "vinilicas") {
            if (subSeccionVinilicas === "excluidos") {
                return (
                    <>
                        <div className="cod-card">
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="Buscar código excluido..."
                                    value={filtro}
                                    onChange={(e) => setFiltro(e.target.value)}
                                />
                                {filtro && (
                                    <button onClick={() => setFiltro("")} className="clear-filter">
                                        ✖
                                    </button>
                                )}
                            </div>

                            <div className="add-codigo-bar">
                                <input
                                    type="text"
                                    placeholder="Nuevo código excluido (ej: 999 o 999IF)..."
                                    value={nuevoCodigo}
                                    onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                                    onKeyPress={(e) => e.key === 'Enter' && agregarCodigo()}
                                />
                                <button onClick={agregarCodigo}>
                                    + Agregar Código
                                </button>
                            </div>
                        </div>

                        <div className="cod-card table-card">
                            <div className="card-header-flex">
                                <h3 className="cod-card-title">📋 CÓDIGOS EXCLUIDOS</h3>
                                <span className="count-badge">{codigosFiltrados.length} códigos</span>
                            </div>

                            <div className="cod-table-wrapper">
                                <table className="cod-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Código</th>
                                            <th>Tipo</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codigosFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="empty-state">
                                                    {filtro ? "No se encontraron códigos" : "No hay códigos excluidos"}
                                                </td>
                                            </tr>
                                        ) : (
                                            codigosFiltrados.map((codigo, index) => (
                                                <tr key={codigo}>
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        {editandoId === codigo ? (
                                                            <input
                                                                type="text"
                                                                className="edit-input"
                                                                value={editandoValor}
                                                                onChange={(e) => setEditandoValor(e.target.value.toUpperCase())}
                                                                onKeyPress={(e) => e.key === 'Enter' && guardarEdicion()}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <span className="codigo-value">{codigo}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {codigo.includes('IF') ? (
                                                            <span className="badge-if">⚠️ Con IF</span>
                                                        ) : (
                                                            <span className="badge-normal">✓ Normal</span>
                                                        )}
                                                    </td>
                                                    <td className="actions-cell">
                                                        {editandoId === codigo ? (
                                                            <>
                                                                <button className="action-btn save" onClick={guardarEdicion}>💾</button>
                                                                <button className="action-btn cancel" onClick={cancelarEdicion}>✖</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button className="action-btn edit" onClick={() => iniciarEdicion(codigo)}>✏️</button>
                                                                <button className="action-btn delete" onClick={() => eliminarCodigo(codigo)}>🗑️</button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="info-box">
                                <strong>ℹ️ Nota:</strong> Los códigos excluidos no aparecerán en la búsqueda de producción.
                                Los códigos con <strong>"IF"</strong> son versiones especiales.
                            </div>
                        </div>
                    </>
                );
            } else if (subSeccionVinilicas === "productos") {
                return (
                    <>
                        {/* SEARCH BOX PARA BUSCAR EN API */}
                        <div className="cod-card">
                            <div className="search-box-wrapper">
                                <div className="search-box-with-button">
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar producto en API por código (ej: 500)..."
                                        value={codigoBusqueda}
                                        onChange={(e) => setCodigoBusqueda(e.target.value.toUpperCase())}
                                        onKeyPress={(e) => e.key === 'Enter' && buscarYCargarProducto()}
                                    />
                                    <button
                                        className="btn-buscar-producto"
                                        onClick={buscarYCargarProducto}
                                        disabled={loading}
                                    >
                                        {loading ? "⏳ Buscando..." : "🔍 Buscar y Cargar"}
                                    </button>
                                    {modoEdicionAPI && (
                                        <button
                                            className="btn-limpiar-formulario"
                                            onClick={limpiarFormulario}
                                        >
                                            ✖ Limpiar
                                        </button>
                                    )}
                                </div>
                                <div className="busqueda-info">
                                    <span className="busqueda-hint">💡 Busca productos en la API. Podrás editar envasados y guardar cambios localmente</span>
                                </div>
                            </div>
                        </div>

                        {/* FORMULARIO UNIFICADO DE PRODUCTO */}
                        <div className="cod-card producto-form-card">
                            <div className="form-header">
                                <div className="form-header-icon">
                                    {modoEdicionAPI ? "✏️" : "✨"}
                                </div>
                                <div>
                                    <h3 className="form-title">
                                        {modoEdicionAPI ? `Editando Producto API: ${formProducto.codigo}` : "Crear Nuevo Producto"}
                                    </h3>
                                    <p className="form-subtitle">
                                        {modoEdicionAPI
                                            ? "Modifica los envasados y guarda los cambios en la API."
                                            : "Completa los datos del producto y sus envases - Se guardará en la API"}
                                    </p>
                                </div>
                            </div>

                            <div className="add-producto-form">
                                <div className="form-grid-2">
                                    <div className="input-group">
                                        <label className="input-label">
                                            <span className="label-icon">🔖</span>
                                            Código del producto
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: PROD-001"
                                            value={formProducto.codigo}
                                            onChange={(e) => setFormProducto({ ...formProducto, codigo: e.target.value.toUpperCase() })}
                                            disabled={modoEdicionAPI}
                                        />
                                        <span className="input-hint">
                                            {modoEdicionAPI ? "El código no se puede modificar" : "Código único identificador"}
                                        </span>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">
                                            <span className="label-icon">📝</span>
                                            Descripción
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Pintura Vinílica Premium"
                                            value={formProducto.descripcion}
                                            onChange={(e) => setFormProducto({ ...formProducto, descripcion: e.target.value })}
                                        />
                                        <span className="input-hint">
                                            {modoEdicionAPI ? "Puedes modificar la descripción" : "Nombre o descripción del producto"}
                                        </span>
                                    </div>
                                </div>

                                <div className="form-grid-2" style={{ marginTop: '16px' }}>
                                    <div className="input-group">
                                        <label className="input-label">
                                            <span className="label-icon">💪</span>
                                            Poder Cubriente
                                        </label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Ej: 36"
                                            value={formProducto.poderCubriente}
                                            onChange={(e) => setFormProducto({ ...formProducto, poderCubriente: e.target.value })}
                                        />
                                        <span className="input-hint">
                                            Poder cubriente del producto (m² por litro)
                                        </span>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">
                                            <span className="label-icon">🏷️</span>
                                            Familia
                                        </label>
                                        <select
                                            className="form-input select-familia"
                                            value={formProducto.familiaId || ""}
                                            onChange={(e) => setFormProducto({ ...formProducto, familiaId: e.target.value ? parseInt(e.target.value) : null })}
                                            disabled={cargandoFamilias}
                                        >
                                            <option value="">-- Seleccionar familia --</option>
                                            {familias.map(familia => (
                                                <option key={familia.id} value={familia.id}>
                                                    {familia.nombre}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="input-hint">
                                            {cargandoFamilias ? "Cargando familias..." : "Familia a la que pertenece el producto"}
                                        </span>
                                    </div>
                                </div>

                                {/* Campo COLOR */}
                                <div className="form-grid-2" style={{ marginTop: '16px' }}>
                                    <div className="input-group">
                                        <label className="input-label">
                                            <span className="label-icon">🎨</span>
                                            Color
                                        </label>
                                        <select
                                            className="form-input"
                                            value={formProducto.color}
                                            onChange={(e) => setFormProducto({ ...formProducto, color: e.target.value })}
                                        >
                                            <option value="BLANCO">BLANCO</option>
                                            <option value="TRANSPARENTE">TRANSPARENTE</option>
                                            <option value="NEGRO">NEGRO</option>
                                            <option value="ROJO">ROJO</option>
                                            <option value="AZUL">AZUL</option>
                                            <option value="VERDE">VERDE</option>
                                            <option value="AMARILLO">AMARILLO</option>
                                        </select>
                                        <span className="input-hint">Color del producto</span>
                                    </div>
                                </div>

                                {/* ENVASADOS EXISTENTES DEL PRODUCTO */}
                                {modoEdicionAPI && formProducto.envasadosProducto.length > 0 && (
                                    <div className="envasados-section">
                                        <div className="envasados-header">
                                            <span className="envasados-icon">📦</span>
                                            <h4>Envasados del Producto</h4>
                                            <span className="envasados-badge">
                                                {formProducto.envasadosProducto.length} envases
                                            </span>
                                        </div>
                                        <div className="envasados-grid-modern">
                                            {formProducto.envasadosProducto.map((env, idx) => (
                                                <div key={idx} className="envasado-card">
                                                    <div className="envasado-litros">{env.litros} <span>L</span></div>
                                                    {env.articulo && <div className="envasado-articulo">{env.articulo}</div>}
                                                    <div className="envasado-acciones-top">
                                                        <button
                                                            className="btn-eliminar-envase-icon"
                                                            onClick={() => eliminarEnvaseExistente(env.litros)}
                                                            title="Eliminar envase"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ENVASADOS SELECCIONABLES PARA AGREGAR */}
                                <div className="envasados-section">
                                    <div className="envasados-header">
                                        <span className="envasados-icon">📦</span>
                                        <h4>Agregar Envasados</h4>
                                        <span className="envasados-badge">
                                            {formProducto.envasadosSeleccionados.length} seleccionados
                                        </span>
                                        <button
                                            className="btn-agregar-envase"
                                            onClick={() => setMostrarFormNuevoEnvase(!mostrarFormNuevoEnvase)}
                                        >
                                            + Agregar Envase
                                        </button>
                                    </div>

                                    {mostrarFormNuevoEnvase && (
                                        <div className="nuevo-envase-form">
                                            <div className="nuevo-envase-inputs">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Litros (ej: 0.5, 1, 4, 19)"
                                                    value={nuevoEnvase.litros}
                                                    onChange={(e) => setNuevoEnvase({ ...nuevoEnvase, litros: e.target.value })}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Artículo (ej: 001-500) - opcional"
                                                    value={nuevoEnvase.articulo}
                                                    onChange={(e) => setNuevoEnvase({ ...nuevoEnvase, articulo: e.target.value.toUpperCase() })}
                                                />
                                                <button onClick={agregarEnvase} className="btn-confirmar">
                                                    ✓ Agregar
                                                </button>
                                                <button onClick={() => setMostrarFormNuevoEnvase(false)} className="btn-cancelar-mini">
                                                    ✖
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="envasados-grid-modern">
                                        {envasadosDisponibles.map((envase) => {
                                            const yaTiene = formProducto.envasadosProducto.some(e => e.id === envase.id);
                                            const estaSeleccionado = formProducto.envasadosSeleccionados.some(e => e.id === envase.id);
                                            
                                            if (yaTiene) return null;
                                            
                                            return (
                                                <div
                                                    key={envase.id}
                                                    className={`envasado-card ${estaSeleccionado ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        let nuevosSeleccionados;
                                                        if (estaSeleccionado) {
                                                            nuevosSeleccionados = formProducto.envasadosSeleccionados.filter(e => e.id !== envase.id);
                                                        } else {
                                                            const nuevoEnvaseObj = {
                                                                id: envase.id,
                                                                litros: envase.id,
                                                                cantidad: 1,
                                                                articulo: `${String(envase.id).padStart(3, '0')}-${formProducto.codigo || 'XXX'}`,
                                                            };
                                                            nuevosSeleccionados = [...formProducto.envasadosSeleccionados, nuevoEnvaseObj];
                                                        }
                                                        setFormProducto({ ...formProducto, envasadosSeleccionados: nuevosSeleccionados });
                                                    }}
                                                >
                                                    <div className="envasado-litros">{envase.id} <span>L</span></div>
                                                    {estaSeleccionado && <div className="envasado-checkbox">✓</div>}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {formProducto.envasadosSeleccionados.length > 0 && (
                                        <div className="envasados-seleccionados-list">
                                            <h4>Envasados a agregar:</h4>
                                            <div className="envasados-grid-modern">
                                                {formProducto.envasadosSeleccionados.map((env, idx) => (
                                                    <div key={idx} className="envasado-card">
                                                        <div className="envasado-litros">{env.litros} <span>L</span></div>
                                                        <div className="envasado-acciones-top">
                                                            <button
                                                                className="btn-eliminar-envase-icon"
                                                                onClick={() => eliminarEnvaseSeleccionado(env.litros)}
                                                                title="Remover"
                                                            >
                                                                ✖
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={guardarProductoEnAPI}
                                    className="btn-submit-producto"
                                    disabled={loading}
                                >
                                    <span className="btn-icon">{loading ? "⏳" : (modoEdicionAPI ? "💾" : "➕")}</span>
                                    {loading ? "Guardando..." : (modoEdicionAPI ? "Actualizar en API" : "Crear Producto en API")}
                                    {!loading && !modoEdicionAPI && <span className="btn-arrow">→</span>}
                                </button>
                            </div>
                        </div>
                    </>
                );
            }
        } else if (seccionActiva === "esmaltes") {
            return (
                <>
                    <div className="cod-card">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Buscar código especial..."
                                value={filtroEspeciales}
                                onChange={(e) => setFiltroEspeciales(e.target.value)}
                            />
                            {filtroEspeciales && (
                                <button onClick={() => setFiltroEspeciales("")} className="clear-filter">
                                    ✖
                                </button>
                            )}
                        </div>

                        <div className="add-especial-bar">
                            <input
                                type="text"
                                placeholder="Código especial (ej: ESP-001)..."
                                value={nuevoEspecial.codigo}
                                onChange={(e) => setNuevoEspecial({ ...nuevoEspecial, codigo: e.target.value.toUpperCase() })}
                            />
                            <input
                                type="text"
                                placeholder="Descripción..."
                                value={nuevoEspecial.descripcion}
                                onChange={(e) => setNuevoEspecial({ ...nuevoEspecial, descripcion: e.target.value })}
                            />
                            <button onClick={agregarEspecial}>
                                + Agregar Especial
                            </button>
                        </div>
                    </div>

                    <div className="cod-card table-card">
                        <div className="card-header-flex">
                            <h3 className="cod-card-title">⭐ CÓDIGOS ESPECIALES</h3>
                            <span className="count-badge">{codigosEspecialesFiltrados.length} especiales</span>
                        </div>

                        <div className="cod-table-wrapper">
                            <table className="cod-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Código</th>
                                        <th>Descripción</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codigosEspecialesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state">
                                                {filtroEspeciales ? "No se encontraron códigos especiales" : "No hay códigos especiales registrados"}
                                            </td>
                                        </tr>
                                    ) : (
                                        codigosEspecialesFiltrados.map((especial, index) => (
                                            <tr key={especial.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    {editandoEspecial?.id === especial.id ? (
                                                        <input
                                                            type="text"
                                                            className="edit-input"
                                                            value={editandoEspecial.codigo}
                                                            onChange={(e) => setEditandoEspecial({ ...editandoEspecial, codigo: e.target.value.toUpperCase() })}
                                                        />
                                                    ) : (
                                                        <span className="codigo-value">{especial.codigo}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {editandoEspecial?.id === especial.id ? (
                                                        <input
                                                            type="text"
                                                            className="edit-input-desc"
                                                            value={editandoEspecial.descripcion}
                                                            onChange={(e) => setEditandoEspecial({ ...editandoEspecial, descripcion: e.target.value })}
                                                        />
                                                    ) : (
                                                        <span>{especial.descripcion}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className={`status-badge ${especial.activo ? 'active' : 'inactive'}`}
                                                        onClick={() => toggleActivoEspecial(especial.id)}
                                                    >
                                                        {especial.activo ? '✓ Activo' : '✗ Inactivo'}
                                                    </button>
                                                </td>
                                                <td className="actions-cell">
                                                    {editandoEspecial?.id === especial.id ? (
                                                        <>
                                                            <button className="action-btn save" onClick={guardarEdicionEspecial}>💾</button>
                                                            <button className="action-btn cancel" onClick={cancelarEdicionEspecial}>✖</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="action-btn edit" onClick={() => iniciarEdicionEspecial(especial)}>✏️</button>
                                                            <button className="action-btn delete" onClick={() => eliminarEspecial(especial.id)}>🗑️</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="info-box">
                            <strong>ℹ️ Nota:</strong> Los códigos especiales son para pedidos únicos o urgentes en producción de Esmaltes.
                            Puedes activarlos/desactivarlos según sea necesario.
                        </div>
                    </div>
                </>
            );
        }
        return null;
    };

    return (
        <div className="cod-screen-container">
            <div className="cod-glass-panel">
                {mensaje.texto && (
                    <div className={`cod-toast ${mensaje.tipo}`}>
                        {mensaje.texto}
                    </div>
                )}

                {/* SIDEBAR */}
                <aside className="cod-sidebar">
                    <div className="cod-logo">
                        <span className="cod-dot"></span>
                        <h2>GESTIÓN DE CÓDIGOS</h2>
                    </div>

                    <nav className="cod-nav">
                        <div className="nav-label">SECCIONES</div>
                        <button
                            className={`cod-nav-btn ${seccionActiva === "vinilicas" ? "active" : ""}`}
                            onClick={() => setSeccionActiva("vinilicas")}
                        >
                            <span className="nav-icon">💧</span> Vinílicas
                        </button>
                        <button
                            className={`cod-nav-btn ${seccionActiva === "esmaltes" ? "active" : ""}`}
                            onClick={() => setSeccionActiva("esmaltes")}
                        >
                            <span className="nav-icon">✨</span> Esmaltes
                        </button>
                    </nav>

                    {seccionActiva === "vinilicas" && (
                        <>
                            <div className="nav-divider"></div>
                            <nav className="cod-nav">
                                <div className="nav-label">VINÍLICAS</div>
                                <button
                                    className={`cod-nav-sub-btn ${subSeccionVinilicas === "productos" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilicas("productos")}
                                >
                                    <span className="nav-icon">📦</span> Agregar Productos
                                </button>
                                <button
                                    className={`cod-nav-sub-btn ${subSeccionVinilicas === "excluidos" ? "active" : ""}`}
                                    onClick={() => setSubSeccionVinilicas("excluidos")}
                                >
                                    <span className="nav-icon">🚫</span> Códigos Excluidos
                                </button>
                            </nav>
                        </>
                    )}

                    <div className="sidebar-footer">
                        <div className="stats-mini">
                            <span className="stats-number">
                                {seccionActiva === "vinilicas"
                                    ? (subSeccionVinilicas === "productos" ? productos.length : codigos.length)
                                    : codigosEspeciales.filter(e => e.activo).length}
                            </span>
                            <span className="stats-label">
                                {seccionActiva === "vinilicas"
                                    ? (subSeccionVinilicas === "productos" ? "Productos" : "Códigos excluidos")
                                    : "Especiales activos"}
                            </span>
                        </div>
                        <button className="cod-btn-exit" onClick={() => navigate("/mantenimiento")}>
                            ↩ Regresar a Menú
                        </button>
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="cod-main-content">
                    <header className="cod-header">
                        <div className="cod-title-group">
                            <h1>
                                {seccionActiva === "vinilicas"
                                    ? getTituloVinilicas()
                                    : "⭐ Códigos Especiales - Esmaltes"}
                            </h1>
                            <p>
                                {seccionActiva === "vinilicas"
                                    ? getDescripcionVinilicas()
                                    : "Administra códigos especiales para pedidos urgentes o personalizados de Esmaltes"}
                            </p>
                        </div>
                    </header>

                    <div className="cod-workspace">
                        {renderContenido()}
                    </div>
                </main>
            </div>
        </div>
    );
}