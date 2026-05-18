export type Grade = "A" | "B+" | "B" | "C+" | "C" | "D" | "F" | "FD" | "N/A"

export const GRADE_POINTS: Record<Grade, number> = {
  "A": 4.0,
  "B+": 3.5,
  "B": 3.0,
  "C+": 2.5,
  "C": 2.0,
  "D": 1.0,
  "F": 0.0,
  "FD": 0.0,
  "N/A": 0.0
}

export interface SubjectRecord {
  name: string
  units: number
  grade: Grade
  year?: string
  semester?: string
  included?: boolean
}

export function calculateQPI(subjects: SubjectRecord[]): number {
  const includedSubjects = subjects.filter(s => s.included !== false && s.grade !== "N/A")
  const totalUnits = includedSubjects.reduce((sum, s) => sum + s.units, 0)
  if (totalUnits === 0) return 0
  
  const totalPoints = includedSubjects.reduce((sum, s) => sum + (s.units * GRADE_POINTS[s.grade]), 0)
  return totalPoints / totalUnits
}

export function parseCurriculumText(text: string): SubjectRecord[] {
  const lines = text.split('\n')
  const records: SubjectRecord[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Split by tab OR two or more spaces (common when tabs are lost in copy-paste)
    let parts = trimmed.split(/\t|\s{2,}/).map(p => p.trim()).filter(p => p !== '')
    
    if (parts.length >= 4) {
      const isYear = /^\d(st|nd|rd|th)\s*Yr\./i.test(parts[0])
      const isSem = /semester/i.test(parts[1])

      let year, semester, title, unitsStr, gradeStr

      if (isYear && isSem) {
        title = parts[3]
        unitsStr = parts[4]
        gradeStr = parts[5]
        year = parts[0]
        semester = parts[1]
      } else {
        // Fallback: look for the units column (usually a single digit before grade or remarks)
        // We look for a pattern where units is a number 1-6
        const unitsIndex = parts.findIndex((p, i) => /^[1-6]$/.test(p) && i > 0)
        if (unitsIndex !== -1) {
          unitsStr = parts[unitsIndex]
          gradeStr = parts[unitsIndex + 1]
          title = parts[unitsIndex - 1]
          // Try to find year/sem if they were shifted
          if (unitsIndex >= 3) {
            year = parts[0]
            semester = parts[1]
          }
        }
      }

      const units = parseInt(unitsStr || "0")
      const grade = (gradeStr && GRADE_POINTS.hasOwnProperty(gradeStr)) ? gradeStr as Grade : "N/A"

      // Include the subject if it has a title and units
      if (title && units > 0) {
        records.push({
          name: title,
          units,
          grade,
          year: year || "Other",
          semester: semester || "Other",
          included: grade !== "N/A" // Automatically exclude if it has no valid grade
        })
      }
    }
  }
  
  return records
}
