import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/img/logo.webp";
import ptsLogo from "@/assets/img/logo_pts.webp";

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="footer-shell shell">
        <div className="footer-brand-row">
          <Link href="/" className="footer-logo"><Image src={logo} alt="RESET Clinic" /></Link>
          <div className="footer-manifesto">
            <span>RESET CLINIC · LVIV</span>
            <h2>Професійний догляд.<br /><em>Відібраний клінікою.</em></h2>
          </div>
        </div>
        <div className="footer-categories">
          <Link href="/face">ОБЛИЧЧЯ</Link><span />
          <Link href="/body">ТІЛО</Link><span />
          <Link href="/hair">ВОЛОССЯ</Link>
        </div>
        <div className="footer-main">
          <div className="footer-contact">
            <small>RESET SUPPORT</small>
            <a href="tel:+380932828888">+380 (93) 282 88 88</a>
            <a href="mailto:reset.clinic.lviv@gmail.com">RESET.CLINIC.LVIV@GMAIL.COM</a>
          </div>
          <div className="footer-column"><strong>ПРО НАС</strong><Link href="/philosophy">Філософія</Link><Link href="/advantages">Переваги</Link></div>
          <div className="footer-column"><strong>МАГАЗИН</strong><Link href="/face">Обличчя</Link><Link href="/body">Тіло</Link><Link href="/hair">Волосся</Link></div>
          <div className="footer-column"><strong>КЛІЄНТУ</strong><Link href="/clients/delivery">Доставка</Link><Link href="/clients/returns">Повернення</Link><Link href="/clients/faq">FAQ</Link><Link href="/contacts">Контакти</Link></div>
          <div className="footer-credit"><span>DESIGN & DEVELOPMENT</span><Image src={ptsLogo} alt="PTS Cooperation" className="footer-credit-logo" /></div>
        </div>
        <div className="footer-bottom">
          <span>Copyright © 2026 Reset Clinic. Усі права захищені.</span>
          <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">◎</a>
          <div><Link href="/clients/faq">Політика конфіденційності</Link><Link href="/clients/returns">Публічна оферта</Link></div>
        </div>
      </div>
    </footer>
  );
}
