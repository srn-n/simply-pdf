/**
 * Every tool, with the words used for it everywhere: the tool index, the
 * screen header, the how-to steps and the questions under each tool.
 *
 * Pure data with no imports.
 */

export type ToolId =
  | 'merge'
  | 'split'
  | 'compress'
  | 'organize'
  | 'rotate'
  | 'jpg-to-pdf'
  | 'pdf-to-jpg'
  | 'text-to-pdf'
  | 'sign'
  | 'watermark'
  | 'page-numbers'
  | 'pdf-to-text'
  | 'metadata';

export type Section = 'arrange' | 'shrink' | 'convert' | 'mark' | 'privacy';

export type Accepts = 'pdf' | 'pdfs' | 'images' | 'none';

export interface Tool {
  id: ToolId;
  slug: string;
  name: string;
  /** One line, under 60 characters, for the tool index */
  blurb: string;
  section: Section;
  icon: string;
  accepts: Accepts;
  steps: [string, string, string];
  faq: { q: string; a: string }[];
  related: ToolId[];
}

export const SECTIONS: { id: Section; label: string }[] = [
  { id: 'arrange', label: 'Arrange' },
  { id: 'shrink', label: 'Shrink' },
  { id: 'convert', label: 'Convert' },
  { id: 'mark', label: 'Sign & mark' },
  { id: 'privacy', label: 'Inspect' },
];

import { isNative } from '../lib/platform';

// Some answers differ between the Android app and the website: the app works
// on the phone with no internet permission, the website in the browser tab.
const PRIVATE = isNative
  ? 'No. The file is opened and processed on this phone. It is never uploaded: the app has no internet permission and works in aeroplane mode.'
  : 'No. The file is opened and processed in this browser tab, on your device. It is never uploaded: once the page has loaded it works with the internet switched off.';

