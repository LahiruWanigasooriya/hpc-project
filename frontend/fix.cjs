const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx', 'utf8').split('\n');

const newLines = lines.slice(0, 253);
newLines.push("        {activePage === 'dashboard' && (<div className=\"flex flex-col gap-6\">");
newLines.push(...lines.slice(509));

fs.writeFileSync('src/App.jsx', newLines.join('\n'));
console.log("Done.");
