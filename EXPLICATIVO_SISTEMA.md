# 📘 Manual y Explicativo Integral del Sistema E-Commerce
> **Dirigido a:** Áreas de Negocio, Marketing, Operaciones, Ventas, Finanzas y Dirección  
> **Objetivo:** Explicar de manera clara, didáctica y no técnica el funcionamiento integral de la plataforma de comercio electrónico.

---

## 🏬 1. Introducción: ¿Qué es este sistema y cómo funciona?

Para comprender el sistema sin tecnicismos informáticos, podemos compararlo con el funcionamiento de una **gran tienda comercial física moderna**, compuesta por cuatro áreas clave interconectadas:

```
+-----------------------------------------------------------------------------------+
|                            TIENDA E-COMMERCE INTEGRAL                             |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   [ 🏪 VIDRIERA Y SALÓN ]  <--->  [ 🧑‍💼 GERENCIA Y CONTROL ] <---> [ 🗄️ DEPÓSITO ] |
|   (Frontend Web / React)          (Backend / Reglas de Negocio)    (Base de Datos)|
|                                                |                                  |
|                               +----------------+----------------+                 |
|                               |                                 |                 |
|                               v                                 v                 |
|                     [ 💳 CAJA REGISTRADORA ]         [ 🚚 LOGÍSTICA Y FLETE ]     |
|                          (Mercado Pago)                 (Correo Argentino)        |
+-----------------------------------------------------------------------------------+
```

1. **La Vidriera y Salón de Ventas (Frontend):** Todo lo que el cliente ve y toca en su pantalla (computadora o celular): fotos, descripciones, precios, botones de compra y carrito.
2. **La Gerencia y Oficina Central (Backend):** El "cerebro" del sistema. Se encarga de comprobar si hay stock antes de confirmar una venta, calcular costos de envío, aplicar cupones de descuento y comunicarse con los bancos.
3. **El Depósito Central y Archivo (Base de Datos):** El libro de registros permanente donde se guardan clientes, productos, niveles de stock, pedidos históricos y comprobantes.
4. **Los Aliados Externos:**
   - **Caja de Cobro Segura (Mercado Pago):** Valida tarjetas, previene fraudes y acredita el dinero.
   - **Logística y Fletes (Correo Argentino):** Calcula en tiempo real cuánto cuesta enviar un paquete según el código postal del comprador.

---

## 🔄 2. El Recorrido del Cliente: Paso a Paso de una Compra

El sistema guía al comprador a través de un proceso fluido, rápido y transparente:

```
[ Paso 1: Exploración ]
      │
      ▼
[ Paso 2: Carrito y Deseos ]
      │
      ▼
[ Paso 3: Cotización de Envío ] (Ingreso de Código Postal -> Correo Argentino)
      │
      ▼
[ Paso 4: Pago Seguro ] (Redirección a Mercado Pago)
      │
      ▼
[ Paso 5: Confirmación ] (Descuento automático de Stock y Generación de Orden)
```

### Detalle de cada paso:

1. **Exploración y Selección:**
   - El cliente busca productos por categoría, revisa combos promocionales o mira las ofertas activas.
   - Puede ver opiniones, fotos y calificaciones de otros compradores antes de decidir.

2. **Carga al Carrito y Lista de Deseos:**
   - Agrega artículos al carrito. El carrito recuerda los productos incluso si el cliente cierra la ventana y regresa días después.
   - Si no puede comprar de inmediato, puede guardar artículos en su "Lista de Deseos" (*Wishlist*).

3. **Cálculo de Envío en Tiempo Real:**
   - En el Checkout (caja), el cliente escribe su Código Postal.
   - El sistema calcula de forma instantánea el costo de envío a su localidad (desde el centro de distribución en Entre Ríos, CP 3260) y le presenta 3 opciones:
     - **Envío a Domicilio:** Directo a la puerta.
     - **Retiro en Sucursal de Correo:** Opción más económica.
     - **Retiro en Local:** Sin costo para clientes cercanos.
   - **Beneficio Automático:** Si el carrito supera el monto mínimo fijado (por ejemplo, $50.000 ARS), el sistema bonifica el flete como **Envío Gratis**.

