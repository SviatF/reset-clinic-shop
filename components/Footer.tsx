import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/img/logo.webp";
import ptsLogo from "@/assets/img/logo_pts.webp";

export default function Footer() {
  return (
    <footer className="footer precision-footer" id="footer">
      <div className="footer-shell shell">
        <div className="precision-footer-top">
          <Link href="/" className="footer-logo"><Image src={logo} alt="RESET Clinic" /></Link>
          <div className="precision-footer-message">
            <h2>Професійний догляд без зайвого.</h2>
            <p>Обирайте самостійно або отримайте допомогу косметолога RESET.</p>
            <Link href="/consultation">Підібрати догляд →</Link>
          </div>
        </div>

        <div className="footer-main">
          <div className="footer-contact">
            <small>КОНТАКТИ</small>
            <a href="tel:+380932828888">+380 (93) 282 88 88</a>
            <a href="mailto:reset.clinic.lviv@gmail.com">reset.clinic.lviv@gmail.com</a>
          </div>
          <div className="footer-column"><strong>МАГАЗИН</strong><Link href="/face">Обличчя</Link><Link href="/body">Тіло</Link><Link href="/hair">Волосся</Link><Link href="/certificate">Сертифікат</Link></div>
          <div className="footer-column"><strong>ПРО RESET</strong><Link href="/philosophy">Філософія</Link><Link href="/advantages">Переваги</Link><Link href="/contacts">Контакти</Link></div>
          <div className="footer-column"><strong>КЛІЄНТУ</strong><Link href="/clients/delivery">Доставка</Link><Link href="/clients/returns">Повернення</Link><Link href="/clients/faq">FAQ</Link></div>
          <div className="footer-credit"><span>DESIGN & DEVELOPMENT</span><Image src={ptsLogo} alt="PTS Cooperation" className="footer-credit-logo" /></div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 RESET Clinic</span>
          <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">Instagram ↗</a>
          <div><Link href="/clients/faq">Політика конфіденційності</Link><Link href="/clients/returns">Публічна оферта</Link></div>
        </div>
      </div>
    </footer>
  );
}
