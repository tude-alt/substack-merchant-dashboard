import { getTransactions } from "@/app/actions/transactions"
import { PageHeader } from "@/components/page-header"
import { TransactionsView } from "@/components/transactions/transactions-view"

export default async function TransactionsPage() {
  const initial = await getTransactions({ page: 1 })

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Every charge processed through your Nomba integration."
      />
      <TransactionsView initial={initial} />
    </div>
  )
}
