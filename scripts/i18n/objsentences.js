// Lists sentences built with template literals inside object properties (shown later via {x.prop})
const ts = require('typescript'), fs = require('fs');
for (const f of process.argv.slice(2)) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), 99, true, 4);
  const v = (n) => {
    if (ts.isTemplateExpression(n) && ts.isPropertyAssignment(n.parent)) {
      const k = n.parent.name.getText(sf);
      const st = n.head.text + n.templateSpans.map((s) => ' ' + s.literal.text).join('');
      if (/[A-Za-z]{3,} [a-z]{2,}/.test(st) && !/class|key|id|url|href|path|src|style|remarks|message|subject|body|content|description|notes|details/i.test(k))
        console.log(f.split('/').pop() + ':' + (sf.getLineAndCharacterOfPosition(n.getStart()).line + 1) + ' ' + k + ': ' + n.getText(sf).slice(0, 110));
    }
    ts.forEachChild(n, v);
  };
  v(sf);
}
