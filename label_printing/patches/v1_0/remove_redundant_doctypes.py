import frappe


def execute():
    for doctype in ("Printer Model", "User Printer Preference"):
        if not frappe.db.exists("DocType", doctype):
            continue
        frappe.delete_doc("DocType", doctype, force=True, ignore_permissions=True)
    frappe.db.commit()
