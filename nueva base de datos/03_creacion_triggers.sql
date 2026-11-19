-- =====================================================================
-- 03_creacion_triggers.sql
-- Define los 7 triggers
-- =====================================================================

-- ---------------------------------------------------------------------
-- TRIGGER 1 — Tabla: movimiento_stock — BEFORE INSERT
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aplicar_movimiento_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_actual INT;
    v_nuevo_stock  INT;
    v_signo        INT;
BEGIN
    SELECT stock INTO v_stock_actual
    FROM producto
    WHERE id_producto = NEW.id_producto
    FOR UPDATE;

    IF NEW.tipo_movimiento = 'VENTA' THEN
        v_signo := -1;
    ELSE

        v_signo := 1;
    END IF;

    v_nuevo_stock := v_stock_actual + (v_signo * NEW.cantidad);

    IF v_nuevo_stock < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto %: stock actual %, se intento descontar %',
            NEW.id_producto, v_stock_actual, NEW.cantidad;
    END IF;

    UPDATE producto SET stock = v_nuevo_stock WHERE id_producto = NEW.id_producto;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aplicar_movimiento_stock
BEFORE INSERT ON movimiento_stock
FOR EACH ROW
EXECUTE FUNCTION fn_aplicar_movimiento_stock();


-- ---------------------------------------------------------------------
-- TRIGGER 2 — Tabla: linea_compra — AFTER INSERT
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_registrar_venta_stock()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO movimiento_stock (id_producto, id_compra, tipo_movimiento, cantidad, costo_unitario)
    VALUES (NEW.id_producto, NEW.id_compra, 'VENTA', NEW.cantidad, NEW.precio_unitario);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registrar_venta_stock
AFTER INSERT ON linea_compra
FOR EACH ROW
EXECUTE FUNCTION fn_registrar_venta_stock();


-- ---------------------------------------------------------------------
-- TRIGGER 3 — Tabla: pago — AFTER UPDATE 
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_reponer_stock_por_cancelacion()
RETURNS TRIGGER AS $$
DECLARE
    lc RECORD;
BEGIN
    IF NEW.estado_pago = 'CANCELADO' AND OLD.estado_pago IS DISTINCT FROM 'CANCELADO' THEN
        FOR lc IN
            SELECT id_producto, cantidad, precio_unitario
            FROM linea_compra
            WHERE id_compra = NEW.id_compra
        LOOP
            INSERT INTO movimiento_stock (id_producto, id_compra, tipo_movimiento, cantidad, costo_unitario)
            VALUES (lc.id_producto, NEW.id_compra, 'DEVOLUCION_CANCELACION', lc.cantidad, lc.precio_unitario);
        END LOOP;
    END IF;
   
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reponer_stock_por_cancelacion
AFTER UPDATE OF estado_pago ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_reponer_stock_por_cancelacion();


-- ---------------------------------------------------------------------
-- TRIGGER 4 — Tabla: linea_compra — BEFORE UPDATE OR DELETE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bloquear_edicion_linea_compra()
RETURNS TRIGGER AS $$
DECLARE
    v_estado estado_pago_enum;
BEGIN
    SELECT estado_pago INTO v_estado
    FROM pago
    WHERE id_compra = OLD.id_compra;

    IF v_estado = 'APROBADO' THEN
        RAISE EXCEPTION 'No se puede modificar/eliminar la linea de compra: la compra % ya tiene un pago aprobado',
            OLD.id_compra;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloquear_edicion_linea_compra
BEFORE UPDATE OR DELETE ON linea_compra
FOR EACH ROW
EXECUTE FUNCTION fn_bloquear_edicion_linea_compra();


-- ---------------------------------------------------------------------
-- TRIGGER 5 — Tabla: linea_carrito — AFTER INSERT OR UPDATE OR DELETE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_total_carrito()
RETURNS TRIGGER AS $$
DECLARE
    v_id_carrito INT := COALESCE(NEW.id_carrito, OLD.id_carrito);
BEGIN
    UPDATE carrito
    SET total = COALESCE((SELECT SUM(subtotal) FROM linea_carrito WHERE id_carrito = v_id_carrito), 0)
    WHERE id_carrito = v_id_carrito;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_total_carrito
AFTER INSERT OR UPDATE OR DELETE ON linea_carrito
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_total_carrito();


-- ---------------------------------------------------------------------
-- TRIGGER 6 — Tabla: pago — BEFORE INSERT
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_pago_no_supera_total()
RETURNS TRIGGER AS $$
DECLARE
    v_total_compra NUMERIC(10,2);
BEGIN
    SELECT total INTO v_total_compra FROM compra WHERE id_compra = NEW.id_compra;

    IF NEW.monto > v_total_compra THEN
        RAISE EXCEPTION 'El pago (%) no puede exceder el total de la compra (%)', NEW.monto, v_total_compra;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_pago_no_supera_total
BEFORE INSERT ON pago
FOR EACH ROW
EXECUTE FUNCTION fn_validar_pago_no_supera_total();


-- ---------------------------------------------------------------------
-- TRIGGER 7 — Tabla: comentario — BEFORE INSERT
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validar_comentario_compra_previa()
RETURNS TRIGGER AS $$
DECLARE
    v_id_compra_especifica INT;
BEGIN
    SELECT c.id_compra INTO v_id_compra_especifica
    FROM linea_compra lc
    JOIN compra c ON c.id_compra = lc.id_compra
    WHERE c.id_usuario = NEW.id_usuario
      AND lc.id_producto = NEW.id_producto
    LIMIT 1;

    IF v_id_compra_especifica IS NULL THEN
        RAISE EXCEPTION 'El usuario % no puede comentar el producto %: no registra una compra de ese producto',
            NEW.id_usuario, NEW.id_producto;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_comentario_compra_previa
BEFORE INSERT ON comentario
FOR EACH ROW
EXECUTE FUNCTION fn_validar_comentario_compra_previa();


