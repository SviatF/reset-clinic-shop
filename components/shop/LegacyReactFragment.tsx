import parse from "html-react-parser";

type LegacyReactFragmentProps = {
  html: string;
};

export function LegacyReactFragment({ html }: LegacyReactFragmentProps) {
  return <>{parse(html)}</>;
}