export const TOOLS: Tool[] = [
  {
    id: 'merge',
    slug: 'merge-pdf',
    name: 'Merge PDF',
    blurb: 'Combine several PDFs into one, in your order',
    section: 'arrange',
    icon: 'merge',
    accepts: 'pdfs',
    steps: ['Add two or more PDFs.', 'Drag them into the order you want.', 'Merge, then save or share the new file.'],
    faq: [
      { q: 'Are my PDFs uploaded to merge them?', a: PRIVATE },
      { q: 'Is there a limit on files or pages?', a: `There is no set limit. The only limit is your device memory; a modern ${isNative ? 'phone' : 'phone or computer'} handles a few hundred pages comfortably.` },
      { q: 'Will bookmarks and links survive?', a: 'Page content, images, text and page sizes are kept exactly. Bookmarks from the original files are not carried into the merged file.' },
    ],
    related: ['organize', 'compress', 'page-numbers'],
  },
  {
    id: 'split',
    slug: 'split-pdf',
    name: 'Split PDF',
    blurb: 'Pull out pages or cut a PDF into parts',
    section: 'arrange',
    icon: 'split',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Type page ranges like 1-3, 8 or tap the pages you want.', 'Split, then save each part or all of them as a ZIP.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'What can I type as a range?', a: 'Single pages (5), ranges (2-7), open ranges (8- means page 8 to the end) and the word last. Separate them with commas.' },
      { q: 'Can I get the pages as one file instead of many?', a: 'Yes. Turn on "One file" and every page you chose is put into a single PDF.' },
    ],
    related: ['merge', 'organize', 'pdf-to-jpg'],
  },
  {
    id: 'compress',
    slug: 'compress-pdf',
    name: 'Compress PDF',
    blurb: 'Make a PDF smaller, with the real numbers',
    section: 'shrink',
    icon: 'compress',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Pick "Keep text" or "Smallest file".', 'Compress and compare the exact sizes before you save.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Why did my file not get smaller?', a: 'Some PDFs are already well compressed. When nothing smaller can be made, Simply PDF tells you and hands back your original instead of a bigger copy.' },
      { q: 'What is the difference between the two modes?', a: '"Keep text" rewrites the file without touching quality, so text stays selectable. "Smallest file" redraws each page as an image, which shrinks scans a lot but makes the text unselectable.' },
    ],
    related: ['merge', 'pdf-to-jpg', 'metadata'],
  },
  {
    id: 'organize',
    slug: 'organize-pdf',
    name: 'Organize pages',
    blurb: 'Reorder, rotate and delete pages visually',
    section: 'arrange',
    icon: 'organize',
    accepts: 'pdf',
    steps: ['Open a PDF to see every page.', 'Drag, rotate or delete pages.', 'Save the rearranged PDF.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Can I undo a deleted page?', a: 'Yes. Deleted pages stay greyed out until you save, so you can bring them back with one tap.' },
      { q: 'Does rotating reduce quality?', a: 'No. Rotation is stored as a page setting; the content is not redrawn.' },
    ],
    related: ['rotate', 'split', 'merge'],
  },
  {
    id: 'rotate',
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    blurb: 'Turn sideways or upside-down pages the right way',
    section: 'arrange',
    icon: 'rotate',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Rotate every page, or tap single pages to turn them.', 'Save the fixed PDF.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Is the rotation permanent?', a: 'Yes. The saved PDF opens the right way up in every viewer.' },
      { q: 'Does it lose quality?', a: 'No. Rotation is a page setting, so nothing is re-encoded.' },
    ],
    related: ['organize', 'compress', 'merge'],
  },
  {
    id: 'jpg-to-pdf',
    slug: 'jpg-to-pdf',
    name: 'Images to PDF',
    blurb: 'Turn photos, JPG and PNG into one PDF',
    section: 'convert',
    icon: 'image',
    accepts: 'images',
    steps: ['Add photos or images, or take one with your camera.', 'Put them in order and choose a page size.', 'Make the PDF and save it.'],
    faq: [
      { q: 'Are my photos uploaded?', a: PRIVATE },
      { q: 'Why are my phone photos the right way up?', a: 'Phones store rotation separately from the picture. Simply PDF reads it and turns each photo upright before adding it.' },
      {
        q: 'Can I use HEIC photos?',
        a: isNative
          ? 'Only if your phone can open them in apps. If one is refused, share the photo as JPG from your gallery first.'
          : 'Only if your browser can open them (Safari can; most others cannot yet). If one is refused, save the photo as JPG first.',
      },
    ],
    related: ['merge', 'compress', 'pdf-to-jpg'],
  },
  {
    id: 'pdf-to-jpg',
    slug: 'pdf-to-jpg',
    name: 'PDF to images',
    blurb: 'Save each page as a JPG or PNG',
    section: 'convert',
    icon: 'pdfImage',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Choose JPG or PNG, the resolution and which pages.', 'Convert and save the images.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Which resolution should I pick?', a: 'Screen (96 dpi) for sharing in chats, Print (150 dpi) for most uses, and Sharp (300 dpi) when you need to zoom in or print large.' },
      { q: 'JPG or PNG?', a: 'JPG makes smaller files and suits photos and scans. PNG is lossless and best for text and diagrams.' },
    ],
    related: ['jpg-to-pdf', 'split', 'compress'],
  },
  {
    id: 'text-to-pdf',
    slug: 'text-to-pdf',
    name: 'Text to PDF',
    blurb: 'Write or paste notes and get a tidy PDF',
    section: 'convert',
    icon: 'text',
    accepts: 'none',
    steps: ['Type, paste or open a .txt or .md file.', 'Pick a font, size and page size.', 'Make the PDF.'],
    faq: [
      { q: 'Is my text sent anywhere?', a: `No. The PDF is laid out ${isNative ? 'on this phone' : 'in this browser tab'}. Nothing you type leaves your device.` },
      { q: 'What formatting is supported?', a: 'Lines starting with # or ## become headings, and lines starting with - or * become bullet points. Blank lines separate paragraphs.' },
      { q: 'Why did some characters turn into "?"', a: 'The built-in PDF fonts cover Western European characters. Others, such as emoji, Bangla or Chinese, cannot be drawn and are replaced. Simply PDF tells you how many.' },
    ],
    related: ['merge', 'page-numbers', 'watermark'],
  },
  {
    id: 'sign',
    slug: 'sign-pdf',
    name: 'Sign PDF',
    blurb: 'Draw, type or upload a signature and place it',
    section: 'mark',
    icon: 'sign',
    accepts: 'pdf',
    steps: ['Open the PDF you need to sign.', 'Draw, type or upload your signature.', 'Drag it into place on the page and save.'],
    faq: [
      { q: 'Is my document uploaded?', a: PRIVATE },
      { q: 'Is this a legally binding e-signature?', a: 'It adds an image of your signature, the same as signing a printout and scanning it. It is not a certificate-based digital signature. Whether that is enough depends on who asked you to sign.' },
      { q: 'Can I use a photo of my signature on paper?', a: 'Yes. Choose Upload, and Simply PDF can remove the white paper background for you.' },
    ],
    related: ['page-numbers', 'compress', 'merge'],
  },
  {
    id: 'watermark',
    slug: 'watermark-pdf',
    name: 'Watermark',
    blurb: 'Stamp DRAFT, CONFIDENTIAL or your own words',
    section: 'mark',
    icon: 'watermark',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Type the watermark and adjust it in the preview.', 'Apply it and save.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Can the watermark be removed later?', a: 'It is drawn onto each page, so casual editing will not remove it, but a determined person with editing software could.' },
      { q: 'Can I repeat it across the page?', a: 'Yes. Choose Tiled to repeat it in a pattern over the whole page.' },
    ],
    related: ['page-numbers', 'sign', 'compress'],
  },
  {
    id: 'page-numbers',
    slug: 'add-page-numbers-to-pdf',
    name: 'Page numbers',
    blurb: 'Number the pages, where and how you like',
    section: 'mark',
    icon: 'numbers',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Pick where the numbers go and how they look.', 'Add them and save.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Can I skip the cover page?', a: 'Yes. Turn on "Skip first page" and numbering starts on page two.' },
      { q: 'What about landscape or rotated pages?', a: 'Numbers are placed where the page is read, so they sit at the bottom of landscape and rotated pages too.' },
    ],
    related: ['merge', 'watermark', 'organize'],
  },
  {
    id: 'pdf-to-text',
    slug: 'pdf-to-text',
    name: 'PDF to text',
    blurb: 'Copy out all the text in a PDF',
    section: 'privacy',
    icon: 'extract',
    accepts: 'pdf',
    steps: ['Open a PDF.', 'Simply PDF reads the text from every page.', 'Copy it or save it as a .txt file.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'Why is no text found?', a: 'Scanned documents are pictures of text, not text. Simply PDF does not do OCR, so it will tell you when a page has no text to read.' },
      { q: 'Is the layout kept?', a: 'Line breaks are kept; columns and tables come out as plain lines of text.' },
    ],
    related: ['pdf-to-jpg', 'split', 'metadata'],
  },
  {
    id: 'metadata',
    slug: 'remove-pdf-metadata',
    name: 'Metadata',
    blurb: 'See and remove hidden author and app details',
    section: 'privacy',
    icon: 'metadata',
    accepts: 'pdf',
    steps: ['Open a PDF to see its hidden details.', 'Edit the fields, or remove all of them.', 'Save the cleaned PDF.'],
    faq: [
      { q: 'Is my file uploaded?', a: PRIVATE },
      { q: 'What is PDF metadata?', a: 'Details stored inside the file that you do not see on the page: often the author name from your computer account, the app used and when it was made.' },
      { q: 'Does removing it change the pages?', a: 'No. Only the hidden information is removed; every page looks exactly the same.' },
    ],
    related: ['compress', 'watermark', 'pdf-to-text'],
  },
];

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, Tool>;
export const TOOL_BY_SLUG = Object.fromEntries(TOOLS.map((t) => [t.slug, t])) as Record<string, Tool>;

