# ERPNext Label Printing

ERPNext v16 custom app for serial-number labels and Zebra ZPL-II printing.

## Architecture

ERPNext browser -> ZPL-II -> Zebra Browser Print -> Zebra printer.

PDF is not the normal printing path. USB printers are connected to the workstation running the ERPNext browser and Zebra Browser Print.

## Included

- Printer Model and Manage Printer masters
- Branch/location and warehouse-aware printer resolution
- User + location printer preferences
- Zebra DPI, media, offsets, darkness, speed and advanced ZPL settings
- Browser Print discovery and test-print diagnostics
- Label Template with version/status control
- Label Template Object support for Text, DataMatrix, QR, Line and Rectangle
- Visual template designer and layout validation
- Label Print Job / Job Item queue with per-serial status
- Print/resume workflow for pending and failed labels
- Serial No damaged-label reprint with mandatory reason
- Label Print Log audit trail
- Purchase Receipt, Stock Entry and Stock Reconciliation Print Labels actions
- Automatic serial extraction from Serial and Batch Bundle where available
- Installation-time Label Printing roles

## Location logic

Printer selection is resolved in this order:

1. User Printer Preference for the Branch/location
2. Default Manage Printer for the Branch
3. Default printer for the Warehouse
4. Enabled system default printer

## Install / update

```bash
cd ~/frappe-bench/apps/label_printing
git pull origin main

cd ~/frappe-bench
bench --site erp.sundaramtech.com migrate
bench --site erp.sundaramtech.com clear-cache
bench restart
```

For a new site:

```bash
bench --site erp.sundaramtech.com install-app label_printing
```

## First setup

1. Create Printer Model, for example Zebra ZD230.
2. Create Manage Printer and assign Branch, optional Warehouse, DPI and label dimensions.
3. Mark exactly one enabled printer as the location default.
4. Install/start Zebra Browser Print on each workstation that physically uses a Zebra printer.
5. Create an Active Label Template for each source DocType.
6. Open Designer, add Text/DataMatrix/QR/Line/Rectangle objects and map fields.
7. Submit a Purchase Receipt with serial/batch bundle data.
8. Use Labels -> Print Labels, select serials, then open the generated Label Print Job and choose Print / Resume.

## Resume behavior

A job tracks each serial independently. Printed serials are not sent again when Print / Resume is used. A failed serial is marked Failed and the job is paused; after the printer problem is fixed, Print / Resume continues from the first pending/failed serial.

Physical printer acknowledgement is not treated as proof that media physically exited the printer. For controlled production use, verify the first label and use Reprint Label when a label is damaged.

## Roles

- Label Printing User: normal printing and read access
- Label Printing Manager: templates, printers, jobs and reprints
- Label Printing Administrator: full label-printing administration
