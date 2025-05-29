import PySimpleGUI as sg
from Usuario import Usuario

class SistemaRecomendacion:
    """
    Encapsula la lógica central del sistema de recomendación y la gestión de la base de datos simulada.
    Actúa como el "cerebro" del sistema, coordinando las demás operaciones.
    """

    def __init__(self):
        """
        Inicializa el sistema de recomendación, configurando las estructuras de datos
        para los usuarios, géneros y relaciones, y cargando los datos iniciales.
        """
        # Atributos (Datos de la base de datos)
        self.user_preferences = {}          # { 'nombre_usuario': Usuario }
        self.genre_relationships = {}       # { ('genero_menor', 'genero_mayor'): peso }
        self.shared_listeners_count = {}    # { ('genero_menor', 'genero_mayor'): conteo_total_oyentes }

        self.available_genres = [
            "Rock", "Pop", "Electronica", "Jazz", "Clasica", "Rap", "K-Pop", "Blues",
            "Indie", "Hip Hop", "Bossa Nova", "Trap", "Reggaeton"
        ]

        # Cargar datos iniciales al instanciar el sistema
        self._populate_initial_data()

    def _update_genre_similarity(self, genre1: str, genre2: str) -> bool:
        pass

    def add_user(self, username: str, selected_genres: list[str]) -> str:
        if not username or not isinstance(username, str):
            return "Nombre de usuario inválido."

        if username in self.user_preferences:
            return f"El usuario '{username}' ya existe."

        try:
            nuevo_usuario = Usuario(username, selected_genres)
            self.user_preferences[username] = nuevo_usuario
            return f"Usuario '{username}' agregado exitosamente."
        except Exception as e:
            return f"Error al agregar usuario: {str(e)}"

    def get_recommendation(self, username: str) -> str:
        pass

    def get_db_status_content(self) -> str:
        pass

    def _populate_initial_data(self):
        pass
