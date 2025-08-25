import React from 'react';

import { getAllContent } from '../content/loader';

interface Props {
  active?: string;
}

export function SiteNav({ active }: Props) {
  const pages = getAllContent().filter((p) => !p.frontmatter.hero);
  return (
    <nav aria-label="Site Sections" className="site-nav">
      <ul>
        {pages.map((p) => {
          const slug = p.frontmatter.slug;
          const isActive = active === slug;
          return (
            <li key={slug} className={isActive ? 'active' : undefined}>
              <a href={`#${slug}`} aria-current={isActive ? 'true' : undefined}>
                {p.frontmatter.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
