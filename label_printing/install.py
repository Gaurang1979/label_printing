import frappe


def after_install():
    for role in ['Label Printing User', 'Label Printing Manager', 'Label Printing Administrator']:
        if not frappe.db.exists('Role', role):
            frappe.get_doc({'doctype':'Role','role_name':role,'desk_access':1}).insert(ignore_permissions=True)
    frappe.db.commit()


def ensure_printing_workspace_shortcuts():
    """Keep Label Printing shortcuts present in ERPNext's standard 'Printing'
    workspace, without touching any of label_printing's own code/doctypes
    (those stay in this app, safe from ERPNext updates). Runs on every
    migrate -- including future ERPNext version upgrades -- so if an update
    ever resets the workspace, the next bench migrate puts these back."""
    if not frappe.db.exists('Workspace', 'Printing'):
        return
    try:
        workspace = frappe.get_doc('Workspace', 'Printing')
        existing = {row.link_to for row in workspace.shortcuts}
        wanted = [
            {'label': 'Label Templates', 'link_to': 'Label Template', 'type': 'DocType', 'doc_view': 'List', 'color': 'Blue'},
            {'label': 'Printers', 'link_to': 'Manage Printer', 'type': 'DocType', 'doc_view': 'List', 'color': 'Green'},
            {'label': 'Print Jobs', 'link_to': 'Label Print Job', 'type': 'DocType', 'doc_view': 'List', 'color': 'Orange'},
            {'label': 'Print Logs', 'link_to': 'Label Print Log', 'type': 'DocType', 'doc_view': 'List', 'color': 'Grey'},
        ]
        changed = False
        for shortcut in wanted:
            if shortcut['link_to'] not in existing:
                workspace.append('shortcuts', shortcut)
                changed = True
        if changed:
            workspace.save(ignore_permissions=True)
            frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), 'Label Printing: could not update Printing workspace shortcuts')
