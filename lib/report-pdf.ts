import type { jsPDF as JsPdfType } from 'jspdf'
import { REPORT_DISCLAIMER, REPORT_LABEL, REPORT_NOTICE, type ReportData } from './report'
import { fmtDate, fmtVal } from './format'

const INK = '#101c2e'
const MUTED = '#526174'
const TEAL = '#087f83'
const RULE = '#cfd8e3'
const AMBER_BG = '#fbf1de'
const AMBER_INK = '#7d5413'

const PAGE_W = 210
const PAGE_H = 297
const M = 16
const CONTENT_W = PAGE_W - M * 2

function ascii(s: string): string {
  return s.replace(/[\u2192]/g, '->').replace(/[\u2265]/g, '>=').replace(/[\u2264]/g, '<=').replace(/[\u2248]/g, '~')
}

export function reportFileName(data: ReportData): string {
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `strata-lab-${slug || 'report'}.pdf`
}

export async function downloadReportPdf(data: ReportData): Promise<string> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableModule.default
  const doc: JsPdfType = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = M

  const lastY = () => ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y)
  const ensure = (h: number) => {
    if (y + h > PAGE_H - 18) {
      doc.addPage()
      y = M
    }
  }
  const text = (s: string, opts: { size?: number; bold?: boolean; color?: string; x?: number; width?: number; gap?: number } = {}) => {
    const { size = 10, bold = false, color = INK, x = M, width = CONTENT_W, gap = 1.6 } = opts
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(ascii(s), width) as string[]
    const lh = size * 0.4 + gap
    lines.forEach((line) => {
      ensure(lh)
      doc.text(line, x, y + size * 0.3)
      y += lh
    })
  }
  const heading = (n: number, s: string) => {
    ensure(16)
    y += 4
    doc.setDrawColor(RULE)
    doc.setLineWidth(0.3)
    doc.line(M, y, PAGE_W - M, y)
    y += 3
    text(`${n}. ${s}`, { size: 12, bold: true, color: INK, gap: 1 })
    y += 1
  }
  const table = (head: string[], rows: string[][], colWidths?: number[]) => {
    ensure(20)
    autoTable(doc, {
      startY: y,
      head: [head.map(ascii)],
      body: rows.map((r) => r.map(ascii)),
      margin: { left: M, right: M, bottom: 20 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6, textColor: INK, lineColor: RULE, lineWidth: 0.1 },
      headStyles: { fillColor: '#eef2f6', textColor: INK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#fafbfc' },
      columnStyles: colWidths ? Object.fromEntries(colWidths.map((w, i) => [i, { cellWidth: w }])) : undefined,
      theme: 'grid',
    })
    y = lastY() + 3
  }
  const bullets = (items: string[]) =>
    items.forEach((s) => {
      ensure(8)
      doc.setFillColor(TEAL)
      doc.circle(M + 1, y + 1.8, 0.7, 'F')
      text(s, { size: 9.5, x: M + 4, width: CONTENT_W - 4 })
    })
  const callout = (s: string, bold?: string) => {
    doc.setFontSize(9)
    const lines = doc.splitTextToSize(ascii((bold ? bold + ' ' : '') + s), CONTENT_W - 6) as string[]
    const h = lines.length * 4.2 + 5
    ensure(h)
    doc.setFillColor(AMBER_BG)
    doc.roundedRect(M, y, CONTENT_W, h, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(AMBER_INK)
    lines.forEach((l, i) => doc.text(l, M + 3, y + 5 + i * 4.2))
    y += h + 3
  }

  // Masthead
  doc.setFillColor(INK)
  doc.rect(0, 0, PAGE_W, 22, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor('#ffffff')
  doc.text('STRATA LAB', M, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#b8c4d4')
  doc.text('Laboratory Intelligence Report', M + 36, 13)
  doc.text(`${data.reportId}  |  ${fmtDate(data.generatedOn)}`, PAGE_W - M, 13, { align: 'right' })
  y = 30

  text(data.title, { size: 18, bold: true, gap: 2 })
  y += 1
  text(`Prepared by ${data.authorName}  |  ${data.workflow === 'demulsifier' ? 'Oilfield Demulsifier Workflow' : 'Gasoline Blending Workflow'}`, { size: 9, color: MUTED })
  y += 2
  callout(REPORT_NOTICE, REPORT_LABEL)

  heading(1, 'Dataset Overview')
  table(['Item', 'Value'], data.overview.map((o) => [o.label, o.value]), [48, CONTENT_W - 48])
  if (data.datasetTable.rows.length) table(data.datasetTable.head, data.datasetTable.rows)

  heading(2, 'Experiment Summary')
  if (data.empty) text('No experiments match the selected filters.', { size: 9.5, color: MUTED })
  else table(data.experimentTable.head, data.experimentTable.rows)

  heading(3, data.groupTitle)
  if (data.groups.length)
    table(
      ['Group', 'Description', 'Tests', 'With results', `Mean (${data.groupUnit})`, 'Range'],
      data.groups.map((g) => [
        `${g.label}\n${g.sub}`,
        g.description,
        String(g.tests),
        String(g.withResults),
        g.meanValue === null ? 'Not measured' : g.meanValue.toFixed(1),
        g.min === null || g.max === null ? 'Not measured' : `${g.min.toFixed(1)} to ${g.max.toFixed(1)}`,
      ]),
      [34, 66, 12, 16, 24, 24],
    )
  else text('No formulations in scope.', { size: 9.5, color: MUTED })

  heading(4, 'Test Conditions')
  table(data.conditionTable.head, data.conditionTable.rows, [38, CONTENT_W - 38])
  data.conditionWarnings.forEach((w) => callout(w, 'Comparability note.'))

  heading(5, 'Performance Charts')
  if (!data.config.includeCharts) text('Charts were excluded from this report configuration.', { size: 9.5, color: MUTED })
  else drawChart(doc, data, () => y, (v) => (y = v), ensure)

  heading(6, 'Important Laboratory Observations')
  if (data.config.includeInsights && data.insights.length) {
    data.insights.forEach((i) => {
      ensure(24)
      text(i.title, { size: 10, bold: true, gap: 0.8 })
      text(i.observation, { size: 9.5, color: INK })
      text(`Conditions: ${i.conditions}`, { size: 8.5, color: MUTED })
      text(`Evidence: ${i.experimentIds.join(', ') || 'None cited'}.  Limitations: ${i.limitations}`, { size: 8.5, color: MUTED })
      y += 2
    })
  } else if (!data.config.includeInsights) text('AI-assisted insights were excluded from this report configuration.', { size: 9.5, color: MUTED })
  if (data.observations.length) {
    text('Recorded laboratory notes', { size: 10, bold: true, gap: 0.8 })
    data.observations.forEach((o) => text(`${o.title}. ${o.body}`, { size: 9, color: INK }))
  } else if (!data.insights.length || !data.config.includeInsights) text('No recorded laboratory observations in scope.', { size: 9.5, color: MUTED })

  heading(7, 'Supporting Experimental References')
  if (data.references.length)
    table(
      ['Experiment', 'Conditions', 'Recorded result', 'Cited by'],
      data.references.map((r) => [r.id + (r.inScope ? '' : ' (outside filter)'), r.summary, r.result, r.citedBy]),
      [28, 56, 32, CONTENT_W - 116],
    )
  else text('No experiments are cited by the included insights, recommendations or items added to this report.', { size: 9.5, color: MUTED })
  if (data.reportItems.length) {
    text('Items added to this report', { size: 10, bold: true, gap: 0.8 })
    data.reportItems.forEach((it) => text(`${it.title}: ${it.detail}`, { size: 9 }))
  }

  heading(8, 'Proposed Next Experiments')
  if (!data.config.includeRecommendations) text('Recommendations were excluded from this report configuration.', { size: 9.5, color: MUTED })
  else if (!data.recommendations.length) text('No open recommendations in scope.', { size: 9.5, color: MUTED })
  else
    table(
      ['Proposal', 'Conditions', 'Status', 'Rationale'],
      data.recommendations.map(({ rec, plan, assignee }) => [
        `${rec.id}\n${rec.title}`,
        `${rec.formulationId}, ${rec.dosagePpm} ppm${rec.tempC !== null ? `, ${rec.tempC} C` : ''}${rec.settlingMin !== null ? `, ${rec.settlingMin} min` : ''}`,
        plan ? `${rec.status}\n${plan.id}: ${plan.status}${assignee ? `, ${assignee.name}` : ''}` : rec.status,
        rec.rationale,
      ]),
      [44, 38, 32, CONTENT_W - 114],
    )

  heading(9, "Chemist's Notes")
  text(data.notes || 'No chemist notes were entered for this report.', { size: 9.5, color: data.notes ? INK : MUTED })

  heading(10, 'Recommended Validation Steps')
  bullets(data.validation)

  heading(11, 'Limitations and Disclaimer')
  REPORT_DISCLAIMER.forEach((d) => {
    text(d, { size: 9 })
    y += 1
  })

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(RULE)
    doc.setLineWidth(0.2)
    doc.line(M, PAGE_H - 13, PAGE_W - M, PAGE_H - 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(MUTED)
    doc.text(ascii(REPORT_LABEL), M, PAGE_H - 8.5)
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, PAGE_H - 8.5, { align: 'right' })
  }

  const name = reportFileName(data)
  doc.save(name)
  return name
}

function drawChart(doc: JsPdfType, data: ReportData, getY: () => number, setY: (v: number) => void, ensure: (h: number) => void) {
  const series =
    data.workflow === 'demulsifier'
      ? data.demSeries.map((s) => ({ label: s.formulationId, color: data.groups.find((g) => g.key === s.formulationId)?.color ?? '#5b6b82', points: s.points.map((p) => ({ x: p.x, y: p.y, hollow: p.mismatch.length > 0 })), means: s.means.map((m) => ({ x: m.x, y: m.y })) }))
      : data.gasSeries.map((s) => ({ label: s.label, color: s.color, points: s.points.map((p) => ({ x: p.x, y: p.y, hollow: false })), means: s.points.map((p) => ({ x: p.x, y: p.y })) }))
  const all = series.flatMap((s) => s.points)
  if (!all.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(MUTED)
    ensure(8)
    doc.text('No recorded results are available to chart for the selected filters.', M, getY() + 4)
    setY(getY() + 8)
    return
  }
  const H = 70
  ensure(H + 26)
  const top = getY() + 4
  const left = M + 14
  const w = CONTENT_W - 18
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  const xMin = Math.min(...xs) - 10
  const xMax = Math.max(...xs) + 10
  const wf = data.workflow
  const yMin = wf === 'demulsifier' ? 0 : Math.floor(Math.min(...ys) - 2)
  const yMax = wf === 'demulsifier' ? 100 : Math.ceil(Math.max(...ys) + 2)
  const sx = (v: number) => left + ((v - xMin) / (xMax - xMin || 1)) * w
  const sy = (v: number) => top + H - ((v - yMin) / (yMax - yMin || 1)) * H

  doc.setDrawColor('#e2e8ef')
  doc.setLineWidth(0.15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(MUTED)
  for (let i = 0; i <= 5; i++) {
    const v = yMin + ((yMax - yMin) * i) / 5
    doc.line(left, sy(v), left + w, sy(v))
    doc.text(v.toFixed(wf === 'demulsifier' ? 0 : 1), left - 2, sy(v) + 1, { align: 'right' })
  }
  for (let i = 0; i <= 5; i++) {
    const v = xMin + ((xMax - xMin) * i) / 5
    doc.text(String(Math.round(v)), sx(v), top + H + 4, { align: 'center' })
  }
  doc.setDrawColor('#cfd8e3')
  doc.setLineWidth(0.3)
  doc.line(left, top, left, top + H)
  doc.line(left, top + H, left + w, top + H)
  doc.text(wf === 'demulsifier' ? 'Chemical dosage (ppm)' : 'Booster dosage (ppm)', left + w / 2, top + H + 9, { align: 'center' })
  doc.text(wf === 'demulsifier' ? 'Water separation (%)' : 'Measured RON', M + 2, top + H / 2, { angle: 90, align: 'center' })

  series.forEach((s) => {
    doc.setDrawColor(s.color)
    doc.setLineWidth(0.4)
    const m = [...s.means].sort((a, b) => a.x - b.x)
    for (let i = 1; i < m.length; i++) doc.line(sx(m[i - 1].x), sy(m[i - 1].y), sx(m[i].x), sy(m[i].y))
    s.points.forEach((p) => {
      doc.setLineWidth(0.4)
      if (p.hollow) {
        doc.setFillColor('#ffffff')
        doc.setDrawColor(s.color)
        doc.circle(sx(p.x), sy(p.y), 1.3, 'FD')
      } else {
        doc.setFillColor(s.color)
        doc.circle(sx(p.x), sy(p.y), 1.3, 'F')
      }
    })
  })

  let lx = left
  const ly = top + H + 14
  series.forEach((s) => {
    doc.setFillColor(s.color)
    doc.circle(lx + 1, ly - 1, 1.2, 'F')
    doc.setTextColor(INK)
    doc.text(s.label, lx + 3.5, ly)
    lx += 8 + doc.getTextWidth(s.label)
  })
  setY(ly + 3)
  doc.setFontSize(8)
  doc.setTextColor(MUTED)
  const cap = doc.splitTextToSize(ascii(data.chartCaption), CONTENT_W) as string[]
  cap.forEach((l, i) => doc.text(l, M, getY() + 3 + i * 3.6))
  setY(getY() + 3 + cap.length * 3.6 + 1)
}
