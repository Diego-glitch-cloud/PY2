class Usuario:
    """
    Representa a un usuario del sistema de recomendación de géneros musicales.
    
    Attributes:
        nombre (str): El nombre del usuario.
        generos_favoritos (set): Conjunto de géneros que le gustan al usuario.
    """
    
    def __init__(self, nombre, generos_favoritos=None):
        """
        Inicializa un objeto Usuario.
        
        Args:
            nombre (str): El nombre del usuario. No puede estar vacío.
            generos_favoritos (list, set, or None): Los géneros favoritos del usuario.
                                                   Si es None, se inicializa como set vacío.
        
        Raises:
            ValueError: Si el nombre está vacío o es None.
            TypeError: Si generos_favoritos no es iterable.
        """
        if not nombre or not isinstance(nombre, str):
            raise ValueError("El nombre del usuario no puede estar vacío y debe ser un string")
        
        self.nombre = nombre.strip()
        
        # Inicializar géneros favoritos
        if generos_favoritos is None:
            self.generos_favoritos = set()
        else:
            try:
                # Convertir a set y normalizar (minúsculas, sin espacios extra)
                self.generos_favoritos = {genero.strip().lower() for genero in generos_favoritos if genero and genero.strip()}
            except TypeError:
                raise TypeError("generos_favoritos debe ser iterable (lista, set, etc.)")
    
    def agregar_genero(self, genero):
        """
        Agrega un género a los favoritos del usuario.
        
        Args:
            genero (str): El género a agregar.
        
        Returns:
            bool: True si se agregó, False si ya existía.
        """
        if not genero or not isinstance(genero, str):
            raise ValueError("El género debe ser un string no vacío")
        
        genero_normalizado = genero.strip().lower()
        if genero_normalizado in self.generos_favoritos:
            return False
        
        self.generos_favoritos.add(genero_normalizado)
        return True
    
    def quitar_genero(self, genero):
        """
        Quita un género de los favoritos del usuario.
        
        Args:
            genero (str): El género a quitar.
        
        Returns:
            bool: True si se quitó, False si no existía.
        """
        if not genero or not isinstance(genero, str):
            return False
        
        genero_normalizado = genero.strip().lower()
        if genero_normalizado in self.generos_favoritos:
            self.generos_favoritos.remove(genero_normalizado)
            return True
        return False
    
    def le_gusta_genero(self, genero):
        """
        Verifica si al usuario le gusta un género específico.
        
        Args:
            genero (str): El género a verificar.
        
        Returns:
            bool: True si le gusta el género, False en caso contrario.
        """
        if not genero or not isinstance(genero, str):
            return False
        
        return genero.strip().lower() in self.generos_favoritos
    
    def obtener_generos_ordenados(self):
        """
        Obtiene los géneros favoritos ordenados alfabéticamente.
        
        Returns:
            list: Lista de géneros ordenados.
        """
        return sorted(list(self.generos_favoritos))
    
    def cantidad_generos(self):
        """
        Obtiene la cantidad de géneros favoritos.
        
        Returns:
            int: Número de géneros favoritos.
        """
        return len(self.generos_favoritos)
    
    def tiene_generos_en_comun(self, otro_usuario):
        """
        Verifica si este usuario tiene géneros en común con otro usuario.
        
        Args:
            otro_usuario (Usuario): Otro usuario para comparar.
        
        Returns:
            set: Conjunto de géneros en común.
        """
        if not isinstance(otro_usuario, Usuario):
            raise TypeError("El parámetro debe ser una instancia de Usuario")
        
        return self.generos_favoritos.intersection(otro_usuario.generos_favoritos)
    
    def __str__(self):
        """
        Representación legible del usuario.
        
        Returns:
            str: Descripción del usuario.
        """
        generos_str = ", ".join(self.obtener_generos_ordenados()) if self.generos_favoritos else "ninguno"
        return f"Usuario: {self.nombre} | Géneros favoritos: {generos_str}"
    
    def __repr__(self):
        """
        Representación técnica del usuario.
        
        Returns:
            str: Representación para debugging.
        """
        return f"Usuario(nombre='{self.nombre}', generos_favoritos={self.generos_favoritos})"
    
    def __eq__(self, other):
        """
        Verifica si dos usuarios son iguales (mismo nombre).
        
        Args:
            other (Usuario): Otro usuario para comparar.
        
        Returns:
            bool: True si son iguales, False en caso contrario.
        """
        if not isinstance(other, Usuario):
            return False
        return self.nombre.lower() == other.nombre.lower()
    
    def __hash__(self):
        """
        Hace la clase hashable para poder usar en sets y diccionarios.
        
        Returns:
            int: Hash del usuario basado en el nombre.
        """
        return hash(self.nombre.lower())