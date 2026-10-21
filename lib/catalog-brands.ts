export type StoreBrand={id:string;slug:string;name:string;status:"active"|"hidden";sort_order:number;lines:string[]};
export const DEFAULT_BRANDS:StoreBrand[]=[
  {
    "id": "aesop",
    "slug": "aesop",
    "name": "Aesop",
    "status": "active",
    "sort_order": 10,
    "lines": []
  },
  {
    "id": "oliere-paris",
    "slug": "oliere-paris",
    "name": "OLIE'RE PARIS",
    "status": "active",
    "sort_order": 20,
    "lines": []
  },
  {
    "id": "dermafirm",
    "slug": "dermafirm",
    "name": "Dermafirm",
    "status": "active",
    "sort_order": 30,
    "lines": [
      "Peptology",
      "UV-Derm",
      "Age Reviving A4",
      "The Peptide P4",
      "Moist Barrier M4",
      "Soothing Repair R4",
      "CICAA-C",
      "Special Care"
    ]
  },
  {
    "id": "braderm",
    "slug": "braderm",
    "name": "Braderm",
    "status": "active",
    "sort_order": 40,
    "lines": []
  }
];
