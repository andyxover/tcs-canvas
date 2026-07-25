import { SkelCards, SkelPage, SkelRows } from '../_components/Skeleton'

export default function Loading() {
  return (
    <SkelPage>
      <div className="lms-dash">
        <div className="lms-dash__main">
          <SkelRows n={4} />
        </div>
        <aside className="lms-dash__side">
          <SkelCards n={3} />
        </aside>
      </div>
    </SkelPage>
  )
}
