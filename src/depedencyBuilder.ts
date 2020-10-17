import {
    AsyncBinding,
    AsyncType,
    Binding,
    Class,
    FunctionLike,
    FunctionWithReturn,
    Instance, PromiseReturnType, StringValueObject,
    ToAsyncBinding
} from "./utilityTypes";
import {getArguments} from "./argumentParser";
import {ArrayUtils, PromiseUtils} from "./pollyfills";





export interface BuildOptions {
    allowUnresolved?: boolean; // allows unresolved args and replaces it with undefined
    //caseInsensitive?: boolean; // alias and function arguments case will be ignored when building the dependency tree
}

type Alias<A extends string> = A | [A, ...string[]];


export type DependencyOptionsType =
    DependencyScope<any, any> |
    AsableDependencyScope<any, any> |
    AsyncDependencyScope<any, any> |
    AsableAsyncDependencyScope<any, any>;

export interface DependencyOptions {
    dependencies?: DependencyOptionsType;
}


export interface ConstructorOptions extends DependencyOptions {
    singleton?: boolean;
}


export interface FunctionOptions extends DependencyOptions {
    memoize?: boolean;
}


export interface ValueOptions extends DependencyOptions {
    copy?: boolean;
}


export interface AsyncOptions extends DependencyOptions {
    memoize?: boolean;
    timeout?: number;
}





export interface DependencyScope<B extends StringValueObject<any>, LA extends string> {
    addClass<A extends string, T extends Class>(alias: Alias<A>, constructor: T, options?: ConstructorOptions): A extends keyof B ? never : AsableDependencyScope<B & Binding<A, Instance<T>>, A>;
    addFunction<A extends string, T extends FunctionWithReturn>(alias: Alias<A>, fun: T, options?: FunctionOptions): A extends keyof B ? never : AsableDependencyScope<B & Binding<A, ReturnType<T>>, LA>;
    addValue<A extends string, T>(alias: Alias<A>, value: T, options?: ValueOptions): A extends keyof B ? never : AsableDependencyScope<B & Binding<A, T>, LA>;
    addAsync<A extends string, U, T extends AsyncType<U>>(alias: Alias<A>, async: AsyncType<U>, options?: AsyncOptions): A extends keyof B ? never : AsableAsyncDependencyScope<ToAsyncBinding<B> & AsyncBinding<A, U>, LA>;
    addUndefined<A extends string>(alias: Alias<A>): A extends keyof B ? never : DependencyScope<B & Binding<A, undefined>, LA>;
    build(options?: BuildOptions): B;
}


export interface AsableDependencyScope<B extends StringValueObject<any>, LA extends string> extends DependencyScope<B, LA> {
    as<I>(): B[LA] extends I ? DependencyScope<Omit<B, LA> & Binding<LA, I>, ''> : never;
}


export interface AsyncDependencyScope<B extends StringValueObject<Promise<any>>, LA extends string> {
    addClass<A extends string, T extends Class>(alias: Alias<A>, constructor: T, options?: ConstructorOptions): A extends keyof B ? never : AsableAsyncDependencyScope<B & AsyncBinding<A, Instance<T>>, A>;
    addFunction<A extends string, T extends FunctionWithReturn>(alias: Alias<A>, fun: T, options?: FunctionOptions): A extends keyof B ? never : AsableAsyncDependencyScope<B & AsyncBinding<A, ReturnType<T>>, LA>;
    addValue<A extends string, T>(alias: Alias<A>, value: T, options?: ValueOptions): A extends keyof B ? never : AsableAsyncDependencyScope<B & AsyncBinding<A, T>, LA>;
    addAsync<A extends string, U, T extends AsyncType<U>>(alias: Alias<A>, async: AsyncType<U>, options?: AsyncOptions): A extends keyof B ? never : AsableAsyncDependencyScope<B & AsyncBinding<A, U>, LA>;
    addUndefined<A extends string>(alias: Alias<A>): A extends keyof B ? never : AsyncDependencyScope<B & AsyncBinding<A, undefined>, LA>;
    build(options?: BuildOptions): B;
}


export interface AsableAsyncDependencyScope<B extends StringValueObject<Promise<any>>, LA extends string> extends AsyncDependencyScope<B, LA> {
    as<I>(): PromiseReturnType<B[LA]> extends I ? DependencyScope<Omit<B, LA> & AsyncBinding<LA, I>, ''> : never;
}


