// Sistema híbrido: Firebase + localStorage como fallback
class DataManager {
    constructor() {
        this.useFirebase = true; // Forzar el uso de Firebase
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
                console.error('❌ Error fatal en autenticación anónima:', authError);
                throw new Error('No se pudo autenticar al usuario de forma anónima. La app no puede continuar.');
            }
            console.log('✅ Firebase inicializado correctamente');
        } catch (error) {
            this.useFirebase = false;
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
                // Borrar todos los documentos existentes en la colección
                const snapshot = await this.db.collection(collection).get();
                const deleteBatch = this.db.batch();
                snapshot.forEach(doc => deleteBatch.delete(doc.ref));
                await deleteBatch.commit();

                // Añadir los nuevos datos como documentos individuales
                const addBatch = this.db.batch();
                data.forEach(item => {
                    // Usar el ID del item si existe, si no, generar uno nuevo.
                    // El ID debe ser un string para Firestore.
                    const docRef = item.id ? this.db.collection(collection).doc(String(item.id)) : this.db.collection(collection).doc();
                    addBatch.set(docRef, item);
                });
                await addBatch.commit();

                console.log(`✅ Guardado en Firebase: ${collection}`);
                return;
            } catch (error) {
                console.error(`❌ Error guardando en Firebase (${collection}):`, error);
            }
        }
    }

    // Obtener datos
    async get(collection) {
        await this.initPromise; // Esperar a que la inicialización se complete

        if (this.useFirebase && this.db) {
            try {
                const snapshot = await this.db.collection(collection).get();
                const items = [];
                snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                return items;
            } catch (error) {
                console.error(`❌ Error obteniendo de Firebase (${collection}):`, error);
            }
        }
        return [];
    }

    // Escuchar cambios en tiempo real
    async onSnapshot(collection, callback) {
        await this.initPromise; // Esperar a que la inicialización se complete

        if (this.useFirebase && this.db) {
            try {
                return this.db.collection(collection).onSnapshot((snapshot) => {
                    const items = [];
                    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                    callback(items);
                });
            } catch (error) {
                console.error(`❌ Error crítico en listener para ${collection}:`, error);
            }
        }
        return null;
    }

    // Añadir un item a una colección (más eficiente que get/set)
    async add(collection, item) {
        await this.initPromise;
        if (this.useFirebase && this.db) {
            try {
                // Si el item tiene un ID, lo usamos. Si no, Firestore genera uno.
                // El ID debe ser un string.
                const docRef = item.id ? this.db.collection(collection).doc(String(item.id)) : this.db.collection(collection).doc();
                await docRef.set(item);
                console.log(`✅ Item añadido en Firebase: ${collection}`);
            } catch (error) {
                console.error(`❌ Error añadiendo en Firebase (${collection}):`, error);
            }
        }
    }

    // Actualizar un item
    async update(collection, itemId, data) {
        await this.initPromise;
        if (this.useFirebase && this.db) {
            try {
                // Aseguramos que no se intente sobreescribir el id
                const dataToUpdate = { ...data };
                delete dataToUpdate.id;
                await this.db.collection(collection).doc(String(itemId)).update(dataToUpdate);
                console.log(`✅ Item actualizado en Firebase: ${collection}`);
            } catch (error) {
                console.error(`❌ Error actualizando en Firebase (${collection}):`, error);
            }
        }
    }

    // Borrar datos
    async delete(collection, itemId) {
        await this.initPromise; // Esperar a que la inicialización se complete

        if (this.useFirebase && this.db) {
            try {
                // Borra un documento por su ID
                await this.db.collection(collection).doc(String(itemId)).delete();
                console.log(`✅ Item borrado en Firebase: ${collection}`);
            } catch (error) {
                console.error('Error borrando en Firebase:', error);
            }
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
            bonosEscuela: [
                { id: 1, nombre: 'Bono 10 Clases', numClases: 10, precio: '150.00' },
                { id: 3, nombre: 'Bono 5 Clases', numClases: 5, precio: '85.00' }
            ],
            clasesSueltasEscuela: [
                { id: 2, nombre: 'Clase Suelta', numClases: 1, precio: '20.00' }
            ],
            asignacionesEscuela: [
                { id: 301, claseId: 201, alumno: 'María López' },
                { id: 302, claseId: 203, alumno: 'Juan Pérez' }
            ],
            pagosAlumnosEscuela: [
                { id: 401, alumnoId: 101, productoId: 1, productoNombre: 'Bono 10 Clases', productoPrecio: '150.00', fechaCompra: '2023-10-01', tipo: 'Bono', totalClases: 10, clasesUsadas: 3 },
                { id: 402, alumnoId: 102, productoId: 3, productoNombre: 'Bono 5 Clases', productoPrecio: '85.00', fechaCompra: '2023-10-15', tipo: 'Bono', totalClases: 5, clasesUsadas: 1 }
            ],
            inscripcionesCampamento: [
                {
                    id: 1, dni: '12345678A', nombre: 'Juan', apellido: 'Pérez', fechaNacimiento: '2010-01-01', direccion: 'Calle Falsa 123', poblacion: 'Madrid', provincia: 'Madrid', cp: '28001',
                    numLicencia: '', numSegSocial: '', otrosSeguros: '',
                    tutorNombre: 'Padre Juan', tutorApellidos: 'Pérez', tutorDni: '87654321B', telefono: '600112233', email: 'padre@example.com',
                    semanasCampamento: '2', fechaInicioCampamento: '2024-07-01',
                    tiempoMontando: '3 años', horasSemana: '2', clubAnterior: 'Club Hípico A',
                    participadoConcursos: 'No', categoriaConcurso: '', caballoPropio: 'No', traeCaballo: 'No',
                    comoNosConociste: 'Internet', enfermedadesObservaciones: 'Ninguna', necesitaRecogida: 'Sí',
                    fechaRecogida: '2024-07-01', horaRecogida: '10:00', lugarRecogida: 'Aeropuerto T4',
                    fechaSalida: '2024-07-15', horaSalida: '18:00', lugarSalida: 'Estación Atocha',
                    fechaInscripcion: '2024-05-01T10:00:00.000Z', reservaPagada: true
                },
                {
                    id: 2, dni: '98765432Z', nombre: 'Ana', apellido: 'Gómez', fechaNacimiento: '2008-03-15', direccion: 'Avenida Siempre Viva 45', poblacion: 'Barcelona', provincia: 'Barcelona', cp: '08001',
                    numLicencia: 'B-54321', numSegSocial: '08/9876543210/01', otrosSeguros: 'Mapfre Poliza 123',
                    tutorNombre: '', tutorApellidos: '', tutorDni: '', telefono: '600998877', email: 'ana@example.com',
                    semanasCampamento: '1', fechaInicioCampamento: '2024-07-08',
                    tiempoMontando: '5 años', horasSemana: '4', clubAnterior: 'Club Hípico B',
                    participadoConcursos: 'Sí', categoriaConcurso: 'Salto 1.00m', caballoPropio: 'No', traeCaballo: 'No',
                    comoNosConociste: 'Recomendación', enfermedadesObservaciones: 'Alergia al polen', necesitaRecogida: 'No',
                    fechaRecogida: '', horaRecogida: '', lugarRecogida: '',
                    fechaSalida: '', horaSalida: '', lugarSalida: '',
                    fechaInscripcion: '2024-05-10T11:30:00.000Z', reservaPagada: false
                }
            ],
            alimentacionCaballosEscuela: [],
            vacunasCaballosEscuela: [],
            desparasitacionCaballosEscuela: [],
            herrajesCaballosEscuela: [],
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

    // Exportar todos los datos a un fichero JSON
    async exportarDatosLocales() {
        if (!confirm('¿Deseas exportar toda la base de datos a un fichero local?')) {
            return;
        }

        console.log('⏳ Exportando datos...');
        const colecciones = [
            'alumnosEscuela', 'caballosEscuela', 'profesoresEscuela', 'clasesEscuela', 'asignacionesEscuela',
            'nivelesEscuela', 'tiposClasesEscuela', 'bonosEscuela', 'clasesSueltasEscuela',
            'pagosAlumnosEscuela', 'attendanceEscuela', 'especialidadesProfesoresEscuela',
            'alimentacionCaballosEscuela', 'vacunasCaballosEscuela', 'desparasitacionCaballosEscuela', 'inscripcionesCampamento', 'agendaCaballosEscuela', 'cursosEscuela',
            'herrajesCaballosEscuela', 'formacionesEscuela', 'otrosServiciosEscuela',
            'duracionesEscuela', 'conceptosGastoCampamento', 'fechasCampamento'
        ];

        const backup = {};
        try {
            for (const collection of colecciones) {
                backup[collection] = await this.get(collection);
                console.log(`  - Exportada colección: ${collection}`);
            }

            const jsonString = JSON.stringify(backup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fecha = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `backup-la-gerencia-${fecha}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('✅ ¡Exportación completada! Revisa tus descargas.');

        } catch (error) {
            console.error('❌ Error durante la exportación:', error);
            alert('❌ Hubo un error al exportar los datos.');
        }
    }

    // Importar datos desde un fichero JSON
    async importarDatosLocales(file) {
        if (!file) return;
        if (!confirm('⚠️ ¿ESTÁS SEGURO? Esto sobreescribirá TODOS los datos actuales en Firebase con el contenido del fichero. Esta acción es irreversible.')) {
            return;
        }

        console.log('⏳ Importando datos desde fichero...');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const datos = JSON.parse(e.target.result);
                for (const collection in datos) {
                    if (datos.hasOwnProperty(collection)) {
                        await this.set(collection, datos[collection]);
                        console.log(`  - Importada colección: ${collection}`);
                    }
                }
                alert('✅ ¡Importación completada con éxito! La página se recargará.');
                setTimeout(() => window.location.reload(), 500);
            } catch (error) {
                console.error('❌ Error al importar o parsear el fichero:', error);
                alert(`❌ Error al importar el fichero. Asegúrate de que es un backup válido.\n\nDetalles: ${error.message}`);
            }
        };
        reader.readAsText(file);
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
            'alumnosEscuela', 'caballosEscuela', 'profesoresEscuela', 'clasesEscuela', 'asignacionesEscuela',
            'nivelesEscuela', 'tiposClasesEscuela', 'bonosEscuela', 'clasesSueltasEscuela',
            'pagosAlumnosEscuela', 'attendanceEscuela', 'especialidadesProfesoresEscuela',
            'alimentacionCaballosEscuela', 'vacunasCaballosEscuela', 'desparasitacionCaballosEscuela', 'inscripcionesCampamento', 'agendaCaballosEscuela', 'cursosEscuela',
            'herrajesCaballosEscuela', 'formacionesEscuela', 'otrosServiciosEscuela',
            'duracionesEscuela', 'conceptosGastoCampamento', 'fechasCampamento'
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
