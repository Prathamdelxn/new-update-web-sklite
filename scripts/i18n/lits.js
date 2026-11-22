// word-list literals shown through variables (options, statuses) not caught by collect
const ts = require('typescript'), fs = require('fs');
const out = new Set();
for (const f of process.argv.slice(3)) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), 99, true, f.endsWith('.ts') ? 3 : 4);
  const v = (n) => {
    if (ts.isStringLiteral(n)) {
      const s = n.text; const p = n.parent;
      const bad = ts.isImportDeclaration(p) || (ts.isJsxAttribute(p) && p.name.getText(sf) !== 'value') ||
        (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind)) ||
        ts.isCaseClause(p) || ts.isElementAccessExpression(p) || (ts.isPropertyAssignment(p) && p.name === n) ||
        (ts.isCallExpression(p) && /^(cn|clsx|includes|get|post|put|patch|delete|getItem|setItem|removeItem|startsWith|endsWith|split|join|replace|push|format|createElement|querySelector|addEventListener|indexOf|has|add|set|log|warn|error)$/.test((p.expression.name || p.expression).getText(sf).split('.').pop()));
      if (!bad && /^[A-Z][A-Za-z&/()+ ,.'-]{2,60}$/.test(s) && /[a-z]/.test(s)) out.add(s);
    }
    ts.forEachChild(n, v);
  };
  v(sf);
}
fs.writeFileSync(process.argv[2], JSON.stringify([...out]));
console.log('literal words', out.size);
