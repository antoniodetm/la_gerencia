// Sistema híbrido: Firebase + localStorage como fallback
class DataManager {
    constructor() {
        this.useFirebase = false;
        this.db = null;
        this.initialized = false; // Mantenemos esto por compatibilidad con el código existente
        this.initPromise = this.initializeFirebase(); // Guardamos la promesa de inicialización
    }

    async initializeFirebase() {
        try {
            // Configuración de Firebase directamente en el código
            const config = {
                apiKey: "AIzaSyCEtMPhIhuDH2GDMo0HDs8bs9o1EGBOfYM",
                authDomain: "la-gerencia-51fdf.firebaseapp.com",
                projectId: "la-gerencia-51fdf",
                storageBucket: "la-gerencia-51fdf.firebasestorage.app",
                messagingSenderId: "331472649600",
                appId: "1:331472649600:web:10030d6a03d1215f1d5565"
            };

            // Inicializar Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(config);
            }

            this.db = firebase.firestore();

            // Habilitar persistencia offline
            try {
                await this.db.enablePersistence();
            } catch (err) {
                if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
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
            console.error('❌ Error crítico inicializando Firebase:', error);
            alert(`Error crítico al conectar con Firebase. Por favor, verifica tu configuración.\n\nDetalles: ${error.message}`);
        } finally {
            this.initialized = true;
        }
    }

