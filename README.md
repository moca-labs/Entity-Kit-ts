# @moca-labs/entity-kit-ts

TypeScript 데코레이터 기반 JSON 매핑 및 직렬화 라이브러리입니다.  
API 응답 JSON을 TypeScript 클래스 인스턴스로 자동 변환하고, 반대로 직렬화하는 기능을 제공합니다.

## 요구사항

- **TypeScript 5.0 이상** — TC39 stage 3 네이티브 데코레이터를 사용합니다.
- `experimentalDecorators`, `emitDecoratorMetadata`, `reflect-metadata` 는 필요하지 않습니다.

## 설치

```bash
npm install @moca-labs/entity-kit-ts
```

tsconfig.json에 별도 데코레이터 설정은 필요 없습니다.  
단, `"experimentalDecorators": true` 가 설정되어 있으면 제거해야 합니다.

```json
{
  "compilerOptions": {
    "target": "ES2022"
  }
}
```

---

## Import

```ts
import McEntity from "@moca-labs/entity-kit-ts";
import { McSerializable, IMcSerializable } from "@moca-labs/entity-kit-ts";
```

---

## 특징

### `@McEntity.ENTITY` — 엔티티 클래스 자동 매핑

생성자 인자로 받은 JSON 객체를 자동으로 필드에 매핑합니다.  
괄호 없이도 사용 가능하며, 중첩 경로 지정도 지원합니다.

```ts
@McEntity.ENTITY
class User { ... }

@McEntity.ENTITY("data.user")   // response.data.user 경로를 루트로 사용
class User { ... }
```

### `@McEntity.FIELD(Type, path?, defaultValue?)` — 필드 매핑

JSON의 특정 키 또는 경로를 TypeScript 필드에 매핑합니다.  
배열은 `[Type]` 형식으로 지정합니다.

```ts
@McEntity.FIELD(String)                   // 동일 키 매핑
@McEntity.FIELD(String, "user_name")      // JSON 키가 다를 때
@McEntity.FIELD([UserEntity], "friends")  // 배열 매핑
@McEntity.FIELD(Number, undefined, 0)     // 기본값 지정
```

### `@McEntity.SERIALIZE` / `@McEntity.SERIALIZE('jsonKey')` — 직렬화

`toJson()` 호출 시 포함할 필드를 지정합니다.  
괄호 없이 사용하면 프로퍼티명이 JSON 키로 사용됩니다.

```ts
@McEntity.SERIALIZE               // 프로퍼티명 그대로
@McEntity.SERIALIZE("user_name")  // 커스텀 JSON 키 지정
```

### `extends McEntity.Serializable` — 직렬화 베이스 클래스

`toJson()` 과 `toString()` 구현을 상속합니다.  
`@McEntity.SERIALIZE`가 마킹된 필드만 직렬화됩니다.

### `@McEntity.MAP_FIELD(Type, path?, keyType?)` — Map 필드 매핑

JSON 오브젝트를 `Map<K, V>`로 매핑합니다.

```ts
@McEntity.MAP_FIELD(UserEntity)                // Map<string, UserEntity>
@McEntity.MAP_FIELD([UserEntity])              // Map<string, UserEntity[]>
@McEntity.MAP_FIELD(Number, "scores", Number)  // Map<number, number>
```

### `@McEntity.CUSTOM_FIELD(fn | symbol, path?)` — 커스텀 매핑

직접 변환 함수를 작성하거나, Symbol 기반 메서드를 지정합니다.

```ts
@McEntity.CUSTOM_FIELD((self, raw) => new Date(raw))
createdAt: Date;

static readonly ON_LOAD = Symbol("onLoad");
@McEntity.CUSTOM_FIELD(MyEntity.ON_LOAD)
value: string;

@McEntity.CUSTOM_FIELD_MAPPER(MyEntity.ON_LOAD)
private onLoad(raw: any) { return raw.trim(); }
```

---

## 예제

```ts
import McEntity from "@moca-labs/entity-kit-ts";

@McEntity.ENTITY
class AddressEntity {
  @McEntity.FIELD(String, "street_name")
  streetName: string;

  @McEntity.FIELD(Number)
  zipCode: number;
}

@McEntity.ENTITY("data")
class UserEntity extends McEntity.Serializable {
  @McEntity.FIELD(String, "user_name")
  @McEntity.SERIALIZE("user_name")
  userName: string;

  @McEntity.FIELD(Number)
  @McEntity.SERIALIZE
  age: number;

  @McEntity.FIELD([AddressEntity], "addresses")
  addresses: AddressEntity[];
}

// JSON → 인스턴스
const user = new UserEntity({
  data: {
    user_name: "Alice",
    age: 30,
    addresses: [{ street_name: "Main St", zipCode: 12345 }],
  },
});

console.log(user.userName);               // "Alice"
console.log(user.addresses[0].zipCode);  // 12345

// 인스턴스 → JSON
console.log(user.toJson());
// { user_name: "Alice", age: 30 }
```

---

## 데모

인터랙티브 데모 UI를 로컬에서 실행할 수 있습니다.

```bash
npm run demo
```

브라우저에서 `http://localhost:5173` 을 열면 7가지 데코레이터 사용 예시를 확인할 수 있습니다.

- **01 ENTITY** — 기본 엔티티 매핑
- **02 FIELD** — 키 매핑 / 경로 / 배열 / 기본값
- **03 NESTED** — 중첩 엔티티 자동 변환
- **04 MAP_FIELD** — Map 타입 매핑
- **05 CUSTOM_FIELD** — 커스텀 변환 함수
- **06 SERIALIZE** — `toJson()` 직렬화
- **07 COMPLEX** — 복합 시나리오
