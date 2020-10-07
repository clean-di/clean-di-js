import {getArguments} from "../src/argumentParser";

describe('The argument parser', () => {
    it('should parse empty function', () => {
        function fun() {}

        const s = getArguments(fun);

        expect(s.length).toBe(0);
    });

    it('should parse function with one param', () => {
        // @ts-ignore
        function fun(a) {}

        const s = getArguments(fun);

        expect(s).toContain('a');
    });

    it('should parse function with many s.arguments', () => {
        // @ts-ignore
        function fun(a, b, c) {}

        const s = getArguments(fun);

        expect(s).toContain('a');
        expect(s).toContain('b');
        expect(s).toContain('c');
    });

    it('should parse anonymous function as var', () => {
        // @ts-ignore
        const fun = function(a, b, c) {}

        const s = getArguments(fun);

        expect(s).toContain('a');
        expect(s).toContain('b');
        expect(s).toContain('c');
    });

    it('should parse named function as var', () => {
        // @ts-ignore
        const fun = function named(a, b, c) {}

        const s = getArguments(fun);

        expect(s).toContain('a');
        expect(s).toContain('b');
        expect(s).toContain('c');
    });

    it('should parse function as expression', () => {
        const fun = (function() {});

        const s = getArguments(fun);

        expect(s.length).toBe(0);
    });

    // arrow support is removed
    // it('should parse arrow function without s.arguments', () => {
    //     const fun = () => {}
    //
    //     const s = parse(fun);
    //
    //     expect(s.arguments.length).toBe(0);
    // });
    //
    // it('should parse arrow function as expression', () => {
    //     // @ts-ignore
    //     const fun = ((first, second, third) => {});
    //
    //     const s = parse(fun);
    //
    //     expect(s.arguments).toContain('first');
    //     expect(s.arguments).toContain('second');
    //     expect(s.arguments).toContain('third');
    // });

    it('should parse class without s.arguments', () => {
        class C {
            constructor() {
            }
        }

        const s = getArguments(C);

        expect(s.length).toBe(0);
    });

    it('should parse class with parameters', () => {
        class C {
            // @ts-ignore
            constructor(a, second_) {
            }
        }

        const s = getArguments(C);

        expect(s).toContain('a');
        expect(s).toContain('second_');
    });

    it('should parse class expression without parameters', () => {
        const c = class {
            constructor() {
            }
        }

        const s = getArguments(c);

        expect(s.length).toBe(0);
    });

    it('should parse class expression with parameters', () => {
        const c = class {
            // @ts-ignore
            constructor(a,b,c,d,e) {
            }
        }

        const s = getArguments(c);

        expect(s).toContain('a');
        expect(s).toContain('b');
        expect(s).toContain('c');
        expect(s).toContain('d');
        expect(s).toContain('e');
    });

    it('should parse class with implicit constructor', () => {
        class C { }

        const s = getArguments(C);

        expect(s.length).toBe(0);
    });

    it('should parse class expression with implicit constructor', () => {
        const c = class C { }

        const s = getArguments(c);

        expect(s.length).toBe(0);
    });

    // transpiler destroys this test but it's very unlikely this is an issue
    // xit('should not support anonymous classes', () => {
    //     expect(() => parse(class { })).toThrowError();
    // });

    it('should not support anonymous function', () => {
        expect(() => getArguments(function() { })).toThrowError();
    });

    it('should not support anonymous arrow function', () => {
        expect(() => getArguments(() => { })).toThrowError();
    });
});