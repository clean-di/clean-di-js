import {FunctionLike} from "./utilityTypes";
import {ArrayUtils} from "./pollyfills";

const enum FunctionType {
    Function, Class, ArrowFunction
}

interface FunctionStructure {
    type: FunctionType,
    src: string,
}

export function getArguments(fn: FunctionLike): string[] {
    const st = getFunctionStructure(fn);
    return FunctionLikeArgumentParser.build(st.type).getArguments(st.src, fn);
}

function getFunctionStructure(fn: FunctionLike): FunctionStructure {
    if (typeof fn !== 'function')
        throw `The type is ${typeof fn} and type function is required`;

    const name = fn.name;
    if (name == null || name.length === 0)
        throw 'Anonymous functions are not supported due to untraceability';

    const props = Object.getOwnPropertyNames(fn);
    const src = getCleanedSource(fn);

    if (isFunction(props, src))
        return {type: FunctionType.Function, src};

    if (isClass(props, src))
        return {type: FunctionType.Class, src};

    if (isArrow(props))
        throw 'Arrow functions are not supported';
        // maybe in a future version we can support arrow somehow
        //return {type: FunctionType.ArrowFunction, src};

    throw `The type is composed of ${props} and it is not recognized`;

    function isFunction(props: string[], src: string) {
        const fi = src.indexOf('function');
        const bi = src.indexOf('{'); // this before function indicates a class instance
        // 'caller' and 'prototype' also part of function only when in non-strict mode but they are not meaningful
        return fi > -1 && fi < bi && [ 'length', 'prototype', 'name' ].every(p => ArrayUtils.includes(props, p));
    }
    function isClass(props: string[], src: string) {
        const ci = src.indexOf('class');
        const bi = src.indexOf('{'); // this before function indicates a class instance
        return ci > -1 && ci < bi && [ 'length', 'prototype', 'name' ].every(p => ArrayUtils.includes(props, p));
    }
    function isArrow(props: string[]) {
        return [ 'length', 'name' ].every(p => ArrayUtils.includes(props, p));
    }
}

function getCleanedSource(fun: FunctionLike) {
    return fun.toString()
        .replace(/\/\/.*/g, '')
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\/\*[^*]+\*\//g, '')
}

abstract class FunctionLikeArgumentParser {

    abstract getArguments(src: string, ref: any): string[];

    splitParams(match: RegExpExecArray | null) {
        if (match == null) {
            throw 'Could not find the parameters section';
        }
        return match[1].length === 0 ? [] : match[1]
            .replace(/\s/g, '')
            .split(',')
    }

    static build(funType: FunctionType): FunctionLikeArgumentParser {
        switch (funType) {
            case FunctionType.Function: return new FunctionArgumentParser();
            case FunctionType.Class: return new ClassArgumentParser();
            case FunctionType.ArrowFunction: return new ArrowArgumentParser();
        }
    }
}

class FunctionArgumentParser extends FunctionLikeArgumentParser{
    getArguments(src: string, ref: Function): string[] {
        if (ref.length === 0)
            return [];

        const match = /function\s*[^(]*\(([^)]*)\)/.exec(src);

        return this.splitParams(match);
    }
}

class ClassArgumentParser extends FunctionLikeArgumentParser {
    getArguments(src: string, ref: Function): string[] {
        if (ref.length === 0)
            return [];

        const match = /(?<!\w)constructor\s*[^(]*\(([^)]*)\)/.exec(src);

        return this.splitParams(match);
    }
}

class ArrowArgumentParser extends FunctionLikeArgumentParser {
    getArguments(src: string, ref: Function): string[] {
        if (ref.length === 0)
            return [];

        const match = /\(([^)]*)\)\s*=>/.exec(src);

        return this.splitParams(match);
    }
}