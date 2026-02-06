
import fs from 'fs';

const filePath = './.gitignore';
let content = fs.readFileSync(filePath, 'utf8');

// Precisely remove the package-lock.json ignore line
// Matches "package-lock.json*" with or without leading/trailing whitespace
const newContent = content.split('\n')
    .filter(line => !line.trim().includes('package-lock.json*'))
    .join('\n');

fs.writeFileSync(filePath, newContent);
console.log('Fixed .gitignore');
