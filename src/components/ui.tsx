import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_6px_16px_-8px_rgb(0_0_0/0.45)] hover:bg-ink/88 disabled:opacity-35 disabled:shadow-none disabled:hover:bg-ink',
  accent: 'bg-accent text-accent-ink hover:brightness-110 disabled:opacity-40',
  secondary: 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-sunk/50 disabled:opacity-45',
  ghost: 'text-ink-2 hover:text-ink hover:bg-sunk/70 disabled:opacity-40',
  danger: 'text-danger hover:bg-danger-soft disabled:opacity-40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-[15px] gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  busy?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', busy, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || busy}
      className={cx(
        'press inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  tone = 'default',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'press inline-flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30',
        tone === 'danger' ? 'text-ink-3 hover:bg-danger-soft hover:text-danger' : 'text-ink-2 hover:bg-sunk hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Sheet({ className, children, as: As = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'aside' }) {
  return <As className={cx('rounded-[22px] border border-rule bg-sheet shadow-sheet', className)}>{children}</As>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex rounded-full bg-sunk p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cx(
              'press min-h-9 flex-1 rounded-full px-3 text-[13px] font-semibold',
              active ? 'bg-sheet text-ink shadow-sheet' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <div className="text-xs leading-relaxed text-ink-3">{hint}</div>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border border-rule bg-paper px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-ink focus:outline-none';

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold">
          {label}
        </label>
        <span className="num text-xs text-ink-2">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full cursor-pointer"
      />
    </div>
  );
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="min-w-0">
        <span className="block text-[13px] font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{hint}</span>}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('press relative h-7 w-12 shrink-0 rounded-full', checked ? 'bg-ink' : 'bg-rule-strong')}
      >
        <span
          className={cx(
            'absolute top-1 left-1 size-5 rounded-full bg-paper shadow transition-transform duration-500 ease-spring',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}

export function Notice({ tone = 'info', children, className }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-2xl px-4 py-3 text-[13px] leading-relaxed',
        tone === 'error' && 'bg-danger-soft text-danger',
        tone === 'warn' && 'border border-rule bg-sunk/60 text-ink',
        tone === 'info' && 'bg-accent-soft text-ink',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ done, total, label }: { done: number; total: number; label?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const indeterminate = total <= 0;
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate text-ink-2">{label || 'Working on this device…'}</span>
        {!indeterminate && <span className="num text-ink">{pct}%</span>}
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-sunk"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : pct}
      >
        {indeterminate ? (
          <div className="h-full w-2/5 rounded-full bg-ink" style={{ animation: 'indeterminate 1.1s ease-in-out infinite' }} />
        ) : (
          <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="num rounded-md border border-rule bg-paper px-1.5 py-0.5 text-[10px] text-ink-2">{children}</kbd>;
}
