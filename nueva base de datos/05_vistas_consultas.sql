-- =====================================================================
-- 05_vistas_consultas.sql
-- Crea las dos vistas (vista_reporte_ventas y vista_inventario_critico) 
-- =====================================================================

-- ---------------------------------------------------------------------
-- VISTA 1: Reporte de ventas detallado
-- Consolida compra + usuario + producto + pago en una sola estructura.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_reporte_ventas AS
SELECT
    c.id_compra,
    c.fecha AS fecha_compra,
    u.nombre AS nombre_usuario,
    u.apellido AS apellido_usuario,
    p.nombre_producto,
    lc.cantidad,
    lc.precio_unitario,
    lc.subtotal AS monto_linea,
    pa.metodo_pago,
    pa.estado_pago
FROM compra c
JOIN usuario u ON u.id_usuario = c.id_usuario
JOIN linea_compra lc ON lc.id_compra = c.id_compra
JOIN producto p ON p.id_producto = lc.id_producto
JOIN pago pa ON pa.id_compra = c.id_compra;

-- ---------------------------------------------------------------------
-- VISTA 2: Inventario critico
-- Productos agotados o con pocas unidades (<= 3), segun el stock
-- cache mantenido por el trigger de movimiento_stock.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vista_inventario_critico AS
SELECT
    id_producto,
    nombre_producto,
    stock,
    CASE
        WHEN stock = 0 THEN 'AGOTADO'
        WHEN stock <= 3 THEN 'NIVEL BAJO'
        ELSE 'OK'
    END AS estado_stock
FROM producto
WHERE stock <= 3;

-- ---------------------------------------------------------------------
-- Consultas de interes de ejemplo
-- ---------------------------------------------------------------------

-- Ranking de productos mas vendidos
SELECT p.id_producto, p.nombre_producto, SUM(lc.cantidad) AS unidades_vendidas
FROM linea_compra lc
JOIN producto p ON p.id_producto = lc.id_producto
GROUP BY p.id_producto, p.nombre_producto
ORDER BY unidades_vendidas DESC;

-- Historial de compras de un usuario puntual
SELECT * FROM vista_reporte_ventas WHERE nombre_usuario = 'Juan' AND apellido_usuario = 'Fernandez';

-- Trazabilidad de stock de un producto (auditoria via movimiento_stock)
SELECT * FROM movimiento_stock WHERE id_producto = 1 ORDER BY fecha_movimiento;

