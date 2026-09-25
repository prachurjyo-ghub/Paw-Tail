import Container from "@/components/Container";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingRegion({ children, className = "" }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">Loading content</span>
      {children}
    </div>
  );
}

function SectionHeadingSkeleton({ centered = false }) {
  return (
    <div className={`space-y-3 ${centered ? "mx-auto flex max-w-xl flex-col items-center" : ""}`}>
      <Skeleton className="h-8 w-52 sm:h-10 sm:w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[18px] border border-neutral-200 bg-white p-3">
      <Skeleton className="aspect-square w-full rounded-[14px]" />
      <div className="mt-3 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center justify-between gap-3 pt-1">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8, className = "" }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function FilterSidebarSkeleton() {
  return (
    <aside className="hidden space-y-3 lg:block">
      {[72, 210, 150, 92].map((height, index) => (
        <div key={index} className="rounded-[18px] bg-white p-4">
          <Skeleton className="h-5 w-24" />
          {height > 100 ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }, (_, item) => (
                <Skeleton key={item} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <Skeleton className="mt-3 h-5 w-full" />
          )}
        </div>
      ))}
    </aside>
  );
}

export function HomePageSkeleton() {
  return (
    <LoadingRegion className="bg-white">
      <section className="bg-main px-4 py-9 sm:py-14">
        <Container className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-8 w-56 rounded-full bg-white/15" />
            <Skeleton className="h-12 w-full max-w-lg bg-white/15 sm:h-16" />
            <Skeleton className="h-12 w-4/5 max-w-md bg-white/15" />
            <Skeleton className="h-20 w-full max-w-xl bg-white/10" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-40 rounded-full bg-white/20" />
              <Skeleton className="h-11 w-40 rounded-full bg-white/10" />
            </div>
          </div>
          <Skeleton className="order-first aspect-[8/4.5] w-full rounded-[24px] bg-white/15 lg:order-none" />
        </Container>
      </section>

      <section className="bg-[#fbf7f1] py-12">
        <Container>
          <SectionHeadingSkeleton centered />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="h-[86px] w-[76px] rounded-xl sm:h-[135px] sm:w-[150px] sm:rounded-3xl" />
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14">
        <Container>
          <SectionHeadingSkeleton centered />
          <ProductGridSkeleton count={10} className="mt-8 lg:grid-cols-5" />
        </Container>
      </section>

      <section className="bg-[#f5ead9] py-12">
        <Container>
          <Skeleton className="aspect-[5/1] w-full rounded-[24px]" />
        </Container>
      </section>

      <PopularBrandsSkeleton />
    </LoadingRegion>
  );
}

export function CatalogPageSkeleton() {
  return (
    <LoadingRegion className="min-h-screen bg-[#f6f1e8] py-7">
      <Container>
        <Skeleton className="mb-[18px] h-4 w-56" />
        <div className="grid min-h-[168px] grid-cols-[1fr_88px] items-center gap-4 rounded-[20px] bg-main p-4 lg:grid-cols-[1fr_220px] lg:p-8">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 bg-white/15" />
            <Skeleton className="h-9 w-52 bg-white/20" />
            <Skeleton className="h-4 w-full max-w-md bg-white/10" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-full bg-white/15" />
              <Skeleton className="hidden h-8 w-44 rounded-full bg-white/15 lg:block" />
            </div>
          </div>
          <Skeleton className="h-[82px] w-[82px] rounded-full bg-white/15 lg:h-40 lg:w-40" />
        </div>
        <Skeleton className="my-[22px] aspect-[5/1] w-full rounded-[20px]" />
        <Skeleton className="mb-3 h-11 w-full rounded-xl lg:hidden" />
        <div className="grid items-start gap-[22px] lg:grid-cols-[250px_1fr]">
          <FilterSidebarSkeleton />
          <div>
            <Skeleton className="mb-[18px] h-14 w-full rounded-[18px]" />
            <ProductGridSkeleton />
          </div>
        </div>
      </Container>
    </LoadingRegion>
  );
}

function ExploreCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4">
      <Skeleton className="h-12 w-12 rounded-full sm:h-16 sm:w-16" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function ExplorePageSkeleton() {
  return (
    <LoadingRegion className="min-h-screen bg-[#f6f1e8] py-7">
      <Container>
        <SectionHeadingSkeleton />
        {[6, 12, 16].map((count, section) => (
          <section key={section} className="mt-10">
            <Skeleton className="mb-4 h-8 w-48" />
            <div className="grid grid-cols-4 gap-2 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: count }, (_, index) => (
                <ExploreCardSkeleton key={index} />
              ))}
            </div>
          </section>
        ))}
      </Container>
    </LoadingRegion>
  );
}

export function ProductDetailsSkeleton() {
  return (
    <LoadingRegion className="bg-white py-8 lg:py-12">
      <Container>
        <Skeleton className="mb-8 h-4 w-72" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="mt-3 flex gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-16 w-16 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-10 w-52" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <div className="flex gap-3">
              <Skeleton className="h-12 w-36 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-full" />
            </div>
          </div>
        </div>
        <SectionHeadingSkeleton />
        <ProductGridSkeleton count={4} className="mt-6" />
      </Container>
    </LoadingRegion>
  );
}

export function CartPageSkeleton({ checkout = false }) {
  return (
    <LoadingRegion className="bg-white py-8 lg:py-12">
      <Container>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-9 w-52" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            {Array.from({ length: checkout ? 3 : 4 }, (_, index) => (
              <div key={index} className="grid gap-4 rounded-lg border border-neutral-200 p-4 sm:grid-cols-[112px_1fr]">
                <Skeleton className="aspect-square w-full rounded-md" />
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </section>
          <aside className="space-y-4 rounded-xl border border-neutral-200 p-5">
            <Skeleton className="h-7 w-36" />
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex justify-between gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
            <Skeleton className="h-12 w-full rounded-full" />
          </aside>
        </div>
      </Container>
    </LoadingRegion>
  );
}

export function WishlistPageSkeleton() {
  return (
    <LoadingRegion className="bg-white py-8 lg:py-12">
      <Container>
        <SectionHeadingSkeleton />
        <ProductGridSkeleton count={8} className="mt-8" />
      </Container>
    </LoadingRegion>
  );
}

export function ContactPageSkeleton() {
  return (
    <LoadingRegion className="bg-[#f6f1e8] py-10">
      <Container>
        <SectionHeadingSkeleton centered />
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="space-y-4 rounded-3xl bg-white p-6">
            <Skeleton className="h-8 w-52" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-12 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>
      </Container>
    </LoadingRegion>
  );
}

export function FeaturedProductsSkeleton() {
  return (
    <section className="bg-white py-14">
      <Container>
        <SectionHeadingSkeleton centered />
        <ProductGridSkeleton count={10} className="mt-8 lg:grid-cols-5" />
      </Container>
    </section>
  );
}

export function PopularBrandsSkeleton() {
  return (
    <section className="bg-[#eef6f1] py-14">
      <Container>
        <SectionHeadingSkeleton centered />
        <div className="mt-7 flex justify-center gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {Array.from({ length: 14 }, (_, index) => (
            <ExploreCardSkeleton key={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export function PromoDealsSkeleton() {
  return (
    <section className="bg-[#f5ead9] py-14">
      <Container>
        <SectionHeadingSkeleton centered />
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-[28px]" />
          <Skeleton className="h-64 rounded-[28px]" />
        </div>
      </Container>
    </section>
  );
}
