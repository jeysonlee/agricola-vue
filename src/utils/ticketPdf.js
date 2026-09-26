import jsPDF from 'jspdf'

function defaultFormatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function drawWrappedText(pdf, text, x, y, maxWidth, lineHeight = 4, maxLines = 2) {
  const value = String(text || '')
  if (!value) return

  const lines = pdf.splitTextToSize(value, maxWidth).slice(0, maxLines)
  lines.forEach((line, index) => {
    pdf.text(line, x, y + index * lineHeight)
  })
}

function drawTicket(pdf, ticket, y, config) {
  const {
    widthMm,
    ticketHeightMm,
    marginLeftMm,
    title,
    subtitle,
    logo,
    formatDate,
    fieldStyles = {},
  } = config

  pdf.addImage(logo, 'JPEG', 3, y, 20, 20)

  const subtitleStyle = fieldStyles.subtitle || { font: 'times', weight: 'bold', size: 8 }
  pdf.setFont(subtitleStyle.font, subtitleStyle.weight)
  pdf.setFontSize(subtitleStyle.size)
  pdf.setTextColor(0, 0, 0)
  pdf.text(String(subtitle), 27, y + 6)

  const titleStyle = fieldStyles.title || { font: 'times', weight: 'bold', size: 10 }
  pdf.setFont(titleStyle.font, titleStyle.weight)
  pdf.setFontSize(titleStyle.size)
  pdf.setTextColor(0, 0, 0)
  pdf.text(String(title), 27, y + 12)

  const ticketStyle = fieldStyles.ticket || { font: 'times', weight: 'bold', size: 11 }
  pdf.setFont(ticketStyle.font, ticketStyle.weight)
  pdf.setFontSize(ticketStyle.size)
  pdf.text(`TICKET N.° ${ticket.numero}`, 24, y + 24)

  const clientLines = pdf.splitTextToSize(ticket.nombre || '', 45).slice(0, 2)
  const clientOffset = clientLines.length > 1 ? 4 : 0

  pdf.setFont('times', 'bold')
  pdf.setFontSize(9)
  pdf.text('Cliente:', 4, y + 30)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  clientLines.forEach((line, index) => {
    pdf.text(line, 17, y + 30 + index * 4)
  })

  const infoY = y + 34 + clientOffset

  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text('DNI:', 4, infoY)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text(ticket.dni || '', 12, infoY)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text('Teléfono:', 37, infoY)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(9)
  pdf.text(ticket.telefono || '', 50, infoY)

  const hashY = infoY + 5

  pdf.setFont('times', 'normal')
  pdf.setFontSize(7)
  pdf.text('HASH:', 4, hashY)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(7)
  pdf.text(ticket.hash || '', 12, hashY)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(7)
  pdf.text('Fecha de sorteo:', 31, hashY)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(6.8)
  pdf.text('11/10/2026 12:30 pm', 48, hashY)

  const footerY = hashY + 6

  pdf.setFont('times', 'bold')
  pdf.setFontSize(10)
  pdf.text('Conserve este ticket', 25, footerY)

  const dividerY = footerY + 15
  pdf.setDrawColor(80, 80, 80)
  pdf.line(0, dividerY, widthMm, dividerY) // línea divisoria con ancho real del ticket
}

export function openPdfInBrowser(pdf, fileName = 'document.pdf') {
  if (!pdf || typeof window === 'undefined') return null

  const blob = pdf.output('blob')
  if (!blob || !window.URL || typeof window.URL.createObjectURL !== 'function') {
    return null
  }

  const blobUrl = window.URL.createObjectURL(blob)
  const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')

  if (previewWindow) {
    previewWindow.focus()
  } else {
    window.open(blobUrl, '_blank')
  }

  window.setTimeout(() => {
    if (window.URL && typeof window.URL.revokeObjectURL === 'function') {
      window.URL.revokeObjectURL(blobUrl)
    }
  }, 60000)

  return previewWindow
}

export function exportTicketsToPdf(tickets, fileName = 'tickets-promocionales.pdf', options = {}) {
  if (!Array.isArray(tickets) || tickets.length === 0) return Promise.resolve()

  const {
    logoSrc = '/graniti_logo.jpeg',
    formatDate = defaultFormatDate,
    widthMm = 72,
    ticketHeightMm = 80,
    marginLeftMm = 2,
    title = 'SIEMBRA Y GANA',
    subtitle = 'Campaña de promoción',
    fieldStyles = {},
    fieldPositions = {},
  } = options

  return new Promise((resolve, reject) => {
    const logo = new Image()
    logo.src = logoSrc

    logo.onload = () => {
      try {
        const documentHeight = 16 + tickets.length * ticketHeightMm
        const pdf = new jsPDF({
          unit: 'mm',
          format: [widthMm, documentHeight],
          orientation: 'portrait',
        })

        let y = 3
        tickets.forEach((ticket) => {
          drawTicket(pdf, ticket, y, {
            widthMm,
            ticketHeightMm,
            marginLeftMm,
            title,
            subtitle,
            logo,
            formatDate,
            fieldStyles,
            fieldPositions,
          })
          y += ticketHeightMm
        })

        openPdfInBrowser(pdf, fileName)
        resolve()
      } catch (error) {
        reject(error)
      }
    }

    logo.onerror = () => reject(new Error('No se pudo cargar el logo del ticket'))
  })
}

export const jsPdfKeys = {
  widthMm: 'ancho fijo del documento (72 mm)',
  ticketHeightMm: 'altura de cada ticket',
  title: 'texto principal del encabezado',
  subtitle: 'texto secundario del encabezado',
  marginLeftMm: 'margen horizontal',
  fieldStyles: 'estilos específicos por campo: cliente, telefono, compra, hash, fecha, etc.',
  fieldPositions: 'posicionamiento manual por campo: { cliente: { x, y }, fecha: { x, y } }',
  setFont: 'cambia la fuente',
  setFontSize: 'cambia el tamaño de fuente',
  text: 'agrega texto',
  line: 'dibuja una línea divisoria',
  addImage: 'agrega logo o imagen',
  setDrawColor: 'cambia el color de líneas',
  setTextColor: 'cambia el color de líneas',
  save: 'descarga el PDF final',
  openPdfInBrowser: 'abre una vista previa del PDF en una pestaña antes de descargar',
}
