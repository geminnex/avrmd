import { readDataFile } from "./data-file";

/**
 * Medical devices the US FDA has authorized that use augmented or virtual
 * reality, copied from the FDA's own published list by
 * scripts/import-fda-xr.mjs (run daily by the discovery robot). Rows are
 * the regulator's words, not ours: they carry no AVRMD review state, and a
 * clearance is not an endorsement of clinical effectiveness.
 */
export type FdaDevice = {
  submission: string;
  name: string;
  company: string;
  panel: string;
  productCode: string;
  decisionDate: string;
  fdaUrl: string;
};

export type FdaDeviceList = {
  sourceUrl: string;
  sourceUpdated: string | null;
  retrieved: string;
  devices: FdaDevice[];
};

const emptyList: FdaDeviceList = { sourceUrl: "", sourceUpdated: null, retrieved: "", devices: [] };

export function getFdaDeviceList() {
  return readDataFile<FdaDeviceList>("fda-xr-devices.json", emptyList);
}

/**
 * Which catalog record an FDA row belongs to. Checked by hand against the
 * FDA entries and the record; a rule matches on the applicant, optionally
 * narrowed by device name when one company has several records.
 */
export const fdaRecordLinks: { company: RegExp; name?: RegExp; slug: string }[] = [
  { company: /^AppliedVR/i, name: /RelieVRx|EaseVRx/i, slug: "relievrx" },
  { company: /^Surgical Theater/i, slug: "surgical-theater-xr" },
  { company: /^SentiAR/i, slug: "sentiar" },
  { company: /^MindMaze/i, slug: "mindmaze-therapeutics" },
  { company: /^PrecisionOS/i, slug: "precisionos" },
  { company: /^Apple Inc/i, slug: "apple-vision-pro" },
];

export function linkedRecordSlug(device: Pick<FdaDevice, "company" | "name">) {
  return fdaRecordLinks.find(
    (link) => link.company.test(device.company) && (!link.name || link.name.test(device.name)),
  )?.slug;
}

export function getFdaDevicesForRecord(slug: string) {
  return getFdaDeviceList().devices.filter((device) => linkedRecordSlug(device) === slug);
}

/** Applicant spellings vary ("Surgical Theater, LLC" / "SURGICAL THEATER, LLC"). */
export function companyKey(company: string) {
  return company
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|ltd|llc|corp|corporation|co|gmbh|sas|srl|ag|sa|limited|bv|ab|plc|pty)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type FdaFilter = { panel?: string; year?: string; q?: string };

export function filterFdaDevices(devices: FdaDevice[], filter: FdaFilter) {
  const needle = filter.q?.trim().toLowerCase();
  return devices.filter((device) => {
    if (filter.panel && device.panel !== filter.panel) return false;
    if (filter.year && !device.decisionDate.startsWith(filter.year)) return false;
    if (
      needle &&
      !`${device.name} ${device.company} ${device.submission}`.toLowerCase().includes(needle)
    )
      return false;
    return true;
  });
}
