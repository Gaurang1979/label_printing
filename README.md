# ERPNext Label Printing

ERPNext v16 custom app for Zebra ZPL-II label printing with serial-number support, label templates, multi-location printer management, user/location default printers, print jobs, and audit logs.

## Architecture

ERPNext Browser -> ZPL-II -> Zebra Browser Print -> Zebra printer (USB/network).

PDF is not the normal print path.

## Core masters

- Printer Model
- Manage Printer
- User Printer Preference
- Label Template
- Label Template Object
- Label Print Job
- Label Print Job Item
- Label Print Log

## Multi-location printer resolution

1. User + location preference
2. Location default printer
3. Company/system fallback

Location is primarily represented by Branch, with Warehouse available where operational warehouse mapping is required.

## Installation

```bash
cd ~/frappe-bench
bench get-app https://github.com/Gaurang1979/label_printing.git
bench --site <site> install-app label_printing
bench --site <site> migrate
bench --site <site> clear-cache
bench restart
```

## Status

Initial foundation release. Printer masters, location-aware preferences, template data model, print-job tracking, ZPL API foundation, and permissions are included. Purchase Receipt/Stock Entry UI hooks and full WYSIWYG designer are planned as the next implementation layer.
