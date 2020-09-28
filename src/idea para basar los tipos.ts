

type Dict<Name extends string, I> = {[key in Name]: I};

function f<S extends string, O>(name: S, o: O): Dict<S, O> {
    return {[name]: o} as Dict<S, O>;
}

function g<S1 extends string, O1, S2 extends string, O2>(d: Dict<S1, O1>, name: S2, o: O2): Dict<S1, O1> & Dict<S2, O2> {
    return {
        ...d,
        [name]: o
    } as Dict<S1, O1> & Dict<S2, O2>;
}


interface Animal {
    nombre: string
}


let r = f('perro', {nombre: 'yunco'} as Animal);

let r2 = g(r, 'contar', 1)

console.log(r2.contar + 1);
console.log(r2.perro.nombre);


type ClsParam1<T extends new (p1: any, ...rest: any) => any> = T extends new(p1: infer P, ...rest: any) => any ? P : never;

type ClsParam2<T extends new (p1: any, p2: any, ...rest: any) => any> = T extends new(p1: any, p2: infer P, ...rest: any) => any ? P : never;

type FnParam1<T extends (p1: any, ...rest: any) => any> = T extends (p1: infer P, ...rest: any) => any ? P : never;

type FnParam2<T extends (a: any, b: any, ...rest: any) => any> = T extends (a: any, b: infer P, ...rest: any) => any ? P : never;

function fun1(a: string) {}
function fun2(a: string, b: number) {}

class Clase {
    constructor(a: boolean, b: string, c: number) {}
}

type x = FnParam1<typeof fun2>; // esto es un string
type z = ClsParam2<typeof Clase>;

const r3 = f('numerito', 2 as FnParam2<typeof fun2>)

