// Fix script for cache middleware typo
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'middleware', 'cache.middleware.js');

let content = fs.readFileSync(filePath, 'utf8');

// Fix the typo: adminCacheInvalidation -> adminCacheInvalidation
content = content.replace(/adminCacheInvalidation/g, 'adminCacheInvalidation');

fs.writeFileSync(filePath, content);

console.log('✅ Fixed cache middleware typo: adminCacheInvalidation -> adminCacheInvalidation');
