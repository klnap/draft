/** Distinct from Payload’s external-link icon (live preview “open in new window”). */
export function PublishedSiteIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={['icon icon--publishedSite', className].filter(Boolean).join(' ')}
      height='1em'
      viewBox='0 0 20 20'
      width='1em'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M0 0h20v20H0z' fill='none' />
      <path
        d='M2.94 2.93a10 10 0 0 0 0 14.14l1.4-1.4a8 8 0 0 1 0-11.34zm14.12 0a10 10 0 0 1 0 14.14l-1.4-1.4a8 8 0 0 0 0-11.34zM5.76 5.76a6 6 0 0 0 0 8.48l1.4-1.4a4 4 0 0 1 0-5.68zm8.48 0a6 6 0 0 1 0 8.48l-1.4-1.4a4 4 0 0 0 0-5.68z'
        fill='currentColor'
      />
      <circle cx='10' cy='10' fill='currentColor' r='2' />
    </svg>
  )
}
