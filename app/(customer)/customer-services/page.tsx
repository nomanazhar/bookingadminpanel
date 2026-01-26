// This file forces static rendering for /services
export const dynamic = "force-static";

export default function ServicesPage() {
	return (
		<main className="container mx-auto py-8">
			<h1 className="text-3xl font-bold">Services</h1>
			<p className="text-muted-foreground">This page is statically rendered.</p>
		</main>
	);
}
