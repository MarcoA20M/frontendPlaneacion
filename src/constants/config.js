export const API_URL = "http://localhost:5000";

export const OPERARIOS = {
  101: "Pedro", 102: "Luis", 103: "Carlos", 104: "Carlos",
  105: "Pedro", 106: "Luis", 107: "Yunior", 108: "Yunior"
};

export const CODIGOS_EXCLUIDOS = ["890", "912", "908", "100", "852", "852IF"];

export const litrosPorEnvasado = (id) => (id >= 100 ? id / 1000 : id);

export const litrosATexto = (l) => (l === 0.25 ? "1/4 L" : l === 0.5 ? "1/2 L" : l === 0.75 ? "3/4 L" : l === 1 ? "1 L" : `${l} L`);