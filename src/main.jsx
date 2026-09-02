import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./app.jsx";

/**
 * PONTO DE ENTRADA PRINCIPAL DA APLICAÇÃO REACT (main.jsx)
 * Responsável por inicializar a árvore de componentes do React e montá-la na div #root do HTML.
 * Utiliza o StrictMode para identificar potenciais problemas no ciclo de vida dos componentes durante o desenvolvimento.
 */
// Previne o zoom de pinça (pinch-to-zoom) globalmente em toda a aplicação do totem
document.addEventListener("touchmove", (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
