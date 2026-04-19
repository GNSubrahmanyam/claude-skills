const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

async function extractTestsFromSkill(skillDir) {
  const rulesDir = path.join(skillDir, 'rules');
  const testFile = path.join(skillDir, 'test-cases.json');

  if (!(await fs.pathExists(rulesDir))) {
    return;
  }

  const ruleFiles = glob.sync('*.md', { cwd: rulesDir }).filter(file => !file.startsWith('_'));

  const testCases = [];

  for (const file of ruleFiles) {
    const filePath = path.join(rulesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);

    // Extract code blocks as test cases
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];

    codeBlocks.forEach((block, index) => {
      const lines = block.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const code = lines.slice(1, -1).join('\n').trim();

      if (code) {
        testCases.push({
          id: `${file.replace('.md', '')}-${index + 1}`,
          title: data.title || data.name || file.replace('.md', ''),
          rule: file.replace('.md', ''),
          language: lang || 'text',
          code: code,
          expected: 'valid', // Assume code blocks in rules are correct examples
          tags: data.tags ? data.tags.split(',').map(t => t.trim()) : []
        });
      }
    });
  }

  await fs.writeJSON(testFile, testCases, { spaces: 2 });
  console.log(`Extracted ${testCases.length} test cases to ${testFile}`);
}

async function extractAll() {
  const skillsDir = path.join(__dirname, '..', 'skills');
  const skillDirs = await fs.readdir(skillsDir);

  for (const dir of skillDirs) {
    const skillPath = path.join(skillsDir, dir);
    const stat = await fs.stat(skillPath);
    if (stat.isDirectory()) {
      await extractTestsFromSkill(skillPath);
    }
  }
}

extractAll().catch(console.error);