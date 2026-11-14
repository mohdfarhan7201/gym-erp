import type { Role, Session } from "@/types";
import { dbStore, delay } from "./storage/db";
import { localStore } from "./storage/localStore";

export const DEMO_ACCOUNTS: { role: Role; email: string; password: string; label: string; blurb: string }[] = [
  { role: "admin", email: "admin@gymdemo.com", password: "admin123", label: "Owner / Admin", blurb: "Full business control, reports & settings" },
  { role: "receptionist", email: "reception@gymdemo.com", password: "reception123", label: "Receptionist", blurb: "Front-desk check-ins, fees & renewals" },
  { role: "member", email: "member@gymdemo.com", password: "member123", label: "Member", blurb: "Personal membership, payments & attendance" },
];

/** Member passwords are demo-only and stored separately from the member record. */
const memberPasswords = () => localStore.get<Record<string, string>>("memberPasswords", {});

export const authService = {
  getSession(): Session | null {
    const s = localStore.get<Session | null>("session", null);
    if (!s) return null;
    // invalidate if the underlying user no longer exists / was deactivated
    const db = dbStore.snapshot();
    if (s.role === "member") return db.members.some((m) => m.id === s.userId) ? s : null;
    return db.staff.some((st) => st.id === s.userId && st.active) ? s : null;
  },

  async login(email: string, password: string): Promise<Session> {
    await delay(650);
    const e = email.trim().toLowerCase();
    const db = dbStore.snapshot();
    const staff = db.staff.find((s) => s.email.toLowerCase() === e);
    let session: Session | null = null;
    if (staff) {
      if (staff.password !== password) throw new Error("Incorrect password for this account.");
      if (!staff.active) throw new Error("This staff account has been deactivated by the owner.");
      session = { role: staff.role, userId: staff.id, name: staff.name, email: staff.email, loggedInAt: new Date().toISOString() };
    } else {
      const member = db.members.find((m) => m.email?.toLowerCase() === e);
      if (!member) throw new Error("No account found with that email.");
      const expected = memberPasswords()[member.id] ?? "member123";
      if (password !== expected) throw new Error("Incorrect password for this account.");
      session = { role: "member", userId: member.id, name: member.name, email: member.email!, loggedInAt: new Date().toISOString() };
    }
    localStore.set("session", session);
    return session;
  },

  logout() {
    localStore.remove("session");
  },

  async changePassword(session: Session, current: string, next: string) {
    await delay(500);
    if (session.role === "member") {
      const map = memberPasswords();
      if ((map[session.userId] ?? "member123") !== current) throw new Error("Current password is incorrect.");
      localStore.set("memberPasswords", { ...map, [session.userId]: next });
      return;
    }
    const st = dbStore.snapshot().staff.find((s) => s.id === session.userId);
    if (!st || st.password !== current) throw new Error("Current password is incorrect.");
    dbStore.commit((d) => {
      const s = d.staff.find((x) => x.id === session.userId);
      if (s) s.password = next;
    });
  },

  updateSessionName(name: string, email: string) {
    const s = localStore.get<Session | null>("session", null);
    if (s) localStore.set("session", { ...s, name, email });
  },
};
