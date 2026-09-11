# ERPNext Label Printing

ERPNext v16 custom app for direct Zebra ZPL-II label printing from ERPNext documents.

## Design principles

- One printer master: **Manage Printer**. No separate Printer Model or User Printer Preference documents.
- DPI, media, print speed, darkness and printer offsets are configured in Manage Printer. Manage Printer's **Maximum Printable Width** is a capability ceiling only.
- Each **Label Template** defines its own physical Label Width / Label Height, since one printer is commonly loaded with different label stock for different jobs (e.g. a small serial-number label vs. a larger shipping label) — templates are validated against the printer's maximum width, not forced to a single printer-wide size.
- ERPNext parent fields and child-table item fields are discovered automatically.
- **Print buttons are fully generic and data-driven.** Any DocType gets a "Print Labels" group automatically the moment it has an Active Label Template — no custom JS or hooks.py changes needed per DocType. A single DocType can carry several active templates at once (e.g. "Print Shipping Label" + "Print Serial Number Label" on the same Delivery Note), each with its own button name set on the template (**Print Button Label**).
- A template with a **Label Data / Child DocType** set prints per row/serial (gathered from the parent form, with a selection dialog); a template with it left blank prints one label per document (asking how many copies for multi-carton/pallet cases).
- Every DocType with active templates, plus **Serial No**, gets a generic **Reprint / Damaged Label** button that looks up the exact template, version and printer originally used and reprints against a required reason.
- Zebra Browser Print is used for workstation USB/network printing; PDF is not the normal print path.

## Core documents

- Manage Printer
- Label Template
- Label Template Object
- Label Print Job
- Label Print Job Item
- Label Print Log

## Zebra ZD230 starter configuration

When Printer Model is set to `Zebra ZD230`, the app pre-populates common starting values:

- 203 DPI
- Browser Print - USB
- Gap / Notch media
- Direct Thermal
- 4 IPS
- Darkness 10
- Code page 0 (USA1, safe single-byte ASCII default; see Manage Printer's Code Page field for other options)
- Home/offset values 0

The physical label width and height are deliberately entered by the user because they depend on the actual label stock. Zebra documents a 104 mm maximum print width for the 203 DPI ZD230 and the ZD200-series guide documents 4 IPS and darkness 10 as defaults. Always qualify the actual media and calibrate before production use.

## Label Designer

Open **Label Template → Design → Open Designer**.

The designer provides a clean two-column workspace with:

- live label preview
- ERPNext parent field selection
- ERPNext child/item field selection
- Text, DataMatrix, QR Code, Image, Line and Rectangle
- X/Y/width/height in mm
- rotation and font size
- layer order
- immediate preview while editing
- layout validation

For Purchase Receipt, select `Purchase Receipt` and child table `items`. The designer then exposes fields from the Purchase Receipt and Purchase Receipt Item DocTypes.

## Print buttons on any DocType

To add labels to a new DocType (e.g. Delivery Note for shipping labels), no code is needed:

1. Create a **Label Template**, set **Parent ERPNext DocType**, optionally a **Label Data / Child DocType** (leave blank for a document-level label), design it, set a **Print Button Label** (e.g. "Print Shipping Label"), and set Status to Active.
2. Open that DocType's form — the button appears automatically under a **Labels** group.

Row/serial templates also add a small **Print** button inside the relevant grid row, and a document-level template asks how many labels to print (useful for multi-carton shipments, printing `{doc name}-1`, `{doc name}-2`, ... as separate label identities).

A **Reprint / Damaged Label** button appears next to the Print buttons on any DocType that has an active template, and always on **Serial No**. It looks up exactly which template, version and printer produced the original label and reprints it against a required reason, recorded in **Label Print Log**.

## Installation / update

```bash
cd ~/frappe-bench/apps/label_printing
git pull origin main

cd ~/frappe-bench
bench --site erp.sundaramtech.com migrate
bench --site erp.sundaramtech.com clear-cache
bench build
bench restart
```

## Browser Print

Zebra Browser Print must be installed and running on the workstation that has access to the Zebra printer. The ERPNext server does not need direct USB access to the printer.
