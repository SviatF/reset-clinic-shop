"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import logo from "@/assets/img/logo.webp";
import { useCart } from "@/components/CartProvider";

const nav = [
  ["ГОЛОВНА", "/#home"],
  ["ОБЛИЧЧЯ", "/#face"],
  ["ТІЛО", "/#body"],
  ["ВОЛОССЯ", "/#hair"],
  ["СЕРТИФІКАТ", "/#benefits"],
  ["ПРО НАС", "/#about"],
  ["КЛІЄНТУ", "/#footer"],
] as const;

function UserIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3.3"/><path d="M5.5 20c.6-4.3 3-6.4 6.5-6.4s5.9 2.1 6.5 6.4"/></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
}
function BagIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l-1 11H6l-1-11Z"/><path d="M9 8.5V6.7A3 3 0 0 1 12 4a3 3 0 0 1 3 2.7v1.8"/></svg>;
}

export default function Header() {
  const { count } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setSearchOpen(false);
      router.push("/product/parsley-seed-anti-oxidant-eye-cream");
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner shell">
          <Link href="/" className="brand" aria-label="Reset Clinic — головна">
            <Image src={logo} alt="RESET Clinic" priority />
          </Link>
          <nav className="desktop-nav" aria-label="Основна навігація">
            {nav.map(([label, href], index) => <Link key={label} className={index === 0 ? "active" : ""} href={href}>{label}</Link>)}
          </nav>
          <div className="header-actions">
            <Link href="/account" className="icon-btn" aria-label="Особистий кабінет"><UserIcon /></Link>
            <button className="icon-btn" aria-label="Пошук" onClick={() => setSearchOpen(true)}><SearchIcon /></button>
            <Link href="/cart" className="icon-btn bag-btn" aria-label="Кошик"><BagIcon /><span className="cart-count">{count}</span></Link>
            <button className="mobile-toggle" aria-label="Меню" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}><span/><span/></button>
          </div>
        </div>
        {menuOpen && <nav className="mobile-nav" aria-label="Мобільна навігація">{nav.map(([label, href]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}</nav>}
      </header>
      {searchOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Пошук">
          <button className="search-close" onClick={() => setSearchOpen(false)} aria-label="Закрити">×</button>
          <form onSubmit={submitSearch} className="search-form">
            <label htmlFor="site-search">Що шукаєте?</label>
            <div><input id="site-search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Наприклад, крем для очей"/><button type="submit">Знайти</button></div>
          </form>
        </div>
      )}
    </>
  );
}
