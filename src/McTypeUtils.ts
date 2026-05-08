export const isString = (v: unknown): v is string => typeof v === "string";
export const isSymbol = (v: unknown): v is symbol => typeof v === "symbol";
export const isFunction = (v: unknown): v is Function => typeof v === "function";
export const isObject = (v: unknown): v is object => typeof v === "object" && v !== null;
