import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});

/** Parses CommonMark/GFM-style structure while retaining source-line ownership. */
export function parseMarkdown(path, body) {
  const tokens = markdown.parse(body, {});
  const lines = body.split(/\r?\n/u);
  const headings = [];
  const links = [];
  const visibleLineNumbers = new Set();
  const visibleWords = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === 'heading_open') {
      const inline = tokens[index + 1];
      headings.push({
        level: Number(token.tag.slice(1)),
        text: inlineText(inline, true).trim(),
        line: (token.map?.[0] ?? 0) + 1,
      });
    }

    if (token.type === 'table_open' && token.map) {
      for (let line = token.map[0] + 1; line <= token.map[1]; line += 1) {
        visibleLineNumbers.add(line);
      }
    }

    if (token.type !== 'inline') continue;
    const start = token.map?.[0] ?? 0;
    const end = token.map?.[1] ?? start + 1;
    const hasVisibleText = (token.children ?? []).some(
      (child) => child.type === 'text' && child.content.trim().length > 0,
    );
    if (hasVisibleText) {
      for (let line = start + 1; line <= end; line += 1) {
        visibleLineNumbers.add(line);
      }
    }
    collectInline(
      token.children ?? [],
      start + 1,
      links,
      visibleWords,
      token.content,
    );
  }

  return {
    path,
    body,
    lines,
    tokens,
    headings,
    links,
    visibleLineNumbers,
    visibleWordCount: visibleWords
      .join(' ')
      .trim()
      .split(/\s+/u)
      .filter(Boolean).length,
  };
}

/** Returns visible source lines; comments, raw HTML, images, and code blocks cannot satisfy policy. */
export function visibleLines(document) {
  return document.lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((entry) => document.visibleLineNumbers.has(entry.line));
}

/** Returns whether a heading owns non-empty visible prose before the next peer heading. */
export function hasVisibleSectionBody(document, heading) {
  const next = document.headings.find(
    (candidate) =>
      candidate.line > heading.line && candidate.level <= heading.level,
  );
  const end = next?.line ?? document.lines.length + 1;
  return visibleLines(document).some(
    ({ line, text }) =>
      line > heading.line &&
      line < end &&
      text.length > 0 &&
      !text.startsWith('#'),
  );
}

/** Builds GitHub-compatible heading anchors, including duplicate suffixes. */
export function headingAnchors(document) {
  const counts = new Map();
  const anchors = new Set();
  for (const heading of document.headings) {
    const base = githubSlug(heading.text);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

export function githubSlug(value) {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{Letter}\p{Number}\p{Mark}\s_-]/gu, '')
    .replace(/\s+/gu, '-');
}

function inlineText(token, includeCode) {
  return (token?.children ?? [])
    .filter(
      (child) =>
        child.type === 'text' || (includeCode && child.type === 'code_inline'),
    )
    .map((child) => child.content)
    .join('');
}

function collectInline(children, line, links, visibleWords, rawContent) {
  const hasInvalidPercentEncoding = /%(?![0-9a-f]{2})/iu.test(rawContent);
  for (const child of children) {
    if (child.type === 'text') visibleWords.push(child.content);
    if (child.type === 'link_open') {
      const destination = child.attrGet('href');
      if (destination)
        links.push({ destination, line, hasInvalidPercentEncoding });
    }
    if (child.type === 'image') {
      const destination = child.attrGet('src');
      if (destination)
        links.push({ destination, line, hasInvalidPercentEncoding });
    }
  }
}
