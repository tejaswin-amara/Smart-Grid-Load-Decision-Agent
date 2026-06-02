# 🎨 FRONTEND GOVERNANCE (v13.0.0-PRODUCTION HARDENED)

## ⚡ CORE STACK
- **Framework**: Next.js 15 (Enterprise Tier)
- **Design Engineering**: Framer Motion + MagicUI + SpectrumUI
- **Data Architecture**: TanStack Query + Server Actions

## ⚖️ DESIGN ENGINEERING LAW
1.  **Premium Animation**: Use `MagicUI` for high-impact entry animations and `SpectrumUI` for bento-style layouts. 
2.  **Micro-Interactions**: Every button, input, and card MUST have a subtle physical response (scale, shadow, or bloom) on hover/tap.
3.  **Visual Depth**: Use glassmorphism (backdrop-blur) and mesh gradients for depth. Avoid flat, generic UI elements.
4.  **A11y & Performance**: Premium aesthetics MUST NOT compromise accessibility or LCP. Use optimized images and SVGs.

## 🛡️ SENTINEL COMPLIANCE
- The Sentinel Audit checks for component accessibility and motion performance.
- Any UI addition without a micro-interaction is flagged as "Incomplete."
