import { SkelPage, SkelTable } from '../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelPage>
      <SkelTable rows={7} cols={6} />
    </SkelPage>
  )
}
