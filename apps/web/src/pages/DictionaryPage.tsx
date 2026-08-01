import { Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { dictionary, searchSigns } from '@/data/content';
import { CATEGORIES, HANDshape_LABELS } from '@asl/sign-schema';
import { cn } from '@/lib/utils';

const HANDSHAPES = Object.keys(HANDshape_LABELS).filter((k) => k.length <= 2 || k === 'flatO' || k === 'claw' || k === 'bentB');

export function DictionaryPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [handshape, setHandshape] = useState('');

  const results = useMemo(
    () => searchSigns(query, handshape || undefined, category || undefined),
    [query, category, handshape],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sign Dictionary</h1>
        <p className="text-muted-foreground mt-1">
          {dictionary.signs.length} signs — search by English, category, or handshape
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search signs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
            aria-label="Search dictionary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 px-3 rounded-lg bg-secondary border border-border"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={handshape}
          onChange={(e) => setHandshape(e.target.value)}
          className="h-10 px-3 rounded-lg bg-secondary border border-border"
          aria-label="Filter by handshape"
        >
          <option value="">All handshapes</option>
          {HANDSHAPES.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {results.length} sign{results.length !== 1 ? 's' : ''}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {results.map((sign) => (
          <Link key={sign.id} to={`/dictionary/${sign.id}`}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-bold text-lg">{sign.gloss}</h2>
                    <p className="text-sm text-muted-foreground">{sign.english.join(', ')}</p>
                  </div>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full capitalize shrink-0',
                      'bg-secondary text-muted-foreground',
                    )}
                  >
                    {sign.category}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                  <span>Shape: {sign.handshapes.right ?? sign.handshapes.left ?? '—'}</span>
                  <span>·</span>
                  <span>Lvl {sign.difficulty}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
