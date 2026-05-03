// src/collaboration/presence/deviceProfile.js
// Detect device type and derive collaboration capabilities

const DEFAULT_PROPERTIES = [
  "camera",
  "filters",
  "annotations",
  "widgets",
  "colorMaps",
];

const XR_PROPERTIES = ["camera", "annotations"];

function getUserAgent() {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

function detectDeviceTypeFromUA(ua) {
  const uaLower = ua.toLowerCase();
  if (/(oculus|quest|vive|valve|pico|meta)/.test(uaLower)) {
    return "vr";
  }
  if (/(hololens|magic leap|vision pro|ar)/.test(uaLower)) {
    return "ar";
  }
  return "desktop";
}

function buildProfile(deviceType, xrCapable = false) {
  let properties = DEFAULT_PROPERTIES;
  if (deviceType === "vr" || deviceType === "ar") {
    properties = XR_PROPERTIES;
  }

  return {
    deviceType,
    deviceLabel: deviceType === "vr" ? "VR" : deviceType === "ar" ? "AR" : "Desktop",
    xrCapable,
    capabilities: {
      modality: deviceType,
      properties,
    },
  };
}

function toPropertySet(profile) {
  return new Set(profile?.capabilities?.properties || []);
}

export function detectDeviceProfile() {
  const ua = getUserAgent();
  const deviceType = detectDeviceTypeFromUA(ua);

  return buildProfile(deviceType, false);
}

export async function detectXrCapability() {
  if (typeof navigator === "undefined") return null;
  if (!navigator.xr || typeof navigator.xr.isSessionSupported !== "function") {
    return null;
  }

  try {
    const vrSupported = await navigator.xr.isSessionSupported("immersive-vr");
    const arSupported = await navigator.xr.isSessionSupported("immersive-ar");
    if (!vrSupported && !arSupported) return null;

    if (vrSupported) {
      return buildProfile("vr", true);
    }
    if (arSupported) {
      return buildProfile("ar", true);
    }
  } catch (error) {
    return null;
  }

  return null;
}

export function getCapabilityOverlap(leftProfile, rightProfile) {
  const left = toPropertySet(leftProfile);
  const right = toPropertySet(rightProfile);

  return [...left].filter((property) => right.has(property));
}

export function getCapabilityDelta(leftProfile, rightProfile) {
  const left = toPropertySet(leftProfile);
  const right = toPropertySet(rightProfile);

  return {
    leftOnly: [...left].filter((property) => !right.has(property)),
    rightOnly: [...right].filter((property) => !left.has(property)),
  };
}

export function negotiateSharedCapabilities(leftProfile, rightProfile) {
  const overlap = getCapabilityOverlap(leftProfile, rightProfile);
  const delta = getCapabilityDelta(leftProfile, rightProfile);

  return {
    modality: [leftProfile?.deviceType, rightProfile?.deviceType]
      .filter(Boolean)
      .join("↔"),
    sharedProperties: overlap,
    limited: delta.leftOnly.length > 0 || delta.rightOnly.length > 0,
    ...delta,
  };
}

export default detectDeviceProfile;
