<template id="appleT">
  <defs>
    <clipPath id="CLIPID"><path d="M100 62 C86 48 58 44 40 58 C18 76 18 118 30 146 C42 176 64 200 84 200 C92 200 95 196 100 196 C105 196 108 200 116 200 C136 200 158 176 170 146 C182 118 182 76 160 58 C142 44 114 48 100 62 Z"></path></clipPath>
    <linearGradient id="GRADID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2444c"></stop><stop offset=".55" stop-color="#d81f29"></stop><stop offset="1" stop-color="#981018"></stop></linearGradient>
    <linearGradient id="SWEEPID" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"></stop><stop offset=".5" stop-color="#fff" stop-opacity=".55"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></linearGradient>
  </defs>
  <g class="all">
    <path class="stem" d="M100 64 C100 50 98 40 93 30" fill="none" stroke="#5a3a1a" stroke-width="7" stroke-linecap="round"></path>
    <path class="leaf" d="M104 52 C108 30 126 16 150 14 C146 38 128 52 104 52 Z" fill="#30b04a"></path>
    <path class="body" d="M100 62 C86 48 58 44 40 58 C18 76 18 118 30 146 C42 176 64 200 84 200 C92 200 95 196 100 196 C105 196 108 200 116 200 C136 200 158 176 170 146 C182 118 182 76 160 58 C142 44 114 48 100 62 Z" fill="url(#GRADID)"></path>
    <g clip-path="url(#CLIPID)">
      <rect class="band" x="0" y="121" width="200" height="13" fill="#fff"></rect>
      <rect class="sweep" x="-140" y="0" width="90" height="220" fill="url(#SWEEPID)" transform="skewX(-18)"></rect>
    </g>
    <circle class="ring" cx="100" cy="127" r="41" fill="#fff"></circle>
    <circle class="lens" cx="100" cy="127" r="32" fill="#0b0b0c"></circle>
    <circle class="hl" cx="113" cy="114" r="8.5" fill="#fff"></circle>
  </g>
</template>