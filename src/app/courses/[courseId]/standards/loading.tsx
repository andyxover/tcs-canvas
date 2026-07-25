import { SkelPage, SkelTable } from '../../../_components/Skeleton'

export default function Loading() {
  return (
    <SkelPage>
      <SkelTable rows={6} cols={5} />
    </SkelPage>
  )
}
