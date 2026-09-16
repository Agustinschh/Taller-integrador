import API_BASE_URL from '../config';

export const envioService = {
  cotizarEnvio: async (codigoPostal, subtotal = 0) => {
    try {
      const response = await fetch(`${API_BASE_URL}/envios/cotizar/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codigo_postal: codigoPostal,
          subtotal: subtotal
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al cotizar envío');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en envioService.cotizarEnvio:', error);
      throw error;
    }
  }
};
