// Content loader for markdown sections
export interface ContentFrontmatter {
  slug: string;
  title: string;
  order: number;
  hero?: boolean;
}

export interface ContentEntry {
  frontmatter: ContentFrontmatter;
  body: string;
  html: string;
}

// @ts-expect-error Provided by Vite build
const rawModules: Record<string, string> = import.meta.glob('../../content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

function parseFrontmatter(src: string): { data: Record<string, unknown>; content: string } {
  const m = src.match(frontmatterRegex);
  if (!m) return { data: {}, content: src };
  const raw = m[1];
  const data: Record<string, unknown> = {};
  raw.split(/\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i === -1) return;
    const k = line.slice(0, i).trim();
    let v: unknown = line.slice(i + 1).trim();
    if (typeof v === 'string') {
      if (/^\d+$/.test(v)) v = Number(v);
      if (v === 'true') v = true;
      if (v === 'false') v = false;
    }
    data[k] = v;
  });
  return { data, content: src.slice(m[0].length) };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(md: string) {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let para: string[] = [];
  function flush() {
    if (para.length) {
      out.push(`<p>${escapeHtml(para.join(' '))}</p>`);
      para = [];
    }
  }
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      flush();
      out.push(`<h2>${escapeHtml(line.replace(/^##\s+/, '').trim())}</h2>`);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out.join('\n');
}

let cache: ContentEntry[] | null = null;

export function getAllContent(): ContentEntry[] {
  if (cache) return cache;
  cache = Object.entries(rawModules)
    .map(([, raw]) => {
      const { data, content } = parseFrontmatter(raw);
      const fm: ContentFrontmatter = {
        slug: String(data.slug || ''),
        title: String(data.title || ''),
        order: Number(data.order || 0),
        hero: Boolean(data.hero),
      };
      return { frontmatter: fm, body: content, html: markdownToHtml(content.trim()) };
    })
    .filter((e) => e.frontmatter.slug)
    .sort((a, b) => a.frontmatter.order - b.frontmatter.order);
  return cache;
}

export function getContentBySlug(slug: string) {
  return getAllContent().find((e) => e.frontmatter.slug === slug);
}

export function getNonHeroSections() {
  return getAllContent().filter((e) => !e.frontmatter.hero);
}