    // Guardar datos
    async set(collection, data) {
        await this.initPromise; // Esperar a que la inicialización se complete

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
        }
    }

    // Obtener datos
    async get(collection) {
        await this.initPromise; // Esperar a que la inicialización se complete

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
    async onSnapshot(collection, callback) {
        await this.initPromise; // Esperar a que la inicialización se complete

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
        await this.initPromise; // Esperar a que la inicialización se complete

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

    // Cargar datos de prueba
    async cargarDatosDePrueba() {
        if (!confirm('¿Deseas cargar un set de datos de prueba? Esto sobreescribirá los datos existentes.')) {
            return;
        }

        console.log('⏳ Cargando datos de prueba...');

        const datos = {
            nivelesEscuela: [
                { id: 1, nombre: 'Iniciación' }, { id: 2, nombre: 'Intermedio' }, { id: 3, nombre: 'Avanzado' }
            ],
            tiposClasesEscuela: [
                { id: 1, nombre: 'Iniciación' }, { id: 2, nombre: 'Intermedio' }, { id: 3, nombre: 'Avanzado / Competición' }, { id: 4, nombre: 'Clase Particular' }, { id: 5, nombre: 'Salida al Campo' }
            ],
            productosEscuela: [
                { id: 1, nombre: 'Bono 10 Clases', tipo: 'Bono', numClases: 10, precio: '150.00' },
                { id: 2, nombre: 'Clase Suelta', tipo: 'Clase Suelta', numClases: 1, precio: '20.00' },
                { id: 3, nombre: 'Bono 5 Clases', tipo: 'Bono', numClases: 5, precio: '85.00' }
            ],
            profesoresEscuela: [
                { id: 1, nombre: 'Ana', apellido: 'García', telefono: '611223344', especialidad: 'Doma Clásica' },
                { id: 2, nombre: 'Carlos', apellido: 'Ruiz', telefono: '655667788', especialidad: 'Salto de Obstáculos' }
            ],
            caballosEscuela: [
                { id: 1, nombre: 'Furia', capa: 'Negro', estado: 'Activo', categoria: 'De tanda' },
                { id: 2, nombre: 'Spirit', capa: 'Alazán', estado: 'Activo', categoria: 'De tanda' },
                { id: 3, nombre: 'Bala', capa: 'Tordo', estado: 'Descanso', categoria: 'Particular' },
                { id: 4, nombre: 'Rayo', capa: 'Castaño', estado: 'Activo', categoria: 'De tanda' }
            ],
            alumnosEscuela: [
                { id: 101, dni: '12345678A', nombre: 'Juan', apellido: 'Pérez', edad: 25, nivel: 'Intermedio', telefono: '600112233', notaMedica: 'Ninguna', notaAlimentaria: '', estado: 'Activo', tutorNombre: '' },
                { id: 102, dni: '87654321B', nombre: 'María', apellido: 'López', edad: 14, nivel: 'Iniciación', telefono: '600223344', notaMedica: 'Alergia al polen', notaAlimentaria: '', estado: 'Activo', tutorNombre: 'Laura Gómez' },
                { id: 103, dni: '11223344C', nombre: 'Pedro', apellido: 'Sánchez', edad: 32, nivel: 'Avanzado', telefono: '600334455', notaMedica: '', notaAlimentaria: '', estado: 'Inactivo', tutorNombre: '' }
            ],
            clasesEscuela: [
                { id: 201, tipo: 'unDia', diaSemana: 'Martes', hora: '18:00', duracion: '1 hora', maxAlumnos: 6, nivel: 'Iniciación' },
                { id: 202, tipo: 'unDia', diaSemana: 'Jueves', hora: '18:00', duracion: '1 hora', maxAlumnos: 6, nivel: 'Iniciación' },
                { id: 203, tipo: 'unDia', diaSemana: 'Sábado', hora: '11:00', duracion: '1 hora', maxAlumnos: 5, nivel: 'Intermedio' }
            ],
            asignacionesEscuela: [
                { id: 301, claseId: 201, alumno: 'María López' },
                { id: 302, claseId: 203, alumno: 'Juan Pérez' }
            ],
            pagosAlumnosEscuela: [
                { id: 401, alumnoId: 101, productoId: 1, productoNombre: 'Bono 10 Clases', productoPrecio: '150.00', fechaCompra: '2023-10-01', tipo: 'Bono', totalClases: 10, clasesUsadas: 3 },
                { id: 402, alumnoId: 102, productoId: 3, productoNombre: 'Bono 5 Clases', productoPrecio: '85.00', fechaCompra: '2023-10-15', tipo: 'Bono', totalClases: 5, clasesUsadas: 1 }
            ],
            attendanceEscuela: [
                { id: 501, alumno: 'Juan Pérez', alumnoId: 101, fechaClase: '2023-10-05', claseId: 203, caballo: 'Furia', asistio: true },
                { id: 502, alumno: 'Juan Pérez', alumnoId: 101, fechaClase: '2023-10-12', claseId: 203, caballo: 'Spirit', asistio: true },
                { id: 503, alumno: 'Juan Pérez', alumnoId: 101, fechaClase: '2023-10-19', claseId: 203, caballo: 'Furia', asistio: true },
                { id: 504, alumno: 'María López', alumnoId: 102, fechaClase: '2023-10-17', claseId: 201, caballo: 'Rayo', asistio: true }
            ]
        };

        try {
            for (const collection in datos) {
                await this.set(collection, datos[collection]);
            }
            alert('✅ ¡Datos de prueba cargados con éxito!');
            // Forzar recarga de la página para ver los cambios en todas partes
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('❌ Error al cargar los datos de prueba:', error);
            alert('❌ Hubo un error al cargar los datos de prueba.');
        }
    }

    // Borrar todos los datos
    async borrarTodosLosDatos() {
        if (!confirm('⚠️ ¿ESTÁS SEGURO? Esta acción es irreversible y borrará TODOS los datos de la aplicación.')) {
            return;
        }
        if (!confirm('ÚLTIMO AVISO: ¿Realmente quieres borrar toda la información?')) {
            return;
        }

        console.log('🗑️ Borrando todos los datos...');

        const colecciones = [
            'alumnosEscuela', 'caballosEscuela', 'profesoresEscuela', 'clasesEscuela',
            'asignacionesEscuela', 'nivelesEscuela', 'tiposClasesEscuela', 'productosEscuela',
            'pagosAlumnosEscuela', 'attendanceEscuela'
        ];

        try {
            for (const collection of colecciones) {
                await this.set(collection, []);
            }
            alert('🗑️ ¡Todos los datos han sido borrados!');
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('❌ Error al borrar los datos:', error);
            alert('❌ Hubo un error al borrar los datos.');
        }
    }
}

// Instancia global
const dataManager = new DataManager();
