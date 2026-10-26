const fs = require('fs');
const path = 'c:/Users/Mahesh Indalkar/Desktop/interior-backend/interior-os-backend/src/app/api/v1/procurement/send-rfq/route.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'notes: z.string().optional(),',
  'notes: z.string().optional(),\n  rfqLink: z.string().url().optional(),'
);

content = content.replace(
  'const { poId, vendorIds, notes } = validation.data;',
  'const { poId, vendorIds, notes, rfqLink } = validation.data;'
);

const linkHtml = `\n        \${rfqLink ? \`\n        <div style="margin-top: 25px; margin-bottom: 25px; text-align: center;">\n          <a href="\${rfqLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">\n            Submit Quotation Form\n          </a>\n          <p style="margin-top: 10px; font-size: 12px; color: #666;">Or copy this link: <a href="\${rfqLink}">\${rfqLink}</a></p>\n        </div>\n        \` : ''}`;

content = content.replace(
  /\$\{notes \? .*?: ''\}/,
  (match) => match + linkHtml
);

fs.writeFileSync(path, content);
