CREATE DATABASE IF NOT EXISTS tienda_electronica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tienda_electronica;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS productos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(180) NOT NULL,
    categoria VARCHAR(120) NOT NULL,
    precio DECIMAL(12, 2) NOT NULL,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    marca VARCHAR(120) NOT NULL DEFAULT 'NEXUS',
    descripcion TEXT NULL,
    imagen VARCHAR(255) NULL,
    etiqueta VARCHAR(80) NOT NULL DEFAULT 'NUEVO',
    precio_anterior DECIMAL(12, 2) NULL,
    rating DECIMAL(2, 1) NOT NULL DEFAULT 4.8,
    opiniones INT UNSIGNED NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT 'cyan',
    especificaciones TEXT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS compras (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT UNSIGNED NOT NULL,
    total DECIMAL(12, 2) NOT NULL,
    estado ENUM(
        'Procesando',
        'Preparando',
        'Enviado',
        'Entregado',
        'Cancelado'
    ) NOT NULL DEFAULT 'Procesando',
    direccion_envio VARCHAR(255) NOT NULL,
    metodo_pago VARCHAR(40) NOT NULL,
    creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_compras_usuario_id (usuario_id),
    CONSTRAINT fk_compras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS detalle_compra (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    compra_id INT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_detalle_compra_compra_id (compra_id),
    KEY idx_detalle_compra_producto_id (producto_id),
    CONSTRAINT fk_detalle_compra_compra FOREIGN KEY (compra_id) REFERENCES compras (id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE = InnoDB;

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