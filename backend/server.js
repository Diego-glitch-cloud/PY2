// server.js - Backend Node.js para conectar con Neo4j

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

let driver = null;

// Función para conectar a Neo4j
async function connectToNeo4j(uri, username, password) {
    try {
        if (driver) await driver.close();

        driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
        await driver.verifyConnectivity();

        console.log('✅ Conectado a Neo4j exitosamente');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a Neo4j:', error);
        throw error;
    }
}

// Conectar
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

// Desconectar
app.post('/api/disconnect', async (req, res) => {
    try {
        if (driver) {
            await driver.close();
            driver = null;
        }
        res.json({ success: true, message: 'Desconectado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Agregar usuario
app.post('/api/users', async (req, res) => {
    if (!driver) return res.status(400).json({ error: 'No hay conexión activa con Neo4j' });

    const { name, genres } = req.body;
    if (!name || !genres || !Array.isArray(genres)) {
        return res.status(400).json({ error: 'Nombre y géneros son requeridos' });
    }

    const session = driver.session();

    try {
        const checkResult = await session.run('MATCH (u:User {name: $name}) RETURN u', { name });
        if (checkResult.records.length > 0) {
            return res.status(409).json({ error: 'El usuario ya existe' });
        }

        const query = `
            CREATE (u:User {name: $name})
            WITH u
            UNWIND $genres AS genre
            MERGE (g:Genre {name: genre})
            CREATE (u)-[:LIKES]->(g)
            RETURN u.name as name, collect(g.name) as genres
        `;

        const result = await session.run(query, { name, genres });
        const record = result.records[0];

        res.json({
            success: true,
            user: {
                name: record.get('name'),
                genres: record.get('genres')
            }
        });

    } catch (error) {
        console.error('Error agregando usuario:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// Obtener usuarios y sus géneros
app.get('/api/users', async (req, res) => {
    if (!driver) return res.status(400).json({ error: 'No hay conexión activa con Neo4j' });

    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (u:User)
            OPTIONAL MATCH (u)-[:LIKES]->(g:Genre)
            RETURN u.name AS name, collect(g.name) AS genres
            ORDER BY name
        `);

        const users = result.records.map(record => ({
            name: record.get('name'),
            genres: record.get('genres').filter(genre => genre !== null) // Filtrar valores null
        }));

        res.json({ users });

    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// Eliminar usuario
app.delete('/api/users/:name', async (req, res) => {
    if (!driver) return res.status(400).json({ error: 'No hay conexión activa con Neo4j' });

    const userName = req.params.name;
    const session = driver.session();

    try {
        // Primero obtenemos los géneros del usuario antes de eliminarlo
        const userResult = await session.run(`
            MATCH (u:User {name: $userName})
            OPTIONAL MATCH (u)-[:LIKES]->(g:Genre)
            RETURN u.name AS name, collect(g.name) AS genres
        `, { userName });

        if (userResult.records.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const userRecord = userResult.records[0];
        const deletedUser = {
            name: userRecord.get('name'),
            genres: userRecord.get('genres').filter(genre => genre !== null)
        };

        // Eliminar el usuario y sus relaciones
        await session.run(`
            MATCH (u:User {name: $userName})
            DETACH DELETE u
        `, { userName });

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente',
            deletedUser: deletedUser
        });

    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// Obtener recomendaciones
app.get('/api/recommendations/:name', async (req, res) => {
    if (!driver) return res.status(400).json({ error: 'No hay conexión activa con Neo4j' });

    const userName = req.params.name;
    const session = driver.session();

    try {
        // Verificar si el usuario existe y obtener sus géneros
        const userCheckResult = await session.run(`
            MATCH (u:User {name: $userName})
            OPTIONAL MATCH (u)-[:LIKES]->(g:Genre)
            RETURN u.name AS name, collect(g.name) AS userGenres
        `, { userName });

        if (userCheckResult.records.length === 0) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado',
                userName
            });
        }

        const userRecord = userCheckResult.records[0];
        const userGenres = userRecord.get('userGenres').filter(genre => genre !== null && genre !== '');

        if (userGenres.length === 0) {
            return res.json({
                userName,
                userGenres: [],
                recommendedGenres: [],
                message: 'El usuario no tiene géneros registrados',
                totalUserGenres: 0,
                totalRecommendations: 0
            });
        }

        // Obtener recomendaciones basadas en usuarios con géneros similares
        const recommendationResult = await session.run(`
            MATCH (targetUser:User {name: $userName})-[:LIKES]->(userGenre:Genre)
            WITH targetUser, collect(userGenre) AS targetUserGenres
            
            MATCH (otherUser:User)-[:LIKES]->(sharedGenre:Genre)
            WHERE otherUser <> targetUser AND sharedGenre IN targetUserGenres
            WITH targetUser, targetUserGenres, otherUser, count(sharedGenre) AS sharedCount
            WHERE sharedCount > 0
            
            MATCH (otherUser)-[:LIKES]->(recommendedGenre:Genre)
            WHERE NOT recommendedGenre IN targetUserGenres
            RETURN collect(DISTINCT recommendedGenre.name) AS recommendedGenres
        `, { userName });

        let recommendedGenres = [];
        if (recommendationResult.records.length > 0) {
            const recResult = recommendationResult.records[0].get('recommendedGenres');
            recommendedGenres = recResult ? recResult.filter(genre => genre !== null && genre !== '') : [];
        }

        res.json({
            userName,
            userGenres,
            recommendedGenres,
            totalUserGenres: userGenres.length,
            totalRecommendations: recommendedGenres.length,
            message: recommendedGenres.length > 0 
                ? `Se encontraron ${recommendedGenres.length} géneros recomendados`
                : 'No se encontraron nuevos géneros para recomendar'
        });

    } catch (error) {
        console.error('Error obteniendo recomendación:', error);
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Cerrar conexión al salir
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando conexiones...');
    if (driver) await driver.close();
    console.log('✅ Conexiones cerradas');
    process.exit(0);
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log('📋 Endpoints disponibles:');
    console.log('  POST /api/connect - Conectar a Neo4j');
    console.log('  POST /api/disconnect - Desconectar de Neo4j');
    console.log('  POST /api/users - Agregar usuario');
    console.log('  GET  /api/users - Obtener usuarios y géneros');
    console.log('  DELETE /api/users/:name - Eliminar usuario');
    console.log('  GET  /api/recommendations/:name - Obtener recomendaciones');
});


module.exports = app;