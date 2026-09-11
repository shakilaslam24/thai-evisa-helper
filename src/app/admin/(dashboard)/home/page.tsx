import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";
import { PageBody, PageHeader } from "@/components/admin/ui";
import { HomeEditor } from "@/components/admin/home-editor";
import { deleteServiceAction, deleteWhyAction } from "./actions";

export const metadata = { title: "Home" };

export default async function HomeAdminPage() {
  await requireAdmin();

  const [sections, hero, services, whyItems, media] = await Promise.all([
    db.homeSection.findMany({ orderBy: { sortOrder: "asc" } }),
    db.homeHero.upsert({ where: { id: "hero" }, update: {}, create: { id: "hero" } }),
    db.homeService.findMany({ orderBy: { sortOrder: "asc" } }),
    db.homeWhyItem.findMany({ orderBy: { sortOrder: "asc" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, originalName: true, altText: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Home"
        description="Turn sections on or off, reorder them, and edit their wording. The section types themselves are fixed by the design system, so the page cannot be broken by an edit."
        actions={
          <a href="/" target="_blank" rel="noopener" className="btn btn-outline btn-sm">
            View homepage
          </a>
        }
      />
      <PageBody>
        <HomeEditor
          sections={sections}
          hero={hero}
          services={services}
          whyItems={whyItems}
          media={media}
          deleteServiceAction={deleteServiceAction}
          deleteWhyAction={deleteWhyAction}
        />
      </PageBody>
    </>
  );
}
