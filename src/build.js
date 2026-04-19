const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

// Build AGENTS.md for each skill
async function buildSkill(skillDir) {
  const rulesDir = path.join(skillDir, 'rules');
  const agentsFile = path.join(skillDir, 'AGENTS.md');

  // Find all .md files in rules/, exclude _* files
  const ruleFiles = glob.sync('*.md', { cwd: rulesDir }).filter(file => !file.startsWith('_'));

  const rules = [];

  for (const file of ruleFiles) {
    const filePath = path.join(rulesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);

    rules.push({
      file,
      title: data.title || data.name || file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      impact: data.impact || 'MEDIUM',
      content: body.trim(),
      ...data
    });
  }

  // Sort rules by impact priority, then title
  const impactOrder = { CRITICAL: 1, HIGH: 2, 'MEDIUM-HIGH': 3, MEDIUM: 4, LOW: 5 };
  rules.sort((a, b) => {
    const aImpact = impactOrder[a.impact] || 6;
    const bImpact = impactOrder[b.impact] || 6;
    if (aImpact !== bImpact) return aImpact - bImpact;
    return a.title.localeCompare(b.title);
  });

  // Generate AGENTS.md content
  let output = `# ${rules[0]?.skill || 'Agentic Skills'} - Complete Rules Reference\n\n`;
  output += `This document compiles all rules from the ${path.basename(skillDir)} skill.\n\n`;

  let currentImpact = '';
  rules.forEach((rule, index) => {
    if (rule.impact !== currentImpact) {
      output += `## ${rule.impact} Priority Rules\n\n`;
      currentImpact = rule.impact;
    }
    output += `### ${rule.title}\n\n`;
    output += `${rule.content}\n\n`;
    output += `---\n\n`;
  });

  await fs.writeFile(agentsFile, output.trim());
  console.log(`Built ${agentsFile}`);
}

// Build all skills
async function buildAll() {
  const skillsDir = path.join(__dirname, '..', 'skills');
  const skillDirs = await fs.readdir(skillsDir);

  for (const dir of skillDirs) {
    const skillPath = path.join(skillsDir, dir);
    const stat = await fs.stat(skillPath);
    if (stat.isDirectory()) {
      const rulesDir = path.join(skillPath, 'rules');
      if (await fs.pathExists(rulesDir)) {
        await buildSkill(skillPath);
      }
    }
  }
}

buildAll().catch(console.error);