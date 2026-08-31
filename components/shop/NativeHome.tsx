import { LegacyReactFragment } from "./LegacyReactFragment";

type HomeHeaderProps = {
  html: string;
};

export function HomeHeader({ html }: HomeHeaderProps) {
  return <LegacyReactFragment html={html} />;
}

type HomeSectionsProps = {
  sections: string[];
  pageClassName: string;
  pageElementorId?: string;
};

export function HomeSections({
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
