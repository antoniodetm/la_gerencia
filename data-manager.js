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
                // Guardar directamente el array como campo 'data'
                const docRef = this.db.collection(collection).doc('_data');
                await docRef.set({ items: data });
                console.log(`✅ Guardado en Firebase: ${collection}`);
                return;
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
                const docRef = this.db.collection(collection).doc('_data');
                const doc = await docRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    return Array.isArray(data.items) ? data.items : [];
                }
                return [];
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
                return this.db.collection(collection).doc('_data').onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        const items = Array.isArray(data.items) ? data.items : [];
                        callback(items);
                    } else {
                        callback([]);
                    }
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
                const docRef = this.db.collection(collection).doc('_data');
                const doc = await docRef.get();
                if (doc.exists) {
                    const data = doc.data();
                    // Filtrar el item según la colección
                    if (Array.isArray(data.items)) {
                        data.items = data.items.filter(item => item.id !== itemId);
                    }
                    await docRef.set(data);
                }
                return;
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
