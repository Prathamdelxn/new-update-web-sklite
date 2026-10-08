const fs = require('fs');
const path = 'c:/Users/Mahesh Indalkar/Desktop/web/new-update-web-sklite/src/features/interior-new/components/projects/InteriorProcurementView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove from procurementPipelines array
content = content.replace(
  /\{ key: 'dispatched', label: 'In Transit', icon: Truck, color: 'text-indigo-500' \},\s*/g,
  ''
);

// 2. Remove from status arrays
content = content.replace(/\['approved', 'dispatched'\]/g, "['approved']");
content = content.replace(/'approved', 'dispatched', 'partially_delivered', 'delivered'/g, "'approved', 'partially_delivered', 'delivered'");

// 3. Remove dispatched from conditional activePipelines
content = content.replace(
  /activePipeline === 'dispatched' \|\| activePipeline === 'partially_delivered'/g,
  "activePipeline === 'partially_delivered'"
);

// 4. Remove from options in dropdown
content = content.replace(
  /<option value="dispatched">In Transit \(Dispatched\)<\/option>\s*/g,
  ''
);

fs.writeFileSync(path, content);
console.log('Removed dispatched state');
