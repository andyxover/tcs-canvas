import { SkelPage, SkelProse, SkelRows } from '../../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelPage>
      <SkelProse lines={4} />
      <div style={{ marginTop: 18 }}>
        <SkelRows n={4} lead />
      </div>
    </SkelPage>
  )
}
