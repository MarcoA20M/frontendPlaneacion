import React, { useState, useEffect } from "react";
import { familiaService } from "../services/familiaService";
import "../styles/familias-gestion.css";

export default function FamiliasGestionScreen() {
    const [familias, setFamilias] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [familiaSeleccionada, setFamiliaSeleccionada] = useState(null);
    const [editandoNombre, setEditandoNombre] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [filtroFamilias, setFiltroFamilias] = useState("");
    const [tipoFamiliaFiltro, setTipoFamiliaFiltro] = useState("todas");
    const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
    const [subiendoImagen, setSubiendoImagen] = useState(false);
    const [actualizandoNombre, setActualizandoNombre] = useState(false);
    const [imagenesError, setImagenesError] = useState({});
    const [imagenPreviewError, setImagenPreviewError] = useState(false);

    // Estados para AGREGAR nueva familia
    const [mostrarFormAgregar, setMostrarFormAgregar] = useState(false);
    const [nuevaFamilia, setNuevaFamilia] = useState({
        nombre: "",
        tipo: "vinilica"
    });
    const [creandoFamilia, setCreandoFamilia] = useState(false);

    // Estados para ELIMINAR familia
    const [eliminandoFamilia, setEliminandoFamilia] = useState(false);

    const mostrarMensaje = (texto, tipo = "success") => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    };

    const cargarFamilias = async () => {
        setCargando(true);
        try {
            let todasFamilias = [];
            const idsUnicos = new Set(); // Para evitar duplicados

            if (tipoFamiliaFiltro === "todas" || tipoFamiliaFiltro === "vinilica") {
                const vinilicas = await familiaService.getFamiliasPorTipo("vinilica");
                vinilicas.forEach(f => {
                    if (!idsUnicos.has(f.id)) {
                        idsUnicos.add(f.id);
                        todasFamilias.push({ ...f, tipo: "Vinílica" });
                    }
                });
            }

            if (tipoFamiliaFiltro === "todas" || tipoFamiliaFiltro === "esmalte") {
                const esmaltes = await familiaService.getFamiliasPorTipo("esmalte");
                esmaltes.forEach(f => {
                    if (!idsUnicos.has(f.id)) {
                        idsUnicos.add(f.id);
                        todasFamilias.push({ ...f, tipo: "Esmalte" });
                    }
                });
            }

            setFamilias(todasFamilias);

            // Resetear errores de imágenes
            setImagenesError({});
            setImagenPreviewError(false);

            // Si hay una familia seleccionada, actualizar sus datos
            if (familiaSeleccionada) {
                const familiaActualizada = todasFamilias.find(f => f.id === familiaSeleccionada.id);
                if (familiaActualizada) {
                    setFamiliaSeleccionada(familiaActualizada);
                } else {
                    setFamiliaSeleccionada(null);
                }
            }
        } catch (error) {
            console.error("Error cargando familias:", error);
            mostrarMensaje("Error al cargar familias", "error");
        } finally {
            setCargando(false);
        }
    };

    // ========== FUNCIÓN PARA AGREGAR NUEVA FAMILIA ==========
    // Reemplaza el fetch directo por el servicio
    const agregarFamilia = async () => {
        if (!nuevaFamilia.nombre.trim()) {
            mostrarMensaje("El nombre de la familia no puede estar vacío", "error");
            return;
        }

        setCreandoFamilia(true);
        try {
            const resultado = await familiaService.crearFamilia({
                nombre: nuevaFamilia.nombre,
                tipo: nuevaFamilia.tipo
            });

            mostrarMensaje(`Familia "${resultado.nombre}" creada correctamente`, "success");

            // Resetear formulario
            setNuevaFamilia({ nombre: "", tipo: "vinilica" });
            setMostrarFormAgregar(false);

            // Recargar la lista de familias
            await cargarFamilias();

        } catch (error) {
            console.error("Error creando familia:", error);
            mostrarMensaje(error.message || "Error al crear la familia", "error");
        } finally {
            setCreandoFamilia(false);
        }
    };

    // ========== FUNCIÓN PARA ELIMINAR FAMILIA ==========
    const eliminarFamilia = async (familiaId, familiaNombre) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar la familia "${familiaNombre}"?\n\nEsta acción no se puede deshacer.`)) {
            setEliminandoFamilia(true);
            try {
                await familiaService.eliminarFamilia(familiaId);

                mostrarMensaje(`Familia "${familiaNombre}" eliminada correctamente`, "success");

                // Si la familia eliminada era la seleccionada, limpiar selección
                if (familiaSeleccionada?.id === familiaId) {
                    setFamiliaSeleccionada(null);
                }

                // Recargar la lista de familias
                await cargarFamilias();

            } catch (error) {
                console.error("Error eliminando familia:", error);
                mostrarMensaje(error.message || "Error al eliminar la familia", "error");
            } finally {
                setEliminandoFamilia(false);
            }
        }
    };

    const guardarImagen = async (familiaId, archivo) => {
        setSubiendoImagen(true);
        try {
            await familiaService.subirImagen(familiaId, archivo);

            // Recargar familias para actualizar la imagen
            await cargarFamilias();

            mostrarMensaje("Imagen guardada correctamente", "success");
        } catch (error) {
            console.error("Error guardando imagen:", error);
            mostrarMensaje(error.message || "Error al guardar la imagen", "error");
        } finally {
            setSubiendoImagen(false);
        }
    };

    const eliminarImagen = async (familiaId) => {
        if (window.confirm("¿Eliminar la imagen de esta familia?")) {
            try {
                await familiaService.eliminarImagen(familiaId);

                // Recargar familias para actualizar
                await cargarFamilias();

                // Resetear error de imagen
                setImagenesError(prev => ({ ...prev, [familiaId]: true }));
                if (familiaSeleccionada?.id === familiaId) {
                    setImagenPreviewError(true);
                }

                mostrarMensaje("Imagen eliminada", "success");
            } catch (error) {
                console.error("Error eliminando imagen:", error);
                mostrarMensaje("Error al eliminar la imagen", "error");
            }
        }
    };

    const actualizarNombre = async () => {
        if (!nuevoNombre.trim()) {
            mostrarMensaje("El nombre no puede estar vacío", "error");
            return;
        }

        setActualizandoNombre(true);
        try {
            await familiaService.actualizarFamilia(familiaSeleccionada.id, { nombre: nuevoNombre });

            // Recargar familias
            await cargarFamilias();

            setEditandoNombre(false);
            mostrarMensaje("Nombre actualizado", "success");
        } catch (error) {
            console.error("Error actualizando nombre:", error);
            mostrarMensaje(error.message || "Error al actualizar el nombre", "error");
        } finally {
            setActualizandoNombre(false);
        }
    };

    // Manejar error de carga de imagen en la lista
    const handleImagenError = (familiaId) => {
        setImagenesError(prev => ({ ...prev, [familiaId]: true }));
    };

    // Manejar error de carga de imagen en el preview
    const handlePreviewError = () => {
        setImagenPreviewError(true);
    };

    useEffect(() => {
        cargarFamilias();
    }, [tipoFamiliaFiltro]);

    const familiasFiltradas = familias.filter(f =>
        f.nombre?.toLowerCase().includes(filtroFamilias.toLowerCase())
    );

    return (
        <div className="familias-gestion-container">
            {mensaje.texto && (
                <div className={`toast-familias ${mensaje.tipo}`}>
                    {mensaje.texto}
                </div>
            )}

            {/* Barra de filtros y botón AGREGAR */}
            <div className="cod-card">
                <div className="search-box-wrapper">
                    <div className="search-box-with-button">
                        <input
                            type="text"
                            placeholder="🔍 Buscar familia por nombre..."
                            value={filtroFamilias}
                            onChange={(e) => setFiltroFamilias(e.target.value)}
                        />
                        <select
                            className="tipo-filtro-select"
                            value={tipoFamiliaFiltro}
                            onChange={(e) => setTipoFamiliaFiltro(e.target.value)}
                        >
                            <option value="todas">📋 Todas las familias</option>
                            <option value="vinilica">💧 Vinílicas</option>
                            <option value="esmalte">✨ Esmaltes</option>
                        </select>
                        <button
                            className="btn-agregar-familia"
                            onClick={() => setMostrarFormAgregar(true)}
                        >
                            + Nueva Familia
                        </button>
                        {filtroFamilias && (
                            <button className="clear-filter" onClick={() => setFiltroFamilias("")}>
                                ✖
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* FORMULARIO PARA AGREGAR NUEVA FAMILIA */}
            {mostrarFormAgregar && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>➕ Agregar Nueva Familia</h3>
                            <button className="modal-close" onClick={() => setMostrarFormAgregar(false)}>✖</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>🏷️ Nombre de la familia</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Premium, Económica, Industrial..."
                                    value={nuevaFamilia.nombre}
                                    onChange={(e) => setNuevaFamilia({ ...nuevaFamilia, nombre: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>📂 Tipo de pintura</label>
                                <select
                                    value={nuevaFamilia.tipo}
                                    onChange={(e) => setNuevaFamilia({ ...nuevaFamilia, tipo: e.target.value })}
                                >
                                    <option value="vinilica">💧 Vinílica</option>
                                    <option value="esmalte">✨ Esmalte</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar-modal" onClick={() => setMostrarFormAgregar(false)}>
                                Cancelar
                            </button>
                            <button className="btn-agregar-modal" onClick={agregarFamilia} disabled={creandoFamilia}>
                                {creandoFamilia ? "⏳ Creando..." : "✓ Crear Familia"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cargando ? (
                <div className="loading-spinner">
                    <div className="spinner-glow"></div>
                    <p>Cargando familias...</p>
                </div>
            ) : familiasFiltradas.length === 0 ? (
                <div className="no-data-premium">
                    <div className="no-data-animation">📭</div>
                    <h3>No hay familias disponibles</h3>
                    <button
                        className="btn-agregar-familia-empty"
                        onClick={() => setMostrarFormAgregar(true)}
                    >
                        + Crear primera familia
                    </button>
                </div>
            ) : (
                <div className="familias-grid-doble">
                    {/* LISTA DE FAMILIAS - SIDEBAR */}
                    <div className="familias-lista">
                        <div className="lista-header">
                            <h3 className="lista-titulo">📋 Familias</h3>
                            <span className="lista-count">{familiasFiltradas.length} familias</span>
                        </div>
                        <div className="lista-items">
                            {familiasFiltradas.map(familia => {
                                const tieneError = imagenesError[familia.id];
                                // Usamos una clave única combinando id y tipo para evitar duplicados
                                const uniqueKey = `${familia.id}-${familia.tipo}`;
                                return (
                                    <div
                                        key={uniqueKey}
                                        className={`familia-item-lista ${familiaSeleccionada?.id === familia.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setFamiliaSeleccionada(familia);
                                            setNuevoNombre(familia.nombre);
                                            setEditandoNombre(false);
                                            setImagenPreviewError(false);
                                        }}
                                    >
                                        <div className="item-imagen-mini">
                                            {!tieneError ? (
                                                <img
                                                    src={familiaService.getImagenUrl(familia.id)}
                                                    alt={familia.nombre}
                                                    onError={() => handleImagenError(familia.id)}
                                                />
                                            ) : (
                                                <div className="mini-placeholder">{familia.nombre?.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div className="item-info-mini">
                                            <span className="item-nombre">{familia.nombre}</span>
                                            <span className="item-tipo">{familia.tipo}</span>
                                        </div>
                                        <div className="item-actions">
                                            <button
                                                className="btn-eliminar-familia"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    eliminarFamilia(familia.id, familia.nombre);
                                                }}
                                                disabled={eliminandoFamilia}
                                                title="Eliminar familia"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                        <div className="item-id">ID: {familia.id}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PANEL DE EDICIÓN */}
                    <div className="familias-edicion-panel">
                        {!familiaSeleccionada ? (
                            <div className="empty-seleccion">
                                <div className="empty-icon">🏷️</div>
                                <h3>Selecciona una familia</h3>
                                <p>Haz clic en cualquier familia de la lista para editarla</p>
                                <button
                                    className="btn-agregar-familia-empty"
                                    onClick={() => setMostrarFormAgregar(true)}
                                >
                                    + Crear nueva familia
                                </button>
                            </div>
                        ) : (
                            <div className="edicion-contenido">
                                <div className="edicion-header">
                                    <h2><span>✏️</span> Editando: {familiaSeleccionada.nombre}</h2>
                                    <div className="tipo-badge-edicion" style={{
                                        background: familiaSeleccionada.tipo === "Vinílica" ? "#9b30ff" : "#ff1493"
                                    }}>
                                        {familiaSeleccionada.tipo === "Vinílica" ? "💧" : "✨"} {familiaSeleccionada.tipo}
                                    </div>
                                </div>

                                {/* SECCIÓN IMAGEN */}
                                <div className="edicion-campo">
                                    <label>🖼️ Imagen de la familia</label>
                                    <div className="imagen-edicion">
                                        <div className="imagen-preview">
                                            {!imagenPreviewError ? (
                                                <img
                                                    src={familiaService.getImagenUrl(familiaSeleccionada.id)}
                                                    alt={familiaSeleccionada.nombre}
                                                    onError={handlePreviewError}
                                                />
                                            ) : (
                                                <div className="preview-vacio">
                                                    <span>🖼️</span>
                                                    <p>Sin imagen</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="imagen-botones">
                                            <button
                                                className="btn-subir-imagen"
                                                onClick={() => document.getElementById('file-input-familia').click()}
                                                disabled={subiendoImagen}
                                            >
                                                {subiendoImagen ? "⏳ Subiendo..." : "📷 Subir imagen"}
                                            </button>
                                            <button
                                                className="btn-eliminar-imagen"
                                                onClick={() => eliminarImagen(familiaSeleccionada.id)}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                            <input
                                                type="file"
                                                id="file-input-familia"
                                                accept="image/jpeg,image/png,image/jpg,image/gif"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files[0]) {
                                                        guardarImagen(familiaSeleccionada.id, e.target.files[0]);
                                                    }
                                                    e.target.value = '';
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="info-nota">
                                        💡 Formatos permitidos: JPG, PNG, GIF. Tamaño máximo: 2MB
                                    </div>
                                </div>

                                {/* SECCIÓN NOMBRE */}
                                <div className="edicion-campo">
                                    <label>✏️ Nombre de la familia</label>
                                    {editandoNombre ? (
                                        <div className="nombre-edicion">
                                            <input
                                                type="text"
                                                value={nuevoNombre}
                                                onChange={(e) => setNuevoNombre(e.target.value)}
                                                autoFocus
                                                onKeyPress={(e) => e.key === 'Enter' && actualizarNombre()}
                                                disabled={actualizandoNombre}
                                            />
                                            <button
                                                className="btn-guardar"
                                                onClick={actualizarNombre}
                                                disabled={actualizandoNombre}
                                            >
                                                {actualizandoNombre ? "⏳ Guardando..." : "💾 Guardar"}
                                            </button>
                                            <button
                                                className="btn-cancelar"
                                                onClick={() => {
                                                    setEditandoNombre(false);
                                                    setNuevoNombre(familiaSeleccionada.nombre);
                                                }}
                                            >
                                                ✖
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="nombre-actual">
                                            <span className="nombre-valor">{familiaSeleccionada.nombre}</span>
                                            <button className="btn-editar" onClick={() => setEditandoNombre(true)}>✏️ Editar</button>
                                        </div>
                                    )}
                                </div>

                                {/* SECCIÓN INFORMACIÓN ADICIONAL */}
                                <div className="edicion-campo info-adicional">
                                    <label>ℹ️ Información</label>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">ID:</span>
                                            <span className="info-valor">{familiaSeleccionada.id}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Tipo:</span>
                                            <span className="info-valor">{familiaSeleccionada.tipo}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* SECCIÓN ELIMINAR FAMILIA */}
                                <div className="edicion-campo eliminar-campo">
                                    <label>⚠️ Zona de peligro</label>
                                    <button
                                        className="btn-eliminar-familia-full"
                                        onClick={() => eliminarFamilia(familiaSeleccionada.id, familiaSeleccionada.nombre)}
                                        disabled={eliminandoFamilia}
                                    >
                                        {eliminandoFamilia ? "⏳ Eliminando..." : "🗑️ Eliminar esta familia"}
                                    </button>
                                    <div className="info-nota peligro">
                                        ⚠️ Esta acción eliminará la familia y no se puede deshacer.
                                    </div>
                                </div>

                                {/* SECCIÓN VISTA PREVIA */}
                                <div className="edicion-campo preview-campo">
                                    <label>👀 Vista previa</label>
                                    <div className="preview-card-mini">
                                        <div className="preview-imagen-mini">
                                            {!imagenPreviewError ? (
                                                <img
                                                    src={familiaService.getImagenUrl(familiaSeleccionada.id)}
                                                    alt=""
                                                    onError={handlePreviewError}
                                                />
                                            ) : (
                                                <div className="preview-mini-placeholder">
                                                    {familiaSeleccionada.nombre?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="preview-info-mini">
                                            <div className="preview-nombre-mini">{familiaSeleccionada.nombre}</div>
                                            <div className="preview-tipo-mini">{familiaSeleccionada.tipo}</div>
                                            <div className="preview-id-mini">ID: {familiaSeleccionada.id}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="info-box">
                <strong>💡 Tips:</strong>
                <ul>
                    <li>Haz clic en <strong>"+ Nueva Familia"</strong> para crear una nueva familia</li>
                    <li>Haz clic en cualquier familia de la lista para editarla</li>
                    <li>Usa el botón <strong>🗑️</strong> al lado de cada familia para eliminarla</li>
                    <li>Las imágenes se guardan permanentemente en el servidor</li>
                    <li>Formatos soportados: JPG, PNG, GIF (máx. 2MB)</li>
                </ul>
            </div>
        </div>
    );
}