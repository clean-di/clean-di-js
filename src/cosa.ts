import {Class, FunctionLike, FunctionWithReturn, Instance} from "./types";
import {getArguments} from "./argumentParser";


interface ResolverOptions {
    depsTree?: any;
}

const enum Directive {
    Singleton,
    Stateless,
    SharedSigleton
}

interface Mapping {
    fn: Class;
    alias?: string[];
    scope?: DependencyScope;
}

interface FunctionMapping {
    arguments: string[];
    reference: FunctionLike;
    scope?: DependencyScope;
}

export function deps(mapping: Mapping) {
    return new DependencyScope().deps(mapping);
}

export class DependencyScope {

    // this collection is just for debug purpose
    private readonly mappings: Mapping[] = [];

    private readonly nameToFn: { [index:string]: FunctionMapping } = {};

    // add(fun: Class): Context;
    // add(fun: Class, ...funs: Class[]): Context;
    // add(fun: Class, ...alias: string[]): Context;
    // add(fun: Class, alias?: string | string[], ctx?: Context): Context
    deps(mapping: Mapping): DependencyScope
    // add()
    {
        this.mappings.push(mapping);

        const fnArgs = getArguments(mapping.fn)
            .map(a => a.toLowerCase());
        const fnNameAlias = mapping.alias
            ? mapping.alias.map(a => a.toLowerCase()) :
            [mapping.fn.name.toLowerCase()];
        const funMap: FunctionMapping = {
            arguments: fnArgs,
            reference: mapping.fn,
            scope: mapping.scope
        }
        fnNameAlias.forEach(a => {
            if (a in this.nameToFn)
                throw `${a} already declared as name`;
            this.nameToFn[a] = funMap;
        });

        return this;
    }




    get<C extends Class>(cls: C): InstanceType<C>;
    get<F extends FunctionWithReturn>(fn: F): ReturnType<F>;
    get(x) {

    }




}

