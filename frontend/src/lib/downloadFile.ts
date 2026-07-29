import { api } from './api'

export async function downloadFile(
  url: string,
  filename: string,
  headers?: Record<string, string>,
) {
  const response = await api.get<Blob>(url, {
    headers,
    responseType: 'blob',
  })
  const blobUrl = window.URL.createObjectURL(response.data)
  const link = document.createElement('a')

  link.href = blobUrl
  link.download = getFilenameFromHeader(response.headers['content-disposition']) ?? filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

function getFilenameFromHeader(contentDisposition?: string) {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/)

  return match?.[1]
}
