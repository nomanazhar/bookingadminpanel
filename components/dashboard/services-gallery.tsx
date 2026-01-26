'use client';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface Service {
	id: string;
	name: string;
	subtitle?: string;
	thumbnail: string;
	slug: string;
}


export function ServicesGallery({ categoryId }: { categoryId?: string | null } = {}) {
	const [services, setServices] = useState<Service[]>([]);
	useEffect(() => {
		fetch(`/api/services`)
			.then((res) => res.json())
			.then((data) => {
				const all = data || []
				if (categoryId) {
					setServices(all.filter((s: any) => String(s.category_id) === String(categoryId)))
				} else setServices(all)
			})
	}, [categoryId]);

	return (
		<section className="container py-8">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{services.map((service) => (
					<div
						key={service.id}
						className="relative rounded-lg overflow-hidden group min-h-[320px] flex items-end"
						style={{ minHeight: 320 }}
					>
						<Image
							src={service.thumbnail || "/services/placeholder.jpg"}
							alt={service.name}
							fill
							className="object-cover group-hover:scale-105 transition-transform duration-300"
							sizes="(max-width: 768px) 100vw, 50vw"
						/>
						<div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
						<div className="relative z-10 p-6 flex flex-col justify-end h-full w-full">
							<h2 className="text-2xl md:text-3xl font-semibold text-white mb-1 drop-shadow-lg capitalize">
								{service.name}
							</h2>
							{service.subtitle && (
								<div className="text-lg text-white mb-6 drop-shadow-lg capitalize">
									{service.subtitle}
								</div>
							)}
							<Link href={`/customer-services/${service.slug}`}>
								<Button className="bg-white text-black font-semibold rounded-full px-6 py-2 w-fit shadow-lg text-base cursor-pointer">
									Book now
								</Button>
							</Link>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
