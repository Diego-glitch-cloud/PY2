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

        // Recalcular relaciones SIMILAR entre géneros
        await session.run(`MATCH ()-[s:SIMILAR]-() DELETE s`);

        await session.run(`
            MATCH (u:User)-[:LIKES]->(g1:Genre)
            MATCH (u)-[:LIKES]->(g2:Genre)
            WHERE id(g1) < id(g2)
            MERGE (g1)-[s:SIMILAR]-(g2)
            ON CREATE SET s.weight = 1
            ON MATCH SET s.weight = s.weight + 1
        `);


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
            genres: record.get('genres') || []
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
        // Obtener géneros del usuario antes de eliminarlo
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

        // Recalcular relaciones SIMILAR
        await session.run(`MATCH ()-[s:SIMILAR]-() DELETE s`);

        await session.run(`
            MATCH (u:User)-[:LIKES]->(g1:Genre)
            MATCH (u)-[:LIKES]->(g2:Genre)
            WHERE id(g1) < id(g2)
            MERGE (g1)-[s:SIMILAR]-(g2)
            ON CREATE SET s.weight = 1
            ON MATCH SET s.weight = s.weight + 1
        `);

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



// Obtener recomendaciones basadas en usuarios similares
app.get('/api/recommendations/:name', async (req, res) => {
    if (!driver) return res.status(400).json({ error: 'No hay conexión activa con Neo4j' });

    const userName = req.params.name;
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (target:User {name: $userName})-[:LIKES]->(g:Genre)
            WITH target, collect(g) AS targetGenres
            MATCH (other:User)-[:LIKES]->(shared:Genre)
            WHERE other.name <> $userName AND shared IN targetGenres
            WITH target, other
            MATCH (other)-[:LIKES]->(rec:Genre)
            WHERE NOT (target)-[:LIKES]->(rec)
            RETURN rec.name AS recommendation, count(*) AS score
            ORDER BY score DESC
            LIMIT 5
        `, { userName });


        const recommendations = result.records.map(record => ({
            genre: record.get('recommendation'),
            score: record.get('score').toInt()
        }));

        res.json({ recommendedGenres: recommendations });

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
    console.log(`  Servidor corriendo en http://localhost:${port}`);
    console.log('  Endpoints disponibles:');
    console.log('  POST /api/connect - Conectar a Neo4j');
    console.log('  POST /api/disconnect - Desconectar de Neo4j');
    console.log('  POST /api/users - Agregar usuario');
    console.log('  GET  /api/users - Obtener usuarios y géneros');
    console.log('  DELETE /api/users/:name - Eliminar usuario');
    console.log('  GET  /api/recommendations/:name - Obtener recomendaciones');
});
