// src/components/MateriasPrimasManager.js
import React, { useState, useEffect } from "react";
import { materiaPrimaService } from "../services/materiaPrimaService";
import "../styles/materiasPrimasManager.css";

export default function MateriasPrimasManager({ onClose, onMateriaCreada }) {
    const [materiasPrimas, setMateriasPrimas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filtroTipo, setFiltroTipo] = useState("todos");
    const [mostrarModal, setMostrarModal] = useState(false);
    const [editando, setEditando] = useState(null);
    
    // Estado para nueva/editar materia prima
    const [formData, setFormData] = useState({
        codigo: "",
        nombre: "",
        tipo: "BASE",
        capacidadMaxima: "",
        nivelActual: "",
        unidad: "L",
        umbralCritico: "",
        umbralAlerta: "",
        costoPorUnidad: "",
        ubicacion: ""
    });

    const cargarMateriasPrimas = async () => {
        setLoading(true);
        try {
            const data = await materiaPrimaService.listarTodas();
            setMateriasPrimas(data);
        } catch (error) {
            console.error("Error cargando materias primas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarMateriasPrimas();
    }, []);

    const handleCrear = async () => {
        if (!formData.codigo || !formData.nombre) {
            alert("El código y nombre son obligatorios");
            return;
        }

        try {
            const response = await fetch("http://localhost:8080/api/materias-primas", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo: formData.codigo.toUpperCase(),
                    nombre: formData.nombre,
                    tipo: formData.tipo,
                    capacidadMaxima: parseFloat(formData.capacidadMaxima) || 0,
                    nivelActual: parseFloat(formData.nivelActual) || 0,
                    unidad: formData.unidad,
                    umbralCritico: formData.umbralCritico ? parseFloat(formData.umbralCritico) : null,
                    umbralAlerta: formData.umbralAlerta ? parseFloat(formData.umbralAlerta) : null,
                    costoPorUnidad: formData.costoPorUnidad ? parseFloat(formData.costoPorUnidad) : null,
                    ubicacion: formData.ubicacion || null
                })
            });

            if (!response.ok) throw new Error("Error al crear");
            
            alert("✅ Materia prima creada");
            setMostrarModal(false);
            resetForm();
            cargarMateriasPrimas();
            if (onMateriaCreada) onMateriaCreada();
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const handleActualizar = async () => {
        if (!formData.codigo || !formData.nombre) {
            alert("El código y nombre son obligatorios");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/materias-primas/${editando.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    codigo: formData.codigo.toUpperCase(),
                    nombre: formData.nombre,
                    tipo: formData.tipo,
                    capacidadMaxima: parseFloat(formData.capacidadMaxima) || 0,
                    nivelActual: parseFloat(formData.nivelActual) || 0,
                    unidad: formData.unidad,
                    umbralCritico: formData.umbralCritico ? parseFloat(formData.umbralCritico) : null,
                    umbralAlerta: formData.umbralAlerta ? parseFloat(formData.umbralAlerta) : null,
                    costoPorUnidad: formData.costoPorUnidad ? parseFloat(formData.costoPorUnidad) : null,
                    ubicacion: formData.ubicacion || null
                })
            });

            if (!response.ok) throw new Error("Error al actualizar");
            
            alert("✅ Materia prima actualizada");
            setMostrarModal(false);
            setEditando(null);
            resetForm();
            cargarMateriasPrimas();
            if (onMateriaCreada) onMateriaCreada();
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    const handleEliminar = async (mp) => {
        if (window.confirm(`¿Eliminar "${mp.nombre}"? Esta acción no se puede deshacer.`)) {
            try {
                const response = await fetch(`http://localhost:8080/api/materias-primas/${mp.id}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) throw new Error("Error al eliminar");
                
                alert("✅ Materia prima eliminada");
                cargarMateriasPrimas();
                if (onMateriaCreada) onMateriaCreada();
            } catch (error) {
                alert("Error: " + error.message);
            }
        }
    };

    const abrirModalEditar = (mp) => {
        setEditando(mp);
        setFormData({
            codigo: mp.codigo || "",
            nombre: mp.nombre || "",
            tipo: mp.tipo || "BASE",
            capacidadMaxima: mp.capacidadMaxima || "",
            nivelActual: mp.nivelActual || "",
            unidad: mp.unidad || "L",
            umbralCritico: mp.umbralCritico || "",
            umbralAlerta: mp.umbralAlerta || "",
            costoPorUnidad: mp.costoPorUnidad || "",
            ubicacion: mp.ubicacion || ""
        });
        setMostrarModal(true);
    };

    const abrirModalNuevo = () => {
        setEditando(null);
        resetForm();
        setMostrarModal(true);
    };

    const resetForm = () => {
        setFormData({
            codigo: "",
            nombre: "",
            tipo: "BASE",
            capacidadMaxima: "",
            nivelActual: "",
            unidad: "L",
            umbralCritico: "",
            umbralAlerta: "",
            costoPorUnidad: "",
            ubicacion: ""
        });
    };

    const filteredMP = materiasPrimas.filter(mp => {
        const matchesSearch = mp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             mp.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTipo = filtroTipo === "todos" || mp.tipo === filtroTipo;
        return matchesSearch && matchesTipo;
    });

    const getTipoBadge = (tipo) => {
        const clases = {
            'BASE': 'tipo-badge-base',
            'PIGMENTO': 'tipo-badge-pigmento',
            'SOLVENTE': 'tipo-badge-solvente',
            'ADITIVO': 'tipo-badge-aditivo'
        };
        return `tipo-badge ${clases[tipo] || ''}`;
    };

    return (
        <div className="mp-manager-container">
            <div className="mp-manager-header">
                <h2>📦 Gestión de Materias Primas</h2>
                <div className="mp-manager-actions">
                    <button className="btn-nuevo-mp" onClick={abrirModalNuevo}>
                        ➕ Nueva Materia Prima
                    </button>
                    <button className="btn-cerrar-manager" onClick={onClose}>✖ Cerrar</button>
                </div>
            </div>

            <div className="mp-manager-filtros">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="tipo-filtros">
                    <button className={`tipo-filtro ${filtroTipo === "todos" ? "active" : ""}`} onClick={() => setFiltroTipo("todos")}>Todos</button>
                    <button className={`tipo-filtro ${filtroTipo === "BASE" ? "active" : ""}`} onClick={() => setFiltroTipo("BASE")}>🛢️ Base</button>
                    <button className={`tipo-filtro ${filtroTipo === "PIGMENTO" ? "active" : ""}`} onClick={() => setFiltroTipo("PIGMENTO")}>🎨 Pigmento</button>
                    <button className={`tipo-filtro ${filtroTipo === "SOLVENTE" ? "active" : ""}`} onClick={() => setFiltroTipo("SOLVENTE")}>💧 Solvente</button>
                    <button className={`tipo-filtro ${filtroTipo === "ADITIVO" ? "active" : ""}`} onClick={() => setFiltroTipo("ADITIVO")}>⚗️ Aditivo</button>
                </div>
            </div>

            {loading ? (
                <div className="loading-mp">
                    <div className="spinner-small"></div>
                    <p>Cargando materias primas...</p>
                </div>
            ) : (
                <div className="mp-manager-tabla">
                    <table className="mp-tabla">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nombre</th>
                                <th>Tipo</th>
                                <th>Capacidad</th>
                                <th>Nivel Actual</th>
                                <th>Unidad</th>
                                <th>Ubicación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMP.map(mp => (
                                <tr key={mp.id}>
                                    <td><code>{mp.codigo}</code></td>
                                    <td><strong>{mp.nombre}</strong></td>
                                    <td><span className={getTipoBadge(mp.tipo)}>{mp.tipo || "-"}</span></td>
                                    <td>{mp.capacidadMaxima?.toLocaleString()}</td>
                                    <td>
                                        <span className={mp.critico ? "nivel-critico" : mp.alerta ? "nivel-alerta" : "nivel-normal"}>
                                            {mp.nivelActual?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td>{mp.unidad}</td>
                                    <td>{mp.ubicacion || "-"}</td>
                                    <td className="acciones-mp">
                                        <button className="btn-editar-mp" onClick={() => abrirModalEditar(mp)}>✏️</button>
                                        <button className="btn-eliminar-mp" onClick={() => handleEliminar(mp)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredMP.length === 0 && (
                        <div className="no-mp">No hay materias primas que coincidan con la búsqueda</div>
                    )}
                </div>
            )}

            {/* Modal para crear/editar */}
            {mostrarModal && (
                <div className="modal-overlay" onClick={() => { setMostrarModal(false); setEditando(null); }}>
                    <div className="modal-content modal-mp-full" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editando ? "✏️ Editar Materia Prima" : "➕ Nueva Materia Prima"}</h3>
                            <button className="modal-close" onClick={() => { setMostrarModal(false); setEditando(null); }}>✖</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Código *</label>
                                    <input type="text" className="form-input" placeholder="Ej: RVA50" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="form-group">
                                    <label>Nombre *</label>
                                    <input type="text" className="form-input" placeholder="Nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Tipo</label>
                                    <select className="form-input" value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                                        <option value="BASE">BASE</option>
                                        <option value="PIGMENTO">PIGMENTO</option>
                                        <option value="SOLVENTE">SOLVENTE</option>
                                        <option value="ADITIVO">ADITIVO</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Unidad</label>
                                    <select className="form-input" value={formData.unidad} onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}>
                                        <option value="L">L (Litros)</option>
                                        <option value="KG">KG (Kilogramos)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Capacidad Máxima *</label>
                                    <input type="number" step="0.01" className="form-input" placeholder="Ej: 25000" value={formData.capacidadMaxima} onChange={(e) => setFormData({ ...formData, capacidadMaxima: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Nivel Actual *</label>
                                    <input type="number" step="0.01" className="form-input" placeholder="Ej: 18000" value={formData.nivelActual} onChange={(e) => setFormData({ ...formData, nivelActual: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Umbral Alerta</label>
                                    <input type="number" step="0.01" className="form-input" placeholder="Ej: 10000" value={formData.umbralAlerta} onChange={(e) => setFormData({ ...formData, umbralAlerta: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Umbral Crítico</label>
                                    <input type="number" step="0.01" className="form-input" placeholder="Ej: 5000" value={formData.umbralCritico} onChange={(e) => setFormData({ ...formData, umbralCritico: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Costo por Unidad</label>
                                    <input type="number" step="0.01" className="form-input" placeholder="Ej: 25.50" value={formData.costoPorUnidad} onChange={(e) => setFormData({ ...formData, costoPorUnidad: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Ubicación</label>
                                    <input type="text" className="form-input" placeholder="Ej: Almacén A" value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cerrar" onClick={() => { setMostrarModal(false); setEditando(null); }}>Cancelar</button>
                            <button className="btn-guardar" onClick={editando ? handleActualizar : handleCrear}>
                                {editando ? "💾 Actualizar" : "✅ Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}