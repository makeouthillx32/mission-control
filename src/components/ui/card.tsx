import { Card } from "@/components/ui/card";

type ChartDataItem = {
  total_messages?: number;
  total_conversations?: number;
  total_participants?: number;
  average_messages_per_conversation?: number;
  [key: string]: string | number | undefined;
};

interface GeneralMessageDataCardProps {
  chartData?: ChartDataItem[];
}

export default function GeneralMessageDataCard({
  chartData,
}: GeneralMessageDataCardProps) {
  const data = chartData?.[0] || {};

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold">General Message Data</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Total Messages</p>
          <p className="text-2xl font-bold">{data.total_messages ?? 0}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Conversations</p>
          <p className="text-2xl font-bold">{data.total_conversations ?? 0}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Participants</p>
          <p className="text-2xl font-bold">{data.total_participants ?? 0}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Avg / Conversation</p>
          <p className="text-2xl font-bold">
            {data.average_messages_per_conversation ?? 0}
          </p>
        </div>
      </div>
    </Card>
  );
}