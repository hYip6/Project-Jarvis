"use client";

/**
 * Full-viewport collage that scrolls slowly left forever: two identical strips
 * side-by-side so when the first exits left, the second (copy) is seamless —
 * then the animation loops with no visible jump.
 */
const COLLAGE: { src: string; gridClass: string }[] = [
  { src: "/login-collage/jasmine.png", gridClass: "col-span-2" },
  { src: "/login-collage/east-side.png", gridClass: "col-span-2" },
  { src: "/login-collage/campus-dusk.png", gridClass: "col-span-2" },
  { src: "/login-collage/roth-cafe.png", gridClass: "col-span-3" },
  { src: "/login-collage/activities-center.png", gridClass: "col-span-3" },
];

function CollageStrip({ id }: { id: string }) {
  return (
    <div
      className="box-border grid h-full min-h-dvh w-screen min-w-[100vw] shrink-0 grid-cols-6 grid-rows-2 gap-[3px] bg-zinc-950 p-[3px]"
    >
      {COLLAGE.map((cell, i) => (
        <div
          key={`${id}-${i}`}
          className={`login-photo-cell min-h-0 min-w-0 overflow-hidden ${cell.gridClass}`}
          style={{ backgroundImage: `url(${cell.src})` }}
        />
      ))}
    </div>
  );
}

export function LoginSceneBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 min-h-dvh overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-black"
      aria-hidden
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />

      <div className="absolute inset-0 z-[1] min-h-dvh overflow-hidden">
        <div className="login-marquee-track">
          <CollageStrip id="a" />
          <CollageStrip id="b" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/35 via-transparent to-black/55" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-transparent to-black/40" />
    </div>
  );
}
