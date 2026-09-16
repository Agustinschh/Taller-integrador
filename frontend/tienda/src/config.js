// src/config.js
// Configuración centralizada de la aplicación con soporte para local y túneles (ngrok)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Exportar para uso en toda la aplicación
export { API_BASE_URL };
export default API_BASE_URL;