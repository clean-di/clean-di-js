import {di} from "../src/index";
import {ClassParam1, ClassParam2} from "../src/utilityTypes";

describe('This library should', () => {

    it('asf', () => {
        interface Avion {
            alas: number;
        }

        class Biplano {
            readonly alas = 4;
            readonly color = 'rojo';
        };

        interface Coche {
            brum(): void;
        }

        const noseque = async () => 1;

        const f = () => 2;

        const z = di.addUndefined('caca').build();

        const x = di
            .addClass('avion', Biplano).as<Avion>()
            .addFunction('g', f)
            .addAsync('noseque', noseque)
            .build().avion;
    })

    it('esto se podría llamar godi', () => {
        // por good old dependency injection
    });

    it('', () => {
    // echar un ojo aquí para más ideas https://github.com/codemix/ts-sql/blob/master/src/Parser.ts
    // https://devblogs.microsoft.com/typescript/announcing-typescript-4-1-beta/
    });

    it('debe devoler instancia de dependencia de primer nivel (sin subdependencias)', () => {

        class A {
            readonly cosa = 1234;
        };

        const a = di.addClass('a', A).build().a;

        expect(a.cosa).toBe(1234);
        expect(a instanceof A).toBeTruthy();
    });

    it('string values are not valid for alias, only closed literals', () => {
        let stringValue = 'open';
        // @ts-ignore
        di.addUndefined(stringValue); // This doesn't compile which is what the test proves
        const literalValue = 'closed'
        di.addUndefined(literalValue);
        expect(true).toBe(true); // Fake assertion. To really test this remove the ts-ignore and see
    });

    it('se debe poder forzar el tipo de la instancia devuelto', () => {

        interface Avion {
            alas: number;
        }

        class Biplano {
            readonly alas = 4;
            readonly color = 'rojo';
        };

        const x = di
            .addClass('avion', Biplano).as<Avion>()
            .build().avion;

        expect(x.alas).toBe(4);
    });

    // it('typescript no deja reutilizar un identificador', () => {
    //
    //     class A {};
    //     class B {};
    //
    //     const box = di
    //         .addClass('x', A)
    //         .addClass('x', B)// el compilador no dejaría pasar de aquí
    //         .build();
    //
    // });

    it('se debe poder forzar el tipo de la instancia devuelto asíncrono', async (done) => {

        interface Avion {
            alas: number;
        }

        class Biplano {
            readonly alas = 4;
            readonly color = 'rojo';
        };

        const box = di
            .addAsync('async', Promise.resolve(1))
            .addClass('avion', Biplano).as<Avion>()
            .build();

        const x = await box.avion;

        expect(x.alas).toBe(4);
        done();
    });

    // xit('las dependencias y sus dependientes se pueden tipar para que si se refactoriza, no compile en typescript y' +
    //     'te des cuenta (que no te darías cuenta por el mecanismo de mirar el arbol de dependencias en base al nombre)', () => {
    //     interface ICoche {
    //         arrancar(): void;
    //         frenar(): void;
    //     };
    //     class Coche implements ICoche {
    //         arrancar(): void {
    //             console.log('brum brum');
    //         }
    //         frenar(): void {
    //             console.log('ñiiiiii')
    //         }
    //     };
    //
    //     function f<T, I>(t: T): I {};
    //     const x = f<Coche, ICoche>(Coche);
    //
    //     add({cls: Coche, alias: 'coche'});
    // });

    // it('rancho', () => {
    //
    //
    //     // se podría hacer la api y el nombre de la librería como si fuera un plato de comida.
    //     // Por ejemplo, rancho canario;
    //     // const rancho = meter(noseque).cocinar()
    //     // rancho.coger(ingrediente)
    //     //
    //     // o algo más internacional tipo ensalada, que además es gracioso porque es un nombre conocido
    //
    // });

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

        const a = di
            .addClass('a', A)
            .addClass('b', B)
            .addClass('c', C)
            .build().a;

        expect(a instanceof A).toBeTruthy();
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

        let c2ConstructorCalled = false;

        class C2 {
            constructor() {
                c2ConstructorCalled = true;
            }
        }

        const a = di
            .addClass('a', A)
            .addClass('b', B, {dependencies: di.addClass('c', C2)}) // se usará C2 al resolver c de b
            .addClass('c', C)
            .build().a;

        expect(a instanceof A).toBeTruthy();
        expect(c2ConstructorCalled).toBeTruthy();
    });

    it('las dependencias cíclicas no deberían ser válidas', () => {
        class A {
            constructor(b: B) {}
        }

        class B {
            constructor(a: A) {}
        }

        expect(() => {
            di
                .addClass('a', A)
                .addClass('b', B)
                .build();
        }).toThrow(/Cyclic dependency/);
    });

    it('los alias repetidos no se permiten', () => {

        class A {}

        class B {}

        expect(()=>{
            di
                .addClass(['a', 'b', 'c'], A)
                .addClass('b', B)
                .build();
        }).toThrow(/alias already used/);
    });

    it('por defecto las dependencias no resueltas hacen petar', () => {
        class A {
            constructor(b: any) {}
        }

        expect(() => {
            di
                .addClass('a', A)
                .build();
        }).toThrow(/Unresolved dependency/);
    });

    it('se pueden decir explícitamente dependencias no resueltas', () => {
        class A {
            constructor(readonly b: any) {}
        }

        const a = di
            .addClass('a', A)
            .addUndefined('b')
            .build().a;

        expect(a.b).toBeUndefined();
    });

    it('se pueden crear el arbol de dependencias con dependencias no resueltas implícitas', () => {
        class A {
            constructor(readonly b: any) {}
        }

        const a = di
            .addClass('a', A)
            .build({allowUnresolved: true}).a;

        expect(a.b).toBeUndefined();
    });

    // it('al final de la cadena deps se puede usar el metodo build con opciones para testear', () => {
    // });
    //
    // it('por defecto el alias para una clase o función es su nombre constructor en minuscula', () => {
    // });
    //
    // it('las cosas pueden tener más de un alias', () => {
    // });
    //
    // it('por defecto debe usar null cuando no encuentra una dependencia', () => {
    //
    //     class A {
    //         constructor(b: any) {
    //         }
    //     }
    //
    //     const a = add({cls: A})
    //         .get(A); // inyectaría b como null
    // });
    //
    // it('podemos especificar que si no encuentra una dependencia, pete al pedir la instancia', () => {
    //
    //     class A {
    //         constructor(b: any) {
    //         }
    //     }
    //
    //     const a = add({cls: A, nonNullDeps: true})
    //         .get(A); // entonces petaría porque no encuentra b
    // });
    //
    // it('debe permitir dependencias de tipo función que no sea constructora', () => {
    //
    //     const f = (g: () => {}) => {};
    //     const g = () => {};
    //
    //     const nombre = add({arrow: f})
    //         .add({arrow: g})
    //         .get<()=>{}>(f);
    // });
    //
    // it('debe permitir obtener una instancia por alias', () => {
    //
    //     // ... dependencias
    //
    //     const nombre = add(...)
    //         .get<()=>{}>('alias');
    // });
    //
    // it('debe aceptar valores primitivos como dependencias', () => {
    //
    //     const s = 'pepito';
    //     const n = 1234;
    //     const b = true;
    //     // estudiar estos tipos y tipos anidados. debería haber una para si
    //     // queremos deep clone an proveer las dependencias con deps(<dependencia>, <tipo de clonado>)
    //     //const l = [1, 2, 3];
    //     //const o = {a: 1, b: 2};
    //     //const o = Promise.resolve(noseque); esto puede ser interesante?? o solo para funciones?
    //
    //     const nombre = add({val: s, alias:'nombre'}).get<string>('nombre');
    // });
    //
    // it('si las dependencias tipo funciones (que no constructores) devuelven promesas,' +
    //     ' se deben resolver antes de devolver una instancia', () => {
    //
    //     class A {
    //         constructor(f: any) {
    //
    //         }
    //     };
    //     const f = async () => {};
    //
    //     const a = add(A)
    //         .add(f)
    //         .get<Promise<InstanceType<A>>>(A);  // o mejor .getAsync(A) y que sea promesa es implicito
    // });
    //
    // it('debe poderse testear que se tienen todas las dependencias para crear una instancia,' +
    //     'pero sin crearla. esto sirve para hacer tests unitarios de nuestros settings y no encontrar' +
    //     'sorpresas en producción', () => {
    //
    //     class A {
    //         constructor(b: B) {
    //         }
    //     }
    //
    //     class B {
    //         constructor(c: C) {
    //         }
    //     }
    //
    //     class C {}
    //
    //     const areDepsOk = add({cls: A})
    //         .add({cls: B})
    //         .add({cls: C})
    //         .canGet(A);
    // });

    it('puede remplazar argumentos de funciones', () => {
        const suma = (a: number, b: number) => a+b;
        function resta(a: number, b: number) { return a - b;}
        const box = di
            .addValue('a', 1)
            .addValue('b', 2)
            .addFunction('s', suma)
            .addFunction('r', resta)
            .addFunction('m', (a: number, b: number) => a * b)
            .build();

        const resSuma = box.s;
        const resResta = box.r;
        const resMultiplicacion = box.m;

        expect(resSuma).toBe(3);
        expect(resResta).toBe(-1);
        expect(resMultiplicacion).toBe(2);
    })

    it('al definir los deps de clases se debe permitir decir el tipo de vida de sus instancias', () => {

        let aCreatedTimes = 0;

        class A {
            constructor(b: B) {
                aCreatedTimes++;
            }
        }

        let bCreatedTimes = 0;

        class B {
            constructor() {
                bCreatedTimes++;
            }
        }

        const box = di
            .addClass('a', A) // se crea cada vez
            .addClass('b', B, {singleton: true})  // se crea una sola vez y se reutiliza
            .build();

        const a1 = box.a;
        const a2 = box.a;
        const b3 = box.b;
        const b4 = box.b;
        const b5 = box.b;

        expect(aCreatedTimes).toBe(2);
        expect(bCreatedTimes).toBe(1);
    });

    // it('a las dependencias de tipo funcion se les debe poder configurar el lifespan', () => {
    //
    //     const f = () => {};
    //     const g = () => {};
    //
    //     add({cls: f, lifespan: transient}) // se llama cada vez
    //     .add({cls: g, lifespan: memoize}) // se llama una vez y se guarda el resultado para las demás veces
    // });
    //
    // it('las dependencias de tipo valor se pueden configurar para clonado profundo o no', () => {
    // });
    //
    //
    // it('prueba de api', () => {
    //     const deps = setclass(C1, C2, C3)
    //         .setclass({constructor: C4, allowNull: true})
    //         .setclass({constructor: C5, deps: setclass(...)})
    //         .setfun(f, g)
    //         .setconst({value: 'pepito', alias: 'nombre', lifespan: 'deepclone')
    //         .build({throwIfError: true});
    //     const c3 = deps.setparam('aliasname', 1234).setparam('aliasname', C42).get(C3);
    //
    // });

});