import matter from "gray-matter";

const SUPPORTED_TYPES = new Set(["code", "math"]);

export function parseArticleFile(filePath, rawSource) {
  const { data, content } = matter(rawSource);

  validateFrontMatter(filePath, data);

  const meta = {
    ...data,
  };

  if (meta.date instanceof Date) {
    meta.date = meta.date.toISOString().slice(0, 10);
  }

  if (!SUPPORTED_TYPES.has(meta.type)) {
    throw new Error(`${filePath}: unsupported type "${meta.type}"`);
  }

  return {
    meta,
    pairs: parsePairs(content, { filePath, slug: meta.slug }),
  };
}

export function parsePairBlock(rawPair, context = {}) {
  const { filePath = "<article>", id } = context;
  const lines = rawPair.split(/\r?\n/);

  let index = 0;
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  if (index >= lines.length) {
    throw new Error(`${filePath}: pair${formatPairId(id)} is empty`);
  }

  const opener = lines[index].trim();

  if (/^```[^\s]*\s*$/.test(opener)) {
    return buildCodePair(lines, index, { filePath, id });
  }

  const singleLineMath = opener.match(/^\$\$(.*)\$\$\s*$/);
  if (singleLineMath) {
    return buildSingleLineMathPair(lines, index, {
      filePath,
      id,
      content: singleLineMath[1].trim(),
    });
  }

  if (opener === "$$") {
    return buildMathPair(lines, index, { filePath, id });
  }

  throw new Error(
    `${filePath}: pair${formatPairId(id)} left-side source block must start with fenced code or display math`,
  );
}

function parsePairs(content, context) {
  const lines = content.split(/\r?\n/);
  const pairs = [];

  let index = 0;
  while (index < lines.length) {
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }

    if (index >= lines.length) {
      break;
    }

    const opener = lines[index].trim();
    if (!opener.startsWith(":::pair")) {
      throw new Error(`${formatArticleLabel(context)}: unexpected content outside :::pair blocks`);
    }

    const id = parsePairId(opener, context);

    const pairStart = index + 1;
    const pairScan = findPairClosingIndex(lines, pairStart);

    if (pairScan.index < 0 && !pairScan.inFencedCodeBlock && !pairScan.inDisplayMathBlock) {
      throw new Error(`${formatArticleLabel(context)}: pair${formatPairId(id)} is missing closing :::`);
    }

    const pairEnd = pairScan.index < 0 ? lines.length : pairScan.index;
    pairs.push(parsePairBlock(lines.slice(pairStart, pairEnd).join("\n"), { ...context, id }));
    index = pairScan.index < 0 ? lines.length : pairEnd + 1;
  }

  if (pairs.length === 0) {
    throw new Error(`${formatArticleLabel(context)}: article must contain one or more pair blocks`);
  }

  return pairs;
}

function parsePairId(opener, context) {
  const filePath = formatArticleLabel(context);
  const header = opener.slice(":::pair".length).trim();

  if (header === "") {
    return null;
  }

  const match = /^id=([A-Za-z0-9_-]+)$/.exec(header);
  if (!match) {
    throw new Error(`${filePath}: unsupported pair header "${header}"`);
  }

  return match[1];
}

function validateFrontMatter(filePath, data) {
  for (const field of ["title", "slug", "date", "type"]) {
    if (data[field] == null || data[field] === "") {
      throw new Error(`${filePath}: missing required front matter field "${field}"`);
    }
  }
}

function buildCodePair(lines, openerIndex, context) {
  const { filePath, id } = context;
  let index = openerIndex + 1;
  const contentLines = [];

  while (index < lines.length && lines[index].trim() !== "```") {
    contentLines.push(lines[index]);
    index += 1;
  }

  if (index >= lines.length) {
    throw new Error(`${filePath}: pair${formatPairId(id)} has an unclosed fenced code block`);
  }

  const right = trimBlankEdges(lines.slice(index + 1).join("\n"));

  return {
    id,
    left: {
      kind: "code",
      content: contentLines.join("\n"),
    },
    right,
  };
}

function buildMathPair(lines, openerIndex, context) {
  const { filePath, id } = context;
  let index = openerIndex + 1;
  const contentLines = [];

  while (index < lines.length && lines[index].trim() !== "$$") {
    contentLines.push(lines[index]);
    index += 1;
  }

  if (index >= lines.length) {
    throw new Error(`${filePath}: pair${formatPairId(id)} has an unclosed display math block`);
  }

  const right = trimBlankEdges(lines.slice(index + 1).join("\n"));

  return {
    id,
    left: {
      kind: "math",
      content: contentLines.join("\n"),
    },
    right,
  };
}

function buildSingleLineMathPair(lines, openerIndex, context) {
  const { filePath, id, content } = context;

  return {
    id,
    left: {
      kind: "math",
      content,
    },
    right: trimBlankEdges(lines.slice(openerIndex + 1).join("\n")),
  };
}

function trimBlankEdges(text) {
  const lines = text.split(/\r?\n/);

  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines.join("\n");
}

function findPairClosingIndex(lines, startIndex) {
  let inFencedCodeBlock = false;
  let inDisplayMathBlock = false;

  for (let index = startIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (inFencedCodeBlock) {
      if (trimmed === "```") {
        inFencedCodeBlock = false;
      }
      continue;
    }

    if (inDisplayMathBlock) {
      if (trimmed === "$$") {
        inDisplayMathBlock = false;
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      inFencedCodeBlock = true;
      continue;
    }

    if (trimmed === "$$") {
      inDisplayMathBlock = true;
      continue;
    }

    if (trimmed === ":::") {
      return {
        index,
        inFencedCodeBlock,
        inDisplayMathBlock,
      };
    }
  }

  return {
    index: -1,
    inFencedCodeBlock,
    inDisplayMathBlock,
  };
}

function formatPairId(id) {
  return id ? ` id=${id}` : "";
}

function formatArticleLabel(context) {
  if (context.slug) {
    return `${context.filePath} (slug=${context.slug})`;
  }

  return context.filePath;
}
