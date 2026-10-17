/** The arrow follows the same arc as its drawing; motion is scoped by the bar. */
export function UtilityReturnIcon({className}: {className: string}) {
  return <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path className="utility-return-arc" pathLength="1" d="M4 12 A8 8 0 1 0 12 4 H4"/>
    <path className="utility-return-tip" d="M-2.5-2.5 0 0-2.5 2.5"/>
  </svg>;
}
