import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PanelLayout } from "@/components/layout/PanelLayout";
import { PageLoader } from "@/components/loaders/AppLoader";
import { adminPanel } from "@/panels/admin/nav";
import { receptionPanel } from "@/panels/receptionist/nav";
import { memberPanel } from "@/panels/member/nav";
import { panelBase, useAuth } from "@/contexts/AuthContext";
import type { PermissionKey } from "@/types";
import { NotFound, RequirePermission, RequireRole } from "./guards";

const S = (el: ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
const P = (perm: PermissionKey, el: ReactNode) => <RequirePermission perm={perm}>{el}</RequirePermission>;

/* lazily loaded pages (code-split per page) */
const Login = lazy(() => import("@/pages/auth/LoginPage"));
const pg = {
  adminDash: () => import("@/pages/admin/AdminDashboard"),
  recDash: () => import("@/pages/receptionist/ReceptionDashboard"),
  members: () => import("@/pages/shared/members/MembersList"),
  membersActive: () => import("@/pages/shared/members/MembersList").then((m) => ({ default: m.ActiveMembers })),
  membersInactive: () => import("@/pages/shared/members/MembersList").then((m) => ({ default: m.InactiveMembers })),
  membersExpired: () => import("@/pages/shared/members/MembersList").then((m) => ({ default: m.ExpiredMembers })),
  memberNew: () => import("@/pages/shared/members/MemberFormPage"),
  memberEdit: () => import("@/pages/shared/members/MemberFormPage").then((m) => ({ default: m.EditMemberPage })),
  memberProfile: () => import("@/pages/shared/members/MemberProfile"),
  memberSearch: () => import("@/pages/receptionist/MemberSearch"),
  plans: () => import("@/pages/admin/PlansPage"),
  msActive: () => import("@/pages/shared/membership/MembershipsList"),
  msExpired: () => import("@/pages/shared/membership/MembershipsList").then((m) => ({ default: m.ExpiredMemberships })),
  msRenew: () => import("@/pages/shared/membership/RenewPage"),
  msDetail: () => import("@/pages/shared/membership/MembershipDetails"),
  collect: () => import("@/pages/shared/payments/CollectPayment"),
  payHistory: () => import("@/pages/shared/payments/PaymentHistory"),
  receipts: () => import("@/pages/shared/payments/PaymentHistory").then((m) => ({ default: m.ReceiptsPage })),
  pending: () => import("@/pages/shared/payments/PendingPayments"),
  attendance: () => import("@/pages/shared/attendance/MarkAttendance"),
  attToday: () => import("@/pages/shared/attendance/TodayAttendance"),
  attHistory: () => import("@/pages/shared/attendance/AttendanceHistory"),
  attReports: () => import("@/pages/admin/reports/AttendanceReport"),
  chargeNew: () => import("@/pages/shared/charges/AddCharge"),
  charges: () => import("@/pages/shared/charges/ChargesList"),
  chargesPending: () => import("@/pages/shared/charges/ChargesList").then((m) => ({ default: m.PendingCharges })),
  chargesPaid: () => import("@/pages/shared/charges/ChargesList").then((m) => ({ default: m.PaidCharges })),
  expDash: () => import("@/pages/admin/expenses/ExpenseDashboard"),
  expNew: () => import("@/pages/admin/expenses/AddExpense"),
  expHistory: () => import("@/pages/admin/expenses/ExpenseHistory"),
  expCats: () => import("@/pages/admin/expenses/ExpenseCategories"),
  repCollection: () => import("@/pages/admin/reports/CollectionReport"),
  repMembers: () => import("@/pages/admin/reports/MemberReport"),
  repExpenses: () => import("@/pages/admin/reports/ExpenseReport"),
  repPL: () => import("@/pages/admin/reports/ProfitLoss"),
  staff: () => import("@/pages/admin/staff/StaffList"),
  staffNew: () => import("@/pages/admin/staff/AddStaff"),
  perms: () => import("@/pages/admin/staff/Permissions"),
  notifications: () => import("@/pages/shared/NotificationsPage"),
  activity: () => import("@/pages/admin/ActivityLogs"),
  backup: () => import("@/pages/admin/BackupRestore"),
  settings: () => import("@/pages/admin/GymSettings"),
  staffProfile: () => import("@/pages/shared/StaffProfile"),
  mDash: () => import("@/pages/member/MemberDashboard"),
  mProfile: () => import("@/pages/member/MyProfile"),
  mMembership: () => import("@/pages/member/MyMembership"),
  mPayments: () => import("@/pages/member/MyPayments"),
  mReceipts: () => import("@/pages/member/MyPayments").then((m) => ({ default: m.MyReceipts })),
  mAttendance: () => import("@/pages/member/MyAttendance"),
  mCharges: () => import("@/pages/member/MyCharges"),
  mSupport: () => import("@/pages/member/HelpSupport"),
};
// create lazy components once
const C = Object.fromEntries(Object.entries(pg).map(([k, f]) => [k, lazy(f)])) as unknown as Record<keyof typeof pg, React.LazyExoticComponent<React.ComponentType>>;

function Home() {
  const { session } = useAuth();
  return <Navigate to={session ? panelBase[session.role] : "/login"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={S(<Login />)} />

      {/* ---------------- ADMIN ---------------- */}
      <Route path="/admin" element={<RequireRole role="admin"><PanelLayout panel={adminPanel} /></RequireRole>}>
        <Route index element={S(<C.adminDash />)} />
        <Route path="members" element={S(<C.members />)} />
        <Route path="members/new" element={S(<C.memberNew />)} />
        <Route path="members/active" element={S(<C.membersActive />)} />
        <Route path="members/inactive" element={S(<C.membersInactive />)} />
        <Route path="members/expired" element={S(<C.membersExpired />)} />
        <Route path="members/:id" element={S(<C.memberProfile />)} />
        <Route path="members/:id/edit" element={S(<C.memberEdit />)} />
        <Route path="membership/plans" element={S(<C.plans />)} />
        <Route path="membership/active" element={S(<C.msActive />)} />
        <Route path="membership/expired" element={S(<C.msExpired />)} />
        <Route path="membership/renew" element={S(<C.msRenew />)} />
        <Route path="membership/:id" element={S(<C.msDetail />)} />
        <Route path="payments/collect" element={S(<C.collect />)} />
        <Route path="payments/history" element={S(<C.payHistory />)} />
        <Route path="payments/pending" element={S(<C.pending />)} />
        <Route path="payments/receipts" element={S(<C.receipts />)} />
        <Route path="attendance" element={S(<C.attendance />)} />
        <Route path="attendance/history" element={S(<C.attHistory />)} />
        <Route path="attendance/reports" element={S(<C.attReports />)} />
        <Route path="charges" element={S(<C.charges />)} />
        <Route path="charges/new" element={S(<C.chargeNew />)} />
        <Route path="charges/pending" element={S(<C.chargesPending />)} />
        <Route path="charges/paid" element={S(<C.chargesPaid />)} />
        <Route path="expenses" element={S(<C.expDash />)} />
        <Route path="expenses/new" element={S(<C.expNew />)} />
        <Route path="expenses/history" element={S(<C.expHistory />)} />
        <Route path="expenses/categories" element={S(<C.expCats />)} />
        <Route path="reports" element={<Navigate to="collection" replace />} />
        <Route path="reports/collection" element={S(<C.repCollection />)} />
        <Route path="reports/attendance" element={S(<C.attReports />)} />
        <Route path="reports/members" element={S(<C.repMembers />)} />
        <Route path="reports/expenses" element={S(<C.repExpenses />)} />
        <Route path="reports/profit-loss" element={S(<C.repPL />)} />
        <Route path="staff" element={S(<C.staff />)} />
        <Route path="staff/new" element={S(<C.staffNew />)} />
        <Route path="staff/permissions" element={S(<C.perms />)} />
        <Route path="notifications" element={S(<C.notifications />)} />
        <Route path="activity" element={S(<C.activity />)} />
        <Route path="backup" element={S(<C.backup />)} />
        <Route path="settings" element={S(<C.settings />)} />
        <Route path="profile" element={S(<C.staffProfile />)} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ---------------- RECEPTION ---------------- */}
      <Route path="/reception" element={<RequireRole role="receptionist"><PanelLayout panel={receptionPanel} /></RequireRole>}>
        <Route index element={S(<C.recDash />)} />
        <Route path="members" element={S(<C.members />)} />
        <Route path="members/new" element={S(P("registerMembers", <C.memberNew />))} />
        <Route path="members/search" element={S(<C.memberSearch />)} />
        <Route path="members/:id" element={S(<C.memberProfile />)} />
        <Route path="members/:id/edit" element={S(P("editMembers", <C.memberEdit />))} />
        <Route path="membership/active" element={S(<C.msActive />)} />
        <Route path="membership/expired" element={S(<C.msExpired />)} />
        <Route path="membership/renew" element={S(P("renewMemberships", <C.msRenew />))} />
        <Route path="membership/:id" element={S(<C.msDetail />)} />
        <Route path="payments/collect" element={S(P("collectPayments", <C.collect />))} />
        <Route path="payments/history" element={S(P("viewPaymentHistory", <C.payHistory />))} />
        <Route path="payments/pending" element={S(<C.pending />)} />
        <Route path="payments/receipts" element={S(P("viewPaymentHistory", <C.receipts />))} />
        <Route path="attendance" element={S(P("markAttendance", <C.attendance />))} />
        <Route path="attendance/today" element={S(<C.attToday />)} />
        <Route path="attendance/history" element={S(<C.attHistory />)} />
        <Route path="charges" element={S(<C.charges />)} />
        <Route path="charges/new" element={S(P("addExtraCharges", <C.chargeNew />))} />
        <Route path="charges/pending" element={S(<C.chargesPending />)} />
        <Route path="notifications" element={S(<C.notifications />)} />
        <Route path="profile" element={S(<C.staffProfile />)} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ---------------- MEMBER ---------------- */}
      <Route path="/member" element={<RequireRole role="member"><PanelLayout panel={memberPanel} /></RequireRole>}>
        <Route index element={S(<C.mDash />)} />
        <Route path="profile" element={S(<C.mProfile />)} />
        <Route path="membership" element={S(<C.mMembership />)} />
        <Route path="payments" element={S(<C.mPayments />)} />
        <Route path="receipts" element={S(<C.mReceipts />)} />
        <Route path="attendance" element={S(<C.mAttendance />)} />
        <Route path="charges" element={S(<C.mCharges />)} />
        <Route path="notifications" element={S(<C.notifications />)} />
        <Route path="support" element={S(<C.mSupport />)} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
