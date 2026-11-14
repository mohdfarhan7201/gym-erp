import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common";
import { StaffForm } from "@/components/forms/StaffForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/primitives";

export default function AddStaff() {
  const nav = useNavigate();
  return (
    <div>
      <PageHeader title="Add Receptionist" description="Create a front-desk login. You can fine-tune what they can do under Permissions." crumbs={[{ label: "Staff", to: "/admin/staff" }, { label: "Add receptionist" }]} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card><CardContent className="pt-5"><StaffForm onDone={() => nav("/admin/staff")} onCancel={() => nav(-1)} /></CardContent></Card>
        <Card className="h-fit">
          <CardHeader><div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-lime-ink" /> Default access</CardTitle><CardDescription>New receptionists can register members, collect fees, mark attendance, renew plans and add charges. Deleting members and giving discounts are off by default.</CardDescription></div></CardHeader>
        </Card>
      </div>
    </div>
  );
}
