import jsPDF from 'jspdf'

function defaultFormatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
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

  pdf.addImage(logo, 'JPEG', 3, y, 22, 22)

  const subtitleStyle = fieldStyles.subtitle || { font: 'times', weight: 'bold', size: 8 }
  pdf.setFont(subtitleStyle.font, subtitleStyle.weight)
  pdf.setFontSize(subtitleStyle.size)
  pdf.setTextColor(0, 0, 0)
  pdf.text(String(subtitle), 33, y + 6)

  const titleStyle = fieldStyles.title || { font: 'times', weight: 'bold', size: 10 }
  pdf.setFont(titleStyle.font, titleStyle.weight)
  pdf.setFontSize(titleStyle.size)
  pdf.setTextColor(0, 0, 0)
  pdf.text(String(title), 33, y + 12)

  const ticketStyle = fieldStyles.ticket || { font: 'times', weight: 'bold', size: 11 }
  pdf.setFont(ticketStyle.font, ticketStyle.weight)
  pdf.setFontSize(ticketStyle.size)
  pdf.text(`TICKET N.° ${ticket.numero}`, 28, y + 24)

  pdf.setFont('times', 'bold')
  pdf.setFontSize(9)
  pdf.text('Cliente:', 4, y + 30)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text(ticket.nombre || '', 17, y + 30)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text('DNI:', 4, y + 34)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text(ticket.dni || '', 12, y + 34)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text('Teléfono:', 45, y + 34)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(9)
  pdf.text(ticket.telefono || '', 59, y + 34)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)
  pdf.text('Compra:', 4, y + 39)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(11)
  pdf.text(`S/ ${Number(ticket.monto || 0).toFixed(2)}`, 20, y + 39)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(6.7)
  pdf.text('HASH:', 4, y + 45)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(6.4)
  pdf.text(ticket.hash || '', 12, y + 45)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(7)
  pdf.text('Fecha:', 45, y + 45)
  pdf.setFont('times', 'normal')
  pdf.setFontSize(6.8)
  pdf.text(formatDate(ticket.createdAt), 55, y + 45)

  pdf.setFont('times', 'bold')
  pdf.setFontSize(10)
  pdf.text('Conserve este ticket', 25, y + 54)

  pdf.setDrawColor(80, 80, 80)
  pdf.line(0, y+58, 80, y+58) // línea divisoria
}

export function exportTicketsToPdf(tickets, fileName = 'tickets-promocionales.pdf', options = {}) {
  if (!Array.isArray(tickets) || tickets.length === 0) return Promise.resolve()

  const {
    logoSrc = '/graniti_logo.jpeg',
    formatDate = defaultFormatDate,
    widthMm = 80,
    ticketHeightMm = 62,
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

        pdf.save(fileName)
        resolve()
      } catch (error) {
        reject(error)
      }
    }

    logo.onerror = () => reject(new Error('No se pudo cargar el logo del ticket'))
  })
}

export const jsPdfKeys = {
  widthMm: 'ancho fijo del documento (80 mm)',
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
  setTextColor: 'cambia el color del texto',
  save: 'descarga el PDF final',
}
