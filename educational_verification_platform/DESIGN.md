---
name: Educational Verification Platform
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002114'
  on-tertiary-container: '#069669'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Source Sans 3
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-lg:
    fontFamily: Source Sans 3
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Source Sans 3
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Source Sans 3
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a clean, trustworthy, and transparent environment for educational verification. The visual identity bridges institutional authority with modern digital efficiency, projecting absolute reliability to students, academic institutions, and employers alike. 

We embrace a **Corporate / Modern** design style characterized by systematic structure, clear information architecture, and unobtrusive functionality. The UI evokes feelings of security, precision, and confidence, ensuring that sensitive credential data is presented with utmost clarity and zero ambiguity.

## Colors

The color palette is anchored by deep navy blue for primary structural elements, communicating institutional weight and security. Vibrant trust blue serves as the primary interactive accent, guiding users smoothly through verification workflows. Verified emerald green is reserved exclusively for successful status indicators and authenticated credentials. Crisp light gray backgrounds maintain high legibility and an airy, uncluttered aesthetic, paired with high-contrast dark text to meet rigorous accessibility standards.

## Typography

Typography is built on a clean, highly legible humanist sans-serif foundation optimized for dense data presentation and readability. Headlines maintain strong geometric presence for clear document hierarchy, while body and label styles prioritize scannability across diverse credential types. Ensure text scaling respects standard viewport limitations, dropping large display sizes gracefully on mobile displays.

## Layout & Spacing

The layout relies on a strict 12-column fluid grid system designed to organize complex academic records and verification logs logically. 

- **Desktop:** 12-column layout with generous outer margins (`2rem`) and consistent gutters (`1.5rem`) to prevent visual crowding.
- **Tablet:** Adapts to an 8-column flexible grid with scaled padding, preserving structural alignment for tables and summary cards.
- **Mobile:** Collapses to a single-column fluid view where interactive elements span full width for effortless touch interaction. Content reflow prioritizes critical verification status at the top of the viewport.

## Elevation & Depth

Visual hierarchy is communicated through subtle tonal layering and low-contrast outlines rather than heavy shadows, reflecting a modern enterprise sensibility. 
- **Surfaces:** Use crisp, light gray background containers against pure white cards to separate distinct data groups.
- **Borders:** Apply fine, high-contrast neutral borders to delineate input fields and credential modules.
- **Shadows:** Restrict soft ambient shadows exclusively to floating action elements, persistent navigation headers, and modal dialogs to establish clear z-index layering.

## Shapes

The shape language employs a soft, restrained geometric geometry (`0.25rem` base roundedness, scaling up to `0.5rem` and `0.75rem` for larger containers). This precise balance avoids overly playful pill shapes while eliminating harsh 90-degree industrial corners, striking a trustworthy, institutional chord appropriate for official credentials.

## Components

- **Buttons:** Primary actions utilize deep navy or trust blue fills with crisp typography and subtle hover states. Secondary and ghost variants provide clear alternatives for lower-priority actions.
- **Chips:** Used for credential status tags. Verified states must always use the emerald green accent with matching low-opacity backgrounds; pending or expired states use neutral or warning tones.
- **Lists:** Structured data lists must alternate subtle background rows or use clear horizontal dividers to ensure dense academic histories remain scannable.
- **Checkboxes & Radio Buttons:** Designed with high-contrast borders and clear internal selection indicators for multi-credential selection workflows.
- **Input Fields:** Generous touch targets with clear floating labels, persistent helper text, and distinct error states to prevent verification drop-off.
- **Cards:** Accessible containers featuring clean white backgrounds, fine borders, and internal padding matching `space-lg`, used to encapsulate individual degree or certification records.
- **Data Tables:** Specialized components featuring aligned tabular figures, sticky headers for long transcripts, and integrated search filters.