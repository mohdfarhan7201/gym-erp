import { useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fileToDataUrl } from "@/hooks/useUtils";

export function PhotoUpload({ value, onChange, name }: { value?: string | null; onChange: (v: string | null) => void; name: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar name={name || "New Member"} src={value} className="h-20 w-20 text-lg" />
        <button type="button" onClick={() => ref.current?.click()} className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-2 border-card bg-lime text-lime-foreground shadow transition hover:scale-105" aria-label="Upload photo">
          <Camera className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>{value ? "Change photo" : "Upload photo"}</Button>
          {value && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}><Trash2 /> Remove</Button>}
        </div>
        <p className="text-xs text-muted-foreground">JPG or PNG. Resized automatically.</p>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            onChange(await fileToDataUrl(f));
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
    </div>
  );
}
