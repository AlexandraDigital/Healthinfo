const fs = require('fs');

const groqKey = process.env.GROQ_API_KEY || '';
let html = fs.readFileSync('index.html', 'utf8');

// Replace the environment variable placeholder with the actual key
html = html.replace(
  "let groqKey = process.env?.GROQ_API_KEY || '';",
  `let groqKey = '${groqKey}';`
);

fs.writeFileSync('index.html', html);
console.log('✅ Build complete: GROQ_API_KEY injected');
