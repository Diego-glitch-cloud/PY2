class Usuario:
    """
    Un usuario del sistema de recomendación de música.
    
    Tiene un nombre y una lista de géneros musicales que le gustan.
    """
    
    def __init__(self, nombre, generos_favoritos=None):
        """
        Crea un usuario nuevo.
        
        nombre: el nombre del usuario (no puede estar vacío).
        generos_favoritos: géneros que le gustan (lista o conjunto). Si no se da, empieza vacío.
        """
        if not nombre or not isinstance(nombre, str):
            raise ValueError("El nombre del usuario no puede estar vacío y debe ser un string")
        
        self.nombre = nombre.strip()
        
        if generos_favoritos is None:
            self.generos_favoritos = set()
        else:
            try:
                self.generos_favoritos = {genero.strip().lower() for genero in generos_favoritos if genero and genero.strip()}
            except TypeError:
                raise TypeError("generos_favoritos debe ser iterable (lista, set, etc.)")
    
    def agregar_genero(self, genero):
        """
        Añade un género a la lista de favoritos.
        
        genero: el género a añadir (string).
        
        Devuelve True si se añadió, False si ya estaba.
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
        Quita un género de la lista de favoritos.
        
        genero: el género a quitar (string).
        
        Devuelve True si se quitó, False si no estaba.
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
        Dice si al usuario le gusta un género.
        
        genero: el género a comprobar (string).
        
        Devuelve True o False.
        """
        if not genero or not isinstance(genero, str):
            return False
        
        return genero.strip().lower() in self.generos_favoritos
    
    def obtener_generos_ordenados(self):
        """
        Devuelve los géneros favoritos ordenados alfabéticamente.
        """
        return sorted(list(self.generos_favoritos))
    
    def cantidad_generos(self):
        """
        Devuelve cuántos géneros favoritos tiene.
        """
        return len(self.generos_favoritos)
    
    def tiene_generos_en_comun(self, otro_usuario):
        """
        Dice qué géneros tiene en común con otro usuario.
        
        otro_usuario: otro objeto Usuario.
        
        Devuelve un conjunto con los géneros en común.
        """
        if not isinstance(otro_usuario, Usuario):
            raise TypeError("El parámetro debe ser una instancia de Usuario")
        
        return self.generos_favoritos.intersection(otro_usuario.generos_favoritos)
    
    def __str__(self):
        """
        Muestra el usuario de forma sencilla.
        """
        generos_str = ", ".join(self.obtener_generos_ordenados()) if self.generos_favoritos else "ninguno"
        return f"Usuario: {self.nombre} | Géneros favoritos: {generos_str}"
    
    def __repr__(self):
        """
        Muestra el usuario para debugging.
        """
        return f"Usuario(nombre='{self.nombre}', generos_favoritos={self.generos_favoritos})"
    
    def __eq__(self, other):
        """
        Compara dos usuarios por su nombre.
        
        other: otro objeto Usuario.
        
        Devuelve True si son iguales, False si no.
        """
        if not isinstance(other, Usuario):
            return False
        return self.nombre.lower() == other.nombre.lower()
    
    def __hash__(self):
        """
        Permite usar Usuario en sets y diccionarios.
        """
        return hash(self.nombre.lower())
