const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("middleware injects x-lang for SSR language sync", () => {
  const file = path.resolve(process.cwd(), "middleware.ts");
  const content = fs.readFileSync(file, "utf8");
  assert.ok(content.includes("x-lang"));
  assert.ok(content.includes("lang"));
});

test("middleware admin branch injects x-pathname for RootLayout detection", () => {
  const file = path.resolve(process.cwd(), "middleware.ts");
  const content = fs.readFileSync(file, "utf8");
  assert.ok(content.includes("x-pathname"));
  assert.ok(content.includes('pathname.startsWith("/admin")'));
});

test("middleware admin default language follows deployment region", () => {
  const file = path.resolve(process.cwd(), "middleware.ts");
  const content = fs.readFileSync(file, "utf8");
  assert.ok(content.includes('const defaultLangForRegion: "zh" | "en"'));
  assert.ok(content.includes('requestHeaders.set("x-lang", defaultLangForRegion)'));
});

test("RootLayout admin fallback language follows region default", () => {
  const file = path.resolve(process.cwd(), "app/layout.tsx");
  const content = fs.readFileSync(file, "utf8");
  assert.ok(content.includes("const regionDefaultLanguage: Language = isChinaRegion ? 'zh' : 'en';"));
  assert.ok(content.includes("? (normalizedCookieLang ?? normalizedHeaderLang ?? regionDefaultLanguage)"));
});

test("LanguageProvider fallback uses region default when no preference exists", () => {
  const file = path.resolve(process.cwd(), "components/language-provider.tsx");
  const content = fs.readFileSync(file, "utf8");
  assert.ok(content.includes(': initialLanguage || (isChinaDeployment() ? "zh" : "en");'));
});