export class DependencyScopeFactory {

    static addClass<A extends string, T extends Class>(alias: Alias<A>, constructor: T, options: ConstructorOptions = {}): AsableDependencyScope<Binding<A, Instance<T>>, A> {
        return new DependencyScopeImpl().addClass(alias, constructor, options) as any;
    }

    static addFunction<A extends string, T extends FunctionWithReturn>(alias: Alias<A>, fun: T, options: FunctionOptions = {}): AsableDependencyScope<Binding<A, T>, A> {
        return new DependencyScopeImpl().addFunction(alias, fun, options);
    }

    static addValue<A extends string, T>(alias: Alias<A>, value: T, options: ValueOptions = {}): AsableDependencyScope<Binding<A, T>, A> {
        return new DependencyScopeImpl().addValue(alias, value, options);
    }

    static addAsync<A extends string, U, T extends AsyncType<U>>(alias: Alias<A>, async: T, options: AsyncOptions = {}): AsableAsyncDependencyScope<AsyncBinding<A, U>, A> {
        return new DependencyScopeImpl().addAsync(alias, async, options);
    }

    static addUndefined<A extends string>(alias: Alias<A>): DependencyScope<Binding<A, undefined>, A> {
        return new DependencyScopeImpl().addUndefined(alias);
    }
}




type Dependency =
    ClassDependency |
    FunctionDependency |
    ValueDependency |
    AsyncDependency |
    UnresolvedDependency;


interface BaseDependency {
    alias: string | [string, ...string[]];
    deps?: DependencyOptionsType;
}


interface ClassDependency extends BaseDependency {
    cls: Class;
    singleton?: boolean;
}


interface FunctionDependency extends BaseDependency {
    fn: Function;
    memoize?: boolean;
}


interface ValueDependency extends BaseDependency {
    val: any;
    copy?: boolean;
}


interface AsyncDependency extends BaseDependency {
    async: AsyncType<any>;
    memoize?: boolean;
    timeout?: number;
}


interface UnresolvedDependency extends BaseDependency {
    unresolved: true;
}


class DependencyScopeImpl {

    readonly dependencies:  Dependency[] = [];
    readonly aliasUsed = {};
    public buildAsync: boolean = false;

    addClass<A extends string, T extends Class>(alias: Alias<A>, constructor: T, options: ConstructorOptions = {}) {

        const d: ClassDependency = {
            alias: alias instanceof Array ? [...alias] : alias,
            cls: constructor,
            singleton: options.singleton,
            deps: options.dependencies
        };

        AddArgumentsChecker.checkDependency(d, this.aliasUsed);
        this.dependencies.push(d);

        return this;
    }

    addFunction<A extends string, T extends FunctionWithReturn>(alias: Alias<A>, fun: T, options: FunctionOptions = {}) {

        const d: FunctionDependency = {
            alias: alias instanceof Array ? [...alias] : alias,
            fn: fun,
            memoize: options.memoize,
            deps: options.dependencies
        };

        AddArgumentsChecker.checkDependency(d, this.aliasUsed);
        this.dependencies.push(d);

        return this as any;
    }

    addValue<A extends string, T>(alias: Alias<A>, value: T, options: ValueOptions = {}) {

        const d: ValueDependency = {
            alias: alias instanceof Array ? [...alias] : alias,
            val: value,
            copy: options.copy,
            deps: options.dependencies
        };

        AddArgumentsChecker.checkDependency(d, this.aliasUsed);
        this.dependencies.push(d);

        return this as any;
    }

    addUndefined<A extends string>(alias: Alias<A>) {

        const d: UnresolvedDependency = {
            alias: alias instanceof Array ? [...alias] : alias,
            unresolved: true,
        };

        this.dependencies.push(d);

        return this as any;
    }

    as<I>() {
        return this as any;
    }

    addAsync<A extends string, U, T extends AsyncType<U>>(alias: Alias<A>, async: AsyncType<U>, options: AsyncOptions = {}) {

        const d: AsyncDependency = {
            alias: alias instanceof Array ? [...alias] : alias,
            async: async,
            memoize: options.memoize,
            timeout: options.timeout,
            deps: options.dependencies
        };

        AddArgumentsChecker.checkDependency(d, this.aliasUsed);
        this.dependencies.push(d);

        this.buildAsync = true;

        return this as any;
    }

