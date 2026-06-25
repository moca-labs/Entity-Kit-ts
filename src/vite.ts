import { transform as esbuildTransform } from "esbuild";
import type { Plugin } from "vite";

/**
 * Entity Kit Vite plugin
 *
 * Vite 6+ (OXC transformer)는 TC39 Stage 3 데코레이터를 변환하지 않아 브라우저에서 SyntaxError가 발생합니다.
 * 이 플러그인은 OXC 대신 esbuild를 사용해 .ts 파일을 변환하며,
 * esbuild는 TC39 데코레이터를 브라우저 호환 코드로 올바르게 내려줍니다.
 *
 * @example
 * // vite.config.ts
 * import { entityKitPlugin } from '@moca-labs/entity-kit-ts/vite';
 * export default defineConfig({ plugins: [entityKitPlugin(), vue()] });
 */
export function entityKitPlugin(): Plugin {
	return {
		name: "entity-kit-decorator-transform",
		config() {
			// OXC와 기본 esbuild transform을 비활성화하고 이 플러그인이 직접 처리
			return { esbuild: false, oxc: false } as any;
		},
		async transform(code, id) {
			if (!/\.(ts|mts|cts)$/.test(id)) return null;
			const result = await esbuildTransform(code, { loader: "ts", target: "es2022" });
			return { code: result.code, map: result.map };
		},
	};
}
