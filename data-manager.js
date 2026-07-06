// Sistema híbrido: Firebase + localStorage como fallback
class DataManager {
    constructor() {
        this.useFirebase = false;
        this.db = null;
        this.initialized = false;
        this.initializeFirebase();
    }

    async initializeFirebase() {
        try {
            // Inicializar Firebase
            if (!firebase.apps.length) {
                // La variable firebaseConfig viene del fichero firebase-config.js
                firebase.initializeApp(firebaseConfig);
            }

            this.db = firebase.firestore();

            // Habilitar persistencia offline
            try {
                await this.db.enablePersistence();
                console.log('Persistencia offline habilitada.');
            } catch (err) {
                if (err.code === 'failed-precondition') {
                    console.warn('Persistencia offline falló: Múltiples pestañas abiertas. Los datos se sincronizarán desde el servidor.');
                    // Forzar la obtención de datos desde el servidor en lugar de la caché.
                    await this.db.terminate(); // Termina la instancia actual de Firestore
                    this.db = firebase.firestore(); // y la reinicia sin persistencia para esta pestaña.
                } else if (err.code !== 'unimplemented') {
                    console.warn('Persistencia offline no disponible:', err);
                }
            }

            // Autenticación anónima
            try {
                await firebase.auth().signInAnonymously();
            } catch (authError) {
                console.warn('Error en autenticación:', authError);
            }

            this.useFirebase = true;
            console.log('✅ Firebase inicializado correctamente');

        } catch (error) {
            console.warn('❌ Error inicializando Firebase:', error);
            alert('Error crítico al conectar con Firebase. Por favor, verifica tu configuración.');
        } finally {
            this.initialized = true;
        }
    }

    // Guardar datos
    async set(collection, data) {
        if (this.useFirebase && this.db) {
            try {
                // La función ahora siempre espera un solo objeto.
                // El ID del documento en Firebase será el ID del objeto.
                // El método .set() crea el documento si no existe, o lo sobrescribe si ya existe.
                await this.db.collection(collection).doc(String(data.id)).set(data);
                console.log(`✅ Guardado en Firebase: ${collection}/${data.id}`);

            } catch (error) {
                console.error(`❌ Error guardando en Firebase (${collection}):`, error);
            }
        } else {
            console.error(`No se pudo guardar en ${collection}. Firebase no está disponible.`);
            alert(`Error: No se pudo guardar la información. Revisa la conexión y la configuración de Firebase.`);
        }
    }

    // Obtener datos
    async get(collection) {
        if (this.useFirebase && this.db) {
            try {
                const snapshot = await this.db.collection(collection).get();
                const items = [];
                snapshot.forEach(doc => items.push(doc.data()));
                return items;
            } catch (error) {
                console.error(`❌ Error obteniendo de Firebase (${collection}):`, error);
            }
        } else {
            console.error(`No se pudo obtener ${collection}. Firebase no está disponible.`);
        }
        return []; // Devuelve un array vacío si Firebase no está disponible
    }

    // Escuchar cambios en tiempo real
    onSnapshot(collection, callback) {
        if (this.useFirebase && this.db) {
            try {
                return this.db.collection(collection).onSnapshot((snapshot) => {
                    const items = snapshot.docs.map(doc => doc.data());
                    callback(items);
                });
            } catch (error) {
                console.error(`❌ Error en listener de Firebase (${collection}):`, error);
            }
        }
        return null;
    }

    // Borrar datos
    async delete(collection, itemId) {
        if (this.useFirebase && this.db) {
            try {
                await this.db.collection(collection).doc(String(itemId)).delete();
                console.log(`✅ Borrado en Firebase: ${collection}/${itemId}`);
            } catch (error) {
                console.error('Error borrando en Firebase:', error);
            }
        } else {
            console.error(`No se pudo borrar en ${collection}. Firebase no está disponible.`);
        }
    }
}

// Instancia global
const dataManager = new DataManager();
