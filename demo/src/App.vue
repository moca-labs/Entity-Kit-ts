<script setup lang="ts">
import { ref, computed } from "vue";
import { demos } from "./demos";
import DemoPanel from "./components/DemoPanel.vue";

const selectedId = ref(demos[0].id);
const activeDemo = computed(() => demos.find((d) => d.id === selectedId.value)!);

const select = (id: string) => {
  selectedId.value = id;
};
</script>

<template>
  <div id="app">
    <header class="header">
      <div class="header-left">
        <span class="logo">⬡</span>
        <h1 class="site-title">entity-kit-ts</h1>
        <span class="version">v0.2.0</span>
      </div>
      <div class="header-right">
        <span class="chip">TC39 Native Decorators</span>
        <span class="chip">Symbol.metadata</span>
      </div>
    </header>

    <div class="layout">
      <!-- Sidebar -->
      <nav class="sidebar">
        <p class="sidebar-heading">DEMOS</p>
        <button
          v-for="demo in demos"
          :key="demo.id"
          :class="['sidebar-item', { active: demo.id === selectedId }]"
          @click="select(demo.id)"
        >
          <span class="item-num">{{ demo.id }}</span>
          <div class="item-body">
            <span :class="['badge', `badge-${demo.color}`]">{{ demo.badge }}</span>
            <span class="item-title">{{ demo.title }}</span>
          </div>
        </button>
      </nav>

      <!-- Content -->
      <main class="content">
        <DemoPanel :demo="activeDemo" />
      </main>
    </div>
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 14px;
  background: #f1f5f9;
  color: #0f172a;
  height: 100vh;
  overflow: hidden;
}

#app { display: flex; flex-direction: column; height: 100vh; }

/* ── Header ─────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: center; gap: 10px; }
.logo { font-size: 20px; color: #38bdf8; }
.site-title { font-size: 15px; font-weight: 600; color: #f8fafc; letter-spacing: -0.3px; }
.version {
  font-size: 11px; font-weight: 500; color: #64748b;
  background: #1e293b; border: 1px solid #334155;
  border-radius: 4px; padding: 2px 7px;
}
.header-right { display: flex; gap: 8px; }
.chip {
  font-size: 11px; font-weight: 500; color: #7dd3fc;
  background: #0c4a6e22; border: 1px solid #0369a155;
  border-radius: 20px; padding: 3px 10px;
}

/* ── Layout ─────────────────────────────────────────────── */
.layout { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #0f172a;
  border-right: 1px solid #1e293b;
  overflow-y: auto;
  padding: 16px 0;
}
.sidebar-heading {
  font-size: 10px; font-weight: 600; letter-spacing: 1.2px;
  color: #475569; padding: 0 16px 8px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-left: 3px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}
.sidebar-item:hover { background: #1e293b; }
.sidebar-item.active {
  background: #1e293b;
  border-left-color: #3b82f6;
}
.item-num { font-size: 11px; font-weight: 600; color: #475569; font-family: "JetBrains Mono", monospace; }
.item-body { display: flex; flex-direction: column; gap: 3px; }
.item-title { font-size: 12px; font-weight: 500; color: #94a3b8; }
.sidebar-item.active .item-title { color: #e2e8f0; }

/* ── Badges ─────────────────────────────────────────────── */
.badge {
  display: inline-block;
  font-size: 9px; font-weight: 700; letter-spacing: 0.4px;
  font-family: "JetBrains Mono", monospace;
  border-radius: 3px; padding: 1px 5px;
}
.badge-blue    { background: #1d4ed820; color: #60a5fa; }
.badge-purple  { background: #7c3aed20; color: #a78bfa; }
.badge-green   { background: #15803d20; color: #4ade80; }
.badge-orange  { background: #c2410c20; color: #fb923c; }
.badge-pink    { background: #be185d20; color: #f472b6; }
.badge-teal    { background: #0f766e20; color: #2dd4bf; }
.badge-indigo  { background: #4338ca20; color: #818cf8; }

/* ── Content ────────────────────────────────────────────── */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  background: #f8fafc;
}
</style>
