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

## Vite 설정 (Vite 6+)

Vite 6 이상에서는 OXC transformer가 기본으로 활성화됩니다.  
OXC는 타입만 제거하고 TC39 Stage 3 데코레이터를 변환하지 않아, 브라우저에서 `SyntaxError`가 발생할 수 있습니다.

라이브러리에 포함된 `entityKitPlugin()`을 사용하면 별도 패키지 설치 없이 해결됩니다.

```ts
// vite.config.ts
import { entityKitPlugin } from "@moca-labs/entity-kit-ts/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [entityKitPlugin(), vue()],
});
```

> `entityKitPlugin()`은 내부적으로 OXC를 비활성화하고 esbuild로 `.ts` 파일을 변환합니다.  
> esbuild는 Vite의 의존성으로 항상 설치돼 있으므로 추가 패키지가 필요하지 않습니다.

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

### `@McEntity.SERIALIZE` / `@McEntity.SERIALIZE('jsonKey', exclude?)` — 직렬화

`toJson()` 호출 시 포함할 필드를 지정합니다.  
괄호 없이 사용하면 프로퍼티명이 JSON 키로 사용됩니다.  
중첩 엔티티에서 특정 경로를 제외할 때는 `exclude` 배열을 전달합니다.

```ts
@McEntity.SERIALIZE                        // 프로퍼티명 그대로
@McEntity.SERIALIZE("user_name")           // 커스텀 JSON 키 지정
@McEntity.SERIALIZE(["secretKey"])         // 중첩 엔티티에서 secretKey 제외
@McEntity.SERIALIZE("to", ["secretKey"])   // 키 rename + 제외
```

### `@McEntity.SERIALIZE_IGNORE` — 자식 클래스에서 직렬화 취소

부모 클래스에서 `@SERIALIZE`로 마킹된 필드를 자식 클래스에서 제거합니다.

```ts
@McEntity.ENTITY
class AdminAccount extends McEntity.Serializable {
  @McEntity.FIELD(String) @McEntity.SERIALIZE name = "";
  @McEntity.FIELD(String) @McEntity.SERIALIZE internalToken = "";
}

@McEntity.ENTITY
class PublicAccount extends AdminAccount {
  @McEntity.SERIALIZE_IGNORE
  internalToken = "";  // 부모의 @SERIALIZE 취소 → toJson()에서 제외
}
```

### `extends McEntity.Serializable` — 직렬화 베이스 클래스

`toJson()`, `toRawJson()`, `toString()` 구현을 상속합니다.  
`@McEntity.SERIALIZE`가 마킹된 필드만 직렬화됩니다.

| 메서드 | 설명 | 용도 |
|---|---|---|
| `toJson()` | `@SERIALIZE_IGNORE` 및 `exclude` 경로를 제거한 결과 반환 | 네트워크 전송 |
| `toRawJson()` | `@SERIALIZE_IGNORE` 및 `exclude`를 무시하고 `@SERIALIZE` 전체 반환 | 세션·로컬 스토리지 저장 |
| `toString()` | `JSON.stringify(this.toJson())` 단축 메서드 | |

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

### 기본 매핑 + 직렬화

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

// 인스턴스 → JSON (네트워크 전송용)
console.log(user.toJson());
// { user_name: "Alice", age: 30 }
```

### toJson() vs toRawJson()

`@SERIALIZE_IGNORE`나 `exclude`로 제외된 필드가 있을 때, 세션·로컬 스토리지에 저장하면 데이터가 유실됩니다.  
`toRawJson()`은 이 필터를 무시하고 `@SERIALIZE` 전체를 반환합니다.

```ts
@McEntity.ENTITY
class AdminAccount extends McEntity.Serializable {
  @McEntity.FIELD(String) @McEntity.SERIALIZE name = "";
  @McEntity.FIELD(String) @McEntity.SERIALIZE internalToken = "";
  @McEntity.FIELD(Number) @McEntity.SERIALIZE score = 0;
}

@McEntity.ENTITY
class PublicAccount extends AdminAccount {
  @McEntity.SERIALIZE_IGNORE
  internalToken = "";  // 네트워크 응답에서는 숨김
}

const account = new PublicAccount({ name: "Alice", internalToken: "tok_xyz", score: 99 });

// 네트워크 전송 — internalToken 제외
account.toJson();
// { name: "Alice", score: 99 }

// 세션스토리지 저장 — internalToken 포함
sessionStorage.setItem("session", JSON.stringify(account.toRawJson()));
// { name: "Alice", internalToken: "tok_xyz", score: 99 }

// 복원 — 모든 필드 정상 복원
const saved = JSON.parse(sessionStorage.getItem("session")!);
const restored = new PublicAccount(saved);
console.log(restored.internalToken);  // "tok_xyz"
```

---

## 데모

인터랙티브 데모 UI를 로컬에서 실행할 수 있습니다.

```bash
npm run demo
```

브라우저에서 `http://localhost:5173` 을 열면 10가지 사용 예시를 확인할 수 있습니다.

- **01 기본 FIELD** — String·Number·Boolean 매핑, defaultValue
- **02 중첩 엔티티** — @ENTITY 타입을 @FIELD로 지정, 자동 재귀 매핑
- **03 배열 필드** — `[Type]` 문법, @ENTITY 배열, 경로 지정
- **04 MAP_FIELD** — JSON 오브젝트 → `Map<K, V>` 변환
- **05 커스텀 필드** — 인라인 함수 / Symbol + CUSTOM_FIELD_MAPPER
- **06 직렬화** — `@SERIALIZE`, `toJson()`, JSON 키 rename
- **07 ENTITY path** — `data` 자동 제거, 하위 경로 지정
- **08 SERIALIZE_IGNORE** — 자식 클래스에서 부모 @SERIALIZE 취소
- **09 SERIALIZE exclude** — 중첩 엔티티 직렬화 시 특정 경로 제외
- **10 toRawJson** — `toJson()` vs `toRawJson()` 비교, 로컬 저장용 직렬화
