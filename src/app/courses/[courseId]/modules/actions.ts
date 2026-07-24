'use server'

import { revalidatePath } from 'next/cache'
import { addModuleItem, createModule, getAssignment } from '@/lib/store'
import type { ModuleItemKind } from '@/lib/types'

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function createModuleAction(courseId: string, fd: FormData): Promise<void> {
  const name = str(fd, 'name')
  if (name) createModule(courseId, name)
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}

export async function addModuleItemAction(courseId: string, moduleId: string, fd: FormData): Promise<void> {
  const kind = (str(fd, 'kind') || 'link') as ModuleItemKind
  if (kind === 'assignment') {
    const refId = str(fd, 'assignmentId')
    const a = refId ? getAssignment(refId) : undefined
    if (a) addModuleItem(moduleId, { kind, title: a.title, refId: a.id, url: null })
  } else if (kind === 'link') {
    const url = str(fd, 'url')
    const title = str(fd, 'title') || url
    if (url) addModuleItem(moduleId, { kind, title, refId: null, url })
  }
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}
