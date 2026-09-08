# ERPNext Label Printing

ERPNext v16 custom app for direct Zebra ZPL-II label printing from ERPNext documents.

## Design principles

- One printer master: **Manage Printer**. No separate Printer Model or User Printer Preference documents.
- Label size, DPI, media, print speed, darkness and printer offsets are configured only in Manage Printer.
- Label Template reads physical width/height from its selected printer; those values are read-only in the template.
- ERPNext parent fields and child-table item fields are discovered automatically.
- Labels can be printed directly from individual item rows in Purchase Receipt, Stock Entry and Stock Reconciliation.
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
- Code page 27
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

## Direct item-row printing

Each serial-enabled item row can show **Print Labels**. Clicking it reads serials from the row's Serial and Batch Bundle, resolves the location printer, finds the active template for that DocType and printer, creates a tracked Print Job, sends ZPL through Browser Print and records per-serial results.

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
