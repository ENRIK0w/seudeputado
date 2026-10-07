"use client";

/**
 * Alterna entre tema claro e escuro. O tema inicial vem do sistema; a escolha
 * fica salva no navegador e é aplicada antes da primeira pintura (SCRIPT_TEMA).
 */
export function TemaToggle() {
  function alternar() {
    const h = document.documentElement;
    const atual = h.dataset.theme ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const novo = atual === "light" ? "dark" : "light";
    h.dataset.theme = novo;
    try {
      localStorage.setItem("tema", novo);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className="pressionavel inline-flex size-9 items-center justify-center rounded-full text-ink-2 hover:bg-card-2 hover:text-ink"
    >
      {/* Lua no tema escuro, sol no claro — trocados só por CSS (sem piscar na hidratação) */}
      <svg viewBox="0 0 24 24" className="icone-lua size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="icone-sol size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </svg>
    </button>
  );
}

