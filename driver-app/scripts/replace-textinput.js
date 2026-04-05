const fs = require('fs');
const path = require('path');

function replaceTextInputImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.match(/import\s+{([^}]*)\bTextInput\b([^}]*)}\s+from\s+['"]react-native['"]/)) {
    let newContent = content.replace(/import\s+{([^}]*)}\s+from\s+['"]react-native['"]/, (match, group1) => {
      const parts = group1.split(',').map(s => s.trim()).filter(s => s !== 'TextInput' && s !== '');
      if (parts.length === 0) return '';
      return `import { ${parts.join(', ')} } from 'react-native';`;
    });
    
    const relativePathMatch = filePath.match(/(app|components)(\/|\\)(.*)/);
    let depth = 0;
    if (relativePathMatch) {
        depth = relativePathMatch[3].split(/[\/\\]/).length - 1;
        if (filePath.includes('/app/')) depth += 1;
    }
    
    let prefix = '../'.repeat(depth);
    if (prefix === '') prefix = './';
    if (filePath.includes('/components/')) {
        prefix = '../'.repeat(relativePathMatch[3].split(/[\/\\]/).length - 1);
        if (prefix === '') prefix = './';
    } else {
        prefix = '../'.repeat(relativePathMatch[3].split(/[\/\\]/).length);
        prefix += 'components/';
    }
    
    newContent = newContent.replace(/(import\s+.*from\s+['"]react-native['"];?)/, `$1\nimport { TextInput } from '${prefix}CustomTextInput';`);
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated TextInput in: ${filePath}`);
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
      if (!fullPath.includes('CustomTextInput.tsx') && !fullPath.includes('CustomText.tsx')) {
        replaceTextInputImport(fullPath);
      }
    }
  }
}

const rootDir = process.argv[2] || process.cwd();
traverse(path.join(rootDir, 'app'));
traverse(path.join(rootDir, 'components'));
console.log('TextInput Replacement complete.');
