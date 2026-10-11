import Link from "next/link";
import { parseArticle, type Inline } from "@/lib/article-format";

function Parts({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.href ? (
          part.href.startsWith("/") ? (
            <Link href={part.href} key={index}>
              {part.text}
            </Link>
          ) : (
            <a href={part.href} key={index} rel="noopener" target="_blank">
              {part.text}
            </a>
          )
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The weekly article, rendered from its markup as elements (no raw HTML). */
export function ArticleBody({ body }: { body: string }) {
  return (
    <div className="article-body">
      {parseArticle(body).map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2 key={index}>
              <Parts parts={block.parts} />
            </h2>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Parts parts={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            <Parts parts={block.parts} />
          </p>
        );
      })}
    </div>
  );
}
