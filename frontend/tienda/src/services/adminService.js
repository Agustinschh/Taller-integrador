import API_BASE_URL from '../config';

const API_URL = API_BASE_URL;

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    const newAccessToken = data.access;
    localStorage.setItem('access_token', newAccessToken);
    return newAccessToken;
  } catch (error) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    throw error;
  }
};

const getAuthToken = async () => {
  let token = localStorage.getItem('access_token');
  if (token && isTokenExpired(token)) {
    try {
      token = await refreshAccessToken();
    } catch (error) {
      token = null;
    }
  }
  return token;
};

const getAuthHeaders = async (isMultipart = false) => {
  const token = await getAuthToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

export const adminService = {
  // Obtener perfil del usuario actual para verificar permisos
  obtenerPerfil: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/usuarios/perfil/`, {
      method: 'GET',
      headers
    });
    if (!response.ok) {
      throw new Error('No se pudo obtener el perfil del usuario');
    }
    return await response.json();
  },

  // Obtener todos los productos para el admin (incluyendo inactivos)
  obtenerProductosAdmin: async (search = '') => {
    const headers = await getAuthHeaders();
    let url = `${API_URL}/productos/?admin_view=true`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Error al obtener productos');
    }
    return await response.json();
  },

  // Obtener categorías disponibles
  obtenerCategorias: async () => {
    const response = await fetch(`${API_URL}/categorias/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error('Error al obtener categorías');
    }
    return await response.json();
  },

  // Crear un producto nuevo
  crearProducto: async (formData) => {
    const token = await getAuthToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/productos/`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(err));
    }
    return await response.json();
  },

  // Actualizar un producto existente
  actualizarProducto: async (id, formData) => {
    const token = await getAuthToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/productos/${id}/`, {
      method: 'PATCH',
      headers,
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(err));
    }
    return await response.json();
  },

  // Eliminar un producto
  eliminarProducto: async (id) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/productos/${id}/`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.error || 'Error al eliminar producto');
    }
    return true;
  }
};
