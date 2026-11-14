import { useNavigate } from "react-router-dom";
import { CalendarCheck, CreditCard, Eye, MoreHorizontal, Pencil, Power, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { attendanceService, memberService } from "@/services/gymService";
import { toast } from "sonner";
import type { Member } from "@/types";

export function MemberActions({ member, present }: { member: Member; present?: boolean }) {
  const nav = useNavigate();
  const { to } = usePanel();
  const { can } = useAuth();
  const confirm = useConfirm();

  const toggleActive = async () => {
    const ok = await confirm({
      title: member.isActive ? `Deactivate ${member.name}?` : `Reactivate ${member.name}?`,
      description: member.isActive ? "They won't be able to check in until reactivated. Membership and payment history are kept." : "The member will be able to check in again.",
      confirmText: member.isActive ? "Deactivate" : "Reactivate",
      destructive: member.isActive,
    });
    if (!ok) return;
    try {
      await memberService.setActive(member.id, !member.isActive);
      toast.success(member.isActive ? "Member deactivated" : "Member reactivated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const remove = async () => {
    const ok = await confirm({ title: `Delete ${member.name}?`, description: "This permanently removes the member with all memberships, payments, charges and attendance. This can't be undone.", confirmText: "Delete member", destructive: true });
    if (!ok) return;
    try {
      await memberService.remove(member.id);
      toast.success("Member deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const checkIn = async () => {
    try {
      await attendanceService.mark(member.id);
      toast.success(`${member.name} checked in`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${member.name}`}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => nav(to(`members/${member.id}`))}><Eye /> View profile</DropdownMenuItem>
        {can("editMembers") && <DropdownMenuItem onSelect={() => nav(to(`members/${member.id}/edit`))}><Pencil /> Edit details</DropdownMenuItem>}
        {can("markAttendance") && <DropdownMenuItem disabled={present} onSelect={checkIn}><CalendarCheck /> {present ? "Already checked in" : "Mark present"}</DropdownMenuItem>}
        {can("collectPayments") && <DropdownMenuItem onSelect={() => nav(to(`payments/collect?member=${member.id}`))}><CreditCard /> Collect payment</DropdownMenuItem>}
        {can("renewMemberships") && <DropdownMenuItem onSelect={() => nav(to(`membership/renew?member=${member.id}`))}><RefreshCw /> Renew membership</DropdownMenuItem>}
        {(can("editMembers") || can("deleteMembers")) && <DropdownMenuSeparator />}
        {can("editMembers") && <DropdownMenuItem onSelect={toggleActive}><Power /> {member.isActive ? "Deactivate" : "Reactivate"}</DropdownMenuItem>}
        {can("deleteMembers") && <DropdownMenuItem destructive onSelect={remove}><Trash2 /> Delete member</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
