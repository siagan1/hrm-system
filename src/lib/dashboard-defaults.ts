export type WidgetLayoutItem = {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutItem[] = [
  { i: "summary", x: 0, y: 0, w: 12, h: 3 },
  { i: "project-mm", x: 0, y: 3, w: 7, h: 8 },
  { i: "hr-committee", x: 7, y: 3, w: 5, h: 8 },
  { i: "lp-recent", x: 0, y: 11, w: 12, h: 7 },
]
