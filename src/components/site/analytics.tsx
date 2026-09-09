import Script from "next/script";

type Props = {
  gaMeasurementId: string;
  gtmContainerId: string;
  metaPixelId: string;
};

/**
 * Analytics — entirely opt-in.
 *
 * Nothing loads unless an administrator saves an ID in Global Settings, so a
 * fresh install ships zero third-party JavaScript. IDs are never hard-coded
 * (brief §24). All tags load with `afterInteractive` so they stay off the
 * critical path and out of the LCP measurement.
 */
export function Analytics({ gaMeasurementId, gtmContainerId, metaPixelId }: Props) {
  const ga = gaMeasurementId.trim();
  const gtm = gtmContainerId.trim();
  const pixel = metaPixelId.trim();

  if (!ga && !gtm && !pixel) return null;

  return (
    <>
      {gtm ? (
        <Script id="df-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`}
        </Script>
      ) : null}

      {ga && !gtm ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`}
            strategy="afterInteractive"
          />
          <Script id="df-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config',${JSON.stringify(ga)},{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {pixel ? (
        <Script id="df-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixel)});fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}

/** GTM's iframe fallback. Rendered first inside <body>. */
export function GtmNoScript({ gtmContainerId }: { gtmContainerId: string }) {
  const gtm = gtmContainerId.trim();
  if (!gtm) return null;
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtm)}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
