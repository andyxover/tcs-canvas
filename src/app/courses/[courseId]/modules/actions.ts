'use server'

import { revalidatePath } from 'next/cache'
import {
  addModuleItem,
  createModule,
  deleteModule,
  deleteModuleItem,
  getAssignment,
  moveModule,
  moveModuleItem,
} from '@/lib/store'
import type { ModuleItemKind } from '@/lib/types'

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export async function createModuleAction(courseId: string, fd: FormData): Promise<void> {
  const name = str(fd, 'name')
  if (name) await createModule(courseId, name)
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}

export async function deleteModuleAction(courseId: string, moduleId: string): Promise<void> {
  await deleteModule(moduleId)
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}

export async function deleteModuleItemAction(courseId: string, moduleId: string, itemId: string): Promise<void> {
  await deleteModuleItem(moduleId, itemId)
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}

export async function moveModuleAction(courseId: string, moduleId: string, dir: 'up' | 'down'): Promise<void> {
  await moveModule(courseId, moduleId, dir)
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}

export async function moveModuleItemAction(courseId: string, moduleId: string, itemId: string, dir: 'up' | 'down'): Promise<void> {
  await moveModuleItem(moduleId, itemId, dir)
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}

export async function addModuleItemAction(courseId: string, moduleId: string, fd: FormData): Promise<void> {
  const kind = (str(fd, 'kind') || 'link') as ModuleItemKind
  if (kind === 'assignment') {
    const refId = str(fd, 'assignmentId')
    const a = refId ? await getAssignment(refId) : undefined
    if (a) await addModuleItem(moduleId, { kind, title: a.title, refId: a.id, url: null })
  } else if (kind === 'link') {
    const url = str(fd, 'url')
    const title = str(fd, 'title') || url
    if (url) await addModuleItem(moduleId, { kind, title, refId: null, url })
  } else if (kind === 'file') {
    // Real file-picker upload; we record name + size only (no content stored).
    const file = fd.get('file')
    if (file instanceof File && file.size > 0) {
      await addModuleItem(moduleId, { kind, title: file.name, refId: null, url: null, fileSize: file.size })
    }
  }
  revalidatePath(`/courses/${courseId}/modules`, 'page')
}
