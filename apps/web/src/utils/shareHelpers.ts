export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

export const shareViaWebShare = async (data: ShareData): Promise<boolean> => {
  if (!navigator.share) return false
  try {
    if (data.files && data.files.length > 0) {
      if (!navigator.canShare || !navigator.canShare({ files: data.files })) {
        const { files: _files, ...rest } = data
        await navigator.share(rest)
        return true
      }
    }
    await navigator.share(data)
    return true
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return false
    return false
  }
}

export const buildTwitterShareUrl = (text: string, url: string): string => {
  const params = new URLSearchParams({ text, url })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}

export const buildWhatsAppShareUrl = (text: string): string => {
  const params = new URLSearchParams({ text })
  return `https://wa.me/?${params.toString()}`
}

export const buildMessengerShareUrl = (url: string): string => {
  const params = new URLSearchParams({ link: url })
  return `https://www.facebook.com/dialog/send?${params.toString()}`
}

export const buildIMessageUrl = (text: string): string =>
  `sms:&body=${encodeURIComponent(text)}`
