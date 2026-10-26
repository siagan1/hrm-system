import { NextRequest } from "next/server"
import { Workbook } from "exceljs"

import { getProjectInputExport } from "@/actions/project.actions"
import { UnauthenticatedError } from "@/lib/auth-utils"

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function monthLabel(targetMonth: string): string {
  return String(Number(targetMonth.slice(5, 7)))
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""

  if (!MONTH_RE.test(from) || !MONTH_RE.test(to) || from > to) {
    return new Response("from/to 파라미터가 올바르지 않습니다 (YYYY-MM, from <= to).", {
      status: 400,
    })
  }

  let data
  try {
    data = await getProjectInputExport(from, to)
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return new Response("로그인이 필요합니다.", { status: 401 })
    }
    throw error
  }

  const workbook = new Workbook()
  const sheet = workbook.addWorksheet("투입내역", {
    views: [{ showGridLines: false, state: "frozen", ySplit: 1 }],
  })

  // 컬럼 너비는 행을 추가하기 전에 먼저 지정합니다 — addRow/merge 이후에 지정하면
  // exceljs가 내부 컬럼 콜렉션을 다시 구성하면서 이미 그려둔 셀 스타일/병합이
  // 뒤섞이는 경우가 있어(특히 데이터 분량에 따라 컬럼 수가 달라지는 이 표에서),
  // 표가 일부만 그려지거나 프로젝트명 병합이 깨지는 원인이 됐습니다.
  const colCount = 7 + data.months.length
  sheet.columns = [
    { width: 16 },
    { width: 34 },
    { width: 12 },
    { width: 16 },
    { width: 26 },
    { width: 13 },
    { width: 8 },
    ...data.months.map(() => ({ width: 6 })),
  ]

  const THIN_BORDER = {
    top: { style: "thin" as const },
    bottom: { style: "thin" as const },
    left: { style: "thin" as const },
    right: { style: "thin" as const },
  }

  const headerLabels = [
    "프로젝트코드",
    "프로젝트명",
    "이름",
    "Organization",
    "Skill Type",
    "Skill Level",
    "MM",
    ...data.months.map(monthLabel),
  ]
  const headerRow = sheet.addRow(headerLabels)
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } }
    cell.border = THIN_BORDER
    cell.alignment = { vertical: "middle", horizontal: "center" }
  })

  const mmColIndex = 7
  let projectBlockStart = 2 // 1-indexed, row 1 is header

  data.rows.forEach((row, i) => {
    const rowIndex = i + 2
    const excelRow = sheet.addRow([
      row.projectCode ?? "",
      row.projectName,
      row.employeeName,
      row.teamName,
      "Quality Management / Testing",
      row.gradeEn,
      row.totalMm,
      ...row.monthlyMm.map((v) => v ?? null),
    ])

    for (let col = 1; col <= colCount; col++) {
      const cell = excelRow.getCell(col)
      cell.border = THIN_BORDER
      cell.alignment =
        col <= 6
          ? { vertical: "middle", horizontal: col >= 3 ? "left" : "center" }
          : { vertical: "middle", horizontal: "center" }
    }

    const mmCell = excelRow.getCell(mmColIndex)
    mmCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } }

    const isLastOfProject =
      i === data.rows.length - 1 || data.rows[i + 1].projectName !== row.projectName
    if (isLastOfProject) {
      if (rowIndex > projectBlockStart) {
        sheet.mergeCells(projectBlockStart, 1, rowIndex, 1)
        sheet.mergeCells(projectBlockStart, 2, rowIndex, 2)
      }
      projectBlockStart = rowIndex + 1
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const fileName = `프로젝트_투입내역_${from}~${to}.xlsx`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  })
}
