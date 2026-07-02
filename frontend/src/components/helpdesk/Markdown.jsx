import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders article Markdown. react-markdown does NOT render raw HTML by default,
// so authored content can't inject scripts. Styling lives in .md-content (index.css).
export function Markdown({ children }) {
  return (
    <div className="md-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ""}</ReactMarkdown>
    </div>
  );
}
