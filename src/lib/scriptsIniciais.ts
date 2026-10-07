// Scripts que rodam no <head>, antes da primeira pintura. Ficam fora dos módulos
// "use client": exportados de lá, chegariam ao servidor como referência, não como texto.

/** Aplica o tema salvo (botão do cabeçalho); sem escolha, vale o do sistema. */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem('tema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

/** Liga as animações (se o usuário não pediu menos movimento). */
export const SCRIPT_ANIMACAO = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){var h=document.documentElement;h.dataset.anim='';h.dataset.primeiraCarga=''}}catch(e){}`;
