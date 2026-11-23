import type { Metadata } from "next";
import AdminPaymentTestClient from "@/components/AdminPaymentTestClient";
import "@/app/admin-payment-test.css";

export const metadata: Metadata = {
  title: "Тестова оплата · RESET Clinic Admin",
  robots: { index:false,follow:false,noarchive:true,nocache:true }
};
export const dynamic="force-dynamic";

export default function PaymentTestPage(){
  return <AdminPaymentTestClient />;
}
