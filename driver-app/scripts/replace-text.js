const fs = require('fs');
const path = require('path');

function replaceTextImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Only process if it imports Text from react-native
  if (content.match(/import\s+{([^}]*)\bText\b([^}]*)}\s+from\s+['"]react-native['"]/)) {
    // 1. Remove Text from react-native import
    let newContent = content.replace(/import\s+{([^}]*)}\s+from\s+['"]react-native['"]/, (match, group1) => {
      const parts = group1.split(',').map(s => s.trim()).filter(s => s !== 'Text' && s !== '');
      if (parts.length === 0) return '';
      return `import { ${parts.join(', ')} } from 'react-native';`;
    });
    
    // 2. Add import for CustomText
    const relativePathMatch = filePath.match(/(app|components)(\/|\\)(.*)/);
    // Depth from app folder or component folder
    let depth = 0;
    if (relativePathMatch) {
        depth = relativePathMatch[3].split(/[\/\\]/).length - 1;
        if (filePath.includes('/app/')) depth += 1; // app vs components difference in relative path to components
    }
    
    let prefix = '../'.repeat(depth);
    if (prefix === '') prefix = './';
    if (filePath.includes('/components/')) {
        prefix = '../'.repeat(relativePathMatch[3].split(/[\/\\]/).length - 1);
        if (prefix === '') prefix = './';
    } else {
        // app dir
        prefix = '../'.repeat(relativePathMatch[3].split(/[\/\\]/).length);
        prefix += 'components/';
    }
    
    newContent = newContent.replace(/(import\s+.*from\s+['"]react-native['"];?)/, `$1\nimport { Text } from '${prefix}CustomText';`);
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated: ${filePath}`);
    }
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo' && file !== 'ui') {
        traverse(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      if (!fullPath.includes('CustomText.tsx') && !fullPath.includes('themed-text.tsx')) {
        replaceTextImport(fullPath);
      }
    }
  }
}

const rootDir = process.argv[2] || process.cwd();
traverse(path.join(rootDir, 'app'));
traverse(path.join(rootDir, 'components'));
console.log('Replacement complete.');
