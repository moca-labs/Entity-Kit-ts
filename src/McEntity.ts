// ┌─────────────────────────────────────────────────────────────────────────┐
// │  Architecture Overview                                                  │
// │                                                                         │
// │  McEntity 는 두 가지 데코레이터 모드를 동시에 지원합니다.                    │
// │                                                                         │
// │  TC39   — 표준 데코레이터 (Vite + entityKitPlugin / Node.js ≥ 24)        │
// │           필드 데코레이터 : (initialValue, ClassFieldDecoratorContext)    │
// │           클래스 데코레이터: (Class, ClassDecoratorContext)               │
// │                                                                         │
// │  Legacy — experimentalDecorators (tsc --experimentalDecorators)         │
// │           필드 데코레이터 : (prototype, propertyKey)                     │
// │           클래스 데코레이터: (Class)                                      │
// │                                                                         │
// │  동작 흐름                                                               │
// │  1. 필드 데코레이터(@FIELD, @SERIALIZE …)가 메타데이터를 기록합니다.         │
// │     TC39   → context.metadata (= 클래스의 Symbol.metadata)              │
// │     Legacy → legacyMetaStore WeakMap (prototype 키)                     │
// │  2. 클래스 데코레이터 @ENTITY 가 생성자를 래핑해 mapBodyToInstance() 호출   │
// │     Legacy → @ENTITY 실행 시 WeakMap 데이터를 Symbol.metadata 로 이전    │
// └─────────────────────────────────────────────────────────────────────────┘

import { CUSTOM_FN_SYMBOL_MAP_KEY, createSymbolMapDecorator } from "./core/McEntityCore";
import { McSerializable } from "./core/McSerializable";
import { CUSTOM_FIELD } from "./decorators/McCustomFieldDecorator";
import { ENTITY } from "./decorators/McEntityDecorator";
import { ARRAY_FIELD, FIELD } from "./decorators/McFieldDecorator";
import { MAP_FIELD } from "./decorators/McMapFieldDecorator";
import { SERIALIZE } from "./decorators/McSerializeDecorator";
import { SERIALIZE_IGNORE } from "./decorators/McSerializeIgnoreDecorator";

const McEntity = {
	Serializable: McSerializable,
	ENTITY,
	SERIALIZE,
	SERIALIZE_IGNORE,
	FIELD,
	ARRAY_FIELD,
	CUSTOM_FIELD,
	CUSTOM_FIELD_MAPPER: createSymbolMapDecorator(CUSTOM_FN_SYMBOL_MAP_KEY),
	MAP_FIELD,
};

export default McEntity;
