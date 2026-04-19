const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

async function validateSkill(skillDir) {
  const rulesDir = path.join(skillDir, 'rules');

  if (!(await fs.pathExists(rulesDir))) {
    console.log(`No rules dir in ${skillDir}, skipping`);
    return;
  }

  const ruleFiles = glob.sync('*.md', { cwd: rulesDir }).filter(file => !file.startsWith('_'));

  let hasErrors = false;

  for (const file of ruleFiles) {
    const filePath = path.join(rulesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    try {
      const { data } = matter(content);

      // Check required fields
      if (!data.name && !data.title) {
        console.error(`${file}: Missing title or name in frontmatter`);
        hasErrors = true;
      }

      if (!data.description) {
        console.error(`${file}: Missing description in frontmatter`);
        hasErrors = true;
      }

      // Check for basic structure
      if (!content.includes('##')) {
        console.warn(`${file}: No section headers found`);
      }

    } catch (error) {
      console.error(`${file}: Error parsing frontmatter - ${error.message}`);
      hasErrors = true;
    }
  }

  if (!hasErrors) {
    console.log(`✅ ${path.basename(skillDir)} validation passed`);
  } else {
    console.log(`❌ ${path.basename(skillDir)} validation failed`);
  }

  return !hasErrors;
}

async function validateAll() {
  const skillsDir = path.join(__dirname, '..', 'skills');
  const skillDirs = await fs.readdir(skillsDir);

  let allValid = true;

  for (const dir of skillDirs) {
    const skillPath = path.join(skillsDir, dir);
    const stat = await fs.stat(skillPath);
    if (stat.isDirectory()) {
      const isValid = await validateSkill(skillPath);
      if (!isValid) allValid = false;
    }
  }

  if (!allValid) {
    process.exit(1);
  }
}

validateAll().catch(console.error);