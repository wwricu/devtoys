export type Theme = "light" | "dark";

/** Key passed to `useStoredState`, which stores it as `tool:theme.mode`. */
export const THEME_KEY = "theme.mode";

/**
 * Runs before the first paint, so a dark-mode visit never flashes white.
 * Absent or unreadable storage means "follow the system".
 */
export const themeScript = `(function(){var m;try{m=JSON.parse(localStorage.getItem("tool:theme.mode"))}catch(e){}
var d=m==="dark"||(m!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark",d);
var h;try{h=localStorage.getItem("tool:sidebar.hidden")==="true"}catch(e){}
document.documentElement.classList.toggle("sidebar-hidden",h);})();`;
