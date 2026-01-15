export function HeroSection() {
  return (
    <section className="relative py-6 md:py-6 lg:py-6 bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="container px-4">
        <div className="max-w-3xl mx-auto text-center space-y-2 md:space-y-5">
          <h1 className="text-xl sm:text-xl md:text-2xl lg:text-3xl font-bold font-heading text-foreground leading-tight px-2">
            Treatments at{" "}
            <span className="text-primary block sm:inline">Derma Solution</span>
          </h1>
        </div>
      </div>
    </section>
  )
}
