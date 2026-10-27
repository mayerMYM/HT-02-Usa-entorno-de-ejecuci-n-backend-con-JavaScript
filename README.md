# Tareita.pe — tienda full stack

Aplicacion de tienda de hardware con React y Vite en frontend/, y API REST con Express y MySQL en la raiz del repositorio.

## Preparar MySQL

1. Inicia MySQL desde XAMPP.
2. Importa database.sql en phpMyAdmin para crear el esquema inicial tienda_electronica.
3. Configura las credenciales del backend en .env a partir de .env.example. Cambia JWT_SECRET por un valor privado y largo.

Si ya existe una base de datos anterior, usa el migrador para aplicar los cambios de esquema sin volver a importar el SQL inicial:

    npm run migrate

## Instalar dependencias

En la raiz del repositorio:

    npm install

Dentro de frontend/:

    cd frontend
    npm install

## Ejecutar localmente

En una terminal, desde la raiz, inicia Express:

    npm start

En otra terminal, inicia Vite desde frontend/:

    cd frontend
    npm run dev

Vite muestra la direccion local para abrir en el navegador, normalmente http://localhost:5173. El backend usa http://localhost:3000 y la base URL del frontend se configura en frontend/.env.local:

    VITE_API_URL=http://localhost:3000/api

El frontend carga catalogo, sesiones, pedidos y administracion mediante peticiones HTTP a Express. .env, .env.local, node_modules/ y dist/ no se incluyen en Git.