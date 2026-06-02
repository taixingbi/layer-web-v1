/**
 * Monospace block for ASCII diagrams and code samples in blog posts.
 */

type Props = {
  children: string;
  title?: string;
};

export function BlogPre({ children, title }: Props) {
  return (
    <figure className="blog-pre-wrap">
      {title ? <figcaption className="blog-pre-caption">{title}</figcaption> : null}
      <pre className="blog-pre">
        <code>{children.trimEnd()}</code>
      </pre>
    </figure>
  );
}
