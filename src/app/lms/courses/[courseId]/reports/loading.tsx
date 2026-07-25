import { SkelCourse, SkelProse, SkelRows } from '../../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelCourse>
      <SkelRows n={2} lead />
      <SkelProse lines={4} />
    </SkelCourse>
  )
}
