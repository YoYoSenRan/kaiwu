import { InkWash } from "@/components/ui/InkWash"

export default function HomePage(): React.ReactElement {
  return (
    <>
      <InkWash variant="hero" className="min-h-[60vh] flex items-center justify-center -mx-6 lg:-mx-8 -mt-px">
        <div className="text-center">
          <h1 className="font-display text-5xl md:text-6xl font-700 tracking-[0.15em] text-foreground">開 物 局</h1>
          <p className="mt-4 text-base md:text-lg text-muted-fg">天工开物，每帖必应。</p>
        </div>
      </InkWash>

      <div className="py-20 text-center text-muted-fg">
        <p>造物流尚未开始。静候更鼓响起。</p>
      </div>
    </>
  )
}
