"use client";

import { useEffect } from "react";

function toggleAccordion(title: HTMLElement) {
  const controls = title.getAttribute("aria-controls");
  const content = controls ? document.getElementById(controls) : title.nextElementSibling;
  const wasOpen = title.classList.contains("elementor-active");

  title.classList.toggle("elementor-active", !wasOpen);
  title.setAttribute("aria-expanded", String(!wasOpen));

  if (content instanceof HTMLElement) {
    content.classList.toggle("elementor-active", !wasOpen);
    content.hidden = wasOpen;
    content.style.display = wasOpen ? "none" : "block";
  }
}

export function NativeInteractions() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const accordionTitle = target.closest<HTMLElement>(".elementor-tab-title");
      if (accordionTitle) {
        event.preventDefault();
        toggleAccordion(accordionTitle);
        return;
      }

      const menuToggle = target.closest<HTMLElement>(".elementor-menu-toggle");
      if (menuToggle) {
        event.preventDefault();
        const isOpen = menuToggle.classList.toggle("elementor-active");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        const nav = menuToggle.closest(".elementor-widget-container")?.querySelector<HTMLElement>("nav");
        nav?.classList.toggle("elementor-active", isOpen);
        return;
      }

      const submenuLink = target.closest<HTMLAnchorElement>("a.has-submenu:not([href])");
      if (submenuLink) {
        event.preventDefault();
        const item = submenuLink.closest<HTMLElement>("li");
        const isOpen = item?.classList.toggle("reset-submenu-open") ?? false;
        submenuLink.setAttribute("aria-expanded", String(isOpen));
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
