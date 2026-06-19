<script setup lang="ts">
import { ref, watch } from "vue";
import type { DemoConfig } from "../demos";

const props = defineProps<{ demo: DemoConfig }>();

const scenarioIdx = ref(0);
watch(() => props.demo.id, () => { scenarioIdx.value = 0; });

const activeScenario = () => props.demo.scenarios[scenarioIdx.value];

const fmt = (val: unknown): string => {
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
};

// JSON 구문 강조
const highlight = (json: string): string =>
  json.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      if (/^"/.test(m)) return /:$/.test(m) ? `<span class="jk">${m}</span>` : `<span class="js">${m}</span>`;
      if (/true|false/.test(m)) return `<span class="jb">${m}</span>`;
      if (/null/.test(m)) return `<span class="jn">${m}</span>`;
      return `<span class="jnum">${m}</span>`;
    }
  );

// TypeScript 코드 구문 강조
const highlightCode = (code: string): string => {
  const esc = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return esc.split("\n").map((line) => {
    const ci = line.indexOf("//");
    let main = ci >= 0 ? line.slice(0, ci) : line;
    const comment = ci >= 0 ? line.slice(ci) : "";

    // 모든 치환 결과를 placeholder에 저장해두고 마지막에 복원
    // → 이미 치환된 span 태그 안의 속성(class="cd" 등)이 재매칭되는 것을 방지
    const parts: string[] = [];
    const ph = (html: string) => { parts.push(html); return `\x00P${parts.length - 1}\x00`; };

    main = main.replace(/"[^"]*"/g,   (m) => ph(`<span class="cs">${m}</span>`));
    main = main.replace(/@McEntity\.\w+/g, (m) => ph(`<span class="cd">${m}</span>`));
    main = main.replace(
      /\b(class|extends|const|new|return|import|from|export|async|await)\b/g,
      (m) => ph(`<span class="ck">${m}</span>`),
    );
    main = main.replace(
      /\b(String|Number|Boolean|Map|Symbol|Date|null|undefined|true|false)\b/g,
      (m) => ph(`<span class="ct">${m}</span>`),
    );

    parts.forEach((v, i) => { main = main.replace(`\x00P${i}\x00`, v); });

    return main + (comment ? `<span class="cc">${comment}</span>` : "");
  }).join("\n");
};
</script>

<template>
  <div class="panel">
    <!-- Title row -->
    <div class="title-row">
      <h2 class="demo-title">{{ demo.title }}</h2>
      <span :class="['badge-lg', `badge-${demo.color}`]">{{ demo.badge }}</span>
    </div>

    <p class="description">{{ demo.description }}</p>

    <!-- Code snippet -->
    <div class="code-card">
      <div class="code-header">
        <span class="code-label">TypeScript</span>
      </div>
      <pre class="code-body" v-html="highlightCode(demo.codeSnippet)" />
    </div>

    <!-- Scenario tabs -->
    <div v-if="demo.scenarios.length > 1" class="tabs">
      <button
        v-for="(s, i) in demo.scenarios"
        :key="i"
        :class="['tab', { active: i === scenarioIdx }]"
        @click="scenarioIdx = i"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- I/O split -->
    <div class="io-row">
      <!-- Input -->
      <div class="io-card input-card">
        <div class="io-header">
          <span class="dot dot-yellow" />
          <span class="io-label">Input JSON</span>
        </div>
        <pre class="json-body" v-html="highlight(fmt(activeScenario().input))" />
      </div>

      <!-- Arrow -->
      <div class="arrow-col">
        <div class="arrow-wrap">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M6 16h20M20 10l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>

      <!-- Output -->
      <div class="io-card output-card">
        <div class="io-header">
          <span class="dot dot-green" />
          <span class="io-label">Mapped Result</span>
        </div>
        <pre class="json-body" v-html="highlight(fmt(activeScenario().output))" />
      </div>
    </div>

    <!-- Extra output (Serialize demo) -->
    <div v-if="activeScenario().extra" class="extra-row">
      <div class="extra-header">
        <span class="dot dot-blue" />
        <span class="io-label">{{ activeScenario().extra!.label }}</span>
      </div>
      <pre class="json-body extra-body" v-html="highlight(fmt(activeScenario().extra!.value))" />
    </div>
  </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 20px; max-width: 1000px; }

/* Title */
.title-row { display: flex; align-items: center; gap: 12px; }
.demo-title { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
.badge-lg {
  font-size: 12px; font-weight: 700; font-family: "JetBrains Mono", monospace;
  border-radius: 6px; padding: 4px 10px;
}
.badge-blue   { background: #dbeafe; color: #1d4ed8; }
.badge-purple { background: #ede9fe; color: #6d28d9; }
.badge-green  { background: #dcfce7; color: #15803d; }
.badge-orange { background: #ffedd5; color: #c2410c; }
.badge-pink   { background: #fce7f3; color: #be185d; }
.badge-teal   { background: #ccfbf1; color: #0f766e; }
.badge-indigo { background: #e0e7ff; color: #4338ca; }

/* Description */
.description { font-size: 14px; line-height: 1.7; color: #475569; }

/* Code card */
.code-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px #0001;
}
.code-header {
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}
.code-label { font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.5px; }
.code-body {
  background: #0f172a;
  color: #94a3b8;
  font-family: "JetBrains Mono", monospace;
  font-size: 13px;
  line-height: 1.7;
  padding: 16px 18px;
  overflow-x: auto;
  margin: 0;
}

/* Tabs */
.tabs { display: flex; gap: 6px; }
.tab {
  font-size: 13px; font-weight: 500;
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.tab:hover { background: #f1f5f9; color: #0f172a; }
.tab.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #f8fafc;
}

/* I/O Row */
.io-row {
  display: grid;
  grid-template-columns: 1fr 48px 1fr;
  gap: 0;
  align-items: stretch;
}
.arrow-col { display: flex; align-items: center; justify-content: center; }
.arrow-wrap {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  background: #f1f5f9; border: 1px solid #e2e8f0;
  border-radius: 50%;
}

.io-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px #0001;
}
.io-header {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.io-label { font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-yellow { background: #fbbf24; }
.dot-green  { background: #4ade80; }
.dot-blue   { background: #60a5fa; }

.input-card  { background: #fffbeb; }
.output-card { background: #f0fdf4; }

.json-body {
  font-family: "JetBrains Mono", monospace;
  font-size: 12.5px;
  line-height: 1.7;
  padding: 14px 16px;
  margin: 0;
  overflow-x: auto;
  min-height: 80px;
}

/* JSON syntax colors */
:deep(.jk)   { color: #1e40af; }   /* key */
:deep(.js)   { color: #15803d; }   /* string */
:deep(.jnum) { color: #b45309; }   /* number */
:deep(.jb)   { color: #7c3aed; }   /* boolean */
:deep(.jn)   { color: #9f1239; }   /* null */

/* TS code syntax colors */
:deep(.cd) { color: #38bdf8; font-weight: 600; }  /* decorator  @McEntity.XXX */
:deep(.ck) { color: #c084fc; }                    /* keyword    class extends const */
:deep(.ct) { color: #fbbf24; }                    /* type       String Number Boolean */
:deep(.cs) { color: #86efac; }                    /* string     "..." */
:deep(.cc) { color: #475569; font-style: italic; }/* comment    // ... */

/* Extra (serialize) */
.extra-row {
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  overflow: hidden;
  background: #eff6ff;
  box-shadow: 0 1px 3px #0001;
}
.extra-header {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 14px;
  background: #dbeafe;
  border-bottom: 1px solid #bfdbfe;
}
.extra-body { background: #eff6ff; }
</style>