/** Tools that can take a finished PDF as their input, for "keep going" chips. */
export const NEXT_STEPS: ToolId[] = ['compress', 'sign', 'page-numbers', 'watermark', 'organize', 'merge', 'metadata'];

export const APP = {
  name: 'Simply PDF',
  tagline: 'PDF tools that never upload your files',
  studio: 'Simply Made Studio',
  studioUrl: 'https://www.simplymadestudio.net',
};

/** The four Simply Made Studio promises, and how this app keeps each one. */
export const PROMISES = [
  {
    word: 'Accounts',
    line: 'Open it and it works. Nothing to sign up for.',
    proof: `There is no login code at all. Your settings stay ${isNative ? 'on this phone' : 'in this browser, on this device'}.`,
  },
  {
    word: 'Ads',
    line: 'No adverts, no feeds, nothing to buy.',
    proof: 'Every tool is free and complete. The tests fail if ad or analytics code ever appears.',
  },
  {
    word: 'Tracking',
    line: 'What you open stays on your device. No analytics.',
    proof: isNative
      ? 'The app has no internet permission, so Android itself stops it sending anything anywhere.'
      : "The site's security policy lets the page talk only to itself, so the browser blocks it from sending anything anywhere else.",
  },
  {
    word: 'Guesswork',
    line: 'Numbers you can trust, like the real size after compressing.',
    proof: 'Automated tests check the PDF engine and these promises on every change. If a file can\'t get smaller, you\'re told, and you keep the original.',
  },
] as const;
