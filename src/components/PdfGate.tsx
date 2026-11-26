import { useCallback, type ReactNode } from 'react';
import { DropZone } from './DropZone';
import { useHandOff, useLoadedPdf, type LoadedPdf } from './hooks';
import { Button, Notice, Sheet } from './ui';
import { Loading } from './Workspace';

/**
 * The shared front door for tools that work on one PDF: choose or drop a file,
 * open it once, show a clear message if it can't be opened.
 */
export function PdfGate({
  file,
  setFile,
  children,
  title,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  children: (doc: LoadedPdf) => ReactNode;
  title?: string;
}) {
  useHandOff(useCallback((files: File[]) => setFile(files[0]), [setFile]));
  const { doc, error, loading } = useLoadedPdf(file);

  if (!file) return <DropZone kind="pdf" onFiles={(f) => setFile(f[0])} title={title} />;
  if (error)
    return (
      <Sheet className="space-y-4 p-5">
        <Notice tone="error">{error}</Notice>
        <Button onClick={() => setFile(null)}>Choose another file</Button>
      </Sheet>
    );
  if (loading || !doc || doc.file !== file) return <Loading />;
  return <>{children(doc)}</>;
}
