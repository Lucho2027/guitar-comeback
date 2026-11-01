import DOMPurify from "dompurify";
import { marked } from "marked";

// Agent-written markdown is untrusted: parse, then sanitize before it touches the DOM.
export default function Markdown(props: { text: string }) {
  const html = () => DOMPurify.sanitize(marked.parse(props.text, { async: false, gfm: true }));
  return <div class="md" innerHTML={html()} />;
}
