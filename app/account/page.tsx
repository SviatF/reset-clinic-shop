import AccountPanel from "@/components/AccountPanel";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <section className="account-page">
      <div className="shell">
        <AccountPanel />
      </div>
    </section>
  );
}
