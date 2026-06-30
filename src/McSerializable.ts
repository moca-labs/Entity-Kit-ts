import { SERIALIZE_FLAG, SERIALIZE_IGNORE_FLAG } from "./McEntityCore";
import { isFunction } from "./McTypeUtils";

export interface IMcSerializable {
	/** 네트워크 전송용. SERIALIZE_IGNORE / exclude 경로 적용 */
	toJson(): Record<string, any>;
	/** 로컬 저장용. SERIALIZE_IGNORE / exclude 경로 무시, @SERIALIZE 전체 포함 */
	toRawJson(): Record<string, any>;
	toString(): string;
}

// @SERIALIZE 데코레이터가 붙은 필드만 toJson() 결과에 포함됩니다.
export class McSerializable implements IMcSerializable {
	public toJson(): Record<string, any> {
		const result: Record<string, any> = {};
		const meta = (this.constructor as any)[Symbol.metadata];
		if (!meta) return result;
		const properties = meta[SERIALIZE_FLAG] as
			| Array<{ propertyKey: string; jsonKey: string; exclude?: string[] }>
			| undefined;
		if (!properties) return result;
		const ignoreSet = new Set<string>(
			(meta[SERIALIZE_IGNORE_FLAG] as string[] | undefined) ?? [],
		);
		for (const prop of properties) {
			if (ignoreSet.has(prop.propertyKey)) continue;
			const value = (this as any)[prop.propertyKey];
			result[prop.jsonKey] = Array.isArray(value)
				? value.map((v) => this.serializeValue(v, prop.exclude))
				: this.serializeValue(value, prop.exclude);
		}
		return result;
	}

	// 점(.) 구분 경로로 중첩 객체의 키를 삭제합니다. (예: "wallet.secretKey")
	private deletePath(obj: any, path: string): void {
		const keys = path.split(".");
		const last = keys.pop() ?? "";
		const target = keys.reduce((acc: any, k: string) => acc?.[k], obj);
		if (target != null && typeof target === "object") delete target[last];
	}

	// 값이 McSerializable 이면 toJson() 을 호출하고, exclude 경로를 제거합니다.
	private serializeValue(value: any, exclude?: string[]): any {
		if (isFunction(value?.toJson)) {
			const result = value.toJson();
			if (exclude?.length) {
				for (const p of exclude) this.deletePath(result, p);
			}
			return result;
		}
		return value;
	}

	// 값이 McSerializable 이면 toRawJson() 을 호출합니다. (exclude / ignore 미적용)
	private serializeRawValue(value: any): any {
		if (isFunction(value?.toRawJson)) return value.toRawJson();
		return value;
	}

	/**
	 * 로컬 저장용 직렬화. SERIALIZE_IGNORE 와 exclude 경로를 무시하고
	 * @SERIALIZE 가 붙은 모든 필드를 포함합니다.
	 * 중첩 엔티티도 재귀적으로 toRawJson() 을 호출합니다.
	 *
	 *   sessionStorage.setItem("key", entity.toString())  ← toJson()  (네트워크용)
	 *   sessionStorage.setItem("key", JSON.stringify(entity.toRawJson()))  ← 로컬 저장용
	 */
	public toRawJson(): Record<string, any> {
		const result: Record<string, any> = {};
		const meta = (this.constructor as any)[Symbol.metadata];
		if (!meta) return result;
		const properties = meta[SERIALIZE_FLAG] as
			| Array<{ propertyKey: string; jsonKey: string }>
			| undefined;
		if (!properties) return result;
		for (const prop of properties) {
			const value = (this as any)[prop.propertyKey];
			result[prop.jsonKey] = Array.isArray(value)
				? value.map((v) => this.serializeRawValue(v))
				: this.serializeRawValue(value);
		}
		return result;
	}

	public toString(): string {
		return JSON.stringify(this.toJson());
	}
}
