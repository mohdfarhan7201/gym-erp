import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { activityService } from "@/services/gymService";
import { DataTable } from "@/components/tables/DataTable";
import { PageHeader } from "@/components/common";
import { Avatar, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/overlays";
import { fmtDateTime, timeAgo } from "@/utils/format";

export default function ActivityLogs() {
  const { db, loading } = useGym();
  const confirm = useConfirm();
  const [entity, setEntity] = useState("all");
  const [actor, setActor] = useState("all");
  const entities = [...new Set(db.activity.map((a) => a.entity))];
  const actors = [...new Set(db.activity.map((a) => a.actor))];
  const rows = useMemo(() => db.activity.filter((a) => (entity === "all" || a.entity === entity) && (actor === "all" || a.actor === actor)), [db.activity, entity, actor]);

  return (
    <div>
      <PageHeader title="Activity Logs" description="An audit trail of every change made in the app." actions={
        <Button variant="outline" onClick={async () => { if (await confirm({ title: "Clear activity log?", description: "All entries will be removed. This can't be undone.", destructive: true, confirmText: "Clear log" })) activityService.clear().then(() => toast.success("Activity log cleared")); }}><Trash2 /> Clear log</Button>
      } />
      <DataTable
        rows={rows}
        loading={loading}
        rowKey={(a) => a.id}
        pageSize={25}
        initialSort={{ key: "at", dir: "desc" }}
        search={(a) => `${a.action} ${a.details} ${a.actor}`}
        toolbar={<>
          <div className="w-[calc(50%-4px)] sm:w-40"><Select aria-label="Entity" value={entity} onValueChange={setEntity} options={[{ value: "all", label: "All modules" }, ...entities.map((e) => ({ value: e, label: e }))]} /></div>
          <div className="w-[calc(50%-4px)] sm:w-44"><Select aria-label="User" value={actor} onValueChange={setActor} options={[{ value: "all", label: "All users" }, ...actors.map((e) => ({ value: e, label: e }))]} /></div>
        </>}
        columns={[
          { key: "action", header: "Action", primary: true, sortValue: (a) => a.action, cell: (a) => <div className="min-w-0"><div className="font-semibold">{a.action}</div><div className="truncate text-xs text-muted-foreground">{a.details}</div></div> },
          { key: "entity", header: "Module", sortValue: (a) => a.entity, cell: (a) => <Badge variant="outline">{a.entity}</Badge> },
          { key: "actor", header: "By", sortValue: (a) => a.actor, cell: (a) => <span className="flex items-center gap-2"><Avatar name={a.actor} className="h-7 w-7 text-[10px]" /><span className="truncate">{a.actor}</span><Badge variant={a.role === "admin" ? "lime" : a.role === "member" ? "outline" : "info"} className="hidden xl:inline-flex">{a.role}</Badge></span> },
          { key: "at", header: "When", sortValue: (a) => a.at, cell: (a) => <span title={fmtDateTime(a.at)}>{timeAgo(a.at)}</span> },
        ]}
        exportConfig={{ filename: "activity-log", title: "Activity log", columns: [
          { header: "Time", value: (a) => fmtDateTime(a.at) },
          { header: "User", value: (a) => a.actor },
          { header: "Role", value: (a) => a.role },
          { header: "Action", value: (a) => a.action },
          { header: "Module", value: (a) => a.entity },
          { header: "Details", value: (a) => a.details },
        ] }}
        empty={{ title: "No activity yet" }}
      />
    </div>
  );
}
