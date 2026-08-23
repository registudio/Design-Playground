/**
 * The preview route deliberately does not inherit the playground's globals.css.
 * Its own stylesheet is imported by the page, so the two never share a cascade.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
