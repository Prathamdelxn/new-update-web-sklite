const fs = require('fs');
const path = 'c:/Users/Mahesh Indalkar/Desktop/web/new-update-web-sklite/src/app/rfq/[token]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace all occurrences of "dark:something " or "dark:something"
// Note: we want to match dark: followed by any characters that are valid tailwind classes (letters, numbers, dashes, slashes, brackets)
content = content.replace(/dark:[a-zA-Z0-9-/[\]]+/g, '');

// Clean up any double spaces created by the removal
content = content.replace(/ {2,}/g, ' ');

fs.writeFileSync(path, content);
console.log('Done!');
