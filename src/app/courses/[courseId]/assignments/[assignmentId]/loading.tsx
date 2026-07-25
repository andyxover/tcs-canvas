import { SkelPage, SkelProse, SkelRows } from '../../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelPage>
      <div className="lms-dash">
        <div className="lms-dash__main">
          <SkelProse lines={6} />
        </div>
        <aside className="lms-dash__side">
          <SkelRows n={3} />
        </aside>
      </div>
    </SkelPage>
  )
}
