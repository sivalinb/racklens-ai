/* oxlint-disable next/no-html-link-for-pages -- Vinext production routing requires full document navigation between routes. */
import type { ReactNode } from 'react';
import { Activity, ChevronDown } from 'lucide-react';

type SitePath =
  | '/'
  | '/studio'
  | '/dashboard'
  | '/ai-observability'
  | '/platform'
  | '/cloud-lab'
  | '/architecture';

interface SiteHeaderProps {
  activePath: SitePath;
  pageLabel: string;
  actions?: ReactNode;
}

const exploreItems = [
  {
    href: '/studio',
    label: '3D Studio',
    description: 'Navigate facilities, racks and GPUs',
  },
  {
    href: '/dashboard',
    label: 'Redfish Dashboard',
    description: 'Inspect hardware telemetry and events',
  },
  {
    href: '/ai-observability',
    label: 'AI Observability',
    description: 'Review traces, RAG and evaluations',
  },
] as const;

const labItems = [
  {
    href: '/platform',
    label: 'Product Lab',
    description: 'Explore the five-week learning path',
  },
  {
    href: '/cloud-lab',
    label: 'OCI Cloud Lab',
    description: 'See cloud telemetry and evaluation proof',
  },
] as const;

const aboutItems = [
  {
    href: '/architecture',
    label: 'Architecture',
    description: 'Follow the end-to-end system flow',
  },
  {
    href: '/#workflow',
    label: 'How it works',
    description: 'Understand the investigation workflow',
  },
  {
    href: '/#safety',
    label: 'Safety',
    description: 'Review the read-only operating boundary',
  },
] as const;

function MenuGroup({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <details className={`site-menu ${active ? 'is-active' : ''}`}>
      <summary>
        {label}
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="site-submenu">{children}</div>
    </details>
  );
}

function MenuLink({
  href,
  label,
  description,
  active,
}: {
  href: string;
  label: string;
  description: string;
  active: boolean;
}) {
  return (
    <a className={active ? 'is-active' : ''} href={href}>
      <span>{label}</span>
      <small>{description}</small>
    </a>
  );
}

export function SiteHeader({
  activePath,
  pageLabel,
  actions,
}: SiteHeaderProps) {
  const exploreActive = exploreItems.some((item) => item.href === activePath);
  const labsActive = labItems.some((item) => item.href === activePath);
  const aboutActive = activePath === '/architecture';

  return (
    <header className="site-header">
      <div className="site-header-identity">
        <a className="site-header-brand" href="/" aria-label="RackLens home">
          <span>
            <Activity aria-hidden="true" />
          </span>
          <div>
            <strong>RackLens</strong>
            <small>AI RELIABILITY</small>
          </div>
        </a>
        <span className="site-header-context">{pageLabel}</span>
      </div>

      <nav className="site-primary-nav" aria-label="Primary navigation">
        <a className={activePath === '/' ? 'is-active' : ''} href="/">
          Home
        </a>
        <MenuGroup label="Explore" active={exploreActive}>
          {exploreItems.map((item) => (
            <MenuLink
              {...item}
              active={activePath === item.href}
              key={item.href}
            />
          ))}
        </MenuGroup>
        <MenuGroup label="Labs" active={labsActive}>
          {labItems.map((item) => (
            <MenuLink
              {...item}
              active={activePath === item.href}
              key={item.href}
            />
          ))}
        </MenuGroup>
        <MenuGroup label="About" active={aboutActive}>
          {aboutItems.map((item) => (
            <MenuLink
              {...item}
              active={activePath === item.href}
              key={item.href}
            />
          ))}
        </MenuGroup>
      </nav>

      {actions ? <div className="site-header-actions">{actions}</div> : null}
    </header>
  );
}
