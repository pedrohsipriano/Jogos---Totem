import React from "react";

/**
 * Cabeçalho global presente em todas as páginas do sistema
 */
export function SystemHeader() {
  return (
    <header className="system-global-header" aria-label="Desenvolvedor do sistema">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <span>
        desenvolvido por <strong>ps.system</strong> -{" "}
        <a href="mailto:contato.pssystem@gmail.com">contato.pssystem@gmail.com</a>
      </span>
    </header>
  );
}

/**
 * Rodapé global presente em todas as páginas do sistema
 */
export function SystemFooter() {
  return (
    <footer className="system-global-footer" aria-label="Desenvolvedor do sistema">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <span>
        desenvolvido por <strong>ps.system</strong> -{" "}
        <a href="mailto:contato.pssystem@gmail.com">contato.pssystem@gmail.com</a>
      </span>
    </footer>
  );
}
