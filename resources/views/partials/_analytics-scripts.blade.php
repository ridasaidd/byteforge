{{--
    Analytics Scripts Partial — Phase 9.6
    Conditionally injects third-party analytics snippets based on
    per-tenant settings. Include in the <head> (and body for GTM).

    Usage: @include('partials._analytics-scripts', ['settings' => $analyticsSettings ?? null])
--}}

@if(!empty($settings?->ga4_measurement_id))
{{-- ── Google Analytics 4 ─────────────────────────────────────── --}}
<script async src="https://www.googletagmanager.com/gtag/js?id={{ $settings->ga4_measurement_id }}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '{{ $settings->ga4_measurement_id }}');
</script>
@endif

@if(!empty($settings?->gtm_container_id))
{{-- ── Google Tag Manager (head snippet) ─────────────────────── --}}
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','{{ $settings->gtm_container_id }}');
</script>
@endif

@if(!empty($settings?->clarity_project_id))
{{-- ── Microsoft Clarity ───────────────────────────────────────── --}}
<script type="text/javascript">
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window,document,"clarity","script","{{ $settings->clarity_project_id }}");
</script>
@endif

@if(!empty($settings?->plausible_domain))
{{-- ── Plausible Analytics ─────────────────────────────────────── --}}
<script defer data-domain="{{ $settings->plausible_domain }}" src="https://plausible.io/js/script.js"></script>
@endif

@if(!empty($settings?->meta_pixel_id))
{{-- ── Meta Pixel ──────────────────────────────────────────────── --}}
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '{{ $settings->meta_pixel_id }}');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id={{ $settings->meta_pixel_id }}&ev=PageView&noscript=1"
/></noscript>
@endif
