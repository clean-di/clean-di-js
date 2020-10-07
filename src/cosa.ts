import {
    AsyncType,
    Binding,
    Class,
    FunctionLike,
    FunctionWithPromiseReturn,
    FunctionWithReturn,
    Instance
} from "./types";
import {getArguments} from "./argumentParser";



type Dependency =
    ClassDependency<any, any> |
    FunctionDependency<any, any> |
    ValueDependency<any, any> |
    AsyncDependency<any, any, any>;

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
}

export function add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<Binding<A, Instance<T>>>;
export function add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<Binding<A, ReturnType<T>>>;
export function add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<Binding<A, T>>;
export function add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<Binding<A, U>>;
export function add() {
    return new DependencyScopeImp().add(arguments[0]);
}

export interface DependencyScope<B> {
    add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<B & Binding<A, Instance<T>>>;
    add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<B & Binding<A, ReturnType<T>>>;
    add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<B & Binding<A, T>>;
    add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<B & Binding<A, U>>;
    build(): B;
}

class DependencyScopeImp<B> {

    readonly deps: Dependency[] = [];
    readonly aliasUsed = {};

    add<A extends string, T extends Class>(dep: ClassDependency<A, T>): DependencyScope<B & Binding<A, Instance<T>>>;
    add<A extends string, T extends FunctionWithReturn>(dep: FunctionDependency<A, T>): DependencyScope<B & Binding<A, ReturnType<T>>>;
    add<A extends string, T>(dep: ValueDependency<A, T>): DependencyScope<B & Binding<A, T>>;
    add<A extends string, U, T extends AsyncType<U>>(dep: AsyncDependency<A, U, T>): DependencyScope<B & Binding<A, U>>;
    add() {
        const dep = arguments[0] as Dependency;
        AddArgumentsChecker.checkDependency(dep, this.aliasUsed);
        this.deps.push(dep);

        return this;
    }

    build(): B {


        // hacer objeto con dependencias por alias A: dependencyChain

        // hacer objeto con propiedades enumerables por cada key del objeto de arriba
        //Object.defineProperty()

        throw 'not implemented';

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
        const isValid = (s: string) => typeof dep.alias === 'string' && dep.alias.length > 0 && /[a-zA-Z_$][0-9a-zA-Z_$]*/.test(s);
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
            (dep.deps as DependencyScopeImp<any>).deps.forEach(d => this.checkDependency(d, sublevelAliasUsed));
        }
    }

    static checkRepeatedAlias(usedAlias: object, alias: string[]) {
        alias.forEach(a => {
            if (a in usedAlias) {
                throw `{a} alias already used`;
            }
            (usedAlias as any)[a] = true;
        });
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
        readonly singleton: boolean
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
        readonly memoize: boolean
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
        readonly copy: boolean
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
        return this.timeout ? timeout(this.val, this.timeout) : this.val;
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
        readonly memoize: boolean,
        readonly timeout?: number
    ) {}

    get(): any {
        throw `For an async value you must call getAsync()`;
    }

    async callFunctionAsync() {
        const args = this.timeout
            ? this.args.map(a => timeout(a.getAsync(), this.timeout as number))
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


function timeout(p: Promise<any>, ms: number) {
    return Promise.race([
        p,
        new Promise((resolve, reject) => setTimeout(reject, ms))
    ]);
}


class DependencyChainBuilder {

    static build(d: Dependency, siblings: Dependency[], chain: any[] = []) {


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

}




// todo se podría usar esto para dejar el tipo del objeto final?
type ObjectFromT<T> =
    {[key in keyof T]: T[key]}