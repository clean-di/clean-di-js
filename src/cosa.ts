import {AsyncType, Binding, Class, FunctionLike, FunctionWithReturn, Instance} from "./types";
import {getArguments} from "./argumentParser";



type Dependency =
    ClassDependency<any, any> |
    FunctionDependency<any, any> |
    ValueDependency<any, any> |
    AsyncDependency<any, any, any>;

interface BaseDependency<A extends string> {
    alias: A | [A, ...string[]];
    deps?: DependencyScope<any>;
    singleton?: boolean;
}

interface ClassDependency<A extends string, T extends Class> extends BaseDependency<A> {
    cls: T;
}

interface FunctionDependency<A extends string, T extends Function> extends BaseDependency<A> {
    fn: T;
}

interface ValueDependency<A extends string, T> extends BaseDependency<A> {
    val: T;
}

interface AsyncDependency<A extends string, U, T extends AsyncType<U>> extends BaseDependency<A> {
    async: T;
}

type DependencyImplementation =
    ClassDependencyImplementation |
    FunctionDependencyImplementation |
    ValueDependencyImplementation |
    AsyncDependencyImplementation;

interface BaseDependencyImplementation {
    alias: string | [string, ...string[]];
    deps? : DependencyImplementation; // todo should this be changed by dependency chain?
    singleton?: boolean; // means call once, and reuse value the following times
}

interface ClassDependencyImplementation extends BaseDependencyImplementation {
    type: 'cls';
    reference: Class;
    arguments: string[];
}

interface FunctionDependencyImplementation extends BaseDependencyImplementation {
    type: 'fn';
    reference: FunctionWithReturn;
    arguments: string[];
}

interface ValueDependencyImplementation extends BaseDependencyImplementation {
    type: 'val';
    reference: any;
}

interface AsyncDependencyImplementation extends BaseDependencyImplementation {
    type: 'async';
    reference: AsyncType<any>;
    arguments?: string[];
    timeout?: number; // defaults to infinite
}


export function add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<Binding<A, Instance<T>>>;
export function add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<Binding<A, ReturnType<T>>>;
export function add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<Binding<A, T>>;
export function add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<Binding<A, U>>;
export function add() {
    return new DependencyScope().add(arguments as any);
}

class DependencyScope<B> {

    private readonly _deps: Dependency[] = [];
    private readonly _aliasUsed = {};
    //
    // private readonly nameToCls: { [index:string]: FunctionMapping } = {};

    add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<B & Binding<A, Instance<T>>>;
    add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<B & Binding<A, ReturnType<T>>>;
    add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<B & Binding<A, T>>;
    add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<B & Binding<A, U>>;
    //add(dep: AsyncDependency<any>): DependencyScope;
    add() {
        const dep = arguments[0] as Dependency;
        DependencyScope.checkDependency(dep, this._aliasUsed);
        this._deps.push(dep);

        // const clsArgs = getArguments(mapping.cls)
        //     .map(a => a.toLowerCase());
        //
        // const clsAlias = mapping.alias
        //     ? mapping.alias.map(a => a.toLowerCase()) :
        //     [mapping.cls.name.toLowerCase()];
        //
        // const clsMap: FunctionMapping = {
        //     arguments: clsArgs,
        //     reference: mapping.cls,
        //     scope: mapping.deps
        // }
        //
        // clsAlias.forEach(a => {
        //     if (a in this.nameToCls)
        //         throw `${a} already declared as name`;
        //     this.nameToCls[a] = clsMap;
        // });

        return this;
    }

    private static checkDependency(dep: Dependency, aliasUsed: object) {
        if ((dep as ClassDependency<any, any>).cls != null)
            return this.checkClassDependency(dep as ClassDependency<any, any>, aliasUsed);
        if ((dep as FunctionDependency<any, any>).fn != null)
            return this.checkFunctionDependency(dep as FunctionDependency<any, any>, aliasUsed);
        if ((dep as ValueDependency<any, any>).val != null)
            return this.checkValueDependency(dep as ValueDependency<any, any>, aliasUsed);
        if ((dep as AsyncDependency<any, any, any>).async != null)
            return this.checkAsyncDependency(dep as AsyncDependency<any, any, any>, aliasUsed);
        throw 'The dependency definition must be either a class, a function, a value or an async. Check the API.';
    }

    private static checkClassDependency(dep: ClassDependency<any, any>, aliasUsed: object) {
        if (typeof dep.cls != 'function')
            throw 'cls must be a class constructor';
        this.checkBaseDependency(dep, aliasUsed);
    }

    private static checkFunctionDependency(dep: FunctionDependency<any, any>, aliasUsed: object) {
        if (typeof dep.fn != 'function')
            throw 'fn must be a function';
        this.checkBaseDependency(dep, aliasUsed);
    }

    private static checkValueDependency(dep: ValueDependency<any, any>, aliasUsed: object) {
        const type = typeof dep.val;
        if (!['number', 'string', 'boolean'].some(t => t === type))
            throw 'val must be a number, a string or a boolean value';
        this.checkBaseDependency(dep, aliasUsed);
    }

    private static checkAsyncDependency(dep: AsyncDependency<any, any, any>, aliasUsed: object) {
        if (typeof dep.async !== 'function' && !(dep.async instanceof Promise))
            throw 'async must be an async function or a promise';
        this.checkBaseDependency(dep, aliasUsed);
    }

    private static checkBaseDependency(dep: BaseDependency<any>, aliasUsed: object) {
        const isValid = (s: string) => typeof dep.alias === 'string' && dep.alias.length > 0 && /[a-zA-Z_$][0-9a-zA-Z_$]*/.test(s);
        const areValid = (ss: string[]) => ss instanceof Array && ss.length > 0 && ss.every(isValid);
        if (!isValid(dep.alias as string) && !areValid(dep.alias as string[]))
            throw 'alias must be a string or an array of strings with a valid javascript variable name';

        dep.alias instanceof Array
            ? this.checkRepeatedAlias(aliasUsed, dep.alias as string[])
            : this.checkRepeatedAlias(aliasUsed, [dep.alias as string]);

        if (dep.deps != null && !(dep.deps instanceof DependencyScope))
            throw 'deps must be defined properly';
        if (dep.deps instanceof DependencyScope) {
            const sublevelAliasUsed = {};
            (dep.deps as DependencyScope<any>)._deps.forEach(d => this.checkDependency(d, sublevelAliasUsed));
        }
    }

    private static checkRepeatedAlias(usedAlias: object, alias: string[]) {
        alias.forEach(a => {
            if (a in usedAlias) {
                throw `{a} alias already used`;
            }
            (usedAlias as any)[a] = true;
        });
    }

    build(): B {
        throw 'not implemented';
        // build dependency implementations with paths & caches
        //Object.defineProperty()
    }



}

class ProviderWhatever {
    // get<C extends Class>(cls: C): InstanceType<C>;
    // get<F extends FunctionWithReturn>(fn: F): ReturnType<F>;
    // get(x) {
    //
    // }
}
