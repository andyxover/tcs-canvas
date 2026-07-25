'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { saveGradeSettings, updateCourse } from '@/lib/store'
import type { GradeCalc, GradeCategory } from '@/lib/types'

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function saveCourseSettingsAction(courseId: string, fd: FormData): Promise<void> {
  await updateCourse(courseId, {
    name: str(fd, 'name') || 'Untitled course',
    code: str(fd, 'code'),
    term: str(fd, 'term'),
    color: str(fd, 'color') || '#2b5cff',
  })

  const catCount = Math.max(0, Number(str(fd, 'catCount')) || 0)
  const categories: GradeCategory[] = []
  for (let i = 0; i < catCount; i++) {
    const name = str(fd, `cat-${i}-name`)
    if (!name) continue
    const weight = Math.max(0, Math.min(100, Number(str(fd, `cat-${i}-weight`)) || 0))
    categories.push({ name, weight })
  }

  const calcRaw = str(fd, 'calc')
  const calc: GradeCalc = calcRaw === 'total' || calcRaw === 'none' ? calcRaw : 'weighted'
  await saveGradeSettings(courseId, {
    calc,
    showTotalsToStudents: fd.get('showTotals') === 'on',
    categories: categories.length > 0 ? categories : [{ name: 'Assignments', weight: 100 }],
  })

  revalidatePath(`/courses/${courseId}`, 'layout')
  redirect(`/courses/${courseId}/settings`)
}
