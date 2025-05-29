from neo4j import GraphDatabase

class SistemaRecomendacion:
    """
    Sistema de recomendación musical basado en géneros y filtrado colaborativo.
    Usa una base de datos Neo4j para almacenar usuarios, géneros y relaciones entre ellos.
    """

    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def agregar_usuario(self, nombre, generos):
        with self.driver.session() as session:
            session.execute_write(self._crear_usuario_y_relaciones, nombre, generos)

    @staticmethod
    def _crear_usuario_y_relaciones(tx, nombre, generos):
        tx.run("MERGE (u:Usuario {nombre: $nombre})", nombre=nombre)

        for genero in generos:
            genero = genero.strip().lower()
            tx.run("MERGE (g:Genero {nombre: $genero})", genero=genero)
            tx.run("""
                MATCH (u:Usuario {nombre: $nombre}), (g:Genero {nombre: $genero})
                MERGE (u)-[:LE_GUSTA]->(g)
            """, nombre=nombre, genero=genero)

        for i in range(len(generos)):
            for j in range(i + 1, len(generos)):
                g1, g2 = sorted([generos[i].strip().lower(), generos[j].strip().lower()])
                
                # Crear relación si no existe (peso 0)
                tx.run("""
                    MERGE (g1:Genero {nombre: $g1})
                    MERGE (g2:Genero {nombre: $g2})
                    MERGE (g1)-[r:RELACIONADO_CON]-(g2)
                    ON CREATE SET r.peso = 0
                """, g1=g1, g2=g2)

                # Calcular cuántos usuarios distintos comparten ambos géneros
                result = tx.run("""
                    MATCH (u:Usuario)-[:LE_GUSTA]->(g1:Genero {nombre: $g1})
                          <-[:LE_GUSTA]-(u)-[:LE_GUSTA]->(g2:Genero {nombre: $g2})
                    RETURN COUNT(DISTINCT u) AS total
                """, g1=g1, g2=g2)

                total = result.single()["total"]
                if total >= 2:
                    tx.run("""
                        MATCH (g1:Genero {nombre: $g1})-[r:RELACIONADO_CON]-(g2:Genero {nombre: $g2})
                        SET r.peso = $peso
                    """, g1=g1, g2=g2, peso=total)

    def recomendar_genero(self, nombre_usuario):
        with self.driver.session() as session:
            result = session.run("""
                MATCH (u:Usuario {nombre: $nombre})-[:LE_GUSTA]->(g1)
                MATCH (g1)-[r:RELACIONADO_CON]-(g2)
                WHERE NOT (u)-[:LE_GUSTA]->(g2)
                RETURN g2.nombre AS genero, SUM(r.peso) AS score
                ORDER BY score DESC
                LIMIT 1
            """, nombre=nombre_usuario)

            record = result.single()
            if record:
                return f"Te recomendamos: {record['genero'].title()} (score: {record['score']})"
            else:
                return "No se encontraron recomendaciones."
