const fs = require('fs');
const path = require('path');

const modalsDir = path.join(__dirname, 'src/components/modals');

const files = fs.readdirSync(modalsDir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(modalsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;

    // Check if it has api.post or api.patch to /crm
    if (content.includes("api.post('/crm") || content.includes("api.patch('/crm")) {
      // 1. Replace api calls with interiorApiClient
      content = content.replace(/api\.post\('\/crm/g, "interiorApiClient.post('/crm");
      content = content.replace(/api\.patch\('\/crm/g, "interiorApiClient.patch('/crm");
      
      // 2. Add interiorApiClient import if not present
      if (!content.includes("interiorApiClient from")) {
        content = content.replace("import api from '@/services/api.client';", "import api from '@/services/api.client';\nimport interiorApiClient from '@/services/interiorApi.client';");
      }
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${file}`);
    }
  }
});

console.log('Done modifying modals.');
