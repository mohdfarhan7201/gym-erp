import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck, CreditCard, Droplet, Mail, MapPin, Pencil, Phone, Receipt, RefreshCw, Trash2, Wrench, Briefcase, Cake, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useGym } from "@/hooks/useGym";
import { usePanel, useAuth } from "@/contexts/AuthContext";
import { useReceipt } from "@/components/modals/ReceiptProvider";
import { useConfirm } from "@/components/modals/ConfirmProvider";
import { attendanceService, chargeService } from "@/services/gymService";
import { msDue, msNet, msStatus, sum, totalDue } from "@/services/selectors";
import { EmptyState, InfoRow, PageHeader, PayBadge, StatusBadge } from "@/components/common";
import { AttendanceCalendar } from "@/components/common/AttendanceCalendar";
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, Progress } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { DataTable } from "@/components/tables/DataTable";
import { MemberActions } from "@/components/tables/MemberActions";
import { daysBetween, daysLeft } from "@/utils/date";
import { fmtDate, fmtDateTime, fmtTime, methodLabel, money, titleCase } from "@/utils/format";
import { fadeUp, stagger } from "@/animations/motion";

export default function MemberProfile() {
  const { id } = useParams();
  const { db, ix, loading } = useGym();
  const { to } = usePanel();
  const { can } = useAuth();
  const nav = useNavigate();
  const receipt = useReceipt();
  const confirm = useConfirm();
  const m = id ? ix.memberById.get(id) : undefined;

  const data = useMemo(() => {
    if (!m) return null;
    const memberships = ix.msByMember.get(m.id) ?? [];
    const payments = db.payments.filter((p) => p.memberId === m.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const charges = db.charges.filter((c) => c.memberId === m.id).sort((a, b) => b.date.localeCompare(a.date));
    const attendance = db.attendance.filter((a) => a.memberId === m.id).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    return { memberships, payments, charges, attendance, present: new Set(attendance.map((a) => a.date)), times: new Map(attendance.map((a) => [a.date, fmtTime(a.checkIn)])) };
  }, [m, ix, db]);

  if (!m || !data) return <EmptyState title="Member not found" description="This member may have been deleted." action={<Button asChild variant="outline"><Link to={to("members")}>Back to members</Link></Button>} />;

  const status = ix.status.get(m.id)!;
  const cur = ix.latestMs.get(m.id);
  const due = totalDue(m.id, ix);
  const left = cur ? daysLeft(cur.endDate) : 0;
  const progress = cur ? Math.min(100, Math.max(0, (daysBetween(cur.startDate, cur.endDate) - left) / Math.max(1, daysBetween(cur.startDate, cur.endDate)) * 100)) : 0;
  const present = ix.presentToday.has(m.id);

  const checkIn = async () => {
    try {
      await attendanceService.mark(m.id);
      toast.success(`${m.name} checked in`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Member Profile" crumbs={[{ label: "Members", to: to("members") }, { label: m.name }]} />
      <motion.div variants={stagger} initial="initial" animate="enter" className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* identity card */}
        <motion.div variants={fadeUp} className="space-y-4">
          <Card className="overflow-hidden">
            <div className="relative h-24 bg-[#0E1116]">
              <div className="bg-grid absolute inset-0 opacity-60" />
              <div className="absolute -right-6 -top-10 h-32 w-32 rounded-full bg-lime/30 blur-2xl" />
            </div>
            <CardContent className="-mt-12 text-center">
              <Avatar name={m.name} src={m.photo} ring className="mx-auto h-24 w-24 text-2xl" />
              <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-wide">{m.name}</h2>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{m.code}</span>
                <StatusBadge status={status} />
                {present && <Badge variant="lime">In gym today</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x rounded-xl border bg-muted/30 py-3">
                <div><div className="font-display text-xl font-bold">{ix.attendanceCount.get(m.id) ?? 0}</div><div className="text-[11px] text-muted-foreground">Visits</div></div>
                <div><div className="font-display text-xl font-bold">{data.memberships.length}</div><div className="text-[11px] text-muted-foreground">Plans</div></div>
                <div><div className={`font-display text-xl font-bold ${due ? "text-danger" : ""}`}>{money(due)}</div><div className="text-[11px] text-muted-foreground">Dues</div></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {can("markAttendance") && <Button variant="lime" onClick={checkIn} disabled={present || status !== "active"}><CalendarCheck /> {present ? "Checked in" : "Check in"}</Button>}
                {can("collectPayments") && <Button variant="outline" onClick={() => nav(to(`payments/collect?member=${m.id}`))}><CreditCard /> Collect</Button>}
                {can("renewMemberships") && <Button variant="outline" onClick={() => nav(to(`membership/renew?member=${m.id}`))}><RefreshCw /> Renew</Button>}
                {can("addExtraCharges") && <Button variant="outline" onClick={() => nav(to(`charges/new?member=${m.id}`))}><Wrench /> Charge</Button>}
                {can("editMembers") && <Button variant="outline" onClick={() => nav(to(`members/${m.id}/edit`))}><Pencil /> Edit</Button>}
                <div className="flex justify-center"><MemberActions member={m} present={present} /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                [Phone, m.phone], [Mail, m.email], [MapPin, m.address], [Cake, m.dob && fmtDate(m.dob)], [Droplet, m.bloodGroup], [ShieldAlert, m.emergencyContact && `Emergency: ${m.emergencyContact}`], [Briefcase, m.occupation],
              ].filter(([, v]) => v).map(([Icon, v], i) => {
                const I = Icon as typeof Phone;
                return <div key={i} className="flex items-start gap-3"><I className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="min-w-0 break-words">{v as string}</span></div>;
              })}
              {m.notes && <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{m.notes}</p>}
              <p className="text-xs text-muted-foreground">Member since {fmtDate(m.joinDate)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* tabs */}
        <motion.div variants={fadeUp} className="min-w-0">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start sm:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="memberships">Memberships</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="charges">Extra charges</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="overflow-hidden">
                <CardHeader>
                  <div><CardTitle>Current membership</CardTitle></div>
                  {cur && <StatusBadge status={msStatus(cur)} />}
                </CardHeader>
                <CardContent>
                  {cur ? (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <div className="font-display text-3xl font-bold uppercase">{cur.planName}</div>
                          <div className="text-sm text-muted-foreground">{fmtDate(cur.startDate)} → {fmtDate(cur.endDate)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-3xl font-bold">{left < 0 ? 0 : left}</div>
                          <div className="text-xs text-muted-foreground">days remaining</div>
                        </div>
                      </div>
                      <Progress value={progress} className="mt-4 h-2.5" barClassName={left < 0 ? "bg-danger" : left <= 7 ? "bg-warning" : undefined} />
                      <div className="mt-4 grid gap-x-8 sm:grid-cols-2">
                        <InfoRow label="Plan price" value={money(cur.price)} />
                        <InfoRow label="Discount" value={money(cur.discount)} />
                        <InfoRow label="Paid" value={money(ix.paidByMs.get(cur.id) ?? 0)} />
                        <InfoRow label="Balance" value={<span className={msDue(cur, ix) ? "text-danger" : "text-success"}>{money(msDue(cur, ix))}</span>} />
                      </div>
                    </>
                  ) : <EmptyState title="No membership yet" className="py-6" />}
                </CardContent>
              </Card>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Total paid", money(sum(data.payments, (p) => p.amount))],
                  ["Last visit", ix.lastVisit.get(m.id) ? fmtDateTime(ix.lastVisit.get(m.id)) : "Never"],
                  ["Pending charges", money(ix.chargeDue.get(m.id) ?? 0)],
                ].map(([k, v]) => (
                  <Card key={k} className="p-4"><div className="text-xs text-muted-foreground">{k}</div><div className="mt-1 font-semibold">{v}</div></Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="memberships">
              <DataTable
                loading={loading}
                rows={data.memberships}
                rowKey={(x) => x.id}
                onRowClick={(x) => nav(to(`membership/${x.id}`))}
                columns={[
                  { key: "plan", header: "Plan", primary: true, cell: (x) => <div><div className="font-semibold">{x.planName}</div><div className="text-xs text-muted-foreground">{x.durationMonths} month(s)</div></div> },
                  { key: "period", header: "Period", cell: (x) => `${fmtDate(x.startDate)} – ${fmtDate(x.endDate)}` },
                  { key: "amount", header: "Amount", align: "right", cell: (x) => money(msNet(x)) },
                  { key: "pay", header: "Payment", cell: (x) => <PayBadge status={msDue(x, ix) === 0 ? "paid" : (ix.paidByMs.get(x.id) ?? 0) > 0 ? "partial" : "pending"} /> },
                  { key: "status", header: "Status", cell: (x) => <StatusBadge status={msStatus(x)} /> },
                ]}
                empty={{ title: "No memberships" }}
              />
            </TabsContent>

            <TabsContent value="payments">
              <DataTable
                loading={loading}
                rows={data.payments}
                rowKey={(x) => x.id}
                onRowClick={(x) => receipt.open(x.id)}
                columns={[
                  { key: "r", header: "Receipt", primary: true, cell: (x) => <div><div className="font-semibold">{x.receiptNo}</div><div className="text-xs text-muted-foreground">{x.description}</div></div> },
                  { key: "d", header: "Date", cell: (x) => fmtDate(x.date) },
                  { key: "m", header: "Method", cell: (x) => methodLabel[x.method] },
                  { key: "a", header: "Amount", align: "right", cell: (x) => <span className="font-semibold">{money(x.amount)}</span> },
                ]}
                actions={(x) => <Button variant="ghost" size="icon-sm" onClick={() => receipt.open(x.id)} aria-label="View receipt"><Receipt /></Button>}
                empty={{ title: "No payments yet" }}
              />
            </TabsContent>

            <TabsContent value="attendance" className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card className="p-4 sm:p-5">
                <AttendanceCalendar present={data.present} times={data.times} covered={(d) => data.memberships.some((x) => x.startDate <= d && x.endDate >= d)} />
              </Card>
              <Card>
                <CardHeader><CardTitle>Recent check-ins</CardTitle></CardHeader>
                <CardContent>
                  {data.attendance.length === 0 ? <EmptyState title="No visits yet" className="py-6" /> : (
                    <ul className="scrollbar-thin max-h-[360px] divide-y overflow-y-auto">
                      {data.attendance.slice(0, 40).map((a) => (
                        <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                          <span>{fmtDate(a.date)}</span>
                          <span className="tabular text-muted-foreground">{fmtTime(a.checkIn)} · {a.markedBy}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charges">
              <DataTable
                loading={loading}
                rows={data.charges}
                rowKey={(x) => x.id}
                columns={[
                  { key: "t", header: "Charge", primary: true, cell: (x) => <div><div className="font-semibold">{x.type}</div><div className="text-xs text-muted-foreground">{x.description}</div></div> },
                  { key: "d", header: "Date", cell: (x) => fmtDate(x.date) },
                  { key: "a", header: "Amount", align: "right", cell: (x) => money(x.amount) },
                  { key: "s", header: "Status", cell: (x) => <PayBadge status={x.status === "paid" ? "paid" : "pending"} /> },
                ]}
                actions={(x) =>
                  x.status === "paid" ? (
                    <Button variant="ghost" size="icon-sm" onClick={() => x.paymentId && receipt.open(x.paymentId)} aria-label="Receipt"><Receipt /></Button>
                  ) : (
                    <>
                      {can("collectPayments") && <Button size="sm" variant="outline" onClick={() => nav(to(`charges/pending?charge=${x.id}`))}>Collect</Button>}
                      {can("addExtraCharges") && (
                        <Button variant="ghost" size="icon-sm" aria-label="Delete charge" onClick={async () => {
                          if (await confirm({ title: "Delete this charge?", description: `${x.type} · ${money(x.amount)}`, destructive: true, confirmText: "Delete" })) {
                            await chargeService.remove(x.id).then(() => toast.success("Charge deleted")).catch((e) => toast.error(e.message));
                          }
                        }}><Trash2 /></Button>
                      )}
                    </>
                  )
                }
                empty={{ title: "No extra charges", description: `${titleCase(m.name.split(" ")[0])} has a clean record.` }}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </div>
  );
}
