export const assets = {
  manifest: "/assets/assets-manifest.json",
  brand: {
    symbol: "/assets/brand/symbols/brand-symbol-primary.svg",
    symbolMonochrome: "/assets/brand/symbols/brand-symbol-monochrome.svg",
    logo: {
      light: "/assets/brand/logos/brand-logo-horizontal-light.svg",
      dark: "/assets/brand/logos/brand-logo-horizontal-dark.svg"
    }
  },
  appIcons: {
    master: "/assets/app-icons/app-icon-master.svg",
    favicon: "/assets/app-icons/favicon.svg",
    favicon32: "/assets/app-icons/favicon-32.png",
    appleTouch180: "/assets/app-icons/apple-touch-icon-180.png"
  },
  social: {
    openGraphDefault: "/assets/social/social-open-graph-default.webp"
  },
  illustrations: {
    empty: {
      devices: "/assets/illustrations/empty-states/illustration-empty-devices.svg",
      history: "/assets/illustrations/empty-states/illustration-empty-history.svg"
    },
    errors: {
      offline: "/assets/illustrations/errors/illustration-error-offline.svg",
      audioPermission: "/assets/illustrations/errors/illustration-error-audio-permission.svg"
    },
    success: {
      deviceAuthorized: "/assets/illustrations/success/illustration-success-device-authorized.svg"
    },
    onboarding: {
      pushToTalk: "/assets/illustrations/onboarding/illustration-onboarding-push-to-talk.svg"
    }
  }
} as const;

export type AssetRegistry = typeof assets;
