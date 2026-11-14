import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";

/** Branded startup loader. GSAP drives the ring + brand mark on desktop; mobile/reduced-motion get a light version. */
export function AppLoader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const counter = { v: 0 };
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: onDone });
      if (reduce) {
        tl.set(".ld-ring", { strokeDashoffset: 0 }).to({}, { duration: 0.4 });
        if (pct.current) pct.current.textContent = "100%";
        return;
      }
      tl.from(".ld-mark", { scale: 0.6, opacity: 0, duration: 0.5, ease: "back.out(1.8)" })
        .from(".ld-plate", { scaleY: 0, transformOrigin: "50% 50%", stagger: 0.06, duration: 0.3, ease: "power2.out" }, "-=0.25")
        .to(".ld-ring", { strokeDashoffset: 0, duration: mobile ? 0.9 : 1.2, ease: "power2.inOut" }, 0.15)
        .to(counter, { v: 100, duration: mobile ? 0.9 : 1.2, ease: "power2.inOut", onUpdate: () => pct.current && (pct.current.textContent = `${Math.round(counter.v)}%`) }, 0.15)
        .from(".ld-text", { y: 10, opacity: 0, duration: 0.4 }, 0.3);
      if (!mobile) tl.from(".ld-bg-line", { scaleX: 0, transformOrigin: "left", stagger: 0.08, duration: 0.8, ease: "power3.out" }, 0);
      tl.to(".ld-mark", { scale: 1.06, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.inOut" });
    }, root);
    return () => ctx.revert();
  }, [onDone]);

  const C = 2 * Math.PI * 54;
  return (
    <motion.div
      ref={root}
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#08090B]"
      exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
      role="status"
      aria-label="Loading"
    >
      <div className="bg-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {[18, 34, 66, 82].map((top, i) => (
          <div key={top} className="ld-bg-line absolute h-px w-full bg-gradient-to-r from-transparent via-[#C6F432]/25 to-transparent" style={{ top: `${top}%`, opacity: i % 2 ? 0.5 : 1 }} />
        ))}
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C6F432]/10 blur-3xl" />
      </div>
      <div className="relative flex flex-col items-center">
        <div className="relative grid h-40 w-40 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#1B1F26" strokeWidth="5" />
            <circle className="ld-ring" cx="60" cy="60" r="54" fill="none" stroke="#C6F432" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} />
          </svg>
          <svg viewBox="0 0 40 40" className="ld-mark h-16 w-16">
            <rect width="40" height="40" rx="11" fill="#C6F432" />
            <g fill="#0B0D10">
              <rect className="ld-plate" x="7" y="14" width="4" height="12" rx="1.2" />
              <rect className="ld-plate" x="11.5" y="11" width="4" height="18" rx="1.2" />
              <rect x="15.5" y="18.3" width="9" height="3.4" rx=".8" />
              <rect className="ld-plate" x="24.5" y="11" width="4" height="18" rx="1.2" />
              <rect className="ld-plate" x="29" y="14" width="4" height="12" rx="1.2" />
            </g>
          </svg>
        </div>
        <div className="ld-text mt-6 text-center">
          <div className="font-display text-3xl font-extrabold uppercase tracking-[0.12em] text-white">PulseFit</div>
          <p className="mt-2 text-sm text-white/60">Preparing Your Fitness Dashboard...</p>
          <span ref={pct} className="mt-3 inline-block font-display text-lg font-semibold tabular-nums text-[#C6F432]">0%</span>
        </div>
      </div>
    </motion.div>
  );
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-label="Loading page">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-pulse-ring rounded-full bg-lime/40" />
        <div className="absolute inset-2 animate-spin rounded-full border-[3px] border-lime border-t-transparent" />
      </div>
    </div>
  );
}
