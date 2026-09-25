/*
 * A YAML reader for the subset openapi.yaml uses: block mappings and sequences, single-line
 * flow mappings and sequences, folded and literal block scalars, and quoted or bare scalars.
 * No anchors, aliases or tags, because the spec has none, and a test asserts it stays that way.
 *
 * Shared by tools/gen-types.js and tools/feature-map.js so there is one reader, not two.
 * Its parse of the whole spec was verified byte-for-byte against PyYAML.
 */
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
