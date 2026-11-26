import {
  Combine,
  FileImage,
  FileSearch,
  FileText,
  FingerprintPattern,
  Hash,
  Images,
  LayoutGrid,
  Minimize2,
  RotateCw,
  Scissors,
  Signature,
  Stamp,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  merge: Combine,
  split: Scissors,
  compress: Minimize2,
  organize: LayoutGrid,
  rotate: RotateCw,
  image: Images,
  pdfImage: FileImage,
  text: FileText,
  sign: Signature,
  watermark: Stamp,
  numbers: Hash,
  extract: FileSearch,
  metadata: FingerprintPattern,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

/** The Simply PDF mark: a folded sheet with a single highlighter line. */
/** The Simply PDF mark: a tilted sheet whose two lines are the studio's two
 *  offset capsules, the highlighter one breaking out past the paper's edge.
 *  Drawn from theme colours, so it inverts on the dark themes. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="13 13 82 82" className={className} aria-hidden>
      <rect x="13" y="13" width="82" height="82" rx="20" fill="var(--ink)" />
      <g transform="translate(54 54) scale(0.9) translate(-54 -54) rotate(-8 54 54)">
        <rect x="31" y="19" width="48" height="68" rx="10" fill="var(--paper)" />
        <rect x="41" y="34" width="28" height="11" rx="5.5" fill="var(--ink)" />
        <rect x="23" y="55" width="40" height="12.5" rx="6.25" fill="#000" opacity=".16" />
        <rect x="21" y="52.5" width="40" height="12.5" rx="6.25" fill="var(--mark)" />
      </g>
    </svg>
  );
}
