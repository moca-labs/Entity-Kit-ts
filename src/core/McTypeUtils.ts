export const isString = (v: unknown): v is string => typeof v === "string";
export const isSymbol = (v: unknown): v is symbol => typeof v === "symbol";
export const isFunction = (v: unknown): v is Function => typeof v === "function";
export const isObject = (v: unknown): v is object => typeof v === "object" && v !== null;

// 점(.) 구분 경로로 중첩 객체의 값을 조회한다. (예: "profile.nickname")
export const findPath = (obj: object, path: string): any => path.split(".").reduce((acc: any, key) => acc?.[key], obj as any);
