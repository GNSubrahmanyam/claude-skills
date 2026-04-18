#!/usr/bin/env python3
"""
Claude Skills Manager
Lists and provides information about available skills
"""

import os
import json
from pathlib import Path

class SkillsManager:
    """Manage and list available skills"""

    def __init__(self, skills_dir="skills"):
        self.skills_dir = Path(skills_dir)
        self.skills = {}

    def discover_skills(self):
        """Discover all available skills"""
        if not self.skills_dir.exists():
            return

        for skill_dir in self.skills_dir.iterdir():
            if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
                skill_info = self.parse_skill_info(skill_dir)
                if skill_info:
                    self.skills[skill_info['name']] = skill_info

    def parse_skill_info(self, skill_dir):
        """Parse skill information from SKILL.md"""
        skill_md = skill_dir / "SKILL.md"

        try:
            with open(skill_md, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract basic info from frontmatter and content
            lines = content.split('\n')
            name = ""
            description = ""

            for line in lines:
                if line.startswith('name:'):
                    name = line.split(':', 1)[1].strip().strip('"')
                elif line.startswith('description:'):
                    description = line.split(':', 1)[1].strip().strip('"')
                elif line.startswith('# '):
                    # Fallback if no frontmatter
                    if not name:
                        name = line[2:].strip()
                    break

            if name:
                # Count rules
                rules_dir = skill_dir / "rules"
                rules_count = 0
                if rules_dir.exists():
                    rules_count = len(list(rules_dir.glob("*.md")))

                return {
                    'name': name,
                    'description': description,
                    'path': str(skill_dir),
                    'rules_count': rules_count,
                    'status': 'Complete' if rules_count > 0 else 'In Development'
                }

        except Exception as e:
            print(f"Error parsing {skill_md}: {e}")

        return None

    def list_skills(self):
        """List all available skills"""
        if not self.skills:
            self.discover_skills()

        print("🎯 Available Claude Skills")
        print("=" * 50)

        for skill_name, info in self.skills.items():
            print(f"\n📚 {skill_name}")
            print(f"   Status: {info['status']}")
            print(f"   Rules: {info['rules_count']}+")
            print(f"   Path: {info['path']}")
            if info['description']:
                # Truncate description for display
                desc = info['description'][:100] + "..." if len(info['description']) > 100 else info['description']
                print(f"   Description: {desc}")

    def get_skill_info(self, skill_name):
        """Get detailed information about a specific skill"""
        if not self.skills:
            self.discover_skills()

        if skill_name in self.skills:
            info = self.skills[skill_name]
            print(f"\n📖 {skill_name}")
            print("=" * 40)
            print(f"Status: {info['status']}")
            print(f"Rules: {info['rules_count']}+")
            print(f"Location: {info['path']}")
            print(f"Description: {info['description']}")

            # Show file structure
            skill_path = Path(info['path'])
            print("\nFiles:")
            print(f"  SKILL.md - Overview and quick reference")
            print(f"  AGENTS.md - Complete compiled rules")

            rules_dir = skill_path / "rules"
            if rules_dir.exists():
                print(f"  rules/ - {len(list(rules_dir.glob('*.md')))} individual rules")

            references_dir = skill_path / "references"
            if references_dir.exists():
                print(f"  references/ - Advanced workflow guides")

        else:
            print(f"Skill '{skill_name}' not found.")
            print("Available skills:")
            for name in self.skills.keys():
                print(f"  - {name}")

def main():
    manager = SkillsManager()

    if len(os.sys.argv) > 1:
        skill_name = ' '.join(os.sys.argv[1:])
        manager.get_skill_info(skill_name)
    else:
        manager.list_skills()

if __name__ == "__main__":
    main()