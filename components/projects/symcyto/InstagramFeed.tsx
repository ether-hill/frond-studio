// Instagram feed — a 3×5 grid of the most recent posts with a follow CTA.
//
// Live posts come from the official Instagram Graph API, which needs an access
// token (there is no unauthenticated public endpoint, and scraping breaks IG's
// ToS). Set IG_USER_ID + IG_ACCESS_TOKEN in the environment and it renders real
// thumbnails linking to each post; without them it falls back to branded tiles
// that link to the profile, so the section is always presentable.

type IgPost = { id: string; permalink: string; image: string | null };

async function fetchPosts(count: number): Promise<IgPost[]> {
  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  if (!token || !userId) return [];
  try {
    const fields = "id,permalink,media_type,media_url,thumbnail_url";
    const url = `https://graph.instagram.com/v21.0/${userId}/media?fields=${fields}&limit=${count}&access_token=${token}`;
    // Refresh hourly so the grid stays current without hitting the API per request.
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: { id: string; permalink: string; media_type: string; media_url?: string; thumbnail_url?: string }[];
    };
    return (json.data ?? []).slice(0, count).map((m) => ({
      id: m.id,
      permalink: m.permalink,
      image: m.media_type === "VIDEO" ? m.thumbnail_url ?? null : m.media_url ?? null,
    }));
  } catch {
    return [];
  }
}

const IgGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="17.6" cy="6.4" r="1.25" fill="currentColor" />
  </svg>
);

export default async function InstagramFeed({
  handle,
  profileUrl,
}: {
  handle: string;
  profileUrl: string;
}) {
  const COUNT = 15;
  // Stand-in tiles: square frames lifted from the Symcyto timelapses (in
  // /public/symcyto/ig). Used until the Graph API is wired with a token; live
  // posts, when available, take precedence per slot.
  const FALLBACK: IgPost[] = Array.from({ length: COUNT }, (_, i) => ({
    id: `local-${i + 1}`,
    permalink: profileUrl,
    image: `/symcyto/ig/${String(i + 1).padStart(2, "0")}.jpg`,
  }));
  const live = await fetchPosts(COUNT);
  const tiles: IgPost[] = Array.from({ length: COUNT }, (_, i) => live[i] ?? FALLBACK[i]);

  return (
    <section className="sym-section ig-feed" style={{ borderTop: "1px solid var(--line-2)" }}>
      <div className="sym-wrap">
        <div className="ig-head" data-rvs>
          <h2 className="sym-h2">Follow along</h2>
          <a className="sym-readbtn" href={profileUrl} target="_blank" rel="noopener noreferrer">
            <IgGlyph />
            Follow {handle}
          </a>
        </div>

        <div className="ig-grid" data-stag>
          {tiles.map((t) => (
            <a
              key={t.id}
              className="ig-tile"
              href={t.permalink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${handle} on Instagram`}
            >
              {t.image ? (
                <img src={t.image} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="ig-ph" aria-hidden="true">
                  <IgGlyph />
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
