import frappe


def after_install():
    for role in ['Label Printing User', 'Label Printing Manager', 'Label Printing Administrator']:
        if not frappe.db.exists('Role', role):
            frappe.get_doc({'doctype':'Role','role_name':role,'desk_access':1}).insert(ignore_permissions=True)
    ensure_printing_workspace_shortcuts()
    frappe.db.commit()


def ensure_printing_workspace_shortcuts():
    """Add all Label Printing doctypes to the existing Printing workspace sidebar."""
    if not frappe.db.exists('Workspace', 'Printing'):
        return

    workspace = frappe.get_doc('Workspace', 'Printing')
    required = [
        ('Label Template', 'Label Templates'),
        ('Label Template Object', 'Design Objects'),
        ('Manage Printer', 'Printers'),
        ('Label Print Job', 'Print Jobs'),
        ('Label Print Job Item', 'Print Job Items'),
        ('Label Print Log', 'Print Logs'),
    ]

    existing = {row.link_to for row in workspace.shortcuts if row.link_to}
    changed = False
    for doctype, label in required:
        if frappe.db.exists('DocType', doctype) and doctype not in existing:
            workspace.append('shortcuts', {
                'type': 'DocType',
                'link_to': doctype,
                'label': label,
            })
            changed = True

    if changed:
        workspace.save(ignore_permissions=True)
