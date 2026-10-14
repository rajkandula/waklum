import { redirect } from 'next/navigation';

// Billing lives at /dashboard/billing (plans are per user). This older
// per-workspace page showed placeholder usage numbers; keep the URL working.
export default function SettingsBillingRedirect() {
  redirect('/dashboard/billing');
}
