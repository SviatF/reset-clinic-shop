import Image from "next/image";
import Link from "next/link";
import doctors from "@/assets/img/reset-team-doctors.webp";
import certificate from "@/assets/img/main-certificate.webp";
import partners from "@/assets/img/our-partners.webp";

export default function RealTrustLayer() {
  return (
    <section className="real-trust-layer">
      <div className="shell">
        <div className="real-trust-heading">
          <span>ДОВІРА НЕ ЗІ СЛІВ ~ RESET CLINIC</span>
          <h2>За магазином стоїть клініка, команда та контроль походження продуктів.</h2>
        </div>
        <div className="real-trust-grid">
          <Link href="/philosophy" className="real-trust-card trust-doctors">
            <div className="real-trust-image"><Image src={doctors} alt="Команда лікарів RESET Clinic" /></div>
            <div><span>01 · КОМАНДА</span><strong>Професійний підбір не відділений від клінічної експертизи.</strong><p>Знайомтесь із підходом RESET та принципами формування догляду.</p></div>
          </Link>
          <Link href="/certificate" className="real-trust-card trust-certificate">
            <div className="real-trust-image"><Image src={certificate} alt="Сертифікат RESET Clinic" /></div>
            <div><span>02 · КОНТРОЛЬ</span><strong>Оригінальність і відповідальне зберігання — базова умова.</strong><p>Ми не будуємо довіру на випадковому асортименті чи «хайпових» баночках.</p></div>
          </Link>
          <Link href="/advantages" className="real-trust-card trust-partners">
            <div className="real-trust-image"><Image src={partners} alt="Партнери RESET Clinic" /></div>
            <div><span>03 · ПАРТНЕРИ</span><strong>Працюємо з професійним середовищем та офіційними каналами.</strong><p>Дивіться, як RESET підходить до вибору брендів і продуктів.</p></div>
          </Link>
        </div>
      </div>
    </section>
  );
}
