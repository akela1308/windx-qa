import type { RequirementsSource } from "./types";
// Проверены вручную по официальным руководствам. Не правовая сертификация.
export const REQUIREMENTS_RULES_VERSION = "uk-2026-11-01-scope.1";
export const REQUIREMENTS_CHECKED_AT = "2026-10-30";
const ico = "https://ico.org.uk/for-organisations/";
export const REQUIREMENTS_SOURCES: Record<string, RequirementsSource> =
  Object.fromEntries(
    [
      [
        "privacy",
        "ICO: privacy notices",
        `${ico}advice-for-small-organisations/privacy-notices-and-cookies/how-to-write-a-privacy-notice-and-what-goes-in-it/`,
      ],
      [
        "location",
        "ICO: where to put a privacy notice",
        `${ico}advice-for-small-organisations/privacy-notices-and-cookies/cookies-and-privacy-notices-in-detail/`,
      ],
      [
        "cookies",
        "ICO: storage and access technology exceptions",
        `${ico}direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/`,
      ],
      [
        "consent",
        "ICO: managing consent in practice",
        `${ico}direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-manage-consent-in-practice/`,
      ],
      [
        "company",
        "GOV.UK: limited company website disclosures",
        "https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material",
      ],
      [
        "llp",
        "GOV.UK: LLP trading disclosures",
        "https://www.gov.uk/government/publications/limited-liability-partnership-incorporation-and-names/limited-liability-partnerships-incorporation-and-names",
      ],
      [
        "provider",
        "UK legislation: service provider information, regulation 6",
        "https://www.legislation.gov.uk/uksi/2002/2013/regulation/6",
      ],
      [
        "business",
        "GOV.UK: incorporation and names, trading disclosures",
        "https://www.gov.uk/government/publications/incorporation-and-names/incorporation-and-names",
      ],
      [
        "sales",
        "GOV.UK: online selling",
        "https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling",
      ],
      [
        "consumer",
        "GOV.UK: distance selling",
        "https://www.gov.uk/online-and-distance-selling-for-businesses/distance-selling",
      ],
      [
        "accessibility",
        "GOV.UK: accessibility requirements and reasonable adjustments",
        "https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps",
      ],
      [
        "regulated",
        "GOV.UK: find licences",
        "https://www.gov.uk/find-licences",
      ],
      [
        "sensitive",
        "ICO: special category data",
        `${ico}uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/special-category-data/`,
      ],
      [
        "children",
        "ICO: children and lawful bases",
        `${ico}uk-gdpr-guidance-and-resources/childrens-information/children-and-the-uk-gdpr/how-do-the-lawful-bases-apply-to-children-s-personal-information/`,
      ],
    ].map(([key, title, url]) => [
      key,
      { key, title, url, checkedAt: REQUIREMENTS_CHECKED_AT },
    ]),
  );
