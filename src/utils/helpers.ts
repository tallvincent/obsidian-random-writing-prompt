export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wrapAsWikilink(data: string, title: string): string {
	const escaped = escapeRegex(title);
	const regex = new RegExp(`\\[\\[${escaped}\\]\\]|${escaped}(?!\\]\\])`, 'g');
	return data.replace(regex, (match: string) => {
		if (match.startsWith('[[')) return match;
		return `[[${title}]]`;
	});
}
