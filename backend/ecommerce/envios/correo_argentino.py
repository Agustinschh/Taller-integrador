import re

def obtener_zona_correo_argentino(codigo_postal_str, cp_origen=3260):
    """
    Determina la zona tarifaria de Correo Argentino y la provincia
    a partir del código postal de destino, considerando origen en CP 3260 (Entre Ríos).
    """
    if not codigo_postal_str:
        return 'desconocido', 'Argentina'
    
    numeros = re.findall(r'\d+', str(codigo_postal_str))
    if not numeros:
        return 'desconocido', 'Argentina'
    
    try:
        cp = int(numeros[0])
    except ValueError:
        return 'desconocido', 'Argentina'

    # 1. Local / Provincial (Entre Ríos: 3100 - 3299)
    if 3100 <= cp <= 3299:
        if cp == 3260:
            return 'local', 'Concepción del Uruguay (Local)'
        return 'local', 'Entre Ríos (Provincial)'

    # 2. Regional cercano (Santa Fe: 2000 - 3099, CABA / GBA: 1000 - 1899, Corrientes: 3400 - 3499, Buenos Aires Norte: 1900 - 2999 y 6000 - 7000)
    if (2000 <= cp <= 3099) or (1000 <= cp <= 1899) or (3400 <= cp <= 3499) or (1900 <= cp <= 2999) or (6000 <= cp <= 7000):
        return 'regional', 'Región Litoral / Buenos Aires / CABA'

    # 3. Nacional 1 (Córdoba: 5000 - 5999, Cuyo: 5400 - 5799, Misiones/Chaco/Formosa: 3300 - 3799, La Pampa / Sur Bs As: 6200 - 6399, 7100 - 8299)
    if (5000 <= cp <= 5999) or (5400 <= cp <= 5799) or (3300 <= cp <= 3399) or (3500 <= cp <= 3799) or (6200 <= cp <= 6399) or (7100 <= cp <= 8299):
        return 'nacional_1', 'Región Centro / Cuyo / NEA'

    # 4. Nacional 2 (NOA: 4000 - 4799, 5300 - 5399; Patagonia: 8300 - 9499)
    if (4000 <= cp <= 4799) or (5300 <= cp <= 5399) or (8300 <= cp <= 9499):
        return 'nacional_2', 'Región NOA / Patagonia'

    return 'regional', 'Argentina'


# Tarifario Oficial Base de Paquetería Correo Argentino (ARS)
TARIFAS_CORREO_ARGENTINO = {
    'local': {
        'domicilio': 4850,
        'sucursal': 3600,
        'tiempo_domicilio': '1 a 3 días hábiles',
        'tiempo_sucursal': '1 a 2 días hábiles',
    },
    'regional': {
        'domicilio': 6200,
        'sucursal': 4900,
        'tiempo_domicilio': '2 a 4 días hábiles',
        'tiempo_sucursal': '2 a 3 días hábiles',
    },
    'nacional_1': {
        'domicilio': 7400,
        'sucursal': 5800,
        'tiempo_domicilio': '3 a 5 días hábiles',
        'tiempo_sucursal': '2 a 4 días hábiles',
    },
    'nacional_2': {
        'domicilio': 9200,
        'sucursal': 7300,
        'tiempo_domicilio': '4 a 7 días hábiles',
        'tiempo_sucursal': '3 a 6 días hábiles',
    },
    'desconocido': {
        'domicilio': 6500,
        'sucursal': 5000,
        'tiempo_domicilio': '2 a 5 días hábiles',
        'tiempo_sucursal': '2 a 4 días hábiles',
    }
}


def calcular_cotizacion_correo_argentino(codigo_postal, subtotal_carrito=0, monto_envio_gratis=50000):
    """
    Genera las opciones de envío disponibles para el cliente
    según su código postal y monto de compra.
    """
    zona_id, region_nombre = obtener_zona_correo_argentino(codigo_postal)
    tarifas_zona = TARIFAS_CORREO_ARGENTINO.get(zona_id, TARIFAS_CORREO_ARGENTINO['desconocido'])

    aplica_envio_gratis = subtotal_carrito >= monto_envio_gratis and monto_envio_gratis > 0

    costo_domicilio = 0 if aplica_envio_gratis else tarifas_zona['domicilio']
    costo_sucursal = 0 if aplica_envio_gratis else tarifas_zona['sucursal']

    opciones = [
        {
            'id': 'correo_domicilio',
            'empresa': 'Correo Argentino',
            'nombre': 'Correo Argentino - Envío a Domicilio',
            'tipo': 'delivery',
            'costo': costo_domicilio,
            'costo_original': tarifas_zona['domicilio'],
            'es_gratis': aplica_envio_gratis,
            'tiempo_entrega': tarifas_zona['tiempo_domicilio'],
            'descripcion': f'Entrega directa en tu domicilio ({region_nombre})',
            'icono': 'truck'
        },
        {
            'id': 'correo_sucursal',
            'empresa': 'Correo Argentino',
            'nombre': 'Correo Argentino - Retiro en Sucursal',
            'tipo': 'sucursal',
            'costo': costo_sucursal,
            'costo_original': tarifas_zona['sucursal'],
            'es_gratis': aplica_envio_gratis,
            'tiempo_entrega': tarifas_zona['tiempo_sucursal'],
            'descripcion': f'Retiro en la sucursal de Correo Argentino más cercana ({region_nombre})',
            'icono': 'building'
        },
        {
            'id': 'retiro_tienda',
            'empresa': 'Local',
            'nombre': 'Retiro en Tienda / Local',
            'tipo': 'retiro',
            'costo': 0,
            'costo_original': 0,
            'es_gratis': True,
            'tiempo_entrega': 'Inmediato (Coordinar horario)',
            'descripcion': 'Retirás tu compra directamente en nuestro punto de entrega.',
            'icono': 'store'
        }
    ]

    return {
        'codigo_postal': codigo_postal,
        'zona': zona_id,
        'region': region_nombre,
        'subtotal_compra': subtotal_carrito,
        'monto_envio_gratis': monto_envio_gratis,
        'envio_gratis_activo': aplica_envio_gratis,
        'opciones': opciones
    }
