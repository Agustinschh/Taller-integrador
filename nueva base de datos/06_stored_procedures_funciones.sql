-- =====================================================================
-- 06_stored_procedures_funciones.sql
-- Define las funciones y procedimientos almacenados que automatizan 
-- reglas importantes del negocio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FUNCION 1: filtrar_productos
-- Filtro dinamico del catalogo por categoria, edad y/o pelicula.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION filtrar_productos(
    p_id_categoria INT DEFAULT NULL,
    p_id_edad      INT DEFAULT NULL,
    p_id_pelicula  INT DEFAULT NULL
)
RETURNS TABLE (
    id_producto INT,
    nombre_producto VARCHAR,
    descripcion VARCHAR,
    precio DECIMAL,
    stock INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id_producto, p.nombre_producto, p.descripcion, p.precio, p.stock
    FROM producto p
    WHERE (p_id_categoria IS NULL OR p.id_categoria = p_id_categoria)
      AND (p_id_edad IS NULL OR p.id_edad = p_id_edad)
      AND (p_id_pelicula IS NULL OR p.id_pelicula = p_id_pelicula);
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- FUNCION 2: historial_compras_usuario
-- Devuelve el historial de compras de un cliente para reportes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION historial_compras_usuario(p_id_usuario INT)
RETURNS TABLE (
    id_compra INT,
    fecha TIMESTAMP,
    total DECIMAL,
    nombre_producto VARCHAR,
    cantidad INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id_compra, c.fecha, c.total, p.nombre_producto, lc.cantidad
    FROM compra c
    JOIN linea_compra lc ON lc.id_compra = c.id_compra
    JOIN producto p ON p.id_producto = lc.id_producto
    WHERE c.id_usuario = p_id_usuario
    ORDER BY c.fecha DESC;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------
-- FUNCION 3: calcular_costo_envio
-- Costo base $3.500 + recargo por zona segun el primer digito del CP:
-- '3' (zona local) +0 ; '1' +1500 ; cualquier otro +3500.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calcular_costo_envio(p_codigo_postal VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    v_base CONSTANT DECIMAL := 3500;
BEGIN
    RETURN v_base + CASE LEFT(p_codigo_postal, 1)
                        WHEN '3' THEN 0
                        WHEN '1' THEN 1500
                        ELSE 3500
                    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ---------------------------------------------------------------------
-- PROCEDIMIENTO 1: pr_agregar_al_carrito
-- Agrega un producto al carrito (unico, 1:1) del usuario. Valida stock
-- disponible ANTES de reservar (no descuenta: el descuento real ocurre
-- recien al concretar la compra).
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_agregar_al_carrito(
    p_id_usuario INT,
    p_id_producto INT,
    p_cantidad INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_precio DECIMAL(10,2);
    v_stock_actual INT;
    v_id_carrito INT;
BEGIN
    SELECT precio, stock INTO v_precio, v_stock_actual
    FROM producto WHERE id_producto = p_id_producto;

    IF v_stock_actual < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %: disponible %, solicitado %',
            p_id_producto, v_stock_actual, p_cantidad;
    END IF;

    SELECT id_carrito INTO v_id_carrito
    FROM carrito WHERE id_usuario = p_id_usuario;

    IF v_id_carrito IS NULL THEN
        INSERT INTO carrito (id_usuario, total)
        VALUES (p_id_usuario, 0)
        RETURNING id_carrito INTO v_id_carrito;
    END IF;

    INSERT INTO linea_carrito (id_carrito, id_producto, cantidad, subtotal)
    VALUES (v_id_carrito, p_id_producto, p_cantidad, v_precio * p_cantidad)
    ON CONFLICT (id_carrito, id_producto)
    DO UPDATE SET cantidad = linea_carrito.cantidad + EXCLUDED.cantidad,
                  subtotal = linea_carrito.subtotal + EXCLUDED.subtotal;
    
END;
$$;


-- ---------------------------------------------------------------------
-- PROCEDIMIENTO 2: pr_concretar_compra
-- Convierte el carrito del usuario en una compra. 
--El código de cupón es opcional (por defecto NULL). 
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_concretar_compra(
    p_id_usuario INT,
    p_direccion_envio VARCHAR,
    p_codigo_cupon VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_carrito INT;
    v_id_compra INT;
    v_subtotal DECIMAL(10,2);
    v_descuento DECIMAL(10,2) := 0;
    v_total DECIMAL(10,2);
    v_id_cupon INT := NULL;
    v_porcentaje DECIMAL(5,2);
    v_costo_envio DECIMAL(10,2);
    v_cp VARCHAR(10);
    r RECORD;
BEGIN
    SELECT id_carrito, total INTO v_id_carrito, v_subtotal
    FROM carrito WHERE id_usuario = p_id_usuario;

    IF v_id_carrito IS NULL OR v_subtotal = 0 THEN
        RAISE EXCEPTION 'El usuario % no tiene productos en el carrito', p_id_usuario;
    END IF;

    FOR r IN
        SELECT lc.id_producto, lc.cantidad AS solicitado, p.stock AS disponible
        FROM linea_carrito lc JOIN producto p ON p.id_producto = lc.id_producto
        WHERE lc.id_carrito = v_id_carrito
    LOOP
        IF r.disponible < r.solicitado THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %: disponible %, solicitado %',
                r.id_producto, r.disponible, r.solicitado;
        END IF;
    END LOOP;


    IF p_codigo_cupon IS NOT NULL THEN
        SELECT id_cupon, porcentaje INTO v_id_cupon, v_porcentaje
        FROM cupon
        WHERE codigo = p_codigo_cupon AND usado = FALSE AND fecha_vencimiento > now();

        IF v_id_cupon IS NULL THEN
            RAISE EXCEPTION 'El cupon % no existe, ya fue usado o esta vencido', p_codigo_cupon;
        END IF;

        v_descuento := v_subtotal * (v_porcentaje / 100.0);
    END IF;

    -- Costo de envio calculado segun el CP del usuario (el cupon aplica
    -- solo sobre el subtotal, no sobre el envio).
    SELECT codigo_postal INTO v_cp FROM usuario WHERE id_usuario = p_id_usuario;
    v_costo_envio := calcular_costo_envio(v_cp);

    v_total := v_subtotal - v_descuento + v_costo_envio;

    INSERT INTO compra (id_usuario, subtotal, descuento, total, id_cupon)
    VALUES (p_id_usuario, v_subtotal, v_descuento, v_total, v_id_cupon)
    RETURNING id_compra INTO v_id_compra;

    INSERT INTO linea_compra (id_compra, id_producto, cantidad, precio_unitario, subtotal)
    SELECT v_id_compra, ic.id_producto, ic.cantidad,
           ic.subtotal / ic.cantidad, ic.subtotal
    FROM linea_carrito ic
    WHERE ic.id_carrito = v_id_carrito;

    INSERT INTO pago (id_compra, monto, estado_pago)
    VALUES (v_id_compra, v_total, 'PENDIENTE');

    INSERT INTO envio (id_compra, direccion_destino, costo)
    VALUES (v_id_compra, p_direccion_envio, v_costo_envio);

    IF v_id_cupon IS NOT NULL THEN
        UPDATE cupon SET usado = TRUE WHERE id_cupon = v_id_cupon;
    END IF;

    DELETE FROM linea_carrito WHERE id_carrito = v_id_carrito;
    UPDATE carrito SET total = 0 WHERE id_carrito = v_id_carrito;
END;
$$;


-- ---------------------------------------------------------------------
-- PROCEDIMIENTO 3: pr_gestion_stock
-- Repone stock de un producto por decisión del administrador. 
--Recibe el id del producto y la cantidad de unidades a sumar, ambos enteros.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_gestion_stock(
    p_id_producto INT,
    p_cantidad_a_sumar INT
)
LANGUAGE plpgsql
AS $$
DECLARE
BEGIN
    -- costo_unitario queda NULL: el costo real de reposicion no se conoce aca.
    INSERT INTO movimiento_stock (id_producto, tipo_movimiento, cantidad)
    VALUES (p_id_producto, 'INGRESO_ADMIN', p_cantidad_a_sumar);
END;
$$;


-- ---------------------------------------------------------------------
-- PROCEDIMIENTO 4: pr_destacar_producto
-- Marca (TRUE) o desmarca (FALSE) un producto como destacado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE pr_destacar_producto(
    p_id_producto INT,
    p_estado BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE producto SET destacado = p_estado WHERE id_producto = p_id_producto;
END;
$$;

