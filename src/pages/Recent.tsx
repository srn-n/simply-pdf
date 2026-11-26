import { Trash } from 'lucide-react';
import { clearRecent, removeRecent, useRecent, useSettings } from '../lib/store';
import { formatBytes, timeAgo } from '../lib/format';
import { isNative } from '../lib/platform';
import { TOOL_BY_ID } from '../tools/registry';
import { Link } from '../components/Shell';
import { ToolIcon } from '../components/icons';
import { Button, IconButton, Sheet } from '../components/ui';

export default function Recent() {
  const items = useRecent();
  const { rememberRecent } = useSettings();
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-32 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Recent</h1>
          <p className="max-w-md text-sm leading-relaxed text-ink-2">
            Only names and sizes, kept {isNative ? 'on this phone' : 'in this browser'}. Simply PDF never keeps copies of your files.
          </p>
        </div>
        {items.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clearRecent}>
            Clear all
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <Sheet className="space-y-3 p-8 text-center">
          <p className="font-semibold">{rememberRecent ? 'Nothing yet' : 'Recent activity is off'}</p>
          <p className="text-sm text-ink-2">
            {rememberRecent ? 'Files you finish with a tool show up here.' : 'Turn it back on in Settings if you want a list.'}
          </p>
          <Link to="/" className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm font-semibold text-paper">
            Open a tool
          </Link>
        </Sheet>
      ) : (
        <Sheet className="divide-y divide-rule">
          {items.map((it) => {
            const tool = TOOL_BY_ID[it.tool];
            return (
              <div key={it.id} className="flex items-center gap-3 py-3 pr-2 pl-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sunk text-ink-2">
                  <ToolIcon name={tool?.icon ?? 'text'} className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="num mt-0.5 truncate text-[11px] text-ink-3">
                    {tool?.name ?? it.tool} · {formatBytes(it.size)} · {timeAgo(it.at)}
                  </p>
                </div>
                {tool && (
                  <Link to={`/${tool.slug}`} className="flex h-9 shrink-0 items-center rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-sunk hover:text-ink">
                    Use again
                  </Link>
                )}
                <IconButton label={`Remove ${it.name}`} tone="danger" onClick={() => removeRecent(it.id)}>
                  <Trash className="size-4" />
                </IconButton>
              </div>
            );
          })}
        </Sheet>
      )}
    </div>
  );
}
