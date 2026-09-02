create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text not null default 'RESET Clinic',
  sku text unique,
  category text not null default 'face' check (category in ('face','body','hair','other')),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  short_description text not null default '',
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'UAH',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  track_stock boolean not null default true,
  size text,
  image_url text,
  secondary_image_url text,
  hover_label text,
  hover_title text,
  hover_text text,
  how_to_use text,
  key_ingredients text[] not null default '{}',
  inci text,
  seo_title text,
  seo_description text,
  seo_keywords text[] not null default '{}',
  featured boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_category_idx on public.products(status, category, sort_order, created_at desc);
create index if not exists products_featured_idx on public.products(featured, status, sort_order);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  invoice_id text unique,
  reference text unique,
  status text not null default 'new' check (status in ('new','awaiting_payment','paid','processing','shipped','completed','cancelled','refunded')),
  payment_status text not null default 'created',
  customer_name text not null default '',
  phone text not null default '',
  email text not null default '',
  delivery_method text not null default 'nova',
  city text not null default '',
  branch text not null default '',
  comment text not null default '',
  tracking_number text,
  subtotal numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'UAH',
  mono_payload jsonb,
  admin_notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(status, payment_status, created_at desc);
create index if not exists orders_invoice_idx on public.orders(invoice_id);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  slug text not null,
  name text not null,
  sku text,
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id, created_at desc);

create table if not exists public.activity_events (
  id bigserial primary key,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_created_idx on public.activity_events(created_at desc);
create index if not exists activity_events_entity_idx on public.activity_events(entity_type, entity_id, created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.activity_events enable row level security;

-- No public policies are intentionally created. Storefront/admin access goes through
-- trusted Next.js server routes using the Supabase service-role key.

insert into public.products (
  slug, name, brand, sku, category, status, short_description, description,
  price, currency, stock_quantity, track_stock, size, hover_label, hover_title,
  hover_text, how_to_use, key_ingredients, inci, seo_title, seo_description,
  featured, sort_order, published_at
)
values (
  'parsley-seed-anti-oxidant-eye-cream',
  'Parsley Seed Anti-Oxidant Eye Cream',
  'Aesop',
  'AESOP-EYE-10',
  'face',
  'active',
  'Делікатний антиоксидантний догляд для зони навколо очей.',
  'Антиоксидантний крем для делікатної зони навколо очей. Допомагає підтримувати зволоженість, комфорт і доглянутий вигляд шкіри.',
  73.00,
  'UAH',
  20,
  true,
  '10 mL',
  'ПРИЗНАЧЕННЯ',
  'Зволоження + антиоксидантний догляд',
  'Для делікатної зони навколо очей',
  'Нанесіть невелику кількість на очищену шкіру навколо очей легкими поплескувальними рухами та м’яко вмасажуйте до поглинання.',
  array['Вітамін C','Вітамін E','Sodium Lactate'],
  'Water (Aqua), Glyceryl Stearate SE, Butyrospermum Parkii (Shea) Butter, Stearyl Alcohol, Glycerin, Simmondsia Chinensis (Jojoba) Seed Oil, Theobroma Cacao (Cocoa) Seed Butter, Cetearyl Alcohol, Sodium Ascorbyl Phosphate, Tocopherol.',
  'Aesop Parsley Seed Anti-Oxidant Eye Cream 10 ml — купити',
  'Купити Aesop Parsley Seed Anti-Oxidant Eye Cream 10 ml у RESET Clinic. Оригінальна продукція, професійний підбір і доставка по Україні.',
  true,
  10,
  now()
)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set public = excluded.public;
