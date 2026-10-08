import React from 'react'

/**
 * Yazaki Logo Badge & Full Logo components.
 * With clean solid white background so the full Yazaki identity is crisp and distinct.
 */
export function YazakiEmblem({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 602.25 94.3"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Official Yazaki Corporation Symbol + Wordmark */}
      <g transform="translate(-63.98816,-483.85435)">
        <g transform="matrix(0.67987825,0,0,0.67987825,73.704242,173.51501)">
          <g transform="matrix(5.1539048,0,0,5.1539048,-694.56955,-721.08885)">
            {/* Red Arrowhead Symbol */}
            <g transform="matrix(1.25,0,0,-1.25,131.99286,228.47763)">
              <path
                style={{ fill: '#ed1c24', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
                d="M 0,0 44.242,0 41.63,-1.359 41.625,-10.514 37.24,-18.708 38.912,-21.53 0,0"
              />
            </g>
            {/* Letters YAZAKI */}
            <g transform="matrix(1.25,0,0,-1.25,264.91661,232.58138)">
              <path
                style={{ fill: '#231f20', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
                d="m 0,0 -0.052,0 -2.388,-4.427 4.743,0 L 0,0 m -3.835,-6.994 -1.047,-2.368 -5.371,0 6.476,12.606 7.228,0 6.649,-12.606 -5.399,0 -1.029,2.368 -7.507,0"
              />
            </g>
            <g transform="matrix(1.25,0,0,-1.25,222.43786,232.58138)">
              <path
                style={{ fill: '#231f20', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
                d="m 0,0 -0.052,0 -2.388,-4.427 4.743,0 L 0,0 m -3.835,-6.994 -1.047,-2.368 -5.373,0 6.476,12.606 7.229,0 6.649,-12.606 -5.399,0 -1.029,2.368 -7.506,0"
              />
            </g>
            <g transform="matrix(1.25,0,0,-1.25,289.61286,228.52763)">
              <path
                style={{ fill: '#231f20', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
                d="m 0,0 4.875,0 -5.069,-5.185 6.323,-7.421 -5.226,0 -6.589,7.407 -0.04,-1.94 0,-5.467 -3.931,0 0,12.606 3.931,0 0,-5.199 0.04,0 L 0,0"
              />
            </g>
            <path
              style={{ fill: '#231f20', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
              d="m 298.87786,244.28513 4.98988,0 0,-15.75875 -4.98988,0 0,15.75875 z"
            />
            <g transform="matrix(1.25,0,0,-1.25,251.76661,232.15013)">
              <path
                style={{ fill: '#231f20', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
                d="m 0,0 0,2.898 -13.324,0 0,-2.657 7.368,0 -7.298,-6.948 0,-3.001 13.351,0 0,2.538 -7.25,0 L 0,0"
              />
            </g>
            <g transform="matrix(1.25,0,0,-1.25,213.63286,228.47763)">
              <path
                style={{ fill: '#231f20', fillOpacity: 1, fillRule: 'nonzero', stroke: 'none' }}
                d="m 0,0 -5.104,0 -3.35,-4.442 -3.348,4.442 -5.103,0 6.427,-8.514 0,-4.132 3.954,0 0,4.132 L 0,0"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

/**
 * Yazaki Logo Badge with clean white background card
 */
export function YazakiBadge({ className = 'h-10 px-2' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl bg-white shadow-md shadow-black/20 border border-white/80 overflow-hidden select-none ${className}`}
    >
      <img
        src="/yazaki-logo.jpg"
        alt="Yazaki PT Jatim Autocomp Indonesia Logo"
        className="h-full w-auto max-h-8 object-contain"
      />
    </div>
  )
}

export function YazakiFullLogo({ className = 'h-6 w-auto' }: { className?: string }) {
  return (
    <img
      src="/yazaki-logo.svg"
      alt="Yazaki Logo"
      className={className}
    />
  )
}
