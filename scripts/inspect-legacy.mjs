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
const describe = (index, el) => {
  const node = $(el);
  return {
    index,
    tag: el.tagName,
    id: node.attr('id') ?? '',
    class: node.attr('class') ?? '',
    text: normalize(node.text()).slice(0, 1000),
    htmlLength: $.html(el).length,
  };
};

const body = $('body').first();
const header = $('.elementor-location-header').first();
const footer = $('#main-footer').first().length ? $('#main-footer').first() : $('footer').first();
const page = $('.elementor-18287').first();

const links = $('head link').map((_, el) => ({
  rel: $(el).attr('rel') ?? '',
  href: $(el).attr('href') ?? '',
  media: $(el).attr('media') ?? '',
})).get();

const directChildren = body.children().map((index, el) => describe(index, el)).get();
const pageSections = page.children('section').map((index, el) => describe(index, el)).get();
const navigation = header.find('a').map((_, el) => ({
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

const summary = {
  title: $('title').text(),
  bodyClass: body.attr('class') ?? '',
  bodyId: body.attr('id') ?? '',
  htmlBytes: Buffer.byteLength(html),
  header: header.length ? describe(0, header[0]) : null,
  footer: footer.length ? describe(0, footer[0]) : null,
  page: page.length ? describe(0, page[0]) : null,
  directChildren,
  pageSections,
  navigation,
  imageCount: images.length,
  links,
};

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outDir, 'images.json'), JSON.stringify(images, null, 2));

if (header.length) {
  await fs.writeFile(path.join(outDir, 'header.html'), compactHtml($.html(header)));
}
if (footer.length) {
  await fs.writeFile(path.join(outDir, 'footer.html'), compactHtml($.html(footer)));
}

if (page.length) {
  const sections = page.children('section');
  const manifest = [];
  sections.each((index, el) => {
    const item = describe(index, el);
    const filename = `section-${String(index).padStart(2, '0')}.html`;
    manifest.push({ ...item, filename });
  });
  await fs.writeFile(path.join(outDir, 'sections-manifest.json'), JSON.stringify(manifest, null, 2));

  for (const item of manifest) {
    const fragment = compactHtml($.html(sections.eq(item.index)));
    await fs.writeFile(path.join(outDir, item.filename), fragment);
  }
}

// Extract the exact inline style blocks that materially define the original visual system.
const styleManifest = [];
$('style').each((index, el) => {
  const text = $(el).html() ?? '';
  if (!text.trim()) return;
  const id = $(el).attr('id') ?? '';
  const relevant = /elementor|vamtam|woocommerce|font-face|--e-global|elementor-18287|elementor-18290/i.test(`${id}\n${text}`);
  if (!relevant) return;
  const filename = `style-${String(styleManifest.length).padStart(2, '0')}.css`;
  styleManifest.push({ index, id, filename, length: text.length });
  fs.writeFile(path.join(outDir, filename), text);
});
await fs.writeFile(path.join(outDir, 'styles-manifest.json'), JSON.stringify(styleManifest, null, 2));

console.log(JSON.stringify({
  title: summary.title,
  bodyClass: summary.bodyClass,
  headerBytes: summary.header?.htmlLength ?? 0,
  footerBytes: summary.footer?.htmlLength ?? 0,
  pageBytes: summary.page?.htmlLength ?? 0,
  sections: pageSections.length,
  navigationLinks: navigation.length,
  images: images.length,
  extractedStyles: styleManifest.length,
}, null, 2));
