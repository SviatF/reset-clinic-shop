import type { NativeNode } from "../../lib/native-dom";
import { LegacyReactFragment } from "./LegacyReactFragment";
import { NativeHeader, NativeTree } from "./NativeHeader";

type HomeHeaderProps = {
  nodes: NativeNode[];
};

export function HomeHeader({ nodes }: HomeHeaderProps) {
  return <NativeHeader nodes={nodes} />;
}

type HomeSectionsProps = {
  hero: NativeNode[];
  sections: string[];
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
      {sections.map((section, index) => (
        <LegacyReactFragment key={index} html={section} />
      ))}
    </div>
  );
}

type HomeFooterProps = {
  html: string;
};

export function HomeFooter({ html }: HomeFooterProps) {
  return <LegacyReactFragment html={html} />;
}
