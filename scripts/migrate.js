require("dotenv").config();

const mysql = require("mysql2/promise");

const schemaChanges = {
  productos: {
    marca: "VARCHAR(120) NOT NULL DEFAULT 'NEXUS'",
    descripcion: "TEXT NULL",
    imagen: "VARCHAR(255) NULL",
    etiqueta: "VARCHAR(80) NOT NULL DEFAULT 'NUEVO'",
    precio_anterior: "DECIMAL(12, 2) NULL",
    rating: "DECIMAL(2, 1) NOT NULL DEFAULT 4.8",
    opiniones: "INT UNSIGNED NOT NULL DEFAULT 0",
    color: "VARCHAR(20) NOT NULL DEFAULT 'cyan'",
    especificaciones: "TEXT NULL",
  },
  compras: {
    estado:
      "ENUM('Procesando', 'Preparando', 'Enviado', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Procesando'",
    direccion_envio: "VARCHAR(255) NOT NULL DEFAULT ''",
    metodo_pago: "VARCHAR(40) NOT NULL DEFAULT 'Contra entrega'",
  },
};

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tienda_electronica",
  });

  try {
    const [idColumns] = await connection.query(
      "SELECT TABLE_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'id' AND TABLE_NAME IN ('usuarios', 'productos')",
    );
    const integerTypeFor = (table) => {
      const column = idColumns.find((item) => item.TABLE_NAME === table);
      if (
        !column ||
        !/^int(?:\(\d+\))?( unsigned)?$/i.test(column.COLUMN_TYPE)
      ) {
        throw new Error(`No se pudo detectar un ID INT válido en ${table}`);
      }
      return /unsigned/i.test(column.COLUMN_TYPE) ? "INT UNSIGNED" : "INT";
    };
    const userIdType = integerTypeFor("usuarios");
    const productIdType = integerTypeFor("productos");

    await connection.query(`CREATE TABLE IF NOT EXISTS compras (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id ${userIdType} NOT NULL,
      total DECIMAL(12, 2) NOT NULL,
      estado ENUM('Procesando', 'Preparando', 'Enviado', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Procesando',
      direccion_envio VARCHAR(255) NOT NULL DEFAULT '',
      metodo_pago VARCHAR(40) NOT NULL DEFAULT 'Contra entrega',
      creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_compras_usuario_id (usuario_id),
      CONSTRAINT fk_compras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB`);

    await connection.query(`CREATE TABLE IF NOT EXISTS detalle_compra (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      compra_id INT UNSIGNED NOT NULL,
      producto_id ${productIdType} NOT NULL,
      cantidad INT UNSIGNED NOT NULL,
      precio_unitario DECIMAL(12, 2) NOT NULL,
      PRIMARY KEY (id),
      KEY idx_detalle_compra_compra_id (compra_id),
      KEY idx_detalle_compra_producto_id (producto_id),
      CONSTRAINT fk_detalle_compra_compra FOREIGN KEY (compra_id) REFERENCES compras (id) ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT fk_detalle_compra_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB`);

    await connection.query(`CREATE TABLE IF NOT EXISTS actividad (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      usuario_id ${userIdType} NULL,
      accion VARCHAR(120) NOT NULL,
      detalle VARCHAR(255) NOT NULL DEFAULT '',
      creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_actividad_usuario_id (usuario_id),
      CONSTRAINT fk_actividad_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB`);

    const [existingColumns] = await connection.query(
      "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?, ?)",
      Object.keys(schemaChanges),
    );

    for (const [table, columns] of Object.entries(schemaChanges)) {
      const existing = new Set(
        existingColumns
          .filter((column) => column.TABLE_NAME === table)
          .map((column) => column.COLUMN_NAME),
      );
      const missing = Object.entries(columns).filter(
        ([name]) => !existing.has(name),
      );
      if (missing.length === 0) continue;
      const additions = missing
        .map(([name, definition]) => `ADD COLUMN \`${name}\` ${definition}`)
        .join(", ");
      await connection.query(`ALTER TABLE \`${table}\` ${additions}`);
      console.log(`${table}: añadidas ${missing.length} columnas`);
    }
    console.log("Migración completada");
  } finally {
    await connection.end();
  }
}

migrate().catch((error) => {
  console.error(`No se pudo completar la migración: ${error.message}`);
  process.exitCode = 1;
});
