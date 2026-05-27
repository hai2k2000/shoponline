import { prisma } from "@/lib/prisma";
import { getReportsData } from "@/server/services/reporting-service";
import { ReportsClient } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await getReportsData(prisma);

  return (
    <ReportsClient
      summary={reports.summary}
      salesRows={reports.salesRows}
      inventoryRows={reports.inventoryRows}
      debtRows={reports.debtRows}
      productSalesRows={reports.productSalesRows}
    />
  );
}
