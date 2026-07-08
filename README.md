# Obsidian Random Writing Prompt Plugin

A plugin for [Obsidian](https://obsidian.md) that helps spark creativity by letting you pick a random writing prompt from a list and start writing.

## Features

- Maintain a single prompts file with a list of ideas organized under a `# Prompts` heading
- Open a random **unstarted** prompt — a new note is created for you automatically
- Open a random **started** prompt — jump back into one you've already begun working on
- Browse all prompts in a fuzzy-search modal
- Add new prompts directly from the command palette
- Configure where prompt files are stored
- Optionally use a template file for new prompt notes

## Commands

| Command | Description |
|---|---|
| **Open random new prompt** | Pick a random prompt that hasn't been started, create a note for it, and open it |
| **Open random started prompt** | Pick a random prompt you've already begun and open its note |
| **Show all prompts** | Open a searchable list of all prompts |
| **Open main prompts file** | Open the prompts list file directly |
| **Add new prompt to file** | Add a new prompt to your list |

## How it works

### The prompts file

Your prompts live in a single Markdown file under a `# Prompts` heading. Each line after the heading is treated as a prompt. For example:

```md
# Prompts
How would you fight someone if you both had 4 arms?
If you were suddenly 9 years old, what's the first thing you'd do?
What would you do if gravity affected everything but you?
You've woken up on the international space station alone, what do you do?
```

When you open a new prompt, the plugin creates a new note (named after the prompt) and turns the prompt line in your list into a wikilink `[[prompt title]]`.

A prompt is considered "started" when its note contains content beyond any YAML frontmatter. If you delete a note, the prompt becomes unstarted again.

### Duplicate detection

The **Add new prompt to file** command checks for duplicates (case-insensitive) before allowing submission so you don't accidentally add the same prompt twice.

## Settings

- **Main prompt file** — the file that stores your prompts. Created automatically on first load with a `# Prompts` heading.
- **Prompts folder** — the folder where new prompt notes are created. Leave empty for the vault root.
- **Template file** — optionally, a template note whose content (including frontmatter) will be used when creating new prompt notes.

## Installation

### From the Community Plugin Browser

Search for "Random Writing Prompt" in Obsidian's community plugin browser and install it.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/tallvincent/obsidian-random-writing-prompt/releases).
2. Copy them into `VaultFolder/.obsidian/plugins/random-writing-prompt/`.
3. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Development

```bash
npm install
npm run dev     # watch mode
npm run build   # production build
npm run lint    # run eslint
```
