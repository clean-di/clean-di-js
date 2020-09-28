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
