import { ENTITY_FLAG } from "../McEntityCore";

const isEntityType = (type: any): boolean => !!type?.[Symbol.metadata]?.[ENTITY_FLAG];

/** @ENTITY 타입이면 생성자로, 아니면 함수 호출로 원소 하나를 해석한다 (배열/맵 원소, 맵 값에서 공유). */
export const resolveElement = (type: any, raw: any): any => (isEntityType(type) ? new type(raw) : type(raw));

/** String/Number/Boolean 은 함수 호출, 그 외(엔티티 포함 임의 클래스)는 생성자 호출. */
export const resolveScalar = (type: any, raw: any): any => ([String, Number, Boolean].includes(type) ? type(raw) : new type(raw));
