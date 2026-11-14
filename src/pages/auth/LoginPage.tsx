import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, Crown, Dumbbell, Eye, EyeOff, IdCard, LineChart, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { Field, Logo } from "@/components/common";
import { panelBase, useAuth } from "@/contexts/AuthContext";
import { DEMO_ACCOUNTS } from "@/services/authService";
import { cn } from "@/utils/cn";
import { ease, fadeUp, stagger } from "@/animations/motion";
import type { Role } from "@/types";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type Form = z.infer<typeof schema>;

const roleIcon: Record<Role, typeof Crown> = { admin: Crown, receptionist: ShieldCheck, member: User };

export default function LoginPage() {
  const { session, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<Role | null>(null);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  if (session) return <Navigate to={panelBase[session.role]} replace />;

  const onSubmit = async (v: Form) => {
    try {
      const s = await login(v.email, v.password);
      toast.success(`Welcome back, ${s.name.split(" ")[0]}!`);
      const from = loc.state?.from;
      nav(from && from.startsWith(panelBase[s.role]) ? from : panelBase[s.role], { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pick = (r: Role) => {
    const a = DEMO_ACCOUNTS.find((x) => x.role === r)!;
    setSelected(r);
    setValue("email", a.email, { shouldValidate: true });
    setValue("password", a.password, { shouldValidate: true });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-[#08090B] p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_30%_40%,black,transparent_75%)]" aria-hidden />
        <div className="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-[#C6F432]/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-[#1E3A8A]/30 blur-3xl" aria-hidden />
        <div className="relative"><Logo light /></div>
        <motion.div variants={stagger} initial="initial" animate="enter" className="relative mt-auto max-w-xl">
          <motion.div variants={fadeUp} className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-[#C6F432]" /> Gym management, reimagined
          </motion.div>
          <motion.h1 variants={fadeUp} className="font-display text-6xl font-extrabold uppercase leading-[0.92] tracking-wide xl:text-7xl">
            Run your gym <br /> like a <span className="text-[#C6F432]">champion.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
            Memberships, check-ins, collections, expenses and profit — one premium console for owners, front desk and members.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              [IdCard, "Memberships"],
              [CalendarCheck, "Attendance"],
              [Dumbbell, "Extra charges"],
              [LineChart, "Profit & loss"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof IdCard;
              return (
                <div key={label as string} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 backdrop-blur">
                  <I className="h-5 w-5 text-[#C6F432]" />
                  <div className="mt-2 text-[13px] font-semibold text-white/85">{label as string}</div>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
        <p className="relative mt-10 text-xs text-white/40">Frontend demo · data is stored in this browser only.</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="w-full max-w-[440px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-4xl font-bold uppercase tracking-wide">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Choose a demo account or enter your credentials.</p>

          <div className="mt-6 grid gap-2.5">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = roleIcon[a.role];
              const active = selected === a.role;
              return (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => pick(a.role)}
                  aria-pressed={active}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3.5 rounded-xl border bg-card p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
                    active && "border-transparent shadow-glow",
                  )}
                >
                  <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors", active ? "bg-lime text-lime-foreground" : "bg-muted text-foreground group-hover:bg-lime/30")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{a.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{a.blurb}</span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground/80">{a.email} · {a.password}</span>
                  </span>
                  <ArrowRight className={cn("h-4 w-4 shrink-0 transition-all", active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60")} />
                </button>
              );
            })}
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or sign in manually<div className="h-px flex-1 bg-border" /></div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Email" error={errors.email?.message} htmlFor="email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="username" placeholder="you@gymdemo.com" className="h-11 pl-9" aria-invalid={!!errors.email} {...register("email")} />
              </div>
            </Field>
            <Field label="Password" error={errors.password?.message} htmlFor="password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" className="h-11 pl-9 pr-11" aria-invalid={!!errors.password} {...register("password")} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" variant="lime" size="lg" className="w-full" loading={isSubmitting}>
              {isSubmitting ? "Signing in…" : <>Sign in <ArrowRight /></>}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">Demo credentials only — no real authentication or server is involved.</p>
        </motion.div>
      </div>
    </div>
  );
}
