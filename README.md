# 🛒 Sistema Ecommerce - Fullstack Solution

![Project Status](https://img.shields.io/badge/Status-Completado-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Django](https://img.shields.io/badge/Django-4.2-092E20?style=for-the-badge&logo=django&logoColor=white)
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
* **📦 Gestión de Inventario:** Descuento automático de stock al concretar pagos.
* **🔐 Autenticación Segura:** Sistema de usuarios y roles con **JWT (JSON Web Tokens)**.
* **🛒 Carrito de Compras Persistente:** Gestión global de carrito y cupones de descuento.
* **📱 Diseño Responsive & Moderno:** Interfaz optimizada para móviles, tablets y escritorio.
* **   Productos cargados desde https://rebrickable.com/

---

## 🛠️ Tech Stack

### Backend (API REST)
* **Python 3.10+ / Django 4.2 & Django REST Framework**
* **Mercado Pago SDK** (Integración de Checkout Pro y Webhooks)
* **SQLite / PostgreSQL / MySQL**

### Frontend (SPA)
* **React 18 / Vite**
* **TailwindCSS / Lucide Icons**
* **Context API & Axios**

---

## 📂 Estructura del Proyecto

```bash
Web-Ecommerce/
├── backend/ecommerce/         # API Django, Pagos, Envíos, Productos, Órdenes
├── frontend/tienda/           # Cliente React, Páginas, Componentes, Servicios
├── .gitignore                 # Protección de credenciales y entornos
└── README.md                  # Documentación
```

---

## 🔧 Instalación y Despliegue Local

### 1. Configuración del Backend (Django)

```bash
# Entrar a la carpeta del backend
cd backend/ecommerce

# Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate      # En Windows
# source venv/bin/activate  # En Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Ejecutar migraciones de base de datos
python manage.py migrate

# Iniciar servidor de desarrollo
python manage.py runserver
```
El backend correrá en `http://localhost:8000`

---

### 2. Configuración del Frontend (React + Vite)

```bash
# Entrar a la carpeta del frontend (en una nueva terminal)
cd frontend/tienda

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
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

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
MERCADOPAGO_PUBLIC_KEY=tu_public_key
MERCADOPAGO_CURRENCY_ID=ARS
MERCADOPAGO_SUCCESS_URL=http://localhost:5173/pago/exitoso   (actualizar al conseguir un host)
MERCADOPAGO_FAILURE_URL=http://localhost:5173/pago/fallido   (actualizar al conseguir un host)
MERCADOPAGO_PENDING_URL=http://localhost:5173/pago/pendiente (actualizar al conseguir un host)

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

