import { SkelPage, SkelRows } from '../../../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelPage>
      <SkelRows n={6} lead />
    </SkelPage>
  )
}
