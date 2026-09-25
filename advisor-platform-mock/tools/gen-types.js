#!/usr/bin/env node
/*
 * Generates types/api.d.ts from openapi.yaml.
 *
 *   npm run types          write the file
 *   npm run types -- --check   exit non-zero if it is out of date (used by the tests)
 *
 * The YAML reader lives in ./yaml.js and handles only the subset openapi.yaml uses. It throws
 * on anything else, so a spec that outgrows it fails loudly rather than emitting wrong types.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = path.join(ROOT, 'openapi.yaml');
const OUT = path.join(ROOT, 'types', 'api.d.ts');

/* ---- emitting TypeScript ---- */

/* Only refs to a named component schema produce a type name. A $ref that points into
   another schema's innards resolves to no type, so it is reported rather than emitted
   as a name that does not exist. */
function refName(ref) {
  const m = /^#\/components\/schemas\/([A-Za-z0-9_]+)$/.exec(ref);
  if (!m) throw new Error(`Unsupported $ref: ${ref}\n  Give it its own entry under components.schemas and reference that.`);
  return m[1];
}
const safeKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

function tsType(schema, indent = '  ') {
  if (!schema || typeof schema !== 'object') return 'unknown';
  if (schema.$ref) return refName(schema.$ref);

  if (schema.allOf) {
    const parts = schema.allOf.map(s => tsType(s, indent)).filter(p => p !== '{}' && p !== 'unknown');
    return parts.length ? parts.join(' & ') : 'unknown';
  }

  let base;
  if (Array.isArray(schema.enum)) {
    base = schema.enum.map(v => (typeof v === 'string' ? `'${v}'` : String(v))).join(' | ');
  } else if (schema.type === 'array') {
    const item = tsType(schema.items, indent);
    base = /[|&) ]/.test(item) ? `Array<${item}>` : `${item}[]`;
  } else if (schema.type === 'object' || schema.properties) {
    base = objectType(schema, indent);
  } else if (schema.type === 'integer' || schema.type === 'number') {
    base = 'number';
  } else if (schema.type === 'boolean') {
    base = 'boolean';
  } else if (schema.type === 'string') {
    base = 'string';
  } else {
    base = 'unknown';
  }

  if (schema.nullable === true && base !== 'unknown') base = `${base} | null`;
  return base;
}

function objectType(schema, indent) {
  const props = schema.properties || {};
  const names = Object.keys(props);
  if (!names.length) return 'Record<string, unknown>';
  const required = new Set(schema.required || []);
  const inner = indent + '  ';
  const body = names.map(n => {
    const doc = docComment(props[n], inner);
    const opt = required.has(n) ? '' : '?';
    return `${doc}${inner}${safeKey(n)}${opt}: ${tsType(props[n], inner)};`;
  }).join('\n');
  return `{\n${body}\n${indent}}`;
}

function docComment(schema, indent) {
  if (!schema || typeof schema !== 'object') return '';
  const bits = [];
  if (schema.description) {
    const d = String(schema.description).replace(/\s+/g, ' ').trim();
    bits.push(/[.!?:]$/.test(d) ? d : d + '.');
  }
  if (schema.format) bits.push(`Format: ${schema.format}.`);
  if (schema.example !== undefined) bits.push(`Example: ${JSON.stringify(schema.example)}.`);
  if (!bits.length) return '';
  const text = bits.join(' ');
  if (text.length <= 96) return `${indent}/** ${text} */\n`;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 92) { lines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return `${indent}/**\n` + lines.map(l => `${indent} * ${l}`).join('\n') + `\n${indent} */\n`;
}

function emit(spec) {
  const schemas = spec.components?.schemas || {};
  const out = [];
  out.push('/*');
  out.push(' * Types for the Advisor Platform API.');
  out.push(' *');
  out.push(' * GENERATED FROM openapi.yaml. Do not edit by hand: run `npm run types`.');
  out.push(' * `npm test` fails if this file and the contract disagree.');
  out.push(' *');
  out.push(` * Contract version ${spec.info?.version ?? 'unknown'}.`);
  out.push(' */');
  out.push('');

  for (const [name, schema] of Object.entries(schemas)) {
    const doc = docComment(schema, '');
    const body = tsType(schema, '');
    if (schema.allOf || Array.isArray(schema.enum) || (schema.type && schema.type !== 'object' && !schema.properties)) {
      out.push(`${doc}export type ${name} = ${body};`);
    } else {
      out.push(`${doc}export interface ${name} ${body}`);
    }
    out.push('');
  }

  // One entry per operation, so a client can be checked against the contract.
  const ops = [];
  for (const [p, item] of Object.entries(spec.paths || {})) {
    for (const method of ['get', 'post', 'patch', 'put', 'delete']) {
      const op = item?.[method];
      if (!op) continue;
      const ok = op.responses?.['200'] || op.responses?.['201'];
      const schema = ok?.content?.['application/json']?.schema;
      const bodySchema = op.requestBody?.content?.['application/json']?.schema;
      ops.push({ id: op.operationId, method: method.toUpperCase(), path: p,
        res: schema ? tsType(schema, '    ') : 'void',
        req: bodySchema ? tsType(bodySchema, '    ') : 'never' });
    }
  }
  out.push('/** Every operation in the contract, by operationId. */');
  out.push('export interface Operations {');
  for (const o of ops) {
    out.push(`  ${o.id}: {`);
    out.push(`    method: '${o.method}';`);
    out.push(`    path: '${o.path}';`);
    out.push(`    request: ${o.req};`);
    out.push(`    response: ${o.res};`);
    out.push('  };');
  }
  out.push('}');
  out.push('');
  out.push('/** The operationId of every operation the contract defines. */');
  out.push('export type OperationId = keyof Operations;');
  out.push('');
  return { text: out.join('\n'), count: Object.keys(schemas).length, ops: ops.length };
}

/* ---- run ---- */

const spec = parseYaml(fs.readFileSync(SPEC, 'utf8'));
const { text, count, ops } = emit(spec);
const check = process.argv.includes('--check');
const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

if (check) {
  if (current !== text) {
    console.error('types/api.d.ts is out of date with openapi.yaml. Run: npm run types');
    process.exit(1);
  }
  console.log(`types/api.d.ts is up to date: ${count} schemas, ${ops} operations.`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`Wrote types/api.d.ts: ${count} schemas, ${ops} operations.`);
}

export { emit };
