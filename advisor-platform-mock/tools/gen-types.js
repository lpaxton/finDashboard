#!/usr/bin/env node
/*
 * Generates types/api.d.ts from openapi.yaml.
 *
 *   npm run types          write the file
 *   npm run types -- --check   exit non-zero if it is out of date (used by the tests)
 *
 * The YAML reader below handles only the subset openapi.yaml uses: block mappings and
 * sequences, single-line flow mappings and sequences, folded and literal block scalars,
 * and quoted or bare scalars. No anchors, aliases or tags, because the spec has none.
 * A test asserts that, so if the spec ever grows one this fails loudly rather than
 * silently emitting the wrong types.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = path.join(ROOT, 'openapi.yaml');
const OUT = path.join(ROOT, 'types', 'api.d.ts');

/* ---- a YAML reader for the subset this spec uses ---- */

/** Strips a trailing comment, respecting quotes. */
function decomment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(raw) {
  const s = raw.trim();
  if (s === '') return '';
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if ((s.startsWith("'") && s.endsWith("'") && s.length > 1)) return s.slice(1, -1).replace(/''/g, "'");
  if ((s.startsWith('"') && s.endsWith('"') && s.length > 1)) return s.slice(1, -1).replace(/\\"/g, '"');
  if (s.startsWith('{') || s.startsWith('[')) return flow(s);
  if (/^-?\d+$/.test(s)) return Number(s);
  if (/^-?\d*\.\d+$/.test(s)) return Number(s);
  return s;
}

/** Parses a balanced single-line flow mapping or sequence. */
function flow(src) {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  function value() {
    ws();
    if (src[i] === '{') { i++; return mapping('}'); }
    if (src[i] === '[') { i++; return sequence(']'); }
    const start = i; let q = null;
    while (i < src.length) {
      const c = src[i];
      if (q) { if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === ',' || c === '}' || c === ']') break;
      i++;
    }
    return scalar(src.slice(start, i));
  }
  /* An unquoted scalar inside a flow mapping may not contain a comma: YAML reads the comma
     as a separator and silently turns the rest of the sentence into a key with no value.
     That is a real and easy mistake to make in a spec, so it is reported, not tolerated. */
  const bail = (why) => { throw new Error(`Bad flow mapping: ${why}\n  in: ${src.trim()}`); };
  function mapping(close) {
    const out = {};
    for (;;) {
      ws();
      if (i >= src.length) bail(`no closing "${close}"`);
      if (src[i] === close) { i++; return out; }
      if (src[i] === ',') { i++; continue; }
      const start = i; let q = null;
      while (i < src.length) {
        const c = src[i];
        if (q) { if (c === q) q = null; }
        else if (c === '"' || c === "'") q = c;
        else if (c === ':') break;
        else if (c === close) bail(`"${src.slice(start, i).trim()}" has no value. An unquoted value containing a comma splits the mapping: quote it.`);
        i++;
      }
      if (i >= src.length) bail(`"${src.slice(start).trim()}" has no value. An unquoted value containing a comma splits the mapping: quote it.`);
      const key = String(scalar(src.slice(start, i)));
      i++; // ':'
      out[key] = value();
    }
  }
  function sequence(close) {
    const out = [];
    for (;;) {
      ws();
      if (i >= src.length) bail(`no closing "${close}"`);
      if (src[i] === close) { i++; return out; }
      if (src[i] === ',') { i++; continue; }
      const before = i;
      out.push(value());
      if (i === before) bail('made no progress');
    }
  }
  return value();
}

/** Turns indented lines into nested objects and arrays. */
function parseBlock(lines, from, indent) {
  // A sequence if the first meaningful line at this indent starts with "- ".
  let i = from;
  const isSeq = /^\s*- /.test(lines[i] ?? '');
  const out = isSeq ? [] : {};

  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim()) { i++; continue; }
    const ind = raw.match(/^\s*/)[0].length;
    if (ind < indent) break;
    if (ind > indent) { i++; continue; } // consumed by a deeper call

    const body = raw.slice(indent);

    if (isSeq) {
      if (!body.startsWith('- ')) break;
      const rest = body.slice(2);
      if (/^[\w$'"-]+\s*:/.test(rest) && !rest.trim().startsWith('{')) {
        // a mapping that starts on the dash line
        const sub = [' '.repeat(indent + 2) + rest, ...lines.slice(i + 1)];
        const [val, used] = readMapping(sub, 0, indent + 2);
        out.push(val);
        i += used; // `used` counts lines consumed from `sub`, first of which is this one
      } else {
        out.push(scalar(rest));
        i++;
      }
      continue;
    }

    const m = body.match(/^([^:]+):(.*)$/);
    if (!m) break;
    const key = String(scalar(m[1]));
    const rest = m[2].trim();

    if (rest === '>' || rest === '|' || rest === '>-' || rest === '|-') {
      const fold = rest[0] === '>';
      const raws = [];
      let j = i + 1;
      while (j < lines.length) {
        const l = lines[j];
        if (l.trim() && l.match(/^\s*/)[0].length <= indent) break;
        raws.push(l);
        j++;
      }
      // A literal block keeps its shape, so only the block's own indentation is removed.
      const base = Math.min(...raws.filter(l => l.trim()).map(l => l.match(/^\s*/)[0].length));
      const kept = raws.map(l => (l.trim() ? l.slice(base) : ''));
      out[key] = (fold ? kept.map(l => l.trim()).join(' ').trim() : kept.join('\n')) + '\n';
      i = j;
      continue;
    }

    if (rest === '') {
      // nested block, if anything is indented under it
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      const childIndent = j < lines.length ? lines[j].match(/^\s*/)[0].length : 0;
      if (j < lines.length && childIndent > indent) {
        const [val, used] = readAny(lines, j, childIndent);
        out[key] = val;
        i = used;
      } else { out[key] = null; i++; }
      continue;
    }

    out[key] = scalar(rest);
    i++;
  }
  return [out, i];
}

function readAny(lines, from, indent) { return parseBlock(lines, from, indent); }
function readMapping(lines, from, indent) {
  const [val, end] = parseBlock(lines, from, indent);
  return [val, end - from];
}

export function parseYaml(text) {
  const lines = text.split('\n').map(decomment);
  const [doc] = parseBlock(lines, 0, 0);
  return doc;
}

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
