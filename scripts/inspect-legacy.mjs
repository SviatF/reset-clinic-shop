import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const root = process.cwd();
const source = path.join(root, 'legacy-source', 'index.html');
const outDir = path.join(root, 'legacy-inspection');

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const html = await fs.readFile(source, 'utf8');
const $ = cheerio.load(html, { decodeEntities: false });

const normalize = (value = '') => value.replace(/\s+/g, ' ').trim();
const compactHtml = (value = '') => value.replace(/>\s+</g, '><').trim();

const links = $('head link').map((_, el) => ({
  rel: $(el).attr('rel') ?? '',
  href: $(el).attr('href') ?? '',
  media: $(el).attr('media') ?? '',
})).get();

const scripts = $('script').map((_, el) => ({
  src: $(el).attr('src') ?? '',
  id: $(el).attr('id') ?? '',
  type: $(el).attr('type') ?? '',
})).get();

const body = $('body').first();
const directChildren = body.children().map((index, el) => {
  const node = $(el);
  return {
    index,
    tag: el.tagName,
    id: node.attr('id') ?? '',
    class: node.attr('class') ?? '',
    text: normalize(node.text()).slice(0, 400),
    htmlLength: $.html(el).length,
  };
}).get();

const landmarks = $('header, main, footer, nav').map((index, el) => {
  const node = $(el);
  return {
    index,
    tag: el.tagName,
    id: node.attr('id') ?? '',
    class: node.attr('class') ?? '',
    text: normalize(node.text()).slice(0, 600),
    htmlLength: $.html(el).length,
  };
}).get();

const topSections = $('main section, main > div, #main section, #main > div, .site-main section, .site-main > div').map((index, el) => {
  const node = $(el);
  return {
    index,
    tag: el.tagName,
    id: node.attr('id') ?? '',
    class: node.attr('class') ?? '',
    text: normalize(node.text()).slice(0, 800),
    htmlLength: $.html(el).length,
  };
}).get();

const navigation = $('header a, nav a').map((_, el) => ({
  text: normalize($(el).text()),
  href: $(el).attr('href') ?? '',
  class: $(el).attr('class') ?? '',
})).get().filter((item) => item.text || item.href);

const images = $('img').map((_, el) => ({
  src: $(el).attr('src') ?? '',
  dataSrc: $(el).attr('data-src') ?? $(el).attr('data-lazy-src') ?? '',
  srcset: $(el).attr('srcset') ?? '',
  alt: $(el).attr('alt') ?? '',
  class: $(el).attr('class') ?? '',
  width: $(el).attr('width') ?? '',
  height: $(el).attr('height') ?? '',
})).get();

const backgroundUrls = [...new Set((html.match(/url\(([^)]+)\)/g) ?? [])
  .map((entry) => entry.slice(4, -1).trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean))];

const summary = {
  title: $('title').text(),
  bodyClass: body.attr('class') ?? '',
  bodyId: body.attr('id') ?? '',
  htmlBytes: Buffer.byteLength(html),
  links,
  scripts,
  directChildren,
  landmarks,
  topSections,
  navigation,
  imageCount: images.length,
  backgroundUrlCount: backgroundUrls.length,
};

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outDir, 'images.json'), JSON.stringify(images, null, 2));
await fs.writeFile(path.join(outDir, 'background-urls.json'), JSON.stringify(backgroundUrls, null, 2));

const header = $('header').first();
if (header.length) await fs.writeFile(path.join(outDir, 'header.html'), compactHtml($.html(header)));

const footer = $('footer').first();
if (footer.length) await fs.writeFile(path.join(outDir, 'footer.html'), compactHtml($.html(footer)));

const main = $('main').first().length ? $('main').first() : $('#main').first();
if (main.length) {
  const children = main.children();
  const manifest = [];
  children.each((index, el) => {
    const node = $(el);
    const filename = `main-${String(index).padStart(2, '0')}.html`;
    const fragment = compactHtml($.html(el));
    manifest.push({
      index,
      filename,
      tag: el.tagName,
      id: node.attr('id') ?? '',
      class: node.attr('class') ?? '',
      text: normalize(node.text()).slice(0, 1000),
      htmlLength: fragment.length,
    });
  });
  await fs.writeFile(path.join(outDir, 'main-manifest.json'), JSON.stringify(manifest, null, 2));

  // Keep individual fragments bounded so GitHub artifacts remain easy to inspect.
  for (const item of manifest) {
    const el = children.eq(item.index);
    const fragment = compactHtml($.html(el));
    if (fragment.length <= 2_000_000) {
      await fs.writeFile(path.join(outDir, item.filename), fragment);
    }
  }
}

console.log(JSON.stringify({
  title: summary.title,
  bodyClass: summary.bodyClass,
  directChildren: directChildren.length,
  landmarks: landmarks.length,
  topSections: topSections.length,
  navigationLinks: navigation.length,
  images: images.length,
  backgroundUrls: backgroundUrls.length,
}, null, 2));
