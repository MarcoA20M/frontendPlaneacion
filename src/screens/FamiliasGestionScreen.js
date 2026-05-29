import React, { useState, useEffect } from "react";
import { familiaService } from "../services/familiaService";

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

    const mostrarMensaje = (texto, tipo = "success") => {
        setMensaje({ texto, tipo });
        setTimeout(() => setMensaje({ texto: "", tipo: "" }), 3000);
    };

    const cargarFamilias = async () => {
        setCargando(true);
        try {
            let todasFamilias = [];
            
            if (tipoFamiliaFiltro === "todas" || tipoFamiliaFiltro === "vinilica") {
                const vinilicas = await familiaService.getFamiliasPorTipo("vinilica");
                todasFamilias = [...todasFamilias, ...vinilicas.map(f => ({ ...f, tipo: "Vinílica" }))];
            }
            
            if (tipoFamiliaFiltro === "todas" || tipoFamiliaFiltro === "esmalte") {
                const esmaltes = await familiaService.getFamiliasPorTipo("esmalte");
                todasFamilias = [...todasFamilias, ...esmaltes.map(f => ({ ...f, tipo: "Esmalte" }))];
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
                }
            }
        } catch (error) {
            console.error("Error cargando familias:", error);
            mostrarMensaje("Error al cargar familias", "error");
        } finally {
            setCargando(false);
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
                        {filtroFamilias && (
                            <button className="clear-filter" onClick={() => setFiltroFamilias("")}>
                                ✖
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {cargando ? (
                <div className="loading-spinner">
                    <div className="spinner-glow"></div>
                    <p>Cargando familias...</p>
                </div>
            ) : familiasFiltradas.length === 0 ? (
                <div className="no-data-premium">
                    <div className="no-data-animation">📭</div>
                    <h3>No hay familias disponibles</h3>
                </div>
            ) : (
                <div className="familias-grid-doble">
                    {/* LISTA DE FAMILIAS - SIDEBAR */}
                    <div className="familias-lista">
                        <h3 className="lista-titulo">📋 Familias</h3>
                        <div className="lista-items">
                            {familiasFiltradas.map(familia => {
                                const tieneError = imagenesError[familia.id];
                                return (
                                    <div 
                                        key={familia.id} 
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
                    <li>Haz clic en cualquier familia de la lista para editarla</li>
                    <li>Las imágenes se guardan permanentemente en el servidor</li>
                    <li>Formatos soportados: JPG, PNG, GIF (máx. 2MB)</li>
                    <li>Puedes cambiar o eliminar la imagen cuando quieras</li>
                </ul>
            </div>
        </div>
    );
}