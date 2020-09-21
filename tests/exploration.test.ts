import {deps} from "../src/cosa";

describe('This library should', () => {


    it('debe devoler instancia de dependencia de primer nivel (sin subdependencias)', () => {

        class A {}


        const a = deps({fn: A}).get(A);
    });

    it('las dependencias y sus dependientes se pueden tipar para que si se refactoriza, no compile en typescript y' +
        'te des cuenta (que no te darías cuenta por el mecanismo de mirar el arbol de dependencias en base al nombre)', () => {

        deps<dependencia, dependiente>({ctor: Dependencia}); // donde dependencia debe caber en dependiente
    });

    it('rancho', () => {

        /*
        se podría hacer la api y el nombre de la librería como si fuera un plato de comida.
        Por ejemplo, rancho canario;
        const rancho = meter(noseque).cocinar()
        rancho.coger(ingrediente)

        o algo más internacional tipo ensalada, que además es gracioso porque es un nombre conocido
         */
    });

    it('debe devolver instancia que requiere varios subniveles de dependencias', () => {

        class A {
            constructor(b: B) {
            }
        }

        class B {
            constructor(c: C) {
            }
        }

        class C {}

        const a = deps({fn: A})
            .deps({fn: B})
            .deps({fn: C})
            .get(A);
    });

    it('se debe permitir meter dependencias prioritarias dentro de una dependencia,' +
        'estas se usarán primero al resolver', () => {

        class A {
            constructor(b: B, c: C) {
            }
        }

        class B {
            constructor(c: C2) {
            }
        }

        class C {}
        class C2 {}

        const a = deps({fn: A})
            .deps({fn: B, deps: deps({fn: C2, alias: c)}) // se usará C2 al resolver c de b
            .deps({fn: C})
            .get(A);
    });

    it('las dependencias cíclicas no deberían ser válidas', () => {
    });

    it('al final de la cadena deps se usa el método build que procesa todo', () => {
    });

    it('al final de la cadena deps se puede usar el metodo build con opciones para testear', () => {
    });

    it('por defecto el alias para una clase o función es su nombre constructor en minuscula', () => {
    });

    it('las cosas pueden tener más de un alias', () => {
    });

    it('por defecto debe usar null cuando no encuentra una dependencia', () => {

        class A {
            constructor(b: any) {
            }
        }

        const a = deps({fn: A})
            .get(A); // inyectaría b como null
    });

    it('podemos especificar que si no encuentra una dependencia, pete al pedir la instancia', () => {

        class A {
            constructor(b: any) {
            }
        }

        const a = deps({fn: A, nonNullDeps: true})
            .get(A); // entonces petaría porque no encuentra b
    });

    it('debe permitir dependencias de tipo función que no sea constructora', () => {

        const f = (g: () => {}) => {};
        const g = () => {};

        const nombre = deps({arrow: f})
            .deps({arrow: g})
            .get<()=>{}>(f);
    });

    it('debe permitir obtener una instancia por alias', () => {

        // ... dependencias

        const nombre = deps(...)
            .get<()=>{}>('alias');
    });

    it('debe aceptar valores primitivos como dependencias', () => {

        const s = 'pepito';
        const n = 1234;
        const b = true;
        // estudiar estos tipos y tipos anidados. debería haber una para si
        // queremos deep clone an proveer las dependencias con deps(<dependencia>, <tipo de clonado>)
        //const l = [1, 2, 3];
        //const o = {a: 1, b: 2};
        //const o = Promise.resolve(noseque); esto puede ser interesante?? o solo para funciones?

        const nombre = deps({val: s, alias:'nombre'}).get<string>('nombre');
    });

    it('si las dependencias tipo funciones (que no constructores) devuelven promesas,' +
        ' se deben resolver antes de devolver una instancia', () => {

        class A {
            constructor(f: any) {

            }
        };
        const f = async () => {};

        const a = deps(A)
            .deps(f)
            .get<Promise<InstanceType<A>>>(A);  // o mejor .getAsync(A) y que sea promesa es implicito
    });

    it('debe poderse testear que se tienen todas las dependencias para crear una instancia,' +
        'pero sin crearla. esto sirve para hacer tests unitarios de nuestros settings y no encontrar' +
        'sorpresas en producción', () => {

        class A {
            constructor(b: B) {
            }
        }

        class B {
            constructor(c: C) {
            }
        }

        class C {}

        const areDepsOk = deps({fn: A})
            .deps({fn: B})
            .deps({fn: C})
            .canGet(A);
    });

    it('al definir los deps de clases se debe permitir decir el tipo de vida de sus instancias', () => {

        class A {
            constructor(b: B) {
            }
        }

        class B {
            constructor(c: C) {
            }
        }

        class C {}

        const areDepsOk = deps({fn: A, lifespan: transient}) // se crea cada vez
            .deps({fn: B, lifespan: singleton})  // se crea una sola vez y se reutiliza
            .deps({fn: C, lifespan: }) // por defecto debe ser transient
            .canGet(A);

        // quizá haya otras lifespan interesantes como singleton que caduque, singleton por key, o yo que se
    });

    it('a las dependencias de tipo funcion se les debe poder configurar el lifespan', () => {

        const f = () => {};
        const g = () => {};

        deps({fn: f, lifespan: transient}) // se llama cada vez
        .deps({fn: g, lifespan: memoize}) // se llama una vez y se guarda el resultado para las demás veces
    });

    it('las dependencias de tipo valor se pueden configurar para clonado profundo o no', () => {
    });


    it('prueba de api', () => {
        const deps = setclass(C1, C2, C3)
            .setclass({constructor: C4, allowNull: true})
            .setclass({constructor: C5, deps: setclass(...)})
            .setfun(f, g)
            .setconst({value: 'pepito', alias: 'nombre', lifespan: 'deepclone')
            .build({throwIfError: true});
        const c3 = deps.setparam('aliasname', 1234).setparam('aliasname', C42).get(C3);

    });

});