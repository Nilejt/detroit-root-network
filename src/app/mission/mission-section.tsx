import type { ReactNode } from "react";

// Public content only. Editorial controls live in the Director Q workspace.
export default function MissionSection({ id, children, className, initial }: {
  id: string; children: ReactNode; className?: string;
  initial?: { title: string | null; body: string | null; revision: number } | null;
}) {
  return <section className={className} id={id}>
    {initial?.title && initial.body ? <>
      {id === "hero" ? <h1>{initial.title}</h1> : <h2>{initial.title}</h2>}
      {initial.body.split(/\n\s*\n/).map((text, i) => <p key={i} style={{ whiteSpace: "pre-wrap" }}>{text}</p>)}
    </> : children}
  </section>;
}