4. **Aplicación de Cupones:**
   - Si el cliente posee un cupón de marketing (ej: `VERANO20`), lo ingresa y el sistema valida vigencia, monto mínimo y aplica el descuento en el acto.

5. **Pago Seguro con Mercado Pago:**
   - El cliente abona con tarjeta de crédito, débito o dinero en cuenta.
   - Los datos bancarios nunca quedan expuestos ni se almacenan en nuestros servidores.

6. **Cierre de Venta Automático:**
   - Cuando el pago es aprobado, el sistema descuenta automáticamente las unidades del inventario, genera el comprobante de compra y muestra la confirmación en pantalla.

---

## 🧩 3. Módulos Principales del Sistema

### 📦 A. Gestión de Catálogo y Productos
- **Fichas Completas:** Carga de nombres, descripciones enriquecidas, múltiples imágenes, precios y categorías.
- **Sección de Ofertas y Combos:** Herramienta estratégica para armar paquetes de productos con descuento para elevar el ticket promedio de compra.
- **Sistema de Reseñas y Valoraciones:** Permite a los clientes calificar con estrellas y dejar testimonios, mejorando la conversión y confianza de futuros clientes.

### 💳 B. Pasarela de Pagos (Mercado Pago)
- Procesamiento en Pesos Argentinos (**ARS**).
- Sincronización inmediata de estados de pago (`Aprobado`, `Pendiente`, `Rechazado`).
- Protección y cumplimiento con normativas de seguridad financiera.

### 🚚 C. Motor de Envíos y Tarifas (Correo Argentino)
- Detección automática de provincias y zonas logísticas.
- Parámetros flexibles para definir promociones de fletes bonificados.
- Diferenciación de costos para envíos a domicilio y retiros por sucursal.

### 👥 D. Cuentas de Usuario y Clientes
- Registro e inicio de sesión seguro.
- Panel del cliente con **Historial de Compras** y seguimiento de estados de sus pedidos.

---

## 📊 4. El Panel de Control para el Negocio (Dashboard Administrativo)

El equipo de administración, ventas y logística cuenta con un panel privado para operar la tienda sin necesidad de solicitar cambios a programadores:

| Tarea Cotidiana | ¿Cómo se realiza en el sistema? |
| :--- | :--- |
| **Cargar un nuevo producto** | Desde un formulario visual: se suben fotos, precio, categoría y cantidad disponible. |
| **Actualizar precios o stock** | Se edita directamente el valor del producto y se refleja en tiempo real en la tienda. |
| **Pausar un producto sin stock** | Con un solo clic se desactiva para que no aparezca en la tienda hasta nuevo ingreso. |
| **Controlar pedidos entrantes** | Visualización centralizada de todas las órdenes, estados de pago y datos de envío del cliente. |
| **Crear promociones y cupones** | Configuración de códigos de descuento, porcentajes y límites de uso. |

---

## 🛡️ 5. Seguridad, Confiabilidad y Escalabilidad

1. **Protección de Datos:**
   - Las contraseñas de los usuarios están fuertemente encriptadas.
   - Los pagos se procesan a través de canales cifrados de nivel bancario.
2. **Control Anti-Sobrevenda:**
   - El sistema descuenta el stock de manera atómica al concretarse el pago, evitando que dos personas compren el último artículo disponible al mismo tiempo.
3. **Disponibilidad 24/7:**
   - La tienda se mantiene activa y cobrando los 365 días del año sin requerir personal de guardia para procesar las ventas.

---

## 🎯 6. Resumen Ejecutivo: ¿Qué valor aporta a la empresa?

* **Automatización del Proceso Comercial:** Desde que el cliente entra hasta que el pedido queda listo para empaquetar, no se requiere trabajo manual de cotización o cobro.
* **Experiencia de Usuario Profesional:** Diseño ágil y optimizado para compras desde teléfonos móviles y computadoras.
* **Autonomía Operativa:** El equipo de marketing y catálogo puede lanzar productos, promociones y combos de manera independiente y en minutos.
* **Trazabilidad y Control Total:** Toda transacción deja un registro auditable con fecha, hora, monto, cliente y comprobante de pago.
