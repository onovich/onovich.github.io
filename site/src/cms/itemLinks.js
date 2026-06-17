export function normalizeCmsItemLinks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(link => ({
      label: (link?.label ?? '').toString().trim(),
      url: (link?.url ?? '').toString().trim(),
    }))
    .filter(link => link.label || link.url);
}

export function upsertCmsItemLink(links, link, index = -1) {
  const normalizedLinks = normalizeCmsItemLinks(links);
  const normalizedLink = normalizeCmsItemLinks([link])[0];
  if (!normalizedLink) return normalizedLinks;
  if (Number.isInteger(index) && index >= 0 && index < normalizedLinks.length) {
    return normalizedLinks.map((item, itemIndex) => itemIndex === index ? normalizedLink : item);
  }
  return [...normalizedLinks, normalizedLink];
}

export function removeCmsItemLink(links, index) {
  return normalizeCmsItemLinks(links).filter((_, itemIndex) => itemIndex !== index);
}
