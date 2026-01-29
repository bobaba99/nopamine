const applyRationaleFormatting = (input: string) => {
  const hasEmphasisTags = /<\s*(strong|em)\b/i.test(input)
  if (hasEmphasisTags) return input

  const labelReplacements: Array<{ label: string; bold: boolean }> = [
    { label: 'Core values', bold: true },
    { label: 'Regret patterns', bold: false },
    { label: 'Satisfaction patterns', bold: false },
    { label: 'Decision style', bold: false },
    { label: 'Financial sensitivity', bold: false },
    { label: 'Identity stability', bold: false },
    { label: 'Emotional relationship', bold: false },
  ]

  let formatted = input
  for (const { label, bold } of labelReplacements) {
    // Match both curly quotes (""), straight quotes (""), and backticks (`)
    const regex = new RegExp(`\\b${label}\\s*\\[\\s*["""\`]([^"""\`]+)["""\`]\\s*\\]`, 'gi')
    formatted = formatted.replace(regex, (_match, value: string) => {
      const labelHtml = bold ? `<strong>${label}</strong>` : label
      return `${labelHtml} [<em>"${value}"</em>]`
    })
  }

  return formatted
}

export const sanitizeVerdictRationaleHtml = (input: string) => {
  const formatted = applyRationaleFormatting(input)
  const escaped = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(/\r?\n/g, '<br />')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br />')
    .replace(/&lt;strong&gt;/gi, '<strong>')
    .replace(/&lt;\/strong&gt;/gi, '</strong>')
    .replace(/&lt;em&gt;/gi, '<em>')
    .replace(/&lt;\/em&gt;/gi, '</em>')
}
