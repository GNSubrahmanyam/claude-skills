const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

async function addFrontmatterToRule(filePath, skillName) {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data } = matter(content);

  // Skip if already has frontmatter
  if (data.title) return;

  const lines = content.split('\n');
  let title = '';
  let impact = 'MEDIUM';
  let impactDescription = '';
  let tags = [skillName];

  // Extract title from # heading
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      title = line.substring(2).replace(/\s*\([^)]*\)$/, ''); // Remove (CRITICAL) etc.
      break;
    }
  }

  // Extract impact from **Impact:** line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('**Impact:**')) {
      const impactMatch = line.match(/\*\*Impact:\*\*\s*([A-Z]+(?:-[A-Z]+)?)/);
      if (impactMatch) {
        impact = impactMatch[1];
      }
      break;
    }
  }

  // Extract impact description from **Problem:** or first paragraph after Impact
  let inProblem = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('**Problem:**')) {
      inProblem = true;
      continue;
    }
    if (inProblem && line && !line.startsWith('**')) {
      impactDescription = line;
      break;
    }
  }

  // Generate tags based on content
  if (content.toLowerCase().includes('security')) tags.push('security');
  if (content.toLowerCase().includes('database') || content.toLowerCase().includes('db-')) tags.push('database');
  if (content.toLowerCase().includes('form')) tags.push('forms');
  if (content.toLowerCase().includes('view')) tags.push('views');
  if (content.toLowerCase().includes('template')) tags.push('templates');
  if (content.toLowerCase().includes('test')) tags.push('testing');
  if (content.toLowerCase().includes('performance') || content.toLowerCase().includes('perf-')) tags.push('performance');
  if (content.toLowerCase().includes('deployment') || content.toLowerCase().includes('deploy-')) tags.push('deployment');
  if (content.toLowerCase().includes('auth')) tags.push('authentication');
  if (content.toLowerCase().includes('cache')) tags.push('caching');

  // Remove duplicate tags
  tags = [...new Set(tags)];

  // Create frontmatter
  const frontmatter = `---
title: ${title}
impact: ${impact}
impactDescription: ${impactDescription}
tags: ${tags.join(', ')}
---

`;

  // Remove redundant lines from content
  let newContent = content;
  // Remove **Impact:** line
  newContent = newContent.replace(/\*\*Impact:\*\*\s*[^*]+\n/g, '');
  // Update title heading to remove impact suffix
  newContent = newContent.replace(/^# .+ \(CRITICAL\)$|^# .+ \(HIGH\)$|^# .+ \(MEDIUM.*\)$|^# .+ \(LOW.*\)$/gm, `# ${title}`);

  // Add frontmatter
  const newFileContent = frontmatter + newContent.trim();

  await fs.writeFile(filePath, newFileContent);
  console.log(`Updated ${filePath}`);
}

async function addFrontmatterToAll() {
  const skillsDir = path.join(__dirname, '..', 'skills');
  const skillDirs = await fs.readdir(skillsDir);

  for (const dir of skillDirs) {
    const skillPath = path.join(skillsDir, dir);
    const stat = await fs.stat(skillPath);
    if (stat.isDirectory()) {
      const rulesDir = path.join(skillPath, 'rules');
      if (await fs.pathExists(rulesDir)) {
        const ruleFiles = glob.sync('*.md', { cwd: rulesDir }).filter(file => !file.startsWith('_'));
        for (const file of ruleFiles) {
          await addFrontmatterToRule(path.join(rulesDir, file), dir);
        }
      }
    }
  }
}

addFrontmatterToAll().catch(console.error);