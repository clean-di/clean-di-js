import {AsyncType, Binding, Class, FunctionLike, FunctionWithReturn, Instance} from "./utilityTypes";
import {getArguments} from "./argumentParser";
import {ArrayUtils, PromiseUtils} from "./pollyfills";


type Dependency =
    ClassDependency<any, any> |
    FunctionDependency<any, any> |
    ValueDependency<any, any> |
    AsyncDependency<any, any, any> |
    UnresolvedDependency;

interface BaseDependency<A extends string> {
    alias: A | [A, ...string[]];
    deps?: DependencyScope<any>;
}

export interface ClassDependency<A extends string, T extends Class> extends BaseDependency<A> {
    cls: T;
    singleton?: boolean;
}

export interface FunctionDependency<A extends string, T extends Function> extends BaseDependency<A> {
    fn: T;
    memoize?: boolean;
}

export interface ValueDependency<A extends string, T> extends BaseDependency<A> {
    val: T;
    copy?: boolean;
}

export interface AsyncDependency<A extends string, U, T extends AsyncType<U>> extends BaseDependency<A> {
    async: T;
    memoize?: boolean;
    timeout?: number;
}

interface UnresolvedDependency extends BaseDependency<any>{
    unresolved: true;
}

export function add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<Binding<A, Instance<T>>>;
export function add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<Binding<A, ReturnType<T>>>;
export function add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<Binding<A, T>>;
export function add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<Binding<A, U>>;
export function add(dep: any) {
    return new DependencyScopeImp().add(dep);
}

export interface DependencyScope<B> {
    add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<B & Binding<A, Instance<T>>>;
    add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<B & Binding<A, ReturnType<T>>>;
    add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<B & Binding<A, T>>;
    add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<B & Binding<A, U>>;
    build(options?: BuildOptions): B;
}

export interface BuildOptions {
    allowUnresolved?: boolean; // allows unresolved args and replaces it with undefined
    caseInsensitive?: boolean; // alias and function arguments case will be ignored when building the dependency tree
    async?: boolean; // todo podría ser interesante un arbol sincrono o asíncrono exclusivo?
}

class DependencyScopeImp<B> implements DependencyScope<B>{

    readonly dependencies:  Dependency[] = [];
    readonly aliasUsed = {};

    add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<B & Binding<A, Instance<T>>>;
    add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<B & Binding<A, ReturnType<T>>>;
    add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<B & Binding<A, T>>;
    add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<B & Binding<A, U>>;
    add(dep: any) {
        AddArgumentsChecker.checkDependency(dep, this.aliasUsed);
        this.dependencies.push(dep);

        return this;
    }

    build(options: BuildOptions = {}): B {
        const dependencyConstructors: {[key: string]: DepedencyConstructor} = {};

        this.dependencies.forEach(d => {
            const key = DependencyTreeBuilder.getMainAlias(d);
            const tree = DependencyTreeBuilder.build(d, this.dependencies, [], options);
            dependencyConstructors[key] = tree;
        });

        const dependencyBox = {};

        Object.keys(dependencyConstructors).forEach(key => {
            Object.defineProperty(dependencyBox, key, {
                enumerable: true,
                get: () => dependencyConstructors[key].get()
            });
            Object.defineProperty(dependencyBox, `${key}Async`, {
                enumerable: true,
                get: () => dependencyConstructors[key].getAsync()
            });
        });

        return dependencyBox as B;
    }
}


class AddArgumentsChecker {