    build(options: BuildOptions = {}) {
        const dependencyConstructors: { [key: string]: DepedencyConstructor } = {};

        this.dependencies.forEach(d => {
            const key = DependencyTreeBuilder.getMainAlias(d);
            const tree = DependencyTreeBuilder.build(d, this.dependencies, [], options);
            dependencyConstructors[key] = tree;
        });

        const dependencyBox = {};

        Object.keys(dependencyConstructors).forEach(key => {
            Object.defineProperty(dependencyBox, key, {
                enumerable: true,
                get: () => this.buildAsync ? dependencyConstructors[key].getAsync() : dependencyConstructors[key].get()
            });
        });

        return dependencyBox;
    }
}


class AddArgumentsChecker {

    static checkDependency(dep: Dependency, aliasUsed: object) {
        if ((dep as ClassDependency).cls != null)
            return this.checkClassDependency(dep as ClassDependency, aliasUsed);
        if ((dep as FunctionDependency).fn != null)
            return this.checkFunctionDependency(dep as FunctionDependency, aliasUsed);
        if ((dep as ValueDependency).val != null)
            return this.checkValueDependency(dep as ValueDependency, aliasUsed);
        if ((dep as AsyncDependency).async != null)
            return this.checkAsyncDependency(dep as AsyncDependency, aliasUsed);
        throw 'The dependency definition must be either a class, a function, a value or an async. Check the API.';
    }

    static checkClassDependency(dep: ClassDependency, aliasUsed: object) {
        if (typeof dep.cls != 'function')
            throw 'cls must be a class constructor';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkFunctionDependency(dep: FunctionDependency, aliasUsed: object) {
        if (typeof dep.fn != 'function')
            throw 'fn must be a function';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkValueDependency(dep: ValueDependency, aliasUsed: object) {
        const type = typeof dep.val;
        if (!['number', 'string', 'boolean'].some(t => t === type))
            throw 'val must be a number, a string or a boolean value';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkAsyncDependency(dep: AsyncDependency, aliasUsed: object) {
        if (typeof dep.async !== 'function' && !(dep.async instanceof Promise))
            throw 'async must be an async function or a promise';
        this.checkBaseDependency(dep, aliasUsed);
    }

    static checkBaseDependency(dep: BaseDependency, aliasUsed: object) {
        const isValid = (s: string) => typeof s === 'string' && s.length > 0 && /[a-zA-Z_$][0-9a-zA-Z_$]*/.test(s);
        const areValid = (ss: string[]) => ss instanceof Array && ss.length > 0 && ss.every(isValid);
        if (!isValid(dep.alias as string) && !areValid(dep.alias as string[]))
            throw 'alias must be a string or an array of strings with a valid javascript variable name';

        dep.alias instanceof Array
            ? this.checkRepeatedAlias(aliasUsed, dep.alias as string[])
            : this.checkRepeatedAlias(aliasUsed, [dep.alias as string]);

        if (dep.deps != null && !(dep.deps instanceof DependencyScopeImpl))
            throw 'deps must be defined properly';
        if (dep.deps) {
            const sublevelAliasUsed = {};
            (dep.deps as DependencyScopeImpl).dependencies.forEach(d => this.checkDependency(d, sublevelAliasUsed));
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
            return new AsyncFunctionDependencyConstructor(d.async as Function, getConstructors(d.async as Function), d.memoize, d.timeout);
        }

        if (this.isValue(d)) {
            return new ValueDependencyConstructor(d.val, d.copy);
        }

        if (this.isAsyncValue(d)) {
            return new AsyncValueDependencyConstructor(d.async as Promise<any>, d.timeout);
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
            const internalDependencies = (d.deps as any as DependencyScopeImpl).dependencies;
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

    static isClass(d: Dependency): d is ClassDependency {
        return (d as ClassDependency).cls != null;
    }

    static isFunction(d: Dependency): d is FunctionDependency {
        return (d as FunctionDependency).fn != null;
    }

    static isValue(d: Dependency): d is ValueDependency {
        return (d as ValueDependency).val != null;
    }

    static isAsyncFunction(d: Dependency): d is AsyncDependency {
        return typeof (d as AsyncDependency).async === 'function' ;
    }

    static isAsyncValue(d: Dependency): d is AsyncDependency {
        return (d as AsyncDependency).async instanceof Promise;
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

