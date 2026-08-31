"use client";

import { useEffect } from "react";
import {
  RESET_CART_EVENT,
  addCartItem,
  cartItemKey,
  cartQuantity,
  cartSubtotal,
  formatUah,
  parsePriceText,
  readCartFromStorage,
  removeCartItem,
  sanitizeQuantity,
  type ResetCartItem,
} from "../../lib/shop-cart";

type Variation = {
  variation_id?: number | string;
  display_price?: number;
  display_regular_price?: number;
  price_html?: string;
  availability_html?: string;
  is_in_stock?: boolean;
  image?: {
    src?: string;
    full_src?: string;
    srcset?: string;
    sizes?: string;
    alt?: string;
  };
  attributes?: Record<string, string>;
};

function asElement(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (target instanceof SVGElement) return target.closest("*") as HTMLElement | null;
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function visible<T extends HTMLElement>(elements: T[]) {
  return elements.find((element) => element.offsetParent !== null) ?? elements[0];
}

function productNameFromButton(button: HTMLElement) {
  const aria = button.getAttribute("aria-label") ?? "";
  const quoted = aria.match(/[“\"]([^”\"]+)[”\"]/u)?.[1];
  if (quoted) return quoted.replaceAll("&quot;", '"').trim();
  const container = button.closest("li.product, .product, .product-item, .e-loop-item");
  return (
    container?.querySelector<HTMLElement>(".woocommerce-loop-product__title, .product-title, .woocommerce-loop-category__title, h2, h3")?.innerText ||
    document.querySelector<HTMLElement>("h1.product_title, h1.entry-title, h1")?.innerText ||
    "Товар"
  ).trim();
}

function productContainer(button: HTMLElement) {
  return button.closest<HTMLElement>("li.product, .product, .product-item, .e-loop-item") ?? button.parentElement;
}

function productHref(button: HTMLElement) {
  const container = productContainer(button);
  return (
    container?.querySelector<HTMLAnchorElement>("a.woocommerce-LoopProduct-link, a[href*='/product/'], a[href*='product/']")?.href ||
    window.location.href
  );
}

function productImage(button: HTMLElement) {
  const container = productContainer(button);
  const image = container?.querySelector<HTMLImageElement>("img") ?? document.querySelector<HTMLImageElement>(".woocommerce-product-gallery img, .wp-post-image");
  return image?.currentSrc || image?.src || undefined;
}

function productPriceElement(button: HTMLElement) {
  const container = productContainer(button);
  return (
    container?.querySelector<HTMLElement>(".price, .woocommerce-Price-amount") ??
    document.querySelector<HTMLElement>(".summary .price, .woocommerce-variation-price .price, .product .price")
  );
}

function collectProductFromLoop(button: HTMLElement): ResetCartItem {
  const productId = button.getAttribute("data-product_id") || button.getAttribute("data-product-id") || "unknown";
  const priceElement = productPriceElement(button);
  const priceText = priceElement?.innerText.trim() || "";
  const quantity = sanitizeQuantity(button.getAttribute("data-quantity") || 1);
  return {
    key: cartItemKey(productId),
    productId,
    sku: button.getAttribute("data-product_sku") || undefined,
    name: productNameFromButton(button),
    href: productHref(button),
    image: productImage(button),
    price: parsePriceText(priceText),
    priceText,
    quantity,
  };
}

function selectedAttributes(form: HTMLFormElement) {
  const attributes: Record<string, string> = {};
  form.querySelectorAll<HTMLSelectElement>("select[name^='attribute_']").forEach((select) => {
    attributes[select.name] = select.value;
  });
  return attributes;
}

function variationData(form: HTMLFormElement): Variation[] {
  const raw = form.getAttribute("data-product_variations");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function matchingVariation(form: HTMLFormElement) {
  const attributes = selectedAttributes(form);
  const selects = [...form.querySelectorAll<HTMLSelectElement>("select[name^='attribute_']")];
  if (!selects.length || selects.some((select) => !select.value)) return null;

  return (
    variationData(form).find((variation) => {
      const expected = variation.attributes ?? {};
      return Object.entries(expected).every(([name, value]) => !value || attributes[name] === value);
    }) ?? null
  );
}

function updateVariationForm(form: HTMLFormElement) {
  const variation = matchingVariation(form);
  const variationInput = form.querySelector<HTMLInputElement>("input.variation_id, input[name='variation_id']");
  const addButton = form.querySelector<HTMLButtonElement | HTMLInputElement>(".single_add_to_cart_button");
  const singleVariation = form.querySelector<HTMLElement>(".single_variation");

  if (!variation) {
    if (variationInput) variationInput.value = "0";
    addButton?.classList.add("disabled", "wc-variation-selection-needed");
    if (addButton instanceof HTMLButtonElement || addButton instanceof HTMLInputElement) addButton.disabled = true;
    if (singleVariation) {
      singleVariation.style.display = "none";
      singleVariation.innerHTML = "";
    }
    return;
  }

  const variationId = String(variation.variation_id ?? "0");
  if (variationInput) variationInput.value = variationId;
  addButton?.classList.remove("disabled", "wc-variation-selection-needed", "wc-variation-is-unavailable");
  if (addButton instanceof HTMLButtonElement || addButton instanceof HTMLInputElement) {
    addButton.disabled = variation.is_in_stock === false;
  }

  if (singleVariation) {
    singleVariation.style.display = "block";
    singleVariation.innerHTML = `${variation.price_html ?? ""}${variation.availability_html ?? ""}`;
  }

  const image = variation.image;
  if (image?.src || image?.full_src) {
    const main = document.querySelector<HTMLImageElement>(".woocommerce-product-gallery__image img, .woocommerce-product-gallery img.wp-post-image");
    if (main) {
      main.src = image.full_src || image.src || main.src;
      if (image.srcset) main.srcset = image.srcset;
      if (image.sizes) main.sizes = image.sizes;
      if (image.alt) main.alt = image.alt;
    }
  }
}

function collectProductFromForm(form: HTMLFormElement, button: HTMLElement): ResetCartItem | null {
  const variation = form.classList.contains("variations_form") ? matchingVariation(form) : null;
  if (form.classList.contains("variations_form") && !variation) return null;

  const productId =
    (form.querySelector<HTMLInputElement>("input[name='product_id']")?.value ||
      form.querySelector<HTMLInputElement>("input[name='add-to-cart']")?.value ||
      button.getAttribute("value") ||
      button.getAttribute("data-product_id") ||
      "unknown");
  const variationId = variation ? String(variation.variation_id ?? "") : form.querySelector<HTMLInputElement>("input[name='variation_id']")?.value || undefined;
  const attributes = selectedAttributes(form);
  const quantity = sanitizeQuantity(form.querySelector<HTMLInputElement>("input.qty, input[name='quantity']")?.value || 1);
  const pageTitle = document.querySelector<HTMLElement>("h1.product_title, h1.entry-title, h1")?.innerText.trim() || productNameFromButton(button);
  const selectedPriceText = form.querySelector<HTMLElement>(".single_variation .price, .woocommerce-variation-price .price")?.innerText.trim();
  const pagePriceText = document.querySelector<HTMLElement>(".summary .price, .product .price")?.innerText.trim();
  const priceText = selectedPriceText || pagePriceText || "";
  const price = variation?.display_price != null ? Number(variation.display_price) : parsePriceText(priceText);

  return {
    key: cartItemKey(productId, variationId, attributes),
    productId,
    variationId,
    sku: button.getAttribute("data-product_sku") || undefined,
    name: pageTitle,
    href: window.location.href,
    image: productImage(button),
    price: Number.isFinite(price) ? price : 0,
    priceText,
    quantity,
    attributes: Object.keys(attributes).length ? attributes : undefined,
  };
}

function renderMiniCart(items: ResetCartItem[]) {
  const subtotal = cartSubtotal(items);
  const content = items.length
    ? `<ul class="woocommerce-mini-cart cart_list product_list_widget">${items
        .map((item) => {
          const href = escapeAttr(item.href || "#");
          const image = item.image ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}">` : "";
          const attributes = item.attributes
            ? `<div class="reset-mini-cart-attributes">${Object.values(item.attributes).filter(Boolean).map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</div>`
            : "";
          return `<li class="woocommerce-mini-cart-item mini_cart_item" data-reset-cart-key="${escapeAttr(item.key)}">
            <button type="button" class="remove remove_from_cart_button reset-remove-cart-item" aria-label="Видалити ${escapeAttr(item.name)}" data-reset-cart-key="${escapeAttr(item.key)}">×</button>
            <a href="${href}">${image}${escapeHtml(item.name)}</a>
            ${attributes}
            <span class="quantity">${item.quantity} × <span class="woocommerce-Price-amount amount">${escapeHtml(item.priceText || formatUah(item.price))}</span></span>
          </li>`;
        })
        .join("")}</ul>
        <p class="woocommerce-mini-cart__total total"><strong>Підсумок:</strong> <span class="woocommerce-Price-amount amount">${escapeHtml(formatUah(subtotal))}</span></p>
        <p class="woocommerce-mini-cart__buttons buttons"><a href="/cart/" class="button wc-forward">Кошик</a><a href="/checkout/" class="button checkout wc-forward">Оформити замовлення</a></p>`
    : `<p class="woocommerce-mini-cart__empty-message">Ваш кошик порожній.</p>`;

  document.querySelectorAll<HTMLElement>(".widget_shopping_cart_content").forEach((container) => {
    container.innerHTML = content;
  });
}

function syncCartUi(items = readCartFromStorage()) {
  const count = cartQuantity(items);
  document.documentElement.dataset.resetCartCount = String(count);
  document.body.classList.toggle("vamtam-wc-cart-empty", count === 0);

  document.querySelectorAll<HTMLElement>(".elementor-button-icon-qty, .elementor-menu-cart__toggle .elementor-button-icon-qty").forEach((badge) => {
    badge.textContent = String(count);
    badge.dataset.counter = String(count);
  });

  document.querySelectorAll<HTMLElement>(".elementor-menu-cart__toggle_button").forEach((button) => {
    button.setAttribute("aria-label", count ? `Кошик, товарів: ${count}` : "Кошик порожній");
  });

  renderMiniCart(items);
}

function openCartDrawer(toggle?: HTMLElement) {
  const widgets = [...document.querySelectorAll<HTMLElement>(".elementor-widget-woocommerce-menu-cart")];
  const widget = toggle?.closest<HTMLElement>(".elementor-widget-woocommerce-menu-cart") ?? visible(widgets);
  if (!widget) return;
  const container = widget.querySelector<HTMLElement>(".elementor-menu-cart__container");
  const main = widget.querySelector<HTMLElement>(".elementor-menu-cart__main");
  if (!container || !main) return;
  container.classList.add("reset-cart-open");
  container.setAttribute("aria-hidden", "false");
  main.setAttribute("aria-hidden", "false");
  widget.querySelector<HTMLElement>(".elementor-menu-cart__toggle_button")?.setAttribute("aria-expanded", "true");
  document.documentElement.classList.add("reset-cart-drawer-open");
}

function closeCartDrawer(source?: HTMLElement) {
  const widget = source?.closest<HTMLElement>(".elementor-widget-woocommerce-menu-cart");
  const containers = widget
    ? [widget.querySelector<HTMLElement>(".elementor-menu-cart__container")].filter(Boolean) as HTMLElement[]
    : [...document.querySelectorAll<HTMLElement>(".elementor-menu-cart__container")];
  containers.forEach((container) => {
    container.classList.remove("reset-cart-open");
    container.setAttribute("aria-hidden", "true");
    container.querySelector<HTMLElement>(".elementor-menu-cart__main")?.setAttribute("aria-hidden", "true");
    container.closest<HTMLElement>(".elementor-widget-woocommerce-menu-cart")?.querySelector<HTMLElement>(".elementor-menu-cart__toggle_button")?.setAttribute("aria-expanded", "false");
  });
  document.documentElement.classList.remove("reset-cart-drawer-open");
}

function setMobileMenu(toggle: HTMLElement, open: boolean) {
  const widget = toggle.closest<HTMLElement>(".elementor-widget-nav-menu");
  const nav = widget?.querySelector<HTMLElement>(".elementor-nav-menu--dropdown.elementor-nav-menu__container");
  toggle.classList.toggle("elementor-active", open);
  toggle.setAttribute("aria-expanded", String(open));
  if (nav) {
    nav.classList.toggle("reset-mobile-menu-open", open);
    nav.setAttribute("aria-hidden", String(!open));
  }
  if (widget?.classList.contains("vamtam-has-mobile-disable-scroll")) {
    document.documentElement.classList.toggle("reset-mobile-menu-lock", open);
  }
}

function setSubmenu(trigger: HTMLElement, open: boolean) {
  const id = trigger.getAttribute("aria-controls");
  const submenu = id ? document.getElementById(id) : trigger.parentElement?.querySelector<HTMLElement>(".sub-menu");
  trigger.classList.toggle("highlighted", open);
  trigger.setAttribute("aria-expanded", String(open));
  if (submenu) {
    submenu.setAttribute("aria-hidden", String(!open));
    submenu.setAttribute("aria-expanded", String(open));
    submenu.classList.toggle("reset-submenu-open", open);
  }
}

function showAddedNotice(item: ResetCartItem) {
  let host = document.getElementById("reset-shop-toast");
  if (!host) {
    host = document.createElement("div");
    host.id = "reset-shop-toast";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
  }
  host.textContent = `${item.name} додано до кошика`;
  host.classList.add("reset-shop-toast-visible");
  window.setTimeout(() => host?.classList.remove("reset-shop-toast-visible"), 2200);
}

function addItemAndOpen(item: ResetCartItem, source: HTMLElement) {
  const items = addCartItem(item);
  syncCartUi(items);
  showAddedNotice(item);
  source.classList.add("added");
  openCartDrawer();
}

function setProductTab(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href?.startsWith("#")) return false;
  const panel = document.querySelector<HTMLElement>(href);
  const tabs = anchor.closest<HTMLElement>(".wc-tabs, .woocommerce-tabs");
  if (!panel || !tabs) return false;

  tabs.querySelectorAll("li").forEach((li) => li.classList.remove("active"));
  anchor.closest("li")?.classList.add("active");
  const wrapper = panel.parentElement;
  wrapper?.querySelectorAll<HTMLElement>(".woocommerce-Tabs-panel").forEach((candidate) => {
    candidate.style.display = candidate === panel ? "block" : "none";
  });
  return true;
}

function toggleElementorAccordion(title: HTMLElement) {
  const id = title.getAttribute("aria-controls");
  const content = id ? document.getElementById(id) : title.nextElementSibling as HTMLElement | null;
  if (!content) return false;
  const isOpen = title.classList.contains("elementor-active") || title.getAttribute("aria-expanded") === "true";
  title.classList.toggle("elementor-active", !isOpen);
  title.setAttribute("aria-expanded", String(!isOpen));
  content.classList.toggle("elementor-active", !isOpen);
  content.setAttribute("aria-hidden", String(isOpen));
  content.style.display = isOpen ? "none" : "block";
  return true;
}

function showGalleryLightbox(image: HTMLImageElement) {
  let overlay = document.getElementById("reset-shop-gallery-lightbox") as HTMLDivElement | null;
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "reset-shop-gallery-lightbox";
    overlay.innerHTML = '<button type="button" class="reset-gallery-close" aria-label="Закрити">×</button><img alt="">';
    document.body.append(overlay);
  }
  const target = overlay.querySelector<HTMLImageElement>("img");
  if (target) {
    target.src = image.getAttribute("data-large_image") || image.currentSrc || image.src;
    target.alt = image.alt;
  }
  overlay.classList.add("reset-gallery-lightbox-open");
  document.documentElement.classList.add("reset-gallery-lock");
}

export function StorefrontRuntime() {
  useEffect(() => {
    document.querySelectorAll<HTMLFormElement>("form.variations_form").forEach(updateVariationForm);
    syncCartUi();

    const onCartEvent = () => syncCartUi();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "reset-shop-cart-v1") syncCartUi();
    };
    window.addEventListener(RESET_CART_EVENT, onCartEvent);
    window.addEventListener("storage", onStorage);

    const hoverCleanup: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>(".elementor-nav-menu--main li.menu-item-has-children, .elementor-nav-menu--main li:has(> .has-submenu)").forEach((item) => {
      const trigger = item.querySelector<HTMLElement>(":scope > .has-submenu[aria-controls], :scope > a.has-submenu[aria-controls]");
      if (!trigger) return;
      const enter = () => {
        if (window.matchMedia("(min-width: 1025px)").matches) setSubmenu(trigger, true);
      };
      const leave = () => {
        if (window.matchMedia("(min-width: 1025px)").matches) setSubmenu(trigger, false);
      };
      item.addEventListener("mouseenter", enter);
      item.addEventListener("mouseleave", leave);
      hoverCleanup.push(() => {
        item.removeEventListener("mouseenter", enter);
        item.removeEventListener("mouseleave", leave);
      });
    });

    const onClick = (event: MouseEvent) => {
      const target = asElement(event.target);
      if (!target) return;

      const menuToggle = target.closest<HTMLElement>(".elementor-menu-toggle");
      if (menuToggle) {
        event.preventDefault();
        setMobileMenu(menuToggle, menuToggle.getAttribute("aria-expanded") !== "true");
        return;
      }

      const submenuTrigger = target.closest<HTMLElement>(".elementor-nav-menu--dropdown .has-submenu[aria-controls]");
      if (submenuTrigger && window.matchMedia("(max-width: 1024px)").matches) {
        event.preventDefault();
        setSubmenu(submenuTrigger, submenuTrigger.getAttribute("aria-expanded") !== "true");
        return;
      }

      const cartToggle = target.closest<HTMLElement>("#elementor-menu-cart__toggle_button, .elementor-menu-cart__toggle_button");
      if (cartToggle) {
        event.preventDefault();
        const widget = cartToggle.closest<HTMLElement>(".elementor-widget-woocommerce-menu-cart");
        const container = widget?.querySelector<HTMLElement>(".elementor-menu-cart__container");
        if (container?.classList.contains("reset-cart-open")) closeCartDrawer(cartToggle);
        else openCartDrawer(cartToggle);
        return;
      }

      const closeCart = target.closest<HTMLElement>(".elementor-menu-cart__close-button");
      if (closeCart) {
        event.preventDefault();
        closeCartDrawer(closeCart);
        return;
      }

      const cartBackdrop = target.closest<HTMLElement>(".elementor-menu-cart__container");
      if (cartBackdrop && target === cartBackdrop) {
        closeCartDrawer(cartBackdrop);
        return;
      }

      const remove = target.closest<HTMLElement>(".reset-remove-cart-item[data-reset-cart-key]");
      if (remove) {
        event.preventDefault();
        syncCartUi(removeCartItem(remove.dataset.resetCartKey || ""));
        return;
      }

      const loopAdd = target.closest<HTMLElement>(".add_to_cart_button.ajax_add_to_cart[data-product_id]");
      if (loopAdd) {
        event.preventDefault();
        addItemAndOpen(collectProductFromLoop(loopAdd), loopAdd);
        return;
      }

      const singleAdd = target.closest<HTMLElement>(".single_add_to_cart_button");
      if (singleAdd) {
        const form = singleAdd.closest<HTMLFormElement>("form.cart");
        if (form) {
          event.preventDefault();
          const item = collectProductFromForm(form, singleAdd);
          if (item) addItemAndOpen(item, singleAdd);
          return;
        }
      }

      const quantityButton = target.closest<HTMLElement>(".quantity .plus, .quantity .minus, button.plus, button.minus, input.plus, input.minus");
      if (quantityButton) {
        event.preventDefault();
        const quantity = quantityButton.closest<HTMLElement>(".quantity");
        const input = quantity?.querySelector<HTMLInputElement>("input.qty, input[type='number']");
        if (input) {
          const step = Number(input.step || 1) || 1;
          const min = Number(input.min || 1) || 1;
          const max = Number(input.max || 99) || 99;
          const current = Number(input.value || min) || min;
          const next = quantityButton.classList.contains("minus") ? current - step : current + step;
          input.value = String(Math.max(min, Math.min(max, next)));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return;
      }

      const resetVariations = target.closest<HTMLElement>(".reset_variations");
      if (resetVariations) {
        event.preventDefault();
        const form = resetVariations.closest<HTMLFormElement>("form.variations_form");
        form?.querySelectorAll<HTMLSelectElement>("select[name^='attribute_']").forEach((select) => {
          select.value = "";
        });
        if (form) updateVariationForm(form);
        return;
      }

      const tab = target.closest<HTMLAnchorElement>(".wc-tabs a[href^='#']");
      if (tab && setProductTab(tab)) {
        event.preventDefault();
        return;
      }

      const accordion = target.closest<HTMLElement>(".elementor-accordion .elementor-tab-title, .elementor-toggle .elementor-tab-title, .elementor-accordion-title");
      if (accordion && toggleElementorAccordion(accordion)) {
        event.preventDefault();
        return;
      }

      const thumb = target.closest<HTMLImageElement>(".flex-control-thumbs img");
      if (thumb) {
        event.preventDefault();
        const gallery = thumb.closest<HTMLElement>(".woocommerce-product-gallery");
        const main = gallery?.querySelector<HTMLImageElement>(".woocommerce-product-gallery__image img");
        if (main) {
          main.src = thumb.getAttribute("data-large_image") || thumb.getAttribute("data-src") || thumb.src;
          if (thumb.srcset) main.srcset = thumb.srcset;
          gallery?.querySelectorAll(".flex-control-thumbs li").forEach((li) => li.classList.remove("flex-active-slide"));
          thumb.closest("li")?.classList.add("flex-active-slide");
        }
        return;
      }

      const galleryTrigger = target.closest<HTMLElement>(".woocommerce-product-gallery__trigger");
      if (galleryTrigger) {
        event.preventDefault();
        const image = document.querySelector<HTMLImageElement>(".woocommerce-product-gallery__image img");
        if (image) showGalleryLightbox(image);
        return;
      }

      const galleryClose = target.closest<HTMLElement>(".reset-gallery-close");
      if (galleryClose) {
        document.getElementById("reset-shop-gallery-lightbox")?.classList.remove("reset-gallery-lightbox-open");
        document.documentElement.classList.remove("reset-gallery-lock");
      }
    };

    const onChange = (event: Event) => {
      const target = asElement(event.target);
      if (!(target instanceof HTMLSelectElement)) return;
      const form = target.closest<HTMLFormElement>("form.variations_form");
      if (form) updateVariationForm(form);
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.matches("form.cart")) return;
      const button = form.querySelector<HTMLElement>(".single_add_to_cart_button");
      if (!button) return;
      event.preventDefault();
      const item = collectProductFromForm(form, button);
      if (item) addItemAndOpen(item, button);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCartDrawer();
        document.querySelectorAll<HTMLElement>(".elementor-menu-toggle[aria-expanded='true']").forEach((toggle) => setMobileMenu(toggle, false));
        document.getElementById("reset-shop-gallery-lightbox")?.classList.remove("reset-gallery-lightbox-open");
        document.documentElement.classList.remove("reset-gallery-lock");
      }

      const target = asElement(event.target);
      const menuToggle = target?.closest<HTMLElement>(".elementor-menu-toggle");
      if (menuToggle && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        setMobileMenu(menuToggle, menuToggle.getAttribute("aria-expanded") !== "true");
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener(RESET_CART_EVENT, onCartEvent);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("keydown", onKeyDown);
      hoverCleanup.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
