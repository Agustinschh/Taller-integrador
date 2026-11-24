# 🛒 Sistema Ecommerce - Fullstack Solution

![Project Status](https://img.shields.io/badge/Status-Completado-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MercadoPago](https://img.shields.io/badge/MercadoPago-ARS-009EE3?style=for-the-badge&logo=mercadopago&logoColor=white)

> **Plataforma de E-commerce integral con procesamiento de pagos reales, cotización dinámica de envíos con Correo Argentino y panel administrativo de gestión de catálogo.**

---

## 🚀 Características Principales

* **💳 Pasarela de Pagos (Mercado Pago Argentina):**
  * Procesamiento de pagos reales y pruebas en moneda **ARS**.
  * Auto-redirección inteligente a la tienda al aprobar el pago.
  * Sincronización instantánea de órdenes y actualización a estado `pagado`.
* **🚚 Cotizador de Envíos en Tiempo Real (Correo Argentino):**
  * Detección automática de zona y provincia por Código Postal (Origen: **CP 3260**, Concepción del Uruguay).
  * Cotización de opciones: **Envío a Domicilio**, **Retiro en Sucursal** y **Retiro en Local**.
  * Regla automática de **Envío Gratis** en compras superiores a $50.000.
* **⚙️ Panel de Administración de Productos (Dashboard):**
  * CRUD completo en frontend (`/admin/productos`) para usuarios Staff/Admin.
  * Creación y edición de productos, control de stock, activación/desactivación y carga de imágenes.
* **🗄️ Base de Datos PostgreSQL 18 (`bloque_mundo`):**
  * Modelo relacional de 15 tablas de dominio con **7 triggers**, **2 vistas** (`vista_reporte_ventas`, `vista_inventario_critico`), **3 funciones** y **4 procedimientos almacenados** (`pr_agregar_al_carrito`, `pr_concretar_compra`, `pr_gestion_stock`, `pr_destacar_producto`).
  * Trazabilidad completa de inventario en `movimiento_stock` y reposición automática al cancelar pagos.
* **📦 Combos y Filtros por Edad / Saga:**
  * Creación de combos temáticos desde el Panel Admin con precio cerrado prorrateado en el carrito y descuento automático de stock de cada producto incluido al concretar la compra.
  * Filtros por 5 rangos etarios (`edad`) y 18 sagas/películas (`pelicula`).
* **🛒 Carrito Persistente Anti-Fantasma:** Sanitización automática de ítems sin stock/inactivos, soporte para usuarios registrados e invitados y cupones de descuento.
* **📱 Diseño Responsive & Optimizado:** Interfaz adaptada a móviles, tablets y escritorio, con animaciones GSAP y carga eficiente sin peticiones duplicadas.
* **🧱 Catálogo LEGO®:** Productos cargados desde https://rebrickable.com/

---

## 🛠️ Tech Stack

### Backend (API REST)
* **Python 3.12 / Django 4.2 & Django REST Framework**
* **PostgreSQL 18 (`psycopg2-binary`)** con triggers, vistas y stored procedures PL/pgSQL
* **Mercado Pago SDK** (Integración de Checkout Pro y Webhooks)

### Frontend (SPA)
* **React 18 / Vite**
* **TailwindCSS / Lucide Icons / GSAP**
* **Context API & Fetch / Axios**

---

## 📂 Estructura del Proyecto

```bash
Web-Ecommerce-main/
├── backend/ecommerce/         # API Django, Pagos, Envíos, Productos, Órdenes
├── frontend/tienda/           # Cliente React, Páginas, Componentes, Servicios
├── nueva base de datos/       # Scripts SQL PostgreSQL (tablas, triggers, vistas, SPs)
├── ARQUITECTURA_TECNICA.md    # Especificación técnica y diagramas
├── EXPLICATIVO_SISTEMA.md     # Manual funcional para negocio
├── DOCUMENTACION.md           # Documentación integral del sistema
├── .gitignore                 # Protección de credenciales y entornos
└── README.md                  # Guía principal
```

---

## 🔧 Instalación y Despliegue Local

### 1. Configuración del Backend (Django + PostgreSQL)

```bash
# Entrar a la carpeta del backend
cd backend/ecommerce

# Activar entorno virtual del proyecto
venv\Scripts\activate      # En Windows
# source venv/bin/activate  # En Linux/Mac

# Instalar dependencias (incluye psycopg2-binary)
pip install -r requirements.txt

# Iniciar servidor de desarrollo
.\venv\Scripts\python.exe manage.py runserver
```
El backend correrá en `http://localhost:8000` conectado a PostgreSQL (`bloque_mundo`).

---

### 2. Configuración del Frontend (React + Vite)

```bash
# Entrar a la carpeta del frontend (en una nueva terminal)
cd frontend/tienda
npm install
npm run dev
```
El frontend correrá en `http://localhost:5173`

---

## 🔑 Variables de Entorno (`.env`)

Crea un archivo `.env` en `backend/ecommerce/` basado en la plantilla `.env.example`:

```env
SECRET_KEY=tu_clave_secreta_django
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de Datos PostgreSQL
DB_NAME=bloque_mundo
DB_USER=postgres
DB_PASSWORD=tu_password_postgres
DB_HOST=127.0.0.1
DB_PORT=5432

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
MERCADOPAGO_PUBLIC_KEY=tu_public_key
MERCADOPAGO_CURRENCY_ID=ARS
MERCADOPAGO_SUCCESS_URL=http://localhost:5173/pago/exitoso
MERCADOPAGO_FAILURE_URL=http://localhost:5173/pago/fallido
MERCADOPAGO_PENDING_URL=http://localhost:5173/pago/pendiente

# Correo Argentino
CORREO_ARGENTINO_CP_ORIGEN=3260
```

---




zorrita, para probarlo tenes que ejecutar todo esto: 

**para levantar el backend**
  cd backend/ecommerce
  pip install -r requirements.txt
  python manage.py runserver

**para levantar el frontend**
  cd frontend/tienda
  npm install
  npm run dev

para la base de datos: 
**editar o visualizar base de datos con monitor de django: http://127.0.0.1:8000/admin/login/?next=admin/
Usuario: agustinsch__ 
Contraseña: admin1234

Hay un solo usuario cargado como admin, que es: 
Usuario: agustinsch__ 
Contraseña: Agustin1234

tenes una cuenta de mercado pago con 50000 pesos en credidos para probar, compra algo barato para que no se te acaben, hay un baby yoda a $1  
usuario: TESTUSER7387977382543333699 
contraseña: jRy4PCGjRi
codigo de verificacion: 782482 (si le pones para enviar un correo como verificacion)

