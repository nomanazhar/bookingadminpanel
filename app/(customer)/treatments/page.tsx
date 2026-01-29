
import { CategoryButtons } from '@/components/dashboard/category-buttons';
import { ServiceCard } from '@/components/dashboard/service-card';
import { getCategories, getServices } from '@/lib/supabase/queries';

export default async function AllTreatmentsPage() {
  const categories = await getCategories();
  const services = await getServices();

  // Group services by category
  const servicesByCategory = categories.map(category => ({
    ...category,
    services: services.filter(service => service.category?.id === category.id)
  }));

  return (
    <>

      <main className="container mx-auto py-8 ">
        <section className="max-w-3xl mx-auto mb-10 ">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            All Treatments
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Browse all available treatment categories below.
          </p>

          <CategoryButtons categories={categories} />
        </section>

        {/* Services Section */}
        <section className="max-w-7xl mx-auto mb-10">
          {servicesByCategory.map(category =>
            category.services.length > 0 ? (
              <div key={category.id} className="mb-12">

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {category.services.map(service => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </section>
      </main>
    </>
  );
}