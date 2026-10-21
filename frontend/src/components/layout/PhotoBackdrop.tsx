/**
 * A photo fixed behind the whole page: the content scrolls over it (pages put it in a relative z-10
 * wrapper, and the sections over it use the .cem-photo-section veil). A fixed layer rather than
 * background-attachment: fixed, which iOS ignores.
 */
export function PhotoBackdrop({ src }: { src: string | null | undefined }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-slate-950">
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
    </div>
  );
}
