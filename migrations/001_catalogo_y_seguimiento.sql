ALTER TABLE productos
ADD COLUMN marca VARCHAR(120) NOT NULL DEFAULT 'NEXUS',
ADD COLUMN descripcion TEXT NULL,
ADD COLUMN imagen VARCHAR(255) NULL,
ADD COLUMN etiqueta VARCHAR(80) NOT NULL DEFAULT 'NUEVO',
ADD COLUMN precio_anterior DECIMAL(12, 2) NULL,
ADD COLUMN rating DECIMAL(2, 1) NOT NULL DEFAULT 4.8,
ADD COLUMN opiniones INT UNSIGNED NOT NULL DEFAULT 0,
ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT 'cyan',
ADD COLUMN especificaciones TEXT NULL;

ALTER TABLE compras
ADD COLUMN estado ENUM(
    'Procesando',
    'Preparando',
    'Enviado',
    'Entregado',
    'Cancelado'
) NOT NULL DEFAULT 'Procesando',
ADD COLUMN direccion_envio VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN metodo_pago VARCHAR(40) NOT NULL DEFAULT 'Contra entrega';

CREATE TABLE IF NOT EXISTS actividad (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NULL,
    accion VARCHAR(120) NOT NULL,
    detalle VARCHAR(255) NOT NULL DEFAULT '',
    creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_actividad_usuario_id (usuario_id),
    CONSTRAINT fk_actividad_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE = InnoDB;