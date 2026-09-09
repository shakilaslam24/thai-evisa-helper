import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { TestimonialManager } from "@/components/admin/testimonial-manager";
import { deleteTestimonialAction, toggleTestimonialAction } from "./actions";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const user = await requireAdmin();

  const [testimonials, media] = await Promise.all([
    db.testimonial.findMany({ orderBy: [{ published: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Only real feedback from real clients belongs here. When nothing is published, the reviews section is removed from the homepage entirely — an empty section is worse than none."
      />
      <PageBody>
        <TestimonialManager
          testimonials={testimonials.map((row) => ({
            id: row.id,
            authorName: row.authorName,
            authorTitle: row.authorTitle,
            quote: row.quote,
            serviceType: row.serviceType,
            rating: row.rating,
            published: row.published,
            sortOrder: row.sortOrder,
            isPlaceholder: row.isPlaceholder,
            avatarId: row.avatarId,
          }))}
          media={media}
          canDelete={user.role !== "editor"}
          toggleAction={toggleTestimonialAction}
          deleteAction={deleteTestimonialAction}
        />
      </PageBody>
    </>
  );
}
