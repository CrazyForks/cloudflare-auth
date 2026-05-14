import { readFile } from "node:fs/promises";
import ts from "typescript";

const defaultSmokeEndpointSource = new URL(
  "smoke-production-cloudflare.mjs",
  import.meta.url,
);
const authEndpointPattern = /\/auth\/[A-Za-z0-9/-]+/gu;

export async function requiredAuthSmokeEndpoints(
  source = defaultSmokeEndpointSource,
) {
  const sourceText = await readFile(source, "utf8");
  const sourceFile = ts.createSourceFile(
    String(source),
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const endpoints = new Set();

  ts.forEachChild(sourceFile, function collect(node) {
    const text = stringLikeNodeText(node);
    if (text) collectAuthEndpoints(text, endpoints);
    ts.forEachChild(node, collect);
  });

  if (endpoints.size === 0) {
    throw new Error(`${source}: no auth smoke endpoints found`);
  }

  return [...endpoints].sort();
}

function stringLikeNodeText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (
    node.kind === ts.SyntaxKind.TemplateHead ||
    node.kind === ts.SyntaxKind.TemplateMiddle ||
    node.kind === ts.SyntaxKind.TemplateTail
  ) {
    return node.text;
  }
  return null;
}

function collectAuthEndpoints(text, endpoints) {
  for (const match of text.matchAll(authEndpointPattern)) {
    endpoints.add(match[0]);
  }
}
