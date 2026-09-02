"use client";

import { useEffect } from "react";

const revealSelector = [
  ".precision-section-head",
  ".precision-trustgrid > div",
  ".precision-category-card",
  ".premium-product-card",
  ".precision-feature",
  ".precision-consult-copy > *",
  ".precision-bottom-grid > div",
  ".footer-main > *",
  ".category-product-grid > *",
  ".product-story-card",
  ".routine-step",
  ".trust-proof-card",
  ".story-copy > *",
  ".mosaic-copy > *",
  ".ledger-row",
  ".policy-card",
  ".delivery-card",
  ".faq-item"
].join(",");

const imageRevealSelector = [
  ".precision-category-image",
  ".precision-feature",
  ".precision-consult-media",
  ".product-gallery-main",
  ".story-visual",
  ".mosaic-image",
  ".editorial-image",
  ".proof-banner-visual",
  ".returns-visual"
].join(",");

export default function PremiumMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    document.body.classList.add("premium-motion-ready");

    const revealElements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
    revealElements.forEach((element, index) => {
      element.classList.add("pm-reveal");
      element.style.setProperty("--pm-delay", `${Math.min(index % 5, 4) * 55}ms`);
    });

    const imageElements = Array.from(document.querySelectorAll<HTMLElement>(imageRevealSelector));
    imageElements.forEach((element) => element.classList.add("pm-image-reveal"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("pm-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );

    revealElements.forEach((element) => observer.observe(element));
    imageElements.forEach((element) => observer.observe(element));

    const parallaxElements = Array.from(
      document.querySelectorAll<HTMLElement>(".precision-hero-media, .precision-consult-media")
    );

    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      const viewport = window.innerHeight || 1;

      parallaxElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewport) return;
        const center = rect.top + rect.height / 2;
        const normalized = (center - viewport / 2) / viewport;
        element.style.setProperty("--pm-parallax-y", `${normalized * -22}px`);
      });

      document.body.classList.toggle("pm-scrolled", window.scrollY > 22);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      document.body.classList.remove("premium-motion-ready", "pm-scrolled");
    };
  }, []);

  return null;
}
