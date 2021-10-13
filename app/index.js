import compiler from '/lib/compiler.js';
const entrySchema = await import('../app/components/index.js').then(m => m.default());
const html = await compiler.compile(entrySchema);
document.documentElement.replaceWith(html);
