// server.js - Backend Node.js para conectar con Neo4j
const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Variables globales
let driver = null;
let session = null;

// Función para conectar a Neo4j
async function connectToNeo4j(uri, username, password) {
    try {
        if (driver) {
            await driver.close();
        }

        driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

        // Verificar conexión
        await driver.verifyConnectivity();
        session = driver.session();

        console.log('✅ Conectado a Neo4j exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a Neo4j:', error);
        throw error;
    }
}

// Rutas de la API

// 1. Conectar a Neo4j
app.post('/api/connect', async (req, res) => {
    try {
        const { uri, username, password } = req.body;

        if (!uri || !username || !password) {
            return res.status(400).json({ error: 'URI, username y password son requeridos' });
        }

        await connectToNeo4j(uri, username, password);
        res.json({ success: true, message: 'Conectado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Desconectar de Neo4j
app.post('/api/disconnect', async (req, res) => {
    try {
        if (session) {
            await session.close();
            session = null;
        }
        if (driver) {
            await driver.close();
            driver = null;
        }
        res.json({ success: true, message: 'Desconectado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Agregar usuario
app.post('/api/users', async (req, res) => {
    try {
        if (!session) {
            return res.status(400).json({ error: 'No hay conexión activa con Neo4j' });
        }

        const { name, genres } = req.body;

        if (!name || !genres || !Array.isArray(genres)) {
            return res.status(400).json({ error: 'Nombre y géneros son requeridos' });
        }

        // Verificar si el usuario ya existe
        const checkResult = await session.run(
            'MATCH (u:User {name: $name}) RETURN u',
            { name }
        );

        if (checkResult.records.length > 0) {
            return res.status(409).json({ error: 'El usuario ya existe' });
        }

        // Crear usuario y géneros
        const query = `
            CREATE (u:User {name: $name})
            WITH u
            UNWIND $genres AS genre
            MERGE (g:Genre {name: genre})
            CREATE (u)-[:LIKES]->(g)
            RETURN u.name as name, collect(g.name) as genres
        `;

        const result = await session.run(query, { name, genres });

        if (result.records.length > 0) {
            const record = result.records[0];
            res.json({
                success: true,
                user: {
                    name: record.get('name'),
                    genres: record.get('genres')
                }
            });
        } else {
            res.status(500).json({ error: 'Error al crear usuario' });
        }

    } catch (error) {
        console.error('Error agregando usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Cerrar conexiones al terminar el proceso
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando conexiones...');

    if (session) {
        await session.close();
    }

    if (driver) {
        await driver.close();
    }

    console.log('✅ Conexiones cerradas');
    process.exit(0);
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
    console.log('📋 Endpoints disponibles:');
    console.log('  POST /api/connect - Conectar a Neo4j');
    console.log('  POST /api/disconnect - Desconectar de Neo4j');
    console.log('  POST /api/users - Agregar usuario');
    console.log('  GET  /api/users - Obtener usuarios');
    console.log('  DELETE /api/users/:name - Eliminar usuario');
    console.log('  GET  /api/recommendations/:name - Obtener recomendaciones');
    console.log('  POST /api/init-sample-data - Crear datos de ejemplo');
});

module.exports = app;
