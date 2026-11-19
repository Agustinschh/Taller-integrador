-- =====================================================================
-- 01_creacion_bbdd_reglas_controles.sql
--Construye la base del sistema, crea las 15 tablas,
--define las claves primarias, las claves foráneas
--las restricciones necesarias.
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;


CREATE TYPE tipo_movimiento_enum AS ENUM (
    'INGRESO', 'INGRESO_ADMIN', 'VENTA', 'DEVOLUCION_CANCELACION', 'AJUSTE'
);
CREATE TYPE estado_pago_enum AS ENUM (
    'PENDIENTE', 'APROBADO', 'CANCELADO'
);
CREATE TYPE envio_estado_enum AS ENUM (
    'PREPARACION', 'EN_CAMINO', 'ENTREGADO'
);


CREATE TABLE usuario (
    id_usuario      SERIAL PRIMARY KEY,
    nombre          VARCHAR(50)  NOT NULL,
    apellido        VARCHAR(50)  NOT NULL,
    correo          VARCHAR(100) NOT NULL UNIQUE,
    direccion       VARCHAR(150) NOT NULL,
    codigo_postal   VARCHAR(10)  NOT NULL,
    es_admin        BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_usuario_correo CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE categoria (
    id_categoria    SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE,
    descripcion     VARCHAR(200)
);

CREATE TABLE pelicula (
    id_pelicula     SERIAL PRIMARY KEY,
    nombre_pelicula VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE edad (
    id_edad         SERIAL PRIMARY KEY,
    rango           VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE cupon (
    id_cupon            SERIAL PRIMARY KEY,
    codigo              VARCHAR(30) NOT NULL UNIQUE,
    porcentaje          DECIMAL(5,2) NOT NULL,
    usado               BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_vencimiento   TIMESTAMP NOT NULL,
    CONSTRAINT ck_cupon_porcentaje CHECK (porcentaje > 0 AND porcentaje <= 100)
);


CREATE TABLE producto (
    id_producto     SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(300),
    precio          DECIMAL(10,2) NOT NULL,
    stock           INT NOT NULL DEFAULT 0,
    destacado       BOOLEAN NOT NULL DEFAULT FALSE,
    id_categoria    INT NOT NULL REFERENCES categoria(id_categoria),
    id_edad         INT REFERENCES edad(id_edad),
    id_pelicula     INT REFERENCES pelicula(id_pelicula),
    -- Reemplaza al antiguo "Trigger 6: Control de Precios Coherentes"
    CONSTRAINT ck_producto_precio CHECK (precio > 0),
    -- Reemplaza al antiguo "Trigger 4: Control de Stock Positivo"
    CONSTRAINT ck_producto_stock CHECK (stock >= 0)
);


CREATE TABLE carrito (
    id_carrito      SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL UNIQUE REFERENCES usuario(id_usuario),
    total           DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT ck_carrito_total CHECK (total >= 0)
);

CREATE TABLE linea_carrito (
    id_carrito       INT NOT NULL REFERENCES carrito(id_carrito) ON DELETE CASCADE,
    id_producto      INT NOT NULL REFERENCES producto(id_producto),
    cantidad         INT NOT NULL,
    subtotal         DECIMAL(10,2) NOT NULL,
    CONSTRAINT ck_linea_carrito_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_linea_carrito_subtotal CHECK (subtotal >= 0),
    CONSTRAINT pk_linea_carrito PRIMARY KEY (id_carrito, id_producto)
);


CREATE TABLE compra (
    id_compra   SERIAL PRIMARY KEY,
    fecha       TIMESTAMP NOT NULL DEFAULT now(),
    id_usuario  INT NOT NULL REFERENCES usuario(id_usuario),
    subtotal    DECIMAL(10,2) NOT NULL,
    descuento   DECIMAL(10,2) NOT NULL DEFAULT 0,
    total       DECIMAL(10,2) NOT NULL,
    id_cupon    INT REFERENCES cupon(id_cupon),
    CONSTRAINT ck_compra_subtotal CHECK (subtotal >= 0),
    CONSTRAINT ck_compra_descuento CHECK (descuento >= 0),
    CONSTRAINT ck_compra_total CHECK (total >= 0)
);

CREATE TABLE movimiento_stock (
    id_movimiento     SERIAL PRIMARY KEY,
    id_producto       INT NOT NULL REFERENCES producto(id_producto),
    id_compra         INT REFERENCES compra(id_compra),
    tipo_movimiento   tipo_movimiento_enum NOT NULL,
    cantidad          INT NOT NULL,
    costo_unitario    DECIMAL(10,2),
    fecha_movimiento  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_movimiento_cantidad CHECK (cantidad > 0)
);

CREATE TABLE linea_compra (
    id_compra        INT NOT NULL REFERENCES compra(id_compra),
    id_producto      INT NOT NULL REFERENCES producto(id_producto),
    cantidad         INT NOT NULL,
    precio_unitario  DECIMAL(10,2) NOT NULL,
    subtotal         DECIMAL(10,2) NOT NULL,
    CONSTRAINT ck_linea_compra_cantidad CHECK (cantidad > 0),
    CONSTRAINT ck_linea_compra_precio CHECK (precio_unitario > 0),
    CONSTRAINT ck_linea_compra_subtotal CHECK (subtotal >= 0),
    CONSTRAINT pk_linea_compra PRIMARY KEY (id_compra, id_producto)
);

CREATE TABLE pago (
    id_pago       SERIAL PRIMARY KEY,
    id_compra     INT NOT NULL UNIQUE REFERENCES compra(id_compra),
    monto         DECIMAL(10,2) NOT NULL,
    metodo_pago   VARCHAR(20) NOT NULL DEFAULT 'MERCADOPAGO',
    estado_pago   estado_pago_enum NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT ck_pago_monto CHECK (monto > 0),
    CONSTRAINT ck_pago_metodo CHECK (metodo_pago = 'MERCADOPAGO')
);

CREATE TABLE envio (
    id_envio          SERIAL PRIMARY KEY,
    id_compra         INT NOT NULL UNIQUE REFERENCES compra(id_compra),
    direccion_destino VARCHAR(150) NOT NULL,
    costo             DECIMAL(10,2) NOT NULL DEFAULT 0,
    envio_estado      envio_estado_enum NOT NULL DEFAULT 'PREPARACION',
    CONSTRAINT ck_envio_costo CHECK (costo >= 0)
);



CREATE TABLE comentario (
    id_comentario  SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario),
    id_producto    INT NOT NULL REFERENCES producto(id_producto),
    texto          VARCHAR(300) NOT NULL,
    calificacion   INT NOT NULL,
    fecha          TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_comentario_calificacion CHECK (calificacion BETWEEN 1 AND 5)
);

CREATE TABLE promocion (
    id_promo         SERIAL PRIMARY KEY,
    id_producto      INT REFERENCES producto(id_producto),
    descripcion_promo VARCHAR(200) NOT NULL,
    fecha_inicio     TIMESTAMP NOT NULL,
    fecha_fin        TIMESTAMP NOT NULL,
    CONSTRAINT ck_promocion_fechas CHECK (fecha_fin > fecha_inicio)
);


