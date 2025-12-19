function ListaCargas({ cargas, visible }) {
  if (!visible || cargas.length === 0) return null;

  const totalGeneral = cargas.reduce((t, c) => t + c.litros, 0);

  return (
    <div className="tabla-cargas">
      <h2>Cargas registradas</h2>

      <div className="tabla">
        <div className="fila header">
          <span>Envasado</span>
          <span>Litros</span>
          <span>Tipo</span>
        </div>

        {cargas.map((c, idx) => (
          <div className="fila" key={idx}>
            <span>{c.envasadoId}</span>
            <span>{c.litros.toFixed(2)}</span>
            <span>{c.tipoPintura}</span>
          </div>
        ))}

        <div className="fila total-general">
          <span>Total General</span>
          <span>{totalGeneral.toFixed(2)}</span>
          <span>-</span>
        </div>
      </div>
    </div>
  );
}

export default ListaCargas;