    static checkDependency(dep: Dependency, aliasUsed: object) {
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

    static checkClassDependency(dep: ClassDependency<any, any>, aliasUsed: object) {
        if (typeof dep.cls != 'function')
            throw 'cls must be a class constructor';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkFunctionDependency(dep: FunctionDependency<any, any>, aliasUsed: object) {
        if (typeof dep.fn != 'function')
            throw 'fn must be a function';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkValueDependency(dep: ValueDependency<any, any>, aliasUsed: object) {
        const type = typeof dep.val;
        if (!['number', 'string', 'boolean'].some(t => t === type))
            throw 'val must be a number, a string or a boolean value';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkAsyncDependency(dep: AsyncDependency<any, any, any>, aliasUsed: object) {
        if (typeof dep.async !== 'function' && !(dep.async instanceof Promise))
            throw 'async must be an async function or a promise';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkBaseDependency(dep: BaseDependency<any>, aliasUsed: object) {
        const isValid = (s: string) => typeof s === 'string' && s.length > 0 && /[a-zA-Z_$][0-9a-zA-Z_$]*/.test(s);
        const areValid = (ss: string[]) => ss instanceof Array && ss.length > 0 && ss.every(isValid);
        if (!isValid(dep.alias as string) && !areValid(dep.alias as string[]))
            throw 'alias must be a string or an array of strings with a valid javascript variable name';

        dep.alias instanceof Array
            ? this.checkRepeatedAlias(aliasUsed, dep.alias as string[])
            : this.checkRepeatedAlias(aliasUsed, [dep.alias as string]);

        if (dep.deps != null && !(dep.deps instanceof DependencyScopeImp))
            throw 'deps must be defined properly';
        if (dep.deps instanceof DependencyScopeImp) {
            const sublevelAliasUsed = {};
            (dep.deps as DependencyScopeImp<any>).dependencies.forEach(d => this.checkDependency(d, sublevelAliasUsed));
        }
    }

    static checkRepeatedAlias(usedAlias: object, alias: string[]) {
        alias.forEach(a => {
            if (a in usedAlias) {
                throw `'${a}' alias already used`;
            }
            (usedAlias as any)[a] = true;
        });
    }
}


class DependencyTreeBuilder {

    static build(d: Dependency, globalDeps: Dependency[], chain: any[], options: BuildOptions): DepedencyConstructor {

        const getConstructors = (ref: FunctionLike) => {
            const updatedChain = this.createChain(ref, chain);
            return getArguments(ref).map(argName => {
                const argDep = this.getDependencyFromArgName(argName, d, globalDeps, options.allowUnresolved);
                return this.build(argDep, globalDeps, updatedChain, options);
            });
        };

        if (this.isClass(d)) {
            return new ClassDependencyConstructor(d.cls, getConstructors(d.cls), d.singleton);
        }

        if (this.isFunction(d)) {
            return new FunctionDependencyConstructor(d.fn, getConstructors(d.fn), d.memoize);
        }

        if (this.isAsyncFunction(d)) {
            return new AsyncFunctionDependencyConstructor(d.async, getConstructors(d.async), d.memoize, d.timeout);
        }

        if (this.isValue(d)) {
            return new ValueDependencyConstructor(d.val, d.copy);
        }

        if (this.isAsyncValue(d)) {
            return new AsyncValueDependencyConstructor(d.async, d.timeout);
        }

        // is will work only if allowUnresolved is on
        if (this.isUnresolved(d)) {
            return new UnresolvedDependencyConstructor();
        }

        throw 'Type error';
    }

    static getDependencyFromArgName(argName: string, d: Dependency, globalDeps: Dependency[], allowUnresolved?: boolean): Dependency {
        // first try to find the dependency in the internal dependency list
        if (d.deps) {
            const internalDependencies = (d.deps as any as DependencyScopeImp<any>).dependencies;
            const depFound = ArrayUtils.find(internalDependencies, d => this.isArgInAlias(argName, d));
            if (depFound)
                return depFound;
        }

        // no luck, so now we try with global dependencies
        const depFound = ArrayUtils.find(globalDeps, d => this.isArgInAlias(argName, d));
        if (depFound)
            return depFound;

        // finally no dependency found, so if it is allowed to have unresolved dependencies fine

        if (allowUnresolved)
            return {
                unresolved: true,
                alias: '0'
            };

        // else boom

        throw `Unresolved dependency ${argName}`;
    }

    static isArgInAlias(argName: string, d: Dependency) {
        return argName === d.alias || (d.alias instanceof Array && d.alias.some(a => argName === a));
    }

    static createChain(ref: any, chain: any[]): any[] {
        if (chain.some(c => ref === c)) {
            throw 'Cyclic dependency';
        }
        return [...chain, ref];
    }

    static getMainAlias(dependency: Dependency): string {
        return typeof dependency.alias === 'string'
            ? dependency.alias
            : dependency.alias[0];
    }

    static isClass(d: Dependency): d is ClassDependency<any, any> {
        return (d as ClassDependency<any, any>).cls != null;
    }

    static isFunction(d: Dependency): d is FunctionDependency<any, any> {
        return (d as FunctionDependency<any, any>).fn != null;
    }

    static isValue(d: Dependency): d is ValueDependency<any, any> {
        return (d as ValueDependency<any, any>).val != null;
    }

    static isAsyncFunction(d: Dependency): d is AsyncDependency<any, any, any> {
        return typeof (d as AsyncDependency<any, any, any>).async === 'function' ;
    }

    static isAsyncValue(d: Dependency): d is AsyncDependency<any, any, any> {
        return (d as AsyncDependency<any, any, any>).async instanceof Promise;
    }

    static isUnresolved(d: Dependency): d is UnresolvedDependency {
        return (d as UnresolvedDependency).unresolved != null;
    }

}


interface DepedencyConstructor {
    readonly isAsync: boolean;
    get(): any;
    getAsync(): Promise<any>;
}

class CustomUndefined {}


class ClassDependencyConstructor implements DepedencyConstructor {

    readonly isAsync = false;

    singletonInstance: any = CustomUndefined;

    constructor(
        readonly cls: Class,
        readonly args: DepedencyConstructor[],
        readonly singleton?: boolean
    ) {
    }

    newInstance() {
        const resolvedArgs = this.args.map(a => a.get());
        return new (Function.prototype.bind.apply(this.cls, [null, ...resolvedArgs]));
    }

    getSingletonInstance() {
        if (this.singletonInstance === CustomUndefined) {
            this.singletonInstance = this.newInstance();
        }
        return this.singletonInstance;
    }

    get(): any {
        return this.singleton ? this.getSingletonInstance() : this.newInstance();
    }

    async newInstanceAsync() {
        const resolvedArgs = await Promise.all(this.args.map(a => a.getAsync()))
        return new (Function.prototype.bind.apply(this.cls, [null, ...resolvedArgs]));
    }

    async getSingletonInstanceAsync() {
        if (this.singletonInstance === CustomUndefined) {
            this.singletonInstance = await this.newInstanceAsync();
        }
        return this.singletonInstance;
    }

    getAsync() {
        return this.singleton? this.getSingletonInstanceAsync() : this.newInstanceAsync();
    }
}


class FunctionDependencyConstructor implements DepedencyConstructor {

    readonly isAsync = false;

    memoizedValue: any = CustomUndefined;

    constructor(
        readonly fn: Function,
        readonly args: DepedencyConstructor[],
        readonly memoize?: boolean
    ) {}

    callFunction() {
        const resolvedArgs = this.args.map(a => a.get());
        return this.fn.apply(null, resolvedArgs);
    }

    getMemoizedValue() {
        if (this.memoizedValue === CustomUndefined) {
            this.memoizedValue = this.callFunction();
        }
        return this.memoizedValue;
    }

    get(): any {
        return this.memoize ? this.getMemoizedValue() : this.callFunction();
    }

    async callFunctionAsync() {
        const resolvedArgs = await Promise.all(this.args.map(a => a.getAsync()));
        return this.fn.apply(null, resolvedArgs);
    }

    async getMemoizedValueAsync() {
        if (this.memoizedValue === CustomUndefined) {
            this.memoizedValue = await this.callFunctionAsync();
        }
        return this.memoizedValue;
    }

    getAsync() {
        return this.memoize? this.getMemoizedValueAsync() : this.callFunctionAsync();
    }
}


class ValueDependencyConstructor implements DepedencyConstructor {

    readonly isAsync = false;

    constructor(
        readonly val: any,
        readonly copy?: boolean
    ) {
    }

    getValue() {
        return this.val;
    }

    getCopyOfValue() {
        throw 'not implemented';
    }

    get() {
        return this.copy ? this.getCopyOfValue() : this.getValue();
    }

    getValueAsync() {
        return Promise.resolve(this.val);
    }

    getCopyOfValueAsync(): Promise<any> {
        throw 'not implemented';
    }

    getAsync() {
        return this.copy ? this.getValueAsync() : this.getCopyOfValueAsync();
    }
}

class AsyncValueDependencyConstructor implements DepedencyConstructor {

    readonly isAsync = true;

    constructor(
        readonly val: Promise<any>,
        readonly timeout?: number
    ) {
    }

    get() {
        throw `For an async value you must call getAsync()`;
    }

    getAsync() {
        return this.timeout ? PromiseUtils.timeout(this.val, this.timeout) : this.val;
    }

    hasAsyncDependency() {
        return true;
    }
}


class AsyncFunctionDependencyConstructor implements DepedencyConstructor {

    readonly isAsync = true;

    memoizedValue: any = CustomUndefined;

    constructor(
        readonly fn: Function,
        readonly args: DepedencyConstructor[],
        readonly memoize?: boolean,
        readonly timeout?: number
    ) {}

    get(): any {
        throw `For an async value you must call getAsync()`;
    }

    async callFunctionAsync() {
        const args = this.timeout
            ? this.args.map(a => PromiseUtils.timeout(a.getAsync(), this.timeout as number))
            : this.args;
        const resolvedArgs = await Promise.all(args);
        return this.fn.apply(null, resolvedArgs);
    }

    async getMemoizedValueAsync() {
        if (this.memoizedValue === CustomUndefined) {
            this.memoizedValue = await this.callFunctionAsync();
        }
        return this.memoizedValue;
    }

    getAsync() {
        return this.memoize? this.getMemoizedValueAsync() : this.callFunctionAsync();
    }

    hasAsyncDependency() {
        return true;
    }
}


class UnresolvedDependencyConstructor implements DepedencyConstructor {

    readonly isAsync = false;

    get() {
        return undefined;
    }

    getAsync() {
        return Promise.resolve(undefined);
    }

    hasAsyncDependency() {
        return false;
    }
}



// idea
export const enum ArgumentNamingStyle {
    Exact, // uses the exact parameter value to search for a constructor function
    LowerCase, // whateverservice
    UpperCase, // WHATEVERSERVICE
    CamelCase, // whateverService
    PascalCase, // WhateverService,
    SnakeCase, // whatever_service
    SnakeUpperCase, // WHATEVER_SERVICE
    LeadingUnderscore = 32, // _(anything)
    TrailingUnderscore = 64, // (anything)_
    LeadingDollar = 128 // $(anything)
}





// todo se podría usar esto para dejar el tipo del objeto final?
type ObjectFromT<T> =
    {[key in keyof T]: T[key]}