class Genero:
    """
    clase que identifica el género musical de una canción.
    Permite crear géneros, normalizarlos, validarlos y compararlos.
    También permite crear géneros desde una lista y obtener géneros válidos.
    """
    
    GENEROS_VALIDOS = {
        'rock', 'pop', 'electronica', 'jazz', 'clasica', 'rap', 'k-pop', 'blues', 'indie', 'hip hop', 'bossa nova', 'trap', 'reggaeton'
    }
    
    def __init__(self, nombre):
        """
        Crea un género nuevo.
        
        nombre: el nombre del género (de variable string).
        """
        if not nombre or not isinstance(nombre, str):
            raise ValueError("El nombre del género no puede estar vacío y debe ser un string")
        
        self.nombre_original = nombre
        self.nombre = self._normalizar_nombre(nombre)
    
    def _normalizar_nombre(self, nombre):
        """
        Normaliza el nombre del genero (privado).
        
        nombre: nombre original.
        
        haciendo que devuelva el nombre en minúsculas y sin espacios extra.
        """
        return nombre.strip().lower()
    
    @classmethod
    def crear_desde_lista(cls, lista_nombres):
        """
        Crea varios géneros desde una lista de nombres.
        
        lista_nombres: lista de strings.
        
        Devuelve una lista de objetos Genero.
        """
        return [cls(nombre) for nombre in lista_nombres if nombre and isinstance(nombre, str)]
    
    def es_genero_valido(self):
        """
        Dice si el género es válido, en dado caso este no lo sea devuelve False.
        """
        return self.nombre in self.GENEROS_VALIDOS
    
    def obtener_nombre_capitalizado(self):
        """
        Devuelve el nombre con la primera letra en mayúscula.
        """
        return self.nombre.capitalize()
    
    def obtener_nombre_titulo(self):
        """
        Devuelve el nombre con cada palabra en mayúscula.
        """
        return self.nombre.title()
    
    def es_similar_a(self, otro_genero):
        """
        Dice si este género es igual a otro, dependiendo de este devolverá un true o un false.
        
        otro_genero: otro Genero o string.
        """
        if isinstance(otro_genero, Genero):
            return self.nombre == otro_genero.nombre
        elif isinstance(otro_genero, str):
            return self.nombre == otro_genero.strip().lower()
        return False
    
    @staticmethod
    def obtener_generos_disponibles():
        """
        Devuelve la lista de géneros válidos.
        """
        return sorted(list(Genero.GENEROS_VALIDOS))
    
    @staticmethod
    def validar_nombre_genero(nombre):
        """
        Dice si un nombre es válido sin crear un objeto.
        
        nombre: string a validar.
        
        Devuelve True o False.
        """
        if not nombre or not isinstance(nombre, str):
            return False
        nombre_normalizado = nombre.strip().lower()
        return nombre_normalizado in Genero.GENEROS_VALIDOS
    
    def __str__(self):
        """
        Muestra el género de forma sencilla.
        """
        return self.obtener_nombre_capitalizado()
    
    def __repr__(self):
        """
        Muestra el género para debugging.
        """
        return f"Genero(nombre='{self.nombre}')"
    
    def __eq__(self, other):
        """
        Compara dos géneros.
        
        other: otro Genero o string.
        
        Devuelve True o False.
        """
        if isinstance(other, Genero):
            return self.nombre == other.nombre
        elif isinstance(other, str):
            return self.nombre == other.strip().lower()
        return False
    
    def __hash__(self):
        """
        Permite usar Genero en sets y diccionarios.
        """
        return hash(self.nombre)
    
    def __lt__(self, other):
        """
        Permite ordenar géneros alfabéticamente.
        
        other: se refiere a otro Genero del cuál se está hablando.
        
        En dado caso de que este nombre vaya antes alfabéticamente que el otro, devuelve True.
        """
        if isinstance(other, Genero):
            return self.nombre < other.nombre
        return NotImplemented
