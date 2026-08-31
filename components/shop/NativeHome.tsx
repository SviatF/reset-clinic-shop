import type { NativeNode } from "../../lib/native-dom";
import { NativeHeader, NativeTree } from "./NativeHeader";

type HomeHeaderProps = {
  nodes: NativeNode[];
};

export function HomeHeader({ nodes }: HomeHeaderProps) {
  return <NativeHeader nodes={nodes} />;
}

type HomeSectionsProps = {
  hero: NativeNode[];
  sections: NativeNode[];
  pageClassName: string;
  pageElementorId?: string;
};

export function HomeSections({
  hero,
  sections,
  pageClassName,
  pageElementorId,
}: HomeSectionsProps) {
  return (
    <div
      className={pageClassName}
      data-elementor-id={pageElementorId}
      data-elementor-type="wp-page"
    >
      <NativeTree nodes={hero} keyPrefix="hero" />
      <NativeTree nodes={sections} keyPrefix="section" />
    </div>
  );
}

type HomeFooterProps = {
  nodes: NativeNode[];
};

export function HomeFooter({ nodes }: HomeFooterProps) {
  return <NativeTree nodes={nodes} keyPrefix="footer" />;
}
