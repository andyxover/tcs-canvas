import { SkelCourse, SkelProse, SkelRows } from '../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelCourse>
      <div className="lms-dash">
        <div className="lms-dash__main">
          <SkelProse lines={4} />
        </div>
        <aside className="lms-dash__side">
          <SkelRows n={4} />
        </aside>
      </div>
    </SkelCourse>
  )
}
